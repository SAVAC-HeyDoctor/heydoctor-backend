"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/suggest",
      handler: "clinical-intelligence.suggest",
      config: {
        policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }],
      },
    },
  ],
};
