/* ============================================================
   OMNI backend — src/services/ab-test-engine.js
   A/B Test Engine — manages variant testing with statistical
   significance calculation and winner determination.
   ============================================================ */
'use strict';

const tests = new Map(); // testId -> test object

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Create a new A/B test.
 * @param {object} opts - { campaignId, name, variants, trafficSplit, metric }
 * @returns {object}
 */
function createTest(opts) {
  const id = 'ab_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const variants = (opts.variants || ['A', 'B']).map((v, i) => ({
    id: `variant_${i + 1}`,
    name: typeof v === 'string' ? v : v.name || `Variant ${String.fromCharCode(65 + i)}`,
    traffic: 100 / (opts.variants || ['A', 'B']).length,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    ctr: 0,
    conversionRate: 0,
    isControl: i === 0
  }));

  const test = {
    id,
    campaignId: opts.campaignId || null,
    name: opts.name || `A/B Test ${id}`,
    status: 'running',
    variants,
    primaryMetric: opts.metric || 'conversionRate',
    trafficSplit: opts.trafficSplit || 'even',
    minSampleSize: opts.minSampleSize || 1000,
    significanceLevel: opts.significanceLevel || 0.95,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    winner: null,
    results: null
  };

  tests.set(id, test);
  return test;
}

/**
 * Record an event for a variant.
 * @param {string} testId
 * @param {string} variantId
 * @param {object} event - { type: 'impression'|'click'|'conversion', revenue? }
 */
function recordEvent(testId, variantId, event) {
  const test = tests.get(testId);
  if (!test || test.status !== 'running') return;

  const variant = test.variants.find(v => v.id === variantId);
  if (!variant) return;

  if (event.type === 'impression') variant.impressions++;
  if (event.type === 'click') variant.clicks++;
  if (event.type === 'conversion') {
    variant.conversions++;
    variant.revenue += event.revenue || 0;
  }

  // Recalculate rates
  variant.ctr = variant.impressions > 0
    ? round((variant.clicks / variant.impressions) * 100, 2) : 0;
  variant.conversionRate = variant.clicks > 0
    ? round((variant.conversions / variant.clicks) * 100, 2) : 0;

  test.updatedAt = new Date().toISOString();
}

/**
 * Check if test has enough data for significance.
 * @param {string} testId
 * @returns {object}
 */
function checkSignificance(testId) {
  const test = tests.get(testId);
  if (!test) return { error: 'Test not found' };

  const control = test.variants.find(v => v.isControl);
  if (!control) return { error: 'No control variant' };

  const totalImpressions = test.variants.reduce((s, v) => s + v.impressions, 0);
  const hasEnoughData = totalImpressions >= test.minSampleSize;

  // Calculate statistical significance using Z-test for proportions
  let significance = 0;
  let winner = null;
  let confidenceInterval = null;

  if (hasEnoughData && control.impressions > 0) {
    let bestLift = 0;
    for (const variant of test.variants) {
      if (variant.isControl || variant.impressions === 0) continue;

      const p1 = control.conversions / control.impressions;
      const p2 = variant.conversions / variant.impressions;
      const n1 = control.impressions;
      const n2 = variant.impressions;

      const pPool = (control.conversions + variant.conversions) / (n1 + n2);
      if (pPool === 0 || pPool === 1) continue;

      const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
      if (se === 0) continue;

      const z = (p2 - p1) / se;
      const pValue = 2 * (1 - normalCDF(Math.abs(z)));
      const conf = (1 - pValue) * 100;

      if (conf > significance) {
        significance = conf;
        const lift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;
        if (conf >= test.significanceLevel * 100 && lift > bestLift) {
          bestLift = lift;
          winner = variant;
          confidenceInterval = {
            lower: round((p2 - 1.96 * se) * 100, 2),
            upper: round((p2 + 1.96 * se) * 100, 2)
          };
        }
      }
    }
  }

  return {
    testId,
    hasEnoughData,
    totalImpressions,
    minSampleSize: test.minSampleSize,
    significanceLevel: test.significanceLevel * 100,
    currentSignificance: round(significance, 1),
    isSignificant: significance >= test.significanceLevel * 100,
    winner: winner ? {
      id: winner.id,
      name: winner.name,
      lift: round(((winner.conversionRate - control.conversionRate) / (control.conversionRate || 1)) * 100, 1),
      confidenceInterval
    } : null,
    variantResults: test.variants.map(v => ({
      id: v.id,
      name: v.name,
      impressions: v.impressions,
      clicks: v.clicks,
      conversions: v.conversions,
      ctr: v.ctr,
      conversionRate: v.conversionRate,
      revenue: round(v.revenue, 2),
      isControl: v.isControl
    }))
  };
}

/**
 * Determine winner and stop test.
 * @param {string} testId
 * @returns {object}
 */
function concludeTest(testId) {
  const test = tests.get(testId);
  if (!test) return { error: 'Test not found' };

  const sig = checkSignificance(testId);
  test.status = sig.winner ? 'completed' : 'inconclusive';
  test.winner = sig.winner;
  test.results = sig;
  test.concludedAt = new Date().toISOString();

  return { test, significance: sig };
}

/**
 * Normal CDF approximation (Abramowitz and Stegun).
 * @param {number} x
 * @returns {number}
 */
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327;
  const p = d * Math.exp(-x * x / 2) *
    (t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))));
  return x > 0 ? 1 - p : p;
}

/**
 * Get all tests for a campaign.
 * @param {string} campaignId
 * @returns {object[]}
 */
function getTestsForCampaign(campaignId) {
  return [...tests.values()].filter(t => t.campaignId === campaignId);
}

/**
 * Get all active tests.
 * @returns {object[]}
 */
function getActiveTests() {
  return [...tests.values()].filter(t => t.status === 'running');
}

/**
 * Get test by id.
 * @param {string} testId
 * @returns {object|undefined}
 */
function getTest(testId) {
  return tests.get(testId);
}

module.exports = {
  createTest,
  recordEvent,
  checkSignificance,
  concludeTest,
  getTestsForCampaign,
  getActiveTests,
  getTest
};
