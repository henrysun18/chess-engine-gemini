
import React from 'react';
import { BoardState, Move, PieceColor, PieceType } from '../types';
import { getRow, getCol } from '../utils/chessRules';
import { PieceIcon } from './PieceIcons';

interface BoardProps {
  board: BoardState;
  turn: PieceColor;
  onSquareClick: (index: number) => void;
  selectedSquare: number | null;
  validMoves: Move[];
  lastMove: Move | null;
  bestMove: Move | null;
  isFlipped: boolean;
}

const PieceDisplay = ({ piece }: { piece: { color: PieceColor; type: PieceType } }) => {
  return (
    <div className="w-[85%] h-[85%] select-none cursor-pointer transition-transform hover:scale-105 drop-shadow-sm flex items-center justify-center">
      <PieceIcon color={piece.color} type={piece.type} />
    </div>
  );
};

export const Board: React.FC<BoardProps> = ({ board, onSquareClick, selectedSquare, validMoves, lastMove, bestMove, isFlipped }) => {
  const renderSquare = (i: number, visualIndex: number) => {
    // i is the logical board index (0-63, 0=a8)
    // visualIndex is the grid position (0=top-left)

    const r = getRow(i);
    const c = getCol(i);
    const isDark = (r + c) % 2 === 1;
    
    // Visual grid coordinates for label placement
    const visualR = Math.floor(visualIndex / 8);
    const visualC = visualIndex % 8;

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
        {/* Ranks on left edge */}
        {visualC === 0 && (
            <span className={`absolute top-0.5 left-1 text-[10px] font-bold select-none ${isDark ? 'text-[#eeeed2]' : 'text-[#769656]'}`}>
                {8 - r}
            </span>
        )}
        {/* Files on bottom edge */}
        {visualR === 7 && (
            <span className={`absolute bottom-0 right-1 text-[10px] font-bold select-none ${isDark ? 'text-[#eeeed2]' : 'text-[#769656]'}`}>
                {String.fromCharCode(97 + c)}
            </span>
        )}

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
      {board.map((_, visualIndex) => {
          // Map visual grid position to logical board index based on flip state
          const boardIndex = isFlipped ? 63 - visualIndex : visualIndex;
          return renderSquare(boardIndex, visualIndex);
      })}
    </div>
  );
};
