"use strict";

/**
 * Módulo AI - Clinical Assistant, Medical Search, Insights.
 * Solo activo cuando AI_PROVIDER está configurado.
 */
const provider = require("./provider");
const { anonymizeText, anonymizeTranscript, anonymizeMessages, anonymizeClinicalNotes } = require("./anonymize");

function isEnabled() {
  return provider.isEnabled();
}

/**
 * Genera resumen estructurado de consulta.
 * Entrada anonimizada. Salida: { summary, symptoms, possible_diagnoses, recommended_tests }
 */
async function generateConsultationSummary({ transcript, messages, clinicalNotes } = {}) {
  if (!isEnabled()) return null;

  const safeTranscript = anonymizeTranscript(transcript);
  const safeMessages = anonymizeMessages(messages);
  const safeNotes = anonymizeClinicalNotes(clinicalNotes);

  const input = [safeTranscript, safeMessages, safeNotes].filter(Boolean).join("\n---\n");
  if (!input.trim()) return null;

  const prompt = `Eres un asistente médico. Analiza el siguiente texto clínico anonimizado y genera un resumen estructurado en JSON.
Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto adicional.
Formato:
{
  "summary": "resumen breve de la consulta",
  "symptoms": ["síntoma1", "síntoma2"],
  "possible_diagnoses": ["diagnóstico posible 1", "diagnóstico posible 2"],
  "recommended_tests": ["prueba recomendada 1", "prueba recomendada 2"]
}

Texto clínico:
${input}`;

  const content = await provider.chatCompletion([{ role: "user", content: prompt }], { max_tokens: 512 });
  if (!content) return null;

  try {
    const json = content.replace(/```json?\s*|\s*```/g, "").trim();
    return JSON.parse(json);
  } catch {
    return { summary: content, symptoms: [], possible_diagnoses: [], recommended_tests: [] };
  }
}

/**
 * Búsqueda médica con AI - interpreta consulta y sugiere diagnósticos/CIE10.
 */
async function aiMedicalSearch(query) {
  if (!isEnabled() || !query || typeof query !== "string") return null;

  const safeQuery = anonymizeText(query);
  if (!safeQuery.trim()) return null;

  const prompt = `Eres un asistente médico. Dado el siguiente síntoma o descripción clínica, sugiere posibles diagnósticos o condiciones relacionadas (nombres en inglés para CIE10).
Responde ÚNICAMENTE con un JSON array de strings, sin markdown.
Ejemplo: ["Migraine", "Hypertension", "Intracranial pressure"]

Descripción: ${safeQuery}`;

  const content = await provider.chatCompletion([{ role: "user", content: prompt }], { max_tokens: 256 });
  if (!content) return null;

  try {
    const json = content.replace(/```json?\s*|\s*```/g, "").trim();
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [content];
  } catch {
    return content ? [content] : [];
  }
}

module.exports = {
  isEnabled,
  generateConsultationSummary,
  aiMedicalSearch,
};
