import React, { useRef, useState, useEffect } from 'react';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Flame } from 'lucide-react';

interface FlappyProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

export const FlappyGame: React.FC<FlappyProps> = ({ onBackToDashboard }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const width = 360;
  const height = 480;

  const stateRef = useRef({
    birdY: height / 2,
    birdVy: 0,
    pipes: [] as { x: number; top: number; bottom: number; passed: boolean }[],
  });

  const jump = () => {
    if (isGameOver) {
      handleRestart();
      return;
    }
    if (!isPlaying) {
      setIsPlaying(true);
    }
    stateRef.current.birdVy = -5.5;
    sounds.playMove();
  };

  const handleRestart = () => {
    stateRef.current = {
      birdY: height / 2,
      birdVy: 0,
      pipes: [
        { x: 300, top: 120, bottom: 220, passed: false },
        { x: 500, top: 160, bottom: 260, passed: false },
      ],
    };
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#0c4a6e');
      sky.addColorStop(1, '#075985');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      const s = stateRef.current;

      if (isPlaying && !isGameOver) {
        // Apply gravity
        s.birdVy += 0.28;
        s.birdY += s.birdVy;

        // Ground / Ceiling collision
        if (s.birdY <= 12 || s.birdY >= height - 24) {
          setIsGameOver(true);
          sounds.playExplosion();
        }

        // Pipe movements
        s.pipes.forEach((p) => {
          p.x -= 2.2;

          // Check if bird passed
          if (!p.passed && p.x < 80) {
            p.passed = true;
            sounds.playCapture();
            setScore((sc) => {
              const next = sc + 1;
              if (next > highScore) setHighScore(next);
              return next;
            });
          }

          // Pipe collision
          if (p.x < 100 && p.x + 48 > 70) {
            if (s.birdY - 12 < p.top || s.birdY + 12 > height - p.bottom) {
              setIsGameOver(true);
              sounds.playExplosion();
            }
          }
        });

        // Recycle pipes
        if (s.pipes.length > 0 && s.pipes[0].x < -60) {
          s.pipes.shift();
          const lastX = s.pipes[s.pipes.length - 1].x;
          const topH = 80 + Math.random() * 160;
          const gap = 110;
          s.pipes.push({
            x: lastX + 180,
            top: topH,
            bottom: height - topH - gap,
            passed: false,
          });
        }
      }

      // Draw Pipes
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#065f46';
      ctx.lineWidth = 3;
      s.pipes.forEach((p) => {
        // Top Pipe
        ctx.fillRect(p.x, 0, 48, p.top);
        ctx.strokeRect(p.x, 0, 48, p.top);
        // Bottom Pipe
        ctx.fillRect(p.x, height - p.bottom, 48, p.bottom);
        ctx.strokeRect(p.x, height - p.bottom, 48, p.bottom);
      });

      // Ground
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, height - 16, width, 16);

      // Draw Bird / Aviator
      ctx.save();
      ctx.translate(85, s.birdY);
      ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, s.birdVy * 0.08)));

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(-4, 2, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(7, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(12, -2);
      ctx.lineTo(20, 2);
      ctx.lineTo(12, 6);
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isGameOver, highScore]);

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Flappy Aviator
            </div>
            <div className="text-[10px] text-slate-400">Score: <span className="font-mono text-cyan-400 font-bold">{score}</span></div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> High: {highScore}
          </div>
          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Flappy Arena Canvas */}
      <div
        onClick={jump}
        className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-sky-950 cursor-pointer max-h-[calc(100vh-210px)] max-w-full flex items-center justify-center"
      >
        <canvas ref={canvasRef} width={width} height={height} className="block w-full h-auto object-contain" />

        {/* Start Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 p-4">
            <span className="text-4xl animate-bounce">🚀</span>
            <h2 className="text-lg font-black text-white uppercase">TAP TO FLY</h2>
            <p className="text-xs text-slate-300 text-center">Tap screen or press Spacebar to flap wings</p>
            <button
              onClick={jump}
              className="py-2.5 px-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg"
            >
              Take Flight
            </button>
          </div>
        )}

        {/* Game Over */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 p-4">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase">CRASHED!</h2>
            <div className="text-xs text-slate-300">Score: {score} · Best: {highScore}</div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleRestart} className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase rounded-lg">
                Fly Again
              </button>
              <button onClick={onBackToDashboard} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-400">
        Tap screen or press Spacebar to flap
      </div>
    </div>
  );
};
