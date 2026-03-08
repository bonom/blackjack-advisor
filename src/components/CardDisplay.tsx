'use client';

import React from 'react';
import { type Card, SUIT_COLORS } from '@/lib/cards';

interface CardDisplayProps {
  card?: Card | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

export default function CardDisplay({ card, faceDown, size = 'md', onClick, removable, onRemove }: CardDisplayProps) {
  if (!card && !faceDown) {
    return <div className={`card-display card-empty card-${size}`} onClick={onClick} />;
  }

  if (faceDown) {
    return (
      <div className={`card-display card-facedown card-${size}`}>
        <div className="card-back-pattern" />
      </div>
    );
  }

  const color = SUIT_COLORS[card!.suit];

  return (
    <div
      className={`card-display card-faceup card-${size} card-color-${color}`}
      onClick={onClick}
    >
      <div className="card-corner card-corner-top">
        <span className="card-rank">{card!.rank}</span>
        <span className="card-suit">{card!.suit}</span>
      </div>
      <div className="card-center-suit">{card!.suit}</div>
      <div className="card-corner card-corner-bottom">
        <span className="card-rank">{card!.rank}</span>
        <span className="card-suit">{card!.suit}</span>
      </div>
      {removable && (
        <button className="card-remove-btn" onClick={(e) => { e.stopPropagation(); onRemove?.(); }} title="Remove card">
          ×
        </button>
      )}
    </div>
  );
}
