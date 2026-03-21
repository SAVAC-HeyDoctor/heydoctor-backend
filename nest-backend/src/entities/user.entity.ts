import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ClinicUser } from './clinic-user.entity';
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ClinicUser, (cu) => cu.user)
  clinicUsers: ClinicUser[];

  @OneToMany(() => Doctor, (d) => d.user)
  doctors: Doctor[];

  @OneToOne(() => Patient, (p) => p.user)
  patient: Patient;
}
