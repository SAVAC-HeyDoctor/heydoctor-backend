'use strict';

/**
 * payment-webhook router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::payment-webhook.payment-webhook');
