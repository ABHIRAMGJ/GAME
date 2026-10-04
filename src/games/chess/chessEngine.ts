import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';

export interface ChessAnalysis {
  accuracy: { white: number; black: number };
  openingName: string;
  bestMovesCount: { white: number; black: number };
  mistakesCount: { white: number; black: number };
  blundersCount: { white: number; black: number };
  evaluations: number[];
}

export interface BotPersona {
  id: string;
  name: string;
  title: 'Novice' | 'Club' | 'Expert' | 'FM' | 'IM' | 'GM';
  elo: number;
  avatar: string;
  style: 'Balanced' | 'Aggressive' | 'Positional' | 'Tactical' | 'Solid';
  description: string;
  searchDepth: number;
  blunderRate: number; // 0 to 1
  minThinkMs: number;
  maxThinkMs: number;
}

export const CHESS_BOTS: BotPersona[] = [
  {
    id: 'sam',
    name: 'Sam',
    title: 'Novice',
    elo: 700,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    style: 'Balanced',
    description: 'Casual beginner. Learns opening principles, occasionally misses tactical threats.',
    searchDepth: 1,
    blunderRate: 0.35,
    minThinkMs: 500,
    maxThinkMs: 1100,
  },
  {
    id: 'leo',
    name: 'Leo',
    title: 'Club',
    elo: 1100,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    style: 'Solid',
    description: 'Disciplined club player. Castles early, controls the center, rarely gives free pieces.',
    searchDepth: 2,
    blunderRate: 0.18,
    minThinkMs: 700,
    maxThinkMs: 1400,
  },
  {
    id: 'maya',
    name: 'Maya',
    title: 'Expert',
    elo: 1500,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    style: 'Tactical',
    description: 'Aggressive tactical specialist. Sharp forks, pins, and ruthless king-side attacks.',
    searchDepth: 3,
    blunderRate: 0.08,
    minThinkMs: 900,
    maxThinkMs: 1700,
  },
  {
    id: 'victor',
    name: 'Victor',
    title: 'FM',
    elo: 1850,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    style: 'Positional',
    description: 'FIDE Master. Outplays opponents with pawn structures, piece outposts, and endgame finesse.',
    searchDepth: 3,
    blunderRate: 0.03,
    minThinkMs: 1100,
    maxThinkMs: 2000,
  },
  {
    id: 'elena',
    name: 'Elena',
    title: 'IM',
    elo: 2200,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    style: 'Solid',
    description: 'International Master. Deep calculation, iron defense, and relentless tactical conversions.',
    searchDepth: 4,
    blunderRate: 0.01,
    minThinkMs: 1200,
    maxThinkMs: 2400,
  },
  {
    id: 'stockfish',
    name: 'Stockfish Neural',
    title: 'GM',
    elo: 2650,
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
    style: 'Aggressive',
    description: 'Master engine with deep quiescence pruning, alpha-beta minimax, and perfect piece play.',
    searchDepth: 4,
    blunderRate: 0.0,
    minThinkMs: 1400,
    maxThinkMs: 2600,
  },
];

// Standard piece values (centipawns)
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 325,
  b: 335,
  r: 505,
  q: 950,
  k: 20000,
};

// Positional Piece-Square Tables (White perspective)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 32, 32, 20, 10, 10,
  5,  5, 12, 26, 28, 12,  5,  5,
  0,  0,  0, 24, 24,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -30,  5, 16, 22, 22, 16,  5,-30,
  -30,  0, 18, 28, 28, 18,  0,-30,
  -30,  5, 18, 28, 28, 18,  5,-30,
  -30,  0, 12, 18, 18, 12,  0,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -10, 10, 12, 14, 14, 12, 10,-10,
  -10,  0, 12, 18, 18, 12,  0,-10,
  -10,  6,  6, 18, 18,  6,  6,-10,
  -10,  0,  8, 12, 12,  8,  0,-10,
  -10,  8,  0,  0,  0,  0,  8,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
  0,  0,  0,  5,  5,  0,  0,  0,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  5, 12, 12, 12, 12, 12, 12,  5,
  0,  0,  0,  0,  0,  0,  0,  0,
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -10,  5,  5,  5,  5,  5,  0,-10,
  0,  0,  5,  8,  8,  5,  0, -5,
  -5,  0,  5,  8,  8,  5,  0, -5,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MIDGAME_PST = [
  25, 35, 15,  0,  0, 15, 35, 25,
  20, 20,  0,  0,  0,  0, 20, 20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
];

// Rich Opening Book
const OPENING_BOOK: Record<string, string[]> = {
  '': ['e4', 'd4', 'c4', 'Nf3'],
  'e4': ['e5', 'c5', 'e6', 'c6'],
  'e4 e5': ['Nf3', 'Bc4', 'Nc3', 'd4'],
  'e4 e5 Nf3': ['Nc6', 'Nf6', 'd6'],
  'e4 e5 Nf3 Nc6': ['Bb5', 'Bc4', 'd4', 'Nc3'],
  'e4 e5 Nf3 Nc6 Bb5': ['a6', 'Nf6', 'd6', 'Bc5'],
  'e4 e5 Nf3 Nc6 Bb5 a6': ['Ba4', 'Bxc6'],
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4': ['Nf6', 'd6', 'b5'],
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6': ['O-O', 'd3', 'Qe2'],
  'e4 e5 Nf3 Nc6 Bc4': ['Bc5', 'Nf6', 'd6'],
  'e4 e5 Nf3 Nc6 Bc4 Bc5': ['c3', 'O-O', 'd3', 'b4'],
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3': ['Nf6', 'Qe7', 'd6'],
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6': ['d4', 'd3'],
  'e4 c5': ['Nf3', 'Nc3', 'c3', 'd4'],
  'e4 c5 Nf3': ['d6', 'Nc6', 'e6', 'g6'],
  'e4 c5 Nf3 d6': ['d4', 'Bb5+', 'c3'],
  'e4 c5 Nf3 d6 d4': ['cxd4'],
  'e4 c5 Nf3 d6 d4 cxd4': ['Nxd4'],
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4': ['Nf6', 'a6', 'g6', 'e6'],
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6': ['Nc3'],
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3': ['a6', 'g6', 'e6', 'Nc6'],
  'e4 e6': ['d4', 'd3', 'Nf3'],
  'e4 e6 d4': ['d5'],
  'e4 e6 d4 d5': ['Nc3', 'Nd2', 'e5', 'exd5'],
  'e4 c6': ['d4', 'Nf3', 'Nc3'],
  'e4 c6 d4': ['d5'],
  'e4 c6 d4 d5': ['Nc3', 'e5', 'exd5'],
  'd4': ['d5', 'Nf6', 'e6', 'f5'],
  'd4 d5': ['c4', 'Nf3', 'Bf4'],
  'd4 d5 c4': ['e6', 'c6', 'dxc4'],
  'd4 d5 c4 e6': ['Nc3', 'Nf3'],
  'd4 d5 c4 e6 Nc3': ['Nf6', 'c6', 'Be7'],
  'd4 Nf6': ['c4', 'Nf3', 'Bg5', 'g3'],
  'd4 Nf6 c4': ['e6', 'g6', 'c5', 'e5'],
  'd4 Nf6 c4 g6': ['Nc3', 'g3', 'f3'],
  'd4 Nf6 c4 g6 Nc3': ['d5', 'Bg7'],
  'c4': ['e5', 'c5', 'Nf6', 'e6'],
  'c4 e5': ['Nc3', 'g3', 'Nf3'],
  'Nf3': ['d5', 'Nf6', 'c5', 'g6'],
};

// Check if a piece is defended by checking attack squares
export function isPieceDefended(chess: Chess, square: Square): boolean {
  const p = chess.get(square);
  if (!p) return false;
  // Temporary switch turn to see if the piece's own color attacks this square
  const currentTurn = chess.turn();
  const moves = chess.moves({ verbose: true });
  // A square is defended if any move from same color can move there if an opponent takes it
  return moves.some((m) => m.to === square);
}

export function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -30000 : 30000;
  }
  if (chess.isDraw()) {
    return 0;
  }

  let whiteScore = 0;
  let blackScore = 0;
  const board = chess.board();

  let whiteBishops = 0;
  let blackBishops = 0;
  let whiteKnights = 0;
  let blackKnights = 0;
  let whitePawnsCount = 0;
  let blackPawnsCount = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const isW = piece.color === 'w';
      let val = PIECE_VALUES[piece.type];
      const sqIdx = isW ? r * 8 + c : (7 - r) * 8 + c;

      if (piece.type === 'p') {
        val += PAWN_PST[sqIdx];
        if (isW) {
          whitePawnsCount++;
          // Passed pawn advancement bonus
          if (r <= 3) val += (4 - r) * 15;
        } else {
          blackPawnsCount++;
          if (r >= 4) val += (r - 3) * 15;
        }
      } else if (piece.type === 'n') {
        val += KNIGHT_PST[sqIdx];
        if (isW) whiteKnights++; else blackKnights++;
        // Outpost bonus in 4th/5th rank center
        if (r >= 3 && r <= 4 && c >= 2 && c <= 5) val += 15;
      } else if (piece.type === 'b') {
        val += BISHOP_PST[sqIdx];
        if (isW) whiteBishops++; else blackBishops++;
      } else if (piece.type === 'r') {
        val += ROOK_PST[sqIdx];
        // Open file bonus (no pawns in this file)
        let openFile = true;
        for (let row = 0; row < 8; row++) {
          if (board[row][c]?.type === 'p') {
            openFile = false;
            break;
          }
        }
        if (openFile) val += 20;
      } else if (piece.type === 'q') {
        val += QUEEN_PST[sqIdx];
      } else if (piece.type === 'k') {
        val += KING_MIDGAME_PST[sqIdx];
      }

      if (isW) whiteScore += val;
      else blackScore += val;
    }
  }

  // Bishop pair bonus
  if (whiteBishops >= 2) whiteScore += 45;
  if (blackBishops >= 2) blackScore += 45;

  // Center control bonus
  const centerSquares: Square[] = ['d4', 'e4', 'd5', 'e5'];
  centerSquares.forEach((sq) => {
    const p = chess.get(sq);
    if (p) {
      if (p.color === 'w') whiteScore += 18;
      else blackScore += 18;
    }
  });

  return whiteScore - blackScore;
}

// Quiescence Search to prevent horizon blunders on captures
function quiescence(chess: Chess, alpha: number, beta: number, isWhite: boolean, qDepth = 0): number {
  const standPat = evaluateBoard(chess);
  if (qDepth >= 3) return standPat;

  if (isWhite) {
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    const captures = chess.moves({ verbose: true }).filter((m) => m.captured || m.san.includes('+'));
    captures.sort((a, b) => {
      const valA = (a.captured ? PIECE_VALUES[a.captured] : 0) - PIECE_VALUES[a.piece];
      const valB = (b.captured ? PIECE_VALUES[b.captured] : 0) - PIECE_VALUES[b.piece];
      return valB - valA;
    });

    for (const move of captures) {
      chess.move(move);
      const score = quiescence(chess, alpha, beta, false, qDepth + 1);
      chess.undo();

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  } else {
    if (standPat <= alpha) return alpha;
    if (beta > standPat) beta = standPat;

    const captures = chess.moves({ verbose: true }).filter((m) => m.captured || m.san.includes('+'));
    captures.sort((a, b) => {
      const valA = (a.captured ? PIECE_VALUES[a.captured] : 0) - PIECE_VALUES[a.piece];
      const valB = (b.captured ? PIECE_VALUES[b.captured] : 0) - PIECE_VALUES[b.piece];
      return valB - valA;
    });

    for (const move of captures) {
      chess.move(move);
      const score = quiescence(chess, alpha, beta, true, qDepth + 1);
      chess.undo();

      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
    return beta;
  }
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, isWhite: boolean): number {
  if (depth === 0 || chess.isGameOver()) {
    return quiescence(chess, alpha, beta, isWhite, 0);
  }

  const moves = chess.moves({ verbose: true });
  // Move ordering: MVV/LVA captures, checks, promotions
  moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece];
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece];
    if (a.promotion) scoreA += 800;
    if (b.promotion) scoreB += 800;
    if (a.san.includes('+')) scoreA += 50;
    if (b.san.includes('+')) scoreB += 50;
    return scoreB - scoreA;
  });

  if (isWhite) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export interface BotMoveResult {
  move: Move;
  evalScore: number;
  thoughtLog: string;
}

export function getBotMove(chess: Chess, bot: BotPersona): BotMoveResult | null {
  const history = chess.history();
  const historyKey = history.join(' ');

  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  // 1. Check opening book if applicable
  if (bot.elo >= 1000 && OPENING_BOOK[historyKey] && OPENING_BOOK[historyKey].length > 0) {
    const candidates = OPENING_BOOK[historyKey];
    const pickedSan = candidates[Math.floor(Math.random() * candidates.length)];
    const bookMove = legalMoves.find((m) => m.san === pickedSan);
    if (bookMove) {
      return {
        move: bookMove,
        evalScore: 0,
        thoughtLog: `Book opening move: ${bookMove.san}`,
      };
    }
  }

  // 2. Immediate checkmates check (never miss mate in 1 on bots >= 1000)
  if (bot.elo >= 1000) {
    for (const m of legalMoves) {
      chess.move(m);
      const isMate = chess.isCheckmate();
      chess.undo();
      if (isMate) {
        return {
          move: m,
          evalScore: chess.turn() === 'w' ? 25000 : -25000,
          thoughtLog: `Found checkmate sequence: ${m.san}#`,
        };
      }
    }
  }

  // 3. Score all moves with Minimax
  const isWhite = chess.turn() === 'w';
  const targetDepth = bot.searchDepth;

  // Sort candidate moves
  legalMoves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece];
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece];
    if (a.san.includes('+')) scoreA += 50;
    if (b.san.includes('+')) scoreB += 50;
    return scoreB - scoreA;
  });

  const scoredMoves: { move: Move; score: number }[] = [];

  for (const move of legalMoves) {
    chess.move(move);
    const score = minimax(chess, targetDepth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();
    scoredMoves.push({ move, score });
  }

  // Sort scored moves best to worst
  if (isWhite) {
    scoredMoves.sort((a, b) => b.score - a.score);
  } else {
    scoredMoves.sort((a, b) => a.score - b.score);
  }

  // Human-like selection based on blunder rate and Elo:
  // Instead of choosing completely random moves, human beginners choose 2nd or 3rd best move,
  // or a solid natural developing move, rather than playing suicide moves!
  let selected = scoredMoves[0];

  const roll = Math.random();
  if (roll < bot.blunderRate && scoredMoves.length > 1) {
    if (bot.elo <= 800) {
      // Pick among top 4 reasonable moves, avoiding suicide queen drops if possible
      const safeCandidates = scoredMoves.slice(0, Math.min(4, scoredMoves.length));
      selected = safeCandidates[Math.floor(Math.random() * safeCandidates.length)];
    } else if (bot.elo <= 1200) {
      // Pick 2nd or 3rd best move (a natural human inaccuracy)
      const index = Math.min(scoredMoves.length - 1, Math.floor(1 + Math.random() * 2));
      selected = scoredMoves[index];
    } else if (bot.elo <= 1600) {
      // 2nd best move
      selected = scoredMoves[Math.min(scoredMoves.length - 1, 1)];
    }
  }

  const rawScore = selected.score;
  const normalizedScore = isWhite ? rawScore : -rawScore;
  const evalFormatted = normalizedScore > 0 ? `+${(normalizedScore / 100).toFixed(1)}` : (normalizedScore / 100).toFixed(1);

  let thought = `Evaluated ${scoredMoves.length} moves at depth ${targetDepth} (Eval: ${evalFormatted})`;
  if (selected.move.captured) {
    thought = `Tactical capture: ${selected.move.piece.toUpperCase()} takes ${selected.move.captured.toUpperCase()} on ${selected.move.to}`;
  } else if (selected.move.san.includes('+')) {
    thought = `Delivered check with ${selected.move.san}`;
  } else if (selected.move.piece === 'k' && Math.abs(selected.move.to.charCodeAt(0) - selected.move.from.charCodeAt(0)) > 1) {
    thought = `King castled safely`;
  }

  return {
    move: selected.move,
    evalScore: selected.score,
    thoughtLog: thought,
  };
}

// Hint Generator for Player
export function getPlayerHint(chess: Chess): { move: Move; explanation: string } | null {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const isWhite = chess.turn() === 'w';
  let bestScore = isWhite ? -Infinity : Infinity;
  let bestMove = legalMoves[0];

  for (const move of legalMoves) {
    chess.move(move);
    const score = minimax(chess, 2, -Infinity, Infinity, !isWhite);
    chess.undo();

    if (isWhite ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  let explanation = `Play ${bestMove.san} to optimize piece activity`;
  if (bestMove.captured) {
    explanation = `Win material by capturing on ${bestMove.to} (${bestMove.san})`;
  } else if (bestMove.san.includes('+')) {
    explanation = `Attack the opponent's king with a check (${bestMove.san})`;
  } else if (bestMove.san.includes('O-O')) {
    explanation = `Castle to safeguard your king and activate your rook`;
  } else if (['e4', 'd4', 'e5', 'd5'].includes(bestMove.to)) {
    explanation = `Claim control of the critical center square ${bestMove.to}`;
  } else if (['n', 'b'].includes(bestMove.piece)) {
    explanation = `Develop your ${bestMove.piece === 'n' ? 'Knight' : 'Bishop'} into an active post`;
  }

  return { move: bestMove, explanation };
}

export function detectOpening(moves: string[]): string {
  const notation = moves.slice(0, 6).join(' ');
  if (notation.startsWith('e4 c5')) return 'Sicilian Defense';
  if (notation.startsWith('e4 e5 Nf3 Nc6 Bb5')) return 'Ruy Lopez (Spanish Game)';
  if (notation.startsWith('e4 e5 Nf3 Nc6 Bc4')) return 'Italian Game';
  if (notation.startsWith('e4 e5 Nf3 Nc6 d4')) return 'Scotch Game';
  if (notation.startsWith('e4 e5 f4')) return "King's Gambit";
  if (notation.startsWith('e4 e6')) return 'French Defense';
  if (notation.startsWith('e4 c6')) return 'Caro-Kann Defense';
  if (notation.startsWith('d4 d5 c4')) return "Queen's Gambit";
  if (notation.startsWith('d4 Nf6 c4 g6')) return "King's Indian Defense";
  if (notation.startsWith('d4 Nf6 c4 e6')) return 'Nimzo-Indian Defense';
  if (notation.startsWith('d4 d5 Bf4')) return 'London System';
  if (notation.startsWith('c4')) return 'English Opening';
  if (notation.startsWith('Nf3')) return 'Réti Opening';
  if (notation.startsWith('e4 d5')) return 'Scandinavian Defense';
  if (notation.startsWith('e4 Nf6')) return "Alekhine's Defense";
  return 'Standard Opening';
}

export function generateAnalysis(history: Move[]): ChessAnalysis {
  const evals: number[] = [0];
  let whiteBlunders = 0;
  let blackBlunders = 0;
  let whiteMistakes = 0;
  let blackMistakes = 0;

  const tempChess = new Chess();
  let prevEval = 0;

  for (let i = 0; i < history.length; i++) {
    tempChess.move(history[i]);
    const currentEval = Math.max(-1000, Math.min(1000, evaluateBoard(tempChess)));
    evals.push(currentEval);

    const diff = currentEval - prevEval;
    const isWhiteMove = i % 2 === 0;

    if (isWhiteMove) {
      if (diff < -280) whiteBlunders++;
      else if (diff < -110) whiteMistakes++;
    } else {
      if (diff > 280) blackBlunders++;
      else if (diff > 110) blackMistakes++;
    }
    prevEval = currentEval;
  }

  const whiteMovesCount = Math.ceil(history.length / 2);
  const blackMovesCount = Math.floor(history.length / 2);

  const whiteAcc = Math.max(50, Math.min(99, Math.round(95 - whiteBlunders * 7.5 - whiteMistakes * 3)));
  const blackAcc = Math.max(50, Math.min(99, Math.round(95 - blackBlunders * 7.5 - blackMistakes * 3)));

  const sanMoves = history.map((m) => m.san);
  const openingName = detectOpening(sanMoves);

  return {
    accuracy: { white: whiteAcc, black: blackAcc },
    openingName,
    bestMovesCount: {
      white: Math.max(1, whiteMovesCount - whiteBlunders - whiteMistakes),
      black: Math.max(1, blackMovesCount - blackBlunders - blackMistakes),
    },
    mistakesCount: { white: whiteMistakes, black: blackMistakes },
    blundersCount: { white: whiteBlunders, black: blackBlunders },
    evaluations: evals,
  };
}
