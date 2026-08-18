/* ============================================================
   OMNI backend — src/services/performance-tracker.js
   Real-time performance monitoring — tracks metrics over time,
   detects anomalies, and identifies trends.
   ============================================================ */
'use strict';

const metricHistory = new Map(); // campaignId -> [{timestamp, metrics}]

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Record a performance snapshot for a campaign.
 * @param {string} campaignId
 * @param {object} metrics - { roas, ctr, cpc, impressions, clicks, conversions, spend }
 */
function recordMetrics(campaignId, metrics) {
  if (!metricHistory.has(campaignId)) metricHistory.set(campaignId, []);

  const entry = {
    timestamp: new Date().toISOString(),
    roas: metrics.roas || 0,
    ctr: metrics.ctr || 0,
    cpc: metrics.cpc || 0,
    impressions: metrics.impressions || 0,
    clicks: metrics.clicks || 0,
    conversions: metrics.conversions || 0,
    spend: metrics.spend || 0
  };

  metricHistory.get(campaignId).push(entry);

  // Keep last 1000 entries per campaign
  const hist = metricHistory.get(campaignId);
  if (hist.length > 1000) hist.splice(0, hist.length - 1000);
}

/**
 * Get metric history for a campaign.
 * @param {string} campaignId
 * @param {number} limit
 * @returns {object[]}
 */
function getHistory(campaignId, limit = 50) {
  const hist = metricHistory.get(campaignId) || [];
  return hist.slice(-limit);
}

/**
 * Detect anomalies in campaign performance.
 * @param {object} campaign
 * @param {object[]} history
 * @returns {object[]}
 */
function detectAnomalies(campaign, history) {
  const anomalies = [];
  if (!history || history.length < 3) return anomalies;

  const recent = history.slice(-10);
  const avg = calculateAverages(recent);

  // ROAS drop detection
  if (campaign.roas < avg.roas * 0.6) {
    anomalies.push({
      type: 'roas_drop',
      severity: campaign.roas < avg.roas * 0.4 ? 'critical' : 'warning',
      message: `ROAS dropped ${Math.round((1 - campaign.roas / avg.roas) * 100)}% below average`,
      current: campaign.roas,
      average: round(avg.roas, 2),
      trend: getTrend(history, 'roas')
    });
  }

  // CTR drop detection
  if (campaign.ctr < avg.ctr * 0.5) {
    anomalies.push({
      type: 'ctr_drop',
      severity: campaign.ctr < avg.ctr * 0.3 ? 'critical' : 'warning',
      message: `CTR dropped ${Math.round((1 - campaign.ctr / avg.ctr) * 100)}% below average`,
      current: campaign.ctr,
      average: round(avg.ctr, 2),
      trend: getTrend(history, 'ctr')
    });
  }

  // CPC spike detection
  if (campaign.cpc > avg.cpc * 1.8) {
    anomalies.push({
      type: 'cpc_spike',
      severity: campaign.cpc > avg.cpc * 2.5 ? 'critical' : 'warning',
      message: `CPC increased ${Math.round((campaign.cpc / avg.cpc - 1) * 100)}% above average`,
      current: campaign.cpc,
      average: round(avg.cpc, 2),
      trend: getTrend(history, 'cpc')
    });
  }

  // Budget burn rate
  if (campaign.budget > 0) {
    const burnRate = campaign.spent / campaign.budget;
    if (burnRate > 0.8 && campaign.roas < 2) {
      anomalies.push({
        type: 'budget_burn',
        severity: burnRate > 0.9 ? 'critical' : 'warning',
        message: `Budget ${Math.round(burnRate * 100)}% spent with ROAS ${round(campaign.roas, 1)}`,
        current: round(burnRate * 100, 1),
        average: null,
        trend: 'down'
      });
    }
  }

  return anomalies;
}

/**
 * Calculate average metrics from history.
 * @param {object[]} data
 * @returns {object}
 */
function calculateAverages(data) {
  if (!data.length) return { roas: 0, ctr: 0, cpc: 0 };
  const sum = data.reduce((s, d) => ({
    roas: s.roas + d.roas,
    ctr: s.ctr + d.ctr,
    cpc: s.cpc + d.cpc
  }), { roas: 0, ctr: 0, cpc: 0 });

  return {
    roas: sum.roas / data.length,
    ctr: sum.ctr / data.length,
    cpc: sum.cpc / data.length
  };
}

/**
 * Get trend direction for a metric.
 * @param {object[]} history
 * @param {string} metric
 * @returns {string} 'up', 'down', 'stable'
 */
function getTrend(history, metric) {
  if (history.length < 4) return 'stable';
  const half = Math.floor(history.length / 2);
  const firstHalf = history.slice(0, half);
  const secondHalf = history.slice(half);

  const avgFirst = firstHalf.reduce((s, d) => s + (d[metric] || 0), 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, d) => s + (d[metric] || 0), 0) / secondHalf.length;

  const change = avgSecond - avgFirst;
  if (change > avgFirst * 0.1) return 'up';
  if (change < -avgFirst * 0.1) return 'down';
  return 'stable';
}

/**
 * Get performance summary for a campaign.
 * @param {string} campaignId
 * @returns {object}
 */
function getPerformanceSummary(campaignId) {
  const history = getHistory(campaignId, 100);
  if (!history.length) return { hasData: false };

  const avg = calculateAverages(history);
  const latest = history[history.length - 1];
  const roasTrend = getTrend(history, 'roas');
  const ctrTrend = getTrend(history, 'ctr');

  return {
    hasData: true,
    dataPoints: history.length,
    latest: {
      timestamp: latest.timestamp,
      roas: latest.roas,
      ctr: latest.ctr,
      cpc: latest.cpc
    },
    averages: {
      roas: round(avg.roas, 2),
      ctr: round(avg.ctr, 2),
      cpc: round(avg.cpc, 2)
    },
    trends: {
      roas: roasTrend,
      ctr: ctrTrend,
      overall: roasTrend === 'up' && ctrTrend !== 'down' ? 'improving'
        : roasTrend === 'down' && ctrTrend !== 'up' ? 'declining'
        : 'stable'
    },
    volatility: calculateVolatility(history),
    consistencyScore: calculateConsistency(history)
  };
}

/**
 * Calculate metric volatility (standard deviation).
 * @param {object[]} history
 * @returns {number} 0-100
 */
function calculateVolatility(history) {
  if (history.length < 2) return 0;
  const roasValues = history.map(h => h.roas);
  const mean = roasValues.reduce((s, v) => s + v, 0) / roasValues.length;
  const variance = roasValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / roasValues.length;
  const stdDev = Math.sqrt(variance);
  return clamp(Math.round(stdDev * 20), 0, 100);
}

/**
 * Calculate consistency score (0-100).
 * @param {object[]} history
 * @returns {number}
 */
function calculateConsistency(history) {
  if (history.length < 2) return 100;
  const volatility = calculateVolatility(history);
  return clamp(100 - volatility, 0, 100);
}

module.exports = {
  recordMetrics,
  getHistory,
  detectAnomalies,
  getPerformanceSummary,
  calculateAverages,
  getTrend
};
