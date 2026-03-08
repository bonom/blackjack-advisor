import { type Card, Rank, Suit } from './cards';
import { analyzeHand, analyzeTable, getDealerProbabilities } from './strategy';

describe('Blackjack Strategy Engine', () => {

  const C = (rank: Rank, suit: Suit = '♠'): Card => ({ rank, suit });

  describe('analyzeHand', () => {
    it('recommends double down on 11 vs 6', () => {
      const hand = [C('6'), C('5')];
      const dealerUp = C('6');
      const allKnown = [...hand, dealerUp];
      
      const analysis = analyzeHand(0, hand, dealerUp, allKnown, 6);
      expect(analysis.bestAction).toBe('double');
    });

    it('recommends split on 8,8 vs 7', () => {
      const hand = [C('8', '♠'), C('8', '♥')];
      const dealerUp = C('7');
      const allKnown = [...hand, dealerUp];
      
      const analysis = analyzeHand(0, hand, dealerUp, allKnown, 6);
      expect(analysis.bestAction).toBe('split');
    });

    it('recommends stand on hard 17', () => {
      const hand = [C('10'), C('7')];
      const dealerUp = C('9');
      const allKnown = [...hand, dealerUp];
      
      const analysis = analyzeHand(0, hand, dealerUp, allKnown, 6);
      expect(analysis.bestAction).toBe('stand');
    });

    it('identifies blackjack', () => {
      const hand = [C('A'), C('K')];
      const dealerUp = C('5');
      const analysis = analyzeHand(0, hand, dealerUp, [...hand, dealerUp], 6);
      expect(analysis.isBlackjack).toBe(true);
      expect(analysis.bestAction).toBe('stand');
    });
  });

  describe('getDealerProbabilities', () => {
    it('dealer up card 6 has high bust probability', () => {
      const dealerUp = C('6');
      const allKnown = [dealerUp];
      
      const probs = getDealerProbabilities(dealerUp, allKnown, 6);
      const bustProb = probs.get(0)!;
      // Dealer bust with a 6 is typically around 42%
      expect(bustProb).toBeGreaterThan(0.4);
    });
  });

  describe('analyzeTable', () => {
    it('analyzes multiple hands simultaneously', () => {
      const hands = [
        [C('10'), C('10')], // Stand usually
        [C('8'), C('3')]    // Double down vs 6
      ];
      const dealerUp = C('6');
      const allKnown = [...hands[0], ...hands[1], dealerUp];

      const results = analyzeTable(hands, dealerUp, allKnown, 6);
      expect(results.length).toBe(2);
      expect(results[0].bestAction).toBe('stand');
      expect(results[1].bestAction).toBe('double');
    });
  });
});
