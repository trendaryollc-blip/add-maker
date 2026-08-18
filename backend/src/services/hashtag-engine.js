/* ============================================================
   OMNI backend — src/services/hashtag-engine.js
   Hashtag engine — generates trending, contextual, and niche
   hashtags optimized for each platform.
   ============================================================ */
'use strict';

const TRENDING_POOLS = {
  tiktok: {
    viral: ['#fyp', '#viral', '#foryou', '#foryoupage', '#tiktokviral', '#trending', '#blowthisup', '#xyzbca'],
    niche: ['#tiktokmademebuyit', '#amazonfinds', '#lifehack', '#protip', '#hiddenfind', '#musthave', '#obsessed'],
    engagement: ['#comment', '#duetthis', '#stitchthis', '#pov', '#waitforit', '#plot twist']
  },
  instagram_reels: {
    viral: ['#reels', '#reelsinstagram', '#instareels', '#reelsvideo', '#reelstrending', '#viralreels'],
    niche: ['#instagood', '#photooftheday', '#beautiful', '#happy', '#fashion', '#style', '#ootd'],
    engagement: ['#explorepage', '#explore', '#instadaily', '#like4like', '#follow4follow']
  },
  instagram_feed: {
    viral: ['#instagood', '#picoftheday', '#photography', '#beautiful', '#instadaily'],
    niche: ['#newarrivals', '#musthave', '#shopnow', '#handmade', '#luxurylifestyle'],
    engagement: ['#featurefriday', '#communityovercompetition', '#share']
  },
  facebook: {
    viral: ['#trending', '#viral', '#share', '#mustsee'],
    niche: ['#shoplocal', '#smallbusiness', '#supportsmallbusiness', '#entrepreneur'],
    engagement: ['#tagafriend', '#whodoyoushopwith', '#comments']
  },
  youtube_shorts: {
    viral: ['#shorts', '#youtubeshorts', '#viral', '#trending', '#funny'],
    niche: ['#lifehack', '#diy', '#tutorial', '#howto', '#review'],
    engagement: ['#subscribe', '#comment', '#like']
  },
  youtube_long: {
    viral: ['#youtube', '#viral', '#trending', '#subscribe'],
    niche: ['#deepdive', '#explained', '#review', '#tutorial', '#analysis'],
    engagement: ['#commentbelow', '#bingewatch', '#fullreview']
  },
  twitter: {
    viral: ['#trending', '#viral', '#breaking', '#justin'],
    niche: ['#tech', '#startup', '#marketing', '#crypto', '#AI'],
    engagement: ['#thread', '#hot take', '#unpopular opinion', '#reply']
  },
  linkedin: {
    viral: ['#leadership', '#innovation', '#career', '#growth'],
    niche: ['#b2b', '#saas', '#entrepreneurship', '#management', '#hiring'],
    engagement: ['#leadershiplessons', '#careeradvice', '#professionaldevelopment']
  },
  pinterest: {
    viral: ['#pinspiration', '#pinoftheday', '#trending'],
    niche: ['#homeinspo', '#diyproject', '#recipe', '#fashioninspo', '#wedding'],
    engagement: ['#savethis', '#boardthis', '#trythis']
  },
  snapchat: {
    viral: ['#snap', '#story', '#viral'],
    niche: ['#behindthescenes', '#dayinmylife', '#bts'],
    engagement: ['#screenshot', '#replay', '#swipeup']
  },
  threads: {
    viral: ['#threads', '#trending', '#viral'],
    niche: ['#thoughts', '#hot take', '#opinion'],
    engagement: ['#reply', '#repost', '#thread']
  }
};

/**
 * Generate contextual hashtags based on product and platform.
 * @param {object} opts - { productName, productCategory, platform, count, style }
 * @returns {object[]}
 */
function generateHashtags(opts) {
  const platform = opts.platform || 'tiktok';
  const count = Math.min(30, Math.max(1, opts.count || 10));
  const pools = TRENDING_POOLS[platform] || TRENDING_POOLS.tiktok;

  const hashtags = [];
  const seen = new Set();

  // Product-specific hashtag
  const cleanName = (opts.productName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanName && cleanName.length > 2) {
    hashtags.push({ tag: `#${cleanName}`, type: 'product', relevance: 1.0 });
    seen.add(`#${cleanName}`);
  }

  // Category hashtag
  const cleanCategory = (opts.productCategory || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanCategory && cleanCategory.length > 2 && !seen.has(`#${cleanCategory}`)) {
    hashtags.push({ tag: `#${cleanCategory}`, type: 'category', relevance: 0.9 });
    seen.add(`#${cleanCategory}`);
  }

  // Trending tags (high volume)
  const viral = shuffleArray([...(pools.viral || [])]);
  for (const tag of viral) {
    if (hashtags.length >= count) break;
    if (!seen.has(tag)) {
      hashtags.push({ tag, type: 'trending', relevance: 0.7 + Math.random() * 0.2 });
      seen.add(tag);
    }
  }

  // Niche tags (targeted)
  const niche = shuffleArray([...(pools.niche || [])]);
  for (const tag of niche) {
    if (hashtags.length >= count) break;
    if (!seen.has(tag)) {
      hashtags.push({ tag, type: 'niche', relevance: 0.8 + Math.random() * 0.15 });
      seen.add(tag);
    }
  }

  // Engagement tags
  const engage = shuffleArray([...(pools.engagement || [])]);
  for (const tag of engage) {
    if (hashtags.length >= count) break;
    if (!seen.has(tag)) {
      hashtags.push({ tag, type: 'engagement', relevance: 0.5 + Math.random() * 0.3 });
      seen.add(tag);
    }
  }

  // Fill remaining with mixed
  const allTags = [...viral, ...niche, ...engage];
  for (const tag of allTags) {
    if (hashtags.length >= count) break;
    if (!seen.has(tag)) {
      hashtags.push({ tag, type: 'mixed', relevance: 0.4 + Math.random() * 0.4 });
      seen.add(tag);
    }
  }

  // Sort by relevance and return top N
  const sorted = hashtags
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, count)
    .map((h, i) => ({ ...h, rank: i + 1 }));

  return {
    platform,
    hashtags: sorted,
    total: sorted.length,
    recommended: sorted.slice(0, getRecommendedCount(platform)).map(h => h.tag),
    strategy: getStrategy(platform)
  };
}

/**
 * Get recommended hashtag count by platform.
 * @param {string} platform
 * @returns {number}
 */
function getRecommendedCount(platform) {
  const counts = {
    tiktok: 5, instagram_reels: 15, instagram_feed: 15,
    facebook: 3, youtube_shorts: 5, youtube_long: 8,
    twitter: 3, linkedin: 3, pinterest: 10, snapchat: 3, threads: 3
  };
  return counts[platform] || 5;
}

/**
 * Get hashtag strategy description.
 * @param {string} platform
 * @returns {string}
 */
function getStrategy(platform) {
  const strategies = {
    tiktok: 'Use 3-5 high-volume tags + 2-3 niche. TikTok rewards discoverability over volume.',
    instagram_reels: 'Mix 10-15 tags: 3 trending, 5 niche, 2-3 branded. Avoid banned hashtags.',
    instagram_feed: 'Use 15-20 targeted tags. Mix volume levels. Add location tags for local reach.',
    facebook: 'Keep to 2-3 relevant tags. Facebook algorithm prioritizes content over hashtags.',
    youtube_shorts: 'Use 3-5 tags. Include #shorts. Focus on topic-specific tags.',
    youtube_long: 'Use 8-15 tags. Include primary keyword, variations, and broad topic tags.',
    twitter: 'Use 2-3 tags max. Trending tags boost visibility. Avoid hashtag stuffing.',
    linkedin: 'Use 3-5 professional tags. Focus on industry and topic keywords.',
    pinterest: 'Use 8-15 descriptive tags. Pinterest is a search engine — think SEO.',
    snapchat: 'Use 2-3 tags. Focus on location and event-based tags.',
    threads: 'Use 2-3 tags. Threads is conversational — hashtags are less critical.'
  };
  return strategies[platform] || 'Use 3-5 relevant hashtags.';
}

/**
 * Shuffle array (Fisher-Yates).
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = { generateHashtags, TRENDING_POOLS, getRecommendedCount, getStrategy };
