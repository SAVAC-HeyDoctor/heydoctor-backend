"use strict";

const jobs = require("./index");
const { getPdfQueue, getEmailQueue, getImageQueue, getWebhookQueue } = require("./queues");
const { insertEvent } = require("../analytics/clickhouse");

async function processPdf(job) {
  const { appointmentId, patientId, format } = job.data;
  if (!jobs.isEnabled()) return { skipped: true, reason: "Redis not configured" };
  // Placeholder: integrar con pdfkit cuando se implemente generación real
  return { appointmentId, patientId, format, status: "queued" };
}

async function processEmail(job) {
  const { to, subject, template, data } = job.data;
  if (!jobs.isEnabled()) return { skipped: true };
  // Placeholder: integrar con Strapi email o nodemailer
  return { to, subject, status: "queued" };
}

async function processImage(job) {
  const { fileId, operation } = job.data;
  if (!jobs.isEnabled()) return { skipped: true };
  return { fileId, operation, status: "queued" };
}

async function processWebhook(job) {
  const { payload, source } = job.data;
  if (!jobs.isEnabled()) return { skipped: true };
  return { source, status: "queued" };
}

async function processAnalytics(job) {
  const analytics = require("../analytics");
  if (!analytics.isEnabled()) return { skipped: true, reason: "ClickHouse not configured" };
  await insertEvent(job.data);
  return { ok: true };
}

async function processAiSummary(job) {
  const ai = require("../ai");
  if (!ai.isEnabled()) return { skipped: true, reason: "AI not configured" };
  const { appointmentId } = job.data;
  let transcript = "";
  let messages = [];
  let clinicalNotes = null;
  if (appointmentId && global.strapi) {
    try {
      const apt = await global.strapi.entityService.findOne("api::appointment.appointment", appointmentId, {
        populate: ["messages", "clinical_record"],
      });
      messages = apt?.messages ?? [];
      if (apt?.clinical_record) {
        clinicalNotes = await global.strapi.entityService.findOne("api::clinical-record.clinical-record", apt.clinical_record.id ?? apt.clinical_record);
      }
    } catch (_) {}
  }
  const summary = await ai.generateConsultationSummary({ transcript, messages, clinicalNotes });
  return { ok: !!summary, summary };
}

async function processAiInsights(job) {
  const aiInsights = require("../analytics/ai-insights");
  if (!aiInsights.canRun()) return { skipped: true, reason: "AI or ClickHouse not configured" };
  const result = await aiInsights.generateWeeklyInsights(job.data);
  return result;
}

function startWorkers(strapi) {
  if (!jobs.isEnabled()) {
    strapi?.log?.info("Jobs: Redis not configured, workers disabled");
    return;
  }
  jobs.createWorker("clinical-pdf", processPdf);
  jobs.createWorker("email", processEmail);
  jobs.createWorker("medical-image", processImage);
  jobs.createWorker("payment-webhook", processWebhook);
  jobs.createWorker("analytics-worker", processAnalytics);
  jobs.createWorker("ai-consultation-summary", processAiSummary);
  jobs.createWorker("ai-weekly-insights", processAiInsights);
  strapi?.log?.info("Jobs: workers started (pdf, email, image, webhook, analytics, ai-summary, ai-insights)");
}

module.exports = { startWorkers, processPdf, processEmail, processImage, processWebhook, processAnalytics, processAiSummary, processAiInsights };
