/* ============================================================
   OMNI backend — src/services/stability-ai.js
   Stability AI API integration for image generation.
   Falls back to mock when no API key configured.
   ============================================================ */
'use strict';

const axios = require('axios');
const { env } = require('../config/env');

const API_BASE = 'https://api.stability.ai/v2beta';

function isConfigured() {
  return Boolean(env.STABILITY_API_KEY && env.STABILITY_API_KEY.length > 10);
}

/**
 * Generate a product lifestyle image.
 * @param {object} opts
 * @param {string} opts.prompt - Image description
 * @param {string} opts.style - Style preset (photographic, digital-art, 3d-model, etc.)
 * @param {number} opts.width - Image width (default: 1024)
 * @param {number} opts.height - Image height (default: 1024)
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
async function generateImage(opts = {}) {
  const prompt = opts.prompt || 'A premium product on a sleek pedestal, studio lighting, photorealistic';
  const style = opts.style || 'photographic';
  const width = opts.width || 1024;
  const height = opts.height || 1024;

  if (!isConfigured()) {
    return {
      buffer: null,
      contentType: 'image/png',
      width,
      height,
      mock: true,
      prompt
    };
  }

  const resp = await axios.post(
    `${API_BASE}/stable-image/generate/sd3`,
    {
      prompt,
      model: 'sd3.5-large',
      output_format: 'png',
      aspect_ratio: `${width}:${height}`,
      negative_prompt: 'blurry, low quality, text, watermark'
    },
    {
      headers: {
        'Authorization': `Bearer ${env.STABILITY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'image/*'
      },
      timeout: 120000,
      responseType: 'arraybuffer'
    }
  );

  return {
    buffer: Buffer.from(resp.data),
    contentType: resp.headers['content-type'] || 'image/png',
    width,
    height,
    mock: false,
    prompt
  };
}

/**
 * Generate a background environment for a product scene.
 * @param {string} environment - Environment type (Cyber City, Tropical, Alpine, etc.)
 * @param {string} productName - Product name for context
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
async function generateEnvironment(environment, productName) {
  const prompts = {
    'Cyber City': `Neon-lit cyberpunk cityscape at night, holographic advertisements, rain-slicked streets, ${productName} floating in center, volumetric lighting, cinematic`,
    'Tropical': `Tropical paradise beach at golden hour, crystal clear water, palm trees, ${productName} on a wooden pedestal, warm sunlight, lifestyle photography`,
    'Alpine': `Majestic alpine mountain landscape, fresh snow, pine trees, ${productName} on a rock, natural lighting, adventure vibes`,
    'Desert': `Vast desert landscape at sunset, warm orange tones, sand dunes, ${productName} floating above sand, dramatic shadows, minimalist`,
    'Deep Space': `Deep space nebula, stars and galaxies, ${productName} floating in zero gravity, cosmic lighting, ethereal, sci-fi`
  };

  const prompt = prompts[environment] || prompts['Cyber City'];
  return generateImage({ prompt, style: 'photographic', width: 1920, height: 1080 });
}

module.exports = { generateImage, generateEnvironment, isConfigured };
