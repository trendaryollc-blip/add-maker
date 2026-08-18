/* ============================================================
   OMNI backend — src/services/ffmpeg-wrapper.js
   FFmpeg wrapper for video processing. Handles image→video,
   video composition, format conversion, and platform-specific
   exports. Gracefully reports when FFmpeg is not installed.
   ============================================================ */
'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execFileAsync = promisify(execFile);

let ffmpegAvailable = null;

/**
 * Check if FFmpeg is installed on the system.
 */
async function isAvailable() {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  try {
    await execFileAsync('ffmpeg', ['-version']);
    ffmpegAvailable = true;
  } catch (_e) {
    ffmpegAvailable = false;
  }
  return ffmpegAvailable;
}

/**
 * Get a temporary file path.
 */
function tmpFile(ext) {
  return path.join(os.tmpdir(), `omni-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
}

/**
 * Create a video from a sequence of images with transitions.
 * @param {object} opts
 * @param {string[]} opts.images - Array of image file paths
 * @param {number} opts.duration - Total duration in seconds
 * @param {string} opts.output - Output file path
 * @param {string} opts.audioPath - Optional audio track to overlay
 * @param {string} opts.format - Output format (tiktok, instagram, youtube, etc.)
 * @returns {Promise<{outputPath: string, duration: number}>}
 */
async function imagesToVideo(opts = {}) {
  if (!await isAvailable()) {
    return { outputPath: null, duration: opts.duration || 15, mock: true };
  }

  const { images, duration = 15, audioPath, format } = opts;
  const output = opts.output || tmpFile('mp4');

  const SPECS = {
    tiktok:    { w: 1080, h: 1920, fps: 30 },
    instagram: { w: 1080, h: 1920, fps: 30 },
    instaFeed: { w: 1080, h: 1080, fps: 30 },
    facebook:  { w: 1080, h: 1080, fps: 30 },
    youtube:   { w: 1920, h: 1080, fps: 30 },
    gif:       { w: 480,  h: 480,  fps: 15 }
  };

  const spec = SPECS[format] || SPECS.tiktok;
  const frameDuration = duration / images.length;

  // Build FFmpeg input args
  const args = [];
  for (const img of images) {
    args.push('-loop', '1', '-t', String(frameDuration), '-i', img);
  }

  // Build filter complex for crossfade transitions
  const filterParts = [];
  for (let i = 0; i < images.length; i++) {
    filterParts.push(`[${i}:v]scale=${spec.w}:${spec.h}:force_original_aspect_ratio=decrease,pad=${spec.w}:${spec.h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${spec.fps}[v${i}]`);
  }

  if (images.length === 1) {
    args.push('-vf', filterParts[0].replace(/\[v0\]/, ''));
  } else {
    // Concat with crossfade
    const concatInput = filterParts.map((_, i) => `[v${i}]`).join('');
    filterParts.push(`${concatInput}concat=n=${images.length}:v=1:a=0[outv]`);
    args.push('-filter_complex', filterParts.join(';'));
    args.push('-map', '[outv]');
  }

  // Audio overlay
  if (audioPath && fs.existsSync(audioPath)) {
    args.push('-i', audioPath, '-shortest');
  }

  args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p');
  args.push('-movflags', '+faststart');
  args.push(output);

  await execFileAsync('ffmpeg', args, { timeout: 120000 });

  return { outputPath: output, duration, mock: false };
}

/**
 * Convert video to a different format/codec.
 */
async function convertVideo(input, output, opts = {}) {
  if (!await isAvailable()) {
    return { outputPath: null, mock: true };
  }

  const args = ['-i', input, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23'];
  if (opts.width && opts.height) {
    args.push('-vf', `scale=${opts.width}:${opts.height}:force_original_aspect_ratio=decrease`);
  }
  args.push('-pix_fmt', 'yuv420p', '-movflags', '+faststart', output);

  await execFileAsync('ffmpeg', args, { timeout: 120000 });
  return { outputPath: output, mock: false };
}

/**
 * Create an animated GIF from video.
 */
async function videoToGif(input, output, opts = {}) {
  if (!await isAvailable()) {
    return { outputPath: null, mock: true };
  }

  const fps = opts.fps || 15;
  const width = opts.width || 480;
  const palette = tmpFile('png');
  const args1 = ['-i', input, '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`, '-y', palette];
  await execFileAsync('ffmpeg', args1, { timeout: 60000 });

  const args2 = ['-i', input, '-i', palette, '-lavfi', `fps=${fps},scale=${width}:-1:flags=lanczos [x]; [x][1:v] paletteuse`, '-y', output];
  await execFileAsync('ffmpeg', args2, { timeout: 60000 });

  // Cleanup palette
  try { fs.unlinkSync(palette); } catch (_e) {}

  return { outputPath: output, mock: false };
}

/**
 * Add audio track to a video.
 */
async function addAudio(videoPath, audioPath, output) {
  if (!await isAvailable()) {
    return { outputPath: null, mock: true };
  }

  const args = ['-i', videoPath, '-i', audioPath, '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-y', output];
  await execFileAsync('ffmpeg', args, { timeout: 60000 });
  return { outputPath: output, mock: false };
}

/**
 * Generate a placeholder video using FFmpeg's test source.
 * Used for testing/demo when no real content is available.
 */
async function generateTestVideo(output, opts = {}) {
  if (!await isAvailable()) {
    return { outputPath: null, mock: true };
  }

  const duration = opts.duration || 15;
  const width = opts.width || 1080;
  const height = opts.height || 1920;
  const args = [
    '-f', 'lavfi', '-i', `testsrc=duration=${duration}:size=${width}x${height}:rate=30`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-t', String(duration), '-y', output
  ];

  await execFileAsync('ffmpeg', args, { timeout: 60000 });
  return { outputPath: output, duration, mock: false };
}

module.exports = {
  isAvailable, imagesToVideo, convertVideo, videoToGif,
  addAudio, generateTestVideo, tmpFile
};
