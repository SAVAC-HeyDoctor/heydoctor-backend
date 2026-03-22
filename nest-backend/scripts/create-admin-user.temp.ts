/**
 * TEMPORAL — borrar este archivo cuando ya no lo necesites.
 *
 * Genera hash bcrypt y opcionalmente crea/actualiza el usuario admin en DB.
 *
 * Solo hash (sin conectar a PostgreSQL):
 *   HASH_ONLY=1 npx ts-node -r tsconfig-paths/register scripts/create-admin-user.temp.ts
 *
 * Crear o actualizar usuario (requiere .env con DATABASE_URL o variables DB_*):
 *   npx ts-node -r tsconfig-paths/register scripts/create-admin-user.temp.ts
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../src/database/data-source';
import { User } from '../src/entities/user.entity';

const EMAIL = 'admin@heydoctor.health';
const PASSWORD = 'Admin123!';
const BCRYPT_ROUNDS = 10;

async function main() {
  const hash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  console.log('\n=== Hash bcrypt generado ===');
  console.log('email   :', EMAIL);
  console.log('password:', PASSWORD);
  console.log('rounds  :', BCRYPT_ROUNDS);
  console.log('hash    :', hash);
  console.log('============================\n');

  if (process.env.HASH_ONLY === '1') {
    console.log('HASH_ONLY=1 — no se conecta a la base de datos.\n');
    return;
  }

  await dataSource.initialize();
  try {
    const repo = dataSource.getRepository(User);
    let user = await repo.findOne({ where: { email: EMAIL } });

    if (user) {
      user.passwordHash = hash;
      if (!user.firstName) user.firstName = 'Admin';
      if (!user.lastName) user.lastName = 'HeyDoctor';
      await repo.save(user);
      console.log(`Usuario actualizado: ${EMAIL} (id=${user.id})\n`);
    } else {
      const created = repo.create({
        email: EMAIL,
        passwordHash: hash,
        firstName: 'Admin',
        lastName: 'HeyDoctor',
      });
      await repo.save(created);
      console.log(`Usuario creado: ${EMAIL} (id=${created.id})\n`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
