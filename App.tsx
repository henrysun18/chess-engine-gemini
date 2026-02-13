
import React, { useState, useEffect, useRef } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ImportExportModal } from './components/ImportExportModal';
import { CapturedPieces } from './components/CapturedPieces';
import { GameState, Move, EngineConfig, EngineResult, PieceType } from './types';
import { parseFen, generateFen, getLegalMoves, makeMove, pgnToGameState, gameStateToPgn } from './utils/chessRules';
import { fetchOpeningMove } from './utils/openingBook';
import { INITIAL_FEN } from './constants';
import { workerCode } from './services/engineWorkerBuilder';

function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>(parseFen(INITIAL_FEN));
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [engineEnabled, setEngineEnabled] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ move: Move; from: number; to: number } | null>(null);
  
  // Engine State
  const [engineConfig, setEngineConfig] = useState<EngineConfig>({ 
    depth: 6, 
    timeLimit: 2000, 
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

  // Worker ref
  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker Once
  useEffect(() => {
    if (!workerRef.current) {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        workerRef.current = new Worker(url);
        
        workerRef.current.onmessage = (e) => {
             const { type, bestMove, score, nodes, depth, message } = e.data;
             if (type === 'log') {
                setEngineResult(prev => ({ ...prev, logs: [...prev.logs, `[Worker] ${message}`].slice(-50) }));
             } else if (type === 'progress') {
                setEngineResult(prev => ({ ...prev, evaluation: score, nodesSearched: nodes, currentDepth: depth, isThinking: true, bestMove: bestMove }));
             } else if (type === 'done') {
                setEngineResult(prev => ({ ...prev, bestMove, evaluation: score, nodesSearched: nodes, currentDepth: depth, isThinking: false, pv: [] }));
             }
        };

        workerRef.current.onerror = (err) => {
             console.error("Worker error:", err);
             setEngineResult(prev => ({ ...prev, isThinking: false, logs: [...prev.logs, `[CRITICAL] Worker crashed: ${err.message}`] }));
        };
    }
    
    return () => {
        // Cleanup on unmount only
        workerRef.current?.terminate();
        workerRef.current = null;
    };
  }, []);

  // Run Analysis Logic (Triggered by state changes)
  useEffect(() => {
    // If engine disabled or game over, stop.
    if (!engineEnabled || gameState.isGameOver) {
        setEngineResult(prev => ({ ...prev, isThinking: false, bestMove: null }));
        return;
    }

    const runAnalysis = async () => {
        const requestId = Date.now();

        // If worker is currently thinking, we must terminate it to stop the old search
        // This is the only way to "interrupt" the synchronous JS loop in the worker.
        // We accept the loss of TT cache in this specific race condition (user moves fast).
        if (engineResult.isThinking && workerRef.current) {
             workerRef.current.terminate();
             // Recreate immediately
             const blob = new Blob([workerCode], { type: 'application/javascript' });
             const url = URL.createObjectURL(blob);
             workerRef.current = new Worker(url);
             // Reattach listeners
             workerRef.current.onmessage = (e) => {
                 const { type, bestMove, score, nodes, depth, message } = e.data;
                 if (type === 'log') {
                    setEngineResult(prev => ({ ...prev, logs: [...prev.logs, `[Worker] ${message}`].slice(-50) }));
                 } else if (type === 'progress') {
                    setEngineResult(prev => ({ ...prev, evaluation: score, nodesSearched: nodes, currentDepth: depth, isThinking: true, bestMove: bestMove }));
                 } else if (type === 'done') {
                    setEngineResult(prev => ({ ...prev, bestMove, evaluation: score, nodesSearched: nodes, currentDepth: depth, isThinking: false, pv: [] }));
                 }
             };
        }

        setEngineResult(prev => ({ ...prev, isThinking: true, bestMove: null, currentDepth: 0, logs: [] }));

        // Check Opening Book
        if (gameState.fullMoveNumber <= 20) {
            setEngineResult(prev => ({ ...prev, logs: ['Checking Lichess Masters Book...'] }));
            const bookMove = await fetchOpeningMove(gameState);
            
            // Check if we are still consistent (e.g. user didn't disable engine while waiting)
            if (!engineEnabled) return;

            if (bookMove) {
                setEngineResult(prev => ({
                    ...prev,
                    isThinking: false,
                    bestMove: bookMove,
                    evaluation: 0,
                    nodesSearched: 0,
                    currentDepth: 0,
                    logs: [...prev.logs, `Book Move Found: ${bookMove.from}->${bookMove.to}`]
                }));
                return; 
            } else {
                setEngineResult(prev => ({ ...prev, logs: [...prev.logs, 'Book move not found. Starting Engine...'] }));
            }
        }

        if (workerRef.current) {
            const fen = generateFen(gameState);
            workerRef.current.postMessage({
                fen,
                depth: engineConfig.depth,
                timeLimit: engineConfig.timeLimit,
                requestId
            });
        }
    };

    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, engineEnabled, engineConfig]); // Re-run when these change


  // Handle Square Click
  const handleSquareClick = (index: number) => {
    if (gameState.isGameOver || pendingPromotion) return;

    if (selectedSquare === index) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const move = legalMoves.find(m => m.to === index);
    if (move && selectedSquare !== null) {
      if (move.promotion) {
          // Trigger promotion UI instead of executing
          setPendingPromotion({ move, from: move.from, to: move.to });
      } else {
          executeMove(move);
      }
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
    setPendingPromotion(null);
  };

  const handlePromotionSelection = (type: PieceType) => {
      if (pendingPromotion) {
          const move = { ...pendingPromotion.move, promotion: type };
          executeMove(move);
      }
  };

  const handleUndo = () => {
    if (gameState.history.length === 0) return;
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
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4 font-sans">
      <div className="w-full max-w-[1600px] flex flex-col md:flex-row gap-8 items-start justify-center relative">
        
        {/* Promotion Overlay */}
        {pendingPromotion && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
                <div className="bg-slate-800 p-4 rounded-lg shadow-2xl border border-slate-600 flex gap-4 animate-in zoom-in">
                    {(['q', 'r', 'b', 'n'] as PieceType[]).map(type => (
                        <button 
                           key={type}
                           onClick={() => handlePromotionSelection(type)}
                           className="w-16 h-16 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center transition-colors border-2 border-transparent hover:border-amber-500"
                        >
                            <img 
                                src={`https://upload.wikimedia.org/wikipedia/commons/${gameState.turn === 'w' ? '1/15/Chess_qlt45.svg'.replace('q', type) : '4/47/Chess_qdt45.svg'.replace('q', type)}`} 
                                alt={type} 
                                className="w-12 h-12"
                            />
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Left Column: Board */}
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
          </div>
          <p className="text-xs text-slate-500 mt-2">Drag bottom-right to resize board</p>
        </div>

        {/* Right Column: UI & Analysis */}
        <div className="w-full md:w-[400px] flex-shrink-0 flex flex-col gap-4">
           <header className="mb-4">
             <h1 className="text-3xl font-extrabold text-amber-500 tracking-tight">Grandmaster Logic</h1>
             <p className="text-slate-400 text-sm">v4.0 • Persistent TT Cache • PVS • LMR</p>
           </header>
           
           <CapturedPieces board={gameState.board} />

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
             <AnalysisPanel 
                result={engineResult} 
                turn={gameState.turn} 
                configDepth={engineConfig.depth} 
                gameState={gameState} 
             />
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
