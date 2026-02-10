
import React, { useEffect, useState, useRef } from 'react';
import { EngineResult, PieceColor } from '../types';

interface AnalysisPanelProps {
  result: EngineResult;
  turn: PieceColor;
  configDepth: number;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ result, turn, configDepth }) => {
  const [nps, setNps] = useState(0);
  const prevNodes = useRef(0);
  const lastTime = useRef(Date.now());
  const logsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [result.logs]);

  // Calculate NPS (Nodes Per Second) for active feedback
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

  // Normalize score for display (Standard Convention: Positive = White winning)
  let whiteRelativeScore = result.evaluation;
  if (turn === 'b') {
      whiteRelativeScore = -result.evaluation;
  }
  
  const scoreUnit = whiteRelativeScore / 100; // Convert centipawns to pawns
  const scoreDisplay = scoreUnit > 0 ? `+${scoreUnit.toFixed(2)}` : scoreUnit.toFixed(2);
  
  const progressPercent = Math.min(100, (result.currentDepth / configDepth) * 100);
  const evalPercent = Math.min(100, Math.max(0, 50 + (scoreUnit * 10))); 

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
           <p className="text-[10px] text-slate-500 uppercase font-semibold">Evaluation (White)</p>
           <p className={`font-mono text-lg leading-tight font-bold ${scoreUnit > 0 ? 'text-green-400' : scoreUnit < 0 ? 'text-red-400' : 'text-slate-200'}`}>
             {scoreDisplay}
           </p>
        </div>
        <div className="bg-slate-700/50 p-1.5 rounded">
           <p className="text-[10px] text-slate-500 uppercase font-semibold">Nodes Searched</p>
           <p className="font-mono text-slate-200 text-lg leading-tight">
             {(result.nodesSearched / 1000).toFixed(1)}k
           </p>
        </div>
      </div>

      {/* Depth Progress Bar */}
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
      
      {!result.isThinking && result.bestMove && (
         <div className="mt-2 pt-2 border-t border-slate-700">
           <div className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Best Line Found</div>
           <div className="text-emerald-400 font-mono text-base flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
             {String.fromCharCode(97 + (result.bestMove.from % 8))}{8 - Math.floor(result.bestMove.from / 8)} 
             &nbsp;&rarr;&nbsp; 
             {String.fromCharCode(97 + (result.bestMove.to % 8))}{8 - Math.floor(result.bestMove.to / 8)}
           </div>
         </div>
      )}

      {/* Debug Logs */}
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
