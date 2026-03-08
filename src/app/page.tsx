'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { type Card, type Rank, type Suit, cardsEqual, handValue } from '@/lib/cards';
import { analyzeTable, getDealerProbabilities, type HandAnalysis, type Action } from '@/lib/strategy';
import DealerArea from '@/components/DealerArea';
import PlayerHand from '@/components/PlayerHand';

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

const ACTION_DESCRIPTIONS: Record<Action, string> = {
  stand: 'Keep your current hand, take no more cards',
  hit: 'Draw one more card from the deck',
  double: 'Double your bet and receive exactly one more card',
  split: 'Split your pair into two separate hands (costs 1 extra bet)',
  insurance: 'Side bet (½ original bet) that the dealer has blackjack',
};

const NUM_HANDS = 5;

export default function GamePage() {
  const [hands, setHands] = useState<Card[][]>(
    Array.from({ length: NUM_HANDS }, () => [])
  );
  const [dealerUpCard, setDealerUpCard] = useState<Card | null>(null);
  const [numDecks, setNumDecks] = useState(6);
  const [analyses, setAnalyses] = useState<HandAnalysis[]>([]);
  const [dealerProbs, setDealerProbs] = useState<Map<number, number> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // All currently visible cards
  const currentCards = useMemo(() => {
    const cards: Card[] = [];
    for (const hand of hands) {
      cards.push(...hand);
    }
    if (dealerUpCard) cards.push(dealerUpCard);
    return cards;
  }, [hands, dealerUpCard]);

  const handleAddCard = useCallback((handIndex: number, card: Card) => {
    setHands((prev) => {
      const next = prev.map((h) => [...h]);
      const { total } = handValue(next[handIndex]);
      // Allow adding cards as long as hand is not busted and under 21
      if (total < 21 || next[handIndex].length < 2) {
        next[handIndex].push(card);
      }
      return next;
    });
    setAnalyses([]);
    setDealerProbs(null);
  }, []);

  const handleRemoveCard = useCallback((handIndex: number, cardIndex: number) => {
    setHands((prev) => {
      const next = prev.map((h) => [...h]);
      next[handIndex].splice(cardIndex, 1);
      return next;
    });
    setAnalyses([]);
    setDealerProbs(null);
  }, []);

  const handleSetDealerUpCard = useCallback((card: Card) => {
    setDealerUpCard(card);
    setAnalyses([]);
    setDealerProbs(null);
  }, []);

  const handleRemoveDealerUpCard = useCallback(() => {
    setDealerUpCard(null);
    setAnalyses([]);
    setDealerProbs(null);
  }, []);

  // Check if we can analyze (need at least one hand with 2+ cards and dealer up card)
  const canAnalyze = useMemo(() => {
    if (!dealerUpCard) return false;
    return hands.some((h) => h.length >= 2);
  }, [hands, dealerUpCard]);

  // Auto-analyze when relevant state changes
  React.useEffect(() => {
    if (!canAnalyze || !dealerUpCard) {
      setAnalyses([]);
      setDealerProbs(null);
      return;
    }

    const completedHands = hands.filter((h) => h.length >= 2);
    if (completedHands.length === 0) return;

    setIsAnalyzing(true);
    const timer = setTimeout(() => {
      const results = analyzeTable(
        hands.filter((h) => h.length >= 2),
        dealerUpCard,
        currentCards,
        numDecks
      );

      const analysisMap: HandAnalysis[] = [];
      let resultIdx = 0;
      for (let i = 0; i < NUM_HANDS; i++) {
        if (hands[i].length >= 2) {
          const r = results[resultIdx];
          analysisMap.push({ ...r, handIndex: i });
          resultIdx++;
        }
      }
      setAnalyses(analysisMap);

      const probs = getDealerProbabilities(dealerUpCard, currentCards, numDecks);
      setDealerProbs(probs);
      setIsAnalyzing(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [hands, dealerUpCard, currentCards, numDecks, canAnalyze]);

  const handleNewRound = useCallback(() => {
    setHands(Array.from({ length: NUM_HANDS }, () => []));
    setDealerUpCard(null);
  }, []);

  const getAnalysis = (handIndex: number): HandAnalysis | undefined => {
    return analyses.find((a) => a.handIndex === handIndex);
  };

  return (
    <div className="game-layout">
      <div className="game-main">
        <header className="game-header">
          <h1 className="game-title">
            <span className="title-icon">🃏</span>
            Blackjack Advisor
          </h1>
          <p className="game-subtitle">
            Multi-hand EV calculator with card counting
          </p>
        </header>

        <DealerArea
          upCard={dealerUpCard}
          onSetUpCard={handleSetDealerUpCard}
          onRemoveUpCard={handleRemoveDealerUpCard}
          usedCards={currentCards}
          numDecks={numDecks}
          dealerProbabilities={dealerProbs ?? undefined}
          handAnalyses={analyses}
          hands={hands}
        />

        <div className="players-area">
          {Array.from({ length: NUM_HANDS }, (_, i) => (
            <PlayerHand
              key={i}
              handIndex={i}
              cards={hands[i]}
              onAddCard={handleAddCard}
              onRemoveCard={handleRemoveCard}
              usedCards={currentCards}
              numDecks={numDecks}
              analysis={getAnalysis(i)}
            />
          ))}
        </div>

        <div className="game-actions">
          <button className="btn-new-round" onClick={handleNewRound}>
            🔄 New Round
          </button>
        </div>

        <div className="game-info-bar">
          <span>
            Cards on table: <strong>{currentCards.length}</strong>
          </span>
          {isAnalyzing && (
            <span className="analyzing-status">
              <span className="spinner" style={{ width: 12, height: 12, marginRight: 6 }} />
              Updating...
            </span>
          )}
        </div>

        {/* Global Analysis Legend */}
        <div className="global-legend">
          <h3 className="global-legend-title">Expected Value (EV) by Action</h3>
          <p className="global-legend-desc">
            <strong>Expected Value</strong> shows your average profit/loss per unit bet for each possible action.
            A <span className="legend-ev-pos">+EV</span> means a profitable decision on average, while <span className="legend-ev-neg">−EV</span> means an expected loss. The optimal action is highlighted.
          </p>
          <div className="global-legend-actions">
            {(Object.keys(ACTION_LABELS) as Action[])
              .filter(a => a !== 'insurance')
              .map((action) => (
              <div key={action} className="global-legend-item">
                <span className="global-legend-item-title">
                  {ACTION_ICONS[action]} <strong>{ACTION_LABELS[action]}</strong>
                </span>
                <span className="global-legend-item-desc">{ACTION_DESCRIPTIONS[action]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
