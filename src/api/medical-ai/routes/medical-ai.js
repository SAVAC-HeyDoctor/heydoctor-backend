"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/predict",
      handler: "medical-ai.predict",
      config: {
        policies: [{ name: "global::tenant-resolver", config: { requireClinic: true } }],
      },
    },
  ],
};
