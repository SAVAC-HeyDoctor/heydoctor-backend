import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ClinicalRecord } from './clinical-record.entity';
import { Consultation } from './consultation.entity';
import { Cie10Code } from './cie10-code.entity';

/**
 * AI enrichment metadata stored with diagnosis (confidence, source, suggested codes).
 */
export interface AiEnrichment {
  confidence?: number;
  source?: string;
  suggested_codes?: Array<{ code: string; description?: string }>;
  raw_response?: Record<string, unknown>;
}

@Entity('diagnostics')
export class Diagnostic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Direct link to consultation - primary relation. Required for new diagnoses. */
  @Column('uuid', { nullable: true })
  consultationId: string | null;

  @Column('uuid', { nullable: true })
  clinicalRecordId: string | null;

  /** ICD/CIE-10 code (can be stored as string if no CIE lookup). */
  @Column({ nullable: true })
  code: string | null;

  /** Reference to CIE10 code catalog when present. */
  @Column('uuid', { nullable: true })
  cie10CodeId: string | null;

  /** Clinical description of the diagnosis. */
  @Column({ name: 'diagnosis_details', type: 'text', nullable: true })
  diagnosis_details: string | null;

  /** Short description (alias for display). */
  @Column({ nullable: true })
  description: string | null;

  /** Notes from the clinician. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'date', nullable: true })
  diagnostic_date: Date | null;

  @Column({ default: 'principal' })
  type: string;

  /** AI enrichment: suggested codes, confidence, source. */
  @Column({ name: 'ai_enrichment', type: 'jsonb', nullable: true })
  ai_enrichment: AiEnrichment | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => Consultation, (c) => c.diagnostic, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation | null;

  @ManyToOne(() => ClinicalRecord, (cr) => cr.diagnostics, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'clinicalRecordId' })
  clinicalRecord: ClinicalRecord | null;

  @ManyToOne(() => Cie10Code, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cie10CodeId' })
  cie10_code: Cie10Code | null;
}
