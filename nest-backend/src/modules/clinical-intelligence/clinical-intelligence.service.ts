import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../../common/services/openai.service';
import { requireClinicId } from '../../common/utils/clinic-scope.util';
import { AuthorizationService } from '../../common/services/authorization.service';
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';

@Injectable()
export class ClinicalIntelligenceService {
  constructor(
    private readonly openai: OpenAIService,
    private readonly authz: AuthorizationService,
  ) {}

  async suggest(symptoms: string, actor: AuthActor) {
    const cid = requireClinicId(actor.clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);

    if (!this.openai.isAvailable) {
      return {
        data: {
          suggestions: [],
          possibleConditions: [],
          message: 'OpenAI API key not configured',
        },
      };
    }

    try {
      const prompt = `Given de-identified symptom description only (no names or IDs): "${symptoms.slice(0, 4000)}". Return JSON: { suggestions: [clinical action strings], possibleConditions: [{ code, name, likelihood }] }`;

      const response = await this.openai.complete(
        prompt,
        'You are a clinical intelligence assistant. Return only valid JSON. Never echo personal identifiers.',
      );

      let result = {
        suggestions: [] as string[],
        possibleConditions: [] as Array<{
          code: string;
          name: string;
          likelihood: string;
        }>,
      };

      try {
        const parsed = JSON.parse(response);
        result = {
          suggestions: parsed.suggestions || [],
          possibleConditions: parsed.possibleConditions || [],
        };
      } catch {
        result.suggestions = response ? [response] : [];
      }

      return { data: result };
    } catch {
      return {
        data: {
          suggestions: [],
          possibleConditions: [],
        },
      };
    }
  }
}
