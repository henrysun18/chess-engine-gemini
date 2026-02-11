
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
}

export const Controls: React.FC<ControlsProps> = ({ 
  onReset, onUndo, onImportFen, onExportFen, onImportPgn, onExportPgn,
  config, setConfig, engineEnabled, setEngineEnabled, gameState 
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
        <button onClick={onReset} className="flex-1 bg-red-900/50 hover:bg-red-800/50 text-red-200 px-3 py-1.5 rounded text-xs font-medium transition-colors">
          Reset
        </button>
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300">Engine Analysis</label>
          <button 
            onClick={() => setEngineEnabled(!engineEnabled)}
            className={`w-10 h-5 rounded-full transition-colors relative ${engineEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${engineEnabled ? 'left-5.5' : 'left-0.5'}`} style={{left: engineEnabled ? '22px' : '2px'}} />
          </button>
        </div>

        {engineEnabled && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Max Depth</label>
                <span className="text-[10px] font-mono text-amber-400">{localDepth}</span>
              </div>
              <input 
                type="range" min="1" max="12" step="1" 
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
               <label className="text-[10px] text-slate-300">Smart Pruning (PVS + LMR)</label>
               <input 
                 type="checkbox"
                 checked={config.useDynamicBranching}
                 onChange={(e) => setConfig({...config, useDynamicBranching: e.target.checked})}
                 className="w-3 h-3 rounded accent-amber-500"
               />
            </div>
            
            {!config.useDynamicBranching && (
                <div className="space-y-0.5 col-span-2 animate-in fade-in">
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
