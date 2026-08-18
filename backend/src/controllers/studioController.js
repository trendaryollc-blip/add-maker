/* ============================================================
   OMNI backend — src/controllers/studioController.js
   Reality Studio endpoints: environments, export, voiceover,
   render status, download.
   ============================================================ */
'use strict';

const video = require('../services/video-generation');
const { sendJSON, sendError, readBody } = require('../utils/http');

/** GET /api/studio/environments — list available environments */
function environments(_req, res) {
  sendJSON(res, 200, { environments: video.listEnvironments() });
}

/** POST /api/studio/environment — set/generate an environment */
async function setEnvironment(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }
  return sendJSON(res, 200, video.generateEnvironment(body.type));
}

/** POST /api/studio/export — export an ad for a platform */
async function exportAd(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  if (!body.format) return sendError(res, 400, 'format is required (tiktok, instagram, youtube, etc.)');

  try {
    const result = await video.exportAd({
      format: body.format,
      environment: body.environment,
      hook: body.hook,
      cta: body.cta,
      product: body.product,
      voiceoverText: body.voiceoverText
    });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Export failed');
  }
}

/** POST /api/studio/voiceover — generate a voiceover */
async function voiceover(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendError(res, e.status || 400, e.message); }

  if (!body.text) return sendError(res, 400, 'text is required');

  try {
    const result = await video.generateVoiceover({
      text: body.text,
      style: body.style
    });
    return sendJSON(res, 200, result);
  } catch (err) {
    return sendError(res, 500, err.message || 'Voiceover generation failed');
  }
}

/** GET /api/studio/render/:jobId — check render job status */
async function renderStatus(req, res) {
  const { jobId } = req.params || {};
  if (!jobId) return sendError(res, 400, 'jobId is required');

  const job = video.getJobStatus(jobId);
  if (!job) return sendError(res, 404, 'Render job not found');

  return sendJSON(res, 200, {
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error || null,
    result: job.result || null
  });
}

module.exports = { environments, setEnvironment, exportAd, voiceover, renderStatus };
