import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ClinicUser,
  Doctor,
  Patient,
  Consultation,
} from '../entities';
import { OpenAIService } from './services/openai.service';
import { AuthorizationService } from './services/authorization.service';
import { ClinicResolverInterceptor } from './interceptors/clinic-resolver.interceptor';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClinicUser,
      Doctor,
      Patient,
      Consultation,
    ]),
  ],
  providers: [OpenAIService, AuthorizationService, ClinicResolverInterceptor],
  exports: [
    OpenAIService,
    AuthorizationService,
    ClinicResolverInterceptor,
    TypeOrmModule,
  ],
})
export class CommonModule {}
