import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from './patient.entity';
import { Doctor } from './doctor.entity';
import { Clinic } from './clinic.entity';
import { Consultation } from './consultation.entity';
import { Diagnosis } from './diagnosis.entity';

/** Lab order status - Strapi enum + FHIR ServiceRequest alignment. */
export type LabOrderStatus =
  | 'pending'
  | 'ordered'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** Priority - FHIR RequestPriority: routine | urgent | asap | stat. */
export type LabOrderPriority = 'routine' | 'urgent' | 'asap' | 'stat';

@Entity('lab_orders')
export class LabOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patientId: string;

  @Column('uuid')
  doctorId: string;

  @Column('uuid')
  clinicId: string;

  @Column('uuid', { nullable: true })
  consultationId: string | null;

  @Column('uuid', { nullable: true })
  diagnosisId: string | null;

  /** Test names - Strapi lab_tests, FHIR ServiceRequest.code. */
  @Column({ name: 'lab_tests', type: 'jsonb', default: [] })
  lab_tests: string[];

  @Column({ default: 'pending' })
  status: LabOrderStatus;

  @Column({ default: 'routine' })
  priority: LabOrderPriority;

  /** Strapi: diagnosis_code. ICD/reason code for the order. */
  @Column({ name: 'diagnosis_code', nullable: true })
  diagnosis_code: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Patient, (p) => p.labOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @ManyToOne(() => Doctor, (d) => d.labOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @ManyToOne(() => Clinic, (c) => c.labOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @ManyToOne(() => Consultation, (c) => c.lab_orders, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation | null;

  @ManyToOne(() => Diagnosis, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'diagnosisId' })
  diagnosis: Diagnosis | null;
}
