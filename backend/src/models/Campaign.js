/* ============================================================
   OMNI backend — src/models/Campaign.js
   Campaign data access layer.
   ============================================================ */
'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const memoryStore = new Map();

function rowToCampaign(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    adId: row.ad_id,
    name: row.name,
    platform: row.platform,
    budget: Number(row.budget),
    spent: Number(row.spent),
    roas: Number(row.roas),
    ctr: Number(row.ctr),
    cpc: Number(row.cpc),
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const Campaign = {
  async create(userId, data) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        `INSERT INTO campaigns (user_id, ad_id, name, platform, budget, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [userId, data.adId || null, data.name, data.platform, data.budget || 0, data.status || 'draft']
      );
      return rowToCampaign(rows[0]);
    }

    const id = uuidv4();
    const campaign = {
      id, user_id: userId, ad_id: data.adId || null,
      name: data.name, platform: data.platform,
      budget: data.budget || 0, spent: 0, roas: 0,
      ctr: 0, cpc: 0, impressions: 0, clicks: 0, conversions: 0,
      status: data.status || 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryStore.set(id, campaign);
    return rowToCampaign(campaign);
  },

  async findById(id) {
    if (db.isConfigured()) {
      const { rows } = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
      return rowToCampaign(rows[0]);
    }
    const c = memoryStore.get(id);
    return c ? rowToCampaign(c) : null;
  },

  async findByUserId(userId, limit = 100, offset = 0) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        'SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      );
      return rows.map(rowToCampaign);
    }
    return [...memoryStore.values()]
      .filter(c => c.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit)
      .map(rowToCampaign);
  },

  async findByStatus(userId, status) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        'SELECT * FROM campaigns WHERE user_id = $1 AND status = $2',
        [userId, status]
      );
      return rows.map(rowToCampaign);
    }
    return [...memoryStore.values()]
      .filter(c => c.user_id === userId && c.status === status)
      .map(rowToCampaign);
  },

  async update(id, fields) {
    const allowed = ['name', 'budget', 'spent', 'roas', 'ctr', 'cpc',
                     'impressions', 'clicks', 'conversions', 'status'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) return Campaign.findById(id);
    sets.push('updated_at = NOW()');
    values.push(id);

    if (db.isConfigured()) {
      const { rows } = await db.query(
        `UPDATE campaigns SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      return rowToCampaign(rows[0]);
    }

    const c = memoryStore.get(id);
    if (c) {
      for (const key of allowed) {
        if (fields[key] !== undefined) c[key] = fields[key];
      }
      c.updated_at = new Date().toISOString();
    }
    return c ? rowToCampaign(c) : null;
  },

  async delete(id) {
    if (db.isConfigured()) {
      await db.query('DELETE FROM campaigns WHERE id = $1', [id]);
      return true;
    }
    memoryStore.delete(id);
    return true;
  }
};

module.exports = Campaign;
