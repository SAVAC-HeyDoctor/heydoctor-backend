import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientReminder } from '../../entities';
import { PatientRemindersService } from './patient-reminders.service';
import { PatientRemindersController } from './patient-reminders.controller';
import { AuthModule } from '../auth/auth.module';
import { AuthController } from '../auth/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientReminder]),
    AuthModule,
  ],
  controllers: [PatientRemindersController, AuthController],
  providers: [PatientRemindersService],
  exports: [PatientRemindersService],
})
export class PatientRemindersModule {}
