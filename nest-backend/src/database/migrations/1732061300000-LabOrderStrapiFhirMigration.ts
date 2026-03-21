import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds Strapi/FHIR-aligned fields: diagnosisId, priority, diagnosis_code. Renames tests->lab_tests. */
export class LabOrderStrapiFhirMigration1732061300000 implements MigrationInterface {
  name = 'LabOrderStrapiFhirMigration1732061300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('lab_orders');
    if (!table) return;

    // Rename tests -> lab_tests (Strapi alignment)
    const hasTests = table.columns.find((c) => c.name === 'tests');
    const hasLabTests = table.columns.find((c) => c.name === 'lab_tests');
    if (hasTests && !hasLabTests) {
      await queryRunner.renameColumn('lab_orders', 'tests', 'lab_tests');
    }

    // Add new columns
    const refreshedTable = await queryRunner.getTable('lab_orders');
    const colsToAdd = [
      { name: 'diagnosisId', type: 'uuid', nullable: true },
      { name: 'priority', type: 'varchar' },
      { name: 'diagnosis_code', type: 'varchar', nullable: true },
    ];

    for (const col of colsToAdd) {
      const exists = refreshedTable?.columns.find((c) => c.name === col.name);
      if (!exists) {
        let sql = `ALTER TABLE "lab_orders" ADD COLUMN "${col.name}" ${col.type} NULL`;
        if (col.name === 'priority') {
          sql += ` DEFAULT 'routine'`;
        }
        await queryRunner.query(sql);
      }
    }

    if (refreshedTable?.columns.find((c) => c.name === 'diagnosisId')) {
      try {
        await queryRunner.query(`
          ALTER TABLE "lab_orders"
          ADD CONSTRAINT "FK_lab_orders_diagnosis"
          FOREIGN KEY ("diagnosisId") REFERENCES "diagnostics"("id") ON DELETE SET NULL
        `);
      } catch {
        /* FK may already exist */
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lab_orders" DROP CONSTRAINT IF EXISTS "FK_lab_orders_diagnosis"`,
    );

    const colsToDrop = ['diagnosisId', 'priority', 'diagnosis_code'];
    for (const col of colsToDrop) {
      await queryRunner.query(
        `ALTER TABLE "lab_orders" DROP COLUMN IF EXISTS "${col}"`,
      );
    }

    const table = await queryRunner.getTable('lab_orders');
    if (table?.columns.find((c) => c.name === 'lab_tests')) {
      await queryRunner.renameColumn('lab_orders', 'lab_tests', 'tests');
    }
  }
}
