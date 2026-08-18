/* ============================================================
   OMNI backend — src/services/platform-adaptation.js
   Platform Alchemy: adapt one master ad to every platform with
   captions, hashtags, posting times, and format conversion.
   ============================================================ */
'use strict';

const { PLATFORMS, getPlatform, listPlatforms, getBestFormat } = require('./platform-specs');
const { generateWithAI, generateWithTemplates } = require('./caption-generator');
const { generateHashtags: genTags } = require('./hashtag-engine');
const { getSchedule, getPlatformTips } = require('./posting-scheduler');

/**
 * Adapt a master ad for a specific platform.
 * @param {object} ad - { filename, width, height, duration, format }
 * @param {string} platform
 * @returns {object}
 */
function adaptForPlatform(ad, platform) {
  const spec = getPlatform(platform) || getPlatform('tiktok');
  const srcW = (ad && ad.width) || 1920;
  const srcH = (ad && ad.height) || 1080;
  const bestFormat = getBestFormat(platform, srcW, srcH);

  return {
    platform,
    label: spec.label,
    format: bestFormat,
    dimensions: bestFormat ? `${bestFormat.w}x${bestFormat.h}` : 'N/A',
    ratio: bestFormat ? bestFormat.ratio : spec.formats.video?.ratio || '16:9',
    maxDuration: bestFormat?.maxDuration || spec.formats.video?.maxDuration || 'N/A',
    tone: spec.tone,
    cta: spec.cta,
    captionLimit: spec.captionLimit,
    hashtagLimit: spec.hashtagLimit,
    features: spec.features,
    demographics: spec.demographics,
    algorithm: spec.algorithm,
    source: (ad && ad.filename) || 'master-ad',
    adaptedAt: new Date().toISOString()
  };
}

/**
 * Adapt ad for all platforms at once.
 * @param {object} ad
 * @returns {object[]}
 */
function adaptForAllPlatforms(ad) {
  return Object.keys(PLATFORMS).map(p => adaptForPlatform(ad, p));
}

/**
 * Generate captions for a platform.
 * @param {object} data - { productName, productCategory, platform, benefits, count }
 * @returns {object}
 */
async function generateCaptions(data) {
  const platform = data.platform || 'tiktok';
  const spec = getPlatform(platform) || getPlatform('tiktok');

  // Try AI first, fall back to templates
  const aiCaptions = await generateWithAI({
    productName: data.productName,
    productCategory: data.productCategory,
    platform,
    tone: data.tone,
    benefits: data.benefits,
    count: data.count || 5
  });

  const captions = aiCaptions || generateWithTemplates({
    productName: data.productName,
    productCategory: data.productCategory,
    platform,
    tone: data.tone,
    benefits: data.benefits
  });

  return {
    platform,
    label: spec.label,
    tone: spec.tone,
    captions,
    total: captions.length,
    aiPowered: !!aiCaptions
  };
}

/**
 * Generate hashtags for a platform.
 * @param {object} data - { productName, productCategory, platform, count }
 * @returns {object}
 */
function generateHashtags(data) {
  return genTags({
    productName: data.productName || data.product,
    productCategory: data.productCategory,
    platform: data.platform || 'tiktok',
    count: data.count || 15
  });
}

/**
 * Get optimal posting schedule for a platform.
 * @param {string} platform
 * @param {object} opts
 * @returns {object}
 */
function optimizePostingTime(platform, opts = {}) {
  return getSchedule(platform, opts);
}

/**
 * Generate a full content brief for a product across all platforms.
 * @param {object} opts - { productName, productCategory, benefits }
 * @returns {object}
 */
async function generateFullBrief(opts) {
  const platforms = Object.keys(PLATFORMS);
  const brief = {};

  for (const p of platforms) {
    const captions = await generateCaptions({
      productName: opts.productName,
      productCategory: opts.productCategory,
      platform: p,
      benefits: opts.benefits,
      count: 3
    });

    const hashtags = generateHashtags({
      productName: opts.productName,
      productCategory: opts.productCategory,
      platform: p,
      count: 10
    });

    const schedule = optimizePostingTime(p);

    brief[p] = {
      adaptation: adaptForPlatform(null, p),
      captions,
      hashtags,
      schedule,
      tips: getPlatformTips(p)
    };
  }

  return {
    product: opts.productName || 'Unknown',
    totalPlatforms: platforms.length,
    platforms: brief
  };
}

module.exports = {
  adaptForPlatform,
  adaptForAllPlatforms,
  generateCaptions,
  generateHashtags,
  optimizePostingTime,
  generateFullBrief,
  PLATFORMS,
  listPlatforms
};
