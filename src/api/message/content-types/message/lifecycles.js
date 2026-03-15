"use strict";

const eventBus = require("../../../../../modules/events/eventBus");

module.exports = {
  async afterCreate(event) {
    const { result, params } = event;
    if (!result) return;
    const appointmentId = result.appointment?.id ?? result.appointment ?? params?.data?.appointment;
    if (!appointmentId) return;
    eventBus.emit("MESSAGE_CREATED", {
      messageId: result.id,
      appointmentId,
      consultationId: appointmentId,
    });
  },
};
