"use strict";

/**
 * payment-webhook controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::payment-webhook.payment-webhook",
  ({ strapi }) => ({
    async create(ctx) {
      if (ctx.request.body) {
        ctx.request.body = {
          data: {
            notification: ctx.request.body,
          },
        };
        const entry = await super.create(ctx);
        return entry;
      }
    },
  })
);
