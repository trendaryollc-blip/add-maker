/* ============================================================
   OMNI backend — src/services/predictive-metrics.js
   Predictive Metrics Engine — calculates CTR, CPC, conversion
   rates, ROAS, and budget recommendations from ghost user data.
   ============================================================ */
'use strict';

function r(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const BENCHMARKS = {
  ecommerce: { ctr: 2.5, cpc: 0.8, conv: 3.2, aov: 75 },
  saas:      { ctr: 3.0, cpc: 1.2, conv: 5.0, aov: 50 },
  fashion:   { ctr: 2.0, cpc: 0.9, conv: 2.8, aov: 120 },
  food:      { ctr: 3.5, cpc: 0.6, conv: 4.0, aov: 45 },
  fitness:   { ctr: 2.8, cpc: 0.7, conv: 3.5, aov: 60 },
  tech:      { ctr: 2.2, cpc: 1.5, conv: 4.5, aov: 200 },
  beauty:    { ctr: 3.2, cpc: 0.5, conv: 3.8, aov: 55 },
  general:   { ctr: 2.5, cpc: 0.8, conv: 3.0, aov: 80 }
};

const PLATFORM_MODS = {
  tiktok:    { ctr: 1.3, cpc: 0.7, conv: 0.9 },
  instagram: { ctr: 1.1, cpc: 0.9, conv: 1.0 },
  facebook:  { ctr: 1.0, cpc: 1.0, conv: 1.1 },
  youtube:   { ctr: 0.8, cpc: 1.2, conv: 1.2 },
  general:   { ctr: 1.0, cpc: 1.0, conv: 1.0 }
};

function calcAvgEngagement(result) {
  if (!result.reactions || !result.reactions.length) return (result.positive_ratio || 50) / 100;
  return result.reactions.reduce((s, rx) => s + (rx.avgEngagement || 0), 0) / result.reactions.length;
}

function calcWatchTime(result, duration) {
  if (!result.reactions || !result.reactions.length) return duration * 0.6;
  return result.reactions.reduce((s, rx) => s + (rx.dropOffSecond || duration), 0) / result.reactions.length;
}

function calcCompletionRate(result, duration) {
  if (!result.reactions || !result.reactions.length) return 40;
  const done = result.reactions.filter(rx => (rx.dropOffSecond || duration) >= duration * 0.9).length;
  return (done / result.reactions.length) * 100;
}

function qualityLabel(score) {
  if (score >= 8) return 'Excellent';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Average';
  return 'Below Average';
}

function recommendBudget(roas, cpa, dailyBudget) {
  if (roas > 4) return { suggested: Math.round(dailyBudget * 1.5), action: 'Scale up aggressively' };
  if (roas > 2.5) return { suggested: Math.round(dailyBudget * 1.2), action: 'Scale up moderately' };
  if (roas > 1.5) return { suggested: dailyBudget, action: 'Maintain and optimize' };
  if (roas > 1) return { suggested: Math.round(dailyBudget * 0.8), action: 'Reduce and test creatives' };
  return { suggested: Math.round(dailyBudget * 0.5), action: 'Pause and re-evaluate' };
}

/**
 * Calculate comprehensive predictive metrics from simulation results.
 * @param {object} simResult - Output from simulateBatch()
 * @param {object} opts - { dailyBudget, industry, platform }
 * @returns {object}
 */
function calculateMetrics(simResult, opts = {}) {
  const { overall_score = 50, sample_size = 500, positive_ratio = 50,
          drop_off_point = 8, duration = 15 } = simResult;
  const budget = opts.dailyBudget || 100;
  const industry = opts.industry || 'general';
  const platform = opts.platform || 'general';
  const bench = BENCHMARKS[industry] || BENCHMARKS.general;
  const pmod = PLATFORM_MODS[platform] || PLATFORM_MODS.general;

  const baseCTR = (positive_ratio / 100) * 0.05 + (overall_score / 100) * 0.03;
  const ctr = clamp(baseCTR * pmod.ctr * (0.8 + Math.random() * 0.4), 0.001, 0.15);

  const engagementQ = overall_score / 100;
  const baseCPC = bench.cpc * (1.2 - engagementQ * 0.4);
  const cpc = clamp(baseCPC * pmod.cpc * (0.8 + Math.random() * 0.4), 0.05, 5.0);

  const purchaseRate = simResult.reactions
    ? simResult.reactions.filter(rx => rx.outcome === 'purchased').length / sample_size
    : (overall_score / 100) * 0.03;
  const convRate = clamp(purchaseRate * 100 * pmod.conv * (0.7 + Math.random() * 0.6), 0.1, 15);

  const impressions = Math.round(budget / (cpc * ctr));
  const clicks = Math.round(impressions * ctr);
  const conversions = Math.round(clicks * (convRate / 100));
  const revenue = conversions * bench.aov;
  const roas = budget > 0 ? revenue / budget : 0;
  const cpa = conversions > 0 ? budget / conversions : budget;

  const avgEng = calcAvgEngagement(simResult);
  const watchTime = calcWatchTime(simResult, duration);
  const compRate = calcCompletionRate(simResult, duration);

  let qScore = 5;
  if (ctr * 100 > 3) qScore += 1.5; else if (ctr * 100 < 1) qScore -= 1;
  if (roas > 3) qScore += 1.5; else if (roas < 1) qScore -= 1.5;
  if (avgEng > 0.6) qScore += 1; else if (avgEng < 0.3) qScore -= 0.5;
  if (compRate > 60) qScore += 0.5;
  qScore = clamp(qScore, 1, 10);

  return {
    ctr: r(ctr * 100, 2), cpc: r(cpc, 2), conversionRate: r(convRate, 2),
    roas: r(roas, 2), cpa: r(cpa, 2),
    impressions, clicks, conversions, revenue: r(revenue, 2),
    avgEngagement: r(avgEng, 2), avgWatchTime: r(watchTime, 1),
    completionRate: r(compRate, 1),
    qualityScore: r(qScore, 1), qualityLabel: qualityLabel(qScore),
    budgetRecommendation: recommendBudget(roas, cpa, budget),
    vsIndustry: {
      ctr: r((ctr * 100) / bench.ctr, 2),
      cpc: r(bench.cpc / cpc, 2),
      conversion: r(convRate / bench.conv, 2)
    },
    note: 'Predictive estimates from ghost user simulation pool.'
  };
}

module.exports = { calculateMetrics, BENCHMARKS, PLATFORM_MODS };
