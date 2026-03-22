import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Clinic } from './clinic.entity';
import { Patient } from './patient.entity';
import { Consultation } from './consultation.entity';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

@Entity('payments')
@Index('IDX_payments_clinic', ['clinicId'])
@Index('IDX_payments_patient', ['patientId'])
@Index('IDX_payments_consultation', ['consultationId'])
@Index('IDX_payments_status', ['status'])
@Index('IDX_payments_external_id', ['externalId'], { unique: true })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Monto en unidad menor o pesos según integración Payku (entero recomendado para CLP). */
  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'varchar', length: 8, default: 'CLP' })
  currency: string;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status: PaymentStatus;

  /** Identificador de orden en Payku (campo `order` en API / webhook). */
  @Column({ type: 'varchar', length: 128, nullable: true })
  externalId: string | null;

  @Column({ type: 'text', nullable: true })
  paymentUrl: string | null;

  @Column('uuid', { nullable: true })
  patientId: string | null;

  @Column('uuid', { nullable: true })
  consultationId: string | null;

  @Column('uuid')
  clinicId: string;

  /** Usuario JWT que inició el cobro. */
  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @ManyToOne(() => Patient, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: Patient | null;

  @ManyToOne(() => Consultation, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation | null;
}
