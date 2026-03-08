// ─── Card Types & Utilities ───────────────────────────────────────────────────

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Suit = '♠' | '♥' | '♦' | '♣';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];

export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  '♠': 'black',
  '♥': 'red',
  '♦': 'red',
  '♣': 'black',
};

/** Numeric value of a rank (Ace = 11 by default, face cards = 10) */
export function rankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

/** Compute best hand value. Returns { total, soft } */
export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    total += rankValue(card.rank);
    if (card.rank === 'A') aces++;
  }

  // Reduce aces from 11 to 1 as needed
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return { total, soft: aces > 0 };
}

/** Check if hand is a natural blackjack (exactly 2 cards totaling 21) */
export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

/** Check if hand is busted */
export function isBusted(cards: Card[]): boolean {
  return handValue(cards).total > 21;
}

/** Check if hand can be split (two cards of same rank value) */
export function canSplit(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  return rankValue(cards[0].rank) === rankValue(cards[1].rank);
}

/** Create a full shoe of N decks */
export function createShoe(numDecks: number): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit });
      }
    }
  }
  return shoe;
}

/**
 * Build a frequency map of remaining cards in the shoe,
 * after removing known cards.
 * Key = rank, Value = count of that rank remaining.
 */
export function remainingRankCounts(
  numDecks: number,
  knownCards: Card[]
): Map<Rank, number> {
  const counts = new Map<Rank, number>();

  // Full shoe counts
  for (const rank of RANKS) {
    counts.set(rank, numDecks * 4); // 4 suits per deck
  }

  // Subtract known cards
  for (const card of knownCards) {
    const current = counts.get(card.rank) ?? 0;
    counts.set(card.rank, Math.max(0, current - 1));
  }

  return counts;
}

/** Total number of remaining cards */
export function remainingCardCount(numDecks: number, knownCards: Card[]): number {
  return numDecks * 52 - knownCards.length;
}

/** Card to display string */
export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/** Compare two cards for equality */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}
