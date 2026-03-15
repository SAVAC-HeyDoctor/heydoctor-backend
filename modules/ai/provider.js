"use strict";

/**
 * Provider de AI - OpenAI compatible.
 * Si AI_PROVIDER no está definido, todas las llamadas retornan null.
 */
const axios = require("axios");

const AI_PROVIDER = process.env.AI_PROVIDER;
const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.openai.com/v1";

function isEnabled() {
  return !!(AI_PROVIDER && AI_API_KEY);
}

async function chatCompletion(messages, options = {}) {
  if (!isEnabled()) return null;
  try {
    const url = `${AI_BASE_URL}/chat/completions`;
    const res = await axios.post(
      url,
      {
        model: options.model || "gpt-4o-mini",
        messages,
        max_tokens: options.max_tokens || 1024,
        temperature: options.temperature ?? 0.3,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        timeout: 30000,
      }
    );
    const content = res.data?.choices?.[0]?.message?.content;
    return content || null;
  } catch (err) {
    if (global.strapi?.log) global.strapi.log.warn("AI provider error:", err?.message);
    return null;
  }
}

module.exports = { isEnabled, chatCompletion };
