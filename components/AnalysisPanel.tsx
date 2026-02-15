
import React, { useEffect, useState, useRef } from 'react';
import { EngineResult, PieceColor, GameState } from '../types';
import { moveToSan, getLegalMoves, makeMove } from '../utils/chessRules';

interface AnalysisPanelProps {
  result: EngineResult;
  turn: PieceColor;
  configDepth: number;
  gameState: GameState;
  isFlipped: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ result, turn, configDepth, gameState, isFlipped }) => {
  const [nps, setNps] = useState(0);
  const prevNodes = useRef(0);
  const lastTime = useRef(Date.now());
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [result.logs]);

  useEffect(() => {
    if (result.isThinking) {
      const interval = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTime.current;
        if (delta >= 1000) {
          const diff = result.nodesSearched - prevNodes.current;
          setNps(Math.round(diff / (delta / 1000)));
          prevNodes.current = result.nodesSearched;
          lastTime.current = now;
        }
      }, 500);
      return () => clearInterval(interval);
    } else {
      setNps(0);
      prevNodes.current = 0;
    }
  }, [result.isThinking, result.nodesSearched]);

  // Score Logic
  // The engine (NegaMax) returns score relative to the side to move.
  // We first convert this to a score relative to White (Standard Centipawns)
  const whiteScore = turn === 'w' ? result.evaluation : -result.evaluation;
  
  // Then we calculate the display score based on the board flip.
  // If flipped (Black perspective), we invert the white score.
  // Example: White winning (+200). Flipped -> -200 (Bad for me).
  // Example: Black winning (-200). Flipped -> +200 (Good for me).
  const displayScore = isFlipped ? -whiteScore : whiteScore;
  
  let scoreDisplay = "";
  const MATE_THRESHOLD = 20000;
  const isMate = Math.abs(result.evaluation) > MATE_THRESHOLD;
  
  if (isMate) {
      // Moves to mate relative to the player
      const movesToMate = Math.ceil((29000 - Math.abs(result.evaluation)) / 2);
      const isWinning = displayScore > 0;
      scoreDisplay = `M# ${isWinning ? '+' : '-'}${movesToMate}`;
  } else {
      const scoreUnit = displayScore / 100; 
      scoreDisplay = scoreUnit > 0 ? `+${scoreUnit.toFixed(2)}` : scoreUnit.toFixed(2);
  }
  
  const progressPercent = Math.min(100, (result.currentDepth / configDepth) * 100);
  
  // Eval Bar Logic
  // 100% = Good for Current Perspective (Green). 0% = Bad (Red).
  // We clamp score to +/- 1000 cp (10 pawns).
  let evalPercent = 50;
  if (isMate) {
      evalPercent = displayScore > 0 ? 100 : 0;
  } else {
      const capped = Math.max(-1000, Math.min(1000, displayScore));
      // Map -1000..1000 to 0..100
      evalPercent = 50 + (capped / 20);
  }

  // Format Nodes
  const formatNodes = (n: number) => {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
      return n.toString();
  };

  // Generate SAN for Best Move
  let bestMoveSan = "";
  if (result.bestMove) {
      // Find the fully hydrated legal move corresponding to the engine's minimal move
      const legalMoves = getLegalMoves(gameState);
      const matchedMove = legalMoves.find(m => 
          m.from === result.bestMove!.from && 
          m.to === result.bestMove!.to && 
          m.promotion === result.bestMove!.promotion
      );
      
      if (matchedMove) {
          const tempState = makeMove(gameState, matchedMove);
          bestMoveSan = moveToSan(matchedMove, gameState, tempState);
      } else {
          // Fallback if not found (shouldn't happen)
          bestMoveSan = `${String.fromCharCode(97 + (result.bestMove.from % 8))}${8 - Math.floor(result.bestMove.from / 8)} -> ...`;
      }
  }

  return (
    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 w-full max-w-[600px] mt-2 shadow-lg">
      <div className="flex justify-between items-end mb-1">
        <h3 className="text-xs font-bold text-slate-300">Engine Analysis</h3>
        {result.isThinking && (
          <span className="text-[10px] font-mono text-emerald-400 animate-pulse">
            {nps.toLocaleString()} NPS
          </span>
        )}
      </div>
      
      {/* Evaluation Bar */}
      <div className="w-full h-3 bg-slate-600 rounded-full overflow-hidden relative mb-2 border border-slate-700">
         <div 
           className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 transition-all duration-500"
           style={{ width: `${evalPercent}%` }}
         />
         <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-900/80 z-10" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
        <div className="bg-slate-700/50 p-1.5 rounded">
           <p className="text-[10px] text-slate-500 uppercase font-semibold">Evaluation ({isFlipped ? 'Black' : 'White'})</p>
           <p className={`font-mono text-lg leading-tight font-bold ${displayScore > 0 ? 'text-green-400' : displayScore < 0 ? 'text-red-400' : 'text-slate-200'}`}>
             {scoreDisplay}
           </p>
        </div>
        <div className="bg-slate-700/50 p-1.5 rounded">
           <p className="text-[10px] text-slate-500 uppercase font-semibold">Nodes Searched</p>
           <p className="font-mono text-slate-200 text-lg leading-tight">
             {formatNodes(result.nodesSearched)}
           </p>
        </div>
      </div>

      <div className="space-y-0.5 mb-2">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Depth Progress</span>
          <span>{result.currentDepth} / {configDepth}</span>
        </div>
        <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${result.isThinking ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${result.isThinking ? progressPercent : 100}%` }}
          />
        </div>
      </div>
      
      {!result.isThinking && bestMoveSan && (
         <div className="mt-2 pt-2 border-t border-slate-700">
           <div className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Best Line Found</div>
           <div className="text-emerald-400 font-mono text-xl font-bold flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             {bestMoveSan}
           </div>
         </div>
      )}

      <div className="mt-2 pt-1 border-t border-slate-700">
          <p className="text-[10px] text-slate-500 mb-0.5 font-bold">WORKER LOGS</p>
          <div ref={logsRef} className="h-16 bg-black/50 rounded p-1.5 overflow-y-auto font-mono text-[9px] text-slate-400 leading-tight">
            {result.logs.length === 0 ? (
                <span className="italic opacity-50">Waiting for engine...</span>
            ) : (
                result.logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
      </div>
    </div>
  );
};
