import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PoolProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPocketed: boolean;
  type: 'cue' | 'solid' | 'stripe' | 'eight';
}

export const Pool8BallGame: React.FC<PoolProps> = ({
  onBackToDashboard,
  isMultiplayer = false,
  botDifficulty = 'medium',
}) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [aimAngle, setAimAngle] = useState(0);
  const [aimPower, setAimPower] = useState(60);
  const [isSimulating, setIsSimulating] = useState(false);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const ballsRef = useRef<Ball[]>([]);
  const tableWidth = 560;
  const tableHeight = 280;
  const pocketRadius = 18;

  const pockets = [
    { x: 18, y: 18 }, { x: tableWidth / 2, y: 12 }, { x: tableWidth - 18, y: 18 },
    { x: 18, y: tableHeight - 18 }, { x: tableWidth / 2, y: tableHeight - 12 }, { x: tableWidth - 18, y: tableHeight - 18 },
  ];

  const initTable = () => {
    const list: Ball[] = [];
    // Cue Ball
    list.push({
      id: 0,
      x: 140,
      y: tableHeight / 2,
      vx: 0,
      vy: 0,
      radius: 9,
      color: '#ffffff',
      isPocketed: false,
      type: 'cue',
    });

    // 8-Ball Rack (15 balls in triangle)
    const rackStartX = 380;
    const rackStartY = tableHeight / 2;
    const r = 9;
    const ballColors = [
      '#facc15', '#3b82f6', '#ef4444', '#a855f7', '#f97316',
      '#10b981', '#991b1b', '#0f172a', '#eab308', '#2563eb',
      '#dc2626', '#9333ea', '#ea580c', '#059669', '#7f1d1d',
    ];

    let bIdx = 1;
    for (let col = 0; col < 5; col++) {
      const colX = rackStartX + col * (r * 1.75);
      const startY = rackStartY - col * r;
      for (let row = 0; row <= col; row++) {
        const colY = startY + row * (r * 2);
        list.push({
          id: bIdx,
          x: colX,
          y: colY,
          vx: 0,
          vy: 0,
          radius: r,
          color: bIdx === 8 ? '#000000' : ballColors[(bIdx - 1) % ballColors.length],
          isPocketed: false,
          type: bIdx === 8 ? 'eight' : bIdx % 2 === 0 ? 'stripe' : 'solid',
        });
        bIdx++;
      }
    }

    ballsRef.current = list;
    setIsSimulating(false);
  };

  useEffect(() => {
    initTable();
  }, []);

  const shootCueBall = () => {
    const cue = ballsRef.current.find((b) => b.id === 0);
    if (!cue || isSimulating || winner) return;

    const speed = (aimPower / 100) * 20;
    cue.vx = Math.cos(aimAngle) * speed;
    cue.vy = Math.sin(aimAngle) * speed;
    setIsSimulating(true);
    if (soundEnabled) sounds.playMove();
  };

  // Bot Turn Simulation
  useEffect(() => {
    if (turn === 'opponent' && !isMultiplayer && !isSimulating && !winner) {
      const timer = setTimeout(() => {
        const cue = ballsRef.current.find((b) => b.id === 0);
        const objectBalls = ballsRef.current.filter((b) => b.id !== 0 && !b.isPocketed);
        if (!cue || objectBalls.length === 0) return;

        // Aim towards a random ball with slight variance
        const target = objectBalls[Math.floor(Math.random() * objectBalls.length)];
        const targetAngle = Math.atan2(target.y - cue.y, target.x - cue.x) + (Math.random() - 0.5) * 0.15;
        const power = 50 + Math.random() * 30;

        setAimAngle(targetAngle);
        setAimPower(power);

        setTimeout(() => {
          const c = ballsRef.current.find((b) => b.id === 0);
          if (c) {
            c.vx = Math.cos(targetAngle) * (power / 100) * 18;
            c.vy = Math.sin(targetAngle) * (power / 100) * 18;
            setIsSimulating(true);
            if (soundEnabled) sounds.playMove();
          }
        }, 300);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [turn, isMultiplayer, isSimulating, winner]);

  // Canvas Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      ctx.clearRect(0, 0, tableWidth, tableHeight);

      // Green Felt Surface
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, tableWidth, tableHeight);

      // Wood Rail Cushions
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, tableWidth - 14, tableHeight - 14);

      // Inner Cushion Boundary
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 2;
      ctx.strokeRect(14, 14, tableWidth - 28, tableHeight - 28);

      // Pockets
      pockets.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, pocketRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Aim Line for Cue Ball
      const cue = ballsRef.current.find((b) => b.id === 0);
      if (cue && !isSimulating && !cue.isPocketed) {
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(cue.x + Math.cos(aimAngle) * 70, cue.y + Math.sin(aimAngle) * 70);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Physics
      const balls = ballsRef.current;
      let anyMoving = false;

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.isPocketed) continue;

        b.vx *= 0.985;
        b.vy *= 0.985;

        if (Math.hypot(b.vx, b.vy) > 0.05) {
          anyMoving = true;
          b.x += b.vx;
          b.y += b.vy;
        } else {
          b.vx = 0;
          b.vy = 0;
        }

        // Wall collisions
        const minX = 14 + b.radius;
        const maxX = tableWidth - 14 - b.radius;
        const minY = 14 + b.radius;
        const maxY = tableHeight - 14 - b.radius;

        if (b.x < minX) { b.x = minX; b.vx *= -0.85; }
        if (b.x > maxX) { b.x = maxX; b.vx *= -0.85; }
        if (b.y < minY) { b.y = minY; b.vy *= -0.85; }
        if (b.y > maxY) { b.y = maxY; b.vy *= -0.85; }

        // Pockets collision
        pockets.forEach((pkt) => {
          if (Math.hypot(b.x - pkt.x, b.y - pkt.y) < pocketRadius) {
            b.isPocketed = true;
            b.vx = 0;
            b.vy = 0;
            if (soundEnabled) sounds.playCapture();

            if (b.id === 0) {
              // Scratch: reset cue ball
              setTimeout(() => {
                b.isPocketed = false;
                b.x = 140;
                b.y = tableHeight / 2;
              }, 400);
            } else if (b.id === 8) {
              setWinner(turn === 'player' ? 'player' : 'opponent');
              if (turn === 'player') confetti({ particleCount: 70 });
            } else {
              if (turn === 'player') setPlayerScore((s) => s + 1);
              else setOpponentScore((s) => s + 1);
            }
          }
        });

        // Ball-to-ball collisions
        for (let j = i + 1; j < balls.length; j++) {
          const b2 = balls[j];
          if (b2.isPocketed) continue;

          const dx = b2.x - b.x;
          const dy = b2.y - b.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b.radius + b2.radius;

          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            b.x -= nx * overlap;
            b.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            const kx = b.vx - b2.vx;
            const ky = b.vy - b2.vy;
            const pComponent = (2 * (nx * kx + ny * ky)) / 2;

            b.vx -= pComponent * nx * 0.92;
            b.vy -= pComponent * ny * 0.92;
            b2.vx += pComponent * nx * 0.92;
            b2.vy += pComponent * ny * 0.92;
          }
        }

        // Draw Ball
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // 8-Ball badge
        if (b.id === 8) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }

      // Check if simulation ended
      if (isSimulating && !anyMoving) {
        setIsSimulating(false);
        setTurn((prev) => (prev === 'player' ? 'opponent' : 'player'));
      }

      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, aimAngle, turn, soundEnabled]);

  const handleRestart = () => {
    setPlayerScore(0);
    setOpponentScore(0);
    setWinner(null);
    setTurn('player');
    initTable();
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎱</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              8-Ball Billiards
            </div>
            <div className="text-[10px] text-slate-400">
              Turn: <span className="font-bold text-cyan-400">{turn === 'player' ? (user?.username || 'You') : 'Opponent Bot'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
            title="Restart Table"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Billiard Table Canvas */}
      <div className="relative border-4 border-amber-950 rounded-2xl overflow-hidden shadow-2xl bg-amber-950 max-h-[calc(100vh-210px)] max-w-full flex items-center justify-center p-2">
        <canvas ref={canvasRef} width={tableWidth} height={tableHeight} className="block w-full h-auto object-contain rounded-xl" />

        {winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 p-4">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase">
              {winner === 'player' ? 'MATCH WON! 8-BALL POCKETED!' : 'BOT POCKETED THE 8-BALL!'}
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

      {/* Cue Controls */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col gap-1.5 shadow-lg">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Aim Angle</span>
              <span className="font-mono text-cyan-400">{Math.round((aimAngle * 180) / Math.PI)}°</span>
            </div>
            <input
              type="range"
              min="-3.14"
              max="3.14"
              step="0.05"
              value={aimAngle}
              disabled={isSimulating || turn !== 'player'}
              onChange={(e) => setAimAngle(Number(e.target.value))}
              className="accent-cyan-500 cursor-pointer h-1.5"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Cue Power</span>
              <span className="font-mono text-cyan-400">{aimPower}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={aimPower}
              disabled={isSimulating || turn !== 'player'}
              onChange={(e) => setAimPower(Number(e.target.value))}
              className="accent-cyan-500 cursor-pointer h-1.5"
            />
          </div>
        </div>

        <button
          onClick={shootCueBall}
          disabled={isSimulating || turn !== 'player' || !!winner}
          className="w-full py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-lg active:scale-98 transition-all"
        >
          {isSimulating ? 'BALLS IN MOTION...' : turn === 'player' ? 'STRIKE CUE BALL 🎱' : 'OPPONENT AIMING...'}
        </button>
      </div>
    </div>
  );
};
