import { Controller, Get } from '@nestjs/common';
import { ClinicalAppsService } from './clinical-apps.service';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthorizationService } from '../../common/services/authorization.service';
import { requireClinicId } from '../../common/utils/clinic-scope.util';

@Controller('clinical-apps')
export class ClinicalAppsController {
  constructor(
    private readonly service: ClinicalAppsService,
    private readonly authz: AuthorizationService,
  ) {}

  @Get()
  async getApps(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const cid = requireClinicId(clinicId);
    await this.authz.resolveDoctorForUser(userId, cid);
    return this.service.getApps();
  }
}
