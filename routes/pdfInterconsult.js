import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { db } from "../db.js";

const router = express.Router();

/* -------------------------------------------------
   GENERAR ORDEN / INTERCONSULTA
-------------------------------------------------- */
router.post("/:id", async (req, res) => {
  try {
    const patientId = req.params.id;

    const {
      specialty,
      reason,
      findings,
      urgency = false,
      recommendations,
    } = req.body;

    if (!specialty || !reason) {
      return res.status(400).json({
        error: "Debe incluir especialidad y motivo de derivación",
      });
    }

    // Obtener datos del paciente
    const { rows } = await db.query("SELECT * FROM patients WHERE id = $1", [
      patientId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    const patient = rows[0];

    /* Crear archivo PDF */
    const filename = `interconsult-${patientId}-${Date.now()}.pdf`;
    const outputPath = path.join("public", filename);

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    /* ---------------------------------------------
       ENCABEZADO HEYDOCTOR
    ---------------------------------------------- */
    doc
      .fontSize(28)
      .fillColor("#0d9488")
      .text("Orden / Interconsulta", { align: "center" })
      .moveDown();

    doc
      .fontSize(12)
      .fillColor("#333")
      .text("Centro Médico HeyDoctor™", { align: "center" })
      .text("Dr. Jairo Santana — Médico y Cirujano", { align: "center" })
      .text("Registro Profesional: 202404 | Chile", { align: "center" })
      .moveDown(2);

    /* ---------------------------------------------
       DATOS DEL PACIENTE
    ---------------------------------------------- */
    doc
      .fontSize(14)
      .fillColor("#0d9488")
      .text("Datos del Paciente", { underline: true });

    doc
      .fontSize(12)
      .fillColor("#000")
      .moveDown(0.5)
      .text(`Nombre: ${patient.name}`)
      .text(`ID/RUT: ${patient.rut || "—"}`)
      .text(`Fecha de nacimiento: ${patient.birthdate || "—"}`)
      .moveDown(1.5);

    /* ---------------------------------------------
       ESPECIALIDAD
    ---------------------------------------------- */
    doc
      .fontSize(14)
      .fillColor("#0d9488")
      .text("Derivación a especialista", { underline: true })
      .moveDown(0.5);

    doc.fontSize(12).fillColor("#000").text(`Especialidad: ${specialty}`);
    doc.moveDown(1.5);

    /* ---------------------------------------------
       MOTIVO DE CONSULTA / DERIVACIÓN
    ---------------------------------------------- */
    doc
      .fontSize(14)
      .fillColor("#0d9488")
      .text("Motivo de derivación", { underline: true })
      .moveDown(0.5);

    doc.fontSize(12).fillColor("#000").text(reason).moveDown(1.5);

    /* ---------------------------------------------
       HALLAZGOS / EXAMEN FÍSICO (opcional)
    ---------------------------------------------- */
    if (findings) {
      doc
        .fontSize(14)
        .fillColor("#0d9488")
        .text("Hallazgos relevantes", { underline: true })
        .moveDown(0.5);

      doc.fontSize(12).fillColor("#000").text(findings).moveDown(1.5);
    }

    /* ---------------------------------------------
       URGENCIA
    ---------------------------------------------- */
    if (urgency) {
      doc
        .fontSize(14)
        .fillColor("#b91c1c")
        .text("⚠️  Interconsulta de Urgencia", { underline: true })
        .moveDown(1);
    }

    /* ---------------------------------------------
       RECOMENDACIONES (opcional)
    ---------------------------------------------- */
    if (recommendations) {
      doc
        .fontSize(14)
        .fillColor("#0d9488")
        .text("Recomendaciones", { underline: true })
        .moveDown(0.5);

      doc.fontSize(12).fillColor("#000").text(recommendations).moveDown(1.5);
    }

    /* ---------------------------------------------
       FIRMA Y SELLO
    ---------------------------------------------- */
    const signaturePath = path.resolve("public", "signature.png");
    const sealPath = path.resolve("public", "seal.png");

    if (fs.existsSync(signaturePath)) {
      doc.image(signaturePath, 50, doc.y + 10, { width: 180 });
    }

    if (fs.existsSync(sealPath)) {
      doc.image(sealPath, 360, doc.y - 10, { width: 120 });
    }

    doc.moveDown(5);

    doc
      .fontSize(12)
      .fillColor("#000")
      .text("__________________________", 50)
      .text("Dr. Jairo Santana", 50)
      .text("Médico y Cirujano — Reg. 202404", 50)
      .moveDown(2);

    /* ---------------------------------------------
       QR DE VERIFICACIÓN
    ---------------------------------------------- */
    const verifyUrl = `${process.env.BASE_URL}/verify/interconsult/${patientId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);

    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrPath = path.join("public", `qr-${Date.now()}.png`);

    fs.writeFileSync(qrPath, Buffer.from(qrBase64, "base64"));

    doc.image(qrPath, 430, doc.y, { width: 120 });

    /* ---------------------------------------------
       PIE DE PÁGINA
    ---------------------------------------------- */
    doc
      .fontSize(10)
      .fillColor("#666")
      .text("Emitido electrónicamente por HeyDoctor™", { align: "center" })
      .text("Documento válido sin firma manuscrita", { align: "center" })
      .text(new Date().toLocaleString("es-CL"), { align: "center" });

    doc.end();

    stream.on("finish", () => {
      res.json({
        ok: true,
        url: `${process.env.BASE_URL}/public/${filename}`,
      });
    });
  } catch (err) {
    console.error("❌ Error generando PDF de interconsulta:", err);
    res.status(500).json({ error: "Error generando PDF" });
  }
});

export default router;
