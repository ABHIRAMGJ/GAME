import React, { useState, useEffect } from 'react';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Crown } from 'lucide-react';

interface CheckersProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

type Piece = { player: 'red' | 'black'; isKing: boolean } | null;

export const CheckersGame: React.FC<CheckersProps> = ({
  onBackToDashboard,
  isMultiplayer = false,
  botDifficulty = 'medium',
}) => {
  const [board, setBoard] = useState<Piece[][]>(() => initBoard());
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [winner, setWinner] = useState<'red' | 'black' | null>(null);
  const [botLevel, setBotLevel] = useState<'easy' | 'medium' | 'hard' | 'extreme'>(botDifficulty);

  function initBoard(): Piece[][] {
    const grid: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) grid[r][c] = { player: 'black', isKing: false };
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) grid[r][c] = { player: 'red', isKing: false };
      }
    }
    return grid;
  }

  // Count pieces
  const redCount = board.flat().filter((p) => p?.player === 'red').length;
  const blackCount = board.flat().filter((p) => p?.player === 'black').length;

  const handleSquareClick = (r: number, c: number) => {
    if (winner || (turn === 'black' && !isMultiplayer)) return;

    const piece = board[r][c];

    // Select piece
    if (piece?.player === turn) {
      setSelectedSquare([r, c]);
      return;
    }

    // Try to move to empty square
    if (selectedSquare && piece === null) {
      const [sr, sc] = selectedSquare;
      const movingPiece = board[sr][sc];
      if (!movingPiece) return;

      const dr = r - sr;
      const dc = c - sc;

      // Regular 1-step move
      const isForward = movingPiece.player === 'red' ? dr === -1 : dr === 1;
      if ((isForward || movingPiece.isKing) && Math.abs(dr) === 1 && Math.abs(dc) === 1) {
        executeMove(sr, sc, r, c);
        return;
      }

      // Jump capture
      if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
        const midR = sr + dr / 2;
        const midC = sc + dc / 2;
        const midPiece = board[midR][midC];

        if (midPiece && midPiece.player !== movingPiece.player) {
          executeJump(sr, sc, r, c, midR, midC);
        }
      }
    }
  };

  const executeMove = (fromR: number, fromC: number, toR: number, toC: number) => {
    const newBoard = board.map((row) => [...row]);
    const piece = newBoard[fromR][fromC];
    if (!piece) return;

    newBoard[fromR][fromC] = null;
    // King promotion
    if ((piece.player === 'red' && toR === 0) || (piece.player === 'black' && toR === 7)) {
      piece.isKing = true;
    }
    newBoard[toR][toC] = piece;

    setBoard(newBoard);
    setSelectedSquare(null);
    sounds.playMove();
    setTurn(piece.player === 'red' ? 'black' : 'red');
  };

  const executeJump = (fromR: number, fromC: number, toR: number, toC: number, midR: number, midC: number) => {
    const newBoard = board.map((row) => [...row]);
    const piece = newBoard[fromR][fromC];
    if (!piece) return;

    newBoard[fromR][fromC] = null;
    newBoard[midR][midC] = null; // Captured
    if ((piece.player === 'red' && toR === 0) || (piece.player === 'black' && toR === 7)) {
      piece.isKing = true;
    }
    newBoard[toR][toC] = piece;

    setBoard(newBoard);
    setSelectedSquare(null);
    sounds.playCapture();

    // Check winner
    const remainingBlack = newBoard.flat().filter((p) => p?.player === 'black').length;
    const remainingRed = newBoard.flat().filter((p) => p?.player === 'red').length;

    if (remainingBlack === 0) {
      setWinner('red');
      sounds.playSuccess();
      confetti({ particleCount: 70 });
      return;
    }
    if (remainingRed === 0) {
      setWinner('black');
      return;
    }

    setTurn(piece.player === 'red' ? 'black' : 'red');
  };

  // Bot Turn
  useEffect(() => {
    if (turn === 'black' && !isMultiplayer && !winner) {
      const timer = setTimeout(() => {
        // Collect all possible bot moves
        const botPieces: { r: number; c: number; piece: NonNullable<Piece> }[] = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p?.player === 'black') botPieces.push({ r, c, piece: p });
          }
        }

        // Prioritize jump captures
        for (const bp of botPieces) {
          const jumps = [
            [-2, -2], [-2, 2], [2, -2], [2, 2]
          ];
          for (const [dr, dc] of jumps) {
            const toR = bp.r + dr;
            const toC = bp.c + dc;
            if (toR >= 0 && toR < 8 && toC >= 0 && toC < 8 && board[toR][toC] === null) {
              const midR = bp.r + dr / 2;
              const midC = bp.c + dc / 2;
              const mid = board[midR][midC];
              if (mid && mid.player === 'red') {
                executeJump(bp.r, bp.c, toR, toC, midR, midC);
                return;
              }
            }
          }
        }

        // Regular move
        for (const bp of botPieces) {
          const moves = bp.piece.isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[1, -1], [1, 1]];
          for (const [dr, dc] of moves) {
            const toR = bp.r + dr;
            const toC = bp.c + dc;
            if (toR >= 0 && toR < 8 && toC >= 0 && toC < 8 && board[toR][toC] === null) {
              executeMove(bp.r, bp.c, toR, toC);
              return;
            }
          }
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [turn, isMultiplayer, winner, board]);

  const handleRestart = () => {
    setBoard(initBoard());
    setTurn('red');
    setWinner(null);
    setSelectedSquare(null);
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚪</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Classic Checkers
            </div>
            <div className="text-[10px] text-slate-400">
              Turn: <span className={turn === 'red' ? 'text-red-400 font-bold' : 'text-slate-300 font-bold'}>
                {turn === 'red' ? 'Red (You)' : 'Black (Bot)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 8x8 Board */}
      <div className="relative aspect-square w-full max-w-[min(440px,calc(100vh-220px))] bg-[#2c1d11] border-4 border-[#1c120a] rounded-2xl shadow-2xl p-1.5 flex items-center justify-center">
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border border-[#422a18]">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedSquare?.[0] === r && selectedSquare?.[1] === c;

              return (
                <div
                  key={`${r}_${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  className={`w-full h-full flex items-center justify-center cursor-pointer transition-colors ${
                    isDark ? 'bg-[#5c3a21]' : 'bg-[#e2c499]'
                  } ${isSelected ? 'ring-2 ring-cyan-400' : ''}`}
                >
                  {cell && (
                    <div
                      className={`w-[80%] h-[80%] rounded-full flex items-center justify-center border-2 shadow-md transition-transform ${
                        cell.player === 'red'
                          ? 'bg-gradient-to-tr from-red-600 to-red-400 border-red-300 text-white'
                          : 'bg-gradient-to-tr from-slate-900 to-slate-700 border-slate-500 text-amber-300'
                      }`}
                    >
                      {cell.isKing && <Crown className="w-3.5 h-3.5 fill-current" />}
                    </div>
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
              {winner === 'red' ? 'YOU WON THE CHECKERS MATCH!' : 'BOT WON THE MATCH!'}
            </h2>
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

      {/* Piece Counts */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 flex items-center justify-between text-xs font-bold shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-300">Red:</span>
          <span className="font-mono text-red-400 text-sm">{redCount} pieces</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-300">Black:</span>
          <span className="font-mono text-slate-400 text-sm">{blackCount} pieces</span>
          <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-600" />
        </div>
      </div>
    </div>
  );
};
