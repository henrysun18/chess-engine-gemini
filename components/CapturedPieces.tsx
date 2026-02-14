
import React from 'react';
import { BoardState, PieceType, PieceColor } from '../types';
import { PIECE_VALUES } from '../constants';
import { PieceIcon } from './PieceIcons';

interface CapturedPiecesProps {
  board: BoardState;
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ board }) => {
  // Standard starting counts for one side
  const INITIAL_COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  
  const countPieces = (color: PieceColor) => {
    const counts = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    board.forEach(sq => {
      if (sq && sq.color === color) {
        counts[sq.type]++;
      }
    });
    return counts;
  };

  const whiteCounts = countPieces('w');
  const blackCounts = countPieces('b');

  // Captured by White = Black pieces missing from board
  // Captured by Black = White pieces missing from board
  
  const getCaptured = (initial: typeof INITIAL_COUNTS, current: typeof INITIAL_COUNTS) => {
     const captured: PieceType[] = [];
     (Object.keys(initial) as PieceType[]).forEach(type => {
         // If current has more than initial (promotion), we treat captured as 0 (using Math.max(0))
         // This implies we don't show the pawn that was promoted as "captured", 
         // but if a Queen was promoted, we don't say -1 Queens captured.
         // However, if a pawn promoted, we technically "lost" a pawn from the board. 
         // Simple subtraction works best for "Missing Pieces" visual.
         const count = Math.max(0, initial[type] - current[type]);
         for(let i=0; i<count; i++) captured.push(type);
     });
     return captured;
  };

  const whiteCaptured = getCaptured(INITIAL_COUNTS, blackCounts); // Black pieces taken by White
  const blackCaptured = getCaptured(INITIAL_COUNTS, whiteCounts); // White pieces taken by Black

  // Material Calculation
  const calculateMaterial = (counts: typeof INITIAL_COUNTS) => {
      return (counts.p * PIECE_VALUES.p) + 
             (counts.n * PIECE_VALUES.n) + 
             (counts.b * PIECE_VALUES.b) + 
             (counts.r * PIECE_VALUES.r) + 
             (counts.q * PIECE_VALUES.q);
  };

  const whiteMat = calculateMaterial(whiteCounts);
  const blackMat = calculateMaterial(blackCounts);
  const diff = (whiteMat - blackMat) / 100;

  const renderGroup = (pieces: PieceType[], color: PieceColor, advantage: number) => (
    <div className="flex items-center gap-2 h-8 bg-slate-800/50 rounded px-2 border border-slate-700 w-full">
      <div className="flex -space-x-1.5 overflow-hidden">
        {pieces.sort((a,b) => PIECE_VALUES[a] - PIECE_VALUES[b]).map((p, i) => (
          <div key={i} className="w-5 h-5 opacity-90 relative">
             <PieceIcon color={color === 'w' ? 'b' : 'w'} type={p} />
          </div>
        ))}
        {pieces.length === 0 && <span className="text-xs text-slate-600 italic">None</span>}
      </div>
      {advantage > 0 && <span className="text-xs font-bold text-slate-400 ml-auto">+{advantage.toFixed(0)}</span>}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center text-xs text-slate-400 px-1">
        <span>Captured by White</span>
      </div>
      {renderGroup(whiteCaptured, 'w', diff > 0 ? diff : 0)}
      
      <div className="flex justify-between items-center text-xs text-slate-400 px-1 mt-1">
        <span>Captured by Black</span>
      </div>
      {renderGroup(blackCaptured, 'b', diff < 0 ? Math.abs(diff) : 0)}
    </div>
  );
};
