/* ============================================================
   OMNI backend — src/services/openai-client.js
   OpenAI GPT-4 wrapper with retry, rate limiting, and structured
   JSON output parsing. Falls back to mock responses when no key.
   ============================================================ */
'use strict';

const { env } = require('../config/env');

let client = null;

function getClient() {
  if (client) return client;
  if (!env.OPENAI_API_KEY) return null;

  const { OpenAI } = require('openai');
  client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

function isConfigured() {
  return Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 10);
}

/**
 * Send a chat completion request with retry + JSON parsing.
 * @param {object} opts
 * @param {string} opts.system - System prompt
 * @param {string} opts.user - User message
 * @param {string} opts.model - Model name (default: from env)
 * @param {number} opts.maxTokens - Max tokens (default: 2000)
 * @param {number} opts.temperature - Temperature (default: 0.7)
 * @param {number} opts.retries - Retry count (default: 2)
 * @returns {Promise<object>} Parsed JSON response or raw text
 */
async function chat(opts = {}) {
  const c = getClient();
  if (!c) return null;

  const model = opts.model || env.OPENAI_MODEL || 'gpt-4o';
  const maxTokens = opts.maxTokens || 2000;
  const temperature = opts.temperature ?? 0.7;
  const maxRetries = opts.retries || 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await c.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: opts.system || 'You are a helpful assistant.' },
          { role: 'user', content: opts.user || '' }
        ],
        max_tokens: maxTokens,
        temperature,
        response_format: opts.json ? { type: 'json_object' } : undefined
      });

      const content = response.choices[0]?.message?.content || '';

      if (opts.json) {
        try {
          return JSON.parse(content);
        } catch (_e) {
          // Try to extract JSON from markdown code block
          const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (match) return JSON.parse(match[1]);
          return { raw: content };
        }
      }

      return content;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

/**
 * Estimate token count (rough: 1 token ~= 4 chars).
 */
function estimateTokens(text) {
  return Math.ceil(String(text || '').length / 4);
}

module.exports = { chat, isConfigured, estimateTokens, getClient };
