
import { GameState, Move } from '../types';
import { generateFen, getLegalMoves, makeMove, moveToSan } from './chessRules';

const LICHESS_API_URL = 'https://explorer.lichess.ovh/masters';

export const fetchOpeningMove = async (gameState: GameState): Promise<Move | null> => {
  // Only check opening book for the first 12 full moves to save API calls/time
  if (gameState.fullMoveNumber > 12) return null;

  try {
    // Generate FEN but strip move clocks as the book doesn't care about 50-move rule usually
    const fen = generateFen(gameState);
    const cleanFen = fen.split(' ').slice(0, 4).join(' '); // fen without clocks
    
    // We pass the full FEN to lichess
    const response = await fetch(`${LICHESS_API_URL}?fen=${encodeURIComponent(fen)}&moves=5`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // If no moves found in masters db
    if (!data.moves || data.moves.length === 0) return null;

    // Logic: Pick a move. 
    // We want some variety, but mostly the best move. 
    // We'll use a weighted random based on "white" + "draws" + "black" wins sum (popularity).
    
    const moves = data.moves;
    const totalGames = moves.reduce((acc: number, m: any) => acc + m.white + m.draws + m.black, 0);
    
    let randomVal = Math.random() * totalGames;
    let selectedSan = moves[0].san;
    
    for (const moveData of moves) {
        const weight = moveData.white + moveData.draws + moveData.black;
        if (randomVal <= weight) {
            selectedSan = moveData.san;
            break;
        }
        randomVal -= weight;
    }

    // Convert SAN back to our internal Move object
    const legalMoves = getLegalMoves(gameState);
    
    // We need to match the SAN. 
    // Warning: Our `moveToSan` is basic. Ideally we match purely by UCI if available, but Lichess gives UCI too.
    const selectedUci = moves.find((m: any) => m.san === selectedSan)?.uci; // e.g. "e2e4"
    
    if (selectedUci) {
        const found = legalMoves.find(m => {
            const fromSq = (8 - parseInt(selectedUci[1])) * 8 + (selectedUci.charCodeAt(0) - 97);
            const toSq = (8 - parseInt(selectedUci[3])) * 8 + (selectedUci.charCodeAt(2) - 97);
            
            // Handle promotion notation in UCI (e.g. a7a8q)
            if (selectedUci.length === 5) {
                return m.from === fromSq && m.to === toSq && m.promotion === selectedUci[4];
            }
            return m.from === fromSq && m.to === toSq;
        });
        if (found) return found;
    }

    // Fallback: Try to match SAN
    for (const move of legalMoves) {
        // Create temp state to verify SAN
        const tempState = makeMove(gameState, move);
        // Note: This relies on our `moveToSan` matching Lichess exactly, which might have edge cases.
        // The UCI method above is much safer.
        if (moveToSan(move, gameState, tempState) === selectedSan) {
            return move;
        }
    }

    return null;

  } catch (error) {
    console.warn("Opening book fetch failed:", error);
    return null;
  }
};
