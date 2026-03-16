"use strict";

/**
 * Lab Orders Clinical App - módulo de órdenes de laboratorio.
 * Integra CDSS para sugerir exámenes según diagnóstico.
 */
const cdss = require("../../cdss");

const DEFAULT_LAB_TESTS = [
  "Complete Blood Count (CBC)",
  "Basic Metabolic Panel (BMP)",
  "Lipid Panel",
  "HbA1c",
  "Thyroid TSH",
  "Urinalysis",
  "Liver Function Tests",
  "Creatinine",
];

async function suggestLabTests(diagnosisCodeOrSymptoms, clinicId = null) {
  const symptoms = Array.isArray(diagnosisCodeOrSymptoms)
    ? diagnosisCodeOrSymptoms
    : [String(diagnosisCodeOrSymptoms || "")];
  if (!cdss.isEnabled()) {
    return { suggested_tests: DEFAULT_LAB_TESTS.slice(0, 5) };
  }
  const result = await cdss.evaluate(
    { symptoms, context: { clinic_id: clinicId } },
    clinicId,
    { emitEvent: false }
  );
  const tests = result?.suggested_tests ?? [];
  const fromCopilot = result?.suggested_diagnoses
    ? []
    : [];
  return {
    suggested_tests: tests.length > 0 ? tests : DEFAULT_LAB_TESTS.slice(0, 5),
    source: "cdss",
  };
}

function labOrderToFhirObservationRequest(labOrder, patientId) {
  if (!labOrder) return null;
  const tests = labOrder.lab_tests || [];
  return {
    resourceType: "ServiceRequest",
    id: `lab-${labOrder.id}`,
    status: labOrder.status === "completed" ? "completed" : "active",
    intent: "order",
    code: {
      coding: tests.map((t) => ({
        system: "http://loinc.org",
        code: typeof t === "string" ? t : t?.code ?? t?.name ?? "",
        display: typeof t === "string" ? t : t?.name ?? t?.code ?? "",
      })),
    },
    subject: patientId ? { reference: `Patient/${patientId}` } : null,
  };
}

module.exports = {
  suggestLabTests,
  labOrderToFhirObservationRequest,
};
