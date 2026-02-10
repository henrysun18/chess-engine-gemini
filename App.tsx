
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ImportExportModal } from './components/ImportExportModal';
import { CapturedPieces } from './components/CapturedPieces';
import { GameState, Move, EngineConfig, EngineResult, BoardState } from './types';
import { parseFen, generateFen, getLegalMoves, makeMove, getIndex, pgnToGameState, gameStateToPgn } from './utils/chessRules';
import { INITIAL_FEN } from './constants';
import { workerCode } from './services/engineWorkerBuilder';

function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>(parseFen(INITIAL_FEN));
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [engineEnabled, setEngineEnabled] = useState(false);
  
  // Engine State
  const [engineConfig, setEngineConfig] = useState<EngineConfig>({ 
    depth: 4, 
    branchingFactor: 10,
    useDynamicBranching: true 
  });
  const [engineResult, setEngineResult] = useState<EngineResult>({
    bestMove: null, evaluation: 0, nodesSearched: 0, currentDepth: 0, isThinking: false, pv: [], logs: []
  });

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'fen' | 'pgn';
    mode: 'import' | 'export';
    value?: string;
  }>({ isOpen: false, type: 'fen', mode: 'import' });

  const workerRef = useRef<Worker | null>(null);
  const currentRequestId = useRef<number>(0);

  // Initialize Worker
  useEffect(() => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    workerRef.current = new Worker(url);

    workerRef.current.onmessage = (e) => {
      const { type, bestMove, score, nodes, depth, requestId, message } = e.data;
      
      // Prevent race conditions
      if (requestId !== undefined && requestId !== currentRequestId.current) return;

      if (type === 'log') {
         setEngineResult(prev => ({
             ...prev,
             logs: [...prev.logs, `[Worker] ${message}`].slice(-50) // Keep last 50 logs
         }));
      } else if (type === 'progress') {
        setEngineResult(prev => ({ 
          ...prev, 
          evaluation: score, 
          nodesSearched: nodes, 
          currentDepth: depth,
          isThinking: true, 
          bestMove: bestMove 
        }));
      } else if (type === 'done') {
        setEngineResult(prev => ({
          ...prev,
          bestMove, evaluation: score, nodesSearched: nodes, currentDepth: depth, isThinking: false, pv: []
        }));
      }
    };

    return () => {
      workerRef.current?.terminate();
      URL.revokeObjectURL(url);
    };
  }, []);

  // Trigger Engine Analysis
  useEffect(() => {
    if (engineEnabled && !gameState.isGameOver && workerRef.current) {
      const fen = generateFen(gameState);
      
      const requestId = Date.now();
      currentRequestId.current = requestId;

      // Reset thinking state
      setEngineResult(prev => ({ ...prev, isThinking: true, bestMove: null, currentDepth: 0, logs: [] })); 
      
      workerRef.current.postMessage({
        fen,
        depth: engineConfig.depth,
        branchingFactor: engineConfig.branchingFactor,
        useDynamicBranching: engineConfig.useDynamicBranching,
        requestId
      });
    } else {
        setEngineResult(prev => ({...prev, isThinking: false, bestMove: null }));
    }
  }, [gameState, engineEnabled, engineConfig]);

  // Handle Square Click
  const handleSquareClick = (index: number) => {
    if (gameState.isGameOver) return;

    if (selectedSquare === index) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const move = legalMoves.find(m => m.to === index);
    if (move && selectedSquare !== null) {
      executeMove(move);
      return;
    }

    const piece = gameState.board[index];
    if (piece && piece.color === gameState.turn) {
      setSelectedSquare(index);
      const allLegal = getLegalMoves(gameState);
      setLegalMoves(allLegal.filter(m => m.from === index));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const executeMove = (move: Move) => {
    const newState = makeMove(gameState, move);
    setGameState(newState);
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handleUndo = () => {
    if (gameState.history.length === 0) return;
    
    // Naive Replay Undo
    let tempState = parseFen(INITIAL_FEN);
    for (let i = 0; i < gameState.history.length - 1; i++) {
        tempState = makeMove(tempState, gameState.history[i]);
    }
    setGameState(tempState);
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handleReset = () => {
    setGameState(parseFen(INITIAL_FEN));
    setEngineResult({ bestMove: null, evaluation: 0, nodesSearched: 0, currentDepth: 0, isThinking: false, pv: [], logs: [] });
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  // --- Import / Export Handlers ---

  const openModal = (type: 'fen' | 'pgn', mode: 'import' | 'export') => {
      let value = '';
      if (mode === 'export') {
          value = type === 'fen' ? generateFen(gameState) : gameStateToPgn(gameState);
      }
      setModalState({ isOpen: true, type, mode, value });
  };

  const handleModalImport = (text: string) => {
      try {
          let newState;
          if (modalState.type === 'fen') {
              newState = parseFen(text);
          } else {
              newState = pgnToGameState(text);
          }
          setGameState(newState);
          setEngineResult({ bestMove: null, evaluation: 0, nodesSearched: 0, currentDepth: 0, isThinking: false, pv: [], logs: [] });
          setLegalMoves([]);
          setSelectedSquare(null);
      } catch (e) {
          alert(`Invalid ${modalState.type.toUpperCase()} string or move sequence.`);
          console.error(e);
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4 font-sans">
      <div className="w-full max-w-[1600px] flex flex-col md:flex-row gap-8 items-start justify-center">
        
        {/* Left Column: Board (Resizable) */}
        <div className="flex-1 w-full flex flex-col items-center min-w-0">
          <div className="resize-x overflow-hidden w-full max-w-full min-w-[300px] aspect-square relative shadow-2xl rounded-sm">
             <Board 
                board={gameState.board} 
                turn={gameState.turn}
                onSquareClick={handleSquareClick}
                selectedSquare={selectedSquare}
                validMoves={legalMoves}
                lastMove={gameState.history.length > 0 ? gameState.history[gameState.history.length - 1] : null}
                bestMove={engineResult.bestMove}
              />
              {/* Visual drag handle hint */}
              <div className="absolute bottom-1 right-1 w-4 h-4 pointer-events-none opacity-50">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-9-9m9 5l-5-5"/></svg>
              </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Drag bottom-right to resize board</p>
        </div>

        {/* Right Column: UI & Analysis */}
        <div className="w-full md:w-[400px] flex-shrink-0 flex flex-col gap-4">
           <header className="mb-4">
             <h1 className="text-3xl font-extrabold text-amber-500 tracking-tight">Grandmaster Logic</h1>
             <p className="text-slate-400 text-sm">Custom TS Engine • Minimax • Alpha-Beta</p>
           </header>
           
           <CapturedPieces history={gameState.history} />

           <Controls 
             onReset={handleReset}
             onUndo={handleUndo}
             onImportFen={() => openModal('fen', 'import')}
             onExportFen={() => openModal('fen', 'export')}
             onImportPgn={() => openModal('pgn', 'import')}
             onExportPgn={() => openModal('pgn', 'export')}
             config={engineConfig}
             setConfig={setEngineConfig}
             engineEnabled={engineEnabled}
             setEngineEnabled={setEngineEnabled}
             gameState={gameState.isGameOver ? (gameState.winner ? `Winner: ${gameState.winner}` : 'Draw') : 'playing'}
           />

           {engineEnabled && (
             <AnalysisPanel result={engineResult} turn={gameState.turn} configDepth={engineConfig.depth} />
           )}
           
           <div className="p-4 bg-slate-800/50 rounded text-xs text-slate-500 border border-slate-800">
             <h4 className="font-bold text-slate-400 mb-1">Debug Info</h4>
             <p>Moves in history: {gameState.history.length}</p>
             <p>Hash: {generateFen(gameState).substring(0, 20)}...</p>
           </div>
        </div>
      </div>

      <ImportExportModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onImport={handleModalImport}
        title={`${modalState.mode === 'import' ? 'Import' : 'Export'} ${modalState.type.toUpperCase()}`}
        defaultValue={modalState.value}
        isExport={modalState.mode === 'export'}
      />
    </div>
  );
}

export default App;
