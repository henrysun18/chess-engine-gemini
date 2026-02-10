import React from 'react';
import { Move, PieceType, PieceColor } from '../types';
import { PIECE_VALUES } from '../constants';

interface CapturedPiecesProps {
  history: Move[];
}

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

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ history }) => {
  const whiteCaptured: PieceType[] = [];
  const blackCaptured: PieceType[] = [];
  let whiteMaterial = 0;
  let blackMaterial = 0;

  history.forEach(move => {
    if (move.captured) {
      if (move.captured.color === 'w') {
        blackCaptured.push(move.captured.type);
        blackMaterial += PIECE_VALUES[move.captured.type];
      } else {
        whiteCaptured.push(move.captured.type);
        whiteMaterial += PIECE_VALUES[move.captured.type];
      }
    }
  });

  // Material difference (Standard: Pawns = 1, etc. Our constants are centipawns 100)
  const diff = (whiteMaterial - blackMaterial) / 100;

  const renderGroup = (pieces: PieceType[], color: PieceColor, advantage: number) => (
    <div className="flex items-center gap-2 h-8 bg-slate-800/50 rounded px-2 border border-slate-700 w-full">
      <div className="flex -space-x-1.5 overflow-hidden">
        {pieces.sort((a,b) => PIECE_VALUES[a] - PIECE_VALUES[b]).map((p, i) => (
          <img 
            key={i} 
            src={getWikiUrl(color === 'w' ? 'b' : 'w', p)} // Logic flip: captured white piece is held by black
            alt={p} 
            className="w-5 h-5 opacity-90"
          />
        ))}
        {pieces.length === 0 && <span className="text-xs text-slate-600 italic">None</span>}
      </div>
      {advantage > 0 && <span className="text-xs font-bold text-slate-400 ml-auto">+{advantage}</span>}
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
