/* ============================================================
   OMNI backend — src/services/posting-scheduler.js
   Posting time optimizer — calculates optimal posting windows
   based on platform, audience timezone, and engagement data.
   ============================================================ */
'use strict';

const BASE_TIMES = {
  tiktok: {
    best: [
      { day: 'Tuesday', start: '19:00', end: '21:00', score: 94 },
      { day: 'Thursday', start: '19:00', end: '22:00', score: 92 },
      { day: 'Friday', start: '18:00', end: '20:00', score: 90 },
      { day: 'Saturday', start: '14:00', end: '16:00', score: 88 },
      { day: 'Sunday', start: '15:00', end: '17:00', score: 86 }
    ],
    avoid: [
      { day: 'Monday', start: '02:00', end: '06:00', reason: 'Lowest engagement window' },
      { day: 'Wednesday', start: '09:00', end: '11:00', reason: 'School/work hours' }
    ],
    peakDays: ['Tuesday', 'Thursday', 'Friday']
  },
  instagram_reels: {
    best: [
      { day: 'Wednesday', start: '11:00', end: '13:00', score: 91 },
      { day: 'Friday', start: '10:00', end: '12:00', score: 89 },
      { day: 'Tuesday', start: '14:00', end: '16:00', score: 87 },
      { day: 'Saturday', start: '10:00', end: '12:00', score: 85 },
      { day: 'Thursday', start: '19:00', end: '21:00', score: 84 }
    ],
    avoid: [
      { day: 'Sunday', start: '08:00', end: '10:00', reason: 'Sunday morning low engagement' }
    ],
    peakDays: ['Wednesday', 'Friday', 'Tuesday']
  },
  instagram_feed: {
    best: [
      { day: 'Wednesday', start: '12:00', end: '14:00', score: 88 },
      { day: 'Friday', start: '11:00', end: '13:00', score: 86 },
      { day: 'Tuesday', start: '14:00', end: '16:00', score: 84 },
      { day: 'Monday', start: '11:00', end: '13:00', score: 82 }
    ],
    avoid: [
      { day: 'Saturday', start: '20:00', end: '23:00', reason: 'Weekend evening dip' }
    ],
    peakDays: ['Wednesday', 'Friday', 'Tuesday']
  },
  facebook: {
    best: [
      { day: 'Tuesday', start: '09:00', end: '11:00', score: 86 },
      { day: 'Wednesday', start: '13:00', end: '15:00', score: 84 },
      { day: 'Thursday', start: '10:00', end: '12:00', score: 82 },
      { day: 'Friday', start: '14:00', end: '16:00', score: 80 }
    ],
    avoid: [
      { day: 'Sunday', start: '00:00', end: '08:00', reason: 'Very low activity' }
    ],
    peakDays: ['Tuesday', 'Wednesday', 'Thursday']
  },
  youtube_shorts: {
    best: [
      { day: 'Friday', start: '14:00', end: '16:00', score: 88 },
      { day: 'Saturday', start: '12:00', end: '14:00', score: 86 },
      { day: 'Sunday', start: '14:00', end: '16:00', score: 84 },
      { day: 'Wednesday', start: '15:00', end: '17:00', score: 82 }
    ],
    avoid: [
      { day: 'Monday', start: '08:00', end: '10:00', reason: 'Start of work week' }
    ],
    peakDays: ['Friday', 'Saturday', 'Sunday']
  },
  youtube_long: {
    best: [
      { day: 'Friday', start: '15:00', end: '17:00', score: 85 },
      { day: 'Saturday', start: '09:00', end: '11:00', score: 83 },
      { day: 'Sunday', start: '10:00', end: '12:00', score: 81 },
      { day: 'Thursday', start: '16:00', end: '18:00', score: 80 }
    ],
    avoid: [
      { day: 'Tuesday', start: '08:00', end: '10:00', reason: 'Low morning engagement' }
    ],
    peakDays: ['Friday', 'Saturday', 'Sunday']
  },
  twitter: {
    best: [
      { day: 'Tuesday', start: '10:00', end: '12:00', score: 87 },
      { day: 'Wednesday', start: '09:00', end: '11:00', score: 85 },
      { day: 'Thursday', start: '12:00', end: '14:00', score: 83 },
      { day: 'Friday', start: '10:00', end: '12:00', score: 81 }
    ],
    avoid: [
      { day: 'Saturday', start: '20:00', end: '23:00', reason: 'Weekend evening' }
    ],
    peakDays: ['Tuesday', 'Wednesday', 'Thursday']
  },
  linkedin: {
    best: [
      { day: 'Tuesday', start: '08:30', end: '09:30', score: 90 },
      { day: 'Wednesday', start: '10:00', end: '11:00', score: 88 },
      { day: 'Thursday', start: '09:00', end: '10:00', score: 86 },
      { day: 'Monday', start: '08:00', end: '09:00', score: 84 }
    ],
    avoid: [
      { day: 'Saturday', start: '00:00', end: '23:59', reason: 'Weekend — minimal professional activity' },
      { day: 'Sunday', start: '00:00', end: '23:59', reason: 'Weekend — minimal professional activity' }
    ],
    peakDays: ['Tuesday', 'Wednesday', 'Thursday']
  },
  pinterest: {
    best: [
      { day: 'Saturday', start: '20:00', end: '23:00', score: 92 },
      { day: 'Friday', start: '15:00', end: '17:00', score: 88 },
      { day: 'Sunday', start: '20:00', end: '22:00', score: 86 },
      { day: 'Tuesday', start: '21:00', end: '23:00', score: 84 }
    ],
    avoid: [
      { day: 'Monday', start: '06:00', end: '09:00', reason: 'Morning rush — low pinning activity' }
    ],
    peakDays: ['Saturday', 'Friday', 'Sunday']
  },
  snapchat: {
    best: [
      { day: 'Friday', start: '18:00', end: '22:00', score: 90 },
      { day: 'Saturday', start: '16:00', end: '20:00', score: 88 },
      { day: 'Thursday', start: '19:00', end: '21:00', score: 84 }
    ],
    avoid: [
      { day: 'Wednesday', start: '08:00', end: '12:00', reason: 'Mid-week school/work hours' }
    ],
    peakDays: ['Friday', 'Saturday', 'Thursday']
  },
  threads: {
    best: [
      { day: 'Tuesday', start: '09:00', end: '11:00', score: 85 },
      { day: 'Wednesday', start: '12:00', end: '14:00', score: 83 },
      { day: 'Thursday', start: '10:00', end: '12:00', score: 81 }
    ],
    avoid: [
      { day: 'Saturday', start: '00:00', end: '23:59', reason: 'Weekend low activity' }
    ],
    peakDays: ['Tuesday', 'Wednesday', 'Thursday']
  }
};

/**
 * Get optimal posting schedule for a platform.
 * @param {string} platform
 * @param {object} opts - { timezone, days, count }
 * @returns {object}
 */
function getSchedule(platform, opts = {}) {
  const data = BASE_TIMES[platform] || BASE_TIMES.tiktok;
  const count = opts.count || 3;
  const top = data.best.slice(0, count);

  return {
    platform,
    timezone: opts.timezone || 'UTC',
    schedule: top.map(t => ({
      day: t.day,
      startTime: t.start,
      endTime: t.end,
      score: t.score,
      confidence: t.score >= 90 ? 'Very High' : t.score >= 85 ? 'High' : t.score >= 80 ? 'Medium' : 'Low'
    })),
    peakDays: data.peakDays,
    avoidWindows: data.avoid || [],
    tips: getPlatformTips(platform),
    weeklyRecommendation: generateWeeklyRec(data, opts.count || 3)
  };
}

/**
 * Get posting tips for a platform.
 * @param {string} platform
 * @returns {string[]}
 */
function getPlatformTips(platform) {
  const tips = {
    tiktok: ['Post consistently 1-3x daily', 'First 3 seconds determine retention', 'Use trending sounds', 'Engage in comments immediately after posting'],
    instagram_reels: ['Use trending audio', 'Post when your audience is most active', 'Add text overlays', 'Cross-promote to Stories'],
    instagram_feed: ['Carousel posts get 2x engagement', 'Use all 10 slides when possible', 'Add location tags', 'Post when followers are online'],
    facebook: ['Native video gets 10x more reach', 'Ask questions to drive comments', 'Post in Groups for organic reach', 'Use Facebook Reels for discovery'],
    youtube_shorts: ['Hook viewers in first 1-2 seconds', 'Loop potential boosts algorithm', 'Use relevant hashtags', 'Post during peak browsing hours'],
    youtube_long: ['Thumbnail CTR is critical', 'First 30 seconds retention matters', 'Use chapters for navigation', 'Post when subscribers are online'],
    twitter: ['Threads get 2x engagement', 'Post during news cycles', 'Use visuals (2x engagement)', 'Reply to trending topics'],
    linkedin: ['Document/carousel posts get 2x reach', 'Personal stories outperform', 'Post Tuesday-Thursday mornings', 'Engage with comments within 1 hour'],
    pinterest: ['Vertical pins mandatory', 'Add text overlay to images', 'Rich pins get more clicks', 'Consistent pinning (5-15/day) helps'],
    snapchat: ['Raw authentic content wins', 'Use AR lenses when possible', 'Time-sensitive content creates FOMO', 'Post during evening hours'],
    threads: ['Text-first — keep it concise', 'Engage with replies quickly', 'Cross-post from Instagram', 'Be conversational, not promotional']
  };
  return tips[platform] || ['Post consistently', 'Engage with your audience', 'Use platform-native features'];
}

/**
 * Generate weekly posting recommendation.
 * @param {object} data
 * @param {number} count
 * @returns {object}
 */
function generateWeeklyRec(data, count) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const rec = {};
  for (const day of days) {
    const bestForDay = data.best.find(t => t.day === day);
    const isAvoid = (data.avoid || []).some(a => a.day === day);
    if (isAvoid) {
      rec[day] = { status: 'avoid', note: 'Low engagement expected' };
    } else if (bestForDay) {
      rec[day] = { status: 'post', time: `${bestForDay.start}-${bestForDay.end}`, score: bestForDay.score };
    } else {
      rec[day] = { status: 'okay', time: '12:00-14:00', score: 70 };
    }
  }
  return rec;
}

module.exports = { getSchedule, BASE_TIMES, getPlatformTips };
