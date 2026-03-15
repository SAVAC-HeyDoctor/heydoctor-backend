"use strict";

/**
 * Cache de sugerencias del copilot en Redis.
 * TTL 2 minutos (se refresca cada 30s durante consulta activa).
 */
const CACHE_PREFIX = "copilot:suggestions:";
const TTL_SECONDS = 120;

function getRedis() {
  try {
    const jobs = require("../../jobs");
    if (!jobs.isEnabled()) return null;
    return jobs.getConnection();
  } catch {
    return null;
  }
}

async function setSuggestions(consultationId, data) {
  const redis = getRedis();
  if (!redis) return;
  try {
    const key = CACHE_PREFIX + consultationId;
    await redis.set(key, JSON.stringify(data), "EX", TTL_SECONDS);
  } catch (err) {
    if (global.strapi?.log) global.strapi.log.warn("Copilot cache set failed:", err?.message);
  }
}

async function getSuggestions(consultationId) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const key = CACHE_PREFIX + consultationId;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

module.exports = { setSuggestions, getSuggestions };
