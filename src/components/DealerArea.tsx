'use client';

import React from 'react';
import { type Card, handValue } from '@/lib/cards';
import { type HandAnalysis } from '@/lib/strategy';
import CardDisplay from './CardDisplay';
import CardSelector from './CardSelector';

interface DealerAreaProps {
  upCard: Card | null;
  onSetUpCard: (card: Card) => void;
  onRemoveUpCard: () => void;
  usedCards: Card[];
  numDecks: number;
  dealerProbabilities?: Map<number, number>;
  handAnalyses?: HandAnalysis[];
  hands?: Card[][];
}

export default function DealerArea({
  upCard,
  onSetUpCard,
  onRemoveUpCard,
  usedCards,
  numDecks,
  dealerProbabilities,
  handAnalyses,
  hands,
}: DealerAreaProps) {
  // Compute per-hand win probability considering each hand's total vs dealer outcomes
  function computeHandWinProb(handCards: Card[]): { win: number; push: number; lose: number } | null {
    if (!dealerProbabilities || handCards.length < 2) return null;
    const { total } = handValue(handCards);
    if (total > 21) return { win: 0, push: 0, lose: 1 }; // busted

    let win = 0, push = 0, lose = 0;
    for (const [dealerTotal, prob] of dealerProbabilities) {
      if (dealerTotal === 0) {
        win += prob; // dealer busts
      } else if (total > dealerTotal) {
        win += prob;
      } else if (total < dealerTotal) {
        lose += prob;
      } else {
        push += prob;
      }
    }
    return { win, push, lose };
  }

  return (
    <div className="dealer-area">
      <div className="dealer-label">DEALER</div>
      <div className="dealer-cards">
        {upCard ? (
          <CardDisplay card={upCard} size="lg" removable onRemove={onRemoveUpCard} />
        ) : (
          <CardSelector onSelect={onSetUpCard} usedCards={usedCards} numDecks={numDecks} label="Up Card" />
        )}
        <CardDisplay faceDown size="lg" />
      </div>

      {dealerProbabilities && (
        <div className="dealer-probabilities">
          <div className="dealer-prob-title">Dealer Outcome Probabilities</div>
          <div className="dealer-prob-grid">
            {[17, 18, 19, 20, 21].map((total) => {
              const prob = dealerProbabilities.get(total) ?? 0;
              return (
                <div key={total} className="dealer-prob-item">
                  <span className="dealer-prob-label">{total}</span>
                  <div className="dealer-prob-bar-track">
                    <div
                      className="dealer-prob-bar-fill"
                      style={{ width: `${prob * 100}%` }}
                    />
                  </div>
                  <span className="dealer-prob-value">{(prob * 100).toFixed(1)}%</span>
                </div>
              );
            })}
            <div className="dealer-prob-item dealer-prob-bust">
              <span className="dealer-prob-label">Bust</span>
              <div className="dealer-prob-bar-track">
                <div
                  className="dealer-prob-bar-fill bust-bar"
                  style={{ width: `${(dealerProbabilities.get(0) ?? 0) * 100}%` }}
                />
              </div>
              <span className="dealer-prob-value">
                {((dealerProbabilities.get(0) ?? 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Per-hand win probability based on each hand's total vs dealer outcomes */}
      {dealerProbabilities && hands && hands.some((h) => h.length >= 2) && (
        <div className="dealer-vs-hands">
          <div className="dealer-prob-title">Win Probability vs Dealer (if Standing)</div>
          <div className="dvh-grid">
            {hands.map((handCards, i) => {
              if (handCards.length < 2) return null;
              const probs = computeHandWinProb(handCards);
              if (!probs) return null;
              const { total } = handValue(handCards);
              const isBusted = total > 21;
              return (
                <div key={i} className="dvh-card">
                  <div className="dvh-header">
                    <span className="dvh-title">Hand {i + 1}</span>
                    <span className={`dvh-total-badge ${isBusted ? 'busted' : ''}`}>
                      {isBusted ? 'BUST' : total}
                    </span>
                  </div>
                  <div className="dvh-stacked-bar">
                    <div className="dvh-segment segment-win" style={{ width: `${probs.win * 100}%` }} title={`Win: ${(probs.win * 100).toFixed(1)}%`} />
                    <div className="dvh-segment segment-push" style={{ width: `${probs.push * 100}%` }} title={`Push: ${(probs.push * 100).toFixed(1)}%`} />
                    <div className="dvh-segment segment-lose" style={{ width: `${probs.lose * 100}%` }} title={`Lose: ${(probs.lose * 100).toFixed(1)}%`} />
                  </div>
                  <div className="dvh-stats">
                    <div className="dvh-stat-item stat-win">
                      <span className="dvh-stat-label">Win</span>
                      <span className="dvh-stat-value">{(probs.win * 100).toFixed(1)}%</span>
                    </div>
                    <div className="dvh-stat-item stat-push">
                      <span className="dvh-stat-label">Push</span>
                      <span className="dvh-stat-value">{(probs.push * 100).toFixed(1)}%</span>
                    </div>
                    <div className="dvh-stat-item stat-lose">
                      <span className="dvh-stat-label">Lose</span>
                      <span className="dvh-stat-value">{(probs.lose * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
