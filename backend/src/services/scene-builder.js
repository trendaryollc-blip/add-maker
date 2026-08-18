/* ============================================================
   OMNI backend — src/services/scene-builder.js
   Builds scene configurations from product data.
   Generates the sequence of visual elements (images, animations,
   text overlays, transitions) that make up an ad video.
   ============================================================ */
'use strict';

const { v4: uuidv4 } = require('uuid');

const ENVIRONMENTS = [
  {
    name: 'Cyber City',
    tone: 'futuristic',
    bgGradient: ['#0a0a0f', '#14142e'],
    accentColor: '#00d4ff',
    fog: 0x0a0a0f,
    light: 0x00d4ff,
    mood: 'high-tech, innovative, cutting-edge'
  },
  {
    name: 'Tropical',
    tone: 'warm',
    bgGradient: ['#102a1e', '#2d5a3d'],
    accentColor: '#ffd166',
    fog: 0x102a1e,
    light: 0xffd166,
    mood: 'relaxed, natural, refreshing'
  },
  {
    name: 'Alpine',
    tone: 'fresh',
    bgGradient: ['#cfe6ff', '#e8f4fd'],
    accentColor: '#ffffff',
    fog: 0xcfe6ff,
    light: 0xffffff,
    mood: 'clean, pure, adventurous'
  },
  {
    name: 'Desert',
    tone: 'minimal',
    bgGradient: ['#3a2a1a', '#8b6914'],
    accentColor: '#ffaa55',
    fog: 0x3a2a1a,
    light: 0xffaa55,
    mood: 'bold, minimal, striking'
  },
  {
    name: 'Deep Space',
    tone: 'epic',
    bgGradient: ['#05010f', '#1a0533'],
    accentColor: '#7b2ffc',
    fog: 0x05010f,
    light: 0x7b2ffc,
    mood: 'cosmic, mysterious, grand'
  }
];

/**
 * Build a complete scene configuration for an ad video.
 * @param {object} opts
 * @param {object} opts.product - Product data from scan
 * @param {string} opts.environment - Environment name
 * @param {number} opts.duration - Video duration in seconds
 * @param {string} opts.format - Platform format (tiktok, instagram, etc.)
 * @param {string} opts.hook - Ad hook/headline text
 * @param {string} opts.cta - Call to action text
 * @returns {object} Scene configuration
 */
function buildScene(opts = {}) {
  const env = ENVIRONMENTS.find(e => e.name === opts.environment) || ENVIRONMENTS[0];
  const product = opts.product || {};
  const duration = opts.duration || 15;
  const format = opts.format || 'tiktok';

  const SPECS = {
    tiktok:    { w: 1080, h: 1920, ratio: '9:16' },
    instagram: { w: 1080, h: 1920, ratio: '9:16' },
    instaFeed: { w: 1080, h: 1080, ratio: '1:1' },
    facebook:  { w: 1080, h: 1080, ratio: '1:1' },
    youtube:   { w: 1920, h: 1080, ratio: '16:9' },
    gif:       { w: 480,  h: 480,  ratio: '1:1' }
  };

  const spec = SPECS[format] || SPECS.tiktok;

  // Build scene sequence
  const scenes = [
    {
      id: uuidv4(),
      type: 'intro',
      start: 0,
      duration: Math.min(3, duration * 0.2),
      elements: [
        { type: 'background', color: env.bgGradient[0], gradient: env.bgGradient },
        { type: 'text', content: opts.hook || product.name || 'Introducing', style: 'headline', animation: 'fade-in', position: 'center' },
        { type: 'particle', count: 30, color: env.accentColor, speed: 'slow' }
      ],
      transition: { type: 'fade', duration: 0.5 }
    },
    {
      id: uuidv4(),
      type: 'product-reveal',
      start: Math.min(3, duration * 0.2),
      duration: duration * 0.4,
      elements: [
        { type: 'background', color: env.bgGradient[1], gradient: env.bgGradient },
        { type: 'product-image', src: (product.images && product.images[0]) || null, animation: 'scale-up', position: 'center' },
        { type: 'text', content: product.name || 'Premium Product', style: 'product-name', animation: 'slide-up', position: 'below-product' },
        { type: 'glow', color: env.accentColor, intensity: 0.6 }
      ],
      transition: { type: 'zoom', duration: 0.4 }
    },
    {
      id: uuidv4(),
      type: 'features',
      start: Math.min(3, duration * 0.2) + duration * 0.4,
      duration: duration * 0.25,
      elements: [
        { type: 'background', color: env.bgGradient[0], gradient: env.bgGradient },
        { type: 'text', content: product.description || 'Premium quality', style: 'body', animation: 'typewriter', position: 'center' },
        { type: 'price-tag', content: product.priceRange || product.price || '', animation: 'pop-in', position: 'bottom-right' }
      ],
      transition: { type: 'slide-left', duration: 0.3 }
    },
    {
      id: uuidv4(),
      type: 'cta',
      start: duration * 0.85,
      duration: duration * 0.15,
      elements: [
        { type: 'background', color: env.bgGradient[1] },
        { type: 'text', content: opts.cta || 'Shop Now', style: 'cta-button', animation: 'pulse', position: 'center' },
        { type: 'product-image', src: (product.images && product.images[0]) || null, animation: 'float', position: 'top', opacity: 0.3 }
      ],
      transition: { type: 'fade', duration: 0.3 }
    }
  ];

  return {
    id: uuidv4(),
    environment: env,
    format,
    dimensions: { width: spec.w, height: spec.h },
    ratio: spec.ratio,
    duration,
    scenes,
    voiceover: {
      text: opts.hook || `Discover ${product.name || 'our product'}. ${product.description || ''}`.substring(0, 200),
      style: env.tone,
      duration: duration
    },
    metadata: {
      productName: product.name || '',
      category: product.category || '',
      mood: env.mood,
      accentColor: env.accentColor,
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Generate a scene summary for preview/debugging.
 */
function summarizeScene(scene) {
  return {
    id: scene.id,
    environment: scene.environment.name,
    format: scene.format,
    dimensions: `${scene.dimensions.width}x${scene.dimensions.height}`,
    duration: `${scene.duration}s`,
    scenes: scene.scenes.length,
    mood: scene.metadata.mood,
    voiceoverLength: scene.voiceover.text.length
  };
}

module.exports = { buildScene, summarizeScene, ENVIRONMENTS };
