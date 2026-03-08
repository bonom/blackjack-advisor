'use client';

import React, { useState } from 'react';
import { type Rank, RANKS } from '@/lib/cards';
import { type ShoeStats, betMultiplier } from '@/lib/counting';

interface ShoeTrackerProps {
  stats: ShoeStats | null;
  numDecks: number;
  onDeckChange: (n: number) => void;
  persistentTracking: boolean;
  onToggleTracking: () => void;
  onResetShoe: () => void;
}

function getCountColor(tc: number): string {
  if (tc >= 3) return 'var(--color-ev-positive)';
  if (tc >= 1) return '#a3d977';
  if (tc >= -1) return 'var(--color-ev-neutral)';
  if (tc >= -3) return '#e8a855';
  return 'var(--color-ev-negative)';
}

export default function ShoeTracker({
  stats,
  numDecks,
  onDeckChange,
  persistentTracking,
  onToggleTracking,
  onResetShoe,
}: ShoeTrackerProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="shoe-tracker">
      <div className="shoe-header">
        <div className="shoe-title-row">
          <h3 className="shoe-title">🃏 Shoe Tracker</h3>
          <button
            className="shoe-help-toggle"
            onClick={() => setShowHelp(!showHelp)}
            title="What is this?"
          >
            {showHelp ? '✕' : '?'}
          </button>
        </div>

        {showHelp && (
          <div className="shoe-help-panel">
            <p className="shoe-help-intro">
              The <strong>Shoe Tracker</strong> monitors cards that have been played and calculates counting statistics to help with bet sizing.
            </p>
            <div className="shoe-help-items">
              <div className="shoe-help-item">
                <strong>Decks</strong>
                <span>Number of decks in the shoe. Casinos typically use 6 or 8. Set this to match the table you&apos;re playing at.</span>
              </div>
              <div className="shoe-help-item">
                <strong>Per Round / Persistent</strong>
                <span>
                  <em>Per Round</em>: only cards from the current round are tracked (default).
                  <em> Persistent</em>: cards accumulate across rounds — enables full card counting across the shoe until it&apos;s reshuffled.
                </span>
              </div>
              <div className="shoe-help-item">
                <strong>Running Count</strong>
                <span>Hi-Lo count: low cards (2–6) = +1, neutral (7–9) = 0, high cards (10–A) = −1. A <span style={{ color: 'var(--color-ev-positive)' }}>positive count</span> means more high cards remain (favorable).</span>
              </div>
              <div className="shoe-help-item">
                <strong>True Count</strong>
                <span>Running count ÷ remaining decks. This normalizes for shoe size and is used for bet sizing decisions.</span>
              </div>
              <div className="shoe-help-item">
                <strong>Penetration</strong>
                <span>% of the shoe that has been dealt. Higher penetration = more reliable counting.</span>
              </div>
              <div className="shoe-help-item">
                <strong>Bet Sizing</strong>
                <span>Recommended bet multiplier based on true count. Higher true count → higher bet (you have an edge). Negative count → bet minimum.</span>
              </div>
            </div>
          </div>
        )}

        <div className="shoe-controls">
          <div className="deck-selector">
            <label>Decks:</label>
            <select
              value={numDecks}
              onChange={(e) => onDeckChange(parseInt(e.target.value))}
              className="deck-select"
            >
              {[1, 2, 4, 6, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button
            className={`tracking-toggle ${persistentTracking ? 'tracking-on' : 'tracking-off'}`}
            onClick={onToggleTracking}
            title={persistentTracking ? 'Cards persist across rounds' : 'Cards reset each round'}
          >
            {persistentTracking ? '🔗 Persistent' : '🔄 Per Round'}
          </button>
          {persistentTracking && (
            <button className="reset-shoe-btn" onClick={onResetShoe} title="Reset shoe — clears all tracked cards">
              Reset Shoe
            </button>
          )}
        </div>
      </div>

      {!stats && (
        <div className="shoe-empty-state">
          <p>Select cards on the table to see shoe statistics here.</p>
        </div>
      )}

      {stats && (
        <div className="shoe-stats">
          <div className="shoe-counts">
            <div className="count-item">
              <span className="count-label">Running Count</span>
              <span className="count-value" style={{ color: getCountColor(stats.trueCount) }}>
                {stats.runningCount >= 0 ? '+' : ''}{stats.runningCount}
              </span>
            </div>
            <div className="count-item">
              <span className="count-label">True Count</span>
              <span className="count-value" style={{ color: getCountColor(stats.trueCount) }}>
                {stats.trueCount >= 0 ? '+' : ''}{stats.trueCount}
              </span>
            </div>
            <div className="count-item">
              <span className="count-label">Remaining</span>
              <span className="count-value">{stats.remainingCards} cards</span>
            </div>
            <div className="count-item">
              <span className="count-label">Penetration</span>
              <span className="count-value">{stats.penetration}%</span>
            </div>
          </div>

          <div className="bet-recommendation">
            <span className="bet-label">Suggested Bet</span>
            <span className={`bet-value bet-${stats.betRecommendation}`}>
              {stats.betRecommendation.toUpperCase()} (×{betMultiplier(stats.trueCount)})
            </span>
          </div>

          <div className="rank-distribution">
            <div className="rank-dist-title">Cards Remaining by Rank</div>
            <div className="rank-dist-grid">
              {RANKS.map((rank) => {
                const count = stats.rankDistribution.get(rank) ?? 0;
                const maxCount = numDecks * 4;
                const pct = (count / maxCount) * 100;
                return (
                  <div key={rank} className="rank-dist-item">
                    <span className="rank-dist-label">{rank}</span>
                    <div className="rank-dist-bar-track">
                      <div
                        className="rank-dist-bar-fill"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="rank-dist-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
