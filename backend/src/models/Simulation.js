/* ============================================================
   OMNI backend — src/models/Simulation.js
   Ghost user simulation results data access.
   ============================================================ */
'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const memoryStore = new Map();

function rowToSimulation(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    adId: row.ad_id,
    ghostCount: row.ghost_count,
    duration: row.duration,
    overallScore: row.overall_score,
    emotionalJourney: typeof row.emotional_journey === 'string' ? JSON.parse(row.emotional_journey) : row.emotional_journey,
    predictedMetrics: typeof row.predicted_metrics === 'string' ? JSON.parse(row.predicted_metrics) : row.predicted_metrics,
    bestSegment: row.best_segment,
    worstSegment: row.worst_segment,
    recommendations: typeof row.recommendations === 'string' ? JSON.parse(row.recommendations) : row.recommendations,
    createdAt: row.created_at
  };
}

const Simulation = {
  async create(userId, data) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        `INSERT INTO simulations (user_id, ad_id, ghost_count, duration, overall_score, emotional_journey, predicted_metrics, best_segment, worst_segment, recommendations)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [userId, data.adId || null, data.ghostCount || 500, data.duration || 15,
         data.overallScore || 0, JSON.stringify(data.emotionalJourney || []),
         JSON.stringify(data.predictedMetrics || {}), data.bestSegment || '',
         data.worstSegment || '', JSON.stringify(data.recommendations || [])]
      );
      return rowToSimulation(rows[0]);
    }

    const id = uuidv4();
    const sim = {
      id, user_id: userId, ad_id: data.adId || null,
      ghost_count: data.ghostCount || 500, duration: data.duration || 15,
      overall_score: data.overallScore || 0,
      emotional_journey: data.emotionalJourney || [],
      predicted_metrics: data.predictedMetrics || {},
      best_segment: data.bestSegment || '',
      worst_segment: data.worstSegment || '',
      recommendations: data.recommendations || [],
      created_at: new Date().toISOString()
    };
    memoryStore.set(id, sim);
    return rowToSimulation(sim);
  },

  async findById(id) {
    if (db.isConfigured()) {
      const { rows } = await db.query('SELECT * FROM simulations WHERE id = $1', [id]);
      return rowToSimulation(rows[0]);
    }
    const sim = memoryStore.get(id);
    return sim ? rowToSimulation(sim) : null;
  },

  async findByUserId(userId, limit = 50, offset = 0) {
    if (db.isConfigured()) {
      const { rows } = await db.query(
        'SELECT * FROM simulations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      );
      return rows.map(rowToSimulation);
    }
    return [...memoryStore.values()]
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit)
      .map(rowToSimulation);
  }
};

module.exports = Simulation;
