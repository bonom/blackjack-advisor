'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { type Card, type Rank, type Suit, RANKS, SUITS, SUIT_COLORS } from '@/lib/cards';
import { createPortal } from 'react-dom';

interface CardSelectorProps {
  onSelect: (card: Card) => void;
  usedCards: Card[];
  numDecks: number;
  label?: string;
}

export default function CardSelector({ onSelect, usedCards, numDecks, label }: CardSelectorProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popupWidth = 380;
    const popupHeight = 180;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Prefer below, but flip above if no room
    let top = rect.bottom + 8;
    if (top + popupHeight > viewportH) {
      top = rect.top - popupHeight - 8;
    }
    if (top < 8) top = 8;

    // Center horizontally on the button, but clamp to viewport
    let left = rect.left + rect.width / 2 - popupWidth / 2;
    if (left < 8) left = 8;
    if (left + popupWidth > viewportW - 8) left = viewportW - popupWidth - 8;

    setPopupStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popupWidth}px`,
      zIndex: 10000,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function usedCount(rank: Rank, suit: Suit) {
    return usedCards.filter((c) => c.rank === rank && c.suit === suit).length;
  }

  function isUsed(rank: Rank, suit: Suit) {
    return usedCount(rank, suit) >= numDecks;
  }

  function handleSelect(rank: Rank, suit: Suit) {
    if (isUsed(rank, suit)) return;
    onSelect({ rank, suit });
    setOpen(false);
  }

  const popup = open ? createPortal(
    <div ref={popupRef} className="card-selector-popup" style={popupStyle}>
      <div className="card-selector-grid">
        {SUITS.map((suit) => (
          <div key={suit} className="card-selector-row">
            <span className={`card-selector-suit ${SUIT_COLORS[suit] === 'red' ? 'suit-red' : 'suit-black'}`}>
              {suit}
            </span>
            {RANKS.map((rank) => {
              const used = isUsed(rank, suit);
              return (
                <button
                  key={`${rank}${suit}`}
                  className={`card-selector-cell ${used ? 'cell-used' : ''} ${SUIT_COLORS[suit] === 'red' ? 'cell-red' : 'cell-black'}`}
                  onClick={() => handleSelect(rank, suit)}
                  disabled={used}
                >
                  {rank}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        className="card-slot-empty"
        onClick={() => setOpen(!open)}
        title={label || 'Select a card'}
      >
        <span className="card-slot-plus">+</span>
        {label && <span className="card-slot-label">{label}</span>}
      </button>
      {popup}
    </>
  );
}
