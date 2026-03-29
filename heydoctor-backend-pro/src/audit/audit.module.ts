import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../common/logger/logger.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditLog } from './audit-log.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    LoggerModule,
    AuthorizationModule,
    AuthModule,
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
