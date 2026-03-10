"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const cache = require("../../../../config/functions/redis-cache");

module.exports = createCoreController("api::specialty-profile.specialty-profile", ({ strapi }) => ({
  async find(ctx) {
    const cacheKey = `specialties:list:${JSON.stringify(ctx.query || {})}`;

    const data = await cache.getOrSet(
      cacheKey,
      async () => {
        const { data, meta } = await super.find(ctx);
        return { data, meta };
      },
      600
    );

    return data;
  },
}));
