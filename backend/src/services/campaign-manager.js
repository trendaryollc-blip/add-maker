/* ============================================================
   OMNI backend — src/services/campaign-manager.js
   Campaign lifecycle manager — CRUD, status transitions,
   budget tracking, and campaign health monitoring.
   ============================================================ */
'use strict';

const Campaign = require('../models/Campaign');
const { PLATFORMS } = require('./platform-specs');

const STATUSES = ['draft', 'pending', 'active', 'paused', 'completed', 'failed'];
const HEALTH_THRESHOLDS = {
  excellent: { roas: 4.0, ctr: 3.0, convRate: 5.0 },
  good:      { roas: 2.5, ctr: 2.0, convRate: 3.0 },
  average:   { roas: 1.5, ctr: 1.2, convRate: 2.0 },
  poor:      { roas: 1.0, ctr: 0.8, convRate: 1.0 }
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

/**
 * Create a new campaign with validation.
 * @param {string} userId
 * @param {object} data - { name, platform, budget, adId, targetAudience, objective, dailyBudget }
 * @returns {Promise<object>}
 */
async function createCampaign(userId, data) {
  if (!data.name || !data.name.trim()) throw new Error('Campaign name is required');
  if (!data.platform) throw new Error('Platform is required');
  if (!PLATFORMS[data.platform]) throw new Error(`Unknown platform: ${data.platform}`);
  if (data.budget && data.budget < 0) throw new Error('Budget cannot be negative');
  if (data.dailyBudget && data.dailyBudget < 0) throw new Error('Daily budget cannot be negative');

  const campaign = await Campaign.create(userId, {
    name: data.name.trim(),
    platform: data.platform,
    budget: data.budget || 0,
    spent: 0,
    roas: 0,
    ctr: 0,
    cpc: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    status: 'draft',
    adId: data.adId || null,
    metadata: JSON.stringify({
      targetAudience: data.targetAudience || 'general',
      objective: data.objective || 'conversions',
      dailyBudget: data.dailyBudget || null,
      bidStrategy: data.bidStrategy || 'lowest_cost',
      startDate: data.startDate || null,
      endDate: data.endDate || null
    })
  });

  return campaign;
}

/**
 * Transition campaign status with validation.
 * @param {string} campaignId
 * @param {string} newStatus
 * @returns {Promise<object>}
 */
async function transitionStatus(campaignId, newStatus) {
  if (!STATUSES.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const validTransitions = {
    draft: ['pending', 'failed'],
    pending: ['active', 'failed'],
    active: ['paused', 'completed', 'failed'],
    paused: ['active', 'completed', 'failed'],
    completed: [],
    failed: ['draft']
  };

  const allowed = validTransitions[campaign.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${campaign.status} to ${newStatus}`);
  }

  return Campaign.update(campaignId, { status: newStatus });
}

/**
 * Get campaign health assessment.
 * @param {object} campaign
 * @returns {object}
 */
function assessHealth(campaign) {
  const roas = campaign.roas || 0;
  const ctr = campaign.ctr || 0;
  const spendRatio = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;

  let health = 'unknown';
  if (roas >= HEALTH_THRESHOLDS.excellent.roas && ctr >= HEALTH_THRESHOLDS.excellent.ctr) {
    health = 'excellent';
  } else if (roas >= HEALTH_THRESHOLDS.good.roas && ctr >= HEALTH_THRESHOLDS.good.ctr) {
    health = 'good';
  } else if (roas >= HEALTH_THRESHOLDS.average.roas && ctr >= HEALTH_THRESHOLDS.average.ctr) {
    health = 'average';
  } else if (roas >= HEALTH_THRESHOLDS.poor.roas && ctr >= HEALTH_THRESHOLDS.poor.ctr) {
    health = 'poor';
  } else {
    health = 'critical';
  }

  // Override if budget exhausted
  if (spendRatio >= 95) health = 'budget_exhausted';

  return {
    level: health,
    score: clamp(Math.round(roas * 20 + ctr * 10 + (spendRatio < 80 ? 10 : 0)), 0, 100),
    spendRatio: round(spendRatio, 1),
    daysRemaining: campaign.budget > 0 && campaign.spent > 0
      ? Math.max(0, Math.round((campaign.budget - campaign.spent) / (campaign.spent / 7)))
      : null,
    recommendation: getHealthRecommendation(health, roas, ctr)
  };
}

/**
 * Get recommendation based on health level.
 * @param {string} health
 * @param {number} roas
 * @param {number} ctr
 * @returns {string}
 */
function getHealthRecommendation(health, roas, ctr) {
  const recs = {
    excellent: 'Campaign is performing excellently. Consider scaling budget.',
    good: 'Campaign is healthy. Monitor and optimize incrementally.',
    average: 'Campaign needs optimization. Test new creatives or adjust targeting.',
    poor: 'Campaign is underperforming. Pause and revise strategy.',
    critical: 'Campaign is failing. Pause immediately and reassess.',
    budget_exhausted: 'Budget is nearly exhausted. Increase budget or pause.'
  };
  return recs[health] || 'Monitor campaign performance.';
}

/**
 * Get campaign summary statistics.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getCampaignSummary(userId) {
  const campaigns = await Campaign.findByUserId(userId);
  const active = campaigns.filter(c => c.status === 'active');
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
  const avgRoas = active.length > 0
    ? round(active.reduce((s, c) => s + (c.roas || 0), 0) / active.length, 2)
    : 0;

  return {
    total: campaigns.length,
    active: active.length,
    paused: campaigns.filter(c => c.status === 'paused').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    totalBudget,
    totalSpent,
    budgetRemaining: totalBudget - totalSpent,
    avgRoas,
    avgCtr: active.length > 0
      ? round(active.reduce((s, c) => s + (c.ctr || 0), 0) / active.length, 2)
      : 0
  };
}

module.exports = {
  createCampaign,
  transitionStatus,
  assessHealth,
  getCampaignSummary,
  STATUSES,
  HEALTH_THRESHOLDS
};
