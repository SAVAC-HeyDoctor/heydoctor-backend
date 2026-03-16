"use strict";

/**
 * ePrescription Clinical App - módulo de recetas médicas.
 * Integra CDSS y Predictive Medicine para sugerir medicamentos.
 */
const cdss = require("../../cdss");
const predictiveMedicine = require("../../predictive-medicine");

async function suggestMedications(diagnosisCodeOrSymptoms, clinicId = null) {
  const symptoms = Array.isArray(diagnosisCodeOrSymptoms)
    ? diagnosisCodeOrSymptoms
    : [String(diagnosisCodeOrSymptoms || "")];
  const [cdssResult, predResult] = await Promise.all([
    cdss.isEnabled() ? cdss.evaluate({ symptoms, context: { clinic_id: clinicId } }, clinicId, { emitEvent: false }) : null,
    predictiveMedicine.isEnabled() ? predictiveMedicine.predictHealthRisks(symptoms, clinicId, { limit: 10 }) : null,
  ]);
  const treatments = cdssResult?.treatment_recommendations ?? [];
  const predTreatments = predResult?.suggested_treatments ?? [];
  const seen = new Set();
  const medications = [];
  for (const t of [...treatments, ...predTreatments]) {
    const name = (t.name ?? t.medication ?? "").trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      medications.push({ name, confidence: t.confidence ?? 0.5 });
    }
  }
  return {
    suggested_medications: medications.slice(0, 15),
    preventive_actions: predResult?.preventive_actions ?? [],
  };
}

function prescriptionToFhirMedicationRequest(prescription, patientId) {
  if (!prescription) return null;
  const meds = prescription.medications || [];
  return meds.map((m, i) => {
    const name = typeof m === "string" ? m : m?.name ?? m?.medication ?? "";
    return {
      resourceType: "MedicationRequest",
      id: `rx-${prescription.id}-${i}`,
      status: "active",
      intent: "order",
      medicationCodeableConcept: {
        coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", display: name }],
      },
      subject: patientId ? { reference: `Patient/${patientId}` } : null,
      dosageInstruction: prescription.dosage
        ? [{ text: prescription.dosage }]
        : [],
    };
  });
}

module.exports = {
  suggestMedications,
  prescriptionToFhirMedicationRequest,
};
