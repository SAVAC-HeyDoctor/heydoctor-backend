"use strict";

/**
 * AI Operational Insights - analiza eventos de ClickHouse.
 * Requiere AI_PROVIDER y CLICKHOUSE_URL.
 */
const analytics = require("./index");
const aiProvider = require("../ai/provider");

function canRun() {
  return analytics.isEnabled() && aiProvider.isEnabled();
}

async function queryEvents(clinicId, days = 7) {
  const c = analytics.getClient();
  if (!c) return [];

  try {
    const q =
      clinicId != null
        ? `SELECT event_type, count() as cnt FROM events WHERE clinic_id = ${Number(clinicId)} AND timestamp >= now() - INTERVAL ${days} DAY GROUP BY event_type`
        : `SELECT event_type, count() as cnt FROM events WHERE timestamp >= now() - INTERVAL ${days} DAY GROUP BY event_type`;
    const result = await c.query({ query: q, format: "JSONEachRow" });
    const rows = await result.json();
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    if (global.strapi?.log) global.strapi.log.warn("AI insights: query failed", err?.message);
    return [];
  }
}

async function getClinicIds() {
  const c = analytics.getClient();
  if (!c) return [];

  try {
    const result = await c.query({
      query: "SELECT DISTINCT clinic_id FROM events WHERE clinic_id IS NOT NULL",
      format: "JSONEachRow",
    });
    const rows = await result.json();
    return rows.map((r) => r.clinic_id).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Genera insights semanales por clínica.
 */
async function generateWeeklyInsights(options = {}) {
  if (!canRun()) return [];

  const days = options.days ?? 7;
  const clinicIds = options.clinicIds ?? (await getClinicIds());
  const results = [];

  for (const clinicId of clinicIds) {
    const rows = await queryEvents(clinicId, days);
    const metrics = {};
    rows.forEach((r) => {
      metrics[r.event_type] = Number(r.cnt ?? 0);
    });

    const consultations = metrics.consultation_started ?? 0;
    const created = metrics.appointment_created ?? 0;
    const cancelled = metrics.appointment_cancelled ?? 0;
    const searches = metrics.search_performed ?? 0;
    const cancelRate = created > 0 ? ((cancelled / created) * 100).toFixed(1) : 0;

    const prompt = `Analiza estas métricas de telemedicina (últimos ${days} días) y genera 3-5 insights breves en español.
Métricas: consultas realizadas=${consultations}, citas creadas=${created}, citas canceladas=${cancelled}, búsquedas=${searches}, tasa cancelación=${cancelRate}%.
Responde ÚNICAMENTE con un JSON array de strings: ["insight 1", "insight 2", ...]`;

    const content = await aiProvider.chatCompletion([{ role: "user", content: prompt }], { max_tokens: 256 });
    let insights = [];
    if (content) {
      try {
        const json = content.replace(/```json?\s*|\s*```/g, "").trim();
        insights = JSON.parse(json);
        if (!Array.isArray(insights)) insights = [content];
      } catch {
        insights = [content];
      }
    } else {
      insights = [
        `Consultas realizadas: ${consultations}`,
        `Tasa de cancelación: ${cancelRate}%`,
        `Búsquedas en plataforma: ${searches}`,
      ];
    }

    results.push({ clinic_id: clinicId, insights, metrics: { consultations, created, cancelled, searches, cancelRate } });
  }

  return results;
}

module.exports = { canRun, generateWeeklyInsights, queryEvents, getClinicIds };
