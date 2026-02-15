
import React, { useState, useEffect } from 'react';
import { EngineConfig } from '../types';

interface ControlsProps {
  onReset: () => void;
  onUndo: () => void;
  onImportFen: () => void;
  onExportFen: () => void;
  onImportPgn: () => void;
  onExportPgn: () => void;
  config: EngineConfig;
  setConfig: (c: EngineConfig) => void;
  engineEnabled: boolean;
  setEngineEnabled: (b: boolean) => void;
  gameState: string; // 'playing', 'checkmate', etc
  isFlipped: boolean;
  onFlipBoard: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ 
  onReset, onUndo, onImportFen, onExportFen, onImportPgn, onExportPgn,
  config, setConfig, engineEnabled, setEngineEnabled, gameState,
  isFlipped, onFlipBoard
}) => {
  // Local state for sliders to prevent rapid-fire updates to the engine
  const [localDepth, setLocalDepth] = useState(config.depth);
  const [localTime, setLocalTime] = useState(config.timeLimit);
  const [localBranching, setLocalBranching] = useState(config.branchingFactor);

  // Sync local state if parent config changes externally (e.g. reset)
  useEffect(() => {
    setLocalDepth(config.depth);
    setLocalTime(config.timeLimit);
    setLocalBranching(config.branchingFactor);
  }, [config]);

  const commitChanges = () => {
    setConfig({
      ...config,
      depth: localDepth,
      timeLimit: localTime,
      branchingFactor: localBranching
    });
  };

  const handleEngineSelect = (id: 'OFF' | 'A' | 'B') => {
      if (id === 'OFF') {
          setEngineEnabled(false);
      } else {
          setEngineEnabled(true);
          // Auto-adjust parameters for Engine B (NNUE is slower per node, but searches smarter)
          if (id === 'B' && config.engineId !== 'B') {
               setConfig({ ...config, engineId: 'B', depth: 8, timeLimit: 3000 });
               setLocalDepth(8);
               setLocalTime(3000);
          } else if (id === 'A' && config.engineId !== 'A') {
               setConfig({ ...config, engineId: 'A' });
          }
      }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700 w-full max-w-[600px]">
      <div className="flex justify-between items-center border-b border-slate-700 pb-1 mb-1">
        <h2 className="text-lg font-bold text-amber-500">Controls</h2>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${gameState === 'playing' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'}`}>
          {gameState.toUpperCase()}
        </span>
      </div>

      <div className="flex gap-2">
        <button onClick={onUndo} className="flex-1 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-xs font-medium transition-colors">
          Undo
        </button>
        <button 
          onClick={onFlipBoard} 
          className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${isFlipped ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
        >
          {isFlipped ? 'Unflip' : 'Flip'} Board
        </button>
        <button onClick={onReset} className="flex-1 bg-red-900/50 hover:bg-red-800/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium transition-colors">
          Reset
        </button>
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">Engine Selection</label>
          <div className="flex bg-slate-900 rounded p-1 gap-1">
              <button 
                onClick={() => handleEngineSelect('OFF')}
                className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${!engineEnabled ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  OFF
              </button>
              <button 
                onClick={() => handleEngineSelect('A')}
                className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${engineEnabled && config.engineId === 'A' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  ENGINE A (Classic)
              </button>
              <button 
                onClick={() => handleEngineSelect('B')}
                className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${engineEnabled && config.engineId === 'B' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  ENGINE B (Neural)
              </button>
          </div>
        </div>

        {engineEnabled && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 animate-in fade-in">
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Max Depth</label>
                <span className="text-[10px] font-mono text-amber-400">{localDepth}</span>
              </div>
              <input 
                type="range" min="1" max={config.engineId === 'B' ? 14 : 12} step="1" 
                value={localDepth} 
                onChange={(e) => setLocalDepth(parseInt(e.target.value))}
                onMouseUp={commitChanges}
                onTouchEnd={commitChanges}
                className="w-full accent-amber-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Time Limit</label>
                <span className="text-[10px] font-mono text-amber-400">{(localTime / 1000).toFixed(1)}s</span>
              </div>
              <input 
                type="range" min="500" max="120000" step="500" 
                value={localTime} 
                onChange={(e) => setLocalTime(parseInt(e.target.value))}
                onMouseUp={commitChanges}
                onTouchEnd={commitChanges}
                className="w-full accent-amber-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between col-span-2 pt-1">
               <label className="text-[10px] text-slate-300">
                  {config.engineId === 'A' ? 'Smart Pruning (PVS + LMR)' : 'Deep Search (NMP + Futility)'}
               </label>
               <input 
                 type="checkbox"
                 checked={config.useDynamicBranching}
                 onChange={(e) => setConfig({...config, useDynamicBranching: e.target.checked})}
                 className="w-3 h-3 rounded accent-amber-500"
               />
            </div>
            
            {!config.useDynamicBranching && (
                <div className="space-y-0.5 col-span-2">
                  <div className="flex justify-between">
                     <label className="text-[10px] text-slate-400">Branching Factor</label>
                     <span className="text-[10px] font-mono text-amber-400">{localBranching}</span>
                  </div>
                  <input 
                    type="range" min="2" max="50" step="1" 
                    value={localBranching} 
                    onChange={(e) => setLocalBranching(parseInt(e.target.value))}
                    onMouseUp={commitChanges}
                    onTouchEnd={commitChanges}
                    className="w-full accent-amber-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-1 border-t border-slate-700 grid grid-cols-4 gap-1">
        <button onClick={onImportFen} className="text-center px-1 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded text-[10px] text-slate-300 transition-colors">
          In FEN
        </button>
        <button onClick={onExportFen} className="text-center px-1 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded text-[10px] text-slate-300 transition-colors">
          Out FEN
        </button>
        <button onClick={onImportPgn} className="text-center px-1 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded text-[10px] text-slate-300 transition-colors">
          In PGN
        </button>
        <button onClick={onExportPgn} className="text-center px-1 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded text-[10px] text-slate-300 transition-colors">
          Out PGN
        </button>
      </div>
    </div>
  );
};
