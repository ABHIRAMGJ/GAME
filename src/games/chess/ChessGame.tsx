import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import {
  CHESS_BOTS,
  BotPersona,
  getBotMove,
  getPlayerHint,
  generateAnalysis,
  evaluateBoard,
  ChessAnalysis,
} from './chessEngine.ts';
import { PIECE_COMPONENTS } from './ChessPieces.tsx';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RefreshCw,
  Flag,
  Download,
  Bot,
  User as UserIcon,
  RotateCcw,
  Sparkles,
  Palette,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BrainCircuit,
  Lightbulb,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  Zap,
  Copy,
  Clock,
  Swords,
  Layers,
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
} from 'lucide-react';

interface ChessGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

type BoardTheme = 'green' | 'walnut' | 'obsidian' | 'sapphire' | 'emerald';

interface ThemeConfig {
  name: string;
  light: string;
  dark: string;
  lastMoveLight: string;
  lastMoveDark: string;
  selectedLight: string;
  selectedDark: string;
  border: string;
}

const BOARD_THEMES: Record<BoardTheme, ThemeConfig> = {
  green: {
    name: 'Tournament Olive',
    light: '#ecefd6',
    dark: '#739552',
    lastMoveLight: '#f6f792',
    lastMoveDark: '#baca44',
    selectedLight: '#f6eb7c',
    selectedDark: '#cddb4d',
    border: '#4a6530',
  },
  walnut: {
    name: 'Classic Walnut',
    light: '#f0d9b5',
    dark: '#b58863',
    lastMoveLight: '#f7ec96',
    lastMoveDark: '#d1a477',
    selectedLight: '#f5e38a',
    selectedDark: '#cfa276',
    border: '#6f4e37',
  },
  obsidian: {
    name: 'Midnight Obsidian',
    light: '#cbd5e1',
    dark: '#334155',
    lastMoveLight: '#6ee7b7',
    lastMoveDark: '#047857',
    selectedLight: '#93c5fd',
    selectedDark: '#1e40af',
    border: '#0f172a',
  },
  sapphire: {
    name: 'Royal Sapphire',
    light: '#e0f2fe',
    dark: '#0284c7',
    lastMoveLight: '#bae6fd',
    lastMoveDark: '#0369a1',
    selectedLight: '#7dd3fc',
    selectedDark: '#075985',
    border: '#0c4a6e',
  },
  emerald: {
    name: 'Emerald Luxury',
    light: '#f1f5f9',
    dark: '#0f766e',
    lastMoveLight: '#a7f3d0',
    lastMoveDark: '#047857',
    selectedLight: '#6ee7b7',
    selectedDark: '#065f46',
    border: '#134e4a',
  },
};

interface AnimatingPiece {
  from: Square;
  to: Square;
  piece: PieceSymbol;
  color: Color;
  deltaX: number;
  deltaY: number;
}

export const ChessGame: React.FC<ChessGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  // Core Game State
  const [game, setGame] = useState(() => new Chess());
  const [board, setBoard] = useState(() => game.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [theme, setTheme] = useState<BoardTheme>('green');

  // Smooth Movement Animation state
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Bot & Match State
  const [isBotMode, setIsBotMode] = useState(!isMultiplayer);
  const [selectedBot, setSelectedBot] = useState<BotPersona>(CHESS_BOTS[1]); // Leo (Club)
  const [showBotModal, setShowBotModal] = useState(false);
  const [botThought, setBotThought] = useState<string>('Ready for the opening moves.');
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Board Orientation & Hints
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [coachHint, setCoachHint] = useState<{ move: Move; explanation: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Move History Scrubber (Interactive playback)
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [viewingPlyIndex, setViewingPlyIndex] = useState<number | null>(null);

  // Clocks
  const [timeControl, setTimeControl] = useState<number>(300); // 5 min default, 0 for untimed
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);

  // Status & Analysis
  const [isGameActive, setIsGameActive] = useState(true);
  const [gameResult, setGameResult] = useState<{ winner: 'w' | 'b' | 'draw' | null; reason: string } | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);
  const [analysis, setAnalysis] = useState<ChessAnalysis | null>(null);
  const [copiedFEN, setCopiedFEN] = useState(false);

  // Drag & drop state
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);

  // Board Fit and Fullscreen State
  const [boardFitMode, setBoardFitMode] = useState<'fit' | 'full'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chessArenaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!chessArenaRef.current) return;
    if (!document.fullscreenElement) {
      chessArenaRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Sound wrapper
  const playSfx = useCallback((type: 'move' | 'capture' | 'check' | 'castle' | 'notify') => {
    if (!soundEnabled) return;
    if (type === 'move') sounds.playMove();
    else if (type === 'capture') sounds.playCapture();
    else if (type === 'check') sounds.playCheck();
    else if (type === 'castle') sounds.playCastle();
    else if (type === 'notify') sounds.playNotify();
  }, [soundEnabled]);

  // Centipawn evaluation (-10 to +10)
  const evalScore = useMemo(() => {
    const raw = evaluateBoard(game);
    return Math.max(-10, Math.min(10, raw / 100));
  }, [board, game]);

  // Material evaluation and captured pieces
  const capturedPieces = useMemo(() => {
    const whiteCaptured: PieceSymbol[] = [];
    const blackCaptured: PieceSymbol[] = [];
    const initialCounts: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
    const currentCounts: { w: Record<PieceSymbol, number>; b: Record<PieceSymbol, number> } = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) currentCounts[p.color][p.type]++;
      }
    }

    (['q', 'r', 'b', 'n', 'p'] as PieceSymbol[]).forEach((type) => {
      const wDiff = initialCounts[type] - currentCounts.w[type];
      const bDiff = initialCounts[type] - currentCounts.b[type];
      for (let i = 0; i < wDiff; i++) blackCaptured.push(type);
      for (let i = 0; i < bDiff; i++) whiteCaptured.push(type);
    });

    const values: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const wScore = whiteCaptured.reduce((sum, p) => sum + values[p], 0);
    const bScore = blackCaptured.reduce((sum, p) => sum + values[p], 0);

    return {
      whiteCaptured,
      blackCaptured,
      diff: wScore - bScore,
    };
  }, [board]);

  // Set colors in multiplayer
  useEffect(() => {
    if (isMultiplayer && currentRoom) {
      const col = isHost ? 'w' : 'b';
      setPlayerColor(col);
      setBoardFlipped(col === 'b');
      setIsBotMode(false);
    }
  }, [isMultiplayer, currentRoom, isHost]);

  // Clocks countdown
  useEffect(() => {
    if (!isGameActive || timeControl === 0) return;

    clockIntervalRef.current = setInterval(() => {
      if (game.turn() === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleGameOver('b', 'Time Out — Black wins on time');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleGameOver('w', 'Time Out — White wins on time');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    };
  }, [isGameActive, game.turn(), timeControl]);

  // Multiplayer socket listener
  useEffect(() => {
    if (!isMultiplayer) return;

    const cleanup = onGameAction(({ action, data }) => {
      if (action === 'chess_move') {
        try {
          performAnimatedMove(data.move.from, data.move.to, data.move.promotion, false);
        } catch (e) {
          console.error('Invalid move received:', e);
        }
      } else if (action === 'chess_resign') {
        handleGameOver(data.resignerColor === 'w' ? 'b' : 'w', 'Resignation');
      } else if (action === 'chess_rematch') {
        handleRestart();
      }
    });

    return cleanup;
  }, [isMultiplayer, game]);

  // Human-like Bot Think & Play
  useEffect(() => {
    if (isBotMode && isGameActive && game.turn() !== playerColor && !isAnimating) {
      setIsBotThinking(true);
      setBotThought(`${selectedBot.name} is evaluating the board...`);

      // Dynamic thinking delay based on bot persona
      const thinkMs =
        selectedBot.minThinkMs + Math.random() * (selectedBot.maxThinkMs - selectedBot.minThinkMs);

      const timer = setTimeout(() => {
        const botResult = getBotMove(game, selectedBot);
        if (botResult) {
          setBotThought(botResult.thoughtLog);
          performAnimatedMove(
            botResult.move.from as Square,
            botResult.move.to as Square,
            botResult.move.promotion as PieceSymbol,
            false
          );
        }
        setIsBotThinking(false);
      }, thinkMs);

      return () => clearTimeout(timer);
    }
  }, [isBotMode, isGameActive, game.turn(), playerColor, selectedBot, isAnimating]);

  // File and rank coordinate calculation for smooth translation animation
  const getSquareCoords = (sq: Square, flipped: boolean) => {
    const f = sq.charCodeAt(0) - 97; // 0 for 'a' to 7 for 'h'
    const r = parseInt(sq[1], 10) - 1; // 0 for '1' to 7 for '8'
    const col = flipped ? 7 - f : f;
    const row = flipped ? r : 7 - r;
    return { col, row };
  };

  // Perform move with buttery-smooth sliding animation
  const performAnimatedMove = (
    from: Square,
    to: Square,
    promotion?: PieceSymbol,
    isLocalPlayer: boolean = true
  ) => {
    if (isAnimating) return;

    const piece = game.get(from);
    if (!piece) return;

    // Reset coach hint if active
    setCoachHint(null);

    // Compute coordinate delta for CSS translation
    const fromCoord = getSquareCoords(from, boardFlipped);
    const toCoord = getSquareCoords(to, boardFlipped);
    const deltaX = (toCoord.col - fromCoord.col) * 100;
    const deltaY = (toCoord.row - fromCoord.row) * 100;

    setIsAnimating(true);
    setAnimatingPiece({
      from,
      to,
      piece: piece.type,
      color: piece.color,
      deltaX,
      deltaY,
    });

    // Animate for 160ms, then commit move to chess.js state
    setTimeout(() => {
      try {
        const isCastle =
          piece.type === 'k' && Math.abs(to.charCodeAt(0) - from.charCodeAt(0)) > 1;
        const targetPiece = game.get(to);
        const isCapture = !!targetPiece || (piece.type === 'p' && from[0] !== to[0]);

        const move = game.move({ from, to, promotion: promotion || 'q' });

        if (move) {
          setBoard(game.board());
          setSelectedSquare(null);
          setValidMoves([]);
          setLastMove({ from, to });
          const newHist = [...game.history({ verbose: true })];
          setMoveHistory(newHist);
          setViewingPlyIndex(null); // return to live view

          // Audio triggers
          if (game.inCheck()) {
            playSfx('check');
          } else if (isCastle) {
            playSfx('castle');
          } else if (isCapture) {
            playSfx('capture');
          } else {
            playSfx('move');
          }

          if (isMultiplayer && isLocalPlayer) {
            sendGameAction('chess_move', { move: { from, to, promotion: promotion || 'q' } });
          }

          checkGameStatus();
        }
      } catch (err) {
        console.error('Move execution failed:', err);
      } finally {
        setAnimatingPiece(null);
        setIsAnimating(false);
      }
    }, 160);
  };

  // Square Click Interaction
  const handleSquareClick = (square: Square) => {
    if (!isGameActive || isAnimating) return;
    if (isBotMode && game.turn() !== playerColor) return;
    if (isMultiplayer && game.turn() !== playerColor) return;

    // If viewing past history, click returns to current board
    if (viewingPlyIndex !== null) {
      setViewingPlyIndex(null);
      return;
    }

    const piece = game.get(square);

    // If a square is already selected
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }

      // Check if move is legal
      const legal = validMoves.find((m) => m.to === square);
      if (legal) {
        const movingPiece = game.get(selectedSquare);
        // Pawn promotion check
        if (movingPiece?.type === 'p' && (square.endsWith('8') || square.endsWith('1'))) {
          setPromotionPending({ from: selectedSquare, to: square });
          return;
        }

        performAnimatedMove(selectedSquare, square, undefined, true);
        return;
      }
    }

    // Select new piece
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      setValidMoves(moves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (!isGameActive || isAnimating || game.turn() !== playerColor) {
      e.preventDefault();
      return;
    }
    const piece = game.get(square);
    if (!piece || piece.color !== game.turn()) {
      e.preventDefault();
      return;
    }

    setDraggedSquare(square);
    setSelectedSquare(square);
    const moves = game.moves({ square, verbose: true });
    setValidMoves(moves);
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquare: Square) => {
    e.preventDefault();
    const fromSquare = (e.dataTransfer.getData('text/plain') as Square) || draggedSquare;
    setDraggedSquare(null);

    if (!fromSquare || fromSquare === targetSquare) return;

    const legal = validMoves.find((m) => m.to === targetSquare);
    if (legal) {
      const movingPiece = game.get(fromSquare);
      if (movingPiece?.type === 'p' && (targetSquare.endsWith('8') || targetSquare.endsWith('1'))) {
        setPromotionPending({ from: fromSquare, to: targetSquare });
        return;
      }
      performAnimatedMove(fromSquare, targetSquare, undefined, true);
    }
  };

  const checkGameStatus = () => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'b' : 'w';
      handleGameOver(winner, 'Checkmate');
    } else if (game.isStalemate()) {
      handleGameOver('draw', 'Stalemate — No legal moves');
    } else if (game.isThreefoldRepetition()) {
      handleGameOver('draw', 'Draw by Threefold Repetition');
    } else if (game.isInsufficientMaterial()) {
      handleGameOver('draw', 'Draw by Insufficient Material');
    } else if (game.isDraw()) {
      handleGameOver('draw', 'Draw by 50-move rule');
    }
  };

  const handleGameOver = async (winner: 'w' | 'b' | 'draw', reason: string) => {
    setIsGameActive(false);
    setGameResult({ winner, reason });

    const isUserWin = winner === playerColor;
    const isUserLoss = winner !== 'draw' && winner !== playerColor;

    if (isUserWin) {
      sounds.playSuccess();
      confetti({ particleCount: 110, spread: 80, origin: { y: 0.55 } });
    }

    const hist = game.history({ verbose: true });
    const fullAnalysis = generateAnalysis(hist);
    setAnalysis(fullAnalysis);

    try {
      await api.recordMatch({
        gameId: 'chess',
        opponentId: isMultiplayer ? currentRoom?.guestId || 'guest' : selectedBot.id,
        opponentName: isMultiplayer
          ? isHost
            ? currentRoom?.guestName
            : currentRoom?.hostName
          : `${selectedBot.name} (${selectedBot.title})`,
        isBot: isBotMode,
        result: isUserWin ? 'win' : isUserLoss ? 'loss' : 'draw',
        userScore: isUserWin ? 1 : 0,
        opponentScore: isUserLoss ? 1 : 0,
        durationSeconds:
          timeControl > 0 ? timeControl - (playerColor === 'w' ? whiteTime : blackTime) : 120,
        replayData: { pgn: game.pgn(), fen: game.fen() },
      });
    } catch (e) {
      console.error('Could not record match:', e);
    }
  };

  // Takeback (Undo Move) in Bot Mode
  const handleTakeback = () => {
    if (!isBotMode || !isGameActive || moveHistory.length === 0 || isAnimating) return;

    // Undo bot's last move and player's move
    const undoCount = game.turn() === playerColor ? 2 : 1;
    for (let i = 0; i < undoCount; i++) {
      game.undo();
    }

    setBoard(game.board());
    setSelectedSquare(null);
    setValidMoves([]);
    const updatedHistory = [...game.history({ verbose: true })];
    setMoveHistory(updatedHistory);
    const last = updatedHistory[updatedHistory.length - 1];
    setLastMove(last ? { from: last.from as Square, to: last.to as Square } : null);
    setCoachHint(null);
    playSfx('notify');
  };

  // Coach Hint Generator
  const handleRequestHint = () => {
    if (!isGameActive || game.turn() !== playerColor) return;
    const hint = getPlayerHint(game);
    if (hint) {
      setCoachHint(hint);
      setSelectedSquare(hint.move.from as Square);
      setValidMoves(game.moves({ square: hint.move.from as Square, verbose: true }));
      playSfx('notify');
    }
  };

  const handleResign = () => {
    if (!isGameActive) return;
    const winner = playerColor === 'w' ? 'b' : 'w';
    if (isMultiplayer) {
      sendGameAction('chess_resign', { resignerColor: playerColor });
    }
    handleGameOver(winner, 'Resignation');
  };

  const handleRestart = () => {
    const newG = new Chess();
    setGame(newG);
    setBoard(newG.board());
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setViewingPlyIndex(null);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setIsGameActive(true);
    setGameResult(null);
    setAnalysis(null);
    setCoachHint(null);
    setIsBotThinking(false);
    setBotThought(`${selectedBot.name} is ready. Your move!`);

    if (isMultiplayer) {
      sendGameAction('chess_rematch', {});
    }
  };

  const handleCopyFEN = () => {
    navigator.clipboard.writeText(game.fen());
    setCopiedFEN(true);
    setTimeout(() => setCopiedFEN(false), 2000);
  };

  const exportPGN = () => {
    const element = document.createElement('a');
    const file = new Blob([game.pgn()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `chess_arena_${Date.now()}.pgn`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatTime = (secs: number) => {
    if (secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Inspect history position without mutating live game
  const displayedBoard = useMemo(() => {
    if (viewingPlyIndex === null) return board;

    const tempChess = new Chess();
    for (let i = 0; i <= viewingPlyIndex; i++) {
      if (moveHistory[i]) tempChess.move(moveHistory[i]);
    }
    return tempChess.board();
  }, [viewingPlyIndex, board, moveHistory]);

  const activeTheme = BOARD_THEMES[theme];
  const files = boardFlipped
    ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
    : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = boardFlipped
    ? [1, 2, 3, 4, 5, 6, 7, 8]
    : [8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <div
      ref={chessArenaRef}
      className={`h-full w-full max-h-[calc(100vh-68px)] flex flex-col lg:flex-row gap-3 lg:gap-5 mx-auto items-center justify-center overflow-hidden transition-all ${
        isFullscreen
          ? 'bg-[#07090e] p-2 sm:p-4 min-h-screen'
          : 'max-w-7xl p-1 sm:p-2'
      }`}
    >
      {/* LEFT COLUMN: The Master Chessboard with Clocks, Captured Rack & Deliberation HUD */}
      <div
        style={{
          width: '100%',
          maxWidth:
            boardFitMode === 'fit'
              ? 'min(100%, calc(100vh - 170px))'
              : 'min(100%, 820px)',
        }}
        className="flex flex-col items-center justify-center select-none transition-all duration-200"
      >
        {/* Opponent Card & Clock */}
        <div className="w-full flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-t-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={
                  isBotMode
                    ? selectedBot.avatar
                    : isHost
                    ? 'https://api.dicebear.com/7.x/bottts/svg?seed=guest'
                    : 'https://api.dicebear.com/7.x/bottts/svg?seed=host'
                }
                alt="Opponent"
                className="w-11 h-11 rounded-xl object-cover border-2 border-indigo-500/50 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 text-[9px] font-black rounded bg-indigo-600 text-white font-mono uppercase">
                {isBotMode ? selectedBot.title : 'P2'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">
                  {isBotMode
                    ? selectedBot.name
                    : isHost
                    ? currentRoom?.guestName || 'Opponent'
                    : currentRoom?.hostName}
                </span>
                <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-950/70 px-1.5 py-0.5 rounded border border-indigo-800/40">
                  {isBotMode ? selectedBot.elo : 1350}
                </span>
                {isBotMode && (
                  <button
                    onClick={() => setShowBotModal(true)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold ml-1 cursor-pointer"
                  >
                    Change Bot
                  </button>
                )}
              </div>

              {/* Opponent Captured Rack */}
              <div className="flex items-center gap-1 mt-1 min-h-[16px]">
                {capturedPieces.blackCaptured.map((p, i) => (
                  <span
                    key={i}
                    className="text-[11px] leading-none font-bold uppercase text-slate-300 bg-slate-800 px-1 py-0.5 rounded"
                  >
                    {p}
                  </span>
                ))}
                {capturedPieces.diff < 0 && (
                  <span className="text-[11px] text-emerald-400 font-mono font-bold ml-1">
                    +{Math.abs(capturedPieces.diff)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clock Display */}
          {timeControl > 0 && (
            <div
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-lg font-black border transition-all ${
                game.turn() === (playerColor === 'w' ? 'b' : 'w')
                  ? (playerColor === 'w' ? blackTime : whiteTime) <= 30
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500 shadow-lg shadow-rose-500/20 animate-pulse'
                    : 'bg-amber-950/50 text-amber-300 border-amber-500/50 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 text-slate-400" />
              {formatTime(playerColor === 'w' ? blackTime : whiteTime)}
            </div>
          )}
        </div>

        {/* Bot Deliberation HUD (Active when Bot is Thinking) */}
        {isBotMode && (
          <div className="w-full bg-slate-950/95 border-x border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-slate-300 transition-all">
            <div className="flex items-center gap-2 truncate">
              {isBotThinking ? (
                <BrainCircuit className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              )}
              <span className="truncate italic text-slate-300 text-[11px]">{botThought}</span>
            </div>
            {isBotThinking && (
              <span className="text-[10px] text-amber-400 font-mono font-bold tracking-wider uppercase animate-pulse flex-shrink-0">
                Depth {selectedBot.searchDepth}
              </span>
            )}
          </div>
        )}

        {/* Board Canvas with Real-Time Evaluation Bar */}
        <div className="flex w-full items-stretch relative">
          {/* Real-time Vertical Evaluation Bar */}
          <div
            className="w-4 bg-slate-950 border-y border-l border-slate-800 flex flex-col justify-between overflow-hidden relative"
            title={`Eval: ${evalScore > 0 ? `+${evalScore.toFixed(1)}` : evalScore.toFixed(1)}`}
          >
            {/* White Advantage Percentage */}
            <div
              className="w-full bg-slate-100 transition-all duration-300 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"
              style={{
                height: `${Math.max(
                  4,
                  Math.min(96, boardFlipped ? 50 - evalScore * 5 : 50 + evalScore * 5)
                )}%`,
              }}
            />
            {/* Black Advantage Percentage */}
            <div className="w-full bg-slate-800 transition-all duration-300 flex-1" />
          </div>

          {/* CHESSBOARD GRID */}
          <div
            ref={boardContainerRef}
            className="relative flex-1 aspect-square select-none shadow-2xl border border-slate-800 overflow-hidden bg-slate-950"
          >
            <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
              {ranks.map((r, rowIdx) =>
                files.map((f, colIdx) => {
                  const sq = `${f}${r}` as Square;
                  const isLight = (rowIdx + colIdx) % 2 === 0;
                  const piece = displayedBoard[rowIdx][colIdx];
                  const isSelected = selectedSquare === sq;
                  const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
                  const isLegalTarget = validMoves.some((m) => m.to === sq);
                  const isCheck = piece?.type === 'k' && piece.color === game.turn() && game.inCheck();
                  const isCoachBestFrom = coachHint?.move.from === sq;
                  const isCoachBestTo = coachHint?.move.to === sq;

                  // Piece SVG component
                  const PieceComponent = piece
                    ? PIECE_COMPONENTS[`${piece.color}${piece.type.toUpperCase()}`]
                    : null;

                  // Dynamic tile background
                  let tileColor = isLight ? activeTheme.light : activeTheme.dark;
                  if (isSelected) {
                    tileColor = isLight ? activeTheme.selectedLight : activeTheme.selectedDark;
                  } else if (isLastMove) {
                    tileColor = isLight ? activeTheme.lastMoveLight : activeTheme.lastMoveDark;
                  }

                  return (
                    <div
                      key={sq}
                      onClick={() => handleSquareClick(sq)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, sq)}
                      style={{ backgroundColor: tileColor }}
                      className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                        isCheck ? '!bg-rose-600/80 ring-4 ring-rose-500 ring-inset animate-pulse' : ''
                      } ${isCoachBestFrom ? 'ring-2 ring-amber-400 ring-inset' : ''} ${
                        isCoachBestTo ? 'ring-2 ring-emerald-400 ring-inset' : ''
                      }`}
                    >
                      {/* Rank Label (leftmost col) */}
                      {colIdx === 0 && (
                        <span
                          style={{ color: isLight ? activeTheme.dark : activeTheme.light }}
                          className="absolute top-1 left-1.5 text-[11px] font-black select-none leading-none opacity-80"
                        >
                          {r}
                        </span>
                      )}

                      {/* File Label (bottommost row) */}
                      {rowIdx === 7 && (
                        <span
                          style={{ color: isLight ? activeTheme.dark : activeTheme.light }}
                          className="absolute bottom-1 right-1.5 text-[11px] font-black select-none leading-none opacity-80"
                        >
                          {f}
                        </span>
                      )}

                      {/* Legal Move Indicators */}
                      {isLegalTarget && (
                        <div
                          className={`absolute pointer-events-none z-10 transition-transform ${
                            piece
                              ? 'w-full h-full ring-4 ring-rose-500/60 ring-inset rounded-lg'
                              : 'w-4 h-4 rounded-full bg-slate-900/30 dark:bg-white/30 backdrop-blur-xs shadow-inner'
                          }`}
                        />
                      )}

                      {/* Coach Hint Glowing Target Marker */}
                      {isCoachBestTo && (
                        <div className="absolute w-5 h-5 rounded-full border-2 border-emerald-400 bg-emerald-400/20 pointer-events-none animate-ping z-10" />
                      )}

                      {/* Piece Vector Icon with Subtle Hover & Grab Styles */}
                      {PieceComponent && (
                        <div
                          draggable={
                            isGameActive &&
                            !isAnimating &&
                            game.turn() === playerColor &&
                            piece?.color === playerColor
                          }
                          onDragStart={(e) => handleDragStart(e, sq)}
                          className="w-[88%] h-[88%] z-20 flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-transform"
                        >
                          <PieceComponent className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Smooth Gliding Piece Animation Overlay */}
            {animatingPiece && (
              <div
                style={{
                  position: 'absolute',
                  width: '12.5%',
                  height: '12.5%',
                  left: `${getSquareCoords(animatingPiece.from, boardFlipped).col * 12.5}%`,
                  top: `${getSquareCoords(animatingPiece.from, boardFlipped).row * 12.5}%`,
                  transform: `translate3d(${animatingPiece.deltaX}%, ${animatingPiece.deltaY}%, 0)`,
                  transition: 'transform 160ms cubic-bezier(0.2, 0.9, 0.3, 1)',
                  zIndex: 50,
                  pointerEvents: 'none',
                }}
                className="flex items-center justify-center"
              >
                {(() => {
                  const AnimPiece =
                    PIECE_COMPONENTS[`${animatingPiece.color}${animatingPiece.piece.toUpperCase()}`];
                  return AnimPiece ? (
                    <AnimPiece className="w-[88%] h-[88%] drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] scale-110" />
                  ) : null;
                })()}
              </div>
            )}

            {/* Pawn Promotion Dialog */}
            {promotionPending && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-40 animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl flex gap-3 shadow-2xl">
                  {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((pType) => {
                    const Comp = PIECE_COMPONENTS[`${playerColor}${pType.toUpperCase()}`];
                    return (
                      <button
                        key={pType}
                        onClick={() => {
                          performAnimatedMove(
                            promotionPending.from,
                            promotionPending.to,
                            pType,
                            true
                          );
                          setPromotionPending(null);
                        }}
                        className="w-16 h-16 bg-slate-800 hover:bg-slate-700 rounded-xl p-2 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 border border-slate-600 cursor-pointer shadow-lg"
                      >
                        <Comp className="w-full h-full drop-shadow-md" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Card & Clock */}
        <div className="w-full flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-b-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
              alt="You"
              className="w-11 h-11 rounded-xl object-cover border-2 border-emerald-500/50 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">
                  {user?.fullName || user?.username || 'You'}
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  {user?.ratings.chess || 1200}
                </span>
              </div>

              {/* User Captured Rack */}
              <div className="flex items-center gap-1 mt-1 min-h-[16px]">
                {capturedPieces.whiteCaptured.map((p, i) => (
                  <span
                    key={i}
                    className="text-[11px] leading-none font-bold uppercase text-slate-300 bg-slate-800 px-1 py-0.5 rounded"
                  >
                    {p}
                  </span>
                ))}
                {capturedPieces.diff > 0 && (
                  <span className="text-[11px] text-emerald-400 font-mono font-bold ml-1">
                    +{capturedPieces.diff}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User Clock */}
          {timeControl > 0 && (
            <div
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-lg font-black border transition-all ${
                game.turn() === playerColor
                  ? (playerColor === 'w' ? whiteTime : blackTime) <= 30
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500 shadow-lg shadow-rose-500/20 animate-pulse'
                    : 'bg-amber-950/50 text-amber-300 border-amber-500/50 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 text-slate-400" />
              {formatTime(playerColor === 'w' ? whiteTime : blackTime)}
            </div>
          )}
        </div>

        {/* In-Game Interactive Quick Toolbar */}
        <div className="w-full flex items-center justify-between gap-2 mt-3 px-1">
          <div className="flex items-center gap-1.5">
            {isBotMode && (
              <button
                onClick={handleTakeback}
                disabled={!isGameActive || moveHistory.length === 0}
                className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Undo last move"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Takeback</span>
              </button>
            )}

            <button
              onClick={handleRequestHint}
              disabled={!isGameActive || game.turn() !== playerColor}
              className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Get coach suggestion"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Coach Hint</span>
            </button>

            <button
              onClick={() => setBoardFlipped(!boardFlipped)}
              className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Flip perspective"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Flip</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Board Size Toggle (Fit / Full) */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setBoardFitMode('fit')}
                className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                  boardFitMode === 'fit'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Fit board cleanly within screen height (no scrolling)"
              >
                <Minimize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Fit</span>
              </button>
              <button
                onClick={() => setBoardFitMode('full')}
                className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                  boardFitMode === 'full'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Expand board to full width"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Full</span>
              </button>
            </div>

            {/* Fullscreen Mode Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 cursor-pointer transition-colors shadow-sm"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Shrink className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Expand className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 cursor-pointer transition-colors"
              title="Toggle sound effects"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            <button
              onClick={handleResign}
              disabled={!isGameActive}
              className="py-1.5 px-3 bg-rose-950/40 hover:bg-rose-900/50 disabled:opacity-40 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/40 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Flag className="w-3.5 h-3.5 text-rose-400" />
              Resign
            </button>
          </div>
        </div>

        {/* Coach Hint Tip Banner */}
        {coachHint && (
          <div className="w-full mt-2 p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-200 animate-fade-in shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{coachHint.explanation}</span>
            </div>
            <button
              onClick={() => setCoachHint(null)}
              className="text-amber-400 hover:text-amber-200 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Settings, Move Notation Scrubber, Analysis */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-2.5 max-h-[calc(100vh-76px)] overflow-y-auto pr-1">
        {/* Opponent & Mode Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-xs flex items-center gap-2 uppercase tracking-wider">
              <Bot className="w-4 h-4 text-indigo-400" /> Game Mode & Engine
            </h3>
            <span className="text-xs text-cyan-400 font-mono font-bold">
              {isBotMode ? `${selectedBot.name} (${selectedBot.elo})` : 'Online Rival'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsBotMode(true);
                handleRestart();
              }}
              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                isBotMode
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/25'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              🤖 Play vs Bot
            </button>
            <button
              onClick={() => {
                setIsBotMode(false);
              }}
              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                !isBotMode
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/25'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              👥 Play with Friends
            </button>
          </div>

          {/* Time Control Options */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Time Control
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                {timeControl === 0 ? 'Casual (No Timer)' : `${timeControl / 60} min Blitz/Rapid`}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '1m', secs: 60 },
                { label: '3m', secs: 180 },
                { label: '5m', secs: 300 },
                { label: '∞', secs: 0 },
              ].map((tc) => (
                <button
                  key={tc.label}
                  onClick={() => {
                    setTimeControl(tc.secs);
                    setWhiteTime(tc.secs);
                    setBlackTime(tc.secs);
                  }}
                  className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                    timeControl === tc.secs
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Board Theme Switcher */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-xs text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" /> Board Aesthetics
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((tKey) => (
                <button
                  key={tKey}
                  onClick={() => setTheme(tKey)}
                  className={`py-1 px-2 text-[11px] font-semibold rounded-lg border transition-colors truncate cursor-pointer ${
                    theme === tKey
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {BOARD_THEMES[tKey].name}
                </button>
              ))}
            </div>
          </div>

          {/* Board Display Scaling / Fit Options */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" /> Board View & Sizing
              </span>
              <span className="text-[11px] text-cyan-400 font-semibold uppercase">
                {boardFitMode === 'fit' ? 'Fit to Screen' : 'Full Width'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setBoardFitMode('fit')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  boardFitMode === 'fit'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Minimize2 className="w-3 h-3" /> Fit Screen
              </button>
              <button
                onClick={() => setBoardFitMode('full')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  boardFitMode === 'full'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Maximize2 className="w-3 h-3" /> Full Board
              </button>
              <button
                onClick={toggleFullscreen}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg border bg-slate-950 text-slate-300 border-slate-800 hover:text-cyan-300 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                {isFullscreen ? <Shrink className="w-3 h-3 text-cyan-400" /> : <Expand className="w-3 h-3 text-cyan-400" />} Fullscreen
              </button>
            </div>
          </div>
        </div>

        {/* Move History Log & Interactive Scrubber */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col min-h-[260px] shadow-xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Move History
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">
              {Math.ceil(moveHistory.length / 2)} moves ({moveHistory.length} ply)
            </span>
          </div>

          {/* Move Table */}
          <div className="flex-1 overflow-y-auto max-h-52 pr-1 space-y-1 font-mono text-xs">
            {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
              const whiteMove = moveHistory[idx * 2];
              const blackMove = moveHistory[idx * 2 + 1];
              const isWhiteActive = viewingPlyIndex === idx * 2;
              const isBlackActive = viewingPlyIndex === idx * 2 + 1;

              return (
                <div key={idx} className="flex items-center py-1 px-2 rounded hover:bg-slate-800/60">
                  <span className="w-8 text-slate-500 font-semibold">{idx + 1}.</span>
                  <button
                    onClick={() => setViewingPlyIndex(idx * 2)}
                    className={`w-20 text-left px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      isWhiteActive
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-200 hover:text-indigo-300'
                    }`}
                  >
                    {whiteMove?.san}
                  </button>
                  {blackMove && (
                    <button
                      onClick={() => setViewingPlyIndex(idx * 2 + 1)}
                      className={`w-20 text-left px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        isBlackActive
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-indigo-300'
                      }`}
                    >
                      {blackMove.san}
                    </button>
                  )}
                </div>
              );
            })}

            {moveHistory.length === 0 && (
              <div className="text-slate-600 text-xs text-center py-8 italic">
                Moves will record here as you play...
              </div>
            )}
          </div>

          {/* Scrubber Navigation Bar */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewingPlyIndex(0)}
                disabled={moveHistory.length === 0}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 rounded-lg border border-slate-800 cursor-pointer"
                title="First move"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setViewingPlyIndex((prev) =>
                    prev === null ? Math.max(0, moveHistory.length - 2) : Math.max(0, prev - 1)
                  )
                }
                disabled={moveHistory.length === 0}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 rounded-lg border border-slate-800 cursor-pointer"
                title="Previous move"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setViewingPlyIndex((prev) => {
                    if (prev === null) return null;
                    if (prev >= moveHistory.length - 1) return null;
                    return prev + 1;
                  })
                }
                disabled={moveHistory.length === 0}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 rounded-lg border border-slate-800 cursor-pointer"
                title="Next move"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewingPlyIndex(null)}
                disabled={viewingPlyIndex === null}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 rounded-lg border border-slate-800 cursor-pointer"
                title="Current live position"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleRestart}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> New Game
            </button>
          </div>

          {/* Game Over Banner */}
          {gameResult && (
            <div className="mt-3 p-3 bg-indigo-950/80 border border-indigo-500/50 rounded-xl text-center animate-fade-in shadow-xl">
              <div className="text-sm font-bold text-indigo-200 flex items-center justify-center gap-1.5 mb-1">
                <Trophy className="w-4 h-4 text-amber-400" />
                {gameResult.winner === 'draw'
                  ? 'Game Drawn'
                  : `${gameResult.winner === 'w' ? 'White' : 'Black'} Won!`}
              </div>
              <div className="text-xs text-slate-400">{gameResult.reason}</div>
            </div>
          )}
        </div>

        {/* Post-Match Analysis & Accuracy Screen */}
        {analysis && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Match Performance
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyFEN}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedFEN ? 'Copied!' : 'FEN'}
                </button>
                <button
                  onClick={exportPGN}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> PGN
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              Opening:{' '}
              <span className="text-indigo-400 font-bold ml-1">{analysis.openingName}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  White Accuracy
                </div>
                <div className="text-lg font-black font-mono text-emerald-400">
                  {analysis.accuracy.white}%
                </div>
              </div>
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Black Accuracy
                </div>
                <div className="text-lg font-black font-mono text-emerald-400">
                  {analysis.accuracy.black}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-around text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                ✓ {analysis.bestMovesCount.white + analysis.bestMovesCount.black} Best
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                ⚠ {analysis.mistakesCount.white + analysis.mistakesCount.black} Inaccuracies
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                ✕ {analysis.blundersCount.white + analysis.blundersCount.black} Blunders
              </span>
            </div>
          </div>
        )}

        <button
          onClick={onBackToDashboard}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors uppercase tracking-wider cursor-pointer"
        >
          Exit to Dashboard
        </button>
      </div>

      {/* Bot Persona Selector Modal */}
      {showBotModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-400" /> Choose Your Chess Opponent
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Play against authentic bot personalities from beginner cadet to neural engine
                </p>
              </div>
              <button
                onClick={() => setShowBotModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {CHESS_BOTS.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBot(b);
                    setShowBotModal(false);
                    handleRestart();
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center ${
                    selectedBot.id === b.id
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-600/20'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={b.avatar}
                    alt={b.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-100 truncate">{b.name}</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                        {b.elo}
                      </span>
                    </div>
                    <div className="text-[11px] text-cyan-400 font-semibold">{b.style} Style</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                      {b.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
