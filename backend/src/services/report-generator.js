/* ============================================================
   OMNI backend — src/services/report-generator.js
   Campaign Report Generator — produces detailed performance
   reports with insights, trends, and recommendations.
   ============================================================ */
'use strict';

const performanceTracker = require('./performance-tracker');
const campaignManager = require('./campaign-manager');
const budgetOptimizer = require('./budget-optimizer');

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

/**
 * Generate a comprehensive campaign report.
 * @param {object[]} campaigns
 * @param {object} opts - { period, includeDetails, userId }
 * @returns {object}
 */
function generateReport(campaigns, opts = {}) {
  const period = opts.period || 'last_7_days';
  const summary = calculateSummary(campaigns);
  const platformBreakdown = calculatePlatformBreakdown(campaigns);
  const healthDistribution = calculateHealthDistribution(campaigns);
  const trends = analyzeTrends(campaigns);
  const recommendations = budgetOptimizer.generateRecommendations(campaigns);
  const insights = generateInsights(campaigns, summary, platformBreakdown);

  return {
    reportId: 'rpt_' + Date.now().toString(36),
    generatedAt: new Date().toISOString(),
    period: formatPeriod(period),
    summary,
    platformBreakdown,
    healthDistribution,
    trends,
    recommendations,
    insights,
    topPerformers: getTopPerformers(campaigns, 3),
    underperformers: getUnderperformers(campaigns, 3)
  };
}

/**
 * Calculate overall summary.
 * @param {object[]} campaigns
 * @returns {object}
 */
function calculateSummary(campaigns) {
  const total = campaigns.length;
  const active = campaigns.filter(c => c.status === 'active').length;
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + ((c.spent || 0) * (c.roas || 0)), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);

  return {
    totalCampaigns: total,
    activeCampaigns: active,
    totalBudget: round(totalBudget, 2),
    totalSpent: round(totalSpent, 2),
    budgetRemaining: round(totalBudget - totalSpent, 2),
    spendRate: totalBudget > 0 ? round((totalSpent / totalBudget) * 100, 1) : 0,
    totalRevenue: round(totalRevenue, 2),
    overallRoas: totalSpent > 0 ? round(totalRevenue / totalSpent, 2) : 0,
    totalImpressions,
    totalClicks,
    totalConversions,
    overallCtr: totalImpressions > 0 ? round((totalClicks / totalImpressions) * 100, 2) : 0,
    overallConversionRate: totalClicks > 0 ? round((totalConversions / totalClicks) * 100, 2) : 0,
    costPerClick: totalClicks > 0 ? round(totalSpent / totalClicks, 2) : 0,
    costPerConversion: totalConversions > 0 ? round(totalSpent / totalConversions, 2) : 0
  };
}

/**
 * Calculate per-platform breakdown.
 * @param {object[]} campaigns
 * @returns {object}
 */
function calculatePlatformBreakdown(campaigns) {
  const byPlatform = {};
  for (const c of campaigns) {
    const p = c.platform || 'unknown';
    if (!byPlatform[p]) {
      byPlatform[p] = {
        campaigns: 0, active: 0, budget: 0, spent: 0, revenue: 0,
        impressions: 0, clicks: 0, conversions: 0
      };
    }
    const bp = byPlatform[p];
    bp.campaigns++;
    if (c.status === 'active') bp.active++;
    bp.budget += c.budget || 0;
    bp.spent += c.spent || 0;
    bp.revenue += (c.spent || 0) * (c.roas || 0);
    bp.impressions += c.impressions || 0;
    bp.clicks += c.clicks || 0;
    bp.conversions += c.conversions || 0;
  }

  for (const [p, data] of Object.entries(byPlatform)) {
    data.roas = data.spent > 0 ? round(data.revenue / data.spent, 2) : 0;
    data.ctr = data.impressions > 0 ? round((data.clicks / data.impressions) * 100, 2) : 0;
    data.conversionRate = data.clicks > 0 ? round((data.conversions / data.clicks) * 100, 2) : 0;
    data.cpc = data.clicks > 0 ? round(data.spent / data.clicks, 2) : 0;
    data.budgetShare = 0; // calculated after total
  }

  // Calculate budget shares
  const totalBudget = Object.values(byPlatform).reduce((s, p) => s + p.budget, 0);
  for (const data of Object.values(byPlatform)) {
    data.budgetShare = totalBudget > 0 ? round((data.budget / totalBudget) * 100, 1) : 0;
  }

  return byPlatform;
}

/**
 * Calculate health distribution.
 * @param {object[]} campaigns
 * @returns {object}
 */
function calculateHealthDistribution(campaigns) {
  const dist = { excellent: 0, good: 0, average: 0, poor: 0, critical: 0, unknown: 0 };
  for (const c of campaigns) {
    const health = campaignManager.assessHealth(c);
    dist[health.level] = (dist[health.level] || 0) + 1;
  }
  return dist;
}

/**
 * Analyze performance trends.
 * @param {object[]} campaigns
 * @returns {object}
 */
function analyzeTrends(campaigns) {
  const active = campaigns.filter(c => c.status === 'active');
  const avgRoas = active.length > 0
    ? active.reduce((s, c) => s + (c.roas || 0), 0) / active.length : 0;
  const avgCtr = active.length > 0
    ? active.reduce((s, c) => s + (c.ctr || 0), 0) / active.length : 0;

  return {
    avgRoas: round(avgRoas, 2),
    avgCtr: round(avgCtr, 2),
    roasDirection: avgRoas > 2.5 ? 'positive' : avgRoas > 1.5 ? 'neutral' : 'negative',
    ctrDirection: avgCtr > 2 ? 'positive' : avgCtr > 1 ? 'neutral' : 'negative',
    overallHealth: avgRoas > 2.5 && avgCtr > 2 ? 'strong'
      : avgRoas > 1.5 ? 'moderate' : 'weak'
  };
}

/**
 * Generate actionable insights.
 * @param {object[]} campaigns
 * @param {object} summary
 * @param {object} platformBreakdown
 * @returns {string[]}
 */
function generateInsights(campaigns, summary, platformBreakdown) {
  const insights = [];

  if (summary.overallRoas > 3) {
    insights.push(`Excellent overall ROAS of ${summary.overallRoas}x — scale budget on top performers.`);
  } else if (summary.overallRoas < 1.5) {
    insights.push(`Overall ROAS is ${summary.overallRoas}x — below profitability threshold. Optimize creatives.`);
  }

  if (summary.spendRate < 30) {
    insights.push(`Only ${summary.spendRate}% of budget spent — check delivery settings or increase bids.`);
  } else if (summary.spendRate > 80) {
    insights.push(`${summary.spendRate}% of budget spent — consider increasing daily limits or adding new campaigns.`);
  }

  const platforms = Object.entries(platformBreakdown).sort((a, b) => b[1].roas - a[1].roas);
  if (platforms.length >= 2) {
    const best = platforms[0];
    const worst = platforms[platforms.length - 1];
    if (best[1].roas > worst[1].roas * 2) {
      insights.push(`${best[0]} outperforms ${worst[0]} by ${round(best[1].roas / worst[1].roas, 1)}x — reallocate budget.`);
    }
  }

  if (summary.activeCampaigns < 3) {
    insights.push(`Only ${summary.activeCampaigns} active campaigns — add variants for better optimization.`);
  }

  if (insights.length === 0) {
    insights.push('Performance is stable. Continue monitoring and test new creatives.');
  }

  return insights;
}

/**
 * Get top performers.
 * @param {object[]} campaigns
 * @param {number} limit
 * @returns {object[]}
 */
function getTopPerformers(campaigns, limit = 3) {
  return campaigns
    .filter(c => c.status === 'active')
    .sort((a, b) => (b.roas || 0) - (a.roas || 0))
    .slice(0, limit)
    .map(c => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      roas: c.roas,
      ctr: c.ctr,
      budget: c.budget,
      spent: c.spent
    }));
}

/**
 * Get underperformers.
 * @param {object[]} campaigns
 * @param {number} limit
 * @returns {object[]}
 */
function getUnderperformers(campaigns, limit = 3) {
  return campaigns
    .filter(c => c.status === 'active')
    .sort((a, b) => (a.roas || 0) - (b.roas || 0))
    .slice(0, limit)
    .map(c => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      roas: c.roas,
      ctr: c.ctr,
      budget: c.budget,
      spent: c.spent,
      health: campaignManager.assessHealth(c)
    }));
}

/**
 * Format period string.
 * @param {string} period
 * @returns {string}
 */
function formatPeriod(period) {
  const map = {
    today: 'Today',
    last_24_hours: 'Last 24 Hours',
    last_7_days: 'Last 7 Days',
    last_30_days: 'Last 30 Days',
    this_month: 'This Month',
    last_month: 'Last Month'
  };
  return map[period] || period;
}

module.exports = {
  generateReport,
  calculateSummary,
  calculatePlatformBreakdown,
  calculateHealthDistribution,
  analyzeTrends,
  generateInsights,
  getTopPerformers,
  getUnderperformers
};
