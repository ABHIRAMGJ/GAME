import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Bot, Users, Sparkles, Flame, Shield } from 'lucide-react';

interface TicTacToeProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

type Cell = 'X' | 'O' | null;

export const TicTacToeGame: React.FC<TicTacToeProps> = ({
  onBackToDashboard,
  isMultiplayer = false,
  botDifficulty = 'medium',
}) => {
  const { user } = useAuth();
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<'X' | 'O' | 'draw' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scoreX, setScoreX] = useState(0);
  const [scoreO, setScoreO] = useState(0);
  const [streak, setStreak] = useState(0);
  const [botLevel, setBotLevel] = useState<'easy' | 'medium' | 'hard' | 'extreme'>(botDifficulty);

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6],             // Diagonals
  ];

  const checkWinner = (squares: Cell[]) => {
    for (const combo of winningCombinations) {
      const [a, b, c] = combo;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: combo };
      }
    }
    if (squares.every((cell) => cell !== null)) {
      return { winner: 'draw', line: null };
    }
    return null;
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || (turn === 'O' && !isMultiplayer)) return;

    makeMove(index, 'X');
  };

  const makeMove = (index: number, player: 'X' | 'O') => {
    const newBoard = [...board];
    newBoard[index] = player;
    setBoard(newBoard);
    sounds.playMove();

    const result = checkWinner(newBoard);
    if (result) {
      if (result.winner === 'X') {
        setWinner('X');
        setWinningLine(result.line);
        setScoreX((s) => s + 1);
        setStreak((st) => st + 1);
        sounds.playSuccess();
        confetti({ particleCount: 60, spread: 60 });
      } else if (result.winner === 'O') {
        setWinner('O');
        setWinningLine(result.line);
        setScoreO((s) => s + 1);
        setStreak(0);
      } else {
        setWinner('draw');
      }
      return;
    }

    setTurn(player === 'X' ? 'O' : 'X');
  };

  // Bot AI logic
  useEffect(() => {
    if (turn === 'O' && !isMultiplayer && !winner) {
      const timer = setTimeout(() => {
        const bestMove = getBotMove(board, botLevel);
        if (bestMove !== -1) {
          makeMove(bestMove, 'O');
        }
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [turn, isMultiplayer, winner, board, botLevel]);

  const getBotMove = (currentBoard: Cell[], level: string): number => {
    const available = currentBoard.map((c, i) => (c === null ? i : -1)).filter((i) => i !== -1);
    if (available.length === 0) return -1;

    // Easy: 75% random
    if (level === 'easy' && Math.random() < 0.75) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // Medium: 40% random
    if (level === 'medium' && Math.random() < 0.4) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // 1. Can Bot win in 1 move?
    for (const pos of available) {
      const copy = [...currentBoard];
      copy[pos] = 'O';
      if (checkWinner(copy)?.winner === 'O') return pos;
    }

    // 2. Must Bot block player from winning?
    for (const pos of available) {
      const copy = [...currentBoard];
      copy[pos] = 'X';
      if (checkWinner(copy)?.winner === 'X') return pos;
    }

    // Extreme: Center first, then corners
    if (currentBoard[4] === null) return 4;

    const corners = [0, 2, 6, 8].filter((i) => currentBoard[i] === null);
    if (corners.length > 0 && (level === 'hard' || level === 'extreme')) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    return available[Math.floor(Math.random() * available.length)];
  };

  const handleRestart = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinner(null);
    setWinningLine(null);
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Top Header Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">❌</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Tic Tac Toe Masters
            </div>
            <div className="text-[10px] text-slate-400">
              Turn: <span className={turn === 'X' ? 'text-cyan-400 font-bold' : 'text-amber-400 font-bold'}>
                {turn === 'X' ? (user?.username || 'Player X') : (isMultiplayer ? 'Player O' : `Bot (${botLevel.toUpperCase()})`)}
              </span>
            </div>
          </div>
        </div>

        {/* Difficulty & Streak */}
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

          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg">
            <Flame className="w-3.5 h-3.5" /> {streak}W
          </div>

          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="Restart Board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3x3 Board */}
      <div className="relative aspect-square w-full max-w-[min(380px,calc(100vh-230px))] bg-slate-950 border-4 border-slate-800 rounded-2xl shadow-2xl p-3 flex flex-col justify-between">
        <div className="grid grid-cols-3 gap-2.5 h-full w-full">
          {board.map((cell, idx) => {
            const isWinning = winningLine?.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                disabled={cell !== null || !!winner}
                className={`w-full h-full rounded-xl flex items-center justify-center font-black text-4xl sm:text-5xl font-mono transition-all border ${
                  isWinning
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300 scale-105 shadow-lg shadow-emerald-500/30'
                    : cell === 'X'
                    ? 'bg-slate-900 border-cyan-500/40 text-cyan-400'
                    : cell === 'O'
                    ? 'bg-slate-900 border-amber-500/40 text-amber-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-transparent cursor-pointer'
                }`}
              >
                {cell}
              </button>
            );
          })}
        </div>

        {/* Winner Dialog Overlay */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-30 p-4">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase">
              {winner === 'X' ? 'PLAYER X VICTORIOUS!' : winner === 'O' ? 'PLAYER O WINS!' : "IT'S A DRAW!"}
            </h2>
            <div className="text-xs text-slate-300">
              Score: X ({scoreX}) — O ({scoreO})
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
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 flex items-center justify-between text-xs font-bold shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-slate-300">Player X (You):</span>
          <span className="font-mono text-cyan-400 text-sm">{scoreX}</span>
        </div>

        <div className="text-slate-500 font-mono">VS</div>

        <div className="flex items-center gap-2">
          <span className="text-slate-300">Player O (Bot):</span>
          <span className="font-mono text-amber-400 text-sm">{scoreO}</span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        </div>
      </div>
    </div>
  );
};
