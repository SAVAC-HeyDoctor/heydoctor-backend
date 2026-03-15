"use strict";

const clinicalIntelligence = require("../../../../modules/clinical-intelligence");

module.exports = {
  async suggest(ctx) {
    const user = ctx.state?.user;
    if (!user) return ctx.unauthorized("Autenticación requerida");

    const symptoms = ctx.query?.symptoms ?? ctx.query?.symptoms_text ?? "";
    const clinicId = ctx.state?.clinicId ?? null;

    if (!symptoms || typeof symptoms !== "string") {
      return ctx.badRequest("Se requiere el parámetro symptoms");
    }

    const [suggestedDiagnoses, suggestedTreatments] = await Promise.all([
      clinicalIntelligence.suggestDiagnoses(symptoms, clinicId, 15),
      clinicalIntelligence.suggestTreatments(symptoms, clinicId, 15),
    ]);

    return ctx.send({
      suggested_diagnoses: suggestedDiagnoses,
      suggested_treatments: suggestedTreatments,
    });
  },
};
