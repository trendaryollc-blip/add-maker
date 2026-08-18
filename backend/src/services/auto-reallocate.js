/* ============================================================
   OMNI backend — src/services/auto-reallocate.js
   Auto-Reallocate Rules Engine — automatically shifts budget
   based on performance rules, anomalies, and AI recommendations.
   ============================================================ */
'use strict';

const performanceTracker = require('./performance-tracker');
const budgetOptimizer = require('./budget-optimizer');

function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

const DEFAULT_RULES = [
  {
    id: 'rule_roas_low',
    name: 'Low ROAS Reallocation',
    description: 'Move budget from campaigns with ROAS < 1.0 to top performer',
    condition: (campaign) => (campaign.roas || 0) < 1.0 && campaign.status === 'active',
    action: 'reallocate',
    percentage: 40,
    priority: 1
  },
  {
    id: 'rule_ctr_critical',
    name: 'Critical CTR Pause',
    description: 'Pause campaigns with CTR < 0.3%',
    condition: (campaign) => (campaign.ctr || 0) < 0.3 && campaign.status === 'active',
    action: 'pause',
    percentage: 0,
    priority: 2
  },
  {
    id: 'rule_budget_exhaust',
    name: 'Budget Exhaustion Alert',
    description: 'Alert when budget > 90% spent and ROAS < 2',
    condition: (campaign) => {
      const spendRatio = campaign.budget > 0 ? campaign.spent / campaign.budget : 0;
      return spendRatio > 0.9 && (campaign.roas || 0) < 2;
    },
    action: 'alert',
    percentage: 0,
    priority: 3
  },
  {
    id: 'rule_high_performer_scale',
    name: 'Scale Top Performer',
    description: 'Increase budget for campaigns with ROAS > 4',
    condition: (campaign) => (campaign.roas || 0) > 4 && campaign.status === 'active',
    action: 'scale_up',
    percentage: 20,
    priority: 4
  },
  {
    id: 'rule_budget_unused',
    name: 'Unused Budget Reallocate',
    description: 'Move budget from campaigns spending < 20% of daily target',
    condition: (campaign) => {
      const dailyTarget = (campaign.budget || 0) / 7;
      const dailySpent = (campaign.spent || 0) / 7;
      return dailySpent < dailyTarget * 0.2 && campaign.status === 'active';
    },
    action: 'reallocate',
    percentage: 30,
    priority: 5
  }
];

/**
 * Run auto-reallocation across all campaigns.
 * @param {object[]} campaigns
 * @param {object} opts - { rules, maxReallocatePercent, dryRun }
 * @returns {object}
 */
function autoReallocate(campaigns, opts = {}) {
  const rules = opts.rules || DEFAULT_RULES;
  const maxRealloc = opts.maxReallocatePercent || 0.4;
  const dryRun = opts.dryRun || false;

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  if (activeCampaigns.length === 0) {
    return { moves: [], alerts: [], summary: 'No active campaigns', dryRun };
  }

  // Evaluate rules
  const triggeredRules = [];
  const alerts = [];

  for (const campaign of activeCampaigns) {
    for (const rule of rules.sort((a, b) => a.priority - b.priority)) {
      try {
        if (rule.condition(campaign)) {
          triggeredRules.push({ campaign, rule });
          if (rule.action === 'alert') {
            alerts.push({
              campaignId: campaign.id,
              campaignName: campaign.name,
              rule: rule.name,
              message: rule.description,
              severity: rule.priority <= 2 ? 'critical' : 'warning'
            });
          }
        }
      } catch (_e) { /* skip malformed rules */ }
    }
  }

  // Execute reallocations
  const moves = [];
  let totalReclaimed = 0;

  // Find campaigns to take from (low performers)
  const donors = triggeredRules
    .filter(t => t.rule.action === 'reallocate')
    .map(t => ({
      campaign: t.campaign,
      amount: Math.round(t.campaign.budget * (t.rule.percentage / 100)),
      rule: t.rule
    }))
    .filter(d => d.amount > 0)
    .sort((a, b) => (a.campaign.roas || 0) - (b.campaign.roas || 0));

  // Find campaigns to give to (high performers)
  const receivers = triggeredRules
    .filter(t => t.rule.action === 'scale_up')
    .map(t => ({ campaign: t.campaign, rule: t.rule }))
    .sort((a, b) => (b.campaign.roas || 0) - (a.campaign.roas || 0));

  // Also use optimizer to find best receiver
  if (receivers.length === 0 && activeCampaigns.length > 1) {
    const optimized = budgetOptimizer.optimizeAllocation(activeCampaigns, { totalBudget: activeCampaigns.reduce((s, c) => s + c.budget, 0) });
    const topAlloc = optimized.allocations[0];
    if (topAlloc) {
      const topCampaign = activeCampaigns.find(c => c.id === topAlloc.campaignId);
      if (topCampaign) receivers.push({ campaign: topCampaign, rule: { name: 'AI Optimizer' } });
    }
  }

  // Execute moves
  const totalBudget = activeCampaigns.reduce((s, c) => s + (c.budget || 0), 0);

  for (const donor of donors) {
    if (totalReclaimed >= totalBudget * maxRealloc) break;
    const receiver = receivers[0];
    if (!receiver) break;

    const amount = Math.min(donor.amount, totalBudget * maxRealloc - totalReclaimed);
    if (amount <= 0) continue;

    moves.push({
      from: donor.campaign.name,
      fromId: donor.campaign.id,
      to: receiver.campaign.name,
      toId: receiver.campaign.id,
      amount,
      reason: donor.rule.description,
      rule: donor.rule.name
    });

    totalReclaimed += amount;
  }

  // Pause actions
  const pauses = triggeredRules
    .filter(t => t.rule.action === 'pause')
    .map(t => ({
      campaignId: t.campaign.id,
      campaignName: t.campaign.name,
      reason: t.rule.description
    }));

  if (!dryRun) {
    // Apply moves would be done via Campaign.update in production
  }

  return {
    moves,
    alerts,
    pauses,
    dryRun,
    summary: {
      campaignsScanned: activeCampaigns.length,
      rulesTriggered: triggeredRules.length,
      totalReclaimed: round(totalReclaimed, 2),
      campaignsToReallocate: donors.length,
      campaignsToScale: receivers.length,
      campaignsToPause: pauses.length
    },
    reallocatedAt: new Date().toISOString()
  };
}

/**
 * Get default reallocation rules.
 * @returns {object[]}
 */
function getRules() {
  return DEFAULT_RULES.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    action: r.action,
    percentage: r.percentage,
    priority: r.priority
  }));
}

module.exports = { autoReallocate, getRules, DEFAULT_RULES };
