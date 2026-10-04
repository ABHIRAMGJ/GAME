import React, { useState, useEffect } from 'react';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Flag, Clock, Bomb } from 'lucide-react';

interface MinesweeperProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

const SIZE = 9;
const MINES_COUNT = 10;

export const MinesweeperGame: React.FC<MinesweeperProps> = ({ onBackToDashboard }) => {
  const [board, setBoard] = useState<Cell[][]>(() => createBoard());
  const [isFlagMode, setIsFlagMode] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  function createBoard(): Cell[][] {
    const grid: Cell[][] = Array(SIZE).fill(null).map((_, r) =>
      Array(SIZE).fill(null).map((_, c) => ({
        r,
        c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0,
      }))
    );

    // Place mines randomly
    let placed = 0;
    while (placed < MINES_COUNT) {
      const r = Math.floor(Math.random() * SIZE);
      const c = Math.floor(Math.random() * SIZE);
      if (!grid[r][c].isMine) {
        grid[r][c].isMine = true;
        placed++;
      }
    }

    // Calculate neighbor numbers
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && grid[nr][nc].isMine) {
              count++;
            }
          }
        }
        grid[r][c].adjacentMines = count;
      }
    }

    return grid;
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && !gameOver && !gameWon) {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, gameOver, gameWon]);

  const handleCellClick = (r: number, c: number, rightClick = false) => {
    if (gameOver || gameWon) return;
    if (!timerActive) setTimerActive(true);

    const cell = board[r][c];
    if (cell.isRevealed) return;

    if (rightClick || isFlagMode) {
      // Toggle flag
      const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
      newBoard[r][c].isFlagged = !newBoard[r][c].isFlagged;
      setBoard(newBoard);
      sounds.playMove();
      return;
    }

    if (cell.isFlagged) return;

    // Hit a mine!
    if (cell.isMine) {
      sounds.playExplosion();
      setGameOver(true);
      // Reveal all mines
      const revealed = board.map((row) =>
        row.map((cl) => (cl.isMine ? { ...cl, isRevealed: true } : cl))
      );
      setBoard(revealed);
      return;
    }

    // Reveal cell and flood fill if 0
    revealCell(r, c);
  };

  const revealCell = (r: number, c: number) => {
    const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
    const queue: [number, number][] = [[r, c]];
    sounds.playMove();

    while (queue.length > 0) {
      const [currR, currC] = queue.pop()!;
      const current = newBoard[currR][currC];
      if (current.isRevealed || current.isFlagged) continue;

      current.isRevealed = true;

      if (current.adjacentMines === 0 && !current.isMine) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = currR + dr;
            const nc = currC + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !newBoard[nr][nc].isRevealed) {
              queue.push([nr, nc]);
            }
          }
        }
      }
    }

    setBoard(newBoard);

    // Check win condition (all non-mine cells revealed)
    const allSafeRevealed = newBoard.every((row) =>
      row.every((cell) => cell.isMine || cell.isRevealed)
    );

    if (allSafeRevealed) {
      setGameWon(true);
      sounds.playSuccess();
      confetti({ particleCount: 80, spread: 70 });
    }
  };

  const remainingFlags = MINES_COUNT - board.flat().filter((c) => c.isFlagged).length;

  const handleRestart = () => {
    setBoard(createBoard());
    setGameOver(false);
    setGameWon(false);
    setTimer(0);
    setTimerActive(false);
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Header Bar */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚩</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Minesweeper Blitz
            </div>
            <div className="text-[10px] text-slate-400">
              Mines: <span className="font-mono font-bold text-red-400">{remainingFlags}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3 h-3 text-cyan-400" /> {timer}s
          </div>

          <button
            onClick={() => setIsFlagMode(!isFlagMode)}
            className={`py-1 px-2.5 text-xs font-bold rounded-lg border flex items-center gap-1 transition-colors ${
              isFlagMode ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Flag className="w-3.5 h-3.5" /> Flag
          </button>

          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="relative aspect-square w-full max-w-[min(400px,calc(100vh-220px))] bg-slate-950 border-4 border-slate-800 rounded-2xl shadow-2xl p-2 flex items-center justify-center">
        <div className="grid grid-cols-9 grid-rows-9 gap-1 w-full h-full">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const numColors = [
                '',
                'text-blue-400',
                'text-emerald-400',
                'text-red-400',
                'text-purple-400',
                'text-amber-400',
                'text-cyan-400',
                'text-pink-400',
                'text-white',
              ];

              return (
                <button
                  key={`${r}_${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleCellClick(r, c, true);
                  }}
                  className={`w-full h-full rounded-md flex items-center justify-center font-mono font-black text-sm transition-all border ${
                    cell.isRevealed
                      ? cell.isMine
                        ? 'bg-red-950 border-red-500 text-red-300'
                        : 'bg-slate-900 border-slate-800 text-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 cursor-pointer shadow-sm'
                  }`}
                >
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      <Bomb className="w-4 h-4 fill-current" />
                    ) : cell.adjacentMines > 0 ? (
                      <span className={numColors[cell.adjacentMines]}>{cell.adjacentMines}</span>
                    ) : (
                      ''
                    )
                  ) : cell.isFlagged ? (
                    <Flag className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  ) : (
                    ''
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Win / Loss Overlay */}
        {(gameOver || gameWon) && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-30 p-4">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase">
              {gameWon ? 'MINEFIELD CLEARED! YOU WON!' : 'BOOM! MINE DETONATED!'}
            </h2>
            <div className="text-xs text-slate-300">Time: {timer} seconds</div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleRestart} className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase rounded-lg">
                Play Again
              </button>
              <button onClick={onBackToDashboard} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-400">
        Left-click to reveal · Right-click or tap Flag to mark mines
      </div>
    </div>
  );
};
