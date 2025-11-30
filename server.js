import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { db } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
import authRouter from "./routes/auth.js";
import pacientesRouter from "./routes/pacientes.js";
import agendaRouter from "./routes/agenda.js";
import configRouter from "./routes/config.js";

app.use("/auth", authRouter);
app.use("/pacientes", pacientesRouter);
app.use("/agenda", agendaRouter);
app.use("/config", configRouter);

// Create admin if missing
async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  const check = await db.query("SELECT * FROM users WHERE email=$1", [email]);

  if (check.rows.length === 0) {
    const hash = await bcrypt.hash(pass, 10);
    await db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)",
      [name, email, hash, "admin"]
    );
    console.log("✔ Usuario administrador creado");
  }
}

app.listen(process.env.PORT || 8080, async () => {
  await ensureAdmin();
  console.log("🚀 HeyDoctor backend corriendo");
});