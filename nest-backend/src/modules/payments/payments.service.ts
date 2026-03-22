import {
  Injectable,
  Logger,
  NotFoundException,
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
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
  return 'pending';
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

    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    await this.authz.assertOwnership({ type: 'payment', entity: payment }, actor);

    return {
      data: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        description: payment.description,
        createdAt: payment.createdAt,
        patientId: payment.patientId,
        consultationId: payment.consultationId,
      },
    };
  }

  /**
   * Webhook: nunca lanzar; siempre loguear fallos.
   */
  async handlePaykuWebhook(
    rawBody: Record<string, unknown>,
    headers: IncomingHttpHeaders,
  ): Promise<void> {
    try {
      if (!this.verifyWebhookTrust(headers, rawBody)) {
        this.logger.warn('Payku webhook rejected by verification');
        return;
      }

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
        'id',
      ]);

      if (!order) {
        this.logger.warn('Payku webhook: no order in payload');
        return;
      }

      let payment =
        (await this.paymentRepo.findOne({ where: { externalId: order } })) ??
        (await this.paymentRepo.findOne({ where: { id: order } }));

      if (!payment) {
        this.logger.warn(`Payku webhook: payment not found for order=${order}`);
        return;
      }

      const nextStatus = mapPaykuStatus(statusRaw);
      const meta = {
        ...(typeof payment.metadata === 'object' && payment.metadata !== null
          ? (payment.metadata as Record<string, unknown>)
          : {}),
        lastWebhook: {
          receivedAt: new Date().toISOString(),
          statusRaw,
          transactionId,
          payload: rawBody,
        },
      };

      payment.status = nextStatus;
      payment.metadata = meta;
      await this.paymentRepo.save(payment);

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
          order,
          mappedStatus: nextStatus,
          transactionId: transactionId ?? null,
        },
        ipAddress:
          (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? null,
      });
    } catch (e) {
      this.logger.error(
        `Payku webhook handler error: ${(e as Error).message}`,
        (e as Error).stack,
      );
    }
  }

  /**
   * Si PAYKU_WEBHOOK_BEARER está definido, exige Authorization: Bearer <token>.
   * Si PAYKU_WEBHOOK_SECRET + X-Payku-Signature (hex HMAC-SHA256 del JSON canonical), valida.
   */
  private verifyWebhookTrust(
    headers: IncomingHttpHeaders,
    body: Record<string, unknown>,
  ): boolean {
    const bearer = process.env.PAYKU_WEBHOOK_BEARER?.trim();
    if (bearer) {
      const auth = headers.authorization;
      if (auth !== `Bearer ${bearer}`) {
        return false;
      }
    }

    const secret = process.env.PAYKU_WEBHOOK_SECRET?.trim();
    const sigHeader =
      (headers['x-payku-signature'] as string) ||
      (headers['x-signature'] as string);
    if (secret && sigHeader) {
      try {
        const bodyStr = stableStringify(body);
        const expected = createHmac('sha256', secret)
          .update(bodyStr)
          .digest('hex');
        const a = Buffer.from(expected, 'utf8');
        const b = Buffer.from(sigHeader.trim(), 'utf8');
        if (a.length !== b.length) return false;
        return timingSafeEqual(a, b);
      } catch {
        return false;
      }
    }

    if (secret && !sigHeader) {
      return false;
    }

    return true;
  }
}

function stableStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of keys) {
    sorted[k] = obj[k];
  }
  return JSON.stringify(sorted);
}
