"use strict";

const cache = require("../../../../modules/ai/copilot/cache");
const copilot = require("../../../../modules/ai/copilot");
const { ensureClinicAccess } = require("../../../../utils/tenant-scope");
const { enqueueCopilotAnalysis } = require("../../../../modules/jobs/queues");

module.exports = {
  async suggestions(ctx) {
    const user = ctx.state?.user;
    if (!user) return ctx.unauthorized("Autenticación requerida");

    const consultationId = ctx.query?.consultationId ?? ctx.query?.consultation_id;
    if (!consultationId) return ctx.badRequest("Se requiere consultationId");

    const strapi = global.strapi;
    if (!strapi) return ctx.internalServerError("Servicio no disponible");

    const apt = await strapi.entityService.findOne("api::appointment.appointment", consultationId, {
      populate: ["clinic"],
    });
    if (!apt) return ctx.notFound("Consulta no encontrada");
    if (!ensureClinicAccess(ctx, apt)) return ctx.forbidden("No tiene acceso a esta consulta");

    if (!copilot.isEnabled()) {
      return ctx.send({
        data: null,
        meta: { ai_enabled: false, message: "AI Copilot no está configurado" },
      });
    }

    let suggestions = await cache.getSuggestions(consultationId);
    if (!suggestions) {
      enqueueCopilotAnalysis({ consultationId, appointmentId: consultationId }).catch(() => {});
      return ctx.send({
        data: null,
        meta: { ai_enabled: true, status: "processing", message: "Análisis en curso, intente de nuevo en unos segundos" },
      });
    }

    return ctx.send({
      data: suggestions,
      meta: { ai_enabled: true, status: "ready" },
    });
  },
};
