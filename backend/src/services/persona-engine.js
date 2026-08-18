/* ============================================================
   OMNI backend — src/services/persona-engine.js
   AI Persona Engine — generates detailed, realistic ghost user
   personas using GPT-4 or seeded template-based generation.
   ============================================================ */
'use strict';

const { getOpenAIClient } = require('./openai-client');
const { mockMode } = require('./mock-mode');
const { selectArchetypes } = require('./persona-templates');

/**
 * Generate a single detailed persona from an archetype template.
 * Adds randomized variation within the archetype's bounds.
 * @param {object} archetype - Base archetype template
 * @returns {object} Detailed persona
 */
function seedPersona(archetype) {
  const age = Math.floor(
    Math.random() * (archetype.demographics.ageRange[1] - archetype.demographics.ageRange[0] + 1)
  ) + archetype.demographics.ageRange[0];

  const names = [
    'Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Blake',
    'Charlie', 'Dakota', 'Emery', 'Finley', 'Harper', 'Kendall', 'Logan',
    'Parker', 'Reese', 'Sage', 'Taylor', 'Drew', 'Skyler', 'Cameron',
    'Jamie', 'Robin', 'Peyton', 'Rowan', 'Hayden', 'Peyton', 'Jesse'
  ];

  const name = names[Math.floor(Math.random() * names.length)];

  // Add behavioral variation within archetype bounds
  const jitter = (val, range) => {
    const delta = range * (Math.random() * 0.3 - 0.15);
    return Math.max(0, Math.min(1, val + delta));
  };

  const scrollSpeeds = ['very slow', 'slow', 'medium', 'fast', 'very fast'];
  const baseSpeedIdx = ['very slow', 'slow', 'medium', 'fast', 'very fast']
    .indexOf(archetype.behaviors.scrollSpeed);
  const speedJitter = Math.floor(Math.random() * 3) - 1;
  const scrollSpeed = scrollSpeeds[Math.max(0, Math.min(4, baseSpeedIdx + speedJitter))];

  return {
    id: `ghost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    archetype: archetype.id,
    archetypeName: archetype.name,
    demographics: {
      age,
      gender: archetype.demographics.gender === 'any'
        ? (Math.random() > 0.5 ? 'male' : 'female')
        : archetype.demographics.gender,
      location: archetype.demographics.location,
      income: archetype.demographics.income
    },
    interests: archetype.interests.filter(() => Math.random() > 0.2),
    behaviors: {
      scrollSpeed,
      adTolerance: archetype.behaviors.adTolerance,
      purchaseFrequency: archetype.behaviors.purchaseFrequency,
      device: archetype.behaviors.device
    },
    psychology: {
      openness: jitter(archetype.psychology.openness, 0.2),
      conscientiousness: jitter(archetype.psychology.conscientiousness, 0.2),
      extraversion: jitter(archetype.psychology.extraversion, 0.2),
      agreeableness: jitter(archetype.psychology.agreeableness, 0.2),
      neuroticism: jitter(archetype.psychology.neuroticism, 0.2)
    },
    attentionSpan: archetype.attentionSpan + Math.floor(Math.random() * 5) - 2,
    triggers: archetype.triggers.filter(() => Math.random() > 0.25)
  };
}

/**
 * Generate personas using AI (GPT-4) for enhanced realism.
 * Falls back to template seeding if AI unavailable.
 * @param {number} count - Number of personas to generate
 * @param {object} context - { productName, productCategory, targetAudience }
 * @returns {Promise<object[]>}
 */
async function generateWithAI(count, context) {
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const batchSize = Math.min(count, 10); // Generate in batches for quality
    const batches = Math.ceil(count / batchSize);
    const allPersonas = [];

    for (let b = 0; b < batches; b++) {
      const currentBatch = Math.min(batchSize, count - allPersonas.length);
      const prompt = `Generate ${currentBatch} detailed consumer personas for ad testing.
Product: ${context.productName || 'general product'}
Category: ${context.productCategory || 'consumer goods'}
Target: ${context.targetAudience || 'general audience'}

Return a JSON array. Each persona must have:
- name (string): realistic first name
- age (number): exact age
- gender (string): male/female/non-binary
- occupation (string): realistic job title
- interests (array of 3-5 strings): hobbies and interests
- personality (object with openness, conscientiousness, extraversion, agreeableness, neuroticism as 0-1 floats)
- adBehavior (object with skipProbability 0-1, likeProbability 0-1, purchaseProbability 0-1, shareProbability 0-1)
- triggers (array of 2-4 strings): what makes them buy
- devicePreference (string): mobile/desktop/tablet
- scrollSpeed (string): very slow/slow/medium/fast/very fast
- emotionalProfile (array of 3-4 emotion strings they commonly feel when seeing ads)

Make each persona distinct and realistic. Include diverse ages, backgrounds, and behaviors.`;

      const response = await client.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(response.content);
      const personas = Array.isArray(parsed) ? parsed : (parsed.personas || []);

      for (const p of personas) {
        allPersonas.push({
          id: `ghost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: p.name || 'Anonymous',
          archetype: 'ai-generated',
          archetypeName: 'AI-Custom Persona',
          demographics: {
            age: p.age || 30,
            gender: p.gender || 'any',
            location: 'varies',
            income: 'varies'
          },
          interests: p.interests || [],
          behaviors: {
            scrollSpeed: p.scrollSpeed || 'medium',
            adTolerance: p.adBehavior?.skipProbability > 0.5 ? 'low' : 'medium',
            purchaseFrequency: 'varies',
            device: p.devicePreference || 'mobile'
          },
          psychology: p.personality || { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
          attentionSpan: Math.floor(Math.random() * 12) + 3,
          triggers: p.triggers || [],
          aiGenerated: true
        });
      }
    }

    return allPersonas.slice(0, count);
  } catch (err) {
    return null; // Fall back to template seeding
  }
}

/**
 * Generate personas — tries AI first, falls back to templates.
 * @param {object} opts - { count, productName, productCategory, targetAudience }
 * @returns {Promise<object[]>}
 */
async function generatePersonas(opts) {
  const count = Math.max(1, Math.min(10000, parseInt(opts.count, 10) || 500));

  if (!mockMode) {
    const aiPersonas = await generateWithAI(count, opts);
    if (aiPersonas) return aiPersonas;
  }

  // Template-based generation (mock mode or AI fallback)
  const archetypes = selectArchetypes(count);
  return archetypes.map(a => seedPersona(a));
}

/**
 * Generate a persona summary for display.
 * @param {object[]} personas
 * @returns {object}
 */
function summarizePersonas(personas) {
  const summary = {
    total: personas.length,
    byArchetype: {},
    byGender: { male: 0, female: 0, 'non-binary': 0 },
    byAge: { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 },
    avgAttentionSpan: 0,
    topTriggers: {}
  };

  for (const p of personas) {
    summary.byArchetype[p.archetypeName] = (summary.byArchetype[p.archetypeName] || 0) + 1;
    summary.byGender[p.demographics.gender] = (summary.byGender[p.demographics.gender] || 0) + 1;

    const age = p.demographics.age;
    if (age <= 25) summary.byAge['18-25']++;
    else if (age <= 35) summary.byAge['26-35']++;
    else if (age <= 50) summary.byAge['36-50']++;
    else summary.byAge['50+']++;

    summary.avgAttentionSpan += p.attentionSpan;

    for (const t of p.triggers) {
      summary.topTriggers[t] = (summary.topTriggers[t] || 0) + 1;
    }
  }

  summary.avgAttentionSpan = Math.round(summary.avgAttentionSpan / personas.length * 10) / 10;

  // Sort top triggers
  summary.topTriggers = Object.entries(summary.topTriggers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});

  return summary;
}

module.exports = {
  generatePersonas,
  generateWithAI,
  seedPersona,
  summarizePersonas
};
