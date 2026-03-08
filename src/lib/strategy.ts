// ─── Blackjack Strategy Engine ────────────────────────────────────────────────
// Computes EV and optimal actions using exact dealer-outcome probabilities
// conditioned on all known (removed) cards.

import {
  type Card,
  type Rank,
  RANKS,
  rankValue,
  handValue,
  isBlackjack,
  canSplit,
  remainingRankCounts,
  remainingCardCount,
} from './cards';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Action = 'stand' | 'hit' | 'double' | 'split' | 'insurance';

export interface ActionEV {
  action: Action;
  ev: number; // Expected value in units of initial bet (1.0 = break even)
}

export interface HandAnalysis {
  handIndex: number;
  playerTotal: number;
  isSoft: boolean;
  isBlackjack: boolean;
  canSplit: boolean;
  canInsure: boolean;
  actions: ActionEV[];
  bestAction: Action;
  winProbability: number;
  loseProbability: number;
  pushProbability: number;
}

// ─── Dealer Outcome Probabilities ─────────────────────────────────────────────
// Computed exactly via recursive enumeration over the remaining deck.
// Dealer stands on all 17s (hard and soft 17).

interface DealerOutcomes {
  probabilities: Map<number, number>; // final total → probability (17–21 + bust=0)
}

/**
 * Compute dealer final outcome probabilities given:
 * - dealer's current cards
 * - remaining deck composition (rank counts)
 * 
 * Dealer stands on 17 (including soft 17 if dealerStandsSoft17 is true).
 * For this implementation: dealer stands on ALL 17s.
 */
function computeDealerOutcomes(
  dealerCards: Card[],
  rankCounts: Map<Rank, number>,
  totalRemaining: number
): DealerOutcomes {
  const outcomes = new Map<number, number>();
  // Initialize
  for (let t = 17; t <= 21; t++) outcomes.set(t, 0);
  outcomes.set(0, 0); // bust

  function recurse(
    currentTotal: number,
    currentAces: number, // aces counted as 11
    counts: Map<Rank, number>,
    remaining: number,
    prob: number
  ) {
    // Reduce aces if busted
    let total = currentTotal;
    let aces = currentAces;
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    if (total >= 17) {
      // Dealer stands
      const key = total > 21 ? 0 : total;
      outcomes.set(key, (outcomes.get(key) ?? 0) + prob);
      return;
    }

    // Dealer must hit — enumerate all possible next cards
    for (const rank of RANKS) {
      const count = counts.get(rank) ?? 0;
      if (count === 0) continue;

      const drawProb = count / remaining;
      const val = rankValue(rank);
      const newAces = rank === 'A' ? aces + 1 : aces;

      // Temporarily remove this card
      counts.set(rank, count - 1);
      recurse(total + val, newAces, counts, remaining - 1, prob * drawProb);
      counts.set(rank, count); // restore
    }
  }

  // Start recursion from dealer's current hand
  const { total: startTotal } = handValue(dealerCards);
  let startAces = 0;
  let rawTotal = 0;
  for (const c of dealerCards) {
    rawTotal += rankValue(c.rank);
    if (c.rank === 'A') startAces++;
  }
  // We need the raw total (before ace reduction) to properly track aces
  let aceReductions = 0;
  let adjTotal = rawTotal;
  let adjAces = startAces;
  while (adjTotal > 21 && adjAces > 0) {
    adjTotal -= 10;
    adjAces--;
    aceReductions++;
  }

  recurse(adjTotal, adjAces, rankCounts, totalRemaining, 1.0);

  return { probabilities: outcomes };
}

// ─── EV Calculations ─────────────────────────────────────────────────────────

/**
 * EV of standing: compare player total vs dealer outcomes
 */
function evStand(
  playerTotal: number,
  playerIsBlackjack: boolean,
  dealerOutcomes: DealerOutcomes
): { ev: number; win: number; lose: number; push: number } {
  let win = 0, lose = 0, push = 0;

  for (const [dealerTotal, prob] of dealerOutcomes.probabilities) {
    if (dealerTotal === 0) {
      // Dealer busts
      win += prob;
    } else if (playerTotal > dealerTotal) {
      win += prob;
    } else if (playerTotal < dealerTotal) {
      lose += prob;
    } else {
      push += prob;
    }
  }

  // Blackjack pays 3:2
  const ev = playerIsBlackjack ? win * 1.5 - lose : win - lose;

  return { ev, win, lose, push };
}

/**
 * EV of hitting: recursively draw cards and compute best subsequent action (hit or stand).
 * To limit computation, we use a simplified recursive approach.
 */
function evHit(
  playerCards: Card[],
  dealerOutcomes: DealerOutcomes,
  rankCounts: Map<Rank, number>,
  totalRemaining: number,
  depth: number = 0
): number {
  if (depth > 8) return -1; // Safety limit — deeply drawn hands are almost certainly busted

  let ev = 0;

  for (const rank of RANKS) {
    const count = rankCounts.get(rank) ?? 0;
    if (count === 0) continue;

    const drawProb = count / totalRemaining;

    // Simulate drawing this card
    const newCards = [...playerCards, { rank, suit: '♠' as const }]; // suit irrelevant for value
    const { total } = handValue(newCards);

    if (total > 21) {
      // Busted
      ev += drawProb * -1;
    } else if (total === 21) {
      // Must stand on 21
      const standResult = evStand(21, false, dealerOutcomes);
      ev += drawProb * standResult.ev;
    } else {
      // Choose best of hit or stand
      const standEV = evStand(total, false, dealerOutcomes).ev;

      rankCounts.set(rank, count - 1);
      const hitEV = evHit(newCards, dealerOutcomes, rankCounts, totalRemaining - 1, depth + 1);
      rankCounts.set(rank, count); // restore

      ev += drawProb * Math.max(standEV, hitEV);
    }
  }

  return ev;
}

/**
 * EV of doubling down: draw exactly one card, double bet
 */
function evDouble(
  playerCards: Card[],
  dealerOutcomes: DealerOutcomes,
  rankCounts: Map<Rank, number>,
  totalRemaining: number
): number {
  let ev = 0;

  for (const rank of RANKS) {
    const count = rankCounts.get(rank) ?? 0;
    if (count === 0) continue;

    const drawProb = count / totalRemaining;
    const newCards = [...playerCards, { rank, suit: '♠' as const }];
    const { total } = handValue(newCards);

    if (total > 21) {
      ev += drawProb * -2; // Lose double bet
    } else {
      const standResult = evStand(total, false, dealerOutcomes);
      ev += drawProb * standResult.ev * 2; // Win/lose is doubled
    }
  }

  return ev;
}

/**
 * EV of splitting: simplified — treat each split hand as a new hand with one card,
 * then draw a second card and play optimally.
 */
function evSplit(
  splitRank: Rank,
  dealerOutcomes: DealerOutcomes,
  rankCounts: Map<Rank, number>,
  totalRemaining: number
): number {
  // Each split hand starts with one card of splitRank
  // We compute EV of one split hand and multiply by 2
  let singleHandEV = 0;

  for (const rank of RANKS) {
    const count = rankCounts.get(rank) ?? 0;
    if (count === 0) continue;

    const drawProb = count / totalRemaining;
    const twoCards: Card[] = [
      { rank: splitRank, suit: '♠' },
      { rank, suit: '♥' },
    ];
    const { total } = handValue(twoCards);

    if (total === 21) {
      // Note: split aces getting 21 typically doesn't count as blackjack
      const standResult = evStand(21, false, dealerOutcomes);
      singleHandEV += drawProb * standResult.ev;
    } else {
      // Play optimally: compare stand, hit, double
      const standEV = evStand(total, false, dealerOutcomes).ev;

      rankCounts.set(rank, count - 1);
      const hitEV = evHit(twoCards, dealerOutcomes, rankCounts, totalRemaining - 1);
      const doubleEV = evDouble(twoCards, dealerOutcomes, rankCounts, totalRemaining - 1);
      rankCounts.set(rank, count); // restore

      singleHandEV += drawProb * Math.max(standEV, hitEV, doubleEV);
    }
  }

  // Two hands, each costing 1 unit
  return singleHandEV * 2;
}

/**
 * EV of insurance: side bet of 0.5 units, pays 2:1 if dealer has blackjack.
 * Dealer must show Ace.
 */
function evInsurance(
  rankCounts: Map<Rank, number>,
  totalRemaining: number
): number {
  // Count 10-value cards remaining
  let tenCount = 0;
  for (const r of ['10', 'J', 'Q', 'K'] as Rank[]) {
    tenCount += rankCounts.get(r) ?? 0;
  }

  const probDealerBJ = tenCount / totalRemaining;
  // Insurance bet: pay 0.5, if dealer BJ get back 0.5 + 1.0 (2:1 payout)
  // EV = probBJ * 1.0 + (1-probBJ) * (-0.5)
  return probDealerBJ * 1.0 + (1 - probDealerBJ) * -0.5;
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

/**
 * Analyze a single player hand against the dealer.
 * 
 * @param handIndex - Index of this hand (0-4)
 * @param playerCards - The player's cards for this hand
 * @param dealerUpCard - The dealer's visible card
 * @param allKnownCards - ALL cards visible on the table (all 5 hands + dealer up card)
 * @param numDecks - Number of decks in the shoe
 */
export function analyzeHand(
  handIndex: number,
  playerCards: Card[],
  dealerUpCard: Card,
  allKnownCards: Card[],
  numDecks: number
): HandAnalysis {
  const { total: playerTotal, soft: isSoft } = handValue(playerCards);
  const playerBJ = isBlackjack(playerCards);
  const canSplitHand = canSplit(playerCards);
  const canInsure = dealerUpCard.rank === 'A';

  // Build remaining deck (remove ALL known cards)
  const rankCounts = remainingRankCounts(numDecks, allKnownCards);
  const totalRemaining = remainingCardCount(numDecks, allKnownCards);

  // Compute dealer outcomes (dealer has only the up card; hole card is unknown)
  // We need to enumerate the dealer's hole card from the remaining deck
  const dealerOutcomes = computeDealerOutcomesFromUpCard(
    dealerUpCard,
    rankCounts,
    totalRemaining
  );

  // Compute EVs
  const actions: ActionEV[] = [];

  // Stand
  const standResult = evStand(playerTotal, playerBJ, dealerOutcomes);
  actions.push({ action: 'stand', ev: standResult.ev });

  // Hit (only if not blackjack)
  if (!playerBJ) {
    // For hit calculation, remove player's own cards from the counts
    // (they're already removed via allKnownCards)
    const hitEV = evHit(playerCards, dealerOutcomes, new Map(rankCounts), totalRemaining);
    actions.push({ action: 'hit', ev: hitEV });
  }

  // Double (only on first two cards, not blackjack)
  if (playerCards.length === 2 && !playerBJ) {
    const doubleEV = evDouble(playerCards, dealerOutcomes, new Map(rankCounts), totalRemaining);
    actions.push({ action: 'double', ev: doubleEV });
  }

  // Split
  if (canSplitHand) {
    // Remove the two player cards then add back one (since each split hand starts with one)
    const splitCounts = new Map(rankCounts);
    // Add back one of the split card (we split the pair)
    const currentCount = splitCounts.get(playerCards[0].rank) ?? 0;
    splitCounts.set(playerCards[0].rank, currentCount);
    const splitEV = evSplit(playerCards[0].rank, dealerOutcomes, splitCounts, totalRemaining);
    actions.push({ action: 'split', ev: splitEV });
  }

  // Insurance
  if (canInsure) {
    const insEV = evInsurance(new Map(rankCounts), totalRemaining);
    actions.push({ action: 'insurance', ev: insEV });
  }

  // Sort by EV descending
  actions.sort((a, b) => b.ev - a.ev);

  // Best action (exclude insurance from "best" — it's a side bet)
  const mainActions = actions.filter((a) => a.action !== 'insurance');
  const bestAction = mainActions[0]?.action ?? 'stand';

  return {
    handIndex,
    playerTotal,
    isSoft,
    isBlackjack: playerBJ,
    canSplit: canSplitHand,
    canInsure: canInsure,
    actions,
    bestAction,
    winProbability: standResult.win,
    loseProbability: standResult.lose,
    pushProbability: standResult.push,
  };
}

/**
 * Compute dealer outcomes starting from just the up card.
 * The dealer's hole card is unknown, so we enumerate all possibilities.
 */
function computeDealerOutcomesFromUpCard(
  upCard: Card,
  rankCounts: Map<Rank, number>,
  totalRemaining: number
): DealerOutcomes {
  const combinedOutcomes = new Map<number, number>();
  for (let t = 17; t <= 21; t++) combinedOutcomes.set(t, 0);
  combinedOutcomes.set(0, 0);

  // Enumerate hole card
  for (const rank of RANKS) {
    const count = rankCounts.get(rank) ?? 0;
    if (count === 0) continue;

    const drawProb = count / totalRemaining;
    const dealerCards: Card[] = [upCard, { rank, suit: '♠' }];

    // Check for dealer blackjack
    if (isBlackjack(dealerCards)) {
      // Dealer has blackjack — this is a special outcome
      // We represent it as total=21 but with BJ flag
      // For EV simplicity, treat as dealer 21
      combinedOutcomes.set(21, (combinedOutcomes.get(21) ?? 0) + drawProb);
      continue;
    }

    // Remove hole card from remaining
    const subCounts = new Map(rankCounts);
    subCounts.set(rank, count - 1);

    const outcomes = computeDealerOutcomes(dealerCards, subCounts, totalRemaining - 1);

    for (const [total, prob] of outcomes.probabilities) {
      combinedOutcomes.set(total, (combinedOutcomes.get(total) ?? 0) + drawProb * prob);
    }
  }

  return { probabilities: combinedOutcomes };
}

/**
 * Analyze all hands at once. This is the main entry point.
 */
export function analyzeTable(
  hands: Card[][], // 5 hands, each with 2+ cards
  dealerUpCard: Card,
  allKnownCards: Card[], // all cards on table + tracked from previous rounds
  numDecks: number
): HandAnalysis[] {
  return hands.map((hand, i) =>
    analyzeHand(i, hand, dealerUpCard, allKnownCards, numDecks)
  );
}

/**
 * Public function to get dealer outcome probabilities for display.
 */
export function getDealerProbabilities(
  dealerUpCard: Card,
  allKnownCards: Card[],
  numDecks: number
): Map<number, number> {
  const rankCounts = remainingRankCounts(numDecks, allKnownCards);
  const totalRemaining = remainingCardCount(numDecks, allKnownCards);
  const outcomes = computeDealerOutcomesFromUpCard(dealerUpCard, rankCounts, totalRemaining);
  return outcomes.probabilities;
}
