'use strict';

/**
 * payment-webhook service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::payment-webhook.payment-webhook');
