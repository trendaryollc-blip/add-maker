/* ============================================================
   OMNI backend — src/services/product-analysis.js
   Neural Product Scan — the core pipeline.
   When MOCK_DATA=true or no AI keys configured: uses keyword
   analysis + mock data. When real AI keys are present: scrapes
   the product page, sends data to GPT-4 for analysis, and
   returns comprehensive marketing insights.
   ============================================================ */
'use strict';

const { mockMode } = require('./mock-mode');
const scraper = require('./scraper');
const aiAnalysis = require('./ai-analysis');
const competitorIntel = require('./competitor-intel');

// --- Shared utilities ---
const CATEGORIES = ['Electronics', 'Beauty', 'Fitness', 'Home', 'Fashion',
  'Food', 'Pet', 'Travel', 'Gaming', 'Wellness'];
const EMOTIONS = ['Curiosity', 'Freedom', 'Premium', 'Immersive', 'Productivity',
  'Style', 'Confidence', 'Belonging', 'Safety', 'Status', 'Joy', 'Gratitude'];
const PAINS = ['battery life', 'clutter', 'daily hassle', 'long wait',
  'customization', 'comfort', 'durability', 'price', 'quality'];

function r(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
function hostOf(url) { try { return new URL(url).hostname; } catch { return ''; } }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function sample(arr, n) {
  const copy = arr.slice(); const out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(r(0, copy.length - 1), 1)[0]);
  return out;
}

// --- Keyword-based emotional analysis (mock mode) ---
function extractEmotionalTriggers(reviews) {
  const POSITIVE = {
    love: 'Joy', amazing: 'Joy', obsessed: 'Belonging', wow: 'Curiosity',
    free: 'Freedom', premium: 'Premium', luxury: 'Status', think: 'Productivity',
    focus: 'Productivity', beautiful: 'Style', stylish: 'Style',
    confident: 'Confidence', grateful: 'Gratitude', safe: 'Safety',
    immersive: 'Immersive', 'purchased again': 'Loyalty',
    comfortable: 'Comfort', durable: 'Trust', recommend: 'Trust',
    perfect: 'Joy', excellent: 'Joy', great: 'Joy', best: 'Joy'
  };
  const text = Array.isArray(reviews) && reviews.length
    ? reviews.join(' ').toLowerCase()
    : 'love this, it feels premium amazing quality so stylish helps me focus';

  const scores = {};
  Object.keys(POSITIVE).forEach((word) => {
    const count = (text.match(new RegExp(word.replace(/ /g, '\\s+'), 'g')) || []).length;
    if (count > 0) scores[POSITIVE[word]] = (scores[POSITIVE[word]] || 0) + count;
  });

  const ordered = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  const profile = ordered.length ? ordered.slice(0, 5) : EMOTIONS.slice(0, 5);
  return { profile, scores, summary: `Top emotional drivers: ${profile.join(', ')}.` };
}

// --- Mock product generator ---
function mockProduct(url) {
  const host = hostOf(url);
  return {
    name: 'Premium Smart Product',
    url,
    host,
    price: '$' + r(49, 249),
    description: 'A high-quality product designed for modern lifestyles.',
    images: [],
    rating: round(4.0 + Math.random() * 0.9, 1),
    reviewCount: r(200, 2000),
    category: pick(CATEGORIES),
    brand: '',
    analyzedAt: new Date().toISOString()
  };
}

// --- Mock competitor generator ---
function mockCompetitors(product) {
  const names = ['Apex Brands', 'Nova Commerce', 'Vertex Co.'];
  const strengths = ['Price', 'Design', 'Quality', 'Innovation', 'Brand'];
  const weaknesses = ['Support', 'Shipping', 'Price', 'Features', 'Availability'];
  return names.map((n, i) => ({
    name: n,
    strength: strengths[(i + r(0, 2)) % strengths.length],
    weakness: weaknesses[(i + r(0, 2)) % weaknesses.length],
    price: '$' + r(29, 399),
    rating: round(3.5 + Math.random() * 1.2, 1),
    adsSpotted: r(2, 12)
  }));
}

// --- Mock target audience ---
function mockAudience() {
  return {
    age: '18-35',
    income: '$50K-$100K',
    interests: sample(['Music', 'Tech', 'Gaming', 'Travel', 'Fitness', 'Design', 'Fashion', 'Food'], 4),
    pain_points: sample(PAINS, 3),
    psychographics: 'Values quality and convenience. Early adopter of new products.'
  };
}

// --- Mock hook generator ---
function mockHooks(product, emotionalProfile) {
  const name = product.name || 'this product';
  const category = (product.category || 'product').toLowerCase();
  const pain = pick(PAINS);
  const emotion = (emotionalProfile && emotionalProfile[0]) || 'Joy';

  return [
    `Never worry about ${pain} again`,
    `The ${name} that reads your mind`,
    `Why everyone is switching to ${name}`,
    `This is NOT your average ${category}`,
    `Feel the ${emotion.toLowerCase()} from the first use`
  ];
}

/**
 * FULL SCAN PIPELINE
 * 1. Scrape the product page (or use provided data)
 * 2. Analyze with AI (or use keyword fallback)
 * 3. Generate competitor intel (or use mock)
 * 4. Generate hooks (or use templates)
 * 5. Return comprehensive analysis
 *
 * @param {string} url - Product URL to scan
 * @param {object} opts - { productName, productData } optional overrides
 * @returns {Promise<object>} Full scan result
 */
async function scanProduct(url, opts = {}) {
  const useAI = !mockMode();

  // Step 1: Get product data
  let productData, reviews;

  if (opts.productData) {
    // Use provided data (from frontend or API)
    productData = opts.productData;
    reviews = opts.reviews || [];
  } else if (useAI) {
    // Scrape the real product page
    const scraped = await scraper.scrapeProduct(url);
    productData = scraped.product;
    reviews = scraped.reviews;
  } else {
    // Mock mode: generate fake product data
    productData = mockProduct(url);
    reviews = [];
  }

  // Step 2: AI Analysis or keyword fallback
  let aiResult = null;
  if (useAI) {
    try {
      aiResult = await aiAnalysis.analyzeWithAI(productData, reviews);
    } catch (_e) { /* fall through to mock */ }
  }

  // Step 3: Emotional profile
  let emotionalProfile;
  if (aiResult && aiResult.emotional_profile) {
    emotionalProfile = aiResult.emotional_profile;
  } else {
    emotionalProfile = extractEmotionalTriggers(reviews).profile;
  }

  // Step 4: Target audience
  const targetAudience = (aiResult && aiResult.target_audience) || mockAudience();

  // Step 5: Competitors
  let competitors;
  if (aiResult && aiResult.competitors && aiResult.competitors.length) {
    competitors = aiResult.competitors;
  } else if (useAI) {
    try {
      const aiCompetitors = await competitorIntel.analyzeWithAI(productData);
      competitors = aiCompetitors || mockCompetitors(productData);
    } catch (_e) {
      competitors = mockCompetitors(productData);
    }
  } else {
    competitors = mockCompetitors(productData);
  }

  // Step 6: Hooks
  let hooks;
  if (aiResult && aiResult.recommended_hooks) {
    hooks = aiResult.recommended_hooks;
  } else if (useAI) {
    try {
      const aiHooks = await aiAnalysis.generateHooks(productData, emotionalProfile);
      hooks = aiHooks || mockHooks(productData, emotionalProfile);
    } catch (_e) {
      hooks = mockHooks(productData, emotionalProfile);
    }
  } else {
    hooks = mockHooks(productData, emotionalProfile);
  }

  // Step 7: Build final result
  return {
    product: {
      name: productData.name || 'Unknown Product',
      url: productData.url || url,
      host: productData.host || hostOf(url),
      category: productData.category || '',
      priceRange: productData.price || '',
      rating: productData.rating || 0,
      reviews: productData.reviewCount || 0,
      brand: productData.brand || '',
      images: productData.images || [],
      description: (productData.description || '').substring(0, 500),
      analyzedAt: new Date().toISOString(),
      source: useAI ? (productData.scrapeError ? 'partial-scrape' : 'scraped') : 'mock'
    },
    emotional_profile: emotionalProfile,
    target_audience: targetAudience,
    competitors: competitors,
    recommended_hooks: hooks,
    emotional_triggers: aiResult?.emotional_triggers || {
      primary: emotionalProfile[0] || 'Curiosity',
      secondary: emotionalProfile[1] || 'Premium',
      tertiary: emotionalProfile[2] || 'Joy'
    },
    price_positioning: aiResult?.price_positioning || 'mid-range',
    marketing_angle: aiResult?.marketing_angle || `Lead with ${emotionalProfile[0]?.toLowerCase() || 'quality'} to resonate with the target audience.`,
    meta: {
      aiPowered: useAI && Boolean(aiResult),
      scraped: useAI && !productData.scrapeError,
      mockMode: !useAI
    }
  };
}

module.exports = {
  scanProduct,
  extractEmotionalTriggers,
  mockCompetitors,
  mockHooks,
  mockProduct
};
