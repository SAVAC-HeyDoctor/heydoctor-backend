"use strict";

/**
 * Rate limiting middleware para endpoints sensibles.
 * Usa almacenamiento en memoria. Para múltiples instancias, considerar Redis.
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX = 30; // requests por ventana
const RATE_LIMITED_PATHS = [
  "/api/doctor-applications",
  "/api/auth/local",
  "/api/custom-auth/login",
  "/api/custom-auth/register",
  "/api/payment-webhooks",
];

const store = new Map(); // ip -> { count, resetAt }

function getClientIp(ctx) {
  return (
    ctx.request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    ctx.request.headers["x-real-ip"] ||
    ctx.request.ip ||
    "unknown"
  );
}

function cleanup() {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (val.resetAt < now) store.delete(key);
  }
}

module.exports = (config, { strapi }) => {
  setInterval(cleanup, 60 * 1000);

  return async (ctx, next) => {
    const path = ctx.request.path;
    const isLimited = RATE_LIMITED_PATHS.some((p) => path.startsWith(p));
    if (!isLimited || ctx.request.method === "GET") {
      return next();
    }

    const ip = getClientIp(ctx);
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      store.set(ip, entry);
    }

    entry.count += 1;

    if (entry.count > RATE_LIMIT_MAX) {
      ctx.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return ctx.throw(429, "Demasiadas solicitudes. Intenta de nuevo más tarde.");
    }

    ctx.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
    ctx.set("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT_MAX - entry.count)));
    return next();
  };
};
