"use strict";

const { createCoreRouter } = require("@strapi/strapi").factories;

const defaultRouter = createCoreRouter("api::prescription.prescription", {
  config: {
    find: { policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }] },
    findOne: { policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }] },
    create: { policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }] },
    update: { policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }] },
    delete: { policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }] },
  },
});

const customRoutes = {
  routes: [
    {
      method: "GET",
      path: "/patient/:id",
      handler: "prescription.findByPatient",
      config: {
        policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }],
      },
    },
    {
      method: "GET",
      path: "/suggest-medications",
      handler: "prescription.suggestMedications",
      config: {
        policies: [{ name: "global::tenant-resolver", config: { requireClinic: false } }],
      },
    },
  ],
};

module.exports = {
  routes: [...customRoutes.routes, ...defaultRouter.routes],
};
