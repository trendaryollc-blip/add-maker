/* ============================================================
   OMNI backend — src/services/platform-specs.js
   Comprehensive platform specifications database — dimensions,
   formats, tones, posting times, hashtag pools, and content
   rules for 12+ social platforms.
   ============================================================ */
'use strict';

const PLATFORMS = {
  tiktok: {
    label: 'TikTok',
    formats: {
      video: { w: 1080, h: 1920, ratio: '9:16', maxDuration: 60, minDuration: 5 },
      photo: { w: 1080, h: 1920, ratio: '9:16', maxImages: 1 }
    },
    tone: 'Trendy, Authentic, Raw',
    cta: 'Shop Now',
    captionLimit: 300,
    hashtagLimit: 30,
    features: ['duet', 'stitch', 'sounds', 'effects', 'livestream'],
    contentRules: ['no watermark overlays', 'vertical only', 'hook in first 1s'],
    demographics: { primary: '16-24', secondary: '25-34', gender: 'female-leaning' },
    algorithm: { keyFactors: ['watch_time', 'shares', 'saves', 'comments'] }
  },
  instagram_reels: {
    label: 'Instagram Reels',
    formats: {
      video: { w: 1080, h: 1920, ratio: '9:16', maxDuration: 90, minDuration: 3 },
      photo: { w: 1080, h: 1920, ratio: '9:16', maxImages: 1 }
    },
    tone: 'Aesthetic, Polished, Aspirational',
    cta: 'Link in Bio',
    captionLimit: 2200,
    hashtagLimit: 30,
    features: ['music', 'ar_filters', 'collab', 'remix'],
    contentRules: ['high visual quality', 'trending audio boosts reach', 'cover image matters'],
    demographics: { primary: '18-34', secondary: '35-44', gender: 'balanced' },
    algorithm: { keyFactors: ['saves', 'shares', 'replays', 'profile_visits'] }
  },
  instagram_feed: {
    label: 'Instagram Feed',
    formats: {
      photo: { w: 1080, h: 1080, ratio: '1:1', maxImages: 10 },
      carousel: { w: 1080, h: 1350, ratio: '4:5', maxImages: 10 }
    },
    tone: 'High Quality, Curated, Branded',
    cta: 'Shop Now',
    captionLimit: 2200,
    hashtagLimit: 30,
    features: ['carousel', 'shopping_tags', 'location'],
    contentRules: ['cohesive grid aesthetic', 'carousel performs best', 'strong first slide'],
    demographics: { primary: '18-34', secondary: '35-44', gender: 'balanced' },
    algorithm: { keyFactors: ['saves', 'comments', 'shares', 'profile_visits'] }
  },
  facebook: {
    label: 'Facebook',
    formats: {
      video: { w: 1280, h: 720, ratio: '16:9', maxDuration: 240, minDuration: 1 },
      photo: { w: 1200, h: 630, ratio: '1.91:1', maxImages: 10 },
      carousel: { w: 1080, h: 1080, ratio: '1:1', maxImages: 10 }
    },
    tone: 'Relatable, Community-focused, Conversational',
    cta: 'Learn More',
    captionLimit: 63206,
    hashtagLimit: 5,
    features: ['reactions', 'shares', 'groups', 'marketplace', 'events'],
    contentRules: ['native video outperforms links', 'questions drive engagement', 'long-form ok'],
    demographics: { primary: '25-54', secondary: '55+', gender: 'balanced' },
    algorithm: { keyFactors: ['meaningful_interactions', 'time_spent', 'shares'] }
  },
  youtube_shorts: {
    label: 'YouTube Shorts',
    formats: {
      video: { w: 1080, h: 1920, ratio: '9:16', maxDuration: 60, minDuration: 3 }
    },
    tone: 'Entertaining, Educational, Snappy',
    cta: 'Subscribe',
    captionLimit: 100,
    hashtagLimit: 15,
    features: ['sounds', 'effects', 'remix', 'multitrim'],
    contentRules: ['vertical only', 'loop potential helps', 'clear title overlay'],
    demographics: { primary: '18-34', secondary: '35-44', gender: 'male-leaning' },
    algorithm: { keyFactors: ['swipe_away_rate', 'watch_time', 'satisfaction'] }
  },
  youtube_long: {
    label: 'YouTube Long-form',
    formats: {
      video: { w: 1920, h: 1080, ratio: '16:9', maxDuration: 43200, minDuration: 30 },
      thumbnail: { w: 1280, h: 720, ratio: '16:9' }
    },
    tone: 'Informative, In-depth, Trustworthy',
    cta: 'Subscribe / Buy',
    captionLimit: 5000,
    hashtagLimit: 15,
    features: ['chapters', 'end_screen', 'cards', 'community', 'premiere'],
    contentRules: ['thumbnail CTR critical', 'first 30s retention key', 'SEO titles'],
    demographics: { primary: '18-49', secondary: '50+', gender: 'male-leaning' },
    algorithm: { keyFactors: ['CTR', 'watch_time', 'session_time', 'satisfaction'] }
  },
  twitter: {
    label: 'X (Twitter)',
    formats: {
      video: { w: 1280, h: 720, ratio: '16:9', maxDuration: 140, minDuration: 1 },
      photo: { w: 1600, h: 900, ratio: '16:9', maxImages: 4 },
      GIF: { w: 480, h: 480, ratio: '1:1', maxDuration: 6 }
    },
    tone: 'Witty, Timely, Concise, Hot-takes',
    cta: 'Thread / Link',
    captionLimit: 280,
    hashtagLimit: 5,
    features: ['threads', 'polls', 'spaces', 'communities', 'lists'],
    contentRules: ['brevity wins', 'visuals boost 3x engagement', 'trending topics help'],
    demographics: { primary: '25-44', secondary: '18-24', gender: 'male-leaning' },
    algorithm: { keyFactors: ['replies', 'retweets', 'bookmarks', 'profile_clicks'] }
  },
  linkedin: {
    label: 'LinkedIn',
    formats: {
      video: { w: 1920, h: 1080, ratio: '16:9', maxDuration: 600, minDuration: 3 },
      photo: { w: 1200, h: 627, ratio: '1.91:1', maxImages: 1 },
      carousel: { w: 1080, h: 1080, ratio: '1:1', maxImages: 10 },
      document: { w: 1080, h: 1080, ratio: '1:1' }
    },
    tone: 'Professional, Thought Leadership, Data-driven',
    cta: 'Learn More',
    captionLimit: 3000,
    hashtagLimit: 5,
    features: ['articles', 'newsletters', 'events', 'polls', 'live'],
    contentRules: ['document/carousel gets 2x reach', 'text-only posts strong', 'personal stories win'],
    demographics: { primary: '25-54', secondary: '18-24', gender: 'balanced' },
    algorithm: { keyFactors: ['dwell_time', 'comments', 'reposts', 'profile_views'] }
  },
  pinterest: {
    label: 'Pinterest',
    formats: {
      photo: { w: 1000, h: 1500, ratio: '2:3', maxImages: 1 },
      video: { w: 1000, h: 1500, ratio: '2:3', maxDuration: 60 },
      idea: { w: 1000, h: 1500, ratio: '2:3', maxSlides: 20 }
    },
    tone: 'Inspirational, Aspirational, Solution-oriented',
    cta: 'Save / Shop',
    captionLimit: 500,
    hashtagLimit: 20,
    features: ['pins', 'boards', 'ideas', 'shopping', 'try_on'],
    contentRules: ['vertical mandatory', 'text overlay on images', 'SEO-rich descriptions'],
    demographics: { primary: '25-44', secondary: '18-24', gender: 'female-dominant' },
    algorithm: { keyFactors: ['saves', 'closeups', 'outbound_clicks'] }
  },
  snapchat: {
    label: 'Snapchat',
    formats: {
      video: { w: 1080, h: 1920, ratio: '9:16', maxDuration: 60, minDuration: 3 },
      photo: { w: 1080, h: 1920, ratio: '9:16' }
    },
    tone: 'Playful, FOMO-driven, Ephemeral',
    cta: 'Swipe Up',
    captionLimit: 200,
    hashtagLimit: 10,
    features: ['lenses', 'filters', 'spots', 'stories', 'snap_map'],
    contentRules: ['raw > polished', 'AR lenses boost engagement', 'time-sensitive content wins'],
    demographics: { primary: '13-24', secondary: '25-34', gender: 'balanced' },
    algorithm: { keyFactors: ['completion_rate', 'replays', 'screenshots'] }
  },
  threads: {
    label: 'Threads',
    formats: {
      text: { maxChars: 500 },
      photo: { w: 1080, h: 1080, ratio: '1:1', maxImages: 10 },
      video: { w: 1080, h: 1080, ratio: '1:1', maxDuration: 60 }
    },
    tone: 'Conversational, Casual, Community',
    cta: 'Follow / Engage',
    captionLimit: 500,
    hashtagLimit: 5,
    features: ['threads', 'reposts', 'quotes', 'polls'],
    contentRules: ['text-first platform', 'engage with community', 'cross-post from Instagram ok'],
    demographics: { primary: '18-34', secondary: '35-44', gender: 'balanced' },
    algorithm: { keyFactors: ['replies', 'reposts', 'follows_from_post'] }
  }
};

/**
 * Get platform spec by id.
 * @param {string} platformId
 * @returns {object|undefined}
 */
function getPlatform(platformId) {
  return PLATFORMS[platformId] || null;
}

/**
 * Get all platform ids and labels.
 * @returns {object[]}
 */
function listPlatforms() {
  return Object.entries(PLATFORMS).map(([id, spec]) => ({
    id,
    label: spec.label,
    primaryAudience: spec.demographics.primary,
    tone: spec.tone
  }));
}

/**
 * Get best format for a platform given source dimensions.
 * @param {string} platformId
 * @param {number} srcW
 * @param {number} srcH
 * @returns {object}
 */
function getBestFormat(platformId, srcW, srcH) {
  const spec = PLATFORMS[platformId];
  if (!spec) return null;
  const formats = Object.values(spec.formats);
  const srcRatio = srcW / srcH;
  let best = formats[0];
  let bestDiff = Infinity;
  for (const f of formats) {
    const fRatio = f.w / f.h;
    const diff = Math.abs(srcRatio - fRatio);
    if (diff < bestDiff) { bestDiff = diff; best = f; }
  }
  return best;
}

module.exports = { PLATFORMS, getPlatform, listPlatforms, getBestFormat };
