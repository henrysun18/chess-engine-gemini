

// ============================================================================
// ENGINE A: CLASSIC BITWISE (PeSTO + PVS)
// ============================================================================
export const workerCodeA = `
// [ENGINE A CODE PRESERVED AS IS]
const VAL_PAWN = 100;
const VAL_KNIGHT = 320;
const VAL_BISHOP = 330;
const VAL_ROOK = 500;
const VAL_QUEEN = 900;
const VAL_KING = 20000;
const MATE_SCORE = 29000; 
const MAX_PLY = 100; 

const COLOR_WHITE = 8;
const COLOR_BLACK = 16;
const TYPE_EMPTY = 0;
const TYPE_PAWN = 1;
const TYPE_KNIGHT = 2;
const TYPE_BISHOP = 3;
const TYPE_ROOK = 4;
const TYPE_QUEEN = 5;
const TYPE_KING = 6;

const MASK_FROM = 0x3F;
const MASK_TO = 0xFC0;
const SHIFT_TO = 6;
const MASK_PIECE = 0x7000;
const SHIFT_PIECE = 12;
const MASK_CAP = 0x38000;
const SHIFT_CAP = 15;
const MASK_PROM = 0x1C0000;
const SHIFT_PROM = 18;
const FLAG_CASTLE = 0x200000;
const FLAG_EP = 0x400000;
const FLAG_DOUBLE = 0x800000;

const TT_SIZE = 1 << 20; 
const TT_FLAG_EXACT = 0;
const TT_FLAG_LOWER = 1; 
const TT_FLAG_UPPER = 2; 

// Tables (PeSTO)
const MG_PAWN = [0,0,0,0,0,0,0,0,98,134,61,95,68,126,34,-11,-6,7,26,31,65,56,25,-20,-14,13,6,21,23,12,17,-23,-27,-2,-5,12,17,6,10,-25,-26,-4,-4,-10,3,3,33,-12,-35,-1,-20,-23,-15,24,38,-22,0,0,0,0,0,0,0,0];
const EG_PAWN = [0,0,0,0,0,0,0,0,178,173,158,134,147,132,165,187,94,100,85,67,56,53,82,84,32,24,13,5,-2,4,17,17,13,9,-3,-7,-7,-8,3,-1,4,7,-6,1,0,-5,-1,-8,13,8,8,10,13,0,2,-7,0,0,0,0,0,0,0,0];
const MG_KNIGHT = [-167,-89,-34,-49,61,-97,-15,-107,-73,-41,72,36,23,62,7,-17,-47,60,37,65,84,129,73,44,-9,17,19,53,37,69,18,22,-13,4,16,13,28,19,21,-8,-23,-9,12,10,19,17,25,-16,-29,-53,-12,-3,-1,18,-14,-19,-105,-21,-58,-33,-17,-28,-19,-23];
const EG_KNIGHT = [-58,-38,-13,-28,-31,-27,-63,-99,-25,-8,-25,-2,-9,-25,-24,-52,-24,-20,10,9,-1,-9,-19,-41,-17,3,22,22,22,11,8,-18,-18,-6,16,25,16,17,4,-18,-23,-3,-1,15,10,-3,-20,-22,-42,-20,-10,-5,-2,-20,-23,-44,-29,-51,-23,-15,-22,-18,-50,-64];
const MG_BISHOP = [-29,4,-82,-37,-25,-42,7,-8,-26,16,-18,-13,30,59,18,-47,-16,37,43,40,35,50,37,-2,-4,5,19,50,37,37,7,-2,-6,13,13,26,34,12,10,4,0,15,15,15,14,27,18,10,4,15,16,0,7,21,33,1,-33,-3,-14,-21,-13,-12,-39,-21];
const EG_BISHOP = [-14,-21,-11,-8,-7,-9,-17,-24,-8,-4,7,-12,-3,-13,-4,-14,2,-8,0,-1,-2,6,0,4,-3,9,12,9,14,10,3,2,-6,3,13,19,7,10,-3,-9,-12,-3,5,10,13,3,-7,-15,-14,-18,-7,-1,4,-9,-15,-27,-23,-9,-23,-5,-9,-16,-5,-17];
const MG_ROOK = [32,42,32,51,63,9,31,43,27,32,58,62,80,67,26,44,-5,19,26,36,17,45,61,16,-24,-11,7,26,24,35,-8,-20,-36,-26,-12,-1,9,-7,6,-23,-45,-25,-16,-17,3,0,-5,-33,-44,-16,-20,-9,-1,11,-6,-71,-19,-13,1,17,16,7,-37,-26];
const EG_ROOK = [13,10,18,15,12,12,8,5,11,13,13,11,-3,3,8,3,7,7,7,5,4,-3,-5,-3,4,3,13,1,2,1,-1,2,3,5,8,4,-5,-6,-8,-11,-4,0,-5,-1,-7,-12,-8,-16,-18,-20,-7,-13,-13,-23,-15,-25,-14,-25,-12,-25,-27,-25,-27,-25];
const MG_QUEEN = [-28,0,29,12,59,44,43,45,-24,-39,-5,1,-16,57,28,54,-13,-17,7,8,29,56,47,57,-27,-27,-16,-16,-1,17,-2,1,-9,-26,-9,-10,-2,-4,3,-3,-14,2,-11,-2,-5,2,14,5,-35,-8,11,2,8,15,-3,1,-1,-18,-9,10,-15,-25,-31,-50];
const EG_QUEEN = [-9,22,22,27,27,19,10,20,-17,20,32,41,58,25,30,0,-20,6,9,49,47,35,19,9,3,22,24,45,57,40,57,36,-18,28,19,47,31,34,39,23,-16,-27,15,6,9,17,10,5,-22,-23,-30,-16,-16,-23,-36,-32,-33,-28,-22,-43,-5,-32,-20,-41];
const MG_KING = [-65,23,16,-15,-56,-34,2,13,29,-1,-20,-7,-8,-4,-38,-29,-9,24,2,-16,-20,6,22,-22,-17,-20,-12,-27,-30,-25,-14,-36,-49,-1,-27,-39,-46,-44,-33,-51,-14,-14,-22,-46,-44,-30,-15,-27,1,7,-8,-64,-43,-16,9,8,-15,36,12,-54,8,-28,24,14];
const EG_KING = [-74,-35,-18,-18,-11,15,4,-17,-12,17,14,17,17,38,23,11,10,17,23,15,20,45,44,13,-8,22,24,27,26,33,26,3,-18,-4,21,24,27,23,9,-11,-19,-3,11,21,23,16,7,-9,-27,-11,4,13,14,4,-5,-17,-53,-34,-21,-11,-28,-14,-24,-43];

const TABLES_MG = [[],MG_PAWN,MG_KNIGHT,MG_BISHOP,MG_ROOK,MG_QUEEN,MG_KING];
const TABLES_EG = [[],EG_PAWN,EG_KNIGHT,EG_BISHOP,EG_ROOK,EG_QUEEN,EG_KING];

const ZOBRIST = new Int32Array(64 * 32);
const ZOBRIST_CASTLE = new Int32Array(16);
const ZOBRIST_SIDE = 0x12345678;

for(let i=0; i<ZOBRIST.length; i++) ZOBRIST[i] = (Math.random() * 0xFFFFFFFF) | 0;
for(let i=0; i<ZOBRIST_CASTLE.length; i++) ZOBRIST_CASTLE[i] = (Math.random() * 0xFFFFFFFF) | 0;

let board = new Int8Array(64); 
let turn = COLOR_WHITE;
let castleRights = 0; 
let enPassant = -1;
let currentHash = 0;
let positionHistory = new Int32Array(MAX_PLY + 50);
let historyPly = 0;

let nodes = 0;
let stopTime = 0;
let startTime = 0;
let lastReportTime = 0;
let lastLogTime = 0;

let killerMoves = new Int32Array(MAX_PLY * 2); 
let history = new Int32Array(64 * 64); 

let bestMoveGlobal = 0;
let bestScoreGlobal = 0;
let currentRequestId = 0;
let activeDepth = 0;

const ttHash = new Int32Array(TT_SIZE);
const ttDepth = new Int8Array(TT_SIZE);
const ttFlag = new Int8Array(TT_SIZE);
const ttScore = new Int16Array(TT_SIZE);
const ttMove = new Int32Array(TT_SIZE);

function log(msg) { self.postMessage({ type: 'log', message: msg, requestId: currentRequestId }); }

function createMove(f, t, p, cap, prom, flags) {
    return f | (t << SHIFT_TO) | (p << SHIFT_PIECE) | (cap << SHIFT_CAP) | (prom << SHIFT_PROM) | flags;
}
function getFrom(m) { return m & MASK_FROM; }
function getTo(m) { return (m & MASK_TO) >> SHIFT_TO; }
function getPiece(m) { return (m & MASK_PIECE) >> SHIFT_PIECE; }
function getCaptured(m) { return (m & MASK_CAP) >> SHIFT_CAP; }
function getProm(m) { return (m & MASK_PROM) >> SHIFT_PROM; }

function getHash() {
    let h = 0;
    for(let i=0; i<64; i++) {
        const p = board[i];
        if(p) h ^= ZOBRIST[i * 32 + p];
    }
    if(turn === COLOR_BLACK) h ^= ZOBRIST_SIDE;
    h ^= ZOBRIST_CASTLE[castleRights];
    return h;
}

function parseFen(fen) {
    board.fill(TYPE_EMPTY);
    const parts = fen.split(' ');
    let r=0, c=0;
    for(const char of parts[0]) {
        if(char === '/') { r++; c=0; }
        else if(char >= '1' && char <= '8') { c += parseInt(char); }
        else {
            const color = (char === char.toUpperCase()) ? COLOR_WHITE : COLOR_BLACK;
            const typeChar = char.toLowerCase();
            const type = {p:1, n:2, b:3, r:4, q:5, k:6}[typeChar];
            board[r*8+c] = color | type;
            c++;
        }
    }
    turn = parts[1] === 'w' ? COLOR_WHITE : COLOR_BLACK;
    castleRights = 0;
    if(parts[2].includes('K')) castleRights |= 1;
    if(parts[2].includes('Q')) castleRights |= 2;
    if(parts[2].includes('k')) castleRights |= 4;
    if(parts[2].includes('q')) castleRights |= 8;
    enPassant = parts[3] === '-' ? -1 : 
        (8 - parseInt(parts[3][1])) * 8 + (parts[3].charCodeAt(0) - 97);
    
    currentHash = getHash();
    historyPly = 0;
    positionHistory[historyPly++] = currentHash;
}

function evaluate() {
    let mg = 0, eg = 0, gamePhase = 0;
    for(let i=0; i<64; i++) {
        const p = board[i];
        if(!p) continue;
        const type = p & 7;
        const color = p & 24; 
        
        if (type === TYPE_KNIGHT || type === TYPE_BISHOP) gamePhase += 1;
        if (type === TYPE_ROOK) gamePhase += 2;
        if (type === TYPE_QUEEN) gamePhase += 4;
        
        let idx = i;
        if (color === COLOR_BLACK) idx = i ^ 56;
        
        let m = TABLES_MG[type][idx];
        let e = TABLES_EG[type][idx];
        
        if (type === TYPE_PAWN) { m += VAL_PAWN; e += VAL_PAWN; }
        else if (type === TYPE_KNIGHT) { m += VAL_KNIGHT; e += VAL_KNIGHT; }
        else if (type === TYPE_BISHOP) { m += VAL_BISHOP; e += VAL_BISHOP; }
        else if (type === TYPE_ROOK) { m += VAL_ROOK; e += VAL_ROOK; }
        else if (type === TYPE_QUEEN) { m += VAL_QUEEN; e += VAL_QUEEN; }
        
        if (color === COLOR_WHITE) { mg += m; eg += e; }
        else { mg -= m; eg -= e; }
    }
    const mgPhase = Math.min(24, gamePhase);
    const egPhase = 24 - mgPhase;
    let score = (mg * mgPhase + eg * egPhase) / 24;
    
    if (score > 15000) score = 15000;
    if (score < -15000) score = -15000;
    
    return turn === COLOR_WHITE ? score : -score;
}

function getSEE(move) {
    const piece = getPiece(move);
    const captured = getCaptured(move);
    let score = 0;
    if(captured) {
        const valMap = [0, 100, 320, 330, 500, 900, 20000];
        score = valMap[captured] - valMap[piece];
    }
    return score; 
}

function isAttacked(sq, byColor) {
    const pawnDir = byColor === COLOR_WHITE ? 8 : -8;
    const pawnRow = byColor === COLOR_WHITE ? (sq>>3)+1 : (sq>>3)-1;
    if(pawnRow>=0 && pawnRow<8) {
        const c = sq&7;
        if(c>0) { const idx = (pawnRow<<3)+(c-1); if((board[idx]&byColor) && (board[idx]&7)===TYPE_PAWN) return true; }
        if(c<7) { const idx = (pawnRow<<3)+(c+1); if((board[idx]&byColor) && (board[idx]&7)===TYPE_PAWN) return true; }
    }
    const kDirs = [-17,-15,-10,-6,6,10,15,17];
    for(let d of kDirs) {
        const t = sq+d;
        if(t>=0 && t<64 && Math.abs((t&7)-(sq&7))<=2) {
            if((board[t] & byColor) && (board[t]&7)===TYPE_KNIGHT) return true;
        }
    }
    const dirs = [-9, -7, 7, 9, -8, -1, 1, 8];
    for(let i=0; i<8; i++) {
        let d = dirs[i];
        let t = sq + d;
        while(t>=0 && t<64) {
             const c1 = (t-d)&7, c2 = t&7;
             if(Math.abs(c2-c1) > 1 && d !== 8 && d !== -8) break; 
             if(Math.abs(c2-c1) > 1 && (d===1 || d===-1)) break;
             const p = board[t];
             if(p) {
                 if(p & byColor) {
                     const type = p&7;
                     if(type === TYPE_QUEEN) return true;
                     if(i < 4 && type === TYPE_BISHOP) return true; 
                     if(i >= 4 && type === TYPE_ROOK) return true;
                 }
                 break;
             }
             t += d;
        }
    }
    return false;
}

function generateMoves(capsOnly) {
    const moves = [];
    const us = turn;
    const them = us === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
    for(let i=0; i<64; i++) {
        const p = board[i];
        if(!p || (p & us) === 0) continue;
        const type = p & 7;
        if(type === TYPE_PAWN) {
            const dir = us === COLOR_WHITE ? -8 : 8;
            const startR = us === COLOR_WHITE ? 6 : 1;
            const promR = us === COLOR_WHITE ? 0 : 7;
            const t = i + dir;
            if (!capsOnly && board[t] === 0) {
                if ((t >> 3) === promR) {
                     moves.push(createMove(i, t, type, 0, TYPE_QUEEN, 0));
                     moves.push(createMove(i, t, type, 0, TYPE_ROOK, 0));
                     moves.push(createMove(i, t, type, 0, TYPE_BISHOP, 0));
                     moves.push(createMove(i, t, type, 0, TYPE_KNIGHT, 0));
                } else {
                    moves.push(createMove(i, t, type, 0, 0, 0));
                    if ((i >> 3) === startR && board[i + dir*2] === 0) {
                        moves.push(createMove(i, i + dir*2, type, 0, 0, FLAG_DOUBLE));
                    }
                }
            }
            const caps = [i+dir-1, i+dir+1];
            for(let ct of caps) {
                if(ct < 0 || ct > 63) continue;
                if(Math.abs((ct&7) - (i&7)) > 1) continue; 
                const target = board[ct];
                if(target && (target & them)) {
                    if ((ct >> 3) === promR) {
                         moves.push(createMove(i, ct, type, target&7, TYPE_QUEEN, 0));
                         moves.push(createMove(i, ct, type, target&7, TYPE_ROOK, 0));
                         moves.push(createMove(i, ct, type, target&7, TYPE_BISHOP, 0));
                         moves.push(createMove(i, ct, type, target&7, TYPE_KNIGHT, 0));
                    } else {
                        moves.push(createMove(i, ct, type, target&7, 0, 0));
                    }
                }
                if(ct === enPassant) moves.push(createMove(i, ct, type, TYPE_PAWN, 0, FLAG_EP));
            }
        } else {
            let dirs = [];
            if(type === TYPE_KNIGHT) dirs = [-17,-15,-10,-6,6,10,15,17];
            else if(type === TYPE_BISHOP) dirs = [-9,-7,7,9];
            else if(type === TYPE_ROOK) dirs = [-8,-1,1,8];
            else if(type === TYPE_QUEEN || type === TYPE_KING) dirs = [-9,-8,-7,-1,1,7,8,9];
            const sliding = (type === TYPE_BISHOP || type === TYPE_ROOK || type === TYPE_QUEEN);
            for(let d of dirs) {
                let to = i + d;
                while(to >= 0 && to < 64) {
                    const c2 = to & 7, c1 = (to-d) & 7;
                    if(sliding || type === TYPE_KING) {
                        if (Math.abs(c2-c1) > 1 && d !== 8 && d !== -8) break; 
                    } else if (type === TYPE_KNIGHT) {
                        if (Math.abs(c2-c1) > 2) break; 
                    }
                    const target = board[to];
                    if(target === 0) {
                        if(!capsOnly) moves.push(createMove(i, to, type, 0, 0, 0));
                    } else {
                        if(target & them) moves.push(createMove(i, to, type, target&7, 0, 0));
                        break;
                    }
                    if(!sliding) break;
                    to += d;
                }
            }
            if(type === TYPE_KING && !capsOnly) {
                 if(us === COLOR_WHITE) {
                     if((castleRights & 1) && board[61]===0 && board[62]===0 && !isAttacked(60,them) && !isAttacked(61,them))
                        moves.push(createMove(60, 62, TYPE_KING, 0, 0, FLAG_CASTLE));
                     if((castleRights & 2) && board[59]===0 && board[58]===0 && board[57]===0 && !isAttacked(60,them) && !isAttacked(59,them))
                        moves.push(createMove(60, 58, TYPE_KING, 0, 0, FLAG_CASTLE));
                 } else {
                     if((castleRights & 4) && board[5]===0 && board[6]===0 && !isAttacked(4,them) && !isAttacked(5,them))
                        moves.push(createMove(4, 6, TYPE_KING, 0, 0, FLAG_CASTLE));
                     if((castleRights & 8) && board[3]===0 && board[2]===0 && board[1]===0 && !isAttacked(4,them) && !isAttacked(3,them))
                        moves.push(createMove(4, 2, TYPE_KING, 0, 0, FLAG_CASTLE));
                 }
            }
        }
    }
    return moves;
}

function makeMove(m) {
    const f = getFrom(m), t = getTo(m);
    const p = board[f], cap = board[t];
    const state = { ep: enPassant, cr: castleRights, cap: cap, hash: currentHash };
    currentHash ^= ZOBRIST[f * 32 + p];
    board[t] = p; board[f] = 0;
    if(cap) currentHash ^= ZOBRIST[t * 32 + cap];
    const prom = getProm(m);
    if(prom) {
        board[t] = (p & 24) | prom;
        currentHash ^= ZOBRIST[t * 32 + board[t]];
    } else {
        currentHash ^= ZOBRIST[t * 32 + p];
    }
    if(m & FLAG_EP) {
        const epSq = (p & COLOR_WHITE) ? t + 8 : t - 8;
        const epP = board[epSq];
        board[epSq] = 0;
        currentHash ^= ZOBRIST[epSq * 32 + epP];
    }
    currentHash ^= ZOBRIST_CASTLE[castleRights]; 
    if(m & FLAG_CASTLE) {
        if(t === 62) { 
            board[61]=board[63]; board[63]=0; 
            currentHash ^= ZOBRIST[63 * 32 + board[61]]; 
            currentHash ^= ZOBRIST[61 * 32 + board[61]]; 
        }
        else if(t === 58) { 
            board[59]=board[56]; board[56]=0; 
            currentHash ^= ZOBRIST[56 * 32 + board[59]];
            currentHash ^= ZOBRIST[59 * 32 + board[59]];
        }
        else if(t === 6) { 
            board[5]=board[7]; board[7]=0; 
            currentHash ^= ZOBRIST[7 * 32 + board[5]];
            currentHash ^= ZOBRIST[5 * 32 + board[5]];
        }
        else if(t === 2) { 
            board[3]=board[0]; board[0]=0; 
            currentHash ^= ZOBRIST[0 * 32 + board[3]];
            currentHash ^= ZOBRIST[3 * 32 + board[3]];
        }
    }
    if(p & 7 === TYPE_KING) { if(p & COLOR_WHITE) castleRights &= ~3; else castleRights &= ~12; }
    if(f===0 || t===0) castleRights &= ~8;
    if(f===7 || t===7) castleRights &= ~4;
    if(f===56 || t===56) castleRights &= ~2;
    if(f===63 || t===63) castleRights &= ~1;
    currentHash ^= ZOBRIST_CASTLE[castleRights]; 
    enPassant = (m & FLAG_DOUBLE) ? (f+t)/2 : -1;
    turn = (turn === COLOR_WHITE) ? COLOR_BLACK : COLOR_WHITE;
    currentHash ^= ZOBRIST_SIDE;
    positionHistory[historyPly++] = currentHash;
    return state;
}

function unmakeMove(m, state) {
    historyPly--;
    currentHash = state.hash;
    turn = (turn === COLOR_WHITE) ? COLOR_BLACK : COLOR_WHITE;
    enPassant = state.ep; castleRights = state.cr;
    const f = getFrom(m), t = getTo(m);
    const p = turn | getPiece(m);
    board[f] = p; board[t] = state.cap;
    if(m & FLAG_EP) { board[t] = 0; board[(turn === COLOR_WHITE) ? t + 8 : t - 8] = (turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE) | TYPE_PAWN; }
    if(m & FLAG_CASTLE) {
        if(t === 62) { board[63]=board[61]; board[61]=0; }
        else if(t === 58) { board[56]=board[59]; board[59]=0; }
        else if(t === 6) { board[7]=board[5]; board[5]=0; }
        else if(t === 2) { board[0]=board[3]; board[3]=0; }
    }
}

function orderMoves(moves, bestMove, ply) {
    moves.sort((a,b) => {
        if(bestMove && a === bestMove) return -100000;
        if(bestMove && b === bestMove) return 100000;
        const capA = getCaptured(a), capB = getCaptured(b);
        if(capA !== capB) return capB - capA; 
        if (ply < MAX_PLY) {
             if (killerMoves[ply * 2] === a) return 900;
             if (killerMoves[ply * 2 + 1] === a) return 800;
             if (killerMoves[ply * 2] === b) return -900;
             if (killerMoves[ply * 2 + 1] === b) return -800;
        }
        const ha = history[getFrom(a) * 64 + getTo(a)];
        const hb = history[getFrom(b) * 64 + getTo(b)];
        return hb - ha;
    });
}

function isRepetition() {
    for(let i = historyPly - 2; i >= 0; i--) {
        if(positionHistory[i] === currentHash) return true;
    }
    return false;
}

function storeTT(depth, score, flag, bestMove) {
    const idx = (currentHash >>> 0) % TT_SIZE;
    ttHash[idx] = currentHash;
    ttDepth[idx] = depth;
    ttScore[idx] = score;
    ttFlag[idx] = flag;
    if (bestMove) ttMove[idx] = bestMove;
}

function probeTT(depth, alpha, beta) {
    const idx = (currentHash >>> 0) % TT_SIZE;
    if (ttHash[idx] === currentHash) {
        if (ttDepth[idx] >= depth) {
             const score = ttScore[idx];
             if (ttFlag[idx] === TT_FLAG_EXACT) return { score };
             if (ttFlag[idx] === TT_FLAG_UPPER && score >= beta) return { score: beta };
             if (ttFlag[idx] === TT_FLAG_LOWER && score <= alpha) return { score: alpha };
        }
        return { move: ttMove[idx] };
    }
    return null;
}

function qsearch(alpha, beta) {
    if((nodes & 2047) === 0) {
        const now = Date.now();
        if(now > stopTime) throw "Timeout";
        if(now - lastReportTime > 5000) {
            // NOTE TO SELF: DO NOT REMOVE THIS LOGGING FEATURE. 
            // IT PROVIDES CRITICAL COUNTDOWN/TIMING INFO TO THE USER.
            const elapsed = now - startTime;
            const remaining = stopTime - now;
            log(\`Depth \${activeDepth} | \${nodes} nodes | \${(elapsed/1000).toFixed(1)}s elapsed | \${(remaining/1000).toFixed(1)}s left\`);

            self.postMessage({ type: 'progress', depth: activeDepth, score: bestScoreGlobal, nodes: nodes, bestMove: toUIMove(bestMoveGlobal), requestId: currentRequestId });
            lastReportTime = now;
        }
    }
    nodes++;
    const standPat = evaluate();
    if(standPat >= beta) return beta;
    if(alpha < standPat) alpha = standPat;
    const moves = generateMoves(true);
    orderMoves(moves, null, 0); 
    for(let m of moves) {
        if(getSEE(m) < 0) continue; 
        const state = makeMove(m);
        const us = turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
        const kSq = board.findIndex((x) => (x & us) && (x & 7) === TYPE_KING);
        if(isAttacked(kSq, turn)) { 
            unmakeMove(m, state);
            continue;
        }
        const score = -qsearch(-beta, -alpha);
        unmakeMove(m, state);
        if(score >= beta) return beta;
        if(score > alpha) alpha = score;
    }
    return alpha;
}

function alphabeta(depth, alpha, beta, ply) {
    if((nodes & 2047) === 0) {
        const now = Date.now();
        if(now > stopTime) throw "Timeout";
        if(now - lastReportTime > 5000) {
             // NOTE TO SELF: DO NOT REMOVE THIS LOGGING FEATURE. 
             // IT PROVIDES CRITICAL COUNTDOWN/TIMING INFO TO THE USER.
             const elapsed = now - startTime;
             const remaining = stopTime - now;
             log(\`Depth \${activeDepth} | \${nodes} nodes | \${(elapsed/1000).toFixed(1)}s elapsed | \${(remaining/1000).toFixed(1)}s left\`);

             self.postMessage({ type: 'progress', depth: activeDepth, score: bestScoreGlobal, nodes: nodes, bestMove: toUIMove(bestMoveGlobal), requestId: currentRequestId });
             lastReportTime = now;
        }
    }
    nodes++;
    if (ply > 0 && isRepetition()) return 0;
    const ttEntry = probeTT(depth, alpha, beta);
    if (ttEntry && ttEntry.score !== undefined && ply > 0) return ttEntry.score;
    let ttMoveHint = ttEntry ? ttEntry.move : 0;
    if (ply >= MAX_PLY) return evaluate();
    const mateScore = MATE_SCORE - ply;
    if (alpha < -mateScore) alpha = -mateScore;
    if (beta > mateScore - 1) beta = mateScore - 1;
    if (alpha >= beta) return alpha;
    const kSq = board.findIndex((x) => (x & turn) && (x & 7) === TYPE_KING);
    const inCheck = isAttacked(kSq, turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE);
    if(inCheck) depth++;
    if(depth <= 0) return qsearch(alpha, beta);
    
    const moves = generateMoves(false);
    orderMoves(moves, ttMoveHint, ply);
    
    let moveCount = 0;
    let bestScore = -30000;
    let bestMoveLocal = 0;
    let flag = TT_FLAG_LOWER; 
    
    for(let m of moves) {
        const state = makeMove(m);
        const us = turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
        const kSqAfter = board.findIndex((x) => (x & us) && (x & 7) === TYPE_KING);
        if(isAttacked(kSqAfter, turn)) { 
            unmakeMove(m, state);
            continue;
        }
        moveCount++;
        let score;
        if(moveCount === 1) {
            score = -alphabeta(depth - 1, -beta, -alpha, ply + 1);
        } else {
            let reduction = 0;
            if (depth >= 3 && moveCount > 4 && !getCaptured(m) && !inCheck) reduction = 1;
            score = -alphabeta(depth - 1 - reduction, -alpha - 1, -alpha, ply + 1);
            if(score > alpha && score < beta) {
                 score = -alphabeta(depth - 1, -beta, -alpha, ply + 1);
            }
        }
        unmakeMove(m, state);
        if(score > bestScore) {
            bestScore = score;
            bestMoveLocal = m;
            if(score > alpha) {
                alpha = score;
                flag = TT_FLAG_EXACT;
                if (!getCaptured(m)) {
                     history[getFrom(m) * 64 + getTo(m)] += depth * depth;
                     if (ply < MAX_PLY) {
                         if (killerMoves[ply * 2] !== m) {
                             killerMoves[ply * 2 + 1] = killerMoves[ply * 2];
                             killerMoves[ply * 2] = m;
                         }
                     }
                }
            }
        }
        if(alpha >= beta) {
            flag = TT_FLAG_UPPER; 
            break; 
        }
    }
    if(moveCount === 0) return inCheck ? -MATE_SCORE + ply : 0;
    storeTT(depth, bestScore, flag, bestMoveLocal);
    return bestScore;
}

function toUIMove(m) {
    if(!m) return null;
    let pChar = undefined;
    const prom = getProm(m);
    if(prom) {
        if(prom === TYPE_QUEEN) pChar = 'q';
        else if(prom === TYPE_ROOK) pChar = 'r';
        else if(prom === TYPE_BISHOP) pChar = 'b';
        else if(prom === TYPE_KNIGHT) pChar = 'n';
    }
    return {
        from: getFrom(m),
        to: getTo(m),
        promotion: pChar,
        flags: { isCastle: !!(m & FLAG_CASTLE), isEnPassant: !!(m & FLAG_EP) }
    };
}

self.onmessage = function(e) {
    const { fen, depth, timeLimit, requestId } = e.data;
    try {
        parseFen(fen);
        nodes = 0;
        startTime = Date.now();
        stopTime = startTime + timeLimit;
        lastReportTime = startTime;
        lastLogTime = startTime;
        currentRequestId = requestId;
        bestMoveGlobal = 0;
        bestScoreGlobal = 0;
        killerMoves.fill(0);
        history.fill(0);
        log(\`[ENGINE A] Classic Mode. Depth: \${depth}\`);
        for(let d=1; d<=depth; d++) {
            activeDepth = d;
            try {
                const moves = generateMoves(false);
                orderMoves(moves, bestMoveGlobal, 0); 
                let alpha = -30000, beta = 30000;
                let bestScore = -30000;
                let bestMoveLocal = 0;
                for(let m of moves) {
                    const state = makeMove(m);
                    const us = turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
                    const kSq = board.findIndex((x) => (x & us) && (x & 7) === TYPE_KING);
                    if(isAttacked(kSq, turn)) {
                        unmakeMove(m, state);
                        continue;
                    }
                    const score = -alphabeta(d-1, -beta, -alpha, 1);
                    unmakeMove(m, state);
                    if(score > bestScore) {
                        bestScore = score;
                        bestMoveLocal = m;
                        bestMoveGlobal = bestMoveLocal; 
                        bestScoreGlobal = bestScore;
                        if(score > alpha) alpha = score;
                        self.postMessage({
                             type: 'progress',
                             depth: d,
                             score: bestScore,
                             nodes: nodes,
                             bestMove: toUIMove(bestMoveLocal),
                             requestId
                        });
                    }
                }
                if(Date.now() > stopTime) throw "Timeout";
                if(bestMoveLocal !== 0) {
                    bestMoveGlobal = bestMoveLocal;
                    bestScoreGlobal = bestScore;
                }
                if(bestScore > 28000 || bestScore < -28000) break;
            } catch(timeout) {
                if (timeout === "Timeout") log(\`[TIMEOUT] Depth \${d}\`);
                break;
            }
        }
        self.postMessage({ type: 'done', bestMove: toUIMove(bestMoveGlobal), score: bestScoreGlobal, nodes: nodes, requestId });
    } catch(err) {
        log("ERROR: " + err.message);
        self.postMessage({ type: 'done', bestMove: toUIMove(bestMoveGlobal), score: bestScoreGlobal, nodes: nodes, requestId });
    }
}
`;

// ============================================================================
// ENGINE B: NEURAL + TACTICIAN (Accumulator + Null Move Pruning)
// ============================================================================
export const workerCodeB = `
// [CONSTANTS AND TABLES are reused, but we add architecture specific constants]

const VAL_PAWN = 100;
const VAL_KNIGHT = 320;
const VAL_BISHOP = 330;
const VAL_ROOK = 500;
const VAL_QUEEN = 900;
const VAL_KING = 20000;
const MATE_SCORE = 29000; 
const MAX_PLY = 100; 

const COLOR_WHITE = 8;
const COLOR_BLACK = 16;
const TYPE_EMPTY = 0;
const TYPE_PAWN = 1;
const TYPE_KNIGHT = 2;
const TYPE_BISHOP = 3;
const TYPE_ROOK = 4;
const TYPE_QUEEN = 5;
const TYPE_KING = 6;

const MASK_FROM = 0x3F;
const MASK_TO = 0xFC0;
const SHIFT_TO = 6;
const MASK_PIECE = 0x7000;
const SHIFT_PIECE = 12;
const MASK_CAP = 0x38000;
const SHIFT_CAP = 15;
const MASK_PROM = 0x1C0000;
const SHIFT_PROM = 18;
const FLAG_CASTLE = 0x200000;
const FLAG_EP = 0x400000;
const FLAG_DOUBLE = 0x800000;

// Tables (PeSTO)
const MG_PAWN = [0,0,0,0,0,0,0,0,98,134,61,95,68,126,34,-11,-6,7,26,31,65,56,25,-20,-14,13,6,21,23,12,17,-23,-27,-2,-5,12,17,6,10,-25,-26,-4,-4,-10,3,3,33,-12,-35,-1,-20,-23,-15,24,38,-22,0,0,0,0,0,0,0,0];
const EG_PAWN = [0,0,0,0,0,0,0,0,178,173,158,134,147,132,165,187,94,100,85,67,56,53,82,84,32,24,13,5,-2,4,17,17,13,9,-3,-7,-7,-8,3,-1,4,7,-6,1,0,-5,-1,-8,13,8,8,10,13,0,2,-7,0,0,0,0,0,0,0,0];
const MG_KNIGHT = [-167,-89,-34,-49,61,-97,-15,-107,-73,-41,72,36,23,62,7,-17,-47,60,37,65,84,129,73,44,-9,17,19,53,37,69,18,22,-13,4,16,13,28,19,21,-8,-23,-9,12,10,19,17,25,-16,-29,-53,-12,-3,-1,18,-14,-19,-105,-21,-58,-33,-17,-28,-19,-23];
const EG_KNIGHT = [-58,-38,-13,-28,-31,-27,-63,-99,-25,-8,-25,-2,-9,-25,-24,-52,-24,-20,10,9,-1,-9,-19,-41,-17,3,22,22,22,11,8,-18,-18,-6,16,25,16,17,4,-18,-23,-3,-1,15,10,-3,-20,-22,-42,-20,-10,-5,-2,-20,-23,-44,-29,-51,-23,-15,-22,-18,-50,-64];
const MG_BISHOP = [-29,4,-82,-37,-25,-42,7,-8,-26,16,-18,-13,30,59,18,-47,-16,37,43,40,35,50,37,-2,-4,5,19,50,37,37,7,-2,-6,13,13,26,34,12,10,4,0,15,15,15,14,27,18,10,4,15,16,0,7,21,33,1,-33,-3,-14,-21,-13,-12,-39,-21];
const EG_BISHOP = [-14,-21,-11,-8,-7,-9,-17,-24,-8,-4,7,-12,-3,-13,-4,-14,2,-8,0,-1,-2,6,0,4,-3,9,12,9,14,10,3,2,-6,3,13,19,7,10,-3,-9,-12,-3,5,10,13,3,-7,-15,-14,-18,-7,-1,4,-9,-15,-27,-23,-9,-23,-5,-9,-16,-5,-17];
const MG_ROOK = [32,42,32,51,63,9,31,43,27,32,58,62,80,67,26,44,-5,19,26,36,17,45,61,16,-24,-11,7,26,24,35,-8,-20,-36,-26,-12,-1,9,-7,6,-23,-45,-25,-16,-17,3,0,-5,-33,-44,-16,-20,-9,-1,11,-6,-71,-19,-13,1,17,16,7,-37,-26];
const EG_ROOK = [13,10,18,15,12,12,8,5,11,13,13,11,-3,3,8,3,7,7,7,5,4,-3,-5,-3,4,3,13,1,2,1,-1,2,3,5,8,4,-5,-6,-8,-11,-4,0,-5,-1,-7,-12,-8,-16,-18,-20,-7,-13,-13,-23,-15,-25,-14,-25,-12,-25,-27,-25,-27,-25];
const MG_QUEEN = [-28,0,29,12,59,44,43,45,-24,-39,-5,1,-16,57,28,54,-13,-17,7,8,29,56,47,57,-27,-27,-16,-16,-1,17,-2,1,-9,-26,-9,-10,-2,-4,3,-3,-14,2,-11,-2,-5,2,14,5,-35,-8,11,2,8,15,-3,1,-1,-18,-9,10,-15,-25,-31,-50];
const EG_QUEEN = [-9,22,22,27,27,19,10,20,-17,20,32,41,58,25,30,0,-20,6,9,49,47,35,19,9,3,22,24,45,57,40,57,36,-18,28,19,47,31,34,39,23,-16,-27,15,6,9,17,10,5,-22,-23,-30,-16,-16,-23,-36,-32,-33,-28,-22,-43,-5,-32,-20,-41];
const MG_KING = [-65,23,16,-15,-56,-34,2,13,29,-1,-20,-7,-8,-4,-38,-29,-9,24,2,-16,-20,6,22,-22,-17,-20,-12,-27,-30,-25,-14,-36,-49,-1,-27,-39,-46,-44,-33,-51,-14,-14,-22,-46,-44,-30,-15,-27,1,7,-8,-64,-43,-16,9,8,-15,36,12,-54,8,-28,24,14];
const EG_KING = [-74,-35,-18,-18,-11,15,4,-17,-12,17,14,17,17,38,23,11,10,17,23,15,20,45,44,13,-8,22,24,27,26,33,26,3,-18,-4,21,24,27,23,9,-11,-19,-3,11,21,23,16,7,-9,-27,-11,4,13,14,4,-5,-17,-53,-34,-21,-11,-28,-14,-24,-43];

const TABLES_MG = [[],MG_PAWN,MG_KNIGHT,MG_BISHOP,MG_ROOK,MG_QUEEN,MG_KING];
const TABLES_EG = [[],EG_PAWN,EG_KNIGHT,EG_BISHOP,EG_ROOK,EG_QUEEN,EG_KING];

const TT_SIZE = 1 << 20; 
const TT_FLAG_EXACT = 0;
const TT_FLAG_LOWER = 1; 
const TT_FLAG_UPPER = 2; 

const ZOBRIST = new Int32Array(64 * 32);
const ZOBRIST_CASTLE = new Int32Array(16);
const ZOBRIST_SIDE = 0x12345678;

for(let i=0; i<ZOBRIST.length; i++) ZOBRIST[i] = (Math.random() * 0xFFFFFFFF) | 0;
for(let i=0; i<ZOBRIST_CASTLE.length; i++) ZOBRIST_CASTLE[i] = (Math.random() * 0xFFFFFFFF) | 0;

let board = new Int8Array(64); 
let turn = COLOR_WHITE;
let castleRights = 0; 
let enPassant = -1;
let currentHash = 0;
let positionHistory = new Int32Array(MAX_PLY + 50);
let historyPly = 0;

let nodes = 0;
let stopTime = 0;
let startTime = 0;
let lastReportTime = 0;

let killerMoves = new Int32Array(MAX_PLY * 2); 
let history = new Int32Array(64 * 64); 

let bestMoveGlobal = 0;
let bestScoreGlobal = 0;
let currentRequestId = 0;
let activeDepth = 0;

const ttHash = new Int32Array(TT_SIZE);
const ttDepth = new Int8Array(TT_SIZE);
const ttFlag = new Int8Array(TT_SIZE);
const ttScore = new Int16Array(TT_SIZE);
const ttMove = new Int32Array(TT_SIZE);

// --- NNUE ARCHITECTURE START ---
// 768 Inputs (64sq * 12pc) -> 16 Hidden -> 1 Output
// Since we can't load a 20MB file, we use "Procedural Weights" derived from PeSTO to initialize,
// but we run the *Architecture* of NNUE (Accumulators).
// This makes it a "Neural-style" engine that could theoretically accept a .nnue file.

const HIDDEN_SIZE = 32;
// Accumulators for [WhitePerspective, BlackPerspective]
// We maintain them incrementally.
let accumulator = new Int16Array(HIDDEN_SIZE * 2); 
// Weights (Simulated)
const inputWeights = new Int16Array(768 * HIDDEN_SIZE);
const outputWeights = new Int16Array(HIDDEN_SIZE * 2);

// Initialize "Weights" procedurally to approximate PeSTO (so it plays chess!)
function initNeuralWeights() {
    // This is a "fake" training step. In a real NNUE, these would be loaded from a file.
    // We map PST values into the input weights so the neural net "knows" chess rules.
    for(let pt=1; pt<=6; pt++) {
        for(let sq=0; sq<64; sq++) {
             // Simple mapping: 1st neuron = Material, 2nd = Positional, etc.
             // We just distribute the PeSTO value across the hidden layer to verify architecture.
             const mg = TABLES_MG[pt][sq] + [0, 100, 320, 330, 500, 900, 20000][pt];
             for(let h=0; h<HIDDEN_SIZE; h++) {
                 // Distribute value with some noise to simulate "features"
                 const noise = (h % 3 === 0) ? 1 : 0;
                 const idxW = ((pt-1)*64 + sq) * HIDDEN_SIZE + h;
                 const idxB = (((pt-1)+6)*64 + (sq^56)) * HIDDEN_SIZE + h;
                 const val = (mg / HIDDEN_SIZE) + noise;
                 inputWeights[idxW] = val; 
                 inputWeights[idxB] = -val; // FIX: Negate black weights so sum is score diff
             }
        }
    }
    for(let h=0; h<HIDDEN_SIZE*2; h++) outputWeights[h] = 1; // Summation
}
initNeuralWeights();

function refreshAccumulator() {
    accumulator.fill(0);
    // Recompute from scratch (slow, used only on fresh search or error)
    for(let i=0; i<64; i++) {
        const p = board[i];
        if(p) {
            const type = (p & 7) - 1;
            const colorOffset = (p & COLOR_WHITE) ? 0 : 6;
            const featIdx = (type + colorOffset) * 64 + i;
            
            for(let h=0; h<HIDDEN_SIZE; h++) {
                accumulator[h] += inputWeights[featIdx * HIDDEN_SIZE + h];
                // For black perspective, we flip logic usually, but simplified here:
                accumulator[HIDDEN_SIZE + h] += inputWeights[featIdx * HIDDEN_SIZE + h]; 
            }
        }
    }
}
// --- NNUE ARCHITECTURE END ---


function log(msg) { self.postMessage({ type: 'log', message: msg, requestId: currentRequestId }); }

function createMove(f, t, p, cap, prom, flags) {
    return f | (t << SHIFT_TO) | (p << SHIFT_PIECE) | (cap << SHIFT_CAP) | (prom << SHIFT_PROM) | flags;
}
function getFrom(m) { return m & MASK_FROM; }
function getTo(m) { return (m & MASK_TO) >> SHIFT_TO; }
function getPiece(m) { return (m & MASK_PIECE) >> SHIFT_PIECE; }
function getCaptured(m) { return (m & MASK_CAP) >> SHIFT_CAP; }
function getProm(m) { return (m & MASK_PROM) >> SHIFT_PROM; }

function getHash() {
    let h = 0;
    for(let i=0; i<64; i++) {
        const p = board[i];
        if(p) h ^= ZOBRIST[i * 32 + p];
    }
    if(turn === COLOR_BLACK) h ^= ZOBRIST_SIDE;
    h ^= ZOBRIST_CASTLE[castleRights];
    return h;
}

function parseFen(fen) {
    board.fill(TYPE_EMPTY);
    const parts = fen.split(' ');
    let r=0, c=0;
    for(const char of parts[0]) {
        if(char === '/') { r++; c=0; }
        else if(char >= '1' && char <= '8') { c += parseInt(char); }
        else {
            const color = (char === char.toUpperCase()) ? COLOR_WHITE : COLOR_BLACK;
            const typeChar = char.toLowerCase();
            const type = {p:1, n:2, b:3, r:4, q:5, k:6}[typeChar];
            board[r*8+c] = color | type;
            c++;
        }
    }
    turn = parts[1] === 'w' ? COLOR_WHITE : COLOR_BLACK;
    castleRights = 0;
    if(parts[2].includes('K')) castleRights |= 1;
    if(parts[2].includes('Q')) castleRights |= 2;
    if(parts[2].includes('k')) castleRights |= 4;
    if(parts[2].includes('q')) castleRights |= 8;
    enPassant = parts[3] === '-' ? -1 : 
        (8 - parseInt(parts[3][1])) * 8 + (parts[3].charCodeAt(0) - 97);
    
    currentHash = getHash();
    historyPly = 0;
    positionHistory[historyPly++] = currentHash;
    refreshAccumulator(); // Init NNUE state
}

// NNUE EVALUATION (Simulated)
function evaluateNNUE() {
    // Run the hidden layer -> output
    let score = 0;
    // Linear Activation (Removed ReLU for this simulation to allow negative scores)
    for(let h=0; h<HIDDEN_SIZE; h++) {
        const val = accumulator[h]; // White perspective
        score += val * outputWeights[h];
    }
    
    // Safety Clipping to prevent false mate detection
    if (score > 15000) score = 15000;
    if (score < -15000) score = -15000;
    
    return turn === COLOR_WHITE ? score : -score;
}

function getSEE(move) {
    const piece = getPiece(move);
    const captured = getCaptured(move);
    let score = 0;
    if(captured) {
        const valMap = [0, 100, 320, 330, 500, 900, 20000];
        score = valMap[captured] - valMap[piece];
    }
    return score; 
}

function isAttacked(sq, byColor) {
    // [Same as Engine A]
    const pawnDir = byColor === COLOR_WHITE ? 8 : -8;
    const pawnRow = byColor === COLOR_WHITE ? (sq>>3)+1 : (sq>>3)-1;
    if(pawnRow>=0 && pawnRow<8) {
        const c = sq&7;
        if(c>0) { const idx = (pawnRow<<3)+(c-1); if((board[idx]&byColor) && (board[idx]&7)===TYPE_PAWN) return true; }
        if(c<7) { const idx = (pawnRow<<3)+(c+1); if((board[idx]&byColor) && (board[idx]&7)===TYPE_PAWN) return true; }
    }
    const kDirs = [-17,-15,-10,-6,6,10,15,17];
    for(let d of kDirs) {
        const t = sq+d;
        if(t>=0 && t<64 && Math.abs((t&7)-(sq&7))<=2) {
            if((board[t] & byColor) && (board[t]&7)===TYPE_KNIGHT) return true;
        }
    }
    const dirs = [-9, -7, 7, 9, -8, -1, 1, 8];
    for(let i=0; i<8; i++) {
        let d = dirs[i];
        let t = sq + d;
        while(t>=0 && t<64) {
             const c1 = (t-d)&7, c2 = t&7;
             if(Math.abs(c2-c1) > 1 && d !== 8 && d !== -8) break; 
             if(Math.abs(c2-c1) > 1 && (d===1 || d===-1)) break;
             const p = board[t];
             if(p) {
                 if(p & byColor) {
                     const type = p&7;
                     if(type === TYPE_QUEEN) return true;
                     if(i < 4 && type === TYPE_BISHOP) return true; 
                     if(i >= 4 && type === TYPE_ROOK) return true;
                 }
                 break;
             }
             t += d;
        }
    }
    return false;
}

function generateMoves(capsOnly) {
    // [Same as Engine A]
    const moves = [];
    const us = turn;
    const them = us === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
    for(let i=0; i<64; i++) {
        const p = board[i];
        if(!p || (p & us) === 0) continue;
        const type = p & 7;
        if(type === TYPE_PAWN) {
            const dir = us === COLOR_WHITE ? -8 : 8;
            const startR = us === COLOR_WHITE ? 6 : 1;
            const promR = us === COLOR_WHITE ? 0 : 7;
            const t = i + dir;
            if (!capsOnly && board[t] === 0) {
                if ((t >> 3) === promR) {
                     moves.push(createMove(i, t, type, 0, TYPE_QUEEN, 0));
                     moves.push(createMove(i, t, type, 0, TYPE_ROOK, 0));
                     moves.push(createMove(i, t, type, 0, TYPE_BISHOP, 0));
                     moves.push(createMove(i, t, type, 0, TYPE_KNIGHT, 0));
                } else {
                    moves.push(createMove(i, t, type, 0, 0, 0));
                    if ((i >> 3) === startR && board[i + dir*2] === 0) {
                        moves.push(createMove(i, i + dir*2, type, 0, 0, FLAG_DOUBLE));
                    }
                }
            }
            const caps = [i+dir-1, i+dir+1];
            for(let ct of caps) {
                if(ct < 0 || ct > 63) continue;
                if(Math.abs((ct&7) - (i&7)) > 1) continue; 
                const target = board[ct];
                if(target && (target & them)) {
                    if ((ct >> 3) === promR) {
                         moves.push(createMove(i, ct, type, target&7, TYPE_QUEEN, 0));
                         moves.push(createMove(i, ct, type, target&7, TYPE_ROOK, 0));
                         moves.push(createMove(i, ct, type, target&7, TYPE_BISHOP, 0));
                         moves.push(createMove(i, ct, type, target&7, TYPE_KNIGHT, 0));
                    } else {
                        moves.push(createMove(i, ct, type, target&7, 0, 0));
                    }
                }
                if(ct === enPassant) moves.push(createMove(i, ct, type, TYPE_PAWN, 0, FLAG_EP));
            }
        } else {
            let dirs = [];
            if(type === TYPE_KNIGHT) dirs = [-17,-15,-10,-6,6,10,15,17];
            else if(type === TYPE_BISHOP) dirs = [-9,-7,7,9];
            else if(type === TYPE_ROOK) dirs = [-8,-1,1,8];
            else if(type === TYPE_QUEEN || type === TYPE_KING) dirs = [-9,-8,-7,-1,1,7,8,9];
            const sliding = (type === TYPE_BISHOP || type === TYPE_ROOK || type === TYPE_QUEEN);
            for(let d of dirs) {
                let to = i + d;
                while(to >= 0 && to < 64) {
                    const c2 = to & 7, c1 = (to-d) & 7;
                    if(sliding || type === TYPE_KING) {
                        if (Math.abs(c2-c1) > 1 && d !== 8 && d !== -8) break; 
                    } else if (type === TYPE_KNIGHT) {
                        if (Math.abs(c2-c1) > 2) break; 
                    }
                    const target = board[to];
                    if(target === 0) {
                        if(!capsOnly) moves.push(createMove(i, to, type, 0, 0, 0));
                    } else {
                        if(target & them) moves.push(createMove(i, to, type, target&7, 0, 0));
                        break;
                    }
                    if(!sliding) break;
                    to += d;
                }
            }
            if(type === TYPE_KING && !capsOnly) {
                 if(us === COLOR_WHITE) {
                     if((castleRights & 1) && board[61]===0 && board[62]===0 && !isAttacked(60,them) && !isAttacked(61,them))
                        moves.push(createMove(60, 62, TYPE_KING, 0, 0, FLAG_CASTLE));
                     if((castleRights & 2) && board[59]===0 && board[58]===0 && board[57]===0 && !isAttacked(60,them) && !isAttacked(59,them))
                        moves.push(createMove(60, 58, TYPE_KING, 0, 0, FLAG_CASTLE));
                 } else {
                     if((castleRights & 4) && board[5]===0 && board[6]===0 && !isAttacked(4,them) && !isAttacked(5,them))
                        moves.push(createMove(4, 6, TYPE_KING, 0, 0, FLAG_CASTLE));
                     if((castleRights & 8) && board[3]===0 && board[2]===0 && board[1]===0 && !isAttacked(4,them) && !isAttacked(3,them))
                        moves.push(createMove(4, 2, TYPE_KING, 0, 0, FLAG_CASTLE));
                 }
            }
        }
    }
    return moves;
}

function makeMove(m) {
    const f = getFrom(m), t = getTo(m);
    const p = board[f], cap = board[t];
    const state = { ep: enPassant, cr: castleRights, cap: cap, hash: currentHash };
    
    // NNUE Incremental Update (Simplified: Full Refresh for this demo to save logic size,
    // in real engine we use sub/add ops on accumulator)
    // We assume the refresh is fast enough for this small layer.
    
    currentHash ^= ZOBRIST[f * 32 + p];
    board[t] = p; board[f] = 0;
    if(cap) currentHash ^= ZOBRIST[t * 32 + cap];
    const prom = getProm(m);
    if(prom) {
        board[t] = (p & 24) | prom;
        currentHash ^= ZOBRIST[t * 32 + board[t]];
    } else {
        currentHash ^= ZOBRIST[t * 32 + p];
    }
    if(m & FLAG_EP) {
        const epSq = (p & COLOR_WHITE) ? t + 8 : t - 8;
        const epP = board[epSq];
        board[epSq] = 0;
        currentHash ^= ZOBRIST[epSq * 32 + epP];
    }
    currentHash ^= ZOBRIST_CASTLE[castleRights]; 
    if(m & FLAG_CASTLE) {
        if(t === 62) { board[61]=board[63]; board[63]=0; currentHash ^= ZOBRIST[63*32+board[61]]; currentHash ^= ZOBRIST[61*32+board[61]]; }
        else if(t === 58) { board[59]=board[56]; board[56]=0; currentHash ^= ZOBRIST[56*32+board[59]]; currentHash ^= ZOBRIST[59*32+board[59]]; }
        else if(t === 6) { board[5]=board[7]; board[7]=0; currentHash ^= ZOBRIST[7*32+board[5]]; currentHash ^= ZOBRIST[5*32+board[5]]; }
        else if(t === 2) { board[3]=board[0]; board[0]=0; currentHash ^= ZOBRIST[0*32+board[3]]; currentHash ^= ZOBRIST[3*32+board[3]]; }
    }
    if(p & 7 === TYPE_KING) { if(p & COLOR_WHITE) castleRights &= ~3; else castleRights &= ~12; }
    if(f===0 || t===0) castleRights &= ~8;
    if(f===7 || t===7) castleRights &= ~4;
    if(f===56 || t===56) castleRights &= ~2;
    if(f===63 || t===63) castleRights &= ~1;
    currentHash ^= ZOBRIST_CASTLE[castleRights]; 
    enPassant = (m & FLAG_DOUBLE) ? (f+t)/2 : -1;
    turn = (turn === COLOR_WHITE) ? COLOR_BLACK : COLOR_WHITE;
    currentHash ^= ZOBRIST_SIDE;
    positionHistory[historyPly++] = currentHash;
    
    // UPDATE NNUE
    refreshAccumulator(); 

    return state;
}

function unmakeMove(m, state) {
    historyPly--;
    currentHash = state.hash;
    turn = (turn === COLOR_WHITE) ? COLOR_BLACK : COLOR_WHITE;
    enPassant = state.ep; castleRights = state.cr;
    const f = getFrom(m), t = getTo(m);
    const p = turn | getPiece(m);
    board[f] = p; board[t] = state.cap;
    if(m & FLAG_EP) { board[t] = 0; board[(turn === COLOR_WHITE) ? t + 8 : t - 8] = (turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE) | TYPE_PAWN; }
    if(m & FLAG_CASTLE) {
        if(t === 62) { board[63]=board[61]; board[61]=0; }
        else if(t === 58) { board[56]=board[59]; board[59]=0; }
        else if(t === 6) { board[7]=board[5]; board[5]=0; }
        else if(t === 2) { board[0]=board[3]; board[3]=0; }
    }
    // UPDATE NNUE
    refreshAccumulator(); 
}

// NULL MOVE HELPERS (Engine B Exclusive)
function makeNullMove() {
    const state = { ep: enPassant, hash: currentHash };
    enPassant = -1;
    turn = (turn === COLOR_WHITE) ? COLOR_BLACK : COLOR_WHITE;
    currentHash ^= ZOBRIST_SIDE;
    positionHistory[historyPly++] = currentHash;
    // No board change, accumulator stays same
    return state;
}

function unmakeNullMove(state) {
    historyPly--;
    currentHash = state.hash;
    turn = (turn === COLOR_WHITE) ? COLOR_BLACK : COLOR_WHITE;
    enPassant = state.ep;
}

function orderMoves(moves, bestMove, ply) {
    moves.sort((a,b) => {
        if(bestMove && a === bestMove) return -100000;
        if(bestMove && b === bestMove) return 100000;
        const capA = getCaptured(a), capB = getCaptured(b);
        if(capA !== capB) return capB - capA; 
        if (ply < MAX_PLY) {
             if (killerMoves[ply * 2] === a) return 900;
             if (killerMoves[ply * 2 + 1] === a) return 800;
        }
        const ha = history[getFrom(a) * 64 + getTo(a)];
        const hb = history[getFrom(b) * 64 + getTo(b)];
        return hb - ha;
    });
}

function isRepetition() {
    for(let i = historyPly - 2; i >= 0; i--) {
        if(positionHistory[i] === currentHash) return true;
    }
    return false;
}

function storeTT(depth, score, flag, bestMove) {
    const idx = (currentHash >>> 0) % TT_SIZE;
    ttHash[idx] = currentHash;
    ttDepth[idx] = depth;
    ttScore[idx] = score;
    ttFlag[idx] = flag;
    if (bestMove) ttMove[idx] = bestMove;
}

function probeTT(depth, alpha, beta) {
    const idx = (currentHash >>> 0) % TT_SIZE;
    if (ttHash[idx] === currentHash) {
        if (ttDepth[idx] >= depth) {
             const score = ttScore[idx];
             if (ttFlag[idx] === TT_FLAG_EXACT) return { score };
             if (ttFlag[idx] === TT_FLAG_UPPER && score >= beta) return { score: beta };
             if (ttFlag[idx] === TT_FLAG_LOWER && score <= alpha) return { score: alpha };
        }
        return { move: ttMove[idx] };
    }
    return null;
}

function qsearch(alpha, beta) {
    if((nodes & 2047) === 0) {
        const now = Date.now();
        if(now > stopTime) throw "Timeout";
        if(now - lastReportTime > 5000) {
            // NOTE TO SELF: DO NOT REMOVE THIS LOGGING FEATURE. 
            // IT PROVIDES CRITICAL COUNTDOWN/TIMING INFO TO THE USER.
            const elapsed = now - startTime;
            const remaining = stopTime - now;
            log(\`Depth \${activeDepth} | \${nodes} nodes | \${(elapsed/1000).toFixed(1)}s elapsed | \${(remaining/1000).toFixed(1)}s left\`);

            self.postMessage({ type: 'progress', depth: activeDepth, score: bestScoreGlobal, nodes: nodes, bestMove: toUIMove(bestMoveGlobal), requestId: currentRequestId });
            lastReportTime = now;
        }
    }
    nodes++;
    const standPat = evaluateNNUE();
    if(standPat >= beta) return beta;
    if(alpha < standPat) alpha = standPat;
    const moves = generateMoves(true);
    orderMoves(moves, null, 0); 
    for(let m of moves) {
        if(getSEE(m) < 0) continue; 
        const state = makeMove(m);
        const us = turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
        const kSq = board.findIndex((x) => (x & us) && (x & 7) === TYPE_KING);
        if(isAttacked(kSq, turn)) { 
            unmakeMove(m, state);
            continue;
        }
        const score = -qsearch(-beta, -alpha);
        unmakeMove(m, state);
        if(score >= beta) return beta;
        if(score > alpha) alpha = score;
    }
    return alpha;
}

function alphabeta(depth, alpha, beta, ply) {
    if((nodes & 2047) === 0) {
        const now = Date.now();
        if(now > stopTime) throw "Timeout";
        if(now - lastReportTime > 5000) {
             // NOTE TO SELF: DO NOT REMOVE THIS LOGGING FEATURE. 
             // IT PROVIDES CRITICAL COUNTDOWN/TIMING INFO TO THE USER.
             const elapsed = now - startTime;
             const remaining = stopTime - now;
             log(\`Depth \${activeDepth} | \${nodes} nodes | \${(elapsed/1000).toFixed(1)}s elapsed | \${(remaining/1000).toFixed(1)}s left\`);

             self.postMessage({ type: 'progress', depth: activeDepth, score: bestScoreGlobal, nodes: nodes, bestMove: toUIMove(bestMoveGlobal), requestId: currentRequestId });
             lastReportTime = now;
        }
    }
    nodes++;
    if (ply > 0 && isRepetition()) return 0;
    const ttEntry = probeTT(depth, alpha, beta);
    if (ttEntry && ttEntry.score !== undefined && ply > 0) return ttEntry.score;
    let ttMoveHint = ttEntry ? ttEntry.move : 0;
    
    // Futility Pruning (Engine B Feature)
    if (depth <= 4 && !ttMoveHint && ply > 0 && Math.abs(beta) < 20000) {
         const staticEval = evaluateNNUE();
         // Margin: 150 * depth
         if (staticEval - 150 * depth >= beta) return beta;
    }

    if (ply >= MAX_PLY) return evaluateNNUE();
    const mateScore = MATE_SCORE - ply;
    if (alpha < -mateScore) alpha = -mateScore;
    if (beta > mateScore - 1) beta = mateScore - 1;
    if (alpha >= beta) return alpha;
    const kSq = board.findIndex((x) => (x & turn) && (x & 7) === TYPE_KING);
    const inCheck = isAttacked(kSq, turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE);
    if(inCheck) depth++;

    // NULL MOVE PRUNING (Engine B Exclusive)
    // If not in check, and depth is high enough, and we have pieces (not just kings/pawns - simplified here), try passing
    // If passing yields a cutoff (beta), then our position is likely so good we don't need to search moves.
    if (!inCheck && depth >= 3 && ply > 0) {
         const R = 2;
         const nmState = makeNullMove();
         const score = -alphabeta(depth - 1 - R, -beta, -beta + 1, ply + 1);
         unmakeNullMove(nmState);
         if (score >= beta) return beta;
    }
    
    if(depth <= 0) return qsearch(alpha, beta);
    
    const moves = generateMoves(false);
    orderMoves(moves, ttMoveHint, ply);
    
    let moveCount = 0;
    let bestScore = -30000;
    let bestMoveLocal = 0;
    let flag = TT_FLAG_LOWER; 
    
    for(let m of moves) {
        const state = makeMove(m);
        const us = turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
        const kSqAfter = board.findIndex((x) => (x & us) && (x & 7) === TYPE_KING);
        if(isAttacked(kSqAfter, turn)) { 
            unmakeMove(m, state);
            continue;
        }
        moveCount++;
        let score;
        if(moveCount === 1) {
            score = -alphabeta(depth - 1, -beta, -alpha, ply + 1);
        } else {
            let reduction = 0;
            // More aggressive LMR for Engine B
            if (depth >= 3 && moveCount > 4 && !getCaptured(m) && !inCheck) reduction = 2; // Was 1 in Engine A
            
            score = -alphabeta(depth - 1 - reduction, -alpha - 1, -alpha, ply + 1);
            if(score > alpha && score < beta) {
                 score = -alphabeta(depth - 1, -beta, -alpha, ply + 1);
            }
        }
        unmakeMove(m, state);
        if(score > bestScore) {
            bestScore = score;
            bestMoveLocal = m;
            if(score > alpha) {
                alpha = score;
                flag = TT_FLAG_EXACT;
                if (!getCaptured(m)) {
                     history[getFrom(m) * 64 + getTo(m)] += depth * depth;
                     if (ply < MAX_PLY) {
                         if (killerMoves[ply * 2] !== m) {
                             killerMoves[ply * 2 + 1] = killerMoves[ply * 2];
                             killerMoves[ply * 2] = m;
                         }
                     }
                }
            }
        }
        if(alpha >= beta) {
            flag = TT_FLAG_UPPER; 
            break; 
        }
    }
    if(moveCount === 0) return inCheck ? -MATE_SCORE + ply : 0;
    storeTT(depth, bestScore, flag, bestMoveLocal);
    return bestScore;
}

function toUIMove(m) {
    if(!m) return null;
    let pChar = undefined;
    const prom = getProm(m);
    if(prom) {
        if(prom === TYPE_QUEEN) pChar = 'q';
        else if(prom === TYPE_ROOK) pChar = 'r';
        else if(prom === TYPE_BISHOP) pChar = 'b';
        else if(prom === TYPE_KNIGHT) pChar = 'n';
    }
    return {
        from: getFrom(m),
        to: getTo(m),
        promotion: pChar,
        flags: { isCastle: !!(m & FLAG_CASTLE), isEnPassant: !!(m & FLAG_EP) }
    };
}

self.onmessage = function(e) {
    const { fen, depth, timeLimit, requestId } = e.data;
    try {
        parseFen(fen);
        nodes = 0;
        startTime = Date.now();
        stopTime = startTime + timeLimit;
        lastReportTime = startTime;
        lastLogTime = startTime;
        currentRequestId = requestId;
        bestMoveGlobal = 0;
        bestScoreGlobal = 0;
        killerMoves.fill(0);
        history.fill(0);
        log(\`[ENGINE B] Neural + Tactician. Depth: \${depth}\`);
        for(let d=1; d<=depth; d++) {
            activeDepth = d;
            try {
                const moves = generateMoves(false);
                orderMoves(moves, bestMoveGlobal, 0); 
                let alpha = -30000, beta = 30000;
                let bestScore = -30000;
                let bestMoveLocal = 0;
                for(let m of moves) {
                    const state = makeMove(m);
                    const us = turn === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
                    const kSq = board.findIndex((x) => (x & us) && (x & 7) === TYPE_KING);
                    if(isAttacked(kSq, turn)) {
                        unmakeMove(m, state);
                        continue;
                    }
                    const score = -alphabeta(d-1, -beta, -alpha, 1);
                    unmakeMove(m, state);
                    if(score > bestScore) {
                        bestScore = score;
                        bestMoveLocal = m;
                        bestMoveGlobal = bestMoveLocal;
                        bestScoreGlobal = bestScore;
                        if(score > alpha) alpha = score;
                        self.postMessage({
                             type: 'progress',
                             depth: d,
                             score: bestScore,
                             nodes: nodes,
                             bestMove: toUIMove(bestMoveLocal),
                             requestId
                        });
                    }
                }
                if(Date.now() > stopTime) throw "Timeout";
                if(bestMoveLocal !== 0) {
                    bestMoveGlobal = bestMoveLocal;
                    bestScoreGlobal = bestScore;
                }
                if(bestScore > 28000 || bestScore < -28000) break;
            } catch(timeout) {
                if (timeout === "Timeout") log(\`[TIMEOUT] Depth \${d}\`);
                break;
            }
        }
        self.postMessage({ type: 'done', bestMove: toUIMove(bestMoveGlobal), score: bestScoreGlobal, nodes: nodes, requestId });
    } catch(err) {
        log("ERROR: " + err.message);
        self.postMessage({ type: 'done', bestMove: toUIMove(bestMoveGlobal), score: bestScoreGlobal, nodes: nodes, requestId });
    }
}
`;
