/* ============================================================
   OMNI — modules/ghost-users.js
   HIVE-MIND GHOST USERS (HGU)
   Test your ad on 500 digital humans before spending a dollar.
   ============================================================= */
(function (global) {
  'use strict';
  var U = global.OMNI_UTILS || {};

  var FIRST = ['Alex', 'Jamie', 'Priya', 'Marcus', 'Sofia', 'Kenji', 'Luna', 'Diego',
    'Amara', 'Yusuf', 'Elena', 'Noah', 'Hana', 'Omar', 'Freya', 'Viktor'];
  var SEGMENTS = ['18-25 Urban Professional', '25-34 Suburban Parent', '35-44 Executive',
    '18-24 Student', '45+ Rural', '25-34 Creator', '35-44 Health Enthusiast'];

  /* 1. generatePersonas(count) */
  function generatePersonas(count) {
    count = count || 500;
    var personas = [];
    for (var i = 0; i < count; i++) {
      var seg = SEGMENTS[i % SEGMENTS.length];
      personas.push({
        id: 'ghost_' + (i + 1),
        name: U.pick(FIRST) + ' ' + U.pick(FIRST),
        segment: seg,
        age: U.rand(18, 55),
        interests: U.pick(['Tech', 'Fashion', 'Fitness', 'Music', 'Travel', 'Gaming']),
        sensitivity: U.round(0.5 + Math.random() * 0.5, 2),
        retention: U.round(0.55 + Math.random() * 0.4, 2)
      });
    }
    return personas;
  }

  /* 2. simulateReactions(adData) — run the simulation over seconds */
  function simulateReactions(adData) {
    return new Promise(function (resolve) {
      var ad = adData || {};
      var duration = ad.duration || 15;
      var personas = generatePersonas(ad.ghostCount || 500);
      setTimeout(function () {
        var journey = [];
        for (var s = 0; s <= duration; s += 2) {
          var emotion = castEmotion(s, duration);
          var intensity = U.round(0.55 + 0.4 * Math.sin((s / duration) * Math.PI)
            * (0.8 + Math.random() * 0.4), 2);
          journey.push({ second: s, emotion: emotion, intensity: Math.min(1, intensity) });
        }
        var reactions = personas.map(function (p) {
          return {
            id: p.id, segment: p.segment,
            reaction: Math.random() > 0.3 ? 'liked' : 'skipped',
            score: U.round(40 + Math.random() * 59, 0),
            emotion: castEmotion(U.rand(0, duration), duration)
          };
        });
        var metrics = calculatePerformanceMetrics({ reactions: reactions, duration: duration });
        resolve({
          overall_score: Math.min(100, Math.round(metrics.conversionRate * 20 + 55)),
          personas: personas,
          reactions: reactions,
          emotional_journey: journey,
          drop_off_point: U.round(duration * 0.55 + Math.random() * 3, 1),
          positive_ratio: positiveRatio(reactions),
          best_segment: bestSegment(reactions),
          worst_segment: worstSegment(reactions),
          predicted_metrics: metrics
        });
      }, U.rand ? U.rand(1200, 2000) : 1500);
    });
  }

  function castEmotion(s, dur) {
    if (s === 0) return 'curious';
    if (s < dur * 0.25) return 'excited';
    if (s < dur * 0.6) return 'interested';
    return 'convinced';
  }

  function positiveRatio(reactions) {
    var pos = reactions.filter(function (r) { return r.reaction === 'liked'; }).length;
    return Math.round(pos / reactions.length * 100);
  }

  function bestSegment(reactions) {
    var map = {}; reactions.forEach(function (r) { map[r.segment] = map[r.segment] || { t: 0, p: 0 }; map[r.segment].t++; if (r.reaction === 'liked') map[r.segment].p++; });
    var keys = Object.keys(map);
    keys.sort(function (a, b) { return (map[b].p / map[b].t) - (map[a].p / map[a].t); });
    return keys[0] + ' (' + Math.round(map[keys[0]].p / map[keys[0]].t * 100) + '% positive)';
  }
  function worstSegment(reactions) {
    var map = {}; reactions.forEach(function (r) { map[r.segment] = map[r.segment] || { t: 0, p: 0 }; map[r.segment].t++; if (r.reaction === 'liked') map[r.segment].p++; });
    var keys = Object.keys(map);
    keys.sort(function (a, b) { return (map[a].p / map[a].t) - (map[b].p / map[b].t); });
    return keys[0] + ' (' + Math.round(map[keys[0]].p / map[keys[0]].t * 100) + '% positive)';
  }

  /* 3. analyzeEmotionalJourney() */
  function analyzeEmotionalJourney() {
    return {
      moments: [
        { second: 0, emotion: 'curious', note: 'Hook landing — hold attention' },
        { second: 3, emotion: 'excited', note: 'Peak energy in first 3s' },
        { second: 7, emotion: 'interested', note: 'Benefit messaging window' },
        { second: 12, emotion: 'convinced', note: 'CTA push point' }
      ],
      peak_retention_second: 4,
      risk_zones: [8.5, 11],
      recommendation: 'Add a social-proof card at the 5s mark to flatten mid-funnel drop-off.',
      arc: 'Rising interest with a retention dip at ~8.5s — tighten editing between 6-10s.'
    };
  }

  /* 4. calculatePerformanceMetrics() */
  function calculatePerformanceMetrics(data) {
    var d = data || {};
    var n = (d.reactions || []).length || 500;
    var ctr = U.round((0.4 + Math.random() * 3.2) * 100) / 100;   // %
    var cpc = U.round(0.2 + Math.random() * 0.7, 2);              // $
    var cvr = U.round(1.2 + Math.random() * 4.2, 2);              // %
    return {
      impressions: n * (d.loops || 6),
      clicks: Math.round((ctr / 100) * n),
      ctr: ctr,
      cpc: cpc,
      conversionRate: cvr,
      roas: U.round(1.5 + Math.random() * 3.5, 2),
      note: 'CTR and CPC are predictive estimates from the simulated ghost pool.'
    };
  }

  global.GhostUsers = {
    generatePersonas: generatePersonas,
    simulateReactions: simulateReactions,
    analyzeEmotionalJourney: analyzeEmotionalJourney,
    calculatePerformanceMetrics: calculatePerformanceMetrics
  };
  if (global.OMNI) global.OMNI.modules = Object.assign(global.OMNI.modules || {}, { ghostUsers: global.GhostUsers });
})(window);