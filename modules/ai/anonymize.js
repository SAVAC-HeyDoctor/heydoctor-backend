"use strict";

/**
 * Anonimización de datos clínicos antes de enviar a AI.
 * Nunca enviar: nombres, emails, documentos médicos, identificadores.
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const NAME_PATTERNS = [
  /\b(?:nombre|paciente|doctor|dr\.?|dra\.?)\s*:?\s*[A-Za-zÀ-ÿ\s]{2,50}\b/gi,
  /\b(?:firstname|lastname|patient|doctor)\s*:?\s*["']?[A-Za-zÀ-ÿ\s]{2,50}["']?/gi,
];

function anonymizeText(text) {
  if (!text || typeof text !== "string") return "";
  let out = text
    .replace(EMAIL_REGEX, "[EMAIL_REDACTED]")
    .replace(/\b\d{8,}\b/g, "[ID_REDACTED]")
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, "[DATE_REDACTED]");
  NAME_PATTERNS.forEach((p) => {
    out = out.replace(p, "[NAME_REDACTED]");
  });
  return out;
}

function anonymizeTranscript(transcript) {
  if (!transcript) return "";
  if (Array.isArray(transcript)) {
    return transcript.map((t) => anonymizeText(String(t?.message ?? t?.text ?? t))).join("\n");
  }
  return anonymizeText(String(transcript));
}

function anonymizeMessages(messages) {
  if (!messages || !Array.isArray(messages)) return "";
  return messages
    .map((m) => anonymizeText(String(m?.message ?? m?.text ?? "")))
    .filter(Boolean)
    .join("\n");
}

function anonymizeClinicalNotes(notes) {
  if (!notes) return "";
  if (typeof notes === "object") {
    const parts = [];
    ["observations", "clinical_judgement", "admission_reason", "personal_background"].forEach((k) => {
      if (notes[k]) parts.push(anonymizeText(String(notes[k])));
    });
    return parts.join("\n");
  }
  return anonymizeText(String(notes));
}

module.exports = {
  anonymizeText,
  anonymizeTranscript,
  anonymizeMessages,
  anonymizeClinicalNotes,
};
