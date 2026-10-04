import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Flame, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface SnakeProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

type Point = { x: number; y: number };

const GRID_SIZE = 20;

export const SnakeGame: React.FC<SnakeProps> = ({ onBackToDashboard }) => {
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [dir, setDir] = useState<Point>({ x: 0, y: -1 });
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const dirRef = useRef<Point>(dir);
  dirRef.current = dir;

  // Food spawn
  const spawnFood = (currentSnake: Point[]): Point => {
    let p: Point;
    do {
      p = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some((s) => s.x === p.x && s.y === p.y));
    return p;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) {
        if (e.key.startsWith('Arrow') || e.key === ' ') setIsPlaying(true);
      }
      const cur = dirRef.current;
      if (e.key === 'ArrowUp' && cur.y === 0) setDir({ x: 0, y: -1 });
      if (e.key === 'ArrowDown' && cur.y === 0) setDir({ x: 0, y: 1 });
      if (e.key === 'ArrowLeft' && cur.x === 0) setDir({ x: -1, y: 0 });
      if (e.key === 'ArrowRight' && cur.x === 0) setDir({ x: 1, y: 0 });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Game Loop
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = { x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y };

        // Wall collision (wrap-around or wall bounce)
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setIsGameOver(true);
          sounds.playExplosion();
          return prev;
        }

        // Self collision
        if (prev.some((s) => s.x === head.x && s.y === head.y)) {
          setIsGameOver(true);
          sounds.playExplosion();
          return prev;
        }

        const newSnake = [head, ...prev];

        // Eat food
        if (head.x === food.x && head.y === food.y) {
          sounds.playCapture();
          setScore((s) => {
            const next = s + 10;
            if (next > highScore) setHighScore(next);
            return next;
          });
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying, isGameOver, food, highScore]);

  const handleRestart = () => {
    const initial = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    setSnake(initial);
    setDir({ x: 0, y: -1 });
    setFood(spawnFood(initial));
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐍</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Cyber Snake
            </div>
            <div className="text-[10px] text-slate-400">
              Score: <span className="font-mono font-bold text-cyan-400">{score}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> High: {highScore}
          </div>
          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Canvas Board */}
      <div className="relative aspect-square w-full max-w-[min(420px,calc(100vh-220px))] bg-slate-950 border-4 border-slate-800 rounded-2xl shadow-2xl p-1.5 flex items-center justify-center">
        <div
          className="w-full h-full grid gap-0.5 rounded-xl overflow-hidden bg-slate-900/60"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {Array(GRID_SIZE * GRID_SIZE).fill(0).map((_, idx) => {
            const x = idx % GRID_SIZE;
            const y = Math.floor(idx / GRID_SIZE);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isBody = snake.slice(1).some((s) => s.x === x && s.y === y);
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={idx}
                className={`rounded-sm transition-colors ${
                  isHead
                    ? 'bg-cyan-400 shadow-md shadow-cyan-500/50'
                    : isBody
                    ? 'bg-cyan-600'
                    : isFood
                    ? 'bg-emerald-400 animate-pulse rounded-full'
                    : 'bg-slate-950/50'
                }`}
              />
            );
          })}
        </div>

        {/* Start Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-30 p-4">
            <span className="text-4xl animate-bounce">🐍</span>
            <h2 className="text-lg font-black text-white uppercase">CYBER SNAKE</h2>
            <p className="text-xs text-slate-300 text-center">Use Arrow keys or touch controls to navigate</p>
            <button
              onClick={() => setIsPlaying(true)}
              className="py-2.5 px-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg shadow-cyan-500/20"
            >
              Start Game
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-30 p-4">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase">GAME OVER</h2>
            <div className="text-xs text-slate-300">Final Score: {score} PTS</div>
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

      {/* D-Pad Touch Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { if (dirRef.current.x === 0) setDir({ x: -1, y: 0 }); }}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => { if (dirRef.current.y === 0) setDir({ x: 0, y: -1 }); }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => { if (dirRef.current.y === 0) setDir({ x: 0, y: 1 }); }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => { if (dirRef.current.x === 0) setDir({ x: 1, y: 0 }); }}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
