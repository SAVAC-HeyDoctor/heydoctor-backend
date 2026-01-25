import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";

// ======================================
// CARGAR VARIABLES DE ENTORNO
// ======================================
dotenv.config();

// 🔎 Verificación temporal (borrar luego)
console.log("ONESIGNAL APP ID:", process.env.ONESIGNAL_APP_ID);
console.log("ONESIGNAL REST KEY:", process.env.ONESIGNAL_REST_API_KEY);

const app = express();
app.use(express.json());

// ======================================
// CORS (AJUSTAR EN PRODUCCIÓN)
// ======================================
app.use(
  cors({
    origin: "*", // Cambiar a dominio final en producción
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// ======================================
// SERVIR ARCHIVOS ESTÁTICOS
// ======================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/public", express.static(path.join(__dirname, "public"))); // firmas, sellos
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // documentos subidos

// ======================================
// IMPORTAR RUTAS
// ======================================
import authRouter from "./routes/auth.js";
import pacientesRouter from "./routes/pacientes.js";
import agendaRouter from "./routes/agenda.js";
import configRouter from "./routes/config.js";
import cie10Router from "./routes/cie10.js";
import notificationsRouter from "./routes/notifications.js";

import pdfCertificateRouter from "./routes/pdfCertificate.js";
import pdfPrescriptionRouter from "./routes/pdfPrescription.js";
import pdfInterconsultRouter from "./routes/pdfInterconsult.js";

// ⭐ RUTA NUEVA — AUDITORÍA
import auditoriaRoutes from "./routes/auditoria.js";

// ======================================
// USAR RUTAS
// ======================================
app.use("/auth", authRouter);
app.use("/pacientes", pacientesRouter);
app.use("/agenda", agendaRouter);
app.use("/config", configRouter);
app.use("/cie10", cie10Router);

app.use("/notifications", notificationsRouter); // OneSignal REST

// PDF agrupadas
app.use("/pdf/certificate", pdfCertificateRouter);
app.use("/pdf/prescription", pdfPrescriptionRouter);
app.use("/pdf/interconsult", pdfInterconsultRouter);

// Auditoría
app.use("/auditoria", auditoriaRoutes);

// ======================================
// CREAR ADMIN SI NO EXISTE
// ======================================
async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_NAME) {
    console.warn("⚠️ Variables ADMIN_* faltan en el archivo .env");
    return;
  }

  const check = await db.query("SELECT * FROM users WHERE email=$1", [
    ADMIN_EMAIL,
  ]);

  if (check.rows.length === 0) {
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
}

// ======================================
// LEVANTAR SERVIDOR
// ======================================
const PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
  await ensureAdmin();
  console.log(`🚀 HeyDoctor backend corriendo en puerto: ${PORT}`);
});
