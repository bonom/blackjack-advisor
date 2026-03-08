'use client';

import React, { useState } from 'react';
import { type Card, handValue } from '@/lib/cards';
import { type HandAnalysis, type Action } from '@/lib/strategy';
import CardDisplay from './CardDisplay';
import CardSelector from './CardSelector';

interface PlayerHandProps {
  handIndex: number;
  cards: Card[];
  onAddCard: (handIndex: number, card: Card) => void;
  onRemoveCard: (handIndex: number, cardIndex: number) => void;
  usedCards: Card[];
  numDecks: number;
  analysis?: HandAnalysis;
}

const ACTION_LABELS: Record<Action, string> = {
  stand: 'Stand',
  hit: 'Hit',
  double: 'Double Down',
  split: 'Split',
  insurance: 'Insurance',
};

const ACTION_ICONS: Record<Action, string> = {
  stand: '🖐',
  hit: '👆',
  double: '💰',
  split: '✂️',
  insurance: '🛡',
};

function evColor(ev: number): string {
  if (ev > 0.1) return 'var(--color-ev-positive)';
  if (ev > -0.1) return 'var(--color-ev-neutral)';
  return 'var(--color-ev-negative)';
}

export default function PlayerHand({
  handIndex,
  cards,
  onAddCard,
  onRemoveCard,
  usedCards,
  numDecks,
  analysis,
}: PlayerHandProps) {
  const { total, soft } = cards.length > 0 ? handValue(cards) : { total: 0, soft: false };
  const isBusted = total > 21;

  // Show card selector if: less than 2 cards, OR hand has 2+ cards and total < 21 and not busted
  const canAddMoreCards = !isBusted && total < 21;
  const needsInitialCards = cards.length < 2;
  const showSelector = needsInitialCards || (cards.length >= 2 && canAddMoreCards);

  return (
    <div className={`player-hand ${analysis?.bestAction ? 'hand-analyzed' : ''}`}>
      <div className="hand-header">
        <span className="hand-label">Hand {handIndex + 1}</span>
        {cards.length > 0 && (
          <span className={`hand-total ${isBusted ? 'total-bust' : ''}`}>
            {soft && !isBusted ? `${total - 10}/${total}` : total}
            {isBusted && ' BUST'}
          </span>
        )}
      </div>

      <div className="hand-cards">
        {cards.map((card, i) => (
          <CardDisplay
            key={`${card.rank}${card.suit}-${i}`}
            card={card}
            size="md"
            removable
            onRemove={() => onRemoveCard(handIndex, i)}
          />
        ))}
        {showSelector && (
          <CardSelector
            onSelect={(card) => onAddCard(handIndex, card)}
            usedCards={usedCards}
            numDecks={numDecks}
            label={cards.length === 0 ? 'Card 1' : cards.length === 1 ? 'Card 2' : 'Hit'}
          />
        )}
      </div>

      {analysis && !analysis.isBlackjack && (
        <div className="hand-analysis">
          <div className="hand-best-action">
            <span className="best-action-icon">{ACTION_ICONS[analysis.bestAction]}</span>
            <span className="best-action-label">{ACTION_LABELS[analysis.bestAction]}</span>
          </div>

          <div className="ev-section-header">
            <span className="ev-section-title">Expected Value by Action</span>
          </div>

          <div className="hand-ev-list">
            {analysis.actions
              .filter((a) => a.action !== 'insurance')
              .map((a) => (
                <div
                  key={a.action}
                  className={`hand-ev-item ${a.action === analysis.bestAction ? 'ev-best' : ''}`}
                >
                  <span className="ev-action-name">
                    {ACTION_ICONS[a.action]} {ACTION_LABELS[a.action]}
                  </span>
                  <div className="ev-bar-container">
                    <div
                      className="ev-bar"
                      style={{
                        width: `${Math.min(Math.abs(a.ev) * 50 + 2, 100)}%`,
                        backgroundColor: evColor(a.ev),
                      }}
                    />
                  </div>
                  <span className="ev-value" style={{ color: evColor(a.ev) }}>
                    {a.ev >= 0 ? '+' : ''}{(a.ev * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>

          {analysis.canInsure && (
            <div className="hand-insurance">
              <span className="insurance-icon">🛡</span>
              <span>Insurance EV: </span>
              <span
                className="insurance-ev"
                style={{
                  color: evColor(
                    analysis.actions.find((a) => a.action === 'insurance')?.ev ?? 0
                  ),
                }}
              >
                {((analysis.actions.find((a) => a.action === 'insurance')?.ev ?? 0) * 100).toFixed(1)}%
              </span>
            </div>
          )}

          <div className="prob-section-title">Outcome Probability (if you Stand)</div>
          <div className="hand-probabilities">
            <div className="prob-item prob-win">
              <span>Win</span>
              <span>{(analysis.winProbability * 100).toFixed(1)}%</span>
            </div>
            <div className="prob-item prob-push">
              <span>Push</span>
              <span>{(analysis.pushProbability * 100).toFixed(1)}%</span>
            </div>
            <div className="prob-item prob-lose">
              <span>Lose</span>
              <span>{(analysis.loseProbability * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {analysis?.isBlackjack && (
        <div className="hand-blackjack">
          <span className="blackjack-label">⭐ BLACKJACK! ⭐</span>
        </div>
      )}
    </div>
  );
}
