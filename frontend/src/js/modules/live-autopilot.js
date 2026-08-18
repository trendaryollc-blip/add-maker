/* ============================================================
   OMNI — modules/live-autopilot.js
   LIVE AUTOPILOT ENGINE (LAE)
   A self-healing campaign manager that works while you sleep.
   ============================================================= */
(function (global) {
  'use strict';
  var U = global.OMNI_UTILS || {};
  var CFG = global.OMNI_CONFIG || {};
  var pollInterval = (CFG.APP && CFG.APP.pollIntervalMs) || 5000;
  var timer = null;

  var VARIANTS_POOL = [
    { hook: 'What if it cost 50% less?', angle: 'price' },
    { hook: 'The last {product} you will ever buy', angle: 'durability' },
    { hook: 'Watch this before you buy anything', angle: 'education' },
    { hook: '5 signs you need {product} now', angle: 'listicle' },
    { hook: 'I was wrong about {product}', angle: 'story' }
  ];

  function seedCampaigns() {
    return [
      { id: 'c_01', name: 'Launch — TikTok', platform: 'tiktok', budget: 400, spent: 210, spendRate: 48, roas: 3.4, ctr: 2.1, status: 'healthy' },
      { id: 'c_02', name: 'Retarget — IG', platform: 'instagram', budget: 300, spent: 250, spendRate: 91, roas: 1.2, ctr: 0.5, status: 'stalled' },
      { id: 'c_03', name: 'Scale — Facebook', platform: 'facebook', budget: 500, spent: 130, spendRate: 24, roas: 2.8, ctr: 1.8, status: 'healthy' },
      { id: 'c_04', name: 'Prospecting — YouTube', platform: 'youtube', budget: 250, spent: 40, spendRate: 8, roas: 0.7, ctr: 0.3, status: 'ramping' }
    ];
  }

  /* 1. monitorCampaigns() — real-time status stream */
  function monitorCampaigns() {
    return {
      start: function (cb) {
        stop();
        tmpl.poll(cb);
        timer = setInterval(function () { tmpl.poll(cb); }, pollInterval);
        return tmpl;
      },
      stop: stop,
      status: function () { return timer ? 'running' : 'stopped'; }
    };
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  var tmpl = {
    poll: function (cb) {
      var c = seedCampaigns();
      cb && cb(c.map(function (x) {
        x.spent += U.rand(0, 12);
        x.roas = U.round(Math.max(0.2, x.roas + (Math.random() - 0.5) * 0.3), 2);
        x.ctr = U.round(Math.max(0.1, x.ctr + (Math.random() - 0.5) * 0.4), 2);
        x.status = x.roas < 1.5 || x.ctr < 0.6 ? 'stalled' : 'healthy';
        return x;
      }), Date.now());
    }
  };

  /* 2. detectAnomalies(data) */
  function detectAnomalies(data) {
    var campaigns = data && data.length ? data : seedCampaigns();
    var anomalies = campaigns
      .filter(function (c) { return c.status === 'stalled' || c.roas < 1.5; })
      .map(function (c) {
        return {
          id: c.id,
          campaign: c.name,
          severity: c.roas < 1 ? 'high' : 'medium',
          message: c.name + ' is underperforming (ROAS ' + c.roas + '). Reallocate or refresh creative.',
          action: c.roas < 1 ? 'reallocate' : 'refresh'
        };
      });
    return { anomalies: anomalies, healthyCount: campaigns.length - anomalies.length };
  }

  /* 3. reallocateBudget(campaigns) */
  function reallocateBudget(campaigns) {
    var list = campaigns && campaigns.length ? campaigns : seedCampaigns();
    var healthy = list.filter(function (c) { return c.status === 'healthy'; });
    var stalled = list.filter(function (c) { return c.status !== 'healthy'; });
    var reclaimed = 0;
    var moves = stalled.map(function (s) {
      var cut = Math.round(s.budget * 0.4);
      reclaimed += cut;
      return { from: s.name, amount: cut };
    });
    var target = healthy[0] || list[0];
    var movesApplied = moves.map(function (m) {
      return {
        from: m.from,
        to: target ? target.name : 'reserve',
        amount: m.amount,
        reason: 'Shift spend to higher-ROAS creative'
      };
    });
    return {
      moves: movesApplied,
      totalReclaimed: reclaimed,
      newBudgetForTop: target ? target.budget + reclaimed : reclaimed,
      appliedAt: new Date().toISOString()
    };
  }

  /* 4. generateNewVariant(ad) */
  function generateNewVariant(ad) {
    var ad2 = ad || {};
    var tpl = U.pick(VARIANTS_POOL);
    return {
      id: U.uid('variant'),
      baseAd: ad2.filename || 'master-v1',
      hook: tpl.hook.replace('{product}', ad2.productName || 'your product'),
      angle: tpl.angle,
      guessScore: U.rand(58, 96),
      status: 'draft',
      createdAt: new Date().toISOString()
    };
  }

  /* 5. generateReport() */
  function generateReport() {
    var campaigns = seedCampaigns();
    var spend = campaigns.reduce(function (a, c) { return a + c.spent; }, 0);
    var revenue = campaigns.reduce(function (a, c) { return a + (c.spent * c.roas); }, 0);
    return {
      generatedAt: new Date().toISOString(),
      period: 'Last 7 days',
      summary: {
        totalSpend: U.round(spend, 2),
        totalRevenue: U.round(revenue, 2),
        roas: U.round(revenue / (spend || 1), 2),
        activeAds: campaigns.length,
        clicks: U.round(spend / 1.2, 0)
      },
      anomalies: detectAnomalies(campaigns),
      recommendations: [
        'Refresh the hook on stalled creatives.',
        'Raise budget on the top ROAS campaign.',
        'Test 2 new variants against the current leader.'
      ],
      exportCSV: true
    };
  }

  global.LiveAutopilot = {
    monitorCampaigns: monitorCampaigns,
    detectAnomalies: detectAnomalies,
    reallocateBudget: reallocateBudget,
    generateNewVariant: generateNewVariant,
    generateReport: generateReport
  };
  if (global.OMNI) global.OMNI.modules = Object.assign(global.OMNI.modules || {}, { liveAutopilot: global.LiveAutopilot });
})(window);