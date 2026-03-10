"use strict";

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      const { captureException } = require("../../config/functions/sentry");
      captureException(err, {
        tags: {
          layer: "strapi-middleware",
          method: ctx.request.method,
          path: ctx.request.path,
        },
        extra: {
          query: ctx.request.query,
          status: ctx.status,
        },
      });
      throw err;
    }
  };
};
