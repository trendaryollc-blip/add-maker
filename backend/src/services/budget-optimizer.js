/* ============================================================
   OMNI backend — src/services/budget-optimizer.js
   AI-powered budget optimization — allocates budgets across
   platforms based on performance, audience, and objectives.
   ============================================================ */
'use strict';

const { PLATFORMS } = require('./platform-specs');

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Calculate optimal budget allocation across campaigns.
 * @param {object[]} campaigns - Array of campaign objects
 * @param {object} opts - { totalBudget, strategy, minAllocation, maxAllocation }
 * @returns {object}
 */
function optimizeAllocation(campaigns, opts = {}) {
  const totalBudget = opts.totalBudget || campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const strategy = opts.strategy || 'performance'; // performance, balanced, aggressive, conservative
  const minAlloc = opts.minAllocation || 0.05; // 5% minimum
  const maxAlloc = opts.maxAllocation || 0.50; // 50% maximum

  if (campaigns.length === 0) {
    return { allocations: [], totalBudget, strategy, note: 'No campaigns to optimize' };
  }

  // Score each campaign
  const scored = campaigns.map(c => ({
    ...c,
    score: calculateCampaignScore(c, strategy)
  }));

  // Normalize scores to allocation percentages
  const totalScore = scored.reduce((s, c) => s + c.score, 0);
  let allocations = scored.map(c => ({
    campaignId: c.id,
    campaignName: c.name,
    platform: c.platform,
    currentBudget: c.budget,
    score: round(c.score, 2),
    allocation: totalScore > 0 ? c.score / totalScore : 1 / campaigns.length,
    currentRoas: c.roas || 0,
    currentCtr: c.ctr || 0
  }));

  // Apply min/max constraints
  allocations = applyConstraints(allocations, minAlloc, maxAlloc);

  // Calculate new budgets
  for (const a of allocations) {
    a.newBudget = Math.round(totalBudget * a.allocation);
    a.budgetChange = a.newBudget - a.currentBudget;
    a.changePercent = a.currentBudget > 0
      ? round(((a.newBudget - a.currentBudget) / a.currentBudget) * 100, 1)
      : 0;
  }

  // Sort by allocation descending
  allocations.sort((a, b) => b.allocation - a.allocation);

  const expectedRoas = calculateExpectedRoas(allocations, totalBudget);

  return {
    totalBudget,
    strategy,
    allocations,
    expectedRoas,
    summary: {
      campaignsOptimized: allocations.length,
      totalAllocated: allocations.reduce((s, a) => s + a.newBudget, 0),
      biggestGainer: allocations.reduce((max, a) => a.budgetChange > max.budgetChange ? a : max, allocations[0]),
      biggestLoser: allocations.reduce((min, a) => a.budgetChange < min.budgetChange ? a : min, allocations[0])
    },
    optimizedAt: new Date().toISOString()
  };
}

/**
 * Calculate campaign score based on strategy.
 * @param {object} campaign
 * @param {string} strategy
 * @returns {number}
 */
function calculateCampaignScore(campaign, strategy) {
  const roas = campaign.roas || 0;
  const ctr = campaign.ctr || 0;
  const convRate = campaign.conversions && campaign.clicks
    ? (campaign.conversions / campaign.clicks) * 100 : 1;
  const spendEfficiency = campaign.budget > 0 ? 1 - (campaign.spent / campaign.budget) : 1;

  const weights = {
    performance: { roas: 0.5, ctr: 0.25, conv: 0.15, efficiency: 0.1 },
    balanced:    { roas: 0.3, ctr: 0.3, conv: 0.2, efficiency: 0.2 },
    aggressive:  { roas: 0.6, ctr: 0.2, conv: 0.15, efficiency: 0.05 },
    conservative:{ roas: 0.2, ctr: 0.2, conv: 0.2, efficiency: 0.4 }
  };

  const w = weights[strategy] || weights.performance;

  // Normalize each metric to 0-10 scale
  const roasScore = clamp(roas * 2, 0, 10);
  const ctrScore = clamp(ctr * 3, 0, 10);
  const convScore = clamp(convRate, 0, 10);
  const effScore = clamp(spendEfficiency * 10, 0, 10);

  return roasScore * w.roas + ctrScore * w.ctr + convScore * w.conv + effScore * w.efficiency;
}

/**
 * Apply min/max allocation constraints.
 * @param {object[]} allocations
 * @param {number} min
 * @param {number} max
 * @returns {object[]}
 */
function applyConstraints(allocations, min, max) {
  // Clamp to max first
  for (const a of allocations) {
    a.allocation = clamp(a.allocation, min, max);
  }

  // Re-normalize
  const total = allocations.reduce((s, a) => s + a.allocation, 0);
  if (total > 0) {
    for (const a of allocations) {
      a.allocation = a.allocation / total;
    }
  }

  return allocations;
}

/**
 * Calculate expected ROAS from optimized allocations.
 * @param {object[]} allocations
 * @param {number} totalBudget
 * @returns {number}
 */
function calculateExpectedRoas(allocations, totalBudget) {
  if (totalBudget <= 0) return 0;
  const weightedRoas = allocations.reduce((s, a) => {
    return s + (a.currentRoas * a.allocation);
  }, 0);
  return round(weightedRoas, 2);
}

/**
 * Generate platform-specific budget recommendations.
 * @param {object[]} campaigns
 * @returns {object[]}
 */
function generateRecommendations(campaigns) {
  const recs = [];
  const byPlatform = {};

  for (const c of campaigns) {
    if (!byPlatform[c.platform]) byPlatform[c.platform] = [];
    byPlatform[c.platform].push(c);
  }

  for (const [platform, camps] of Object.entries(byPlatform)) {
    const avgRoas = camps.reduce((s, c) => s + (c.roas || 0), 0) / camps.length;
    const spec = PLATFORMS[platform];

    if (avgRoas > 3) {
      recs.push({
        platform,
        type: 'scale_up',
        message: `${spec?.label || platform} is performing well (avg ROAS ${round(avgRoas, 1)}). Increase budget by 20-30%.`,
        priority: 'high',
        estimatedImpact: `+${Math.round(avgRoas * 10)}% revenue`
      });
    } else if (avgRoas < 1.5) {
      recs.push({
        platform,
        type: 'optimize_or_pause',
        message: `${spec?.label || platform} is underperforming (avg ROAS ${round(avgRoas, 1)}). Test new creatives or reduce budget.`,
        priority: 'high',
        estimatedImpact: `Save ${Math.round(camps.reduce((s, c) => s + (c.budget - c.spent), 0))} in remaining budget`
      });
    }

    if (camps.length === 1 && avgRoas > 2) {
      recs.push({
        platform,
        type: 'add_variant',
        message: `Single strong campaign on ${spec?.label || platform}. Add A/B test variant.`,
        priority: 'medium',
        estimatedImpact: '+15-25% optimization potential'
      });
    }
  }

  return recs.sort((a, b) => {
    const p = { high: 3, medium: 2, low: 1 };
    return (p[b.priority] || 0) - (p[a.priority] || 0);
  });
}

module.exports = {
  optimizeAllocation,
  calculateCampaignScore,
  generateRecommendations,
  calculateExpectedRoas
};
