/* ============================================================
   OMNI backend — src/services/competitor-intel.js
   Competitor intelligence service. Uses AI to identify and
   analyze competitors based on product data. Falls back to
   keyword-based competitor generation when AI is unavailable.
   ============================================================ */
'use strict';

const openai = require('./openai-client');

/**
 * Analyze competitors using AI.
 * @param {object} productData - Scraped product data
 * @returns {Promise<object[]>} Array of competitor objects
 */
async function analyzeWithAI(productData) {
  if (!openai.isConfigured()) return null;

  const result = await openai.chat({
    system: `You are a competitive intelligence analyst. Given a product, identify 3 real competitors in the same market segment. Return strict JSON array.
Each competitor must have: name, strength, weakness, price (string like "$XX"), rating (number), adsSpotted (integer 2-15).
Return ONLY the JSON array.`,
    user: `Product: ${productData.name}\nCategory: ${productData.category || 'Unknown'}\nPrice: ${productData.price || 'Unknown'}\nBrand: ${productData.brand || 'Unknown'}`,
    json: true,
    maxTokens: 1000,
    temperature: 0.6
  });

  if (Array.isArray(result)) return result.slice(0, 3);
  if (result && Array.isArray(result.competitors)) return result.competitors.slice(0, 3);
  return null;
}

/**
 * Generate mock competitor data (used when AI is unavailable).
 * @param {object} productData
 * @returns {object[]}
 */
function generateMockCompetitors(productData) {
  const category = (productData.category || 'General').toLowerCase();
  const strengths = ['Price', 'Design', 'Quality', 'Brand Recognition', 'Innovation', 'Durability'];
  const weaknesses = ['Price', 'Support', 'Shipping', 'Features', 'Design', 'Availability'];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randPrice() { return '$' + (Math.floor(Math.random() * 300) + 29); }
  function randRating() { return (3.5 + Math.random() * 1.3).toFixed(1); }
  function randAds() { return Math.floor(Math.random() * 12) + 2; }

  // Generate realistic-sounding competitor names based on category
  const namePatterns = {
    electronics: ['Apex Tech', 'Nova Electronics', 'Vertex Digital'],
    beauty: ['Glow Labs', 'Pure Beauty Co', 'Radiance Skin'],
    fitness: ['FitPro', 'ActiveGear', 'Peak Performance'],
    home: ['HomeCraft', 'Urban Living Co', 'Modern Nest'],
    fashion: ['StyleHouse', 'Urban Thread', 'Luxe Wear'],
    food: ['FreshDirect', 'Artisan Foods', 'Pure Harvest'],
    gaming: ['GameForge', 'Pixel Gear', 'Level Up Labs'],
    wellness: ['VitaLife', 'Pure Wellness', 'Harmony Health'],
    default: ['Alpha Brands', 'Nova Commerce', 'Vertex Co.']
  };

  const names = namePatterns[category] || namePatterns.default;

  return names.map((name, i) => ({
    name,
    strength: strengths[(i + Math.floor(Math.random() * strengths.length)) % strengths.length],
    weakness: weaknesses[(i + Math.floor(Math.random() * weaknesses.length)) % weaknesses.length],
    price: randPrice(),
    rating: parseFloat(randRating()),
    adsSpotted: randAds()
  }));
}

module.exports = { analyzeWithAI, generateMockCompetitors };
