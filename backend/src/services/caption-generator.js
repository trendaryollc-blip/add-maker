/* ============================================================
   OMNI backend — src/services/caption-generator.js
   AI-powered caption generator using GPT-4 for platform-native
   captions with tone matching and A/B variants.
   ============================================================ */
'use strict';

const { chat: openAIChat, getClient } = require('./openai-client');
const { PLATFORMS } = require('./platform-specs');

/**
 * Generate captions using AI (GPT-4) with platform-specific tone.
 * @param {object} opts - { productName, productCategory, platform, tone, count, features }
 * @returns {Promise<object[]>}
 */
async function generateWithAI(opts) {
  const client = getClient();
  if (!client) return null;

  try {
    const spec = PLATFORMS[opts.platform] || PLATFORMS.tiktok;
    const count = Math.min(10, Math.max(1, opts.count || 5));

    const prompt = `Generate ${count} social media ad captions for this product.
Product: ${opts.productName || 'Unknown Product'}
Category: ${opts.productCategory || 'Consumer Goods'}
Platform: ${spec.label}
Tone: ${opts.tone || spec.tone}
Features: ${(opts.features || []).join(', ') || 'N/A'}
Key Benefits: ${(opts.benefits || []).join(', ') || 'Quality, Value'}

Return a JSON object with:
- captions: array of ${count} caption objects, each with:
  - text (string): the caption text, under ${spec.captionLimit} chars
  - style (string): one of "hook-first", "question", "story", "social-proof", "urgency", "benefit"
  - cta (string): call to action
  - emoji_count (number): number of emojis used
  - estimated_engagement (string): "high", "medium", or "low"

Make captions platform-native — match how real ${spec.label} users write.
Use relevant emojis. Include trending language where appropriate.
Keep under ${spec.captionLimit} characters.`;

    const response = await openAIChat({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(response.content);
    const captions = Array.isArray(parsed) ? parsed : (parsed.captions || []);

    return captions.map(c => ({
      text: c.text || '',
      style: c.style || 'benefit',
      cta: c.cta || spec.cta,
      emojiCount: c.emoji_count || 0,
      estimatedEngagement: c.estimated_engagement || 'medium',
      characterCount: (c.text || '').length,
      platform: opts.platform,
      aiGenerated: true
    }));
  } catch (err) {
    return null;
  }
}

/**
 * Generate captions using template-based approach (mock mode or AI fallback).
 * @param {object} opts
 * @returns {object[]}
 */
function generateWithTemplates(opts) {
  const spec = PLATFORMS[opts.platform] || PLATFORMS.tiktok;
  const name = opts.productName || 'this product';
  const category = opts.productCategory || 'product';
  const tone = opts.tone || spec.tone;
  const benefits = opts.benefits || ['quality', 'value', 'style'];

  const styles = [
    {
      style: 'hook-first',
      templates: [
        `Stop scrolling. ${name} is the ${category} you didn't know you needed.`,
        `POV: You finally found the perfect ${category}. It's ${name}.`,
        `${name} just dropped and it's already selling out. Get yours now.`,
        `I was today years old when I found ${name}. Game changer.`,
        `This ${category} went viral for a reason. Meet ${name}.`
      ]
    },
    {
      style: 'question',
      templates: [
        `Still using the old way? ${name} changes everything.`,
        `What if your ${category} could actually make your life easier?`,
        `Why are everyone switching to ${name}? Let me show you.`,
        `Tired of ${category}s that don't deliver? Same. Until now.`,
        `Ready to upgrade your ${category} game? ${name} is here.`
      ]
    },
    {
      style: 'social-proof',
      templates: [
        `10,000+ people already love ${name}. See why.`,
        `When your friends ask where you got it — it's ${name}.`,
        `The ${category} with 5-star reviews across the board. ${name}.`,
        `Everyone's talking about ${name}. We get the hype.`,
        `Join the ${name} movement. Your future self will thank you.`
      ]
    },
    {
      style: 'story',
      templates: [
        `I tried ${name} for 30 days. Here's what happened.`,
        `My honest review of ${name} after 2 weeks of daily use.`,
        `I didn't believe the hype. Then I tried ${name}.`,
        `${name} changed my morning routine. Here's how.`,
        `The ${category} that made me throw out everything else — ${name}.`
      ]
    },
    {
      style: 'urgency',
      templates: [
        `48 hours left. ${name} is 40% off. Don't miss this.`,
        `Last chance to grab ${name} at this price. Link in bio.`,
        `Selling fast — only ${Math.floor(Math.random() * 50 + 10)} left in stock.`,
        `This deal won't last. ${name} at its lowest price ever.`,
        `Final hours. ${name} sale ends tonight. Shop now.`
      ]
    },
    {
      style: 'benefit',
      templates: [
        `${benefits[0] || 'Quality'} meets ${benefits[1] || 'value'}. Meet ${name}.`,
        `Designed for ${benefits[0] || 'everyday'}. Built to last. That's ${name}.`,
        `${name}: Because you deserve a ${category} that actually works.`,
        `Level up your ${benefits[0] || 'routine'} with ${name}.`,
        `${benefits[0] || 'Style'} without compromise. That's the ${name} promise.`
      ]
    }
  ];

  const captions = [];
  for (const s of styles) {
    const template = s.templates[Math.floor(Math.random() * s.templates.length)];
    const cta = getSmartCTA(opts.platform, s.style);
    captions.push({
      text: template,
      style: s.style,
      cta,
      emojiCount: (template.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu) || []).length,
      estimatedEngagement: s.style === 'hook-first' ? 'high' : s.style === 'urgency' ? 'high' : 'medium',
      characterCount: template.length,
      platform: opts.platform,
      aiGenerated: false
    });
  }

  return captions;
}

/**
 * Get smart CTA based on platform and style.
 * @param {string} platform
 * @param {string} style
 * @returns {string}
 */
function getSmartCTA(platform, style) {
  const ctas = {
    tiktok: { 'hook-first': 'Shop Now', urgency: 'Link in Bio', story: 'Follow for Part 2', benefit: 'Get Yours', 'social-proof': 'Join 10K+', question: 'Comment Below' },
    instagram_reels: { 'hook-first': 'Link in Bio', urgency: 'Swipe Up', story: 'Save for Later', benefit: 'Shop Now', 'social-proof': 'See Why', question: 'Tag a Friend' },
    facebook: { 'hook-first': 'Shop Now', urgency: 'Limited Time', story: 'Read More', benefit: 'Learn More', 'social-proof': 'See Reviews', question: 'Tell Us Below' },
    youtube_shorts: { 'hook-first': 'Subscribe', urgency: 'Get It Now', story: 'Watch Part 2', benefit: 'Buy Link', 'social-proof': 'Join Us', question: 'Comment' },
    linkedin: { 'hook-first': 'Learn More', urgency: 'Act Now', story: 'Read Article', benefit: 'Discover', 'social-proof': 'See Case Study', question: 'What Do You Think?' },
    twitter: { 'hook-first': 'Thread', urgency: 'Last Chance', story: 'Full Story', benefit: 'Details', 'social-proof': 'See Thread', question: 'Reply' },
    pinterest: { 'hook-first': 'Save Pin', urgency: 'Shop Now', story: 'See Ideas', benefit: 'Get Inspo', 'social-proof': 'Popular Pin', question: 'Board This' }
  };
  return (ctas[platform] && ctas[platform][style]) || 'Learn More';
}

module.exports = { generateWithAI, generateWithTemplates, getSmartCTA };
