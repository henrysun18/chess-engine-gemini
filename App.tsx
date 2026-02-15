
import { useState, useEffect, useRef } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ImportExportModal } from './components/ImportExportModal';
import { CapturedPieces } from './components/CapturedPieces';
import { GameState, Move, EngineConfig, EngineResult, PieceType } from './types';
import { parseFen, generateFen, getLegalMoves, makeMove, pgnToGameState, gameStateToPgn } from './utils/chessRules';
import { fetchOpeningMove } from './utils/openingBook';
import { INITIAL_FEN } from './constants';
import { workerCodeA, workerCodeB } from './services/engineWorkerBuilder';
import { playBellSound, setAppTitle } from './utils/notifications';
import { PieceIcon } from './components/PieceIcons';

function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>(parseFen(INITIAL_FEN));
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [engineEnabled, setEngineEnabled] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ move: Move; from: number; to: number } | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Engine State
  const [engineConfig, setEngineConfig] = useState<EngineConfig>({ 
    engineId: 'A',
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

  // --- Engine Lifecycle Management ---
  useEffect(() => {
    // 1. Terminate existing worker immediately when key dependencies change
    // This allows switching between Engine A and B
    if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
    }

    // If engine is disabled or game over, stop here.
    if (!engineEnabled || gameState.isGameOver) {
        setEngineResult(prev => ({ ...prev, isThinking: false, bestMove: null }));
        setAppTitle('idle');
        return;
    }

    // 2. Create new Worker with the correct code (A or B)
    const code = engineConfig.engineId === 'B' ? workerCodeB : workerCodeA;
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;

    // 3. Setup message handler
    worker.onmessage = (e) => {
        const { type, bestMove, score, nodes, depth, message } = e.data;
        if (type === 'log') {
            setEngineResult(prev => ({ ...prev, logs: [...prev.logs, `[Worker ${engineConfig.engineId}] ${message}`].slice(-50) }));
        } else if (type === 'progress') {
            setEngineResult(prev => ({ ...prev, evaluation: score, nodesSearched: nodes, currentDepth: depth, isThinking: true, bestMove: bestMove }));
        } else if (type === 'done') {
            playBellSound();
            setAppTitle('done');
            setEngineResult(prev => ({ ...prev, bestMove, evaluation: score, nodesSearched: nodes, currentDepth: depth, isThinking: false, pv: [] }));
        }
    };

    worker.onerror = (err) => {
        console.error("Worker error:", err);
        setEngineResult(prev => ({ ...prev, isThinking: false, logs: [...prev.logs, `[CRITICAL] Worker crashed: ${err.message}`] }));
    };

    const runAnalysis = async () => {
        const requestId = Date.now();
        setAppTitle('thinking');
        
        // Reset UI for new think
        setEngineResult(prev => ({ ...prev, isThinking: true, bestMove: null, currentDepth: 0, logs: [] }));

        // Check Opening Book (Only if less than 20 moves)
        if (gameState.fullMoveNumber <= 20) {
            setEngineResult(prev => ({ ...prev, logs: ['Checking Lichess Masters Book...'] }));
            const bookMove = await fetchOpeningMove(gameState);
            
            // Check consistency (user might have disabled engine)
            if (!workerRef.current) return;

            if (bookMove) {
                playBellSound();
                setAppTitle('done');
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
                setEngineResult(prev => ({ ...prev, logs: [...prev.logs, `Book move not found. Starting Engine ${engineConfig.engineId}...`] }));
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

    // 4. Cleanup
    return () => {
        worker.terminate();
        URL.revokeObjectURL(url);
        workerRef.current = null;
    };
  }, [gameState, engineEnabled, engineConfig.engineId, engineConfig.depth, engineConfig.timeLimit, engineConfig.branchingFactor, engineConfig.useDynamicBranching]);


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
    setAppTitle('idle');
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
    setAppTitle('idle');
  };

  const handleReset = () => {
    setGameState(parseFen(INITIAL_FEN));
    setEngineResult({ bestMove: null, evaluation: 0, nodesSearched: 0, currentDepth: 0, isThinking: false, pv: [], logs: [] });
    setSelectedSquare(null);
    setLegalMoves([]);
    setAppTitle('idle');
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
          setAppTitle('idle');
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
                            <div className="w-12 h-12">
                                <PieceIcon color={gameState.turn} type={type} />
                            </div>
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
                isFlipped={isFlipped}
              />
          </div>
          <p className="text-xs text-slate-500 mt-2">Drag bottom-right to resize board</p>
        </div>

        {/* Right Column: UI & Analysis */}
        <div className="w-full md:w-[400px] flex-shrink-0 flex flex-col gap-4">
           <header className="mb-4">
             <h1 className="text-3xl font-extrabold text-amber-500 tracking-tight">Grandmaster Logic</h1>
             <p className="text-slate-400 text-sm">
                 {engineEnabled ? 
                    (engineConfig.engineId === 'B' ? 'v5.0 • Engine B: Neural Accumulator + NMP' : 'v4.0 • Engine A: Classic PeSTO + PVS') 
                    : 'Select an engine to begin analysis'}
             </p>
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
             isFlipped={isFlipped}
             onFlipBoard={() => setIsFlipped(!isFlipped)}
           />

           {engineEnabled && (
             <AnalysisPanel 
                result={engineResult} 
                turn={gameState.turn} 
                configDepth={engineConfig.depth} 
                gameState={gameState} 
                isFlipped={isFlipped}
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
