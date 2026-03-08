// ─── Card Counting & Shoe Tracking ───────────────────────────────────────────

import { type Card, type Rank, RANKS, remainingRankCounts, remainingCardCount } from './cards';

// Hi-Lo counting values
const HI_LO_VALUES: Record<Rank, number> = {
  '2': 1, '3': 1, '4': 1, '5': 1, '6': 1,
  '7': 0, '8': 0, '9': 0,
  '10': -1, 'J': -1, 'Q': -1, 'K': -1, 'A': -1,
};

export interface ShoeStats {
  runningCount: number;
  trueCount: number;
  remainingCards: number;
  remainingDecks: number;
  rankDistribution: Map<Rank, number>;
  penetration: number; // percentage of shoe dealt
  betRecommendation: BetRecommendation;
}

export type BetRecommendation = 'minimum' | 'low' | 'medium' | 'high' | 'maximum';

/**
 * Compute Hi-Lo running count from all known/tracked cards
 */
export function runningCount(trackedCards: Card[]): number {
  return trackedCards.reduce((sum, card) => sum + HI_LO_VALUES[card.rank], 0);
}

/**
 * Compute true count = running count / remaining decks
 */
export function trueCount(trackedCards: Card[], numDecks: number): number {
  const rc = runningCount(trackedCards);
  const remaining = remainingCardCount(numDecks, trackedCards);
  const remainingDecks = remaining / 52;
  if (remainingDecks <= 0) return 0;
  return rc / remainingDecks;
}

/**
 * Get bet sizing recommendation based on true count
 */
export function betRecommendation(tc: number): BetRecommendation {
  if (tc <= 0) return 'minimum';
  if (tc <= 1) return 'low';
  if (tc <= 2) return 'medium';
  if (tc <= 3) return 'high';
  return 'maximum';
}

/**
 * Get bet multiplier suggestion based on true count
 */
export function betMultiplier(tc: number): number {
  if (tc <= 0) return 1;
  if (tc <= 1) return 1;
  if (tc <= 2) return 2;
  if (tc <= 3) return 4;
  if (tc <= 4) return 8;
  return 10;
}

/**
 * Compute full shoe statistics
 */
export function computeShoeStats(
  trackedCards: Card[],
  numDecks: number
): ShoeStats {
  const rc = runningCount(trackedCards);
  const remaining = remainingCardCount(numDecks, trackedCards);
  const remainingDecks = remaining / 52;
  const tc = remainingDecks > 0 ? rc / remainingDecks : 0;
  const totalCards = numDecks * 52;
  const penetration = ((totalCards - remaining) / totalCards) * 100;

  return {
    runningCount: rc,
    trueCount: Math.round(tc * 10) / 10,
    remainingCards: remaining,
    remainingDecks: Math.round(remainingDecks * 10) / 10,
    rankDistribution: remainingRankCounts(numDecks, trackedCards),
    penetration: Math.round(penetration * 10) / 10,
    betRecommendation: betRecommendation(tc),
  };
}
