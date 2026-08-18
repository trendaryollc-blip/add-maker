/* ============================================================
   OMNI backend — src/services/elevenlabs.js
   ElevenLabs API integration for voiceover synthesis.
   Falls back to mock when no API key configured.
   ============================================================ */
'use strict';

const axios = require('axios');
const { env } = require('../config/env');

const API_BASE = 'https://api.elevenlabs.io/v1';

const VOICES = {
  engaging:  { name: 'Aria',  id: '21m00Tcm4TlvDq8ikWAM' },
  calm:      { name: 'Rachel', id: '21m00Tcm4TlvDq8ikWAM' },
  energetic: { name: 'Bella',  id: 'EXAVITQu4vr4xnSDxMaL' },
  professional: { name: 'Josh', id: 'TxGEqnHWrfWFTfGW9XjX' },
  friendly:  { name: 'Antoni', id: 'ErXwobaYiN019PkySvjV' }
};

function isConfigured() {
  return Boolean(env.ELEVENLABS_API_KEY && env.ELEVENLABS_API_KEY.length > 10);
}

/**
 * List available voices from ElevenLabs.
 */
async function listVoices() {
  if (!isConfigured()) return Object.values(VOICES).map(v => v.name);

  try {
    const resp = await axios.get(`${API_BASE}/voices`, {
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY },
      timeout: 10000
    });
    return resp.data.voices.map(v => ({
      id: v.voice_id,
      name: v.name,
      labels: v.labels || {},
      preview: v.preview_url
    }));
  } catch (_e) {
    return Object.values(VOICES).map(v => v.name);
  }
}

/**
 * Generate voiceover audio from text.
 * @param {object} opts
 * @param {string} opts.text - Text to speak
 * @param {string} opts.style - Voice style (engaging, calm, energetic, professional, friendly)
 * @param {string} opts.voiceId - Specific ElevenLabs voice ID (overrides style)
 * @returns {Promise<{buffer: Buffer, contentType: string, duration: number}>}
 */
async function generateVoiceover(opts = {}) {
  const text = opts.text || 'Meet the product that changes everything.';
  const style = (opts.style || 'engaging').toLowerCase();
  const voiceId = opts.voiceId || (VOICES[style] || VOICES.engaging).id;

  if (!isConfigured()) {
    // Mock: return metadata only
    return {
      buffer: null,
      contentType: 'audio/mpeg',
      duration: Math.max(3, Math.round(text.split(' ').length / 2.5)),
      voice: (VOICES[style] || VOICES.engaging).name,
      mock: true
    };
  }

  const resp = await axios.post(
    `${API_BASE}/text-to-speech/${voiceId}`,
    {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: style === 'energetic' ? 0.8 : 0.4,
        use_speaker_boost: true
      }
    },
    {
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      timeout: 60000,
      responseType: 'arraybuffer'
    }
  );

  // Estimate duration from audio size (rough: 128kbps MP3)
  const audioSizeKB = resp.data.byteLength / 1024;
  const duration = Math.round(audioSizeKB / 16); // ~16KB per second at 128kbps

  return {
    buffer: Buffer.from(resp.data),
    contentType: 'audio/mpeg',
    duration,
    voice: (VOICES[style] || VOICES.engaging).name,
    mock: false
  };
}

module.exports = { generateVoiceover, listVoices, isConfigured, VOICES };
