"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/patient/:id",
      handler: "clinical-insight.getByPatient",
      config: {
        policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }],
      },
    },
  ],
};
