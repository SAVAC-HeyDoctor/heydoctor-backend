"use strict";

const { createCoreRouter } = require("@strapi/strapi").factories;

const defaultRouter = createCoreRouter("api::lab-order.lab-order", {
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
      handler: "lab-order.findByPatient",
      config: {
        policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }],
      },
    },
    {
      method: "GET",
      path: "/suggest-tests",
      handler: "lab-order.suggestTests",
      config: {
        policies: [{ name: "global::tenant-resolver", config: { requireClinic: false } }],
      },
    },
  ],
};

module.exports = {
  routes: [...customRoutes.routes, ...defaultRouter.routes],
};
