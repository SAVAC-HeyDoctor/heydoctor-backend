"use strict";

/**
 * Clinical Intelligence - análisis de datos clínicos históricos agregados.
 * Solo datos agregados, nunca datos de pacientes individuales.
 */
function isEnabled() {
  return !!global.strapi;
}

/**
 * Extrae términos de búsqueda desde texto de síntomas.
 */
function parseSymptomTerms(symptoms) {
  if (!symptoms || typeof symptoms !== "string") return [];
  return symptoms
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Construye filtro ILIKE para múltiples términos (todos deben coincidir).
 */
function buildTextFilter(terms, field) {
  if (!terms.length) return {};
  const andFilters = terms.map((t) => ({ [field]: { $containsi: t } }));
  return { $and: andFilters };
}

/**
 * Analiza síntomas y devuelve patrones agregados.
 * Entrada: texto de síntomas, clinicId opcional.
 */
async function analyzeSymptoms(symptoms, clinicId = null) {
  if (!isEnabled()) return null;
  const terms = parseSymptomTerms(symptoms);
  if (!terms.length) return { matched_records: 0, top_diagnoses: [], top_treatments: [] };

  const strapi = global.strapi;
  const textFilter = buildTextFilter(terms, "admission_reason");
  if (Object.keys(textFilter).length === 0) return { matched_records: 0, top_diagnostics: [], top_treatments: [] };

  const filters = { ...textFilter };
  if (clinicId) filters.clinic = clinicId;

  const records = await strapi.db.query("api::clinical-record.clinical-record").findMany({
    where: filters,
    select: ["id"],
    limit: 500,
  });
  const recordIds = (records || []).map((r) => r.id);
  if (recordIds.length === 0) return { matched_records: 0, top_diagnostics: [], top_treatments: [] };

  const [diagCounts, treatCounts] = await Promise.all([
    getDiagnosticCountsByRecordIds(strapi, recordIds),
    getTreatmentCountsByRecordIds(strapi, recordIds),
  ]);

  return {
    matched_records: recordIds.length,
    top_diagnostics: diagCounts.slice(0, 10),
    top_treatments: treatCounts.slice(0, 10),
  };
}

async function getDiagnosticCountsByRecordIds(strapi, recordIds) {
  const diagnostics = await strapi.db.query("api::diagnostic.diagnostic").findMany({
    where: { clinical_record: { id: { $in: recordIds } } },
    select: ["id", "cie_10_code"],
    populate: { cie_10_code: { fields: ["code", "description"] } },
  });
  const byCie = {};
  for (const d of diagnostics || []) {
    const cie = d.cie_10_code;
    const key = cie?.id ?? "unknown";
    if (!byCie[key]) byCie[key] = { code: cie?.code ?? "", description: cie?.description ?? "", count: 0 };
    byCie[key].count += 1;
  }
  return Object.values(byCie).sort((a, b) => b.count - a.count);
}

async function getTreatmentCountsByRecordIds(strapi, recordIds) {
  const treatments = await strapi.db.query("api::treatment.treatment").findMany({
    where: { clinical_record: { id: { $in: recordIds } } },
    select: ["id", "name"],
  });
  const byName = {};
  for (const t of treatments || []) {
    const name = (t.name || "").trim() || "Sin nombre";
    if (!byName[name]) byName[name] = { name, count: 0 };
    byName[name].count += 1;
  }
  return Object.values(byName).sort((a, b) => b.count - a.count);
}

/**
 * Sugiere diagnósticos basados en síntomas (frecuencia en registros que coinciden).
 */
async function suggestDiagnoses(symptoms, clinicId = null, limit = 10) {
  const result = await analyzeSymptoms(symptoms, clinicId);
  if (!result) return [];
  return (result.top_diagnostics || []).slice(0, limit).map((d) => ({
    code: d.code,
    description: d.description,
    frequency: d.count,
  }));
}

/**
 * Sugiere tratamientos basados en síntomas (frecuencia en registros que coinciden).
 */
async function suggestTreatments(symptoms, clinicId = null, limit = 10) {
  const result = await analyzeSymptoms(symptoms, clinicId);
  if (!result) return [];
  return (result.top_treatments || []).slice(0, limit).map((t) => ({
    name: t.name,
    frequency: t.count,
  }));
}

/**
 * Patrones clínicos agregados: diagnósticos más frecuentes, tratamientos más frecuentes por diagnóstico.
 */
async function getClinicalPatterns(clinicId = null, options = {}) {
  if (!isEnabled()) return null;
  const strapi = global.strapi;
  const limit = options.limit ?? 20;

  const filters = clinicId ? { clinic: clinicId } : {};
  const diagnostics = await strapi.db.query("api::diagnostic.diagnostic").findMany({
    where: filters,
    select: ["id", "clinical_record", "cie_10_code"],
    populate: { cie_10_code: { fields: ["code", "description"] } },
    limit: 2000,
  });

  const cieCounts = {};
  const recordToCie = {};
  for (const d of diagnostics || []) {
    const cie = d.cie_10_code;
    const key = cie?.id ?? "unknown";
    const code = cie?.code ?? "";
    const desc = cie?.description ?? "";
    if (!cieCounts[key]) cieCounts[key] = { code, description: desc, count: 0 };
    cieCounts[key].count += 1;
    const recId = d.clinical_record?.id ?? d.clinical_record;
    if (recId) recordToCie[recId] = key;
  }

  const topDiagnostics = Object.values(cieCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((d) => ({ code: d.code, description: d.description, count: d.count }));

  const recordIds = Object.keys(recordToCie).map(Number).filter(Boolean);
  const treatments = recordIds.length
    ? await strapi.db.query("api::treatment.treatment").findMany({
        where: { clinical_record: { id: { $in: recordIds } } },
        select: ["id", "name", "clinical_record"],
        limit: 2000,
      })
    : [];

  const treatmentByDiagnosis = {};
  for (const t of treatments || []) {
    const recId = t.clinical_record?.id ?? t.clinical_record;
    const cieKey = recId ? recordToCie[recId] : null;
    if (!cieKey) continue;
    const name = (t.name || "").trim() || "Sin nombre";
    if (!treatmentByDiagnosis[cieKey]) treatmentByDiagnosis[cieKey] = {};
    if (!treatmentByDiagnosis[cieKey][name]) treatmentByDiagnosis[cieKey][name] = 0;
    treatmentByDiagnosis[cieKey][name] += 1;
  }

  const treatmentsByDiagnosis = topDiagnostics.slice(0, 5).map((d) => {
    const cieKey = Object.keys(cieCounts).find((k) => cieCounts[k].code === d.code);
    const counts = cieKey ? treatmentByDiagnosis[cieKey] || {} : {};
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    return { diagnosis: d.code, diagnosis_description: d.description, treatments: top };
  });

  return {
    top_diagnostics: topDiagnostics,
    treatments_by_diagnosis: treatmentsByDiagnosis,
  };
}

module.exports = {
  isEnabled,
  analyzeSymptoms,
  suggestDiagnoses,
  suggestTreatments,
  getClinicalPatterns,
};
