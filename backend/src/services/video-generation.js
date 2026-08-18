/* ============================================================
   OMNI backend — src/services/video-generation.js
   4D Reality Studio — the core rendering pipeline.
   When MOCK_DATA=true or no APIs configured: generates scene
   configs, mock metadata, and placeholder output.
   When real APIs are present: generates images via Stability AI,
   synthesizes voiceover via ElevenLabs, renders video via FFmpeg.
   ============================================================ */
'use strict';

const { mockMode } = require('./mock-mode');
const sceneBuilder = require('./scene-builder');
const elevenlabs = require('./elevenlabs');
const stabilityAi = require('./stability-ai');
const ffmpeg = require('./ffmpeg-wrapper');
const storage = require('./cloud-storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const ENVIRONMENTS = sceneBuilder.ENVIRONMENTS;

const EXPORT_SPECS = {
  tiktok:    { dimensions: '1080x1920', ratio: '9:16', duration: '15-30s', ext: 'mp4', w: 1080, h: 1920 },
  instagram: { dimensions: '1080x1920', ratio: '9:16', duration: '15-30s', ext: 'mp4', w: 1080, h: 1920 },
  instaFeed: { dimensions: '1080x1080', ratio: '1:1', duration: '30s', ext: 'mp4', w: 1080, h: 1080 },
  facebook:  { dimensions: '1080x1080', ratio: '1:1', duration: '30-60s', ext: 'mp4', w: 1080, h: 1080 },
  youtube:   { dimensions: '1920x1080', ratio: '16:9', duration: '60-120s', ext: 'mp4', w: 1920, h: 1080 },
  gif:       { dimensions: '480x480', ratio: '1:1', duration: '5s', ext: 'gif', w: 480, h: 480 }
};

// In-memory render job queue
const renderJobs = new Map();

function r(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uid() { return Date.now().toString(36) + r(1000, 9999).toString(36); }

function listEnvironments() {
  return ENVIRONMENTS.map(e => e.name);
}

function generateEnvironment(type) {
  const env = ENVIRONMENTS.find(e => e.name === type) || ENVIRONMENTS[0];
  return { type: env.name, tone: env.tone, mood: env.mood, accentColor: env.accentColor, generatedAt: new Date().toISOString() };
}

/**
 * Generate voiceover — real or mock.
 */
async function generateVoiceover(reqData = {}) {
  const text = reqData.text || 'Meet the product that changes everything.';
  const style = (reqData.style || 'engaging').toLowerCase();

  if (!mockMode()) {
    try {
      const result = await elevenlabs.generateVoiceover({ text, style });
      let audioUrl = '/media/voiceover.mp3';
      if (result.buffer) {
        const uploaded = await storage.upload({ data: result.buffer, key: `voiceover-${uid()}.mp3`, contentType: 'audio/mpeg' });
        audioUrl = uploaded.url;
      }
      return {
        text,
        style,
        duration: result.duration,
        voice: result.voice,
        url: audioUrl,
        mock: result.mock,
        generatedAt: new Date().toISOString()
      };
    } catch (_e) { /* fall through to mock */ }
  }

  // Mock mode
  const voices = ['Aria', 'Daniel', 'Maya', 'Liam', 'Rachel'];
  return {
    text,
    style,
    duration: Math.max(3, Math.round(text.split(' ').length / 2.5)),
    voice: voices[r(0, voices.length - 1)],
    url: '/media/voiceover-mock.mp3',
    mock: true,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate environment image — real or mock.
 */
async function generateEnvironmentImage(environment, productName) {
  if (!mockMode()) {
    try {
      const result = await stabilityAi.generateEnvironment(environment, productName);
      if (result.buffer) {
        const uploaded = await storage.upload({
          data: result.buffer,
          key: `env-${environment.toLowerCase().replace(/\s+/g, '-')}-${uid()}.png`,
          contentType: 'image/png'
        });
        return { url: uploaded.url, mock: false };
      }
    } catch (_e) { /* fall through to mock */ }
  }
  return { url: `/media/env-${environment.toLowerCase().replace(/\s+/g, '-')}-mock.png`, mock: true };
}

/**
 * EXPORT AD — the main rendering pipeline.
 * @param {object} reqData
 * @param {string} reqData.format - Platform format (tiktok, instagram, etc.)
 * @param {string} reqData.environment - Environment name
 * @param {string} reqData.hook - Ad hook text
 * @param {string} reqData.cta - Call to action
 * @param {object} reqData.product - Product data from scan
 * @param {string} reqData.voiceoverText - Custom voiceover text
 * @returns {Promise<object>} Export result
 */
async function exportAd(reqData = {}) {
  const format = (reqData.format || 'tiktok').toLowerCase();
  const spec = EXPORT_SPECS[format] || EXPORT_SPECS.tiktok;
  const environment = reqData.environment || 'Cyber City';
  const jobId = uid();

  // Build the scene configuration
  const scene = sceneBuilder.buildScene({
    product: reqData.product || {},
    environment,
    duration: parseInt(spec.duration) || 15,
    format,
    hook: reqData.hook || '',
    cta: reqData.cta || 'Shop Now'
  });

  if (!mockMode() && await ffmpeg.isAvailable()) {
    // REAL RENDERING PIPELINE
    const job = {
      id: jobId,
      status: 'processing',
      format,
      scene,
      startedAt: new Date().toISOString(),
      progress: 0
    };
    renderJobs.set(jobId, job);

    try {
      // Step 1: Generate environment images
      job.progress = 10;
      const envImage = await generateEnvironmentImage(environment, reqData.product?.name || 'product');

      // Step 2: Generate voiceover
      job.progress = 30;
      const voiceover = await generateVoiceover({
        text: reqData.voiceoverText || scene.voiceover.text,
        style: scene.voiceover.style
      });

      // Step 3: Generate test video frames (or use real product images)
      job.progress = 50;
      const images = [];
      if (reqData.product?.images?.length) {
        images.push(...reqData.product.images.slice(0, 4));
      } else {
        // Generate placeholder frames
        for (let i = 0; i < 4; i++) {
          const imgResult = await stabilityAi.generateImage({
            prompt: `${environment} environment, product advertisement, scene ${i + 1} of 4, professional marketing`,
            width: spec.w, height: spec.h
          });
          if (imgResult.buffer) {
            const uploaded = await storage.upload({
              data: imgResult.buffer,
              key: `frame-${jobId}-${i}.png`,
              contentType: 'image/png'
            });
            images.push(uploaded.url);
          }
        }
      }

      // Step 4: Render video with FFmpeg
      job.progress = 70;
      const ext = spec.ext;
      const outputPath = path.join(require('os').tmpdir(), `omni-ad-${jobId}.${ext}`);
      const renderResult = await ffmpeg.imagesToVideo({
        images: images.filter(Boolean),
        duration: parseInt(spec.duration) || 15,
        output: outputPath,
        format
      });

      // Step 5: Upload to storage
      job.progress = 90;
      let fileUrl = `/media/omni-ad-${jobId}.${ext}`;
      if (renderResult.outputPath) {
        const uploaded = await storage.upload({
          data: renderResult.outputPath,
          key: `omni-ad-${jobId}.${ext}`,
          contentType: ext === 'gif' ? 'image/gif' : 'video/mp4'
        });
        fileUrl = uploaded.url;
      }

      job.status = 'completed';
      job.progress = 100;
      job.result = {
        format,
        spec: `${spec.dimensions} / ${spec.ratio} / ${spec.duration}`,
        filename: `omni-ad-${jobId}.${ext}`,
        url: fileUrl,
        duration: scene.duration,
        environment,
        voiceover,
        sceneSummary: sceneBuilder.summarizeScene(scene),
        exportedAt: new Date().toISOString()
      };

      return job.result;
    } catch (err) {
      job.status = 'failed';
      job.error = err.message;
      // Fall through to mock output
    }
  }

  // MOCK MODE — return realistic metadata without actual rendering
  const voiceover = await generateVoiceover({
    text: reqData.voiceoverText || scene.voiceover.text,
    style: scene.voiceover.style
  });

  return {
    format,
    spec: `${spec.dimensions} / ${spec.ratio} / ${spec.duration}`,
    filename: `omni-ad-${jobId}.${spec.ext}`,
    url: `/media/omni-ad-${jobId}.${spec.ext}`,
    duration: scene.duration,
    environment,
    voiceover,
    sceneSummary: sceneBuilder.summarizeScene(scene),
    mock: true,
    exportedAt: new Date().toISOString()
  };
}

/**
 * Get render job status.
 */
function getJobStatus(jobId) {
  return renderJobs.get(jobId) || null;
}

module.exports = {
  ENVIRONMENTS,
  EXPORT_SPECS,
  listEnvironments,
  generateEnvironment,
  exportAd,
  generateVoiceover,
  generateEnvironmentImage,
  getJobStatus
};
