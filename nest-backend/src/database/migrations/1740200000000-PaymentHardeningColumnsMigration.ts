import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentHardeningColumnsMigration1740200000000
  implements MigrationInterface
{
  name = 'PaymentHardeningColumnsMigration1740200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payments');
    if (!table) return;

    const addCol = async (name: string, sql: string) => {
      const col = table.columns.find((c) => c.name === name);
      if (!col) await queryRunner.query(sql);
    };

    await addCol(
      'rawResponse',
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "rawResponse" jsonb`,
    );
    await addCol(
      'transactionId',
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "transactionId" character varying(128)`,
    );
    await addCol(
      'paidAt',
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMPTZ`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payments');
    if (!table) return;
    for (const col of ['paidAt', 'transactionId', 'rawResponse']) {
      if (table.columns.find((c) => c.name === col)) {
        await queryRunner.query(
          `ALTER TABLE "payments" DROP COLUMN IF EXISTS "${col}"`,
        );
      }
    }
  }
}
