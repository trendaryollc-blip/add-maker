/* ============================================================
   OMNI — modules/neural-scan.js
   NEURAL PRODUCT SCAN (NPS)
   Understand your product better than you do.
   Unless real API keys are configured (config.js), these
   functions run a realistic mock analysis so the UI is fully
   demonstrable. All functions return Promises.
   ============================================================= */
(function (global) {
  'use strict';
  var U = global.OMNI_UTILS || {};
  var CFG = global.OMNI_CONFIG || {};

  var CATEGORY_BANK = ['Electronics', 'Beauty', 'Fitness', 'Home', 'Fashion',
    'Food', 'Pet', 'Travel', 'Gaming', 'Wellness'];

  var HOOK_ANGLES = [
    'Never worry about {pain} again',
    'The {product} that reads your mind',
    'You have been doing it wrong — until now',
    'Why everyone is switching to {product}',
    '90 seconds that change how you {action}',
    'This is NOT your average {category}',
    'Doctor-recommended {product} you can trust',
    'The {category} upgrade you didn\'t know you needed'
  ];

  var EMOTIONS = ['Curiosity', 'Freedom', 'Premium', 'Immersive', 'Productivity',
    'Style', 'Confidence', 'Gratitude', 'Belonging', 'Joy', 'Safety', 'Status'];

  function mockProduct(url) {
    var host = '';
    try { host = new URL(url).hostname; } catch (e) {}
    return {
      name: 'Premium Smart Product',
      url: url,
      host: host,
      category: U.pick ? U.pick(CATEGORY_BANK) : 'Electronics',
      priceRange: '$' + U.rand(49, 249) + ' - $' + U.rand(250, 899),
      rating: U.round ? U.round(4.2 + Math.random() * 0.7, 1) : 4.6,
      reviews: U.rand(400, 1800),
      image: '',
      analyzedAt: new Date().toISOString()
    };
  }

  /* 1. scanProduct(url) — master pipeline */
  function scanProduct(url) {
    var settings = global.OMNI_SETTINGS;
    var active = (settings && settings.getActiveKey) ? settings.getActiveKey() : null;

    if (active) {
      return scanWithAI(url, active.provider, active.key);
    }

    // Fallback to mock
    return mockScan(url);
  }

  /* 1b. scanWithAI(url, provider, key) — real AI analysis via any provider */
  function scanWithAI(url, provider, key) {
    var prompt =
      'You are an expert marketing analyst. Analyze the product at this URL: ' + url + '\n\n' +
      'Return a JSON object with exactly this structure (no markdown, just raw JSON):\n' +
      '{\n' +
      '  "product": { "name": "...", "url": "' + url + '", "category": "...", "priceRange": "...", "rating": 0.0, "reviews": 0 },\n' +
      '  "emotional_profile": ["Emotion1", "Emotion2", "Emotion3", "Emotion4", "Emotion5"],\n' +
      '  "target_audience": { "age": "...", "income": "...", "interests": ["...", "..."], "pain_points": ["...", "..."] },\n' +
      '  "competitors": [{ "name": "...", "strength": "...", "weakness": "...", "price": "$...", "adsSpotted": 0 }],\n' +
      '  "recommended_hooks": ["hook1", "hook2", "hook3", "hook4", "hook5"]\n' +
      '}\n\n' +
      'Be specific and realistic. Use real competitor names if possible. Return ONLY the JSON, no explanation.';

    var request = buildProviderRequest(provider, key, prompt);

    return fetch(request.url, request.options)
      .then(function (res) {
        if (!res.ok) throw new Error(provider + ' API error: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var content = extractContent(provider, data);
        content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        var parsed = JSON.parse(content);
        parsed.source = provider;
        return parsed;
      })
      .catch(function (err) {
        console.error('[NeuralScan] ' + provider + ' error:', err);
        if (global.App && global.App.toast) {
          global.App.toast('AI scan failed (' + provider + ') — using demo data.', 'error');
        }
        return mockScan(url);
      });
  }

  /* Build fetch request per provider */
  function buildProviderRequest(provider, key, prompt) {
    if (provider === 'openai') {
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 1500 })
        }
      };
    }
    if (provider === 'anthropic') {
      return {
        url: 'https://api.anthropic.com/v1/messages',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: 'claude-3-5-haiku-20241022', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
        }
      };
    }
    if (provider === 'gemini') {
      return {
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1500 } })
        }
      };
    }
    if (provider === 'mistral') {
      return {
        url: 'https://api.mistral.ai/v1/chat/completions',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
          body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 1500 })
        }
      };
    }
    if (provider === 'groq') {
      return {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 1500 })
        }
      };
    }
    // Unknown provider — reject
    return { url: '', options: { method: 'POST' } };
  }

  /* Extract content from provider response */
  function extractContent(provider, data) {
    if (provider === 'anthropic') return data.content[0].text;
    if (provider === 'gemini') return data.candidates[0].content.parts[0].text;
    // OpenAI, Mistral, Groq all use same structure
    return data.choices[0].message.content;
  }

  /* Mock scan fallback */
  function mockScan(url) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var product = mockProduct(url);
        var triggers = extractEmotionalTriggers([]);
        var competitors = analyzeCompetitors(product);
        resolve({
          product: product,
          emotional_profile: triggers.profile,
          target_audience: { age: '18-35', income: '$50K-$100K', interests: ['Music', 'Tech', 'Gaming', 'Travel'], pain_points: ['Battery life', 'Comfort', 'Price'] },
          competitors: competitors,
          recommended_hooks: generateRecommendations({ product: product, emotional_profile: triggers.profile }).hooks,
          source: 'mock'
        });
      }, U.rand ? U.rand(700, 1400) : 1000);
    });
  }

  /* 2. extractEmotionalTriggers(reviews) — NLP-style keyword scoring */
  function extractEmotionalTriggers(reviews) {
    var positiveLex = {
      'love': 'Joy', 'amazing': 'Joy', 'obsessed': 'Belonging', 'wow': 'Curiosity',
      'free': 'Freedom', 'premium': 'Premium', 'luxury': 'Status', 'think': 'Productivity',
      'focus': 'Productivity', 'beautiful': 'Style', 'stylish': 'Style', 'confident': 'Confidence',
      'grateful': 'Gratitude', 'safe': 'Safety', 'immersive': 'Immersive', 'purchased again': 'Loyalty'
    };
    var counts = {};
    (reviews && reviews.length ? reviews : ['love this, it feels premium',
      'amazing quality, so stylish', 'helps me focus every day', 'worth every penny',
      'beautiful design, I feel confident']).forEach(function (r) {
      var text = String(r).toLowerCase();
      Object.keys(positiveLex).forEach(function (k) {
        if (text.indexOf(k) !== -1) counts[positiveLex[k]] = (counts[positiveLex[k]] || 0) + 1;
      });
    });
    var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var profile = (sorted.length ? sorted : EMOTIONS.slice(0, 5)).slice(0, 5);
    return {
      profile: profile,
      scores: counts,
      summary: 'Top emotional drivers: ' + profile.join(', ') + '.'
    };
  }

  /* 3. analyzeCompetitors(product) */
  function analyzeCompetitors(product) {
    var names = ['Apex Brands', 'Nova Commerce', 'Vertex Co.'];
    return names.map(function (n, i) {
      var strengths = ['Bass', 'Design', 'Battery', 'Price', 'Speed', 'Quality'];
      var weaknesses = ['Battery', 'Price', 'Durability', 'Support', 'Shipping', 'Design'];
      return {
        name: n,
        strength: strengths[i % strengths.length],
        weakness: weaknesses[(i + 2) % weaknesses.length],
        price: '$' + U.rand(59, 399),
        rating: U.round(3.8 + Math.random() * 0.8, 1),
        adsSpotted: U.rand(2, 12)
      };
    });
  }

  /* 4. generateRecommendations(data) — ad hooks from the analysis */
  function generateRecommendations(data, _raw) {
    var product = (data && data.product) || { name: 'your product', category: 'product' };
    var profile = (data && data.emotional_profile) || EMOTIONS.slice(0, 3);
    var hooks = HOOK_ANGLES.map(function (tpl, idx) {
      return tpl
        .replace('{product}', product.name)
        .replace('{category}', (product.category || 'product').toLowerCase())
        .replace('{pain}', U.pick(['battery', 'clutter', 'daily hassle']) || 'hassle')
        .replace('{action}', U.pick(['work', 'create', 'perform']) || 'live');
    }).slice(0, 5);
    return {
      hooks: hooks,
      angles: profile.map(function (e) { return 'Lead with ' + e.toLowerCase() + '.'; }),
      bestHook: hooks[0],
      headline: 'Recommended angle: ' + profile[0]
    };
  }

  global.NeuralScan = {
    scanProduct: scanProduct,
    extractEmotionalTriggers: extractEmotionalTriggers,
    analyzeCompetitors: analyzeCompetitors,
    generateRecommendations: generateRecommendations
  };
  if (global.OMNI) global.OMNI.modules = Object.assign(global.OMNI.modules || {}, { neuralScan: global.NeuralScan });
})(window);