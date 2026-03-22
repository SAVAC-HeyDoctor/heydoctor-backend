import { Injectable, Logger, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { AuditLog } from '../../entities/audit-log.entity';
import type { AuditLogOptions } from './audit-log.types';

function unwrapResponseData(
  body: unknown,
): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if ('data' in o) {
    const data = o.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return null;
  }
  /** Respuestas sin envoltorio `data` (p. ej. { paymentId, paymentUrl }). */
  return o;
}

function asUuid(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 32) return null;
  return value;
}

function httpStatusFromError(err: unknown): number {
  if (err instanceof HttpException) {
    return err.getStatus();
  }
  return 500;
}

function messageFromError(err: unknown): string {
  if (err instanceof HttpException) {
    const res = err.getResponse();
    if (typeof res === 'string') return res.slice(0, 2000);
    if (res && typeof res === 'object' && 'message' in res) {
      const m = (res as { message?: string | string[] }).message;
      if (Array.isArray(m)) return m.join('; ').slice(0, 2000);
      if (typeof m === 'string') return m.slice(0, 2000);
    }
    return err.message.slice(0, 2000);
  }
  if (err instanceof Error) return err.message.slice(0, 2000);
  return 'Unknown error';
}

export interface AuditLogFromRequestInput extends AuditLogOptions {
  request: Request;
  responseBody: unknown;
  userId: string | null | undefined;
  clinicId: string | null | undefined;
}

export interface AuditLogFailureInput extends AuditLogOptions {
  request: Request;
  userId: string | null | undefined;
  clinicId: string | null | undefined;
  error: unknown;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * Registro directo (p. ej. desde otros servicios).
   */
  async log(entry: Partial<AuditLog>): Promise<void> {
    try {
      await this.auditRepo.save(this.auditRepo.create(entry));
    } catch (err) {
      this.logger.warn(
        `Failed to persist audit log (${entry.action}): ${(err as Error).message}`,
      );
    }
  }

  private extractIds(
    options: AuditLogOptions,
    request: Request,
    responseBody?: unknown,
  ): {
    patientId: string | null;
    resourceId: string | null;
    consultationId: string | null;
  } {
    const params = (request.params ?? {}) as Record<string, string>;
    const body = (request.body ?? {}) as Record<string, unknown>;
    const data = responseBody !== undefined ? unwrapResponseData(responseBody) : null;

    let patientId: string | null = null;
    if (options.patientIdParam && params[options.patientIdParam]) {
      patientId = params[options.patientIdParam];
    } else if (options.patientIdBodyKey && body[options.patientIdBodyKey]) {
      patientId = asUuid(body[options.patientIdBodyKey]);
    }
    if (!patientId && options.patientIdFromResponse && data?.patientId) {
      patientId = asUuid(data.patientId);
    }

    let resourceId: string | null = null;
    const ridParam = options.resourceIdParam ?? 'id';
    if (params[ridParam]) {
      resourceId = params[ridParam];
    }
    if (!resourceId && options.resourceIdFromResponse && data) {
      resourceId =
        asUuid(data.id) ||
        asUuid(data.paymentId) ||
        null;
    }

    let consultationId: string | null = null;
    if (options.consultationIdParam && params[options.consultationIdParam]) {
      consultationId = params[options.consultationIdParam];
    } else if (
      options.consultationIdBodyKey &&
      body[options.consultationIdBodyKey]
    ) {
      consultationId = asUuid(body[options.consultationIdBodyKey]);
    }
    if (
      !consultationId &&
      options.consultationIdFromResponse &&
      data?.consultationId
    ) {
      consultationId = asUuid(data.consultationId);
    }

    return { patientId, resourceId, consultationId };
  }

  private baseRequestFields(request: Request) {
    const ip =
      (request.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ||
      request.socket?.remoteAddress ||
      null;
    return {
      httpMethod: request.method,
      path: request.route?.path
        ? `${request.baseUrl}${request.route.path}`
        : request.originalUrl?.slice(0, 512) ?? null,
      metadata: {
        routePath: request.route?.path ?? null,
      } as Record<string, unknown>,
      ipAddress: ip,
    };
  }

  /**
   * Petición auditada terminó con respuesta HTTP exitosa (handler completó).
   */
  async logFromRequest(input: AuditLogFromRequestInput): Promise<void> {
    const { request, responseBody, userId, clinicId, ...auditOpts } = input;
    const { patientId, resourceId, consultationId } = this.extractIds(
      auditOpts,
      request,
      responseBody,
    );
    const { action, resourceType } = auditOpts;

    await this.log({
      action,
      resourceType,
      resourceId,
      patientId,
      consultationId,
      userId: userId ?? null,
      clinicId: clinicId ?? null,
      status: 'success',
      httpStatus: 200,
      errorMessage: null,
      ...this.baseRequestFields(request),
    });
  }

  /**
   * Petición auditada falló (4xx/5xx u otra excepción).
   */
  async logFromFailure(input: AuditLogFailureInput): Promise<void> {
    const { request, userId, clinicId, error, ...auditOpts } = input;
    const { patientId, resourceId, consultationId } = this.extractIds(
      auditOpts,
      request,
      undefined,
    );
    const { action, resourceType } = auditOpts;
    const httpStatus = httpStatusFromError(error);
    const errorMessage = messageFromError(error);

    await this.log({
      action,
      resourceType,
      resourceId,
      patientId,
      consultationId,
      userId: userId ?? null,
      clinicId: clinicId ?? null,
      status: 'error',
      httpStatus,
      errorMessage,
      ...this.baseRequestFields(request),
    });
  }
}
