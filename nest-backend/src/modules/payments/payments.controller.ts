import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';
import { Audit } from '../audit-log/decorators/audit.decorator';
import { AuditActions } from '../audit-log/audit-log.constants';
import type { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private actor(userId: string, clinicId: string): AuthActor {
    return { userId, clinicId };
  }

  @Audit({
    action: AuditActions.PAYMENT_CREATE,
    resourceType: 'payment',
    patientIdBodyKey: 'patientId',
    consultationIdBodyKey: 'consultationId',
    resourceIdFromResponse: true,
  })
  @Post('create')
  async create(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(dto, this.actor(userId, clinicId));
  }

  /**
   * Público (sin JWT). Exige firma HMAC y/o Bearer (producción).
   * Autenticación inválida → 401. Cuerpo válido → 200 (errores de negocio no exponen 500).
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const payload = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    try {
      this.paymentsService.assertPaykuWebhookAuthenticated(req.headers, payload);
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Webhook authentication failed');
    }
    await this.paymentsService.processPaykuWebhookTrusted(payload, req.headers);
    return { ok: true };
  }

  @Audit({
    action: AuditActions.PAYMENT_STATUS_CHECK,
    resourceType: 'payment',
    resourceIdParam: 'id',
    patientIdFromResponse: true,
    consultationIdFromResponse: true,
  })
  @Get(':id')
  async getStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.paymentsService.findStatusById(
      id,
      this.actor(userId, clinicId),
    );
  }
}
