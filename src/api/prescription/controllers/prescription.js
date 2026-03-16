"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const { withClinicFilter, ensureClinicAccess } = require("../../../utils/tenant-scope");
const prescriptionsModule = require("../../../../modules/clinical-apps/prescriptions");

module.exports = createCoreController("api::prescription.prescription", ({ strapi }) => ({
  async find(ctx) {
    ctx.query = ctx.query || {};
    ctx.query.filters = withClinicFilter(ctx, ctx.query.filters || {});
    return super.find(ctx);
  },

  async findOne(ctx) {
    const entity = await strapi.entityService.findOne("api::prescription.prescription", ctx.params.id, {
      populate: ["clinic", "patient", "doctor"],
    });
    if (!entity) return ctx.notFound();
    if (!ensureClinicAccess(ctx, entity)) return ctx.forbidden("No tiene acceso a esta receta");
    return super.findOne(ctx);
  },

  async create(ctx) {
    const clinicId = ctx.state?.clinicId;
    const user = ctx.state?.user;
    if (!user) return ctx.unauthorized("Autenticación requerida");
    const doctor = await strapi.db.query("api::doctor.doctor").findOne({ where: { user: user.id } });
    if (!doctor) return ctx.forbidden("Usuario no es médico");
    ctx.request.body.data = {
      ...(ctx.request.body.data || {}),
      clinic: clinicId ?? ctx.request.body.data?.clinic,
      doctor: doctor.id,
    };
    const result = await super.create(ctx);
    const analytics = require("../../../../modules/analytics");
    if (analytics.isEnabled()) {
      analytics.trackEvent("prescription_created", {
        clinicId,
        userId: doctor.id,
        entityId: result?.data?.id,
        metadata: { prescription_id: result?.data?.id },
      });
    }
    return result;
  },

  async update(ctx) {
    const entity = await strapi.entityService.findOne("api::prescription.prescription", ctx.params.id, {
      populate: ["clinic"],
    });
    if (!entity) return ctx.notFound();
    if (!ensureClinicAccess(ctx, entity)) return ctx.forbidden("No tiene acceso a esta receta");
    return super.update(ctx);
  },

  async delete(ctx) {
    const entity = await strapi.entityService.findOne("api::prescription.prescription", ctx.params.id, {
      populate: ["clinic"],
    });
    if (!entity) return ctx.notFound();
    if (!ensureClinicAccess(ctx, entity)) return ctx.forbidden("No tiene acceso a esta receta");
    return super.delete(ctx);
  },

  async findByPatient(ctx) {
    const user = ctx.state?.user;
    if (!user) return ctx.unauthorized("Autenticación requerida");
    const patientId = ctx.params.id;
    const entity = await strapi.entityService.findOne("api::patient.patient", patientId, {
      populate: ["clinic"],
    });
    if (!entity) return ctx.notFound();
    if (!ensureClinicAccess(ctx, entity)) return ctx.forbidden("No tiene acceso a este paciente");
    const prescriptions = await strapi.entityService.findMany("api::prescription.prescription", {
      filters: withClinicFilter(ctx, { patient: patientId }),
      populate: ["doctor", "patient"],
      sort: { createdAt: "desc" },
    });
    return ctx.send({ data: prescriptions });
  },

  async suggestMedications(ctx) {
    const user = ctx.state?.user;
    if (!user) return ctx.unauthorized("Autenticación requerida");
    const diagnosis = ctx.query?.diagnosis ?? ctx.query?.diagnosis_code ?? "";
    const clinicId = ctx.state?.clinicId ?? null;
    const result = await prescriptionsModule.suggestMedications(diagnosis || "general", clinicId);
    return ctx.send(result);
  },
}));
