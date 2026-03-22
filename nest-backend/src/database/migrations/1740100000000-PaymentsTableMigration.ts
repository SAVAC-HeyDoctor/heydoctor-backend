import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentsTableMigration1740100000000 implements MigrationInterface {
  name = 'PaymentsTableMigration1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('payments');
    if (exists) return;

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "amount" integer NOT NULL,
        "currency" character varying(8) NOT NULL DEFAULT 'CLP',
        "status" character varying(24) NOT NULL DEFAULT 'pending',
        "externalId" character varying(128),
        "paymentUrl" text,
        "patientId" uuid,
        "consultationId" uuid,
        "clinicId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "description" character varying(500) NOT NULL,
        "metadata" jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_clinic" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payments_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_payments_consultation" FOREIGN KEY ("consultationId") REFERENCES "appointments"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payments_external_id" ON "payments" ("externalId") WHERE "externalId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_clinic" ON "payments" ("clinicId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_patient" ON "payments" ("patientId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_consultation" ON "payments" ("consultationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_status" ON "payments" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
  }
}
