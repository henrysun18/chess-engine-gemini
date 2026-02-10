import React from 'react';
import { BoardState, Move, PieceColor, PieceType } from '../types';
import { getRow, getCol } from '../utils/chessRules';

interface BoardProps {
  board: BoardState;
  turn: PieceColor;
  onSquareClick: (index: number) => void;
  selectedSquare: number | null;
  validMoves: Move[];
  lastMove: Move | null;
  bestMove: Move | null;
}

const PieceDisplay = ({ piece }: { piece: { color: PieceColor; type: PieceType } }) => {
  const getWikiUrl = (color: PieceColor, type: PieceType) => {
    const c = color === 'w' ? 'l' : 'd';
    const t = type;
    const key = `${t}${c}`;
    
    const urls: Record<string, string> = {
      pl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
      nl: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
      bl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
      rl: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
      ql: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
      kl: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
      
      pd: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
      nd: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
      bd: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
      rd: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
      qd: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
      kd: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    };
    return urls[key];
  };

  return (
    <img 
      src={getWikiUrl(piece.color, piece.type)} 
      alt={`${piece.color}${piece.type}`}
      className="w-[85%] h-[85%] select-none cursor-pointer transition-transform hover:scale-105 drop-shadow-sm"
    />
  );
};

export const Board: React.FC<BoardProps> = ({ board, onSquareClick, selectedSquare, validMoves, lastMove, bestMove }) => {
  const renderSquare = (i: number) => {
    const r = getRow(i);
    const c = getCol(i);
    const isDark = (r + c) % 2 === 1;
    
    const piece = board[i];
    const isSelected = selectedSquare === i;
    const isValidDest = validMoves.some(m => m.to === i);
    const isLastMoveFrom = lastMove?.from === i;
    const isLastMoveTo = lastMove?.to === i;
    
    // Engine Best Move Highlighting
    const isBestMoveFrom = bestMove?.from === i;
    const isBestMoveTo = bestMove?.to === i;

    let bgClass = isDark ? 'bg-[#769656]' : 'bg-[#eeeed2]'; // Standard Chess.com style green board
    
    // Priority of background highlights
    if (isSelected) bgClass = 'bg-yellow-200/90'; // Selected
    else if (isLastMoveFrom || isLastMoveTo) bgClass = 'bg-yellow-200/60'; // Last Move
    
    return (
      <div
        key={i}
        onClick={() => onSquareClick(i)}
        className={`w-full h-full flex items-center justify-center relative ${bgClass}`}
      >
        {/* Coordinate labels */}
        {c === 0 && <span className={`absolute top-0.5 left-1 text-[10px] font-bold select-none ${isDark ? 'text-[#eeeed2]' : 'text-[#769656]'}`}>{8 - r}</span>}
        {r === 7 && <span className={`absolute bottom-0 right-1 text-[10px] font-bold select-none ${isDark ? 'text-[#eeeed2]' : 'text-[#769656]'}`}>{String.fromCharCode(97 + c)}</span>}

        {/* Engine Best Move Indicator (Blue Ring) */}
        {(isBestMoveFrom || isBestMoveTo) && !isSelected && (
          <div className="absolute inset-0 border-[3px] border-blue-500/70 animate-pulse pointer-events-none z-10" />
        )}
        
        {/* Best move target dot if empty */}
        {(isBestMoveTo) && !piece && (
           <div className="absolute w-3 h-3 rounded-full bg-blue-500/50 pointer-events-none z-10" />
        )}

        {/* Highlight Legal Move Destination */}
        {isValidDest && (
          <div className={`absolute rounded-full z-20 ${piece 
            ? 'border-4 border-black/10 w-full h-full rounded-none' // Capture ring
            : 'w-3 h-3 bg-black/20' // Simple dot
          }`} />
        )}

        {piece && <PieceDisplay piece={piece} />}
      </div>
    );
  };

  return (
    <div className="aspect-square w-full grid grid-cols-8 grid-rows-8 border-4 border-slate-700 shadow-2xl rounded-sm overflow-hidden bg-slate-800 select-none">
      {board.map((_, i) => renderSquare(i))}
    </div>
  );
};