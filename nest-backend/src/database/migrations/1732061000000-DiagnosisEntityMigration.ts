import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiagnosisEntityMigration1732061000000 implements MigrationInterface {
  name = 'DiagnosisEntityMigration1732061000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('diagnostics');
    if (!table) return;

    const colsToAdd = [
      { name: 'cie10CodeId', type: 'uuid', nullable: true },
      { name: 'diagnosis_details', type: 'text', nullable: true },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'diagnostic_date', type: 'date', nullable: true },
      { name: 'ai_enrichment', type: 'jsonb', nullable: true },
    ];

    for (const col of colsToAdd) {
      const exists = table.columns.find((c) => c.name === col.name);
      if (!exists) {
        await queryRunner.query(
          `ALTER TABLE "diagnostics" ADD COLUMN "${col.name}" ${col.type} NULL`,
        );
      }
    }

    // Make clinicalRecordId and code nullable if needed
    try {
      await queryRunner.query(
        `ALTER TABLE "diagnostics" ALTER COLUMN "clinicalRecordId" DROP NOT NULL`,
      );
    } catch {
      // May already be nullable
    }

    try {
      await queryRunner.query(
        `ALTER TABLE "diagnostics" ALTER COLUMN "code" DROP NOT NULL`,
      );
    } catch {
      // May already be nullable
    }

    // Add FK to cie10_codes if cie10CodeId was added
    const refreshedTable = await queryRunner.getTable('diagnostics');
    const hasCie10CodeId = refreshedTable?.columns.find(
      (c) => c.name === 'cie10CodeId',
    );
    if (hasCie10CodeId) {
      try {
        await queryRunner.query(`
          ALTER TABLE "diagnostics"
          ADD CONSTRAINT "FK_diagnostics_cie10_code"
          FOREIGN KEY ("cie10CodeId") REFERENCES "cie10_codes"("id") ON DELETE SET NULL
        `);
      } catch {
        // FK may already exist
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "diagnostics" DROP CONSTRAINT IF EXISTS "FK_diagnostics_cie10_code"`,
    );

    const colsToDrop = [
      'cie10CodeId',
      'diagnosis_details',
      'notes',
      'diagnostic_date',
      'ai_enrichment',
    ];
    for (const col of colsToDrop) {
      await queryRunner.query(
        `ALTER TABLE "diagnostics" DROP COLUMN IF EXISTS "${col}"`,
      );
    }

    try {
      await queryRunner.query(
        `ALTER TABLE "diagnostics" ALTER COLUMN "clinicalRecordId" SET NOT NULL`,
      );
    } catch {
      // May have nulls
    }

    try {
      await queryRunner.query(
        `ALTER TABLE "diagnostics" ALTER COLUMN "code" SET NOT NULL`,
      );
    } catch {
      // May have nulls
    }
  }
}
