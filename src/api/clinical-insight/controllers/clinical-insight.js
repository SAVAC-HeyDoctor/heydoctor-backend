"use strict";

const clinicalInsightsModule = require("../../../../modules/clinical-apps/clinical-insights");
const { ensureClinicAccess } = require("../../../utils/tenant-scope");

module.exports = {
  async getByPatient(ctx) {
    const user = ctx.state?.user;
    if (!user) return ctx.unauthorized("Autenticación requerida");

    const patientId = ctx.params.id;
    const strapi = global.strapi;
    if (!strapi) return ctx.internalServerError("Servicio no disponible");

    const patient = await strapi.entityService.findOne("api::patient.patient", patientId, {
      populate: ["clinic", "clinical_record"],
    });
    if (!patient) return ctx.notFound("Paciente no encontrado");
    if (!ensureClinicAccess(ctx, patient)) return ctx.forbidden("No tiene acceso a este paciente");

    const symptoms = ctx.query?.symptoms ?? "";
    const symptomArr = typeof symptoms === "string" ? symptoms.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const clinicId = ctx.state?.clinicId ?? patient.clinic?.id ?? patient.clinic ?? null;
    const insights = await clinicalInsightsModule.getPatientInsights(patientId, symptomArr, clinicId);

    if (!insights) return ctx.internalServerError("No se pudieron obtener los insights");

    return ctx.send(insights);
  },
};
