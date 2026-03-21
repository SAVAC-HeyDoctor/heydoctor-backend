import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') q: string,
    @Query('type') type: 'patient' | 'doctor' | 'diagnostic',
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.searchService.search(q, type, { userId, clinicId });
  }
}
