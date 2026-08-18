/* ============================================================
   OMNI backend — src/services/persona-templates.js
   Persona archetype library — 20+ detailed behavioral templates
   used to seed AI-generated ghost users.
   ============================================================ */
'use strict';

const ARCHETYPES = [
  {
    id: 'urban-professional-25',
    name: 'The Urban Professional',
    demographics: { ageRange: [25, 35], gender: 'any', location: 'metro', income: 'high' },
    interests: ['tech', 'fashion', 'fitness', 'dining', 'travel'],
    behaviors: { scrollSpeed: 'fast', adTolerance: 'low', purchaseFrequency: 'monthly', device: 'mobile' },
    psychology: { openness: 0.8, conscientiousness: 0.7, extraversion: 0.6, agreeableness: 0.5, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.4, likeRate: 0.35, shareRate: 0.08, purchaseRate: 0.04 },
    emotionalRange: ['curious', 'skeptical', 'impressed', 'convinced'],
    attentionSpan: 6,
    triggers: ['social proof', 'exclusivity', 'time savings', 'status']
  },
  {
    id: 'suburban-parent-32',
    name: 'The Suburban Parent',
    demographics: { ageRange: [30, 42], gender: 'any', location: 'suburban', income: 'medium' },
    interests: ['family', 'home improvement', 'cooking', 'kids activities', 'budgeting'],
    behaviors: { scrollSpeed: 'medium', adTolerance: 'medium', purchaseFrequency: 'weekly', device: 'mobile' },
    psychology: { openness: 0.5, conscientiousness: 0.8, extraversion: 0.4, agreeableness: 0.7, neuroticism: 0.5 },
    reactionProfile: { skipRate: 0.3, likeRate: 0.4, shareRate: 0.12, purchaseRate: 0.06 },
    emotionalRange: ['curious', 'interested', 'concerned', 'convinced'],
    attentionSpan: 10,
    triggers: ['value for money', 'family benefit', 'safety', 'convenience']
  },
  {
    id: 'gen-z-student-20',
    name: 'The Gen Z Student',
    demographics: { ageRange: [18, 24], gender: 'any', location: 'urban', income: 'low' },
    interests: ['gaming', 'social media', 'music', 'streetwear', 'sustainability'],
    behaviors: { scrollSpeed: 'very fast', adTolerance: 'very low', purchaseFrequency: 'rarely', device: 'mobile' },
    psychology: { openness: 0.9, conscientiousness: 0.3, extraversion: 0.7, agreeableness: 0.6, neuroticism: 0.4 },
    reactionProfile: { skipRate: 0.55, likeRate: 0.25, shareRate: 0.1, purchaseRate: 0.01 },
    emotionalRange: ['bored', 'amused', 'interested', 'excited'],
    attentionSpan: 4,
    triggers: ['humor', 'authenticity', 'trend', 'peer approval']
  },
  {
    id: 'executive-40',
    name: 'The C-Suite Executive',
    demographics: { ageRange: [38, 55], gender: 'any', location: 'metro', income: 'very high' },
    interests: ['business', 'investing', 'luxury travel', 'fine dining', 'wellness'],
    behaviors: { scrollSpeed: 'fast', adTolerance: 'low', purchaseFrequency: 'monthly', device: 'desktop' },
    psychology: { openness: 0.6, conscientiousness: 0.9, extraversion: 0.5, agreeableness: 0.4, neuroticism: 0.2 },
    reactionProfile: { skipRate: 0.5, likeRate: 0.25, shareRate: 0.04, purchaseRate: 0.05 },
    emotionalRange: ['skeptical', 'analytical', 'impressed', 'decisive'],
    attentionSpan: 8,
    triggers: ['ROI', 'exclusivity', 'quality', 'efficiency']
  },
  {
    id: 'fitness-influencer-28',
    name: 'The Fitness Influencer',
    demographics: { ageRange: [24, 34], gender: 'any', location: 'urban', income: 'medium' },
    interests: ['fitness', 'nutrition', 'supplements', 'activewear', 'content creation'],
    behaviors: { scrollSpeed: 'medium', adTolerance: 'medium', purchaseFrequency: 'bi-weekly', device: 'mobile' },
    psychology: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.9, agreeableness: 0.6, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.2, likeRate: 0.5, shareRate: 0.2, purchaseRate: 0.08 },
    emotionalRange: ['curious', 'excited', 'evaluating', 'enthusiastic'],
    attentionSpan: 12,
    triggers: ['results', 'community', 'before/after', 'influencer endorsement']
  },
  {
    id: 'tech-early-adopter-26',
    name: 'The Tech Early Adopter',
    demographics: { ageRange: [22, 34], gender: 'male', location: 'metro', income: 'high' },
    interests: ['technology', 'gadgets', 'programming', 'AI', 'startups'],
    behaviors: { scrollSpeed: 'very fast', adTolerance: 'low', purchaseFrequency: 'monthly', device: 'desktop' },
    psychology: { openness: 0.95, conscientiousness: 0.6, extraversion: 0.4, agreeableness: 0.5, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.35, likeRate: 0.3, shareRate: 0.12, purchaseRate: 0.03 },
    emotionalRange: ['skeptical', 'intrigued', 'analytical', 'excited'],
    attentionSpan: 5,
    triggers: ['innovation', 'specs', 'early access', 'technical detail']
  },
  {
    id: 'health-conscious-mom-35',
    name: 'The Health-Conscious Mom',
    demographics: { ageRange: [30, 42], gender: 'female', location: 'suburban', income: 'medium' },
    interests: ['organic food', 'wellness', 'yoga', 'natural products', 'parenting'],
    behaviors: { scrollSpeed: 'medium', adTolerance: 'medium', purchaseFrequency: 'weekly', device: 'mobile' },
    psychology: { openness: 0.6, conscientiousness: 0.9, extraversion: 0.5, agreeableness: 0.8, neuroticism: 0.4 },
    reactionProfile: { skipRate: 0.25, likeRate: 0.45, shareRate: 0.15, purchaseRate: 0.07 },
    emotionalRange: ['cautious', 'interested', 'evaluating', 'trustful'],
    attentionSpan: 11,
    triggers: ['safety', 'natural ingredients', 'doctor recommended', 'other moms']
  },
  {
    id: 'streetwear-collector-23',
    name: 'The Streetwear Collector',
    demographics: { ageRange: [18, 28], gender: 'male', location: 'urban', income: 'medium' },
    interests: ['sneakers', 'streetwear', 'hypebeast culture', 'reselling', 'hip-hop'],
    behaviors: { scrollSpeed: 'fast', adTolerance: 'low', purchaseFrequency: 'monthly', device: 'mobile' },
    psychology: { openness: 0.8, conscientiousness: 0.5, extraversion: 0.7, agreeableness: 0.4, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.3, likeRate: 0.4, shareRate: 0.15, purchaseRate: 0.03 },
    emotionalRange: ['bored', 'interested', 'hyped', 'obsessed'],
    attentionSpan: 5,
    triggers: ['scarcity', 'exclusivity', 'collab', 'drop culture']
  },
  {
    id: 'eco-warrior-29',
    name: 'The Eco Warrior',
    demographics: { ageRange: [24, 36], gender: 'any', location: 'urban', income: 'medium' },
    interests: ['sustainability', 'veganism', 'climate activism', 'zero waste', 'ethical brands'],
    behaviors: { scrollSpeed: 'medium', adTolerance: 'medium', purchaseFrequency: 'monthly', device: 'mobile' },
    psychology: { openness: 0.85, conscientiousness: 0.7, extraversion: 0.5, agreeableness: 0.8, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.2, likeRate: 0.45, shareRate: 0.18, purchaseRate: 0.05 },
    emotionalRange: ['skeptical', 'hopeful', 'inspired', 'committed'],
    attentionSpan: 10,
    triggers: ['environmental impact', 'carbon neutral', 'ethical sourcing', 'transparency']
  },
  {
    id: 'luxury-shopper-45',
    name: 'The Luxury Shopper',
    demographics: { ageRange: [38, 58], gender: 'female', location: 'metro', income: 'very high' },
    interests: ['fashion', 'jewelry', 'art', 'fine dining', 'spa'],
    behaviors: { scrollSpeed: 'slow', adTolerance: 'medium', purchaseFrequency: 'monthly', device: 'desktop' },
    psychology: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.6, agreeableness: 0.5, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.4, likeRate: 0.3, shareRate: 0.05, purchaseRate: 0.06 },
    emotionalRange: ['unimpressed', 'curious', 'intrigued', 'desirous'],
    attentionSpan: 7,
    triggers: ['exclusivity', 'craftsmanship', 'heritage', 'limited edition']
  },
  {
    id: 'gaming-enthusiast-22',
    name: 'The Gaming Enthusiast',
    demographics: { ageRange: [18, 30], gender: 'male', location: 'any', income: 'low-medium' },
    interests: ['gaming', 'esports', 'anime', 'technology', 'streaming'],
    behaviors: { scrollSpeed: 'fast', adTolerance: 'low', purchaseFrequency: 'rarely', device: 'desktop' },
    psychology: { openness: 0.7, conscientiousness: 0.4, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.4 },
    reactionProfile: { skipRate: 0.45, likeRate: 0.3, shareRate: 0.1, purchaseRate: 0.02 },
    emotionalRange: ['bored', 'annoyed', 'amused', 'excited'],
    attentionSpan: 4,
    triggers: ['free stuff', 'exclusive in-game content', 'meme-worthy', 'streamer endorsed']
  },
  {
    id: 'small-business-owner-38',
    name: 'The Small Business Owner',
    demographics: { ageRange: [32, 48], gender: 'any', location: 'suburban', income: 'medium' },
    interests: ['business growth', 'marketing', 'productivity', 'networking', 'leadership'],
    behaviors: { scrollSpeed: 'medium', adTolerance: 'medium', purchaseFrequency: 'weekly', device: 'mobile' },
    psychology: { openness: 0.6, conscientiousness: 0.85, extraversion: 0.6, agreeableness: 0.6, neuroticism: 0.4 },
    reactionProfile: { skipRate: 0.25, likeRate: 0.4, shareRate: 0.1, purchaseRate: 0.06 },
    emotionalRange: ['skeptical', 'evaluating', 'interested', 'convinced'],
    attentionSpan: 9,
    triggers: ['case studies', 'ROI proof', 'free trial', 'peer success stories']
  },
  {
    id: 'retiree-62',
    name: 'The Active Retiree',
    demographics: { ageRange: [58, 72], gender: 'any', location: 'suburban', income: 'medium' },
    interests: ['travel', 'grandkids', 'gardening', 'health', 'volunteering'],
    behaviors: { scrollSpeed: 'slow', adTolerance: 'high', purchaseFrequency: 'monthly', device: 'tablet' },
    psychology: { openness: 0.4, conscientiousness: 0.8, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.15, likeRate: 0.5, shareRate: 0.1, purchaseRate: 0.04 },
    emotionalRange: ['cautious', 'interested', 'nostalgic', 'trusting'],
    attentionSpan: 14,
    triggers: ['ease of use', 'trusted brand', 'guarantee', 'personal story']
  },
  {
    id: 'fashionista-27',
    name: 'The Fashionista',
    demographics: { ageRange: [22, 34], gender: 'female', location: 'metro', income: 'medium-high' },
    interests: ['fashion', 'beauty', 'lifestyle', 'trends', 'social media'],
    behaviors: { scrollSpeed: 'fast', adTolerance: 'low', purchaseFrequency: 'bi-weekly', device: 'mobile' },
    psychology: { openness: 0.85, conscientiousness: 0.6, extraversion: 0.8, agreeableness: 0.6, neuroticism: 0.4 },
    reactionProfile: { skipRate: 0.3, likeRate: 0.4, shareRate: 0.15, purchaseRate: 0.05 },
    emotionalRange: ['bored', 'curious', 'inspired', 'obsessed'],
    attentionSpan: 6,
    triggers: ['trend setting', 'aesthetic', 'influencer pick', 'limited run']
  },
  {
    id: 'budget-millennial-28',
    name: 'The Budget Millennial',
    demographics: { ageRange: [25, 34], gender: 'any', location: 'urban', income: 'low' },
    interests: ['deals', 'freebies', 'budgeting apps', 'side hustles', 'experiences'],
    behaviors: { scrollSpeed: 'fast', adTolerance: 'low', purchaseFrequency: 'rarely', device: 'mobile' },
    psychology: { openness: 0.7, conscientiousness: 0.5, extraversion: 0.6, agreeableness: 0.7, neuroticism: 0.5 },
    reactionProfile: { skipRate: 0.5, likeRate: 0.3, shareRate: 0.12, purchaseRate: 0.01 },
    emotionalRange: ['skeptical', 'interested', 'tempted', 'regretful'],
    attentionSpan: 5,
    triggers: ['discount', 'free shipping', 'limited offer', 'money-back guarantee']
  },
  {
    id: 'wellness-guru-33',
    name: 'The Wellness Guru',
    demographics: { ageRange: [28, 40], gender: 'female', location: 'urban', income: 'high' },
    interests: ['meditation', 'plant-based', 'essential oils', 'mental health', 'retreats'],
    behaviors: { scrollSpeed: 'slow', adTolerance: 'medium', purchaseFrequency: 'monthly', device: 'mobile' },
    psychology: { openness: 0.9, conscientiousness: 0.7, extraversion: 0.4, agreeableness: 0.8, neuroticism: 0.2 },
    reactionProfile: { skipRate: 0.2, likeRate: 0.5, shareRate: 0.18, purchaseRate: 0.06 },
    emotionalRange: ['calm', 'curious', 'aligned', 'devoted'],
    attentionSpan: 12,
    triggers: ['holistic benefit', 'mindfulness', 'natural', 'community']
  },
  {
    id: 'crypto-bro-26',
    name: 'The Crypto Enthusiast',
    demographics: { ageRange: [22, 34], gender: 'male', location: 'any', income: 'variable' },
    interests: ['crypto', 'defi', 'web3', 'trading', 'tech podcasts'],
    behaviors: { scrollSpeed: 'very fast', adTolerance: 'very low', purchaseFrequency: 'impulsive', device: 'desktop' },
    psychology: { openness: 0.9, conscientiousness: 0.3, extraversion: 0.6, agreeableness: 0.3, neuroticism: 0.5 },
    reactionProfile: { skipRate: 0.5, likeRate: 0.25, shareRate: 0.1, purchaseRate: 0.02 },
    emotionalRange: ['skeptical', 'hyped', 'FOMO', 'either euphoric or bitter'],
    attentionSpan: 3,
    triggers: ['moon', 'exclusive drop', 'token utility', 'early access']
  },
  {
    id: 'pet-parent-31',
    name: 'The Devoted Pet Parent',
    demographics: { ageRange: [25, 40], gender: 'any', location: 'suburban', income: 'medium' },
    interests: ['pets', 'animal welfare', 'pet tech', 'organic pet food', 'pet fashion'],
    behaviors: { scrollSpeed: 'medium', adTolerance: 'medium', purchaseFrequency: 'weekly', device: 'mobile' },
    psychology: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.6, agreeableness: 0.9, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.2, likeRate: 0.5, shareRate: 0.2, purchaseRate: 0.07 },
    emotionalRange: ['indifferent', 'charmed', 'emotionally moved', 'loyal'],
    attentionSpan: 8,
    triggers: ['cute factor', 'pet health', 'vet approved', 'other pet parents']
  },
  {
    id: 'audiophile-36',
    name: 'The Audiophile',
    demographics: { ageRange: [28, 45], gender: 'male', location: 'urban', income: 'high' },
    interests: ['headphones', 'vinyl', 'hi-fi', 'music production', 'concerts'],
    behaviors: { scrollSpeed: 'medium', adTolerance: 'low', purchaseFrequency: 'quarterly', device: 'desktop' },
    psychology: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.3, agreeableness: 0.4, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.4, likeRate: 0.3, shareRate: 0.06, purchaseRate: 0.04 },
    emotionalRange: ['unimpressed', 'analytical', 'impressed', 'devoted'],
    attentionSpan: 7,
    triggers: ['sound quality', 'spec sheet', 'expert review', 'brand heritage']
  },
  {
    id: 'foodie-29',
    name: 'The Foodie',
    demographics: { ageRange: [24, 38], gender: 'any', location: 'urban', income: 'medium' },
    interests: ['cooking', 'restaurants', 'food photography', 'wine', 'food trucks'],
    behaviors: { scrollSpeed: 'medium', adTolerance: 'medium', purchaseFrequency: 'weekly', device: 'mobile' },
    psychology: { openness: 0.85, conscientiousness: 0.6, extraversion: 0.7, agreeableness: 0.7, neuroticism: 0.3 },
    reactionProfile: { skipRate: 0.25, likeRate: 0.45, shareRate: 0.18, purchaseRate: 0.06 },
    emotionalRange: ['hungry', 'intrigued', 'tempted', 'satisfied'],
    attentionSpan: 8,
    triggers: ['visual appeal', 'chef endorsement', 'unique flavor', 'foodie community']
  },
  {
    id: 'minimalist-30',
    name: 'The Minimalist',
    demographics: { ageRange: [25, 38], gender: 'any', location: 'urban', income: 'medium' },
    interests: ['minimalism', 'organization', 'quality over quantity', 'design', 'intentional living'],
    behaviors: { scrollSpeed: 'slow', adTolerance: 'low', purchaseFrequency: 'rarely', device: 'desktop' },
    psychology: { openness: 0.7, conscientiousness: 0.9, extraversion: 0.3, agreeableness: 0.6, neuroticism: 0.2 },
    reactionProfile: { skipRate: 0.6, likeRate: 0.2, shareRate: 0.05, purchaseRate: 0.03 },
    emotionalRange: ['annoyed', 'cautiously interested', 'selective', 'committed'],
    attentionSpan: 9,
    triggers: ['simplicity', 'durability', 'multi-purpose', 'no-waste']
  }
];

/**
 * Get a random subset of archetypes weighted by probability.
 * @param {number} count - Number of personas to generate
 * @returns {object[]} Selected archetype templates
 */
function selectArchetypes(count) {
  const selected = [];
  const pool = [...ARCHETYPES];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  // If we need more than archetypes, recycle with variation
  while (selected.length < count) {
    const base = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    selected.push({ ...base, id: `${base.id}-v${selected.length}` });
  }
  return selected;
}

/**
 * Get archetype by id.
 * @param {string} id
 * @returns {object|undefined}
 */
function getArchetype(id) {
  return ARCHETYPES.find(a => a.id === id);
}

/**
 * Get all archetypes.
 * @returns {object[]}
 */
function getAllArchetypes() {
  return [...ARCHETYPES];
}

module.exports = {
  ARCHETYPES,
  selectArchetypes,
  getArchetype,
  getAllArchetypes
};
