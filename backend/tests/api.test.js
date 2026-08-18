/* ============================================================
   OMNI backend — tests/api.test.js
   Integration tests: boots the real HTTP server on an ephemeral
   port and exercises every public + authenticated endpoint.
   Run: node --test tests/api.test.js   (or: npm test in backend/)
   ============================================================ */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

let server;
let base;

async function jsonResponse(res) {
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_e) { data = { raw: text }; }
  return { status: res.status || res.statusCode, data };
}

function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(base + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {})
  }).then(jsonResponse);
}

function get(path, query, token) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(base + path + qs, { headers }).then(jsonResponse);
}

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => new Promise((resolve) => server.close(resolve)));

// ---------- health ----------
test('GET /health -> ok payload', async () => {
  const { status, data } = await get('/health');
  assert.equal(status, 200);
  assert.equal(data.status, 'ok');
  assert.equal(typeof data.version, 'string');
  assert.equal(typeof data.mockData, 'boolean');
});

test('GET /status -> service status', async () => {
  const { status, data } = await get('/status');
  assert.equal(status, 200);
  assert.equal(typeof data.mockMode, 'boolean');
  assert.ok(data.services);
  assert.equal(typeof data.services.database, 'string');
});

// ---------- auth ----------
test('POST /auth/signup creates a new user', async () => {
  const { status, data } = await post('/auth/signup', {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  });
  assert.equal(status, 201);
  assert.ok(data.token);
  assert.ok(data.refreshToken);
  assert.equal(data.user.email, 'test@example.com');
});

test('POST /auth/signup rejects duplicate email', async () => {
  const { status } = await post('/auth/signup', {
    email: 'test@example.com',
    password: 'password123'
  });
  assert.equal(status, 409);
});

test('POST /auth/login with valid credentials', async () => {
  const { status, data } = await post('/auth/login', {
    email: 'test@example.com',
    password: 'password123'
  });
  assert.equal(status, 200);
  assert.ok(data.token);
  assert.ok(data.refreshToken);
});

test('POST /auth/login rejects wrong password', async () => {
  const { status } = await post('/auth/login', {
    email: 'test@example.com',
    password: 'wrongpassword'
  });
  assert.equal(status, 401);
});

test('POST /auth/login rejects bad email format', async () => {
  const { status } = await post('/auth/login', {
    email: 'not-an-email',
    password: 'password123'
  });
  assert.equal(status, 400);
});

test('GET /auth/me returns current user', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await get('/auth/me', null, login.data.token);
  assert.equal(status, 200);
  assert.equal(data.user.email, 'test@example.com');
});

test('POST /auth/logout works', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status } = await post('/auth/logout', { refreshToken: login.data.refreshToken }, login.data.token);
  assert.equal(status, 200);
});

test('protected routes reject a missing token', async () => {
  const { status } = await get('/autopilot/campaigns');
  assert.equal(status, 401);
});

test('protected routes work with a valid token', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await get('/autopilot/campaigns', null, login.data.token);
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.campaigns));
});

// ---------- neural scan ----------
test('POST /scan returns a full analysis (mock mode)', async () => {
  const { status, data } = await post('/scan', { url: 'https://demo.test/p/headphones' });
  assert.equal(status, 200);
  assert.ok(data.product.name);
  assert.ok(Array.isArray(data.emotional_profile) && data.emotional_profile.length >= 3);
  assert.ok(Array.isArray(data.competitors) && data.competitors.length >= 1);
  assert.ok(Array.isArray(data.recommended_hooks) && data.recommended_hooks.length >= 3);
  assert.ok(data.target_audience);
  assert.ok(data.meta, 'meta field present with aiPowered/mockMode info');
  assert.equal(typeof data.meta.mockMode, 'boolean');
});

test('POST /scan by product name (no URL)', async () => {
  const { status, data } = await post('/scan', { productName: 'Wireless Headphones' });
  assert.equal(status, 200);
  assert.ok(data.product.name);
  assert.ok(data.emotional_profile.length >= 3);
});

test('POST /scan requires url or productName', async () => {
  const { status, data } = await post('/scan', {});
  assert.equal(status, 400);
  assert.equal(data.error, true);
});

test('GET /scan/history requires auth', async () => {
  const { status } = await get('/scan/history');
  assert.equal(status, 401);
});

test('GET /scan/history returns scans for authenticated user', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  // Create a scan WITH auth so it gets persisted
  await post('/scan', { url: 'https://demo.test/p/x' }, login.data.token);
  // Also create one with a name to test that path
  await post('/scan', { productName: 'Test Product' }, login.data.token);
  const { status, data } = await get('/scan/history', null, login.data.token);
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.scans));
  assert.ok(data.scans.length >= 1, 'should have at least 1 scan');
});

// ---------- ghost users ----------
test('POST /ghost/simulate -> bounded predictive metrics', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/ghost/simulate', {
    ghostCount: 100, duration: 15,
    productName: 'Test Product', productCategory: 'Electronics',
    dailyBudget: 100, industry: 'tech', platform: 'tiktok'
  }, login.data.token);
  assert.equal(status, 200);
  assert.ok(data.overall_score <= 100);
  assert.ok(data.predicted_metrics.cpc >= 0);
  assert.ok(data.positive_ratio >= 0);
  assert.equal(data.sample_size, 100);
  assert.ok(data.heatmap, 'includes heatmap');
  assert.ok(data.heatmap.grid, 'heatmap has grid');
  assert.ok(data.recommendations, 'includes recommendations');
  assert.ok(Array.isArray(data.recommendations));
  assert.ok(data.persona_summary, 'includes persona summary');
  assert.ok(data.persona_summary.total === 100);
});

test('POST /ghost/personas generates persona pool', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/ghost/personas', {
    count: 50, productName: 'Sneakers', productCategory: 'Fashion'
  }, login.data.token);
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.personas));
  assert.ok(data.personas.length <= 50);
  assert.ok(data.summary);
  assert.ok(data.summary.total === 50);
  assert.ok(data.summary.avgAttentionSpan > 0);
});

test('POST /ghost/heatmap generates attention data', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/ghost/heatmap', {
    ghostCount: 50, duration: 10, gridSize: 8
  }, login.data.token);
  assert.equal(status, 200);
  assert.equal(data.gridSize, 8);
  assert.ok(Array.isArray(data.grid));
  assert.equal(data.grid.length, 8);
  assert.ok(data.hotZones);
  assert.ok(data.timeSeries);
  assert.ok(data.summary);
});

test('POST /ghost/metrics returns predictive metrics', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/ghost/metrics', {
    ghostCount: 50, duration: 10, dailyBudget: 200, industry: 'fashion'
  }, login.data.token);
  assert.equal(status, 200);
  assert.ok(typeof data.ctr === 'number');
  assert.ok(typeof data.cpc === 'number');
  assert.ok(typeof data.roas === 'number');
  assert.ok(data.vsIndustry);
  assert.ok(data.budgetRecommendation);
});

test('GET /ghost/environments returns environment list', async () => {
  const { status, data } = await get('/ghost/environments');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.environments));
  assert.ok(data.environments.length >= 5);
  assert.ok(data.environments[0].id);
  assert.ok(data.environments[0].name);
});

// ---------- reality studio ----------
test('studio: environments lists all environments', async () => {
  const { status, data } = await get('/studio/environments');
  assert.equal(status, 200);
  assert.ok(data.environments.length >= 5);
  assert.ok(data.environments.includes('Cyber City'));
});

test('studio: set environment returns config', async () => {
  const { status, data } = await post('/studio/environment', { type: 'Tropical' });
  assert.equal(status, 200);
  assert.equal(data.type, 'Tropical');
  assert.ok(data.tone);
  assert.ok(data.mood);
});

test('studio: export ad returns full result with scene config', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/studio/export', {
    format: 'youtube',
    environment: 'Cyber City',
    hook: 'The future is here',
    cta: 'Buy Now',
    product: { name: 'Test Product', price: '$99' }
  }, login.data.token);
  assert.equal(status, 200);
  assert.match(data.spec, /16:9/);
  assert.ok(data.filename);
  assert.ok(data.sceneSummary, 'includes scene summary');
  assert.equal(data.environment, 'Cyber City');
  assert.ok(data.voiceover, 'includes voiceover info');
});

test('studio: export ad rejects missing format', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status } = await post('/studio/export', {}, login.data.token);
  assert.equal(status, 400);
});

test('studio: voiceover generates audio metadata', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/studio/voiceover', {
    text: 'This product will change your life',
    style: 'engaging'
  }, login.data.token);
  assert.equal(status, 200);
  assert.equal(typeof data.duration, 'number');
  assert.ok(data.voice);
  assert.ok(data.url);
});

test('studio: voiceover rejects missing text', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status } = await post('/studio/voiceover', {}, login.data.token);
  assert.equal(status, 400);
});

test('studio: scene builder creates valid configuration', () => {
  const { buildScene, summarizeScene } = require('../src/services/scene-builder');
  const scene = buildScene({
    product: { name: 'Test Product', price: '$99', category: 'Electronics' },
    environment: 'Deep Space',
    duration: 15,
    format: 'tiktok',
    hook: 'The future is now',
    cta: 'Shop Now'
  });
  assert.ok(scene.id);
  assert.equal(scene.environment.name, 'Deep Space');
  assert.equal(scene.format, 'tiktok');
  assert.equal(scene.duration, 15);
  assert.ok(scene.scenes.length >= 3);
  assert.ok(scene.voiceover.text);
  const summary = summarizeScene(scene);
  assert.equal(summary.environment, 'Deep Space');
  assert.equal(summary.duration, '15s');
});

test('studio: ffmpeg wrapper reports availability', async () => {
  const { isAvailable } = require('../src/services/ffmpeg-wrapper');
  const available = await isAvailable();
  assert.equal(typeof available, 'boolean');
});

test('studio: cloud storage works locally', async () => {
  const storage = require('../src/services/cloud-storage');
  const result = await storage.upload({ data: Buffer.from('test'), key: 'test-file.txt', contentType: 'text/plain' });
  assert.ok(result.url);
  assert.equal(result.storage, 'local');
  await storage.del(result.key);
});

// ---------- platform alchemy ----------
test('platform: adapt returns platform specs', async () => {
  const { status, data } = await get('/platform/adapt', { platform: 'youtube_long' });
  assert.equal(status, 200);
  assert.equal(data.ratio, '16:9');
  assert.equal(data.platform, 'youtube_long');
  assert.ok(data.label);
  assert.ok(data.tone);
  assert.ok(data.demographics);
});

test('platform: adapt/all returns all platforms', async () => {
  const { status, data } = await get('/platform/adapt/all');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.adaptations));
  assert.ok(data.adaptations.length >= 10);
  assert.equal(data.total, data.adaptations.length);
});

test('platform: list returns platform catalog', async () => {
  const { status, data } = await get('/platform/list');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.platforms));
  assert.ok(data.platforms.length >= 10);
  assert.ok(data.platforms[0].id);
  assert.ok(data.platforms[0].label);
});

test('platform: captions generates platform-native captions', async () => {
  const { status, data } = await post('/platform/captions', {
    productName: 'Aurora', productCategory: 'Tech', platform: 'instagram_reels'
  });
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.captions));
  assert.ok(data.captions.length >= 3);
  assert.ok(data.captions[0].text);
  assert.ok(data.captions[0].style);
  assert.equal(data.platform, 'instagram_reels');
});

test('platform: hashtags generates contextual tags', async () => {
  const { status, data } = await get('/platform/hashtags', { product: 'aurora', platform: 'tiktok', count: '10' });
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.hashtags));
  assert.ok(data.hashtags.length >= 5);
  assert.ok(data.hashtags[0].tag.startsWith('#'));
  assert.ok(data.recommended);
  assert.ok(data.strategy);
});

test('platform: schedule returns posting windows', async () => {
  const { status, data } = await get('/platform/schedule', { platform: 'linkedin' });
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.schedule));
  assert.ok(data.schedule.length >= 2);
  assert.ok(data.schedule[0].day);
  assert.ok(data.schedule[0].startTime);
  assert.ok(data.peakDays);
  assert.ok(data.tips);
});

test('platform: brief generates full content plan', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/platform/brief', {
    productName: 'Aurora', productCategory: 'Tech',
    benefits: ['fast', 'wireless', 'premium']
  }, login.data.token);
  assert.equal(status, 200);
  assert.equal(data.product, 'Aurora');
  assert.ok(data.totalPlatforms >= 10);
  assert.ok(data.platforms.tiktok);
  assert.ok(data.platforms.instagram_reels);
  assert.ok(data.platforms.linkedin);
});

// ---------- autopilot (auth) ----------
test('autopilot: campaigns returns live monitoring data', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await get('/autopilot/campaigns', null, login.data.token);
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.campaigns));
  assert.ok(data.totalCampaigns >= 1);
  assert.ok(typeof data.activeCampaigns === 'number');
  assert.ok(data.monitoredAt);
});

test('autopilot: create + transition + reallocate + report', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const tok = login.data.token;

  const create = await post('/autopilot/campaigns', {
    name: 'Test Campaign', platform: 'tiktok', budget: 500,
    targetAudience: '18-24', objective: 'conversions'
  }, tok);
  assert.equal(create.status, 201);
  assert.equal(create.data.name, 'Test Campaign');
  assert.equal(create.data.status, 'draft');

  const realloc = await post('/autopilot/reallocate', { dryRun: true }, tok);
  assert.equal(realloc.status, 200);
  assert.ok(Array.isArray(realloc.data.moves));
  assert.ok(typeof realloc.data.summary.campaignsScanned === 'number');

  const rep = await get('/autopilot/report', null, tok);
  assert.equal(rep.status, 200);
  assert.ok(rep.data.summary);
  assert.ok(typeof rep.data.summary.totalSpent === 'number');
  assert.ok(rep.data.platformBreakdown);
  assert.ok(rep.data.healthDistribution);
  assert.ok(Array.isArray(rep.data.recommendations));
  assert.ok(Array.isArray(rep.data.insights));
  assert.ok(Array.isArray(rep.data.topPerformers));
  assert.ok(Array.isArray(rep.data.underperformers));
});

test('autopilot: optimize returns allocation plan', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/autopilot/optimize', {
    totalBudget: 2000, strategy: 'balanced'
  }, login.data.token);
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.allocations));
  assert.ok(data.allocations.length >= 1);
  assert.ok(typeof data.totalBudget === 'number');
  assert.ok(Array.isArray(data.recommendations));
});

test('autopilot: anomalies detects issues', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await get('/autopilot/anomalies', null, login.data.token);
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.anomalies));
  assert.ok(typeof data.totalCampaigns === 'number');
  assert.ok(typeof data.healthyCampaigns === 'number');
});

test('autopilot: variant generates A/B test', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/autopilot/variant', {
    productName: 'Aurora Headphones', filename: 'master-v1.mp4'
  }, login.data.token);
  assert.equal(status, 200);
  assert.ok(data.variant);
  assert.ok(data.variant.hook);
  assert.ok(data.variant.angle);
  assert.ok(data.test);
  assert.ok(data.test.id);
});

test('autopilot: ab-tests lists active tests', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  // Create a test first
  await post('/autopilot/variant', { productName: 'Test' }, login.data.token);
  const { status, data } = await get('/autopilot/ab-tests', null, login.data.token);
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.tests));
});

test('autopilot: summary returns stats', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await get('/autopilot/summary', null, login.data.token);
  assert.equal(status, 200);
  assert.ok(typeof data.total === 'number');
  assert.ok(typeof data.active === 'number');
  assert.ok(typeof data.totalBudget === 'number');
});

// ---------- checkout (auth) ----------
test('checkout: validate card without charging', async () => {
  const { status, data } = await post('/checkout/validate', {
    cardNumber: '4242424242424242', expMonth: 12, expYear: 2030, cvv: '123'
  });
  assert.equal(status, 200);
  assert.equal(data.card.valid, true);
  assert.equal(data.card.brand, 'visa');
  assert.equal(data.card.last4, '4242');
  assert.equal(data.card.issuingBank, 'Stripe Test');
  assert.equal(data.expiry.valid, true);
  assert.equal(data.cvv.valid, true);
});

test('checkout: validate rejects invalid card', async () => {
  const { status, data } = await post('/checkout/validate', {
    cardNumber: '123456789012'
  });
  assert.equal(status, 200);
  assert.equal(data.card.valid, false);
});

test('checkout: get gateways', async () => {
  const { status, data } = await get('/checkout/gateways');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.gateways));
  assert.ok(data.gateways.length >= 3);
  assert.ok(data.gateways[0].name);
});

test('checkout: get currencies', async () => {
  const { status, data } = await get('/checkout/currencies');
  assert.equal(status, 200);
  assert.ok(data.currencies.USD);
  assert.ok(data.currencies.EUR);
});

test('checkout: valid card succeeds with full response', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await post('/checkout', {
    cardNumber: '4242424242424242',
    expMonth: 12, expYear: 2030,
    amount: 149, currency: 'USD',
    email: 'test@example.com',
    productName: 'Aurora Headphones',
    gateway: 'stripe',
    items: [{ name: 'Aurora Headphones', unitPrice: 149, quantity: 1 }]
  }, login.data.token);
  assert.equal(status, 200);
  assert.equal(data.status, 'succeeded');
  assert.ok(data.orderId.startsWith('OMNI'));
  assert.ok(data.chargeId);
  assert.equal(data.card.brand, 'visa');
  assert.equal(data.card.last4, '4242');
  assert.equal(data.gateway, 'Stripe');
  assert.ok(data.receipt);
  assert.ok(data.receipt.receiptNumber);
  assert.ok(data.confirmation.sent);
});

test('checkout: invalid card is rejected', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status } = await post('/checkout', {
    cardNumber: '123456789012',
    expMonth: 12, expYear: 2030,
    amount: 149
  }, login.data.token);
  assert.equal(status, 400);
});

test('checkout: lists orders with stats', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  const { status, data } = await get('/checkout/orders', null, login.data.token);
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.orders));
  assert.ok(data.stats);
  assert.ok(typeof data.stats.total === 'number');
  assert.ok(typeof data.stats.totalRevenue === 'number');
  assert.ok(typeof data.stats.successRate === 'number');
});

test('checkout: refund processes correctly', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  // Create an order first
  const order = await post('/checkout', {
    cardNumber: '4242424242424242', expMonth: 12, expYear: 2030,
    amount: 99, productName: 'Test Product'
  }, login.data.token);
  // Refund it
  const { status, data } = await post('/checkout/refund', {
    orderId: order.data.orderId, reason: 'requested_by_customer'
  }, login.data.token);
  assert.equal(status, 200);
  assert.equal(data.status, 'refunded');
  assert.equal(data.refundAmount, 99);
});

test('checkout: dispute simulates correctly', async () => {
  const login = await post('/auth/login', { email: 'test@example.com', password: 'password123' });
  // Create an order
  const order = await post('/checkout', {
    cardNumber: '4242424242424242', expMonth: 12, expYear: 2030,
    amount: 75, productName: 'Dispute Test'
  }, login.data.token);
  // Dispute it
  const { status, data } = await post('/checkout/dispute', {
    orderId: order.data.orderId, reason: 'fraudulent'
  }, login.data.token);
  assert.equal(status, 200);
  assert.equal(data.status, 'disputed');
  assert.ok(data.deadline);
});

// ---------- scraper (unit) ----------
test('scraper: extractProduct parses structured data', () => {
  const { extractProduct } = require('../src/services/scraper');
  const html = `
    <html><head>
      <title>Test Product</title>
      <meta property="og:title" content="Test Product Pro">
      <meta property="og:description" content="An amazing product">
      <script type="application/ld+json">{"@type":"Product","name":"Test Product Pro","description":"An amazing product","offers":{"price":"99.99","priceCurrency":"USD"}}</script>
    </head><body><h1>Test Product Pro</h1></body></html>`;
  const product = extractProduct(html, 'https://example.com/product');
  assert.equal(product.name, 'Test Product Pro');
  assert.ok(product.price.includes('99.99'));
  assert.equal(product.host, 'example.com');
});

test('scraper: extractReviews finds review text', () => {
  const { extractReviews } = require('../src/services/scraper');
  const html = `<html><body>
    <div class="review-text">This product is amazing, I love it!</div>
    <div class="review-text">Good quality but could be cheaper.</div>
  </body></html>`;
  const reviews = extractReviews(html);
  assert.ok(reviews.length >= 2);
});

// ---------- misc ----------
test('unknown route -> JSON 404', async () => {
  const res = await fetch(base + '/does-not-exist');
  assert.equal(res.status, 404);
});

test('CORS preflight returns 204', async () => {
  const res = await fetch(base + '/health', { method: 'OPTIONS' });
  assert.equal(res.status, 204);
});
