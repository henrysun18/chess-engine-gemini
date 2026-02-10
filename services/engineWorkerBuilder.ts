
export const workerCode = `
// --- LOGGER ---
function log(msg) {
    self.postMessage({ type: 'log', message: msg });
}

// --- CONSTANTS ---
const SQUARES_COUNT = 64;
// Piece values in centipawns
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PSTS = {
  p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
};

// --- GLOBAL STATE ---
let internalBoard = new Array(64).fill(null);
let internalTurn = 'w'; // 'w' or 'b'
let castleRights = 15; // Bitmask
let enPassant = -1;
let nodesSearched = 0;
let stopSearch = false;

// Transposition Table
const tt = new Map();
const TT_SIZE_LIMIT = 2000000;

// Zobrist
let zobristTable = [];
let zobristTurn;
let zobristCastle = [];
let zobristEp = [];
let currentHash = 0n;

function initZobrist() {
    for(let i=0; i<64 * 12; i++) zobristTable[i] = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    zobristTurn = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    for(let i=0; i<16; i++) zobristCastle[i] = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    for(let i=0; i<65; i++) zobristEp[i] = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}
initZobrist();

function getPieceIndex(p) {
    if (!p) return -1;
    const typeOffset = {p:0, n:1, b:2, r:3, q:4, k:5}[p.type];
    const colorOffset = p.color === 'w' ? 0 : 6;
    return colorOffset + typeOffset;
}

function computeHash() {
    let h = 0n;
    for(let i=0; i<64; i++) {
        const p = internalBoard[i];
        if(p) h ^= zobristTable[i * 12 + getPieceIndex(p)];
    }
    if (internalTurn === 'b') h ^= zobristTurn;
    h ^= zobristCastle[castleRights];
    if (enPassant !== -1) h ^= zobristEp[enPassant];
    return h;
}

const onBoard = (r, c) => r>=0 && r<8 && c>=0 && c<8;

function parseState(fen) {
    try {
        const parts = fen.split(' ');
        internalBoard = new Array(64).fill(null);
        let row=0, col=0;
        for (const char of parts[0]) {
            if (char === '/') { row++; col=0; }
            else if (/\\d/.test(char)) { col += parseInt(char); }
            else {
                const color = char === char.toUpperCase() ? 'w' : 'b';
                const type = char.toLowerCase();
                internalBoard[row*8+col] = {color, type};
                col++;
            }
        }
        internalTurn = parts[1];
        
        castleRights = 0;
        if (parts[2].includes('K')) castleRights |= 1;
        if (parts[2].includes('Q')) castleRights |= 2;
        if (parts[2].includes('k')) castleRights |= 4;
        if (parts[2].includes('q')) castleRights |= 8;
        
        enPassant = parts[3] === '-' ? -1 : 
            (8 - parseInt(parts[3][1])) * 8 + (parts[3].charCodeAt(0) - 'a'.charCodeAt(0));

        currentHash = computeHash();
    } catch (e) {
        log("Error parsing FEN: " + e.message);
    }
}

function evaluate() {
    let score = 0;
    for (let i = 0; i < 64; i++) {
        const p = internalBoard[i];
        if (!p) continue;
        
        let val = PIECE_VALUES[p.type];
        let pstIdx = p.color === 'w' ? i : 63 - i;
        val += PSTS[p.type][pstIdx];

        if (p.color === 'w') score += val;
        else score -= val;
    }
    return internalTurn === 'w' ? score : -score;
}

function isAttacked(sq, byColor) {
    const r = Math.floor(sq/8), c = sq%8;
    const pr = byColor === 'w' ? r+1 : r-1;
    if (onBoard(pr, c-1)) { const p=internalBoard[pr*8+c-1]; if(p && p.color===byColor && p.type==='p') return true; }
    if (onBoard(pr, c+1)) { const p=internalBoard[pr*8+c+1]; if(p && p.color===byColor && p.type==='p') return true; }
    
    const kn = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for(let o of kn) {
        if(onBoard(r+o[0], c+o[1])) {
            const p=internalBoard[(r+o[0])*8+c+o[1]];
            if(p && p.color===byColor && p.type==='n') return true;
        }
    }

    const ki = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for(let o of ki) {
         if(onBoard(r+o[0], c+o[1])) {
            const p=internalBoard[(r+o[0])*8+c+o[1]];
            if(p && p.color===byColor && p.type==='k') return true;
        }
    }

    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    for(let d=0; d<8; d++) {
        let nr=r+dirs[d][0], nc=c+dirs[d][1];
        while(onBoard(nr,nc)) {
            const p = internalBoard[nr*8+nc];
            if(p) {
                if(p.color === byColor) {
                    if(p.type==='q') return true;
                    if(d<4 && p.type==='r') return true;
                    if(d>=4 && p.type==='b') return true;
                }
                break;
            }
            nr+=dirs[d][0]; nc+=dirs[d][1];
        }
    }
    return false;
}

function generateMoves(capturesOnly = false) {
    const moves = [];
    const turn = internalTurn;
    const enemy = turn === 'w' ? 'b' : 'w';

    for (let i=0; i<64; i++) {
        const p = internalBoard[i];
        if (!p || p.color !== turn) continue;
        
        const r = Math.floor(i/8), c = i%8;

        if (p.type === 'p') {
            const fw = turn === 'w' ? -1 : 1;
            const promRow = turn === 'w' ? 0 : 7;
            const startRow = turn === 'w' ? 6 : 1;
            
            if (!capturesOnly) {
                const f1 = (r+fw)*8+c;
                if (onBoard(r+fw, c) && !internalBoard[f1]) {
                    if (r+fw === promRow) {
                        ['q','n'].forEach(pr => moves.push({f:i, t:f1, p:p, prom:pr, val: PIECE_VALUES[pr]}));
                    } else {
                        moves.push({f:i, t:f1, p:p});
                        const f2 = (r+fw*2)*8+c;
                        if (r===startRow && !internalBoard[f2]) {
                            moves.push({f:i, t:f2, p:p, flag:'pd'});
                        }
                    }
                }
            }
            
            [[fw, -1], [fw, 1]].forEach(([dr, dc]) => {
                 if (onBoard(r+dr, c+dc)) {
                     const ti = (r+dr)*8+c+dc;
                     const t = internalBoard[ti];
                     if (t && t.color === enemy) {
                         if (r+dr === promRow) {
                             ['q','n'].forEach(pr => moves.push({f:i, t:ti, p:p, cap:t, prom:pr, val: PIECE_VALUES[pr] + PIECE_VALUES[t.type]}));
                         } else {
                             moves.push({f:i, t:ti, p:p, cap:t, val: PIECE_VALUES[t.type]});
                         }
                     }
                     if (enPassant === ti) {
                         moves.push({f:i, t:ti, p:p, cap:{type:'p', color:enemy}, flag:'ep', val: 100});
                     }
                 }
            });

        } else if (p.type === 'n') {
            [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => {
                if(onBoard(r+dr, c+dc)) {
                    const ti = (r+dr)*8+c+dc;
                    const t = internalBoard[ti];
                    if (!t) {
                        if(!capturesOnly) moves.push({f:i, t:ti, p:p});
                    } else if (t.color === enemy) {
                        moves.push({f:i, t:ti, p:p, cap:t, val: PIECE_VALUES[t.type]});
                    }
                }
            });
        } else if (p.type === 'k') {
             [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => {
                 if(onBoard(r+dr, c+dc)) {
                    const ti = (r+dr)*8+c+dc;
                    const t = internalBoard[ti];
                    if (!t) {
                        if(!capturesOnly) moves.push({f:i, t:ti, p:p});
                    } else if (t.color === enemy) {
                        moves.push({f:i, t:ti, p:p, cap:t, val: PIECE_VALUES[t.type]});
                    }
                 }
             });
             if (!capturesOnly) {
                 if (turn === 'w') {
                     if ((castleRights & 1) && !internalBoard[61] && !internalBoard[62] && !isAttacked(60, 'b') && !isAttacked(61, 'b') && !isAttacked(62, 'b')) 
                        moves.push({f:60, t:62, p:p, flag:'c'});
                     if ((castleRights & 2) && !internalBoard[59] && !internalBoard[58] && !internalBoard[57] && !isAttacked(60, 'b') && !isAttacked(59, 'b') && !isAttacked(58, 'b')) 
                        moves.push({f:60, t:58, p:p, flag:'c'});
                 } else {
                     if ((castleRights & 4) && !internalBoard[5] && !internalBoard[6] && !isAttacked(4, 'w') && !isAttacked(5, 'w') && !isAttacked(6, 'w')) 
                        moves.push({f:4, t:6, p:p, flag:'c'});
                     if ((castleRights & 8) && !internalBoard[3] && !internalBoard[2] && !internalBoard[1] && !isAttacked(4, 'w') && !isAttacked(3, 'w') && !isAttacked(2, 'w')) 
                        moves.push({f:4, t:2, p:p, flag:'c'});
                 }
             }
        } else {
            const dirs = (p.type==='b'||p.type==='q' ? [[-1,-1],[-1,1],[1,-1],[1,1]] : []).concat(
                         (p.type==='r'||p.type==='q' ? [[-1,0],[1,0],[0,-1],[0,1]] : []));
            for(let d of dirs) {
                let nr=r+d[0], nc=c+d[1];
                while(onBoard(nr,nc)) {
                    const ti = nr*8+nc;
                    const t = internalBoard[ti];
                    if(!t) {
                        if(!capturesOnly) moves.push({f:i, t:ti, p:p});
                    } else {
                        if (t.color === enemy) moves.push({f:i, t:ti, p:p, cap:t, val: PIECE_VALUES[t.type]});
                        break;
                    }
                    nr+=d[0]; nc+=d[1];
                }
            }
        }
    }
    return moves;
}

function makeMove(m) {
    const undo = {
        ep: enPassant,
        cr: castleRights,
        hash: currentHash,
        cap: internalBoard[m.t]
    };

    const fromP = internalBoard[m.f];
    if (fromP) currentHash ^= zobristTable[m.f * 12 + getPieceIndex(fromP)];
    internalBoard[m.f] = null;

    if (m.cap) {
        if (m.flag === 'ep') {
            const capIdx = internalTurn === 'w' ? m.t + 8 : m.t - 8;
            const capP = internalBoard[capIdx];
            if (capP) currentHash ^= zobristTable[capIdx * 12 + getPieceIndex(capP)];
            internalBoard[capIdx] = null;
        } else {
            const capP = internalBoard[m.t];
            if (capP) currentHash ^= zobristTable[m.t * 12 + getPieceIndex(capP)];
        }
    }

    const movingP = m.prom ? {color: m.p.color, type: m.prom} : m.p;
    currentHash ^= zobristTable[m.t * 12 + getPieceIndex(movingP)];
    internalBoard[m.t] = movingP;

    if (m.flag === 'c') {
        let rFrom, rTo;
        if (m.t === 62) { rFrom=63; rTo=61; }
        else if (m.t === 58) { rFrom=56; rTo=59; }
        else if (m.t === 6) { rFrom=7; rTo=5; }
        else if (m.t === 2) { rFrom=0; rTo=3; }
        
        const rook = internalBoard[rFrom];
        if (rook) {
            currentHash ^= zobristTable[rFrom * 12 + getPieceIndex(rook)];
            internalBoard[rFrom] = null;
            currentHash ^= zobristTable[rTo * 12 + getPieceIndex(rook)];
            internalBoard[rTo] = rook;
        }
    }

    currentHash ^= zobristCastle[castleRights];
    if (movingP.type === 'k') {
        if (movingP.color === 'w') castleRights &= ~3;
        else castleRights &= ~12;
    }
    const updateRookRights = (idx) => {
        if (idx === 63) castleRights &= ~1;
        if (idx === 56) castleRights &= ~2;
        if (idx === 7) castleRights &= ~4;
        if (idx === 0) castleRights &= ~8;
    };
    updateRookRights(m.f);
    updateRookRights(m.t);
    if(m.cap && m.flag !== 'ep') updateRookRights(m.t);
    currentHash ^= zobristCastle[castleRights];

    if (enPassant !== -1) currentHash ^= zobristEp[enPassant];
    if (m.flag === 'pd') {
        enPassant = internalTurn === 'w' ? m.f - 8 : m.f + 8;
        currentHash ^= zobristEp[enPassant];
    } else {
        enPassant = -1;
    }

    currentHash ^= zobristTurn;
    internalTurn = internalTurn === 'w' ? 'b' : 'w';

    return undo;
}

function unmakeMove(m, undo) {
    internalTurn = internalTurn === 'w' ? 'b' : 'w';
    currentHash = undo.hash;
    enPassant = undo.ep;
    castleRights = undo.cr;

    internalBoard[m.f] = m.p;
    
    if (m.flag === 'ep') {
        internalBoard[m.t] = null;
        const capIdx = internalTurn === 'w' ? m.t + 8 : m.t - 8;
        internalBoard[capIdx] = m.cap;
    } else {
        internalBoard[m.t] = m.cap || null;
    }

    if (m.flag === 'c') {
         if (m.t === 62) { internalBoard[63]=internalBoard[61]; internalBoard[61]=null; }
         else if (m.t === 58) { internalBoard[56]=internalBoard[59]; internalBoard[59]=null; }
         else if (m.t === 6) { internalBoard[7]=internalBoard[5]; internalBoard[5]=null; }
         else if (m.t === 2) { internalBoard[0]=internalBoard[3]; internalBoard[3]=null; }
    }
}

function sortMoves(moves, bestMove) {
    moves.sort((a, b) => {
        if (bestMove && a.f === bestMove.f && a.t === bestMove.t) return 100000;
        if (bestMove && b.f === bestMove.f && b.t === bestMove.t) return -100000;
        
        const scoreA = (a.val || 0) + (a.prom ? 1000 : 0);
        const scoreB = (b.val || 0) + (b.prom ? 1000 : 0);
        return scoreB - scoreA;
    });
}

function quiesce(alpha, beta) {
    nodesSearched++;
    const standPat = evaluate();
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    const moves = generateMoves(true);
    sortMoves(moves, null);

    for (const m of moves) {
        const undo = makeMove(m);
        const kIdx = internalBoard.findIndex(p => p?.type === 'k' && p.color === (internalTurn === 'w' ? 'b' : 'w'));
        if (isAttacked(kIdx, internalTurn)) {
            unmakeMove(m, undo);
            continue;
        }

        const score = -quiesce(-beta, -alpha);
        unmakeMove(m, undo);

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
    }
    return alpha;
}

// Alpha-Beta with LMR (Late Move Reduction)
function alphaBeta(depth, alpha, beta, isRoot, useLMR, branchingFactor) {
    nodesSearched++;
    
    if (!isRoot) {
        const ttEntry = tt.get(currentHash);
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.flag === 0) return ttEntry.score;
            if (ttEntry.flag === 1 && ttEntry.score <= alpha) return alpha;
            if (ttEntry.flag === 2 && ttEntry.score >= beta) return beta;
        }
    }

    if (depth <= 0) return quiesce(alpha, beta);

    let moves = generateMoves(false);
    const ttEntry = tt.get(currentHash);
    const bestMoveCandidate = ttEntry ? ttEntry.bestMove : null;
    sortMoves(moves, bestMoveCandidate);
    
    if (!useLMR && branchingFactor && moves.length > branchingFactor) {
        moves = moves.slice(0, branchingFactor);
    }

    let bestMove = null;
    let bestScore = -Infinity;
    let legalMovesCount = 0;
    let ttFlag = 1; // Alpha

    for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const undo = makeMove(m);
        
        const kIdx = internalBoard.findIndex(p => p?.type === 'k' && p.color === (internalTurn === 'w' ? 'b' : 'w'));
        if (isAttacked(kIdx, internalTurn)) {
            unmakeMove(m, undo);
            continue;
        }
        legalMovesCount++;

        let score;
        
        // Dynamic Branching / LMR Logic
        // If depth is high, move is late in sorted list, not a capture, not a check (simplified), not PV -> Reduce depth
        if (useLMR && depth >= 3 && i > 3 && !m.cap && !m.prom) {
            // Reduction R = 1. Can be more aggressive.
            score = -alphaBeta(depth - 2, -beta, -alpha, false, useLMR, branchingFactor);
            // If the reduced search beats alpha, we must re-search fully
            if (score > alpha) {
                 score = -alphaBeta(depth - 1, -beta, -alpha, false, useLMR, branchingFactor);
            }
        } else {
            score = -alphaBeta(depth - 1, -beta, -alpha, false, useLMR, branchingFactor);
        }

        unmakeMove(m, undo);

        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
        }

        if (score > alpha) {
            alpha = score;
            ttFlag = 0; // Exact
        }

        if (alpha >= beta) {
            ttFlag = 2; // Beta
            break;
        }
    }

    if (legalMovesCount === 0) {
        const kIdx = internalBoard.findIndex(p => p?.type === 'k' && p.color === internalTurn);
        if (isAttacked(kIdx, internalTurn === 'w' ? 'b' : 'w')) {
            return -50000 + (100 - depth); 
        } else {
            return 0; 
        }
    }

    if (tt.size < TT_SIZE_LIMIT) {
        tt.set(currentHash, { depth, score: bestScore, flag: ttFlag, bestMove });
    }

    return bestScore;
}

// Convert internal move format to public move format for UI
function formatMove(m) {
    if (!m) return null;
    return {
        from: m.f,
        to: m.t,
        piece: m.p,
        captured: m.cap,
        promotion: m.prom,
        flags: {
            isCastle: m.flag === 'c',
            isEnPassant: m.flag === 'ep',
            isPawnDouble: m.flag === 'pd'
        }
    };
}

self.onmessage = function(e) {
    const { fen, depth, branchingFactor, useDynamicBranching, requestId } = e.data;
    
    try {
        parseState(fen);
        nodesSearched = 0;
        log(\`Starting search: Depth \${depth}, Dynamic: \${useDynamicBranching}, BF: \${branchingFactor}\`);

        let bestMoveGlobal = null;
        let scoreGlobal = 0;

        // Iterative Deepening
        for (let d = 1; d <= depth; d++) {
            
            // At root, we manually loop moves to send progress more frequently
            let moves = generateMoves(false);
            const ttEntry = tt.get(currentHash);
            const bestCand = ttEntry ? ttEntry.bestMove : null;
            sortMoves(moves, bestCand);
            
            if (!useDynamicBranching && branchingFactor && moves.length > branchingFactor) {
                moves = moves.slice(0, branchingFactor);
            }

            let alpha = -Infinity;
            let beta = Infinity;
            let bestMoveLocal = null;
            let bestScoreLocal = -Infinity;
            let movesSearched = 0;
            
            if (moves.length === 0) {
                log("No legal moves found at root.");
                break;
            }

            for (const m of moves) {
                const undo = makeMove(m);
                const kIdx = internalBoard.findIndex(p => p?.type === 'k' && p.color === (internalTurn === 'w' ? 'b' : 'w'));
                if (isAttacked(kIdx, internalTurn)) {
                    unmakeMove(m, undo);
                    continue;
                }
                
                // Root Search
                const score = -alphaBeta(d - 1, -beta, -alpha, false, useDynamicBranching, branchingFactor);
                unmakeMove(m, undo);
                
                movesSearched++;
                
                if (score > bestScoreLocal) {
                    bestScoreLocal = score;
                    bestMoveLocal = m;
                    // Found a better move at root!
                    if (score > alpha) alpha = score;
                }
                
                // Send progress update after every move at root to prevent "stuck" UI
                self.postMessage({ 
                    type: 'progress', 
                    depth: d, 
                    nodes: nodesSearched, 
                    bestMove: formatMove(bestMoveLocal), 
                    score: bestScoreLocal,
                    requestId
                });
            }
            
            bestMoveGlobal = bestMoveLocal;
            scoreGlobal = bestScoreLocal;
            
            if (d < depth) {
                 // log(\`Completed Depth \${d}.\`);
            }
        }

        if (!bestMoveGlobal) {
            log("Search finished but no best move found. (Checkmate or Stalemate?)");
        }

        log("Search Complete.");
        self.postMessage({
            type: 'done',
            bestMove: formatMove(bestMoveGlobal),
            score: scoreGlobal,
            nodes: nodesSearched,
            requestId
        });

    } catch (err) {
        log(\`CRITICAL WORKER ERROR: \${err.message}\`);
        console.error(err);
    }
};
`;
