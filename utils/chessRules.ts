
import { BoardState, Move, PieceColor, Piece, PieceType, GameState } from '../types';
import { INITIAL_FEN } from '../constants';

// --- Helpers ---
export const getRow = (i: number) => Math.floor(i / 8);
export const getCol = (i: number) => i % 8;
export const getIndex = (r: number, c: number) => r * 8 + c;
export const onBoard = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const isOpponent = (p: Piece | null, color: PieceColor) => p !== null && p.color !== color;

// --- FEN Parsing & Serializing ---

export const parseFen = (fen: string): GameState => {
  const parts = fen.split(' ');
  const board: BoardState = new Array(64).fill(null);
  
  let row = 0;
  let col = 0;
  
  for (const char of parts[0]) {
    if (char === '/') {
      row++;
      col = 0;
    } else if (/\d/.test(char)) {
      col += parseInt(char);
    } else {
      const color: PieceColor = char === char.toUpperCase() ? 'w' : 'b';
      const type: PieceType = char.toLowerCase() as PieceType;
      board[getIndex(row, col)] = { color, type };
      col++;
    }
  }

  const turn = parts[1] as PieceColor;
  const castlingRights = parts[2];
  const enPassant = parts[3] === '-' ? null : 
    getIndex(8 - parseInt(parts[3][1]), parts[3].charCodeAt(0) - 'a'.charCodeAt(0));
  
  return {
    board,
    turn,
    castling: {
      w: { k: castlingRights.includes('K'), q: castlingRights.includes('Q') },
      b: { k: castlingRights.includes('k'), q: castlingRights.includes('q') },
    },
    enPassantTarget: enPassant,
    halfMoveClock: parseInt(parts[4]) || 0,
    fullMoveNumber: parseInt(parts[5]) || 1,
    history: [],
    isGameOver: false,
    winner: null
  };
};

export const generateFen = (state: GameState): string => {
  let fen = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const piece = state.board[getIndex(r, c)];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) { fen += empty; empty = 0; }
        const code = piece.type;
        fen += piece.color === 'w' ? code.toUpperCase() : code;
      }
    }
    if (empty > 0) fen += empty;
    if (r < 7) fen += '/';
  }

  fen += ` ${state.turn} `;
  let castling = '';
  if (state.castling.w.k) castling += 'K';
  if (state.castling.w.q) castling += 'Q';
  if (state.castling.b.k) castling += 'k';
  if (state.castling.b.q) castling += 'q';
  fen += castling || '-';
  
  // Simplified En Passant for FEN generation
  if (state.enPassantTarget !== null) {
    const r = getRow(state.enPassantTarget);
    const c = getCol(state.enPassantTarget);
    const file = String.fromCharCode('a'.charCodeAt(0) + c);
    const rank = 8 - r;
    fen += ` ${file}${rank}`;
  } else {
    fen += ' -';
  }

  fen += ` ${state.halfMoveClock} ${state.fullMoveNumber}`;
  return fen;
};

// --- Check for Insufficient Material ---
export const isInsufficientMaterial = (board: BoardState): boolean => {
  const pieces = board.filter(p => p !== null);
  
  // King vs King
  if (pieces.length === 2) return true;
  
  // King + Minor Piece vs King
  if (pieces.length === 3) {
      const minor = pieces.find(p => p!.type === 'n' || p!.type === 'b');
      if (minor) return true;
  }
  
  return false;
};

// --- Move Generation ---

export const generatePseudoLegalMoves = (state: GameState): Move[] => {
  const moves: Move[] = [];
  const { board, turn } = state;

  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (!piece || piece.color !== turn) continue;

    const r = getRow(i);
    const c = getCol(i);

    if (piece.type === 'p') {
      const forward = turn === 'w' ? -1 : 1;
      const startRow = turn === 'w' ? 6 : 1;
      const promotionRow = turn === 'w' ? 0 : 7;

      const f1 = getIndex(r + forward, c);
      if (onBoard(r + forward, c) && !board[f1]) {
        if (r + forward === promotionRow) {
          ['q', 'r', 'b', 'n'].forEach(pt => {
             moves.push({ from: i, to: f1, piece, promotion: pt as PieceType });
          });
        } else {
          moves.push({ from: i, to: f1, piece });
          const f2 = getIndex(r + forward * 2, c);
          if (r === startRow && !board[f2]) {
            moves.push({ from: i, to: f2, piece, flags: { isPawnDouble: true } });
          }
        }
      }

      const captureOffsets = [[forward, -1], [forward, 1]];
      for (const [dr, dc] of captureOffsets) {
        const nr = r + dr, nc = c + dc;
        if (onBoard(nr, nc)) {
          const targetIdx = getIndex(nr, nc);
          const target = board[targetIdx];
          
          if (target && target.color !== turn) {
             if (nr === promotionRow) {
                ['q', 'r', 'b', 'n'].forEach(pt => {
                   moves.push({ from: i, to: targetIdx, piece, captured: target, promotion: pt as PieceType });
                });
             } else {
                moves.push({ from: i, to: targetIdx, piece, captured: target });
             }
          }
          if (state.enPassantTarget === targetIdx) {
             moves.push({ 
               from: i, 
               to: targetIdx, 
               piece, 
               captured: { color: turn === 'w' ? 'b' : 'w', type: 'p' }, 
               flags: { isEnPassant: true }
             });
          }
        }
      }

    } else if (piece.type === 'n') {
       const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
       for(const [dr, dc] of offsets) {
         if(onBoard(r+dr, c+dc)) {
           const ti = getIndex(r+dr, c+dc);
           const tp = board[ti];
           if(!tp || tp.color !== turn) {
             moves.push({ from: i, to: ti, piece, captured: tp });
           }
         }
       }
    } else if (piece.type === 'k') {
        const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for(const [dr, dc] of offsets) {
          if(onBoard(r+dr, c+dc)) {
            const ti = getIndex(r+dr, c+dc);
            const tp = board[ti];
            if(!tp || tp.color !== turn) {
              moves.push({ from: i, to: ti, piece, captured: tp });
            }
          }
        }
        if (turn === 'w' && !isSquareAttacked(i, 'b', state)) {
           if (state.castling.w.k && !board[61] && !board[62] && !isSquareAttacked(61,'b',state) && !isSquareAttacked(62,'b',state)) {
              moves.push({ from: 60, to: 62, piece, flags: { isCastle: true } });
           }
           if (state.castling.w.q && !board[59] && !board[58] && !board[57] && !isSquareAttacked(59,'b',state) && !isSquareAttacked(58,'b',state)) {
              moves.push({ from: 60, to: 58, piece, flags: { isCastle: true } });
           }
        }
        if (turn === 'b' && !isSquareAttacked(i, 'w', state)) {
           if (state.castling.b.k && !board[5] && !board[6] && !isSquareAttacked(5,'w',state) && !isSquareAttacked(6,'w',state)) {
              moves.push({ from: 4, to: 6, piece, flags: { isCastle: true } });
           }
           if (state.castling.b.q && !board[3] && !board[2] && !board[1] && !isSquareAttacked(3,'w',state) && !isSquareAttacked(2,'w',state)) {
              moves.push({ from: 4, to: 2, piece, flags: { isCastle: true } });
           }
        }

    } else {
      const dirs = [];
      if (piece.type === 'b' || piece.type === 'q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      if (piece.type === 'r' || piece.type === 'q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
      
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while(onBoard(nr, nc)) {
          const ti = getIndex(nr, nc);
          const tp = board[ti];
          if (!tp) {
            moves.push({ from: i, to: ti, piece });
          } else {
            if (tp.color !== turn) {
              moves.push({ from: i, to: ti, piece, captured: tp });
            }
            break; 
          }
          nr += dr;
          nc += dc;
        }
      }
    }
  }

  return moves;
};

export const isSquareAttacked = (squareIdx: number, attackerColor: PieceColor, state: GameState): boolean => {
  const r = getRow(squareIdx);
  const c = getCol(squareIdx);
  
  const pawnRow = attackerColor === 'w' ? r + 1 : r - 1; 
  if (onBoard(pawnRow, c - 1)) {
    const p = state.board[getIndex(pawnRow, c-1)];
    if (p && p.color === attackerColor && p.type === 'p') return true;
  }
  if (onBoard(pawnRow, c + 1)) {
    const p = state.board[getIndex(pawnRow, c+1)];
    if (p && p.color === attackerColor && p.type === 'p') return true;
  }

  const knOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knOffsets) {
     if(onBoard(r+dr, c+dc)) {
       const p = state.board[getIndex(r+dr, c+dc)];
       if(p && p.color === attackerColor && p.type === 'n') return true;
     }
  }
  
  const kOffsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (const [dr, dc] of kOffsets) {
     if(onBoard(r+dr, c+dc)) {
       const p = state.board[getIndex(r+dr, c+dc)];
       if(p && p.color === attackerColor && p.type === 'k') return true;
     }
  }

  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for (let d = 0; d < 8; d++) {
    const [dr, dc] = dirs[d];
    let nr = r + dr, nc = c + dc;
    while(onBoard(nr, nc)) {
       const p = state.board[getIndex(nr, nc)];
       if(p) {
         if(p.color === attackerColor) {
           if(p.type === 'q') return true;
           if(d < 4 && p.type === 'r') return true;
           if(d >= 4 && p.type === 'b') return true;
         }
         break;
       }
       nr += dr; nc += dc;
    }
  }

  return false;
}

export const getLegalMoves = (state: GameState): Move[] => {
  const pseudoMoves = generatePseudoLegalMoves(state);
  const legalMoves: Move[] = [];
  
  for (const move of pseudoMoves) {
    const nextBoard = [...state.board];
    
    nextBoard[move.to] = move.promotion ? { color: move.piece.color, type: move.promotion } : move.piece;
    nextBoard[move.from] = null;
    
    if (move.flags?.isEnPassant) {
       const capturedIdx = move.piece.color === 'w' ? move.to + 8 : move.to - 8;
       nextBoard[capturedIdx] = null;
    }

    if (move.flags?.isCastle) {
        if (move.to === 62) { 
            nextBoard[61] = nextBoard[63]; nextBoard[63] = null;
        } else if (move.to === 58) { 
            nextBoard[59] = nextBoard[56]; nextBoard[56] = null;
        } else if (move.to === 6) { 
            nextBoard[5] = nextBoard[7]; nextBoard[7] = null;
        } else if (move.to === 2) { 
            nextBoard[3] = nextBoard[0]; nextBoard[0] = null;
        }
    }
    
    const kingPos = nextBoard.findIndex(p => p?.type === 'k' && p.color === state.turn);
    
    if (kingPos === -1) continue;

    const opponentColor = state.turn === 'w' ? 'b' : 'w';
    const tempState = { ...state, board: nextBoard };
    
    if (!isSquareAttacked(kingPos, opponentColor, tempState)) {
      legalMoves.push(move);
    }
  }
  
  return legalMoves;
};

export const makeMove = (state: GameState, move: Move): GameState => {
  const newBoard = [...state.board];
  const newCastling = JSON.parse(JSON.stringify(state.castling));
  let enPassantTarget = null;
  let halfMoveClock = state.halfMoveClock + 1;

  newBoard[move.to] = move.promotion ? { color: move.piece.color, type: move.promotion } : move.piece;
  newBoard[move.from] = null;

  if (move.captured) {
    halfMoveClock = 0;
    if (move.flags?.isEnPassant) {
       const capturedIdx = move.piece.color === 'w' ? move.to + 8 : move.to - 8;
       newBoard[capturedIdx] = null;
    }
  }

  if (move.piece.type === 'p') halfMoveClock = 0;

  if (move.flags?.isCastle) {
     if (move.to === 62) { 
        newBoard[61] = newBoard[63]; newBoard[63] = null;
     } else if (move.to === 58) { 
        newBoard[59] = newBoard[56]; newBoard[56] = null;
     } else if (move.to === 6) { 
        newBoard[5] = newBoard[7]; newBoard[7] = null;
     } else if (move.to === 2) { 
        newBoard[3] = newBoard[0]; newBoard[0] = null;
     }
  }

  if (move.piece.type === 'k') {
     if (move.piece.color === 'w') { newCastling.w.k = false; newCastling.w.q = false; }
     else { newCastling.b.k = false; newCastling.b.q = false; }
  }
  const corners = [0, 7, 56, 63];
  if (corners.includes(move.from) || corners.includes(move.to)) {
     if (move.from === 0 || move.to === 0) newCastling.b.q = false;
     if (move.from === 7 || move.to === 7) newCastling.b.k = false;
     if (move.from === 56 || move.to === 56) newCastling.w.q = false;
     if (move.from === 63 || move.to === 63) newCastling.w.k = false;
  }

  if (move.flags?.isPawnDouble) {
    enPassantTarget = move.piece.color === 'w' ? move.from - 8 : move.from + 8;
  }

  const newState: GameState = {
    board: newBoard,
    turn: state.turn === 'w' ? 'b' : 'w',
    castling: newCastling,
    enPassantTarget,
    halfMoveClock,
    fullMoveNumber: state.turn === 'b' ? state.fullMoveNumber + 1 : state.fullMoveNumber,
    history: [...state.history, move],
    isGameOver: false,
    winner: null
  };
  
  const validMoves = getLegalMoves(newState);
  if (validMoves.length === 0) {
     newState.isGameOver = true;
     const kingPos = newState.board.findIndex(p => p?.type === 'k' && p.color === newState.turn);
     if (isSquareAttacked(kingPos, state.turn, newState)) {
        newState.winner = state.turn; 
     } else {
        newState.winner = 'draw';
     }
  } else if (isInsufficientMaterial(newState.board)) {
      newState.isGameOver = true;
      newState.winner = 'draw';
  }
  
  return newState;
};

// --- PGN & SAN Logic ---

const getPieceChar = (type: PieceType) => type === 'p' ? '' : type.toUpperCase();
const getFile = (col: number) => String.fromCharCode('a'.charCodeAt(0) + col);
const getRank = (row: number) => 8 - row;

export const moveToSan = (move: Move, stateBeforeMove: GameState, stateAfterMove: GameState): string => {
  if (move.flags?.isCastle) {
    return move.to > move.from ? 'O-O' : 'O-O-O';
  }

  let san = '';
  const pieceChar = getPieceChar(move.piece.type);
  san += pieceChar;

  if (move.piece.type !== 'p') {
    const legalMoves = getLegalMoves(stateBeforeMove);
    const conflictingMoves = legalMoves.filter(m => 
      m.piece.type === move.piece.type && 
      m.piece.color === move.piece.color && 
      m.to === move.to && 
      m.from !== move.from
    );

    if (conflictingMoves.length > 0) {
      const sameFile = conflictingMoves.some(m => getCol(m.from) === getCol(move.from));
      const sameRank = conflictingMoves.some(m => getRow(m.from) === getRow(move.from));

      if (!sameFile) {
        san += getFile(getCol(move.from));
      } else if (!sameRank) {
        san += getRank(getRow(move.from));
      } else {
        san += getFile(getCol(move.from)) + getRank(getRow(move.from));
      }
    }
  } else {
      if (move.captured || move.flags?.isEnPassant) {
          san += getFile(getCol(move.from));
      }
  }

  if (move.captured || move.flags?.isEnPassant) {
    san += 'x';
  }

  san += getFile(getCol(move.to)) + getRank(getRow(move.to));

  if (move.promotion) {
    san += '=' + move.promotion.toUpperCase();
  }

  if (stateAfterMove.isGameOver && stateAfterMove.winner === move.piece.color) {
    san += '#';
  } else {
    const oppColor = move.piece.color === 'w' ? 'b' : 'w';
    const kingIdx = stateAfterMove.board.findIndex(p => p?.type === 'k' && p.color === oppColor);
    if (kingIdx !== -1 && isSquareAttacked(kingIdx, move.piece.color, stateAfterMove)) {
      san += '+';
    }
  }

  return san;
};

export const gameStateToPgn = (finalState: GameState): string => {
    let currentState = parseFen(INITIAL_FEN);
    let pgn = '';
    let moveNum = 1;

    for (let i = 0; i < finalState.history.length; i++) {
        const move = finalState.history[i];
        const nextState = makeMove(currentState, move);
        
        if (i % 2 === 0) {
            pgn += `${moveNum}. `;
        }
        
        pgn += moveToSan(move, currentState, nextState) + ' ';
        
        if (i % 2 === 1) {
            moveNum++;
        }
        currentState = nextState;
    }
    return pgn.trim();
}

export const pgnToGameState = (pgn: string): GameState => {
    let cleanPgn = pgn.replace(/\[.*?\]/g, '')
                      .replace(/\{.*?\}/g, '')
                      .replace(/\d+\.+/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
    
    const tokens = cleanPgn.split(' ');
    let currentState = parseFen(INITIAL_FEN);
    
    for (const token of tokens) {
        if (!token) continue;
        if (['1-0', '0-1', '1/2-1/2', '*'].includes(token)) break;

        const validMoves = getLegalMoves(currentState);
        let foundMove = null;

        for (const move of validMoves) {
             const san = moveToSan(move, currentState, makeMove(currentState, move));
             const cleanSan = san.replace(/[+#]/g, '');
             const cleanToken = token.replace(/[+#]/g, '');
             
             if (cleanSan === cleanToken) {
                 foundMove = move;
                 break;
             }
        }
        
        if (!foundMove) {
            throw new Error(`Invalid Move: ${token}`);
        }
        
        currentState = makeMove(currentState, foundMove);
    }
    
    return currentState;
}
