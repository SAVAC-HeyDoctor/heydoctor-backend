"use strict";

/**
 * Medical AI Engine - motor de aprendizaje continuo basado en datos clínicos agregados.
 * Modelo probabilístico: P(diagnosis|symptoms), P(treatment|diagnosis)
 */
const knowledgeGraph = require("../knowledge-graph");
const kgClickhouse = require("../knowledge-graph/clickhouse");
const analytics = require("../analytics");

const REL = {
  SYMPTOM_DIAGNOSIS: "symptom_diagnosis",
  DIAGNOSIS_TREATMENT: "diagnosis_treatment",
  SYMPTOM_TREATMENT: "symptom_treatment",
};

function isEnabled() {
  return knowledgeGraph.isEnabled();
}

/**
 * Convierte síntomas (array o string) a nodos symptom.
 */
function symptomsToNodes(symptoms) {
  if (Array.isArray(symptoms)) {
    return symptoms
      .filter((s) => s && typeof s === "string")
      .map((s) => s.toLowerCase().trim())
      .filter((s) => s.length >= 2)
      .map((s) => `symptom:${s.replace(/\s+/g, "_")}`);
  }
  if (typeof symptoms === "string") {
    return symptoms
      .toLowerCase()
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
      .map((t) => `symptom:${t.replace(/\s+/g, "_")}`);
  }
  return [];
}

/**
 * Entrena el modelo desde el Knowledge Graph.
 * El modelo heurístico usa los pesos del KG directamente; no requiere entrenamiento separado.
 */
async function trainFromKnowledgeGraph(clinicId = null) {
  if (!isEnabled()) return { ok: false, reason: "Knowledge graph not configured" };
  const kgResult = await knowledgeGraph.queryKnowledgeGraph("dolor", clinicId, { limit: 1 });
  const hasData = (kgResult.diagnoses?.length ?? 0) > 0 || (kgResult.treatments?.length ?? 0) > 0;
  return { ok: true, model: "heuristic", has_data: hasData };
}

/**
 * Actualiza los modelos clínicos (re-entrena desde KG).
 */
async function updateClinicalModels(clinicId = null) {
  return trainFromKnowledgeGraph(clinicId);
}

/**
 * P(diagnosis | symptoms) usando pesos del KG.
 * confidence = weight / total_weight (normalizado 0-1).
 */
async function predictFromSymptoms(symptoms, clinicId = null, options = {}) {
  if (!isEnabled()) {
    return {
      predicted_diagnoses: [],
      suggested_treatments: [],
      confidence_scores: [],
    };
  }

  const symptomNodes = symptomsToNodes(symptoms);
  if (symptomNodes.length === 0) {
    return {
      predicted_diagnoses: [],
      suggested_treatments: [],
      confidence_scores: [],
    };
  }

  const limit = options.limit ?? 15;

  const [diagRows, treatRows, totalDiagWeight, totalTreatWeight] = await Promise.all([
    kgClickhouse.aggregateByTarget(symptomNodes, REL.SYMPTOM_DIAGNOSIS, clinicId, limit),
    kgClickhouse.aggregateByTarget(symptomNodes, REL.SYMPTOM_TREATMENT, clinicId, limit),
    kgClickhouse.getTotalWeight(symptomNodes, REL.SYMPTOM_DIAGNOSIS, clinicId),
    kgClickhouse.getTotalWeight(symptomNodes, REL.SYMPTOM_TREATMENT, clinicId),
  ]);

  const predicted_diagnoses = diagRows.map((r) => {
    const code = (r.target_node ?? "").replace("diagnosis:", "");
    const weight = Number(r.total_weight ?? 0);
    const confidence = totalDiagWeight > 0 ? Math.min(1, weight / totalDiagWeight) : 0;
    return { code, weight, confidence };
  });

  const suggested_treatments = treatRows.map((r) => {
    const name = (r.target_node ?? "").replace("treatment:", "").replace(/_/g, " ");
    const weight = Number(r.total_weight ?? 0);
    const confidence = totalTreatWeight > 0 ? Math.min(1, weight / totalTreatWeight) : 0;
    return { name, weight, confidence };
  });

  const topDiagnoses = predicted_diagnoses.slice(0, 5).map((d) => `diagnosis:${d.code}`);
  let treatmentsFromDiagnoses = [];
  if (topDiagnoses.length > 0) {
    const diagTreatRows = await kgClickhouse.aggregateByTarget(
      topDiagnoses,
      REL.DIAGNOSIS_TREATMENT,
      clinicId,
      limit
    );
    const existingNames = new Set(suggested_treatments.map((t) => t.name?.toLowerCase()));
    for (const r of diagTreatRows) {
      const name = (r.target_node ?? "").replace("treatment:", "").replace(/_/g, " ");
      if (name && !existingNames.has(name.toLowerCase())) {
        const weight = Number(r.total_weight ?? 0);
        treatmentsFromDiagnoses.push({ name, weight, confidence: 0.5, source: "diagnosis" });
        existingNames.add(name.toLowerCase());
      }
    }
  }

  const allTreatments = [...suggested_treatments, ...treatmentsFromDiagnoses].sort(
    (a, b) => (b.weight ?? 0) - (a.weight ?? 0)
  );

  const confidence_scores = {
    diagnoses_total_weight: totalDiagWeight,
    treatments_total_weight: totalTreatWeight,
    symptom_nodes_matched: symptomNodes.length,
  };

  return {
    predicted_diagnoses,
    suggested_treatments: allTreatments.slice(0, limit),
    confidence_scores,
  };
}

/**
 * Genera predicciones (alias de predictFromSymptoms).
 */
async function generatePredictions(symptoms, clinicId = null, options = {}) {
  return predictFromSymptoms(symptoms, clinicId, options);
}

/**
 * Sugiere decisiones clínicas basadas en síntomas.
 */
async function suggestClinicalDecisions(symptoms, clinicId = null, options = {}) {
  const result = await predictFromSymptoms(symptoms, clinicId, options);
  return {
    predictions: result.predicted_diagnoses,
    treatments: result.suggested_treatments,
    confidence: result.confidence_scores,
  };
}

/**
 * Enriquece sugerencias de otros módulos (Copilot, Clinical Intelligence).
 */
async function enrichSuggestions(symptoms, clinicId, baseResult = {}) {
  if (!isEnabled()) return baseResult;

  const engineResult = await predictFromSymptoms(symptoms, clinicId, { limit: 10 });
  const existingCodes = new Set((baseResult.suggested_diagnoses ?? baseResult.predictions ?? []).map((d) => d.code));
  const existingTreatments = new Set(
    (baseResult.suggested_treatments ?? baseResult.treatments ?? []).map((t) => String(t.name ?? "").toLowerCase())
  );

  for (const d of engineResult.predicted_diagnoses ?? []) {
    if (d.code && !existingCodes.has(d.code)) {
      baseResult.suggested_diagnoses = baseResult.suggested_diagnoses ?? [];
      baseResult.suggested_diagnoses.push({
        code: d.code,
        confidence: d.confidence,
        frequency: d.weight,
        source: "medical_ai_engine",
      });
      existingCodes.add(d.code);
    }
  }

  for (const t of engineResult.suggested_treatments ?? []) {
    const name = (t.name ?? "").trim();
    if (name && !existingTreatments.has(name.toLowerCase())) {
      baseResult.suggested_treatments = baseResult.suggested_treatments ?? [];
      baseResult.suggested_treatments.push({
        name,
        confidence: t.confidence,
        frequency: t.weight,
        source: "medical_ai_engine",
      });
      existingTreatments.add(name.toLowerCase());
    }
  }

  return baseResult;
}

module.exports = {
  isEnabled,
  trainFromKnowledgeGraph,
  updateClinicalModels,
  generatePredictions,
  suggestClinicalDecisions,
  predictFromSymptoms,
  enrichSuggestions,
};
