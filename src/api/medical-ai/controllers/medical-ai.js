"use strict";

const medicalAiEngine = require("../../../../modules/medical-ai-engine");

module.exports = {
  async predict(ctx) {
    const user = ctx.state?.user;
    if (!user) return ctx.unauthorized("Autenticación requerida");

    const body = ctx.request?.body ?? {};
    let symptoms = body.symptoms ?? body.data?.attributes?.symptoms ?? [];

    if (!symptoms) {
      return ctx.badRequest("Se requiere symptoms");
    }
    if (typeof symptoms === "string") {
      symptoms = symptoms.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(symptoms)) {
      symptoms = [String(symptoms)];
    }

    const clinicId = ctx.state?.clinicId ?? null;

    if (!medicalAiEngine.isEnabled()) {
      return ctx.send({
        predictions: [],
        treatments: [],
        confidence: {},
        meta: { engine_enabled: false, message: "Medical AI Engine requiere Knowledge Graph (ClickHouse)" },
      });
    }

    const result = await medicalAiEngine.predictFromSymptoms(symptoms, clinicId, { limit: 15 });

    const strapi = global.strapi;
    const codeToDesc = {};
    const codes = (result.predicted_diagnoses ?? []).map((d) => d.code).filter(Boolean);
    if (strapi && codes.length > 0) {
      const cieCodes = await strapi.db.query("api::cie-10-code.cie-10-code").findMany({
        where: { code: { $in: codes } },
        select: ["code", "description"],
      });
      for (const c of cieCodes || []) codeToDesc[c.code] = c.description ?? "";
    }

    const predictions = (result.predicted_diagnoses ?? []).map((d) => ({
      code: d.code,
      description: codeToDesc[d.code] ?? "",
      confidence: d.confidence,
      weight: d.weight,
    }));

    const treatments = (result.suggested_treatments ?? []).map((t) => ({
      name: t.name,
      confidence: t.confidence,
      weight: t.weight,
    }));

    return ctx.send({
      predictions,
      treatments,
      confidence: result.confidence_scores ?? {},
      meta: { engine_enabled: true },
    });
  },
};
