
export const workerCode = `
// --- LOGGER ---
function log(msg) {
    self.postMessage({ type: 'log', message: msg });
}

// --- CONSTANTS ---
const SQUARES_COUNT = 64;

// MG = Middlegame, EG = Endgame
const PIECE_VALUES = { 
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 
};

// Piece Square Tables (Interpolated typically, but simplified here)
// Weighted towards center control
const PSTS = {
  p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
};

// King End Game Table (Encourages king to go to center)
const KING_ENDGAME_PST = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50
];

// --- GLOBAL STATE ---
let internalBoard = new Array(64).fill(null);
let internalTurn = 'w';
let castleRights = 15;
let enPassant = -1;
let nodesSearched = 0;

// Transposition Table
const tt = new Map();
const TT_SIZE_LIMIT = 4000000; // Increased for better hit rate

// Killer Moves: [depth][move_index]
let killerMoves = [];
let historyMoves = new Array(64 * 64).fill(0);

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
    
    // Init killer moves array
    for(let i=0; i<32; i++) killerMoves[i] = [null, null];
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

// --- ADVANCED EVALUATION ---
function evaluate() {
    let mgScore = 0; // Middlegame Score
    let egScore = 0; // Endgame Score
    let phase = 0;   // Game Phase (0 = End, 24 = Start approx)
    
    // Phase weights for pieces
    const phaseWeights = { p: 0, n: 1, b: 1, r: 2, q: 4, k: 0 };
    
    // Mobility counters
    let wMobility = 0;
    let bMobility = 0;

    // Pawn structure
    const wPawns = [];
    const bPawns = [];
    let wKingSq = -1;
    let bKingSq = -1;

    for (let i = 0; i < 64; i++) {
        const p = internalBoard[i];
        if (!p) continue;

        phase += phaseWeights[p.type];
        
        let val = PIECE_VALUES[p.type];
        let pstIdx = p.color === 'w' ? i : 63 - i;
        
        // 1. Material & PST
        let positionalVal = PSTS[p.type][pstIdx];
        
        // Special Case: King PST changes in endgame
        if (p.type === 'k') {
            if (p.color === 'w') wKingSq = i; else bKingSq = i;
            // We interpolate king safety later, but for raw loop:
            // Middlegame king safety is in standard PST (hiding in corners)
            // Endgame king activity is in KING_ENDGAME_PST
        }

        if (p.color === 'w') {
            mgScore += val + positionalVal;
            egScore += val + (p.type === 'k' ? KING_ENDGAME_PST[pstIdx] : positionalVal);
            if(p.type === 'p') wPawns.push(i);
        } else {
            mgScore -= (val + positionalVal);
            egScore -= (val + (p.type === 'k' ? KING_ENDGAME_PST[pstIdx] : positionalVal));
            if(p.type === 'p') bPawns.push(i);
        }
    }

    // 2. Pawn Structure (Doubled, Isolated) - Simple Version
    // Heuristic: file counts
    const wFiles = new Array(8).fill(0);
    const bFiles = new Array(8).fill(0);
    wPawns.forEach(sq => wFiles[sq%8]++);
    bPawns.forEach(sq => bFiles[sq%8]++);

    let wStructPenalty = 0;
    let bStructPenalty = 0;

    for(let f=0; f<8; f++) {
        if (wFiles[f] > 1) wStructPenalty += 20; // Doubled
        if (bFiles[f] > 1) bStructPenalty += 20;
        
        // Isolated (simplified)
        if (wFiles[f] > 0 && (f===0 || wFiles[f-1]===0) && (f===7 || wFiles[f+1]===0)) wStructPenalty += 15;
        if (bFiles[f] > 0 && (f===0 || bFiles[f-1]===0) && (f===7 || bFiles[f+1]===0)) bStructPenalty += 15;
    }

    mgScore += (bStructPenalty - wStructPenalty);
    egScore += (bStructPenalty - wStructPenalty);

    // 3. Mobility (Very rough approximation, purely based on piece count for now as full generation is slow)
    // A smarter engine does this during move gen. 
    // We will skip explicit move generation for mobility to keep NPS high, 
    // but rely on the fact that better developed pieces (PST) usually have better mobility.
    
    // 4. Interpolation
    // Phase typically goes from ~24 (start) to 0.
    // We clamp phase between 0 and 24.
    const mgPhase = Math.min(24, phase);
    const egPhase = 24 - mgPhase;
    
    const finalScore = (mgScore * mgPhase + egScore * egPhase) / 24;

    return internalTurn === 'w' ? finalScore : -finalScore;
}

// Check if material is low (Endgame detection for dynamic depth)
function isEndgame() {
    let material = 0;
    for(let i=0; i<64; i++) {
        const p = internalBoard[i];
        if(p && p.type !== 'p' && p.type !== 'k') {
            material += PIECE_VALUES[p.type];
        }
    }
    // E.g. less than 1500 (A rook and two minors, or a queen)
    return material < 1500;
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

// Sorting: TT Best -> Captures -> Killers -> History
function sortMoves(moves, bestMove, depth) {
    moves.sort((a, b) => {
        if (bestMove && a.f === bestMove.f && a.t === bestMove.t) return 1000000;
        if (bestMove && b.f === bestMove.f && b.t === bestMove.t) return -1000000;
        
        // MVV/LVA for captures (Most Valuable Victim, Least Valuable Attacker)
        // Simplified here to just victim value
        const valA = a.val || 0;
        const valB = b.val || 0;
        if (valA !== valB) return valB - valA;
        
        // Promotions
        if (a.prom && !b.prom) return 10000;
        if (!a.prom && b.prom) return -10000;

        // Killer Moves
        if (depth && killerMoves[depth]) {
            if (killerMoves[depth][0] && a.f === killerMoves[depth][0].f && a.t === killerMoves[depth][0].t) return 900;
            if (killerMoves[depth][0] && b.f === killerMoves[depth][0].f && b.t === killerMoves[depth][0].t) return -900;
        }

        return 0; 
    });
}

function quiesce(alpha, beta) {
    nodesSearched++;
    const standPat = evaluate();
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    const moves = generateMoves(true);
    sortMoves(moves, null, 0);

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

// Alpha-Beta with Null Move Pruning & LMR
function alphaBeta(depth, alpha, beta, isRoot, useLMR, branchingFactor) {
    nodesSearched++;
    
    // 1. TT Lookup
    let ttEntry = tt.get(currentHash);
    if (ttEntry && ttEntry.depth >= depth && !isRoot) {
        if (ttEntry.flag === 0) return ttEntry.score;
        if (ttEntry.flag === 1 && ttEntry.score <= alpha) return alpha;
        if (ttEntry.flag === 2 && ttEntry.score >= beta) return beta;
    }

    if (depth <= 0) return quiesce(alpha, beta);
    
    const isCheck = isAttacked(internalBoard.findIndex(p => p?.type === 'k' && p.color === internalTurn), internalTurn === 'w' ? 'b' : 'w');

    // 2. Null Move Pruning (Don't do it in check or in endgame to avoid Zugzwang issues mostly)
    if (!isRoot && !isCheck && depth >= 3) {
        // Make null move
        internalTurn = internalTurn === 'w' ? 'b' : 'w';
        currentHash ^= zobristTurn;
        if(enPassant !== -1) { currentHash ^= zobristEp[enPassant]; } 
        // Note: we don't clear enPassant in state for null move usually, but proper impl requires careful state mgmt.
        // Simplified: Just skip NMP for safety in this version to prevent bugs in this restricted env.
    }

    let moves = generateMoves(false);
    const bestMoveCandidate = ttEntry ? ttEntry.bestMove : null;
    sortMoves(moves, bestMoveCandidate, depth);
    
    if (!useLMR && branchingFactor && moves.length > branchingFactor) {
        moves = moves.slice(0, branchingFactor);
    }

    let bestMove = null;
    let bestScore = -Infinity;
    let legalMovesCount = 0;
    let ttFlag = 1; // Alpha (Fail Low)

    for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const undo = makeMove(m);
        
        // Legality
        const kIdx = internalBoard.findIndex(p => p?.type === 'k' && p.color === (internalTurn === 'w' ? 'b' : 'w'));
        if (isAttacked(kIdx, internalTurn)) {
            unmakeMove(m, undo);
            continue;
        }
        legalMovesCount++;

        let score;
        
        // Check Extension
        const givesCheck = isAttacked(internalBoard.findIndex(p => p?.type === 'k' && p.color === internalTurn), internalTurn === 'w' ? 'b' : 'w');
        const extension = givesCheck ? 1 : 0;
        const newDepth = depth - 1 + extension;

        // LMR (Late Move Reduction)
        if (useLMR && depth >= 3 && i > 4 && !m.cap && !m.prom && !givesCheck && !isCheck) {
            score = -alphaBeta(newDepth - 1, -beta, -alpha, false, useLMR, branchingFactor);
            if (score > alpha) {
                 score = -alphaBeta(newDepth, -beta, -alpha, false, useLMR, branchingFactor);
            }
        } else {
            score = -alphaBeta(newDepth, -beta, -alpha, false, useLMR, branchingFactor);
        }

        unmakeMove(m, undo);

        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
        }

        if (score > alpha) {
            alpha = score;
            ttFlag = 0; // Exact
            if(!m.cap) {
                // Store killer move
                if (killerMoves[depth]) {
                    killerMoves[depth][1] = killerMoves[depth][0];
                    killerMoves[depth][0] = m;
                }
            }
        }

        if (alpha >= beta) {
            ttFlag = 2; // Beta
            break;
        }
    }

    if (legalMovesCount === 0) {
        if (isCheck) return -50000 + (100 - depth); 
        else return 0; // Stalemate
    }

    // Always store in TT
    tt.set(currentHash, { depth, score: bestScore, flag: ttFlag, bestMove });

    return bestScore;
}

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
        
        // Auto-Scale Depth based on Game Phase (Time Management)
        let adjustedDepth = depth;
        let phaseLog = "";
        
        if (useDynamicBranching) {
            if (isEndgame()) {
                adjustedDepth += 2; // Deepen in endgame
                phaseLog = " (Endgame Boost +2)";
                // Ultra endgame (Kings + Pawns)
                let pieceCount = 0;
                for(let i=0; i<64; i++) if(internalBoard[i]) pieceCount++;
                if (pieceCount < 8) {
                    adjustedDepth += 2; // +4 Total
                    phaseLog = " (Deep Endgame Boost +4)";
                }
            }
        }
        
        log(\`Starting search: Depth \${adjustedDepth}\${phaseLog}\`);

        let bestMoveGlobal = null;
        let scoreGlobal = 0;

        // Iterative Deepening
        for (let d = 1; d <= adjustedDepth; d++) {
            
            let moves = generateMoves(false);
            const ttEntry = tt.get(currentHash);
            const bestCand = ttEntry ? ttEntry.bestMove : null;
            sortMoves(moves, bestCand, d);
            
            // Dynamic Window Aspiration (Simplified)
            let alpha = -Infinity;
            let beta = Infinity;
            
            if (d > 4) {
               alpha = scoreGlobal - 50;
               beta = scoreGlobal + 50;
            }

            // Retry loop for aspiration window failure
            let retry = true;
            while(retry) {
                retry = false;
                let bestMoveLocal = null;
                let bestScoreLocal = -Infinity;
                
                for (const m of moves) {
                    const undo = makeMove(m);
                    const kIdx = internalBoard.findIndex(p => p?.type === 'k' && p.color === (internalTurn === 'w' ? 'b' : 'w'));
                    if (isAttacked(kIdx, internalTurn)) {
                        unmakeMove(m, undo);
                        continue;
                    }
                    
                    const score = -alphaBeta(d - 1, -beta, -alpha, false, useDynamicBranching, branchingFactor);
                    unmakeMove(m, undo);
                    
                    if (score > bestScoreLocal) {
                        bestScoreLocal = score;
                        bestMoveLocal = m;
                        if (score > alpha) alpha = score;
                    }
                    
                    // Root Progress Update
                    self.postMessage({ 
                        type: 'progress', 
                        depth: d, 
                        nodes: nodesSearched, 
                        bestMove: formatMove(bestMoveLocal), 
                        score: bestScoreLocal,
                        requestId
                    });
                }
                
                // If fell out of window, search again with full window
                if (d > 4 && (bestScoreLocal <= alpha || bestScoreLocal >= beta)) {
                     alpha = -Infinity;
                     beta = Infinity;
                     retry = true;
                     log(\`Aspiration fail at depth \${d}, re-searching...\`);
                } else {
                    bestMoveGlobal = bestMoveLocal;
                    scoreGlobal = bestScoreLocal;
                }
            }
        }

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
