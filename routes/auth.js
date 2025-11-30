import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const query = await db.query("SELECT * FROM users WHERE email=$1", [email]);
  const user = query.rows[0];

  if (!user) return res.status(400).json({ error: "Usuario no existe" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: "Contraseña incorrecta" });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token, user });
});

export default router;