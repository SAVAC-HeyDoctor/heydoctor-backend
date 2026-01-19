import express from "express";
import { db } from "../db.js";
import { createBasePDF } from "../utils/pdfCommon.js";

const router = express.Router();

/* ---------------------------------------------------------
   📄 CERTIFICADO MÉDICO PDF
   Ruta: GET /pdf/certificates/:id
--------------------------------------------------------- */
router.get("/certificates/:id", async (req, res) => {
  try {
    const patientId = req.params.id;

    // ----------------------------
    // 1. Datos del médico
    // ----------------------------
    const doctorRes = await db.query("SELECT * FROM doctor LIMIT 1");
    const doctor = doctorRes.rows[0];

    // ----------------------------
    // 2. Datos del paciente
    // ----------------------------
    const patientRes = await db.query(
      "SELECT * FROM patients WHERE id = $1",
      [patientId]
    );
    const patient = patientRes.rows[0];

    if (!patient) {
      return res.status(404).send("Paciente no encontrado");
    }

    // ----------------------------
    // 3. Último diagnóstico si existe
    // ----------------------------
    let lastDx = "Sin diagnóstico registrado";

    if (patient.history && patient.history.length > 0) {
      const hx = patient.history[patient.history.length - 1];

      if (Array.isArray(hx.diagnosis) && hx.diagnosis.length > 0) {
        const dx = hx.diagnosis[0];
        lastDx = `${dx.code} — ${dx.name}`;
      }
    }

    // ----------------------------
    // 4. Crear PDF base
    // ----------------------------
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=certificado_${patientId}.pdf`
    );

    const doc = createBasePDF(res, {
      title: "Certificado Médico",
      doctorName: doctor.name,
      doctorRole: doctor.specialty,
      signatureFile: "signature.png",
      sealFile: "seal.png",
      verificationUrl: "https://heydoctor.health/verify"
    });

    // ----------------------------
    // 5. Contenido del certificado
    // ----------------------------
    doc
      .fontSize(16)
      .fillColor("#0d9488")
      .text("CERTIFICADO MÉDICO", { align: "center" })
      .moveDown(2);

    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Paciente: ${patient.name}`)
      .text(`RUT / ID: ${patient.rut || "No registrado"}`)
      .text(`Fecha de emisión: ${new Date().toLocaleString("es-CL")}`)
      .moveDown(1.5);

    doc
      .fontSize(12)
      .text(
        `Se certifica que el/la paciente antes mencionado(a) fue evaluado(a) clínicamente, `
      )
      .text(
        `presentando la siguiente condición médica diagnosticada: ${lastDx}.`
      )
      .moveDown(1);

    doc
      .text(
        `Se recomienda reposo y seguimiento clínico según evolución, además del cumplimiento `
      )
      .text("de las indicaciones entregadas durante la consulta.")
      .moveDown(2);

    // ----------------------------
    // 6. Firma + sello
    // ----------------------------
    doc.addSignatureBlock();

    // ----------------------------
    // 7. QR de verificación
    // ----------------------------
    await doc.addVerificationQR(patientId);

    // ----------------------------
    // 8. Finalizar PDF
    // ----------------------------
    doc.end();

  } catch (err) {
    console.error("❌ Error generando certificado:", err);
    res.status(500).send("Error interno al generar certificado PDF");
  }
});

export default router;

