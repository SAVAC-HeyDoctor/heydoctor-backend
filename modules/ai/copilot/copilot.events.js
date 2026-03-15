"use strict";

/**
 * EventBus listeners para AI Clinical Copilot.
 * Escucha: CONSULTATION_STARTED, MESSAGE_CREATED.
 */
const eventBus = require("../../events/eventBus");
const copilot = require("./index");
const { enqueueCopilotAnalysis } = require("../../jobs/queues");

function registerCopilotListeners(strapi) {
  if (!copilot.isEnabled()) {
    strapi?.log?.info?.("Copilot: disabled (AI_PROVIDER not set)");
    return;
  }

  eventBus.on("CONSULTATION_STARTED", (payload) => {
    const consultationId = payload.consultationId ?? payload.appointmentId;
    if (consultationId) {
      enqueueCopilotAnalysis({ consultationId, appointmentId: consultationId }).catch(() => {});
    }
  });

  eventBus.on("MESSAGE_CREATED", (payload) => {
    const consultationId = payload.consultationId ?? payload.appointmentId;
    if (consultationId) {
      enqueueCopilotAnalysis({ consultationId, appointmentId: consultationId }).catch(() => {});
    }
  });

  strapi?.log?.info?.("Copilot: EventBus listeners registered (CONSULTATION_STARTED, MESSAGE_CREATED)");
}

module.exports = { registerCopilotListeners };
