"use strict";

const cache = require("../../../../../config/functions/redis-cache");

module.exports = {
  async afterCreate() {
    await cache.delPattern("doctors:*");
  },
  async afterUpdate() {
    await cache.delPattern("doctors:*");
  },
  async afterDelete() {
    await cache.delPattern("doctors:*");
  },
};
