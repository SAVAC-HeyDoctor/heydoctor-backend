import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { CopilotService } from './copilot.service';
import { GenerateClinicalNoteDto } from './dto/generate-note.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CLINICAL_AI_DISCLAIMER } from '../../common/constants/clinical-ai-disclaimer';

@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Get('suggestions')
  async getSuggestions(
    @Query('consultationId') consultationId: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.copilotService.getSuggestions(
      consultationId || '',
      { userId, clinicId },
    );
    return { ...result, disclaimer: CLINICAL_AI_DISCLAIMER };
  }

  @Post('generate-clinical-note')
  async generateClinicalNote(
    @Body() dto: GenerateClinicalNoteDto,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.copilotService.generateClinicalNote(dto, {
      userId,
      clinicId,
    });
    return { ...result, disclaimer: CLINICAL_AI_DISCLAIMER };
  }
}
