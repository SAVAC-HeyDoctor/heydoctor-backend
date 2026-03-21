import { Controller, Get, BadRequestException, Query } from '@nestjs/common';
import { WebrtcService } from './webrtc.service';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthorizationService } from '../../common/services/authorization.service';

/**
 * ICE servers para WebRTC (TURN/STUN).
 * Requiere JWT y consultationId; solo participantes de la consulta en la clínica activa.
 */
@Controller('webrtc')
export class WebrtcController {
  constructor(
    private readonly webrtcService: WebrtcService,
    private readonly authz: AuthorizationService,
  ) {}

  @Get('ice-servers')
  async getIceServers(
    @Query('consultationId') consultationId: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!consultationId?.trim()) {
      throw new BadRequestException('consultationId query parameter is required');
    }
    await this.authz.assertConsultationParticipantForWebRtc(
      consultationId.trim(),
      userId,
      clinicId,
    );
    return this.webrtcService.getIceServers();
  }
}
