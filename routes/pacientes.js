import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db } from "../db.js";

const router = express.Router();

/* ---------------------------------------
   MULTER → SUBIDA DE ARCHIVOS
---------------------------------------- */
const upload = multer({ dest: "uploads/" });

/* ---------------------------------------
   GET PACIENTE POR ID
---------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM patients WHERE id = $1",
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Paciente no encontrado" });

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error cargando paciente:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ---------------------------------------
   SUBIR ARCHIVO DEL PACIENTE
---------------------------------------- */
router.post("/:id/files", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file)
      return res.status(400).json({ error: "No se recibió archivo" });

    const fileUrl = `${process.env.BASE_URL}/uploads/${file.filename}`;

    await db.query(
      `
      UPDATE patients
      SET files = COALESCE(files, '[]'::jsonb) || jsonb_build_object(
        'filename', $1,
        'url', $2,
        'stored', $3
      )
      WHERE id = $4
      `,
      [file.originalname, fileUrl, file.filename, req.params.id]
    );

    res.json({
      success: true,
      url: fileUrl,
      filename: file.originalname,
      stored: file.filename,
    });
  } catch (err) {
    console.error("❌ Error subiendo archivo:", err);
    res.status(500).json({ error: "Error al subir archivo" });
  }
});

/* ---------------------------------------
   ELIMINAR ARCHIVO DEL PACIENTE (BACKEND)
---------------------------------------- */
router.delete("/:id/files/:stored", async (req, res) => {
  try {
    const { id, stored } = req.params;

    // 1) Ubicación física del archivo
    const filePath = path.join("uploads", stored);

    // 2) Borrar archivo del servidor si existe
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 3) Quitar del JSONB de Postgres
    const { rows } = await db.query(
      `
      UPDATE patients
      SET files = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(files)
        AS elem
        WHERE elem->>'stored' != $1
      )
      WHERE id = $2
      RETURNING files
      `,
      [stored, id]
    );

    res.json({
      success: true,
      message: "Archivo eliminado",
      files: rows[0].files,
    });
  } catch (err) {
    console.error("❌ Error eliminando archivo:", err);
    res.status(500).json({ error: "Error al eliminar archivo" });
  }
});

/* ---------------------------------------
   GUARDAR HISTORIA CLÍNICA (S-O-A-P)
---------------------------------------- */
router.post("/:id/history", async (req, res) => {
  const { subjective, objective, diagnosis, plan } = req.body;

  try {
    await db.query(
      `
      UPDATE patients SET history = 
        COALESCE(history, '[]'::jsonb) || 
        jsonb_build_object(
          'date', NOW(),
          'subjective', $1,
          'objective', $2,
          'diagnosis', $3,
          'plan', $4
        )
      WHERE id = $5
      `,
      [subjective, objective, JSON.stringify(diagnosis), plan, req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error guardando historia:", err);
    res.status(500).json({ error: "Error interno guardando historia" });
  }
});

export default router;
