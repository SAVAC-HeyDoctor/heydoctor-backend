import {
  Injectable,
  Logger,
  NotFoundException,
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import type { IncomingHttpHeaders } from 'http';
import { Payment, PaymentStatus, User, Consultation } from '../../entities';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { requireClinicId } from '../../common/utils/clinic-scope.util';
import { AuthorizationService } from '../../common/services/authorization.service';
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditActions } from '../audit-log/audit-log.constants';

const DEFAULT_PENDING_EXPIRE_MINUTES = 1440;

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return undefined;
}

/** Monto reportado por Payku en webhook (varía por integración). */
function pickAmount(obj: Record<string, unknown>): number | null {
  const keys = [
    'amount',
    'Amount',
    'monto',
    'Monto',
    'total',
    'Total',
    'importe',
    'payment_amount',
  ];
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    const n =
      typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
    if (Number.isFinite(n)) {
      return Math.round(n);
    }
  }
  return null;
}

function mapPaykuStatus(raw: string | undefined): PaymentStatus {
  const s = (raw ?? '').toLowerCase();
  if (s === 'success' || s === 'completed' || s === 'complete' || s === 'paid') {
    return 'paid';
  }
  if (s === 'failed' || s === 'rejected' || s === 'error') {
    return 'failed';
  }
  if (s === 'cancelled' || s === 'canceled' || s === 'void') {
    return 'cancelled';
  }
  if (s === 'expired' || s === 'expirado') {
    return 'expired';
  }
  return 'pending';
}

/** Solo desde pending hacia estado terminal (o actualización sin cambio de estado vía rama aparte). */
function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === 'paid') return false;
  if (from !== 'pending') return false;
  return (
    to === 'paid' ||
    to === 'failed' ||
    to === 'cancelled' ||
    to === 'expired'
  );
}

function stableStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of keys) {
    sorted[k] = obj[k];
  }
  return JSON.stringify(sorted);
}

function secureCompareHex(expectedHex: string, receivedSig: string): boolean {
  const clean = receivedSig.trim().replace(/^sha256=/i, '').trim();
  if (!/^[0-9a-f]+$/i.test(clean) || clean.length % 2 !== 0) {
    return false;
  }
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(clean, 'hex');
  if (a.length !== b.length || a.length === 0) {
    return false;
  }
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
    private readonly authz: AuthorizationService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Debe ejecutarse en el controlador ANTES de procesar el cuerpo.
   * Opción A: HMAC-SHA256 hex del JSON con claves ordenadas (PAYKU_WEBHOOK_SECRET).
   * Opción B: Authorization Bearer (PAYKU_WEBHOOK_BEARER).
   * Si ambos están definidos, se exigen ambos.
   */
  assertPaykuWebhookAuthenticated(
    headers: IncomingHttpHeaders,
    body: Record<string, unknown>,
  ): void {
    const secret = process.env.PAYKU_WEBHOOK_SECRET?.trim();
    const bearer = process.env.PAYKU_WEBHOOK_BEARER?.trim();
    const allowUnsafeLocal =
      process.env.PAYKU_WEBHOOK_ALLOW_UNSAFE_LOCAL === 'true' &&
      process.env.NODE_ENV !== 'production';

    if (!secret && !bearer) {
      if (allowUnsafeLocal) {
        this.logger.warn(
          'Payku webhook: unauthenticated (PAYKU_WEBHOOK_ALLOW_UNSAFE_LOCAL) — NO usar en producción',
        );
        return;
      }
      this.logger.warn('Payku webhook: missing PAYKU_WEBHOOK_SECRET or PAYKU_WEBHOOK_BEARER');
      throw new UnauthorizedException('Webhook authentication required');
    }

    if (bearer) {
      const auth = headers.authorization;
      if (auth !== `Bearer ${bearer}`) {
        throw new UnauthorizedException('Invalid webhook authorization');
      }
    }

    if (secret) {
      const sigHeader =
        (headers['x-payku-signature'] as string) ||
        (headers['x-signature'] as string);
      if (!sigHeader?.trim()) {
        throw new UnauthorizedException('Missing webhook signature');
      }
      const bodyStr = stableStringify(body);
      const expectedHex = createHmac('sha256', secret)
        .update(bodyStr, 'utf8')
        .digest('hex');
      if (!secureCompareHex(expectedHex, sigHeader)) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }
  }

  /**
   * Tras autenticación. No relanza errores (Payku no debe recibir 500).
   */
  async processPaykuWebhookTrusted(
    rawBody: Record<string, unknown>,
    headers: IncomingHttpHeaders,
  ): Promise<void> {
    try {
      const order = pickString(rawBody, [
        'order',
        'Order',
        'orden',
        'merchant_order',
      ]);
      const statusRaw = pickString(rawBody, [
        'status',
        'Status',
        'estado',
        'payment_status',
      ]);
      const transactionId = pickString(rawBody, [
        'transaction_id',
        'transactionId',
        'id_transaction',
      ]);

      if (!order) {
        this.logger.warn('Payku webhook: no order in payload');
        return;
      }

      const incomingAmount = pickAmount(rawBody);

      await this.paymentRepo.manager.transaction(async (mgr) => {
        const repo = mgr.getRepository(Payment);
        let payment =
          (await repo.findOne({
            where: { externalId: order },
            lock: { mode: 'pessimistic_write' },
          })) ??
          (await repo.findOne({
            where: { id: order },
            lock: { mode: 'pessimistic_write' },
          }));

        if (!payment) {
          this.logger.warn(`Payku webhook: payment not found for order=${order}`);
          return;
        }

        const statusBefore = payment.status;

        if (payment.status === 'paid') {
          await this.auditLog.log({
            action: AuditActions.PAYMENT_WEBHOOK,
            resourceType: 'payment',
            resourceId: payment.id,
            patientId: payment.patientId,
            consultationId: payment.consultationId,
            userId: null,
            clinicId: payment.clinicId,
            status: 'success',
            httpStatus: 200,
            errorMessage: null,
            httpMethod: 'POST',
            path: '/api/payments/webhook',
            metadata: {
              duplicate: true,
              reason: 'already_paid',
              order,
              amount: payment.amount,
            },
            ipAddress:
              (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
              null,
          });
          return;
        }

        if (payment.status !== 'pending') {
          await this.auditLog.log({
            action: AuditActions.PAYMENT_WEBHOOK,
            resourceType: 'payment',
            resourceId: payment.id,
            patientId: payment.patientId,
            consultationId: payment.consultationId,
            userId: null,
            clinicId: payment.clinicId,
            status: 'success',
            httpStatus: 200,
            errorMessage: null,
            httpMethod: 'POST',
            path: '/api/payments/webhook',
            metadata: {
              ignored: true,
              statusBefore,
              reason: 'non_pending_state',
              order,
            },
            ipAddress:
              (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
              null,
          });
          return;
        }

        let nextStatus = mapPaykuStatus(statusRaw);

        if (nextStatus === 'paid') {
          if (incomingAmount === null) {
            await this.auditLog.log({
              action: AuditActions.PAYMENT_STATUS_UPDATED,
              resourceType: 'payment',
              resourceId: payment.id,
              patientId: payment.patientId,
              consultationId: payment.consultationId,
              userId: null,
              clinicId: payment.clinicId,
              status: 'error',
              httpStatus: 200,
              errorMessage: 'missing_amount_in_webhook',
              httpMethod: 'POST',
              path: '/api/payments/webhook',
              metadata: {
                amountExpected: payment.amount,
                statusBefore,
                statusAfter: 'failed',
                transactionId: transactionId ?? null,
              },
              ipAddress:
                (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
                null,
            });
            nextStatus = 'failed';
          } else if (incomingAmount !== payment.amount) {
            await this.auditLog.log({
              action: AuditActions.PAYMENT_STATUS_UPDATED,
              resourceType: 'payment',
              resourceId: payment.id,
              patientId: payment.patientId,
              consultationId: payment.consultationId,
              userId: null,
              clinicId: payment.clinicId,
              status: 'error',
              httpStatus: 200,
              errorMessage: 'amount_mismatch',
              httpMethod: 'POST',
              path: '/api/payments/webhook',
              metadata: {
                amountExpected: payment.amount,
                amountReceived: incomingAmount,
                statusBefore,
                statusAfter: 'failed',
                transactionId: transactionId ?? null,
              },
              ipAddress:
                (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
                null,
            });
            nextStatus = 'failed';
          }
        }

        if (nextStatus === 'pending') {
          payment.rawResponse = rawBody;
          payment.transactionId = transactionId ?? payment.transactionId;
          payment.metadata = {
            ...(typeof payment.metadata === 'object' && payment.metadata !== null
              ? (payment.metadata as Record<string, unknown>)
              : {}),
            lastWebhookPending: { at: new Date().toISOString() },
          };
          await repo.save(payment);
          return;
        }

        if (!canTransition(payment.status, nextStatus)) {
          await this.auditLog.log({
            action: AuditActions.PAYMENT_WEBHOOK,
            resourceType: 'payment',
            resourceId: payment.id,
            patientId: payment.patientId,
            consultationId: payment.consultationId,
            userId: null,
            clinicId: payment.clinicId,
            status: 'success',
            httpStatus: 200,
            errorMessage: null,
            httpMethod: 'POST',
            path: '/api/payments/webhook',
            metadata: {
              ignored: true,
              transitionRejected: true,
              statusBefore,
              attempted: nextStatus,
              order,
            },
            ipAddress:
              (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
              null,
          });
          return;
        }

        const statusAfter = nextStatus;
        payment.status = statusAfter;
        payment.rawResponse = rawBody;
        payment.transactionId = transactionId ?? payment.transactionId;
        if (statusAfter === 'paid') {
          payment.paidAt = new Date();
        }
        payment.metadata = {
          ...(typeof payment.metadata === 'object' && payment.metadata !== null
            ? (payment.metadata as Record<string, unknown>)
            : {}),
          lastWebhook: {
            receivedAt: new Date().toISOString(),
            statusRaw,
            transactionId,
          },
        };

        await repo.save(payment);

        await this.auditLog.log({
          action: AuditActions.PAYMENT_STATUS_UPDATED,
          resourceType: 'payment',
          resourceId: payment.id,
          patientId: payment.patientId,
          consultationId: payment.consultationId,
          userId: null,
          clinicId: payment.clinicId,
          status: 'success',
          httpStatus: 200,
          errorMessage: null,
          httpMethod: 'POST',
          path: '/api/payments/webhook',
          metadata: {
            amount: payment.amount,
            statusBefore,
            statusAfter,
            transactionId: transactionId ?? null,
            incomingAmount: incomingAmount ?? null,
          },
          ipAddress:
            (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
            null,
        });

        await this.auditLog.log({
          action: AuditActions.PAYMENT_WEBHOOK,
          resourceType: 'payment',
          resourceId: payment.id,
          patientId: payment.patientId,
          consultationId: payment.consultationId,
          userId: null,
          clinicId: payment.clinicId,
          status: 'success',
          httpStatus: 200,
          errorMessage: null,
          httpMethod: 'POST',
          path: '/api/payments/webhook',
          metadata: { order, mappedStatus: statusAfter },
          ipAddress:
            (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
            null,
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      this.logger.error(`Payku webhook processing failed: ${msg}`);
    }
  }

  async create(dto: CreatePaymentDto, actor: AuthActor) {
    const cid = requireClinicId(actor.clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);

    if (dto.patientId) {
      await this.authz.assertPatientInClinic(dto.patientId, cid);
    }
    if (dto.consultationId) {
      const consultation = await this.consultationRepo.findOne({
        where: { id: dto.consultationId },
      });
      if (!consultation) {
        throw new NotFoundException('Consultation not found');
      }
      await this.authz.assertOwnership(
        { type: 'consultation', entity: consultation },
        actor,
      );
    }

    const user = await this.userRepo.findOne({
      where: { id: actor.userId },
      select: ['id', 'email'],
    });
    if (!user?.email?.trim()) {
      throw new BadRequestException(
        'User email is required for Payku; update profile or token claims.',
      );
    }

    const amount = Math.round(Number(dto.amount));
    if (!Number.isFinite(amount) || amount < 1) {
      throw new BadRequestException('Invalid amount');
    }

    let payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        amount,
        currency: 'CLP',
        status: 'pending',
        clinicId: cid,
        userId: actor.userId,
        description: dto.description.trim(),
        patientId: dto.patientId ?? null,
        consultationId: dto.consultationId ?? null,
        externalId: null,
        paymentUrl: null,
        metadata: null,
        rawResponse: null,
        transactionId: null,
        paidAt: null,
      }),
    );

    const base = process.env.PAYKU_URL?.replace(/\/$/, '');
    const token = process.env.PAYKU_TKPRIV?.trim();
    const urlReturn = process.env.PAYKU_URL_RETURN?.trim();
    const apiPublic = process.env.API_PUBLIC_URL?.replace(/\/$/, '');
    const urlNotify =
      process.env.PAYKU_URL_NOTIFY?.trim() ||
      (apiPublic ? `${apiPublic}/api/payments/webhook` : undefined);

    if (!base || !token) {
      await this.paymentRepo.update(payment.id, {
        status: 'failed',
        metadata: { error: 'Payku env PAYKU_URL / PAYKU_TKPRIV missing' },
      });
      throw new ServiceUnavailableException('Payku is not configured');
    }
    if (!urlReturn || !urlNotify) {
      await this.paymentRepo.update(payment.id, {
        status: 'failed',
        metadata: {
          error:
            'Set PAYKU_URL_RETURN and PAYKU_URL_NOTIFY (or API_PUBLIC_URL for default webhook)',
        },
      });
      throw new ServiceUnavailableException(
        'PAYKU_URL_RETURN and webhook URL are required',
      );
    }

    const payload = {
      email: user.email.trim(),
      amount: payment.amount,
      order: payment.id,
      subject: payment.description,
      urlreturn: urlReturn,
      urlnotify: urlNotify,
    };

    try {
      const res = await fetch(`${base}/api/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = { raw: text };
      }

      if (!res.ok) {
        await this.paymentRepo.update(payment.id, {
          status: 'failed',
          metadata: { paykuHttpStatus: res.status, paykuBody: json },
        });
        this.logger.warn(`Payku create failed: ${res.status} ${text.slice(0, 500)}`);
        throw new BadGatewayException('Payku rejected transaction creation');
      }

      const paymentUrl =
        (json.payment_url as string) ??
        (json.paymentUrl as string) ??
        (json.url as string) ??
        (json.link as string);

      const externalId = String(
        json.order ?? json.id ?? json.transaction_id ?? payment.id,
      );

      if (!paymentUrl) {
        await this.paymentRepo.update(payment.id, {
          status: 'failed',
          metadata: { paykuBody: json },
        });
        throw new BadGatewayException('Payku response missing payment URL');
      }

      await this.paymentRepo.update(payment.id, {
        paymentUrl,
        externalId,
        metadata: { paykuCreate: json },
      });

      payment = (await this.paymentRepo.findOne({
        where: { id: payment.id },
      }))!;

      return {
        paymentId: payment.id,
        paymentUrl,
      };
    } catch (e) {
      if (e instanceof BadGatewayException) throw e;
      this.logger.error(`Payku request error: ${(e as Error).message}`);
      await this.paymentRepo.update(payment.id, {
        status: 'failed',
        metadata: { error: (e as Error).message },
      });
      throw new BadGatewayException('Payku request failed');
    }
  }

  async findStatusById(id: string, actor: AuthActor) {
    const cid = requireClinicId(actor.clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);

    let payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    await this.authz.assertOwnership({ type: 'payment', entity: payment }, actor);

    payment = await this.maybeMarkExpired(payment);

    return {
      data: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        description: payment.description,
        createdAt: payment.createdAt,
        patientId: payment.patientId,
        consultationId: payment.consultationId,
        isPaid: payment.status === 'paid',
      },
    };
  }

  /** Marca pending como expired si superó la ventana (lectura perezosa). */
  private async maybeMarkExpired(payment: Payment): Promise<Payment> {
    if (payment.status !== 'pending') {
      return payment;
    }
    const mins = Math.max(
      1,
      parseInt(
        process.env.PAYMENT_PENDING_EXPIRE_MINUTES ??
          String(DEFAULT_PENDING_EXPIRE_MINUTES),
        10,
      ) || DEFAULT_PENDING_EXPIRE_MINUTES,
    );
    const deadline = payment.createdAt.getTime() + mins * 60_000;
    if (Date.now() <= deadline) {
      return payment;
    }

    try {
      await this.paymentRepo.manager.transaction(async (mgr) => {
        const repo = mgr.getRepository(Payment);
        const locked = await repo.findOne({
          where: { id: payment.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked || locked.status !== 'pending') return;
        const statusBefore = locked.status;
        locked.status = 'expired';
        await repo.save(locked);
        await this.auditLog.log({
          action: AuditActions.PAYMENT_STATUS_UPDATED,
          resourceType: 'payment',
          resourceId: locked.id,
          patientId: locked.patientId,
          consultationId: locked.consultationId,
          userId: locked.userId,
          clinicId: locked.clinicId,
          status: 'success',
          httpStatus: 200,
          errorMessage: null,
          httpMethod: 'GET',
          path: '/api/payments/:id',
          metadata: {
            amount: locked.amount,
            statusBefore,
            statusAfter: 'expired',
            reason: 'pending_timeout',
            expireAfterMinutes: mins,
          },
          ipAddress: null,
        });
      });
    } catch (e) {
      this.logger.warn(`maybeMarkExpired: ${(e as Error).message}`);
    }

    return (await this.paymentRepo.findOne({ where: { id: payment.id } }))!;
  }
}
