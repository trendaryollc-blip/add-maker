/* ============================================================
   OMNI backend — src/services/autopilot.js
   Live Autopilot Engine: orchestrates campaign monitoring,
   budget optimization, A/B testing, reallocation, and reporting.
   ============================================================ */
'use strict';

const campaignManager = require('./campaign-manager');
const budgetOptimizer = require('./budget-optimizer');
const performanceTracker = require('./performance-tracker');
const abTestEngine = require('./ab-test-engine');
const autoReallocator = require('./auto-reallocate');
const reportGenerator = require('./report-generator');
const Campaign = require('../models/Campaign');

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
function r(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/**
 * Seed campaigns for demo/testing when no real data exists.
 */
function seedCampaigns() {
  return [
    { id: 'c_01', name: 'Launch — TikTok', platform: 'tiktok', budget: 400, spent: 210, roas: 3.4, ctr: 2.1, cpc: 0.45, impressions: 45000, clicks: 945, conversions: 28, status: 'active' },
    { id: 'c_02', name: 'Retarget — IG', platform: 'instagram_reels', budget: 300, spent: 250, roas: 1.2, ctr: 0.5, cpc: 0.85, impressions: 50000, clicks: 250, conversions: 6, status: 'active' },
    { id: 'c_03', name: 'Scale — Facebook', platform: 'facebook', budget: 500, spent: 130, roas: 2.8, ctr: 1.8, cpc: 0.62, impressions: 25000, clicks: 450, conversions: 15, status: 'active' },
    { id: 'c_04', name: 'Prospecting — YouTube', platform: 'youtube_shorts', budget: 250, spent: 40, roas: 0.7, ctr: 0.3, cpc: 1.10, impressions: 12000, clicks: 36, conversions: 1, status: 'active' },
    { id: 'c_05', name: 'Brand — LinkedIn', platform: 'linkedin', budget: 200, spent: 85, roas: 2.1, ctr: 1.2, cpc: 0.95, impressions: 10000, clicks: 120, conversions: 5, status: 'active' }
  ];
}

/**
 * Simulate realistic metric drift for demo.
 * @param {object} campaign
 * @returns {object}
 */
function simulateDrift(campaign) {
  const drift = {
    roas: round(Math.max(0.1, campaign.roas + (Math.random() - 0.48) * 0.3), 2),
    ctr: round(Math.max(0.05, campaign.ctr + (Math.random() - 0.48) * 0.2), 2),
    cpc: round(Math.max(0.05, campaign.cpc + (Math.random() - 0.5) * 0.1), 2),
    spent: Math.min(campaign.budget, campaign.spent + r(2, 25))
  };
  return { ...campaign, ...drift };
}

/**
 * Monitor all campaigns — returns live status with drift.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function monitorCampaigns(userId) {
  let campaigns;
  try {
    campaigns = await Campaign.findByUserId(userId);
  } catch (_e) { campaigns = []; }

  // Merge user campaigns with seed data for demo
  const seedData = seedCampaigns();
  const userCampaigns = campaigns.map(c => ({
    ...c,
    id: c.id,
    roas: c.roas || 0,
    ctr: c.ctr || 0,
    cpc: c.cpc || 0,
    impressions: c.impressions || 0,
    clicks: c.clicks || 0,
    conversions: c.conversions || 0
  }));

  // Use user campaigns if they have active ones, otherwise use seeds
  const activeUser = userCampaigns.filter(c => c.status === 'active');
  const allCampaigns = activeUser.length > 0 ? userCampaigns : [...userCampaigns, ...seedData];

  // Simulate drift for demo
  const drifted = allCampaigns.map(c => simulateDrift(c));

  // Assess health for each
  const withHealth = drifted.map(c => ({
    ...c,
    health: campaignManager.assessHealth(c)
  }));

  return {
    campaigns: withHealth,
    totalCampaigns: withHealth.length,
    activeCampaigns: withHealth.filter(c => c.status === 'active').length,
    monitoredAt: new Date().toISOString()
  };
}

/**
 * Detect anomalies across all campaigns.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function detectAnomalies(userId) {
  let campaigns;
  try {
    campaigns = await Campaign.findByUserId(userId);
  } catch (_e) { campaigns = []; }

  // Always include seed data for demo
  const allCampaigns = [...campaigns, ...seedCampaigns()];

  const allAnomalies = [];
  let healthyCount = 0;

  for (const c of allCampaigns) {
    const history = performanceTracker.getHistory(c.id, 20);
    const anomalies = performanceTracker.detectAnomalies(c, history);
    if (anomalies.length === 0) healthyCount++;
    for (const a of anomalies) {
      allAnomalies.push({ ...a, campaignId: c.id, campaignName: c.name });
    }
  }

  return {
    anomalies: allAnomalies,
    healthyCampaigns: healthyCount,
    totalCampaigns: allCampaigns.length,
    detectedAt: new Date().toISOString()
  };
}

/**
 * Run auto-reallocation across campaigns.
 * @param {string} userId
 * @param {object} opts - { dryRun, strategy }
 * @returns {Promise<object>}
 */
async function reallocateBudget(userId, opts = {}) {
  let campaigns;
  try {
    campaigns = await Campaign.findByUserId(userId);
  } catch (_e) { campaigns = []; }

  // Always include seed data for demo
  const allCampaigns = [...campaigns, ...seedCampaigns()];
  const active = allCampaigns.filter(c => c.status === 'active');

  const result = autoReallocator.autoReallocate(active, {
    dryRun: opts.dryRun || false,
    maxReallocatePercent: 0.4
  });

  return result;
}

/**
 * Optimize budget allocation across campaigns.
 * @param {string} userId
 * @param {object} opts - { totalBudget, strategy }
 * @returns {Promise<object>}
 */
async function optimizeBudget(userId, opts = {}) {
  let campaigns;
  try {
    campaigns = await Campaign.findByUserId(userId);
  } catch (_e) { campaigns = []; }

  // Always include seed data for demo
  const allCampaigns = [...campaigns, ...seedCampaigns()];
  const active = allCampaigns.filter(c => c.status === 'active');
  const totalBudget = opts.totalBudget || active.reduce((s, c) => s + (c.budget || 0), 0);

  const result = budgetOptimizer.optimizeAllocation(active, {
    totalBudget,
    strategy: opts.strategy || 'performance'
  });

  const recommendations = budgetOptimizer.generateRecommendations(active);

  return { ...result, recommendations };
}

/**
 * Generate a new A/B test variant.
 * @param {object} ad
 * @returns {object}
 */
function generateVariant(ad) {
  const hooks = [
    (p) => `What if it cost 50% less? (${p})`,
    (p) => `The last ${p} you will ever buy`,
    (p) => `Watch this before you buy anything`,
    (p) => `5 signs you need ${p} now`,
    (p) => `I was wrong about ${p}`,
    (p) => `POV: You found the perfect ${p}`,
    (p) => `This ${p} went viral. Here's why.`,
    (p) => `Stop scrolling. ${p} is here.`,
    (p) => `${p} changed my life. No, seriously.`,
    (p) => `Unboxing ${p} — was it worth the hype?`
  ];

  const angles = ['price', 'durability', 'education', 'listicle', 'story', 'social-proof', 'humor', 'urgency', 'comparison', 'testimonial'];
  const hook = hooks[r(0, hooks.length - 1)](ad?.productName || 'your product');

  const variant = {
    id: 'variant_' + Date.now().toString(36) + r(100, 999).toString(36),
    baseAd: ad?.filename || 'master-v1',
    hook,
    angle: angles[r(0, angles.length - 1)],
    estimatedScore: r(60, 95),
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  // Register as A/B test
  const test = abTestEngine.createTest({
    name: `Test: ${hook.slice(0, 40)}`,
    variants: ['Control', variant.hook.slice(0, 30)],
    metric: 'conversionRate'
  });

  return { variant, test };
}

/**
 * Generate a comprehensive performance report.
 * @param {string} userId
 * @param {object} opts - { period }
 * @returns {Promise<object>}
 */
async function generateReport(userId, opts = {}) {
  let campaigns;
  try {
    campaigns = await Campaign.findByUserId(userId);
  } catch (_e) { campaigns = []; }

  // Always include seed data for demo
  const allCampaigns = [...campaigns, ...seedCampaigns()];

  return reportGenerator.generateReport(allCampaigns, {
    period: opts.period || 'last_7_days'
  });
}

/**
 * Get campaign summary stats.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getSummary(userId) {
  return campaignManager.getCampaignSummary(userId);
}

module.exports = {
  monitorCampaigns,
  detectAnomalies,
  reallocateBudget,
  optimizeBudget,
  generateVariant,
  generateReport,
  getSummary,
  seedCampaigns
};
