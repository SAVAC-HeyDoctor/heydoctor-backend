"use strict";

/**
 * AI Clinical Insights Clinical App - insights clínicos del paciente.
 * Agrega datos de Predictive Medicine, Clinical Intelligence y Knowledge Graph.
 */
const predictiveMedicine = require("../../predictive-medicine");
const clinicalIntelligence = require("../../clinical-intelligence");
const knowledgeGraph = require("../../knowledge-graph");

async function getPatientInsights(patientId, symptoms = [], clinicId = null) {
  const strapi = global.strapi;
  if (!strapi) return null;

  const patient = await strapi.entityService.findOne("api::patient.patient", patientId, {
    populate: ["clinical_record"],
  });
  if (!patient) return null;

  const symptomText = Array.isArray(symptoms) ? symptoms.join(" ") : String(symptoms || "");
  const symptomArr = symptomText
    ? symptomText
        .toLowerCase()
        .split(/[\s,;]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2)
    : [];

  let admissionReason = "";
  if (patient.clinical_record) {
    const cr =
      typeof patient.clinical_record === "object"
        ? patient.clinical_record
        : await strapi.entityService.findOne("api::clinical-record.clinical-record", patient.clinical_record);
    admissionReason = cr?.admission_reason ?? cr?.observations ?? "";
  }
  const effectiveSymptoms = symptomArr.length > 0 ? symptomArr : admissionReason.split(/\s+/).filter(Boolean).slice(0, 10);

  const [predResult, ciResult, kgResult] = await Promise.all([
    predictiveMedicine.isEnabled()
      ? predictiveMedicine.predictHealthRisks(effectiveSymptoms, clinicId, { limit: 15 })
      : null,
    clinicalIntelligence.isEnabled()
      ? clinicalIntelligence.analyzeSymptoms(effectiveSymptoms.join(" ") || admissionReason, clinicId)
      : null,
    knowledgeGraph.isEnabled()
      ? knowledgeGraph.queryKnowledgeGraph(effectiveSymptoms.join(" ") || admissionReason, clinicId, { limit: 10 })
      : null,
  ]);

  const predicted_conditions = predResult?.predicted_conditions ?? predResult?.risk_scores ?? [];
  const risk_scores = predResult?.risk_scores ?? predicted_conditions;
  const clinical_patterns = ciResult?.top_diagnostics ?? [];
  const recommended_actions = [
    ...(predResult?.preventive_actions ?? []),
    ...(ciResult?.top_treatments ?? []).map((t) => ({ type: "treatment", recommendation: t.name })),
  ];

  return {
    patient_id: patientId,
    predicted_conditions,
    risk_scores,
    clinical_patterns,
    recommended_actions,
    sources: {
      predictive_medicine: !!predResult,
      clinical_intelligence: !!ciResult,
      knowledge_graph: !!kgResult,
    },
  };
}

module.exports = {
  getPatientInsights,
};
