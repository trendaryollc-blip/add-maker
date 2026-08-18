/* ============================================================
   OMNI — modules/platform-alchemy.js
   PLATFORM ALCHEMY (PA)
   One ad, perfectly transformed for every platform while keeping
   its emotional impact. Reads platform profiles from config.js.
   ============================================================= */
(function (global) {
  'use strict';
  var U = global.OMNI_UTILS || {};
  var CFG = global.OMNI_CONFIG || {};
  var PLATFORMS = (CFG.PLATFORMS) || {
    tiktok: { w: 1080, h: 1920, ratio: '9:16', tone: 'Trendy', cta: 'Shop Now', cap: 30 },
    instagram: { w: 1080, h: 1920, ratio: '9:16', tone: 'Aesthetic', cta: 'Link in Bio', cap: 30 },
    facebook: { w: 1080, h: 1080, ratio: '1:1', tone: 'Relatable', cta: 'Learn More', cap: 60 },
    youtube: { w: 1920, h: 1080, ratio: '16:9', tone: 'Informative', cta: 'Buy', cap: 120 },
    instaFeed: { w: 1080, h: 1080, ratio: '1:1', tone: 'High Quality', cta: 'Shop Now', cap: 30 },
    amazon: { w: 1600, h: 1600, ratio: 'carousel', tone: 'Benefit-first', cta: 'See Details', cap: 0 },
    linkedin: { w: 1200, h: 1200, ratio: '1:1', tone: 'Professional', cta: 'Learn More', cap: 60 }
  };

  var CAPTION_TEMPLATES = [
    'Level up your everyday with {name}.',
    'We found the upgrade your feed needed — {name}.',
    '{name}: quality you can feel from the first unboxing.',
    'Don\'t just settle. Upgrade to {name} today.',
    'The {category} everyone is talking about. Meet {name}.'
  ];

  /* 1. adaptForPlatform(ad, platform) */
  function adaptForPlatform(ad, platform) {
    var profile = PLATFORMS[platform] || PLATFORMS.tiktok;
    var adapt = {
      platform: platform,
      dimensions: profile.w + 'x' + profile.h,
      ratio: profile.ratio,
      maxDuration: profile.cap ? profile.cap + 's' : 'carousel',
      tone: profile.tone,
      cta: profile.cta,
      source: ad ? ad.filename || 'master-ad' : 'master-ad',
      adaptedAt: new Date().toISOString(),
      // intelligent crop percentage (best-framing simulation)
      crop: U.rand(2, 12) + '%'
    };
    return adapt;
  }

  /* 2. generateCaptions(ad, platform) */
  function generateCaptions(ad, platform) {
    var profile = PLATFORMS[platform] || PLATFORMS.tiktok;
    var ad2 = ad || {};
    var name = ad2.productName || 'this product';
    var category = ad2.category || 'product';
    var captions = CAPTION_TEMPLATES.map(function (t) {
      return t.replace('{name}', name).replace('{category}', category.toLowerCase());
    });
    return {
      platform: platform,
      tone: profile.tone,
      primary: captions[0],
      alternatives: captions.slice(1),
      cta: profile.cta,
      hashtag_suggestion: generateHashtags({ name: name }, platform)
    };
  }

  /* 3. generateHashtags(product, platform) */
  function generateHashtags(product, platform) {
    var name = (product && product.name) ? String(product.name).toLowerCase().replace(/[^a-z0-9]/g, '') : 'product';
    var base = ['omni', 'ad', name].filter(Boolean);
    var pool = {
      tiktok:    ['fyp', 'viral', 'foryou', 'tiktokmademebuyit', 'trending', 'foryoupage'],
      instagram: ['instagood', 'reels', 'fashion', 'style', 'beauty', 'shopnow'],
      facebook:  ['facebookads', 'onlinebiz', 'shopsmall', 'marketing', 'digitalmarketing'],
      youtube:   ['youtube', 'advertising', 'product', 'howto', 'review'],
      instaFeed: ['instadaily', 'newarrivals', 'musthave', 'ootd', 'homedecor'],
      amazon:    ['amazonfinds', 'amazonprime', 'gadgets', 'home', 'review'],
      linkedin:  ['marketing', 'digitalmarketing', 'advertising', 'business', 'ecommerce']
    };
    var tags = (pool[platform] || pool.tiktok).map(function (h) { return '#' + h; });
    // platform + product specific
    tags.unshift('#' + (isNaN(name[0]) ? name : 'product'));
    tags.unshift('#' + platform);
    return tags.slice(0, Math.max(8, tags.length));
  }

  /* 4. optimizePostingTime(platform) */
  function optimizePostingTime(platform) {
    var best = {
      tiktok:    { start: '19:00', end: '22:00', score: 92, day: 'Thursday' },
      instagram: { start: '11:00', end: '13:00', score: 88, day: 'Wednesday' },
      instaFeed: { start: '12:00', end: '14:00', score: 85, day: 'Wednesday' },
      facebook:  { start: '09:00', end: '11:00', score: 82, day: 'Tuesday' },
      youtube:   { start: '14:00', end: '16:00', score: 80, day: 'Friday' },
      amazon:    { start: '10:00', end: '12:00', score: 78, day: 'Monday' },
      linkedin:  { start: '08:30', end: '09:30', score: 84, day: 'Tuesday' }
    };
    var pick = best[platform] || best.tiktok;
    var now = pick.day + ' ' + pick.start + ' – ' + pick.end;
    return {
      platform: platform,
      optimal: now,
      times: pick,
      confidence: pick.score + '%',
      timezone: (CFG.APP && CFG.APP.timezone) || 'UTC',
      note: 'Based on aggregated engagement windows for ' + platform + '.'
    };
  }

  global.PlatformAlchemy = {
    adaptForPlatform: adaptForPlatform,
    generateCaptions: generateCaptions,
    generateHashtags: generateHashtags,
    optimizePostingTime: optimizePostingTime,
    PLATFORMS: PLATFORMS
  };
  if (global.OMNI) global.OMNI.modules = Object.assign(global.OMNI.modules || {}, { platformAlchemy: global.PlatformAlchemy });
})(window);