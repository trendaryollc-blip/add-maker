/* ============================================================
   OMNI backend — src/models/Scan.js
   Neural scan results data access.
   ============================================================ */
'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const memoryStore = new Map();

function rowToScan(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    url: row.url,
    productName: row.product_name,
    productData: typeof row.product_data === 'string' ? JSON.parse(row.product_data) : row.product_data,
    emotionalProfile: typeof row.emotional_profile === 'string' ? JSON.parse(row.emotional_profile) : row.emotional_profile,
    targetAudience: typeof row.target_audience === 'string' ? JSON.parse(row.target_audience) : row.target_audience,
    competitors: typeof row.competitors === 'string' ? JSON.parse(row.competitors) : row.competitors,
    recommendedHooks: typeof row.recommended_hooks === 'string' ? JSON.parse(row.recommended_hooks) : row.recommended_hooks,
    createdAt: row.created_at
  };
}

const Scan = {
  async create(userId, data) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        `INSERT INTO scans (user_id, url, product_name, product_data, emotional_profile, target_audience, competitors, recommended_hooks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [userId, data.url, data.productName || '', JSON.stringify(data.productData || {}),
         JSON.stringify(data.emotionalProfile || []), JSON.stringify(data.targetAudience || {}),
         JSON.stringify(data.competitors || []), JSON.stringify(data.recommendedHooks || [])]
      );
      return rowToScan(rows[0]);
    }

    const id = uuidv4();
    const scan = {
      id, user_id: userId, url: data.url,
      product_name: data.productName || '',
      product_data: data.productData || {},
      emotional_profile: data.emotionalProfile || [],
      target_audience: data.targetAudience || {},
      competitors: data.competitors || [],
      recommended_hooks: data.recommendedHooks || [],
      created_at: new Date().toISOString()
    };
    memoryStore.set(id, scan);
    return rowToScan(scan);
  },

  async findById(id) {
    if (db.isConfigured()) {
      const { rows } = await db.query('SELECT * FROM scans WHERE id = $1', [id]);
      return rowToScan(rows[0]);
    }
    const scan = memoryStore.get(id);
    return scan ? rowToScan(scan) : null;
  },

  async findByUserId(userId, limit = 50, offset = 0) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        'SELECT * FROM scans WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      );
      return rows.map(rowToScan);
    }
    return [...memoryStore.values()]
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit)
      .map(rowToScan);
  },

  async delete(id) {
    if (db.isConfigured()) {
      await db.query('DELETE FROM scans WHERE id = $1', [id]);
      return true;
    }
    memoryStore.delete(id);
    return true;
  }
};

module.exports = Scan;
