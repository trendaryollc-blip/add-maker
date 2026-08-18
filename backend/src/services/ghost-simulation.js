/* ============================================================
   OMNI backend — src/services/ghost-simulation.js
   Hive-mind Ghost Users: predict audience reactions, emotional
   journey and performance metrics before spend.
   Now with AI persona generation, behavioral reaction modeling,
   attention heatmaps, and predictive metrics.
   ============================================================ */
'use strict';

const { generatePersonas, summarizePersonas } = require('./persona-engine');
const { simulateBatch, simulatePersonaReaction } = require('./reaction-model');
const { generateHeatmap } = require('./heatmap-generator');
const { calculateMetrics } = require('./predictive-metrics');

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Run a ghost-user simulation with full AI pipeline.
 * @param {object} opts { ghostCount, duration, productName, productCategory, targetAudience, dailyBudget, industry, platform }
 * @returns {Promise<object>}
 */
async function simulateReactions(opts) {
  const count = clamp(parseInt(opts.ghostCount, 10) || 500, 10, 10000);
  const duration = clamp(parseInt(opts.duration, 10) || 15, 5, 120);

  // Step 1: Generate personas
  const personas = await generatePersonas({
    count,
    productName: opts.productName,
    productCategory: opts.productCategory,
    targetAudience: opts.targetAudience
  });

  // Step 2: Simulate reactions for all personas
  const batchResult = simulateBatch(personas, duration);

  // Step 3: Generate attention heatmap
  const heatmap = generateHeatmap(batchResult.reactions, { gridSize: 10, duration });

  // Step 4: Calculate predictive metrics
  const metrics = calculateMetrics(batchResult, {
    dailyBudget: opts.dailyBudget || 100,
    industry: opts.industry || 'general',
    platform: opts.platform || 'general'
  });

  // Step 5: Generate persona summary
  const personaSummary = summarizePersonas(personas);

  // Step 6: Generate recommendations
  const recommendations = generateRecommendations(batchResult, metrics, heatmap);

  return {
    overall_score: batchResult.overall_score,
    sample_size: batchResult.sample_size,
    duration: batchResult.duration,
    positive_ratio: batchResult.positive_ratio,
    drop_off_point: batchResult.drop_off_point,
    best_segment: batchResult.best_segment,
    worst_segment: batchResult.worst_segment,
    emotional_journey: batchResult.emotional_journey,
    segment_breakdown: batchResult.segment_breakdown,
    heatmap,
    predicted_metrics: metrics,
    persona_summary: personaSummary,
    recommendations,
    reactions: batchResult.reactions.slice(0, 50)
  };
}

/**
 * Generate actionable recommendations based on simulation results.
 * @param {object} batchResult
 * @param {object} metrics
 * @param {object} heatmap
 * @returns {string[]}
 */
function generateRecommendations(batchResult, metrics, heatmap) {
  const recs = [];

  if (batchResult.overall_score < 40) {
    recs.push('Overall score is low — consider redesigning the ad creative or adjusting the hook.');
  } else if (batchResult.overall_score > 75) {
    recs.push('Strong performance predicted — consider scaling budget for this creative.');
  }

  if (batchResult.drop_off_point < batchResult.duration * 0.3) {
    recs.push(`Drop-off at ${batchResult.drop_off_point}s is early — the opening hook needs improvement.`);
  }

  if (metrics.ctr < 1.5) {
    recs.push('CTR prediction is below average — test stronger CTAs or more attention-grabbing visuals.');
  }

  if (metrics.roas < 1.5) {
    recs.push('ROAS prediction is thin — optimize targeting or adjust pricing strategy.');
  }

  if (heatmap.coldZones && heatmap.coldZones.length > 3) {
    recs.push('Multiple cold zones detected — redistribute visual elements to fill attention gaps.');
  }

  if (metrics.qualityScore >= 7) {
    recs.push('High quality score — this ad is ready for A/B testing with real audiences.');
  }

  const segKeys = Object.keys(batchResult.segment_breakdown || {});
  if (segKeys.length > 0) {
    const best = segKeys.reduce((a, b) =>
      (batchResult.segment_breakdown[a].likeRate > batchResult.segment_breakdown[b].likeRate ? a : b));
    recs.push(`Best performing segment: ${best} — consider allocating more budget to this audience.`);
  }

  if (recs.length === 0) {
    recs.push('Simulation looks average — test with different audience segments for better insights.');
  }

  return recs;
}

/**
 * Get available environments for simulation.
 * @returns {object[]}
 */
function getEnvironments() {
  return [
    { id: 'cyber-city', name: 'Cyber City', mood: 'futuristic', colors: ['#0a0a1a', '#00d4ff', '#ff0080'] },
    { id: 'tropical-paradise', name: 'Tropical Paradise', mood: 'relaxed', colors: ['#1a4a2e', '#00ff88', '#ffcc00'] },
    { id: 'alpine-zen', name: 'Alpine Zen', mood: 'calm', colors: ['#f0f0f0', '#4a90d9', '#7b68ee'] },
    { id: 'desert-sunset', name: 'Desert Sunset', mood: 'warm', colors: ['#1a0a00', '#ff6b35', '#ffd700'] },
    { id: 'deep-space', name: 'Deep Space', mood: 'epic', colors: ['#000011', '#6b21a8', '#00ffcc'] }
  ];
}

module.exports = {
  simulateReactions,
  getEnvironments,
  generateRecommendations
};
