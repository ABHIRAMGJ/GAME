import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Zap, ArrowDown, RotateCw, Pause } from 'lucide-react';

interface TetrisGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

const COLS = 10;
const ROWS = 20;

type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

const SHAPES: Record<TetrominoType, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const COLORS: Record<TetrominoType, string> = {
  I: '#06b6d4',
  O: '#eab308',
  T: '#a855f7',
  S: '#22c55e',
  Z: '#ef4444',
  J: '#3b82f6',
  L: '#f97316',
};

export const TetrisGame: React.FC<TetrisGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  const [grid, setGrid] = useState<string[][]>(() => createEmptyGrid());
  const [opponentGrid, setOpponentGrid] = useState<string[][]>(() => createEmptyGrid());

  const [currentPiece, setCurrentPiece] = useState<{ type: TetrominoType; shape: number[][]; x: number; y: number } | null>(null);
  const [nextPiece, setNextPiece] = useState<TetrominoType>('T');
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [opponentLines, setOpponentLines] = useState(0);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  const pieceRef = useRef(currentPiece);
  pieceRef.current = currentPiece;
  const gridRef = useRef(grid);
  gridRef.current = grid;

  function createEmptyGrid(): string[][] {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(''));
  }

  const getRandomPiece = (): TetrominoType => {
    const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    return types[Math.floor(Math.random() * types.length)];
  };

  const spawnPiece = (type?: TetrominoType) => {
    const pieceType = type || nextPiece;
    const shape = SHAPES[pieceType];
    const newPiece = {
      type: pieceType,
      shape,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0,
    };

    if (checkCollision(newPiece.shape, newPiece.x, newPiece.y, gridRef.current)) {
      handleMatchOver('opponent');
      return;
    }

    setCurrentPiece(newPiece);
    setNextPiece(getRandomPiece());
    setCanHold(true);
  };

  const checkCollision = (shape: number[][], posX: number, posY: number, currentGrid: string[][]): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = posX + c;
          const newY = posY + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && currentGrid[newY][newX] !== '') return true;
        }
      }
    }
    return false;
  };

  const rotate = (matrix: number[][]): number[][] => {
    return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
  };

  const drop = () => {
    if (!pieceRef.current || gameOver) return;
    const { shape, x, y, type } = pieceRef.current;

    if (!checkCollision(shape, x, y + 1, gridRef.current)) {
      setCurrentPiece({ ...pieceRef.current, y: y + 1 });
    } else {
      lockPiece();
    }
  };

  const hardDrop = () => {
    if (!pieceRef.current || gameOver) return;
    let newY = pieceRef.current.y;
    while (!checkCollision(pieceRef.current.shape, pieceRef.current.x, newY + 1, gridRef.current)) {
      newY++;
    }
    setCurrentPiece({ ...pieceRef.current, y: newY });
    lockPiece({ ...pieceRef.current, y: newY });
  };

  const lockPiece = (targetPiece = pieceRef.current) => {
    if (!targetPiece) return;
    const { shape, x, y, type } = targetPiece;
    const newGrid = gridRef.current.map((row) => [...row]);

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          if (y + r >= 0 && y + r < ROWS && x + c >= 0 && x + c < COLS) {
            newGrid[y + r][x + c] = COLORS[type];
          }
        }
      }
    }

    // Clear full lines
    let clearedLines = 0;
    const filteredGrid = newGrid.filter((row) => {
      const isFull = row.every((cell) => cell !== '');
      if (isFull) clearedLines++;
      return !isFull;
    });

    while (filteredGrid.length < ROWS) {
      filteredGrid.unshift(Array(COLS).fill(''));
    }

    setGrid(filteredGrid);
    sounds.playMove();

    if (clearedLines > 0) {
      sounds.playCapture();
      const points = [0, 100, 300, 500, 800][clearedLines] * level;
      setScore((s) => s + points);
      setLines((l) => l + clearedLines);

      // Garbage Attack to Opponent!
      const garbageToSend = clearedLines >= 4 ? 4 : clearedLines >= 3 ? 2 : clearedLines >= 2 ? 1 : 0;
      if (garbageToSend > 0) {
        if (isMultiplayer) {
          sendGameAction('tetris_garbage', { count: garbageToSend });
        } else {
          // Bot takes garbage line
          addGarbageToOpponent(garbageToSend);
        }
      }
    }

    spawnPiece();
  };

  const addGarbageToOpponent = (count: number) => {
    setOpponentGrid((prev) => {
      const copy = prev.slice(count);
      for (let i = 0; i < count; i++) {
        const row = Array(COLS).fill('#64748b');
        row[Math.floor(Math.random() * COLS)] = ''; // hole
        copy.push(row);
      }
      return copy;
    });
  };

  const addGarbageToPlayer = (count: number) => {
    setGrid((prev) => {
      const copy = prev.slice(count);
      for (let i = 0; i < count; i++) {
        const row = Array(COLS).fill('#64748b');
        row[Math.floor(Math.random() * COLS)] = '';
        copy.push(row);
      }
      return copy;
    });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver || !pieceRef.current) return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (!checkCollision(pieceRef.current.shape, pieceRef.current.x - 1, pieceRef.current.y, gridRef.current)) {
          setCurrentPiece({ ...pieceRef.current, x: pieceRef.current.x - 1 });
        }
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (!checkCollision(pieceRef.current.shape, pieceRef.current.x + 1, pieceRef.current.y, gridRef.current)) {
          setCurrentPiece({ ...pieceRef.current, x: pieceRef.current.x + 1 });
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        drop();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        const rotated = rotate(pieceRef.current.shape);
        if (!checkCollision(rotated, pieceRef.current.x, pieceRef.current.y, gridRef.current)) {
          setCurrentPiece({ ...pieceRef.current, shape: rotated });
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        hardDrop();
      } else if (e.code === 'KeyC') {
        // Hold piece
        if (!canHold) return;
        const currentType = pieceRef.current.type;
        if (holdPiece) {
          spawnPiece(holdPiece);
        } else {
          spawnPiece();
        }
        setHoldPiece(currentType);
        setCanHold(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameOver, canHold, holdPiece]);

  // Game loop tick
  useEffect(() => {
    if (gameOver) return;
    const speed = Math.max(120, 800 - (level - 1) * 70);
    const interval = setInterval(drop, speed);
    return () => clearInterval(interval);
  }, [gameOver, level]);

  // Initial piece
  useEffect(() => {
    spawnPiece();
  }, []);

  // Bot AI simulation
  useEffect(() => {
    if (isMultiplayer || gameOver) return;

    const botInterval = setInterval(() => {
      setOpponentLines((l) => {
        const next = l + 1;
        if (Math.random() < 0.25) {
          addGarbageToPlayer(1);
        }
        return next;
      });
    }, 3200);

    return () => clearInterval(botInterval);
  }, [isMultiplayer, gameOver]);

  // Multiplayer sync
  useEffect(() => {
    if (!isMultiplayer) return;

    const cleanup = onGameAction(({ action, data }) => {
      if (action === 'tetris_garbage') {
        addGarbageToPlayer(data.count);
      }
    });

    return cleanup;
  }, [isMultiplayer]);

  const handleMatchOver = async (victor: 'player' | 'opponent') => {
    setGameOver(true);
    setWinner(victor);

    if (victor === 'player') {
      sounds.playSuccess();
      confetti({ particleCount: 80, spread: 70 });
    }

    try {
      await api.recordMatch({
        gameId: 'tetris',
        opponentId: isMultiplayer ? (currentRoom?.guestId || 'guest') : 'tetris_bot',
        opponentName: isMultiplayer ? (isHost ? currentRoom?.guestName : currentRoom?.hostName) : 'Tetris AI',
        isBot: !isMultiplayer,
        result: victor === 'player' ? 'win' : 'loss',
        userScore: score,
        opponentScore: opponentLines * 100,
        durationSeconds: 120,
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Render ghost piece projection
  const ghostY = (() => {
    if (!currentPiece) return 0;
    let gy = currentPiece.y;
    while (!checkCollision(currentPiece.shape, currentPiece.x, gy + 1, grid)) {
      gy++;
    }
    return gy;
  })();

  return (
    <div className="h-full w-full max-h-[calc(100vh-68px)] flex flex-col items-center justify-center mx-auto p-1 sm:p-2 overflow-hidden select-none">
      {/* HUD Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-1.5 py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <div className="flex items-center gap-5">
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-semibold">Score</div>
            <div className="text-base font-mono font-bold text-cyan-400">{score}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-semibold">Lines</div>
            <div className="text-base font-mono font-bold text-slate-200">{lines}</div>
          </div>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          <strong className="text-slate-200">Arrows/WASD</strong> · <strong className="text-cyan-400">Space</strong> (Drop) · <strong className="text-purple-400">C</strong> (Hold)
        </div>

        <button onClick={onBackToDashboard} className="py-1 px-2.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer">
          Exit
        </button>
      </div>

      <div className="flex gap-4 items-center justify-center w-full">
        {/* Hold & Next Box */}
        <div className="flex flex-col gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 w-20 flex flex-col items-center">
            <span className="text-[9px] text-slate-400 uppercase font-bold mb-1">Hold (C)</span>
            <div className="w-10 h-10 flex items-center justify-center font-bold text-xl text-purple-400">
              {holdPiece || '—'}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 w-20 flex flex-col items-center">
            <span className="text-[9px] text-slate-400 uppercase font-bold mb-1">Next</span>
            <div className="w-10 h-10 flex items-center justify-center font-bold text-xl text-cyan-400">
              {nextPiece}
            </div>
          </div>
        </div>

        {/* Primary Player Grid */}
        <div className="relative border-2 border-slate-700 rounded-lg overflow-hidden bg-slate-950 p-0.5 shadow-2xl">
          <div
            style={{
              height: 'min(450px, calc(100vh - 165px))',
              width: 'min(225px, calc((100vh - 165px) / 2))',
            }}
            className="grid grid-cols-10 grid-rows-20 gap-px bg-slate-900"
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                // Check if current active piece
                let isPieceCell = false;
                let isGhostCell = false;
                let color = cell;

                if (currentPiece) {
                  const pr = r - currentPiece.y;
                  const pc = c - currentPiece.x;
                  if (pr >= 0 && pr < currentPiece.shape.length && pc >= 0 && pc < currentPiece.shape[0].length) {
                    if (currentPiece.shape[pr][pc]) {
                      isPieceCell = true;
                      color = COLORS[currentPiece.type];
                    }
                  }

                  // Ghost piece
                  const gr = r - ghostY;
                  if (!isPieceCell && gr >= 0 && gr < currentPiece.shape.length && pc >= 0 && pc < currentPiece.shape[0].length) {
                    if (currentPiece.shape[gr][pc]) {
                      isGhostCell = true;
                    }
                  }
                }

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`w-full h-full rounded-sm ${
                      isPieceCell
                        ? 'border border-white/40'
                        : isGhostCell
                        ? 'border border-dashed border-cyan-400/30 bg-cyan-950/20'
                        : cell
                        ? 'border border-black/30'
                        : 'bg-slate-950/40'
                    }`}
                    style={{ backgroundColor: isPieceCell || cell ? color : undefined }}
                  />
                );
              })
            )}
          </div>

          {/* Game Over Banner */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
              <Trophy className="w-10 h-10 text-amber-400" />
              <div className="text-xl font-bold text-white uppercase">
                {winner === 'player' ? 'VICTORY!' : 'BLOCK OUT!'}
              </div>
              <div className="text-xs text-slate-400">Lines Cleared: {lines}</div>
              <button
                onClick={() => {
                  setGrid(createEmptyGrid());
                  setGameOver(false);
                  setScore(0);
                  setLines(0);
                  spawnPiece();
                }}
                className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg mt-2"
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Opponent Mini Board */}
        <div className="hidden sm:flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">
            Opponent Board
          </div>
          <div className="grid grid-cols-10 grid-rows-20 gap-px bg-slate-950 w-[120px] h-[240px] border border-slate-800 rounded">
            {opponentGrid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className="w-full h-full"
                  style={{ backgroundColor: cell || 'transparent' }}
                />
              ))
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-2">AI Opponent</span>
        </div>
      </div>
    </div>
  );
};
