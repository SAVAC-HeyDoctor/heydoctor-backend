"use strict";

const cache = require("../../../../../config/functions/redis-cache");

module.exports = {
  async afterCreate() {
    await cache.delPattern("specialties:*");
  },
  async afterUpdate() {
    await cache.delPattern("specialties:*");
  },
  async afterDelete() {
    await cache.delPattern("specialties:*");
  },
};
