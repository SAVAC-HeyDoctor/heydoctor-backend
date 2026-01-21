import express from "express";
import { db } from "../db.js";
import fetch from "node-fetch";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const uuid = req.params.id;

  try {
    // 1) Buscar documento en BD
    const { rows } = await db.query(
      "SELECT * FROM documents WHERE uuid = $1",
      [uuid]
    );

    const valid = rows.length > 0;
    const doc = rows[0] || null;

    // 2) Obtener información del usuario que escanea
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress;

    const userAgent = req.headers["user-agent"] || "N/A";

    // 3) Geolocalización (opcional pero útil)
    let country = null;
    let city = null;

    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      const geoData = await geoRes.json();

      country = geoData.country_name || null;
      city = geoData.city || null;
    } catch (err) {
      console.warn("Geolocalización falló");
    }

    // 4) Registrar auditoría
    await db.query(
      `INSERT INTO verification_logs 
         (document_uuid, ip_address, user_agent, country, city, result)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuid, ip, userAgent, country, city, valid]
    );

    // 5) Respuesta para el frontend
    if (!valid) {
      return res.json({ valid: false });
    }

    return res.json({
      valid: true,
      type: doc.type,
      date: doc.created_at,
      doctor: {
        name: doc.doctor_name,
        specialty: doc.doctor_specialty,
        registration: doc.doctor_registration,
        signature: doc.doctor_signature_url,
      },
    });
  } catch (err) {
    console.error("Error en verificación:", err);
    return res.status(500).json({ valid: false });
  }
});

export default router;
