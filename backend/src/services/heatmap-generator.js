/* ============================================================
   OMNI backend — src/services/heatmap-generator.js
   Attention Heatmap Generator — produces spatial attention data
   showing where personas focus, skip, and engage with ad content.
   ============================================================ */
'use strict';

/**
 * Generate a 2D attention heatmap grid for a given ad duration.
 * Each cell represents a region of the screen (grid x grid).
 * @param {object[]} reactions - Array of persona reaction results
 * @param {object} opts - { gridSize, duration }
 * @returns {object} Heatmap data
 */
function generateHeatmap(reactions, opts = {}) {
  const gridSize = opts.gridSize || 10;
  const duration = opts.duration || 15;

  // Initialize grid
  const grid = [];
  for (let y = 0; y < gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      grid[y][x] = { attention: 0, clicks: 0, hovers: 0, count: 0 };
    }
  }

  // Simulate attention distribution based on personas
  for (const reaction of reactions) {
    const persona = reaction;
    const outcome = persona.outcome || 'viewed';

    // Each persona has focus patterns based on their archetype
    const focusZones = getFocusZones(persona.archetype, gridSize);

    for (const zone of focusZones) {
      const intensity = getAttentionIntensity(outcome, zone.weight);
      const cell = grid[zone.y][zone.x];
      cell.attention += intensity;
      cell.count++;
      if (outcome === 'purchased' || outcome === 'shared') cell.clicks++;
      if (outcome === 'liked') cell.hovers++;
    }
  }

  // Normalize to 0-1 range
  let maxAttention = 0;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x].attention > maxAttention) maxAttention = grid[y][x].attention;
    }
  }

  const normalizedGrid = grid.map(row =>
    row.map(cell => ({
      attention: maxAttention > 0 ? Math.round(cell.attention / maxAttention * 100) / 100 : 0,
      clicks: cell.clicks,
      hovers: cell.hovers,
      sampleSize: cell.count
    }))
  );

  // Generate time-series heatmap (attention over time)
  const timeSeries = generateTimeSeries(reactions, gridSize, duration);

  // Hot zones: regions with highest attention
  const hotZones = findHotZones(normalizedGrid, gridSize);

  // Cold zones: regions with lowest attention
  const coldZones = findColdZones(normalizedGrid, gridSize);

  return {
    gridSize,
    duration,
    grid: normalizedGrid,
    timeSeries,
    hotZones,
    coldZones,
    summary: {
      avgAttention: calculateAvgAttention(normalizedGrid),
      peakZone: hotZones[0] || { x: 5, y: 5 },
      attentionDistribution: calculateDistribution(normalizedGrid)
    }
  };
}

/**
 * Get focus zones based on persona archetype.
 * Different archetypes focus on different screen areas.
 * @param {string} archetype
 * @param {number} gridSize
 * @returns {object[]} Array of { x, y, weight }
 */
function getFocusZones(archetype, gridSize) {
  const center = Math.floor(gridSize / 2);
  const zones = [];

  // All personas focus on center (product area)
  zones.push({ x: center, y: center, weight: 0.9 });
  zones.push({ x: center - 1, y: center, weight: 0.7 });
  zones.push({ x: center + 1, y: center, weight: 0.7 });
  zones.push({ x: center, y: center - 1, weight: 0.6 });

  // Archetype-specific focus patterns
  const patterns = {
    'The Gen Z Student': [
      { x: center, y: 2, weight: 0.8 }, // Top: headline
      { x: center, y: gridSize - 2, weight: 0.7 }, // Bottom: CTA
    ],
    'The Suburban Parent': [
      { x: 2, y: center, weight: 0.6 }, // Left: product details
      { x: center, y: 3, weight: 0.7 }, // Top: brand name
    ],
    'The C-Suite Executive': [
      { x: center, y: 3, weight: 0.8 }, // Top: headline
      { x: center - 2, y: center, weight: 0.5 }, // Left: data/stats
    ],
    'The Fitness Influencer': [
      { x: center, y: center, weight: 0.95 }, // Center: product
      { x: center + 2, y: center, weight: 0.6 }, // Right: lifestyle
    ],
    'The Eco Warrior': [
      { x: 2, y: 2, weight: 0.7 }, // Top-left: brand story
      { x: center, y: gridSize - 3, weight: 0.6 }, // Bottom: impact info
    ],
    'The Luxury Shopper': [
      { x: center, y: center, weight: 0.95 }, // Center: product
      { x: 2, y: 2, weight: 0.5 }, // Top-left: brand logo
    ],
    'The Fashionista': [
      { x: center, y: center, weight: 0.9 }, // Center: product
      { x: center, y: 2, weight: 0.7 }, // Top: headline
      { x: gridSize - 2, y: 2, weight: 0.5 }, // Top-right: lifestyle
    ],
    'The Budget Millennial': [
      { x: center, y: gridSize - 2, weight: 0.8 }, // Bottom: price/CTA
      { x: 2, y: center, weight: 0.6 }, // Left: value prop
    ],
    'The Tech Early Adopter': [
      { x: center, y: center, weight: 0.85 }, // Center: product
      { x: center + 2, y: center - 1, weight: 0.6 }, // Right: specs
    ],
    'The Foodie': [
      { x: center, y: center, weight: 0.95 }, // Center: food/product
      { x: center, y: 2, weight: 0.7 }, // Top: brand
    ]
  };

  const pattern = patterns[archetype] || [
    { x: center - 1, y: center + 1, weight: 0.5 },
    { x: center + 1, y: center - 1, weight: 0.5 }
  ];

  zones.push(...pattern);
  return zones;
}

/**
 * Get attention intensity based on outcome.
 * @param {string} outcome
 * @param {number} zoneWeight
 * @returns {number}
 */
function getAttentionIntensity(outcome, zoneWeight) {
  const multipliers = {
    purchased: 1.5,
    shared: 1.3,
    liked: 1.0,
    viewed: 0.6,
    skipped: 0.3
  };
  return zoneWeight * (multipliers[outcome] || 0.5);
}

/**
 * Generate time-series heatmap data.
 * @param {object[]} reactions
 * @param {number} gridSize
 * @param {number} duration
 * @returns {object[]}
 */
function generateTimeSeries(reactions, gridSize, duration) {
  const intervals = Math.min(10, duration);
  const intervalDuration = duration / intervals;
  const series = [];

  for (let i = 0; i < intervals; i++) {
    const timeStart = Math.round(i * intervalDuration);
    const timeEnd = Math.round((i + 1) * intervalDuration);
    const activeReactions = reactions.filter(r => {
      const dropOff = r.dropOffSecond || duration;
      return dropOff > timeStart;
    });

    const engagementRate = activeReactions.length / Math.max(reactions.length, 1);

    series.push({
      timeRange: `${timeStart}s-${timeEnd}s`,
      startSecond: timeStart,
      endSecond: timeEnd,
      engagementRate: Math.round(engagementRate * 100) / 100,
      activePersonas: activeReactions.length,
      dominantEmotion: getDominantEmotion(activeReactions, timeStart)
    });
  }

  return series;
}

/**
 * Get dominant emotion at a time point.
 * @param {object[]} reactions
 * @param {number} second
 * @returns {string}
 */
function getDominantEmotion(reactions, second) {
  const emotions = {};
  for (const r of reactions) {
    const journey = r.journey || [];
    for (const point of journey) {
      if (point.second >= second) {
        emotions[point.emotion] = (emotions[point.emotion] || 0) + 1;
        break;
      }
    }
  }
  return Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
}

/**
 * Find hot zones (highest attention regions).
 * @param {object[][]} grid
 * @param {number} gridSize
 * @returns {object[]}
 */
function findHotZones(grid, gridSize) {
  const zones = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x].attention > 0.7) {
        zones.push({ x, y, attention: grid[y][x].attention });
      }
    }
  }
  return zones.sort((a, b) => b.attention - a.attention);
}

/**
 * Find cold zones (lowest attention regions).
 * @param {object[][]} grid
 * @param {number} gridSize
 * @returns {object[]}
 */
function findColdZones(grid, gridSize) {
  const zones = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x].attention < 0.3 && grid[y][x].sampleSize > 0) {
        zones.push({ x, y, attention: grid[y][x].attention });
      }
    }
  }
  return zones.sort((a, b) => a.attention - b.attention);
}

/**
 * Calculate average attention across grid.
 * @param {object[][]} grid
 * @returns {number}
 */
function calculateAvgAttention(grid) {
  let total = 0;
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      total += cell.attention;
      count++;
    }
  }
  return Math.round(total / count * 100) / 100;
}

/**
 * Calculate attention distribution (center vs edges).
 * @param {object[][]} grid
 * @returns {object}
 */
function calculateDistribution(grid) {
  const size = grid.length;
  const center = Math.floor(size / 2);
  let centerAttention = 0;
  let edgeAttention = 0;
  let centerCount = 0;
  let edgeCount = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isCenter = Math.abs(x - center) <= 1 && Math.abs(y - center) <= 1;
      if (isCenter) {
        centerAttention += grid[y][x].attention;
        centerCount++;
      } else {
        edgeAttention += grid[y][x].attention;
        edgeCount++;
      }
    }
  }

  return {
    center: centerCount > 0 ? Math.round(centerAttention / centerCount * 100) / 100 : 0,
    edges: edgeCount > 0 ? Math.round(edgeAttention / edgeCount * 100) / 100 : 0,
    ratio: edgeCount > 0 && centerCount > 0
      ? Math.round((centerAttention / centerCount) / (edgeAttention / edgeCount) * 100) / 100
      : 1
  };
}

module.exports = {
  generateHeatmap,
  getFocusZones,
  getAttentionIntensity,
  generateTimeSeries,
  findHotZones,
  findColdZones,
  calculateAvgAttention,
  calculateDistribution
};
