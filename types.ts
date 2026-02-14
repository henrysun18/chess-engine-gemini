
export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  color: PieceColor;
  type: PieceType;
}

export type BoardState = (Piece | null)[];

export interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured?: Piece | null;
  promotion?: PieceType;
  flags?: {
    isCastle?: boolean;
    isEnPassant?: boolean;
    isPawnDouble?: boolean;
  };
}

export interface GameState {
  board: BoardState;
  turn: PieceColor;
  castling: {
    w: { k: boolean; q: boolean };
    b: { k: boolean; q: boolean };
  };
  enPassantTarget: number | null; // Square index or null
  halfMoveClock: number;
  fullMoveNumber: number;
  history: Move[];
  isGameOver: boolean;
  winner: PieceColor | 'draw' | null;
}

export interface EngineConfig {
  engineId: 'A' | 'B'; // 'A' = Classic (PeSTO), 'B' = Neural (NNUE-like + NMP)
  depth: number;
  timeLimit: number; // Time limit in milliseconds
  branchingFactor: number; // Used only if useDynamicBranching is false
  useDynamicBranching: boolean;
}

export interface EngineResult {
  bestMove: Move | null;
  evaluation: number;
  nodesSearched: number;
  currentDepth: number; // Current iterative deepening depth
  isThinking: boolean;
  pv: string[]; // Principal Variation
  logs: string[]; // Debug logs from worker
}
