/* ============================================================
   OMNI — tests/core.test.js
   Behavioral tests for the core modules.
   Uses Node's built-in test runner (node --test), so there are
   zero runtime dependencies.
   Run: npm test
   ============================================================ */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// --- Load the browser-style modules under a minimal window stub ----
global.window = global;

const JS_ROOT = path.join(__dirname, '..', 'frontend', 'src', 'js');
const load = (rel) => {
  const code = fs.readFileSync(path.join(JS_ROOT, rel), 'utf8');
  // Module files are IIFEs bound to `window`; eval in this context.
  (0, eval)(code);
};

load('config.js');
load('store.js');
load('utils/helpers.js');
load('modules/neural-scan.js');
load('modules/ghost-users.js');
load('modules/platform-alchemy.js');
load('modules/phantom-checkout.js');
load('modules/live-autopilot.js');

// -------------------------------------------------------------------
test('config.js exposes a consistent configuration object', () => {
  assert.ok(window.OMNI_CONFIG, 'OMNI_CONFIG should exist');
  const c = window.OMNI_CONFIG;
  assert.equal(c.APP.defaultCurrency, 'USD');
  assert.equal(c.APP.defaultPlatform, 'tiktok');
  // API keys are no longer in frontend config — they live server-side
  assert.equal(c.isConfigured('OPENAI'), false, 'no keys in frontend config');
  assert.ok(typeof c.FEATURES.NEURAL_SCAN === 'boolean');
  assert.ok(c.ENV.baseURL !== undefined, 'API base URL is configurable');
});

test('utils/helpers.js provides the expected utilities', () => {
  const U = window.OMNI_UTILS;
  assert.equal(typeof U.rand, 'function');
  assert.equal(typeof U.uid, 'function');
  assert.equal(typeof U.round, 'function');
  assert.ok(U.uid('x').startsWith('x_'));
  assert.equal(U.round(3.14159, 2), 3.14);
});

test('neural-scan: scanProduct returns a full analysis', async () => {
  const r = await window.NeuralScan.scanProduct('https://demo.test/p/headphones');
  assert.ok(r.product.name, 'product name present');
  assert.ok(Array.isArray(r.recommended_hooks) && r.recommended_hooks.length >= 3);
  assert.ok(r.emotional_profile.length >= 3);
  assert.ok(Array.isArray(r.competitors) && r.competitors.length >= 1);
});

test('neural-scan: extractEmotionalTriggers returns a scored profile', () => {
  const out = window.NeuralScan.extractEmotionalTriggers(
    ['I love it, feels premium', 'amazing and stylish', 'helps me focus']
  );
  assert.ok(Array.isArray(out.profile) && out.profile.length > 0);
  assert.ok(typeof out.scores === 'object');
});

test('ghost-users: generatePersonas honours the requested count', () => {
  assert.equal(window.GhostUsers.generatePersonas(25).length, 25);
});

test('ghost-users: simulateReactions produces bounded metrics', async () => {
  const sim = await window.GhostUsers.simulateReactions({ ghostCount: 100, duration: 15 });
  assert.equal(sim.overall_score <= 100, true, 'score clamped to 100');
  assert.ok(sim.predicted_metrics.ctr >= 0);
  assert.ok(sim.predicted_metrics.cpc >= 0);
  assert.ok(sim.best_segment);
});

test('platform-alchemy: adaptForPlatform respects target specs', () => {
  const tiktok = window.PlatformAlchemy.adaptForPlatform({}, 'tiktok');
  assert.equal(tiktok.ratio, '9:16');
  assert.equal(tiktok.dimensions, '1080x1920');
  const ad = window.PlatformAlchemy.adaptForPlatform({ filename: 'm' }, 'youtube');
  assert.equal(ad.ratio, '16:9');
  assert.equal(ad.dimensions, '1920x1080');
});

test('platform-alchemy: generateCaptions / generateHashtags / optimizePostingTime', () => {
  const caps = window.PlatformAlchemy.generateCaptions({ productName: 'Aurora' }, 'tiktok');
  assert.ok(caps.primary.length > 0);
  assert.equal(caps.platform, 'tiktok');

  const tags = window.PlatformAlchemy.generateHashtags({ name: 'Aurora' }, 'instagram');
  assert.ok(tags.length >= 5, 'hashtag pool is generous');
  assert.ok(tags.every((t) => t.startsWith('#')));

  const t = window.PlatformAlchemy.optimizePostingTime('instagram');
  assert.ok(t.times.start && t.times.end);
});

test('phantom-checkout: Luhn validation accepts real cards & rejects bad ones', () => {
  const good = window.PhantomCheckout.validateCard('4242 4242 4242 4242');
  assert.equal(good.valid, true);
  assert.equal(good.brand, 'visa');

  const bad = window.PhantomCheckout.validateCard('123456789012');
  assert.equal(bad.valid, false);
});

test('phantom-checkout: processPayment resolves an order & blocks invalid cards', async () => {
  const order = await window.PhantomCheckout.processPayment({
    cardNumber: '4242 4242 4242 4242',
    expMonth: 12, expYear: 2030,
    amount: 149, currency: 'USD', email: 'a@b.co'
  });
  assert.ok(order.orderId.startsWith('OMNI'));
  assert.equal(order.status, 'succeeded');

  await assert.rejects(
    window.PhantomCheckout.processPayment({ cardNumber: '0000000000', amount: 10 })
  );
});

test('phantom-checkout: order id generation is unique & prefixed', () => {
  const a = window.PhantomCheckout.generateOrderId();
  const b = window.PhantomCheckout.generateOrderId();
  assert.ok(a.startsWith('OMNI-'));
  assert.notEqual(a, b);
});

test('live-autopilot: reallocate & report produce well-formed data', () => {
  const moves = window.LiveAutopilot.reallocateBudget();
  assert.ok(Array.isArray(moves.moves) && moves.moves.length >= 1);
  assert.ok(moves.totalReclaimed > 0);

  const report = window.LiveAutopilot.generateReport();
  assert.ok(report.summary.totalSpend >= 0);
  assert.ok(Array.isArray(report.recommendations));
  assert.ok(typeof report.summary.roas === 'number');
});