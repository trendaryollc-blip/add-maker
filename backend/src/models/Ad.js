/* ============================================================
   OMNI backend — src/models/Ad.js
   Generated ads data access layer.
   ============================================================ */
'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const memoryStore = new Map();

function rowToAd(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    scanId: row.scan_id,
    format: row.format,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    duration: row.duration,
    platform: row.platform,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    status: row.status,
    createdAt: row.created_at
  };
}

const Ad = {
  async create(userId, data) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        `INSERT INTO ads (user_id, scan_id, format, file_url, file_size, duration, platform, metadata, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [userId, data.scanId || null, data.format || 'tiktok', data.fileUrl || '',
         data.fileSize || 0, data.duration || 0, data.platform || '',
         JSON.stringify(data.metadata || {}), data.status || 'draft']
      );
      return rowToAd(rows[0]);
    }

    const id = uuidv4();
    const ad = {
      id, user_id: userId, scan_id: data.scanId || null,
      format: data.format || 'tiktok', file_url: data.fileUrl || '',
      file_size: data.fileSize || 0, duration: data.duration || 0,
      platform: data.platform || '', metadata: data.metadata || {},
      status: data.status || 'draft',
      created_at: new Date().toISOString()
    };
    memoryStore.set(id, ad);
    return rowToAd(ad);
  },

  async findById(id) {
    if (db.isConfigured()) {
      const { rows } = await db.query('SELECT * FROM ads WHERE id = $1', [id]);
      return rowToAd(rows[0]);
    }
    const ad = memoryStore.get(id);
    return ad ? rowToAd(ad) : null;
  },

  async findByUserId(userId, limit = 100, offset = 0) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        'SELECT * FROM ads WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      );
      return rows.map(rowToAd);
    }
    return [...memoryStore.values()]
      .filter(a => a.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit)
      .map(rowToAd);
  },

  async update(id, fields) {
    const allowed = ['format', 'file_url', 'file_size', 'duration', 'platform', 'metadata', 'status'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(key === 'metadata' ? JSON.stringify(fields[key]) : fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) return Ad.findById(id);
    values.push(id);

    if (db.isConfigured()) {
      const { rows } = await db.query(
        `UPDATE ads SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      return rowToAd(rows[0]);
    }

    const ad = memoryStore.get(id);
    if (ad) {
      for (const key of allowed) {
        if (fields[key] !== undefined) ad[key] = fields[key];
      }
    }
    return ad ? rowToAd(ad) : null;
  },

  async delete(id) {
    if (db.isConfigured()) {
      await db.query('DELETE FROM ads WHERE id = $1', [id]);
      return true;
    }
    memoryStore.delete(id);
    return true;
  }
};

module.exports = Ad;
