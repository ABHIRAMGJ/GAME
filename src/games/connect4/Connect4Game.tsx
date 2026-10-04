import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Bot, Users, Sparkles, Flame } from 'lucide-react';

interface Connect4Props {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

type Player = 'red' | 'yellow';
type Cell = Player | null;

const ROWS = 6;
const COLS = 7;

export const Connect4Game: React.FC<Connect4Props> = ({
  onBackToDashboard,
  isMultiplayer = false,
  botDifficulty = 'medium',
}) => {
  const { user } = useAuth();
  const [board, setBoard] = useState<Cell[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [turn, setTurn] = useState<Player>('red');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][] | null>(null);
  const [scoreRed, setScoreRed] = useState(0);
  const [scoreYellow, setScoreYellow] = useState(0);
  const [botLevel, setBotLevel] = useState<'easy' | 'medium' | 'hard' | 'extreme'>(botDifficulty);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  // Check 4 in a row
  const checkWinner = (grid: Cell[][]): { winner: Player | 'draw'; cells: [number, number][] } | null => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const p = grid[r][c];
        if (p && p === grid[r][c + 1] && p === grid[r][c + 2] && p === grid[r][c + 3]) {
          return { winner: p, cells: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]] };
        }
      }
    }

    // Vertical
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = grid[r][c];
        if (p && p === grid[r + 1][c] && p === grid[r + 2][c] && p === grid[r + 3][c]) {
          return { winner: p, cells: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]] };
        }
      }
    }

    // Diagonal Up-Right
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const p = grid[r][c];
        if (p && p === grid[r - 1][c + 1] && p === grid[r - 2][c + 2] && p === grid[r - 3][c + 3]) {
          return { winner: p, cells: [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]] };
        }
      }
    }

    // Diagonal Down-Right
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const p = grid[r][c];
        if (p && p === grid[r + 1][c + 1] && p === grid[r + 2][c + 2] && p === grid[r + 3][c + 3]) {
          return { winner: p, cells: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]] };
        }
      }
    }

    // Check draw
    if (grid.every((row) => row.every((cell) => cell !== null))) {
      return { winner: 'draw', cells: [] };
    }

    return null;
  };

  const dropToken = (colIndex: number) => {
    if (winner || (turn === 'yellow' && !isMultiplayer)) return;

    // Find lowest open row in this column
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][colIndex] === null) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) return; // Column full

    executeDrop(targetRow, colIndex, 'red');
  };

  const executeDrop = (row: number, col: number, player: Player) => {
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = player;
    setBoard(newBoard);
    sounds.playMove();

    const result = checkWinner(newBoard);
    if (result) {
      if (result.winner === 'red') {
        setWinner('red');
        setWinningCells(result.cells);
        setScoreRed((s) => s + 1);
        sounds.playSuccess();
        confetti({ particleCount: 70, spread: 60 });
      } else if (result.winner === 'yellow') {
        setWinner('yellow');
        setWinningCells(result.cells);
        setScoreYellow((s) => s + 1);
      } else {
        setWinner('draw');
      }
      return;
    }

    setTurn(player === 'red' ? 'yellow' : 'red');
  };

  // Bot Turn Simulation
  useEffect(() => {
    if (turn === 'yellow' && !isMultiplayer && !winner) {
      const timer = setTimeout(() => {
        const bestCol = getBotColumn(board, botLevel);
        if (bestCol !== -1) {
          for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][bestCol] === null) {
              executeDrop(r, bestCol, 'yellow');
              break;
            }
          }
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [turn, isMultiplayer, winner, board, botLevel]);

  const getBotColumn = (grid: Cell[][], level: string): number => {
    const validCols: number[] = [];
    for (let c = 0; c < COLS; c++) {
      if (grid[0][c] === null) validCols.push(c);
    }
    if (validCols.length === 0) return -1;

    // Easy: high randomness
    if (level === 'easy' && Math.random() < 0.6) {
      return validCols[Math.floor(Math.random() * validCols.length)];
    }

    // 1. Can Bot win in 1 move?
    for (const c of validCols) {
      const copy = grid.map((r) => [...r]);
      for (let r = ROWS - 1; r >= 0; r--) {
        if (copy[r][c] === null) {
          copy[r][c] = 'yellow';
          if (checkWinner(copy)?.winner === 'yellow') return c;
          break;
        }
      }
    }

    // 2. Must Bot block player from winning in 1 move?
    for (const c of validCols) {
      const copy = grid.map((r) => [...r]);
      for (let r = ROWS - 1; r >= 0; r--) {
        if (copy[r][c] === null) {
          copy[r][c] = 'red';
          if (checkWinner(copy)?.winner === 'red') return c;
          break;
        }
      }
    }

    // Extreme/Hard: prefer center columns
    if ((level === 'hard' || level === 'extreme') && validCols.includes(3)) {
      if (Math.random() < 0.7) return 3;
    }

    return validCols[Math.floor(Math.random() * validCols.length)];
  };

  const handleRestart = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setTurn('red');
    setWinner(null);
    setWinningCells(null);
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Top Header Card */}
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔴</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Connect 4 Duel
            </div>
            <div className="text-[10px] text-slate-400">
              Turn:{' '}
              <span className={turn === 'red' ? 'text-red-400 font-bold' : 'text-yellow-400 font-bold'}>
                {turn === 'red' ? (user?.username || 'Red (You)') : (isMultiplayer ? 'Yellow' : `Bot (${botLevel.toUpperCase()})`)}
              </span>
            </div>
          </div>
        </div>

        {/* Difficulty Selector & Restart */}
        <div className="flex items-center gap-2">
          {!isMultiplayer && (
            <select
              value={botLevel}
              onChange={(e) => setBotLevel(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold py-1 px-2 rounded-lg cursor-pointer focus:outline-none"
            >
              <option value="easy">Easy Bot</option>
              <option value="medium">Medium Bot</option>
              <option value="hard">Hard Bot</option>
              <option value="extreme">Extreme Bot</option>
            </select>
          )}

          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="Restart Match"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 7x6 Connect 4 Grid */}
      <div className="relative w-full max-w-[min(500px,calc(100vh-210px))] bg-blue-900 border-4 border-blue-950 rounded-2xl shadow-2xl p-2 sm:p-3 flex flex-col items-center">
        {/* Drop Indicators */}
        <div className="grid grid-cols-7 gap-1.5 w-full mb-1">
          {Array(COLS).fill(0).map((_, c) => (
            <button
              key={`drop_${c}`}
              onClick={() => dropToken(c)}
              onMouseEnter={() => setHoverCol(c)}
              onMouseLeave={() => setHoverCol(null)}
              disabled={!!winner || board[0][c] !== null || (turn === 'yellow' && !isMultiplayer)}
              className="h-6 flex items-center justify-center text-xs font-bold text-blue-300 hover:text-white transition-colors cursor-pointer"
            >
              {hoverCol === c && !winner ? '▼' : '·'}
            </button>
          ))}
        </div>

        {/* Board Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 w-full">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isWinning = winningCells?.some(([wr, wc]) => wr === r && wc === c);
              return (
                <div
                  key={`${r}_${c}`}
                  onClick={() => dropToken(c)}
                  className="aspect-square bg-slate-950/90 rounded-full flex items-center justify-center p-1 cursor-pointer relative"
                >
                  {cell === 'red' && (
                    <div
                      className={`w-full h-full rounded-full bg-gradient-to-tr from-red-600 to-red-400 border-2 border-red-300 shadow-md ${
                        isWinning ? 'ring-4 ring-yellow-300 animate-pulse' : ''
                      }`}
                    />
                  )}
                  {cell === 'yellow' && (
                    <div
                      className={`w-full h-full rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-yellow-100 shadow-md ${
                        isWinning ? 'ring-4 ring-white animate-pulse' : ''
                      }`}
                    />
                  )}
                  {cell === null && (
                    <div className="w-full h-full rounded-full bg-slate-950/60 border border-blue-950" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Winner Overlay */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-30 p-4">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase">
              {winner === 'red' ? 'RED WINS! (4-IN-A-ROW)' : winner === 'yellow' ? 'YELLOW WINS!' : "IT'S A DRAW!"}
            </h2>
            <div className="text-xs text-slate-300">
              Score: Red ({scoreRed}) — Yellow ({scoreYellow})
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleRestart}
                className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase rounded-lg shadow-lg"
              >
                Play Again
              </button>
              <button
                onClick={onBackToDashboard}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Scores Bar */}
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 flex items-center justify-between text-xs font-bold shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-300">Red (You):</span>
          <span className="font-mono text-red-400 text-sm">{scoreRed}</span>
        </div>

        <div className="text-slate-500 font-mono">VS</div>

        <div className="flex items-center gap-2">
          <span className="text-slate-300">Yellow (Bot):</span>
          <span className="font-mono text-yellow-400 text-sm">{scoreYellow}</span>
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
        </div>
      </div>
    </div>
  );
};
