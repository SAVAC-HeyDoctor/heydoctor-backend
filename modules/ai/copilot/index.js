"use strict";

/**
 * AI Clinical Copilot - asistencia durante consulta activa.
 * Requiere AI_PROVIDER configurado.
 */
const provider = require("../provider");
const { anonymizeText, anonymizeMessages, anonymizeClinicalNotes } = require("../anonymize");

function isEnabled() {
  return provider.isEnabled();
}

/**
 * Analiza el contexto de la consulta (anonimizado).
 * Entrada: messages, clinicalNotes, patientHistory
 */
function analyzeConsultationContext({ messages = [], clinicalNotes = null, patientHistory = null } = {}) {
  const safeMessages = anonymizeMessages(messages);
  const safeNotes = anonymizeClinicalNotes(clinicalNotes);
  let safeHistory = "";
  if (patientHistory) {
    if (typeof patientHistory === "object") {
      const parts = [];
      ["observations", "personal_background", "family_background", "clinical_judgement", "admission_reason", "allergies", "habits"].forEach((k) => {
        if (patientHistory[k]) parts.push(String(patientHistory[k]));
      });
      safeHistory = anonymizeText(parts.join("\n"));
    } else {
      safeHistory = anonymizeText(String(patientHistory));
    }
  }
  return {
    messagesText: safeMessages,
    notesText: safeNotes,
    historyText: safeHistory,
  };
}

/**
 * Genera sugerencias clínicas a partir del contexto.
 * Salida: { symptoms_detected, possible_diagnoses, suggested_questions, suggested_tests }
 */
async function generateSuggestions({ messages = [], clinicalNotes = null, patientHistory = null } = {}) {
  if (!isEnabled()) return null;

  const { messagesText, notesText, historyText } = analyzeConsultationContext({ messages, clinicalNotes, patientHistory });
  const input = [messagesText, notesText, historyText].filter(Boolean).join("\n---\n");
  if (!input.trim()) return null;

  const prompt = `Eres un asistente médico. Analiza el siguiente contexto de consulta en curso (anonimizado) y genera sugerencias para el médico.
Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto adicional.
Formato:
{
  "symptoms_detected": ["síntoma 1", "síntoma 2"],
  "possible_diagnoses": ["diagnóstico posible 1", "diagnóstico posible 2"],
  "suggested_questions": ["pregunta sugerida 1", "pregunta sugerida 2"],
  "suggested_tests": ["prueba sugerida 1", "prueba sugerida 2"]
}

Contexto de consulta:
${input}`;

  const content = await provider.chatCompletion([{ role: "user", content: prompt }], { max_tokens: 512 });
  if (!content) return null;

  try {
    const json = content.replace(/```json?\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(json);
    return {
      symptoms_detected: Array.isArray(parsed.symptoms_detected) ? parsed.symptoms_detected : [],
      possible_diagnoses: Array.isArray(parsed.possible_diagnoses) ? parsed.possible_diagnoses : [],
      suggested_questions: Array.isArray(parsed.suggested_questions) ? parsed.suggested_questions : [],
      suggested_tests: Array.isArray(parsed.suggested_tests) ? parsed.suggested_tests : [],
    };
  } catch {
    return {
      symptoms_detected: [],
      possible_diagnoses: [],
      suggested_questions: [],
      suggested_tests: [],
    };
  }
}

module.exports = {
  isEnabled,
  analyzeConsultationContext,
  generateSuggestions,
};
