
import React from 'react';
import { PieceColor, PieceType } from '../types';

interface PieceIconProps {
  color: PieceColor;
  type: PieceType;
  className?: string;
}

// Wikimedia Commons standard chess pieces (Staunton) - PNG Format
// Using 200px resolution which is crisp for board sizes up to ~1600px width
const PIECE_IMAGES: Record<string, string> = {
  // White
  'w-p': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Chess_plt45.svg/200px-Chess_plt45.svg.png',
  'w-n': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Chess_nlt45.svg/200px-Chess_nlt45.svg.png',
  'w-b': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Chess_blt45.svg/200px-Chess_blt45.svg.png',
  'w-r': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Chess_rlt45.svg/200px-Chess_rlt45.svg.png',
  'w-q': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Chess_qlt45.svg/200px-Chess_qlt45.svg.png',
  'w-k': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Chess_klt45.svg/200px-Chess_klt45.svg.png',
  
  // Black
  'b-p': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Chess_pdt45.svg/200px-Chess_pdt45.svg.png',
  'b-n': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Chess_ndt45.svg/200px-Chess_ndt45.svg.png',
  'b-b': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Chess_bdt45.svg/200px-Chess_bdt45.svg.png',
  'b-r': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Chess_rdt45.svg/200px-Chess_rdt45.svg.png',
  'b-q': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Chess_qdt45.svg/200px-Chess_qdt45.svg.png',
  'b-k': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Chess_kdt45.svg/200px-Chess_kdt45.svg.png',
};

export const PieceIcon: React.FC<PieceIconProps> = ({ color, type, className }) => {
  const key = `${color}-${type}`;
  const src = PIECE_IMAGES[key];

  return (
    <img 
      src={src} 
      alt={`${color === 'w' ? 'White' : 'Black'} ${type}`} 
      className={`select-none pointer-events-none ${className || ''}`}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      loading="eager"
      draggable={false}
    />
  );
};
