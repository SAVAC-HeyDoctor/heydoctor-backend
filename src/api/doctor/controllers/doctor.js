"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const cache = require("../../../../config/functions/redis-cache");

module.exports = createCoreController("api::doctor.doctor", ({ strapi }) => ({
  async find(ctx) {
    const cacheKey = `doctors:list:${JSON.stringify(ctx.query || {})}`;

    const data = await cache.getOrSet(
      cacheKey,
      async () => {
        const { data, meta } = await super.find(ctx);
        return { data, meta };
      },
      300
    );

    return data;
  },
}));
