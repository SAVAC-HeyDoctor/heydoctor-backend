import express from "express";
import { db } from "../db.js";
import { createBasePDF } from "../utils/pdfCommon.js";

const router = express.Router();

/* ---------------------------------------------------------
   📄 ORDEN MÉDICA / INTERCONSULTA
   Ruta: GET /pdf/interconsult/:id
--------------------------------------------------------- */
router.get("/interconsult/:id", async (req, res) => {
  try {
    const patientId = req.params.id;

    // ---------------------------------
    // 1. Info del médico
    // ---------------------------------
    const doctorRes = await db.query("SELECT * FROM doctor LIMIT 1");
    const doctor = doctorRes.rows[0];

    // ---------------------------------
    // 2. Info del paciente
    // ---------------------------------
    const patientRes = await db.query(
      "SELECT * FROM patients WHERE id = $1",
      [patientId]
    );

    const patient = patientRes.rows[0];

    if (!patient) {
      return res.status(404).send("Paciente no encontrado");
    }

    // ---------------------------------
    // 3. Diagnóstico y motivo de referencia
    // ---------------------------------
    let diagnosisText = "Sin diagnóstico registrado";
    let reason = "Interconsulta / Orden médica";

    if (patient.history && patient.history.length > 0) {
      const lastHx = patient.history[patient.history.length - 1];

      if (Array.isArray(lastHx.diagnosis) && lastHx.diagnosis.length > 0) {
        diagnosisText = lastHx.diagnosis
          .map((dx) => `${dx.code} — ${dx.name}`)
          .join("\n");
      }

      if (lastHx.subjective) {
        reason = lastHx.subjective.slice(0, 250);
      }
    }

    // ---------------------------------
    // 4. Crear PDF base (firma + sello + QR)
    // ---------------------------------
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=interconsulta_${patientId}.pdf`
    );

    const doc = createBasePDF(res, {
      title: "Orden Médica / Interconsulta",
      doctorName: doctor.name,
      doctorRole: doctor.specialty,
      signatureFile: "signature.png",
      sealFile: "seal.png",
      verificationUrl: "https://heydoctor.health/verify",
    });

    // ---------------------------------
    // 5. Encabezado
    // ---------------------------------
    doc
      .fontSize(18)
      .fillColor("#0d9488")
      .text("ORDEN MÉDICA / INTERCONSULTA", { align: "center" })
      .moveDown(2);

    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Paciente: ${patient.name}`)
      .text(`RUT / ID: ${patient.rut || "No registrado"}`)
      .text(`Fecha: ${new Date().toLocaleString("es-CL")}`)
      .moveDown(2);

    // ---------------------------------
    // 6. Motivo
    // ---------------------------------
    doc
      .fontSize(12)
      .text("MOTIVO DE LA INTERCONSULTA:", { underline: true })
      .moveDown(1)
      .text(reason)
      .moveDown(2);

    // ---------------------------------
    // 7. Diagnóstico
    // ---------------------------------
    doc
      .fontSize(12)
      .text("DIAGNÓSTICO CLÍNICO (CIE10):", { underline: true })
      .moveDown(1)
      .text(diagnosisText)
      .moveDown(2);

    // ---------------------------------
    // 8. Recomendaciones / Plan
    // ---------------------------------
    doc
      .fontSize(12)
      .text("INDICACIONES / RECOMENDACIONES:", { underline: true })
      .moveDown(1);

    let plan = "Sin indicaciones registradas.";

    if (patient.history && patient.history.length > 0) {
      const lastHx = patient.history[patient.history.length - 1];
      if (lastHx.plan) plan = lastHx.plan;
    }

    doc.text(plan).moveDown(2);

    // ---------------------------------
    // 9. Firma + sello
    // ---------------------------------
    doc.addSignatureBlock();

    // ---------------------------------
    // 10. QR de verificación
    // ---------------------------------
    await doc.addVerificationQR(patientId);

    doc.end();
  } catch (err) {
    console.error("❌ Error generando interconsulta PDF:", err);
    res.status(500).send("Error interno al generar interconsulta PDF");
  }
});

export default router;

