/* ============================================================
   OMNI backend — src/services/cloud-storage.js
   Cloud storage service for generated files (S3, R2, or local).
   Falls back to local filesystem when no cloud config.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { env } = require('../config/env');

const LOCAL_DIR = path.join(os.tmpdir(), 'omni-media');

function isCloudConfigured() {
  return Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY);
}

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

/**
 * Upload a file to storage.
 * @param {object} opts
 * @param {string|Buffer} opts.data - File data or path
 * @param {string} opts.key - Storage key (filename)
 * @param {string} opts.contentType - MIME type
 * @returns {Promise<{url: string, key: string}>}
 */
async function upload(opts = {}) {
  const key = opts.key || `media/${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (isCloudConfigured()) {
    // S3/R2 upload (when configured)
    // For now, fall through to local storage
    // In production: use @aws-sdk/client-s3
  }

  // Local filesystem storage
  ensureLocalDir();
  const filePath = path.join(LOCAL_DIR, key.replace(/\//g, '-'));

  if (opts.data && Buffer.isBuffer(opts.data)) {
    fs.writeFileSync(filePath, opts.data);
  } else if (opts.data && typeof opts.data === 'string' && fs.existsSync(opts.data)) {
    fs.copyFileSync(opts.data, filePath);
  }

  return {
    url: `/media/${path.basename(filePath)}`,
    key: path.basename(filePath),
    localPath: filePath,
    storage: 'local'
  };
}

/**
 * Generate a signed URL for temporary access.
 */
async function getSignedUrl(key, expiresIn = 3600) {
  // In production: use S3 presigned URLs
  return { url: `/media/${key}`, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
}

/**
 * Delete a file from storage.
 */
async function del(key) {
  const filePath = path.join(LOCAL_DIR, key);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * List files in storage.
 */
async function list(prefix = '') {
  ensureLocalDir();
  const files = fs.readdirSync(LOCAL_DIR);
  return files
    .filter(f => !prefix || f.startsWith(prefix))
    .map(f => ({
      key: f,
      url: `/media/${f}`,
      size: fs.statSync(path.join(LOCAL_DIR, f)).size,
      modified: fs.statSync(path.join(LOCAL_DIR, f)).mtime
    }));
}

module.exports = { upload, getSignedUrl, del, list, isCloudConfigured };
