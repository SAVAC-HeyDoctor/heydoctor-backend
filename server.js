import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";

dotenv.config();

const app = express();
app.use(express.json());

// =========================
// CORS (ajustar dominio final)
// =========================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// =========================
// ARCHIVOS ESTÁTICOS
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =========================
// RUTAS
// =========================
import authRouter from "./routes/auth.js";
import pacientesRouter from "./routes/pacientes.js";
import agendaRouter from "./routes/agenda.js";
import configRouter from "./routes/config.js";
// import cie10Router from "./routes/cie.10.js";  // deshabilitada

import notificationsRouter from "./routes/notifications.js";
import onesignalRoutes from "./routes/onesignal.js";

import pdfCertificateRouter from "./routes/pdfCertificate.js";
import pdfPrescriptionRouter from "./routes/pdfPrescription.js";
import pdfInterconsultRouter from "./routes/pdfInterconsult.js";

import auditoriaRoutes from "./routes/auditoria.js";

// =========================
// USO DE RUTAS
// =========================
app.use("/auth", authRouter);
app.use("/pacientes", pacientesRouter);
app.use("/agenda", agendaRouter);
app.use("/config", configRouter);

app.use("/notifications", notificationsRouter);
app.use("/notifications/push", onesignalRoutes);
app.use("/push", onesignalRoutes);

app.use("/pdf/certificate", pdfCertificateRouter);
app.use("/pdf/prescription", pdfPrescriptionRouter);
app.use("/pdf/interconsult", pdfInterconsultRouter);

app.use("/auditoria", auditoriaRoutes);

// =========================
// RUTA DE SALUD
// =========================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "heydoctor-backend",
    auth: "POST /auth/login",
    version: "1.0.0",
  });
});

// =========================
// RUTA 404
// =========================
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

// =========================
// MANEJO GLOBAL DE ERRORES
// =========================
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err);

  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Error interno del servidor",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// =========================
// CREAR TABLA USERS
// =========================
async function ensureUsersTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("✔ Tabla users lista");
  } catch (error) {
    console.error("❌ Error creando tabla users:", error.message);
  }
}

// =========================
// CREAR ADMIN AUTOMÁTICO
// =========================
async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_NAME) {
    console.warn("⚠ Variables ADMIN_* faltan en Railway");
    return;
  }

  try {
    const result = await db.query("SELECT * FROM users WHERE email=$1", [ADMIN_EMAIL]);

    if (result.rows.length === 0) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

      await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)`,
        [ADMIN_NAME, ADMIN_EMAIL, hash, "admin"]
      );

      console.log("✔ Admin creado automáticamente");
    } else {
      console.log("✔ Admin ya existe");
    }
  } catch (error) {
    console.error("❌ Error creando admin:", error.message);
  }
}

// =========================
—
// PRODUCCIÓN
// =========================
const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL es obligatorio en producción.");
    process.exit(1);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error("❌ JWT_SECRET debe tener al menos 32 caracteres.");
    process.exit(1);
  }
}

// =========================
// INICIAR SERVIDOR
// =========================
app.listen(PORT, "0.0.0.0", async () => {
  console.log("🚀 Backend iniciando...");

  await ensureUsersTable();
  await ensureAdmin();

  console.log(`🚀 HeyDoctor backend corriendo en puerto: ${PORT}`);
});

export default app;
