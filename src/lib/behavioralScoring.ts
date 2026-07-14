import { Contact, MeetingNote, NoteCategory, BehavioralWeightFactor, BehavioralSignalScores, MyselfProfile, BehavioralProfile } from '../types';

// --- Tunable weighting constants ---
// Category importance for risk/read purposes before recency decay is applied.
export const CATEGORY_WEIGHTS: Record<NoteCategory, number> = {
  'Negotiation': 1.5,
  'Client Pitch': 1.2,
  'Strategy Sync': 1.2,
  'Discovery': 1.1,
  'Follow-up': 1.0,
  'Support': 1.0,
  'Catch-up': 0.7,
};
const DEFAULT_CATEGORY_WEIGHT = 1.0;

// Any note landing at or below this sentiment gets its weight boosted regardless of
// category, so a friction moment logged under "Catch-up" isn't under-weighted just
// because NoteCategory has no literal "Friction" value.
const FRICTION_SENTIMENT_THRESHOLD = 4;
const FRICTION_BOOST_MULTIPLIER = 1.3;

// Recency decay half-life for how much an interaction contributes to the read.
export const HALF_LIFE_DAYS = 75;
// Separate, faster decay used purely for the "recency" freshness signal.
const RECENCY_DECAY_DAYS = 60;

// Fixed weight for direct user judgments (tags, relationship status, free-text notes) -
// these are explicit inputs, not inferred signal, so they are not recency-decayed.
export const DIRECT_INPUT_WEIGHT = 2.0;

const CONFIDENCE_PER_NOTE = 12;
const CONFIDENCE_RECENCY_WEIGHT = 0.2;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const BEHAVIORAL_DISCLAIMER = 'This is a behavioral/communication-style read generated from observed interaction patterns (sentiment, engagement, and your own notes/tags). It is NOT a clinical, psychological, or medical assessment, and it does not consider or infer any protected characteristics. Treat it as a professional coaching aid, not a definitive judgment of the person.';

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function computeNoteWeight(note: MeetingNote, now: number): { baseWeight: number; decayMultiplier: number; effectiveWeight: number } {
  let baseWeight = CATEGORY_WEIGHTS[note.category] ?? DEFAULT_CATEGORY_WEIGHT;
  if (note.sentimentScore <= FRICTION_SENTIMENT_THRESHOLD) {
    baseWeight *= FRICTION_BOOST_MULTIPLIER;
  }
  const daysSince = Math.max(0, (now - new Date(note.date).getTime()) / MS_PER_DAY);
  const decayMultiplier = Math.exp(-daysSince / HALF_LIFE_DAYS);
  return { baseWeight, decayMultiplier, effectiveWeight: baseWeight * decayMultiplier };
}

/**
 * Builds the full transparent evidence table backing a contact's behavioral read:
 * one row per note (recency-decayed), plus fixed high-weight rows for the user's
 * own direct judgments (tags, relationship status, free-text notes).
 */
export function computeWeightedEvidence(contact: Contact, contactNotes: MeetingNote[]): BehavioralWeightFactor[] {
  const now = Date.now();

  const noteFactors: BehavioralWeightFactor[] = contactNotes.map(note => {
    const { baseWeight, decayMultiplier, effectiveWeight } = computeNoteWeight(note, now);
    return {
      source: `Note: "${note.title}" (${note.date})`,
      sourceType: 'note',
      baseWeight,
      decayMultiplier,
      effectiveWeight,
    };
  });

  const directFactors: BehavioralWeightFactor[] = [];

  if (contact.tags && contact.tags.length > 0) {
    directFactors.push({
      source: `Tags: ${contact.tags.join(', ')}`,
      sourceType: 'tag',
      baseWeight: DIRECT_INPUT_WEIGHT,
      effectiveWeight: DIRECT_INPUT_WEIGHT,
    });
  }

  directFactors.push({
    source: `Relationship Status: ${contact.relationStatus} / Status Rating: ${contact.status || 'Neutral'}`,
    sourceType: 'relationStatus',
    baseWeight: DIRECT_INPUT_WEIGHT,
    effectiveWeight: DIRECT_INPUT_WEIGHT,
  });

  if (contact.notes && contact.notes.trim()) {
    directFactors.push({
      source: `Private Context Notes: "${truncate(contact.notes.trim(), 80)}"`,
      sourceType: 'contactNotes',
      baseWeight: DIRECT_INPUT_WEIGHT,
      effectiveWeight: DIRECT_INPUT_WEIGHT,
    });
  }

  return [...noteFactors, ...directFactors].sort((a, b) => b.effectiveWeight - a.effectiveWeight);
}

function weightedAverage(items: Array<{ value: number; weight: number }>): number {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight <= 0) return 0;
  return items.reduce((sum, i) => sum + i.value * i.weight, 0) / totalWeight;
}

/**
 * Computes deterministic 0-100 signal scores from a contact's interaction history.
 * These are the numbers the UI can trust and chart directly - no AI guesswork involved.
 */
export function computeSignalScores(contactNotes: MeetingNote[]): BehavioralSignalScores {
  if (contactNotes.length === 0) {
    return { rapport: 0, engagement: 0, frictionRisk: 0, recency: 0, confidence: 0 };
  }

  const now = Date.now();
  const weighted = contactNotes.map(note => ({ note, ...computeNoteWeight(note, now) }));
  const totalWeight = weighted.reduce((sum, w) => sum + w.effectiveWeight, 0);

  const rapportRaw = weightedAverage(weighted.map(w => ({ value: w.note.sentimentScore, weight: w.effectiveWeight })));
  const engagementRaw = weightedAverage(weighted.map(w => ({ value: w.note.engagementLevel, weight: w.effectiveWeight })));

  const frictionWeight = weighted
    .filter(w => w.note.sentimentScore <= FRICTION_SENTIMENT_THRESHOLD || w.note.category === 'Negotiation')
    .reduce((sum, w) => sum + w.effectiveWeight, 0);
  const frictionRisk = totalWeight > 0 ? (frictionWeight / totalWeight) * 100 : 0;

  const mostRecentDaysAgo = Math.min(
    ...contactNotes.map(n => Math.max(0, (now - new Date(n.date).getTime()) / MS_PER_DAY))
  );
  const recency = 100 * Math.exp(-mostRecentDaysAgo / RECENCY_DECAY_DAYS);

  const confidenceBase = contactNotes.length * CONFIDENCE_PER_NOTE;
  const confidence = Math.min(100, Math.round(confidenceBase + recency * CONFIDENCE_RECENCY_WEIGHT));

  return {
    rapport: Math.round((rapportRaw / 10) * 100),
    engagement: Math.round((engagementRaw / 10) * 100),
    frictionRisk: Math.round(frictionRisk),
    recency: Math.round(recency),
    confidence,
  };
}

/**
 * Local, no-API-key/unavailable fallback qualitative synthesis. Template-driven off
 * which signal score dominates, always carrying the fixed professional disclaimer.
 */
export function generateFallbackBehavioralSynthesis(
  signalScores: BehavioralSignalScores,
  contact: Contact,
  userProfile?: MyselfProfile
): Omit<BehavioralProfile, 'contactId' | 'computedAt' | 'signalScores' | 'weightingBreakdown'> {
  const { rapport, engagement, frictionRisk, recency, confidence } = signalScores;

  const traits: string[] = [];
  if (rapport >= 70) traits.push('Warm and receptive in recent exchanges');
  else if (rapport <= 40) traits.push('Guarded or reserved in recent exchanges');
  else traits.push('Even-keeled, moderate rapport');

  if (engagement >= 70) traits.push('Highly engaged and responsive to outreach');
  else if (engagement <= 40) traits.push('Shows signs of distraction or low engagement');

  if (frictionRisk >= 50) traits.push('Prone to friction around negotiation or pricing topics');

  const motivators: string[] = ['Clear, direct communication', 'Predictable follow-through on commitments'];
  if (contact.relationStatus === 'Warm' || contact.status === 'Exceptional') {
    motivators.push('Values relationship continuity and trust-building');
  }

  const riskFactors: string[] = [];
  if (frictionRisk >= 50) riskFactors.push('Recent negotiation-related exchanges show measurable tension');
  if (recency <= 20) riskFactors.push('No recent contact logged - relationship may be decaying');
  if (confidence < 40) riskFactors.push('Limited interaction history - this read is preliminary and should be treated with caution');
  if (riskFactors.length === 0) riskFactors.push('No significant risk factors detected in current evidence');

  let recommendedApproach = `Based on ${signalScores.confidence < 40 ? 'limited' : 'observed'} interaction history, lead with ${rapport >= 60 ? 'relationship continuity' : 'a structured, low-pressure check-in'} and keep engagement ${engagement >= 60 ? 'moving at the current pace' : 'active with more frequent, lighter touchpoints'}.`;
  if (confidence < 40) {
    recommendedApproach += ' Confidence in this read is low due to limited interaction history - treat it as preliminary and revisit after more interactions are logged.';
  }

  const selfSummary = userProfile?.communicationStyle
    ? `Your "${userProfile.communicationStyle}" communication style paired with this contact's ${rapport >= 60 ? 'receptive' : 'reserved'} tendencies suggests ${rapport >= 60 ? 'you can move quickly to substantive topics' : 'investing extra time in rapport before diving into asks'}.`
    : 'Set your own communication style in the Myself tab for a tailored compatibility read.';

  const adaptationTips = [
    engagement >= 60 ? 'Maintain current cadence - engagement is healthy.' : 'Shorten check-in cycles to rebuild engagement momentum.',
    frictionRisk >= 50 ? 'Bring concessions or flexible framing into negotiation-adjacent conversations.' : 'Continue current negotiation approach - low friction detected.',
  ];

  return {
    traits,
    motivators,
    riskFactors,
    recommendedApproach,
    selfCompatibility: {
      summary: selfSummary,
      adaptationTips,
    },
    isSimulated: true,
    disclaimer: BEHAVIORAL_DISCLAIMER,
  };
}
