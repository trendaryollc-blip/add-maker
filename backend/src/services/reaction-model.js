/* ============================================================
   OMNI backend — src/services/reaction-model.js
   Behavioral Reaction Model — simulates how each persona type
   reacts to ad content over time, producing emotional journeys,
   drop-off points, and engagement scores.
   ============================================================ */
'use strict';

/**
 * Compute a persona's engagement probability at a given second.
 * Uses Big Five personality traits + attention span to model behavior.
 * @param {object} persona - Detailed persona object
 * @param {number} second - Current second in the ad
 * @param {number} duration - Total ad duration
 * @returns {number} 0-1 engagement probability
 */
function engagementAtSecond(persona, second, duration) {
  const progress = second / Math.max(duration, 1);
  const p = persona.psychology || {};
  const attention = persona.attentionSpan || 8;

  // Base engagement from personality
  const base = (
    (p.openness || 0.5) * 0.25 +
    (p.conscientiousness || 0.5) * 0.2 +
    (p.extraversion || 0.5) * 0.25 +
    (1 - (p.neuroticism || 0.5)) * 0.15 +
    (p.agreeableness || 0.5) * 0.15
  );

  // Decay curve: attention drops off after attention span
  const decayFactor = second > attention
    ? Math.max(0.1, 1 - (second - attention) / (duration * 0.5))
    : 1;

  // Hook at start, curiosity at middle, CTA boost at end
  let temporalBoost = 0;
  if (second <= 2) temporalBoost = 0.15; // Opening hook
  else if (second >= duration - 3) temporalBoost = 0.1; // CTA boost
  else if (progress >= 0.3 && progress <= 0.5) temporalBoost = 0.08; // Mid-curve curiosity

  // Scroll speed modifier (faster scrollers lose attention faster)
  const speedMod = {
    'very slow': 0.1, 'slow': 0.05, 'medium': 0,
    'fast': -0.05, 'very fast': -0.1
  }[persona.behaviors?.scrollSpeed] || 0;

  return Math.max(0, Math.min(1, base * decayFactor + temporalBoost + speedMod));
}

/**
 * Determine emotion at a given second based on engagement curve.
 * @param {object} persona
 * @param {number} second
 * @param {number} duration
 * @returns {string} Emotion label
 */
function emotionAtSecond(persona, second, duration) {
  const engagement = engagementAtSecond(persona, second, duration);
  const progress = second / Math.max(duration, 1);
  const emotionalRange = persona.emotionalRange || ['curious', 'interested'];

  if (engagement < 0.2) return emotionalRange[0] || 'bored';
  if (engagement < 0.4) return emotionalRange[1] || 'indifferent';
  if (engagement < 0.6) return emotionalRange[2] || 'interested';
  if (engagement < 0.8) return emotionalRange[Math.min(3, emotionalRange.length - 1)] || 'excited';
  return emotionalRange[emotionalRange.length - 1] || 'convinced';
}

/**
 * Simulate a full reaction journey for a single persona.
 * @param {object} persona
 * @param {number} duration - Ad duration in seconds
 * @returns {object} Reaction result
 */
function simulatePersonaReaction(persona, duration) {
  const journey = [];
  const sampleInterval = Math.max(1, Math.floor(duration / 20));

  for (let s = 0; s <= duration; s += sampleInterval) {
    const engagement = engagementAtSecond(persona, s, duration);
    journey.push({
      second: s,
      engagement: Math.round(engagement * 100) / 100,
      emotion: emotionAtSecond(persona, s, duration)
    });
  }

  // Drop-off point: when engagement first drops below threshold
  let dropOff = duration;
  for (const point of journey) {
    if (point.engagement < 0.25) {
      dropOff = point.second;
      break;
    }
  }

  // Final outcome based on reaction profile
  const rp = persona.reactionProfile || { skipRate: 0.3, likeRate: 0.3, shareRate: 0.1, purchaseRate: 0.03 };
  const rand = Math.random();
  let outcome;
  if (rand < rp.skipRate) outcome = 'skipped';
  else if (rand < rp.skipRate + rp.likeRate) outcome = 'liked';
  else if (rand < rp.skipRate + rp.likeRate + rp.shareRate) outcome = 'shared';
  else if (rand < rp.skipRate + rp.likeRate + rp.shareRate + rp.purchaseRate) outcome = 'purchased';
  else outcome = 'viewed';

  // Engagement score: average of journey engagement * outcome weight
  const avgEngagement = journey.reduce((sum, p) => sum + p.engagement, 0) / journey.length;
  const outcomeWeight = { skipped: 0.2, viewed: 0.5, liked: 0.7, shared: 0.85, purchased: 1.0 }[outcome];
  const score = Math.round(avgEngagement * outcomeWeight * 100);

  return {
    personaId: persona.id,
    personaName: persona.name,
    archetype: persona.archetypeName,
    demographics: persona.demographics,
    outcome,
    score,
    dropOffSecond: dropOff,
    avgEngagement: Math.round(avgEngagement * 100) / 100,
    journey
  };
}

/**
 * Simulate reactions for a batch of personas.
 * @param {object[]} personas
 * @param {number} duration
 * @returns {object} Aggregated results
 */
function simulateBatch(personas, duration) {
  const reactions = personas.map(p => simulatePersonaReaction(p, duration));

  // Aggregate metrics
  const total = reactions.length;
  const liked = reactions.filter(r => r.outcome === 'liked').length;
  const shared = reactions.filter(r => r.outcome === 'shared').length;
  const purchased = reactions.filter(r => r.outcome === 'purchased').length;
  const skipped = reactions.filter(r => r.outcome === 'skipped').length;

  // Segment breakdown
  const bySegment = {};
  for (const r of reactions) {
    const seg = r.archetype;
    if (!bySegment[seg]) bySegment[seg] = { total: 0, liked: 0, shared: 0, purchased: 0, skipped: 0, totalScore: 0 };
    bySegment[seg].total++;
    bySegment[seg][r.outcome]++;
    bySegment[seg].totalScore += r.score;
  }

  for (const seg of Object.keys(bySegment)) {
    bySegment[seg].avgScore = Math.round(bySegment[seg].totalScore / bySegment[seg].total);
    bySegment[seg].likeRate = Math.round(bySegment[seg].liked / bySegment[seg].total * 100);
  }

  // Find best/worst segments by like rate
  const sortedSegments = Object.entries(bySegment)
    .sort((a, b) => b[1].likeRate - a[1].likeRate);

  // Average drop-off
  const avgDropOff = reactions.reduce((sum, r) => sum + r.dropOffSecond, 0) / total;

  // Overall score: weighted combination of outcomes
  const overallScore = Math.round(
    (liked / total) * 60 +
    (shared / total) * 20 +
    (purchased / total) * 30 +
    ((total - skipped) / total) * 20
  );

  // Emotional journey (averaged across all personas)
  const journeyLength = reactions[0]?.journey.length || 0;
  const avgJourney = [];
  for (let i = 0; i < journeyLength; i++) {
    const avgEngagement = reactions.reduce((sum, r) => sum + (r.journey[i]?.engagement || 0), 0) / total;
    const emotions = reactions.map(r => r.journey[i]?.emotion).filter(Boolean);
    const dominantEmotion = emotions.sort((a, b) =>
      emotions.filter(v => v === b).length - emotions.filter(v => v === a).length
    )[0] || 'neutral';
    avgJourney.push({
      second: reactions[0]?.journey[i]?.second || 0,
      engagement: Math.round(avgEngagement * 100) / 100,
      emotion: dominantEmotion
    });
  }

  return {
    overall_score: Math.min(100, Math.max(0, overallScore)),
    sample_size: total,
    duration,
    positive_ratio: Math.round((liked / total) * 100),
    drop_off_point: Math.round(avgDropOff * 10) / 10,
    best_segment: sortedSegments.length
      ? `${sortedSegments[0][0]} (${sortedSegments[0][1].likeRate}% positive)`
      : 'n/a',
    worst_segment: sortedSegments.length > 1
      ? `${sortedSegments[sortedSegments.length - 1][0]} (${sortedSegments[sortedSegments.length - 1][1].likeRate}% positive)`
      : 'n/a',
    emotional_journey: avgJourney,
    segment_breakdown: bySegment,
    reactions: reactions.slice(0, 100) // Return sample of individual reactions
  };
}

module.exports = {
  engagementAtSecond,
  emotionAtSecond,
  simulatePersonaReaction,
  simulateBatch
};
