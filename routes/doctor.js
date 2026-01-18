import express from "express";
import { db } from "../db.js";

const router = express.Router();

// GET datos del médico
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM doctor LIMIT 1");
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Error cargando datos del doctor" });
  }
});

// POST guardar firma digital
router.post("/signature", async (req, res) => {
  const { signature } = req.body;

  if (!signature) return res.status(400).json({ error: "Firma faltante" });

  try {
    await db.query(
      `
      UPDATE doctor SET signature = $1
      `,
      [signature]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Error guardando firma:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;

