import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// Railway: DATABASE_URL o DATABASE_PRIVATE_URL (PostgreSQL)
const raw =
  process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL || "";
const connectionString = String(raw).trim();

if (!connectionString) {
  throw new Error(
    "❌ DATABASE_URL no está definida. En Railway → Variables: añade DATABASE_URL por referencia al servicio PostgreSQL."
  );
}

if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
  throw new Error(
    "❌ DATABASE_URL debe ser una URL PostgreSQL válida (postgresql://user:pass@host:port/db)"
  );
}

try {
  new URL(connectionString);
} catch (e) {
  throw new Error(
    `❌ DATABASE_URL tiene formato inválido: ${e.message}. Revisa la variable en Railway.`
  );
}

export const db = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
