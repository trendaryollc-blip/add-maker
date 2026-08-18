/* ============================================================
   OMNI backend — src/services/ai-analysis.js
   AI-powered product analysis using OpenAI GPT-4.
   Produces emotional profiles, target audiences, competitor
   analysis, and marketing hooks from scraped product data.
   Falls back to keyword analysis when AI is unavailable.
   ============================================================ */
'use strict';

const openai = require('./openai-client');
const { mockMode } = require('./mock-mode');

const SYSTEM_PROMPT = `You are OMNI's Neural Product Scan engine — an expert AI marketing analyst.

Given product data (name, description, price, category, reviews), you must produce a comprehensive marketing analysis in strict JSON format.

Return ONLY valid JSON with this exact structure:
{
  "emotional_profile": ["emotion1", "emotion2", "emotion3", "emotion4", "emotion5"],
  "target_audience": {
    "age": "min-max",
    "income": "$minK-$maxK",
    "interests": ["interest1", "interest2", "interest3", "interest4"],
    "pain_points": ["pain1", "pain2", "pain3"],
    "psychographics": "brief psychographic description"
  },
  "competitors": [
    {
      "name": "Competitor Name",
      "strength": "their key strength",
      "weakness": "their key weakness",
      "price": "$XX",
      "rating": 4.2,
      "adsSpotted": 5
    }
  ],
  "recommended_hooks": [
    "Hook 1 — short, punchy, emotional",
    "Hook 2 — different angle",
    "Hook 3 — pain-point focused",
    "Hook 4 — social proof angle",
    "Hook 5 — curiosity gap"
  ],
  "emotional_triggers": {
    "primary": "main emotional driver",
    "secondary": "secondary driver",
    "tertiary": "third driver"
  },
  "price_positioning": "premium|mid-range|budget",
  "marketing_angle": "recommended overall marketing angle in 1-2 sentences"
}

Rules:
- emotional_profile: exactly 5 emotions from this set: Curiosity, Freedom, Premium, Immersive, Productivity, Style, Confidence, Belonging, Safety, Status, Joy, Gratitude, Loyalty, Trust, Excitement
- competitors: exactly 3 real or realistic competitors in the same category
- recommended_hooks: exactly 5 hooks, each under 60 characters, using power words
- All analysis should be specific to the product, not generic
- If reviews are provided, use sentiment from reviews to inform emotional triggers`;

/**
 * Analyze a product using AI.
 * @param {object} productData - Scraped product data
 * @param {string[]} reviews - Product reviews
 * @returns {Promise<object>} Full analysis result
 */
async function analyzeWithAI(productData, reviews) {
  if (!openai.isConfigured()) return null;

  const reviewSnippet = reviews.length > 0
    ? '\n\nTop reviews:\n' + reviews.slice(0, 10).map((r, i) => `${i + 1}. "${r.substring(0, 200)}"`).join('\n')
    : '';

  const userMessage = `Analyze this product for advertising:

Name: ${productData.name}
Category: ${productData.category || 'Unknown'}
Brand: ${productData.brand || 'Unknown'}
Price: ${productData.price || 'Unknown'}
Rating: ${productData.rating || 'N/A'} (${productData.reviewCount || 0} reviews)
Description: ${(productData.description || '').substring(0, 500)}
${reviewSnippet}

Provide the analysis as strict JSON.`;

  const result = await openai.chat({
    system: SYSTEM_PROMPT,
    user: userMessage,
    json: true,
    maxTokens: 2000,
    temperature: 0.7
  });

  return result;
}

/**
 * Generate marketing hooks using AI.
 * @param {object} productData
 * @param {object} emotionalProfile
 * @returns {Promise<string[]>} Array of hooks
 */
async function generateHooks(productData, emotionalProfile) {
  if (!openai.isConfigured()) return null;

  const result = await openai.chat({
    system: 'You are an expert ad copywriter. Generate 5 short, punchy ad hooks (under 15 words each) for the given product. Return ONLY a JSON array of strings.',
    user: `Product: ${productData.name}\nCategory: ${productData.category || 'General'}\nEmotional drivers: ${(emotionalProfile || []).join(', ')}\n\nReturn ["hook1", "hook2", "hook3", "hook4", "hook5"]`,
    json: true,
    maxTokens: 500,
    temperature: 0.8
  });

  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.hooks)) return result.hooks;
  return null;
}

module.exports = { analyzeWithAI, generateHooks };
