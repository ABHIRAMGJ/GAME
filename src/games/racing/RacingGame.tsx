import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, Gauge, Zap, RotateCcw, Flag } from 'lucide-react';

interface RacingGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

interface CarStats {
  id: string;
  name: string;
  color: string;
  maxSpeed: number;
  accel: number;
  turnSpeed: number;
}

const CARS: CarStats[] = [
  { id: 'phantom', name: 'Phantom GT', color: '#06b6d4', maxSpeed: 6.2, accel: 0.16, turnSpeed: 0.055 },
  { id: 'inferno', name: 'Inferno Turbo', color: '#f43f5e', maxSpeed: 6.8, accel: 0.13, turnSpeed: 0.048 },
  { id: 'viper', name: 'Viper Drift', color: '#10b981', maxSpeed: 5.9, accel: 0.18, turnSpeed: 0.065 },
];

export const RacingGame: React.FC<RacingGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedCar, setSelectedCar] = useState<CarStats>(CARS[0]);
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'racing' | 'finished'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [lap, setLap] = useState(1);
  const totalLaps = 3;
  const [lapTimes, setLapTimes] = useState<number[]>([]);
  const [nitro, setNitro] = useState(100);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  // Player physics ref
  const playerRef = useRef({
    x: 140,
    y: 380,
    angle: -Math.PI / 2,
    speed: 0,
    currentCheckpoint: 0,
    lap: 1,
    lapStartTime: Date.now(),
  });

  // Opponent / Bot physics ref
  const opponentRef = useRef({
    x: 180,
    y: 380,
    angle: -Math.PI / 2,
    speed: 0,
    waypointIdx: 0,
    lap: 1,
  });

  // Skid marks
  const skidsRef = useRef<Array<{ x: number; y: number; alpha: number }>>([]);

  // Checkpoints around an oval-ish grand prix track
  const checkpoints = [
    { x: 160, y: 380, radius: 90 }, // Start / Finish line
    { x: 160, y: 180, radius: 90 },
    { x: 280, y: 100, radius: 90 },
    { x: 520, y: 100, radius: 90 },
    { x: 680, y: 180, radius: 90 },
    { x: 680, y: 380, radius: 90 },
    { x: 520, y: 440, radius: 90 },
    { x: 300, y: 440, radius: 90 },
  ];

  // Keys
  const keysRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean; nitro: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
    nitro: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;
      if (['Space', 'ShiftLeft'].includes(e.code)) keysRef.current.nitro = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
      if (['Space', 'ShiftLeft'].includes(e.code)) keysRef.current.nitro = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Multiplayer position sync
  useEffect(() => {
    if (!isMultiplayer) return;

    const cleanup = onGameAction(({ action, data }) => {
      if (action === 'race_pos') {
        opponentRef.current.x = data.x;
        opponentRef.current.y = data.y;
        opponentRef.current.angle = data.angle;
        opponentRef.current.speed = data.speed;
        opponentRef.current.lap = data.lap;
      }
    });

    return cleanup;
  }, [isMultiplayer]);

  const startRace = () => {
    setGameState('countdown');
    setCountdown(3);
    sounds.playCountdown();

    const countTimer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countTimer);
          setGameState('racing');
          sounds.playGo();
          playerRef.current.lapStartTime = Date.now();
          return 0;
        }
        sounds.playCountdown();
        return c - 1;
      });
    }, 1000);
  };

  // Main Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grass terrain
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Track Asphalt Ribbon
      ctx.lineWidth = 100;
      ctx.strokeStyle = '#1e293b';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(160, 380);
      ctx.lineTo(160, 180);
      ctx.quadraticCurveTo(160, 100, 280, 100);
      ctx.lineTo(520, 100);
      ctx.quadraticCurveTo(680, 100, 680, 180);
      ctx.lineTo(680, 380);
      ctx.quadraticCurveTo(680, 440, 520, 440);
      ctx.lineTo(300, 440);
      ctx.quadraticCurveTo(160, 440, 160, 380);
      ctx.closePath();
      ctx.stroke();

      // Track Outer Kerbs (Red/White stripes)
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#f43f5e';
      ctx.stroke();

      // Track Center Line (Dashed yellow)
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 12]);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
      ctx.stroke();
      ctx.setLineDash([]);

      // Start/Finish Line Checkerboard
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
          if ((i + j) % 2 === 0) {
            ctx.fillRect(110 + i * 16, 370 + j * 10, 16, 10);
          }
        }
      }

      // Render skid marks
      for (let i = skidsRef.current.length - 1; i >= 0; i--) {
        const s = skidsRef.current[i];
        ctx.fillStyle = `rgba(0, 0, 0, ${s.alpha})`;
        ctx.fillRect(s.x, s.y, 4, 4);
        s.alpha -= 0.005;
        if (s.alpha <= 0) skidsRef.current.splice(i, 1);
      }

      // Physics & Control Updates
      if (gameState === 'racing') {
        const p = playerRef.current;
        const keys = keysRef.current;

        // Nitro boost
        let topSpeed = selectedCar.maxSpeed;
        if (keys.nitro && nitro > 0) {
          topSpeed *= 1.4;
          setNitro((n) => Math.max(0, n - 0.4));
        } else {
          setNitro((n) => Math.min(100, n + 0.08));
        }

        if (keys.up) {
          p.speed = Math.min(topSpeed, p.speed + selectedCar.accel);
        } else if (keys.down) {
          p.speed = Math.max(-2, p.speed - selectedCar.accel * 1.5);
        } else {
          p.speed *= 0.96; // Rolling friction
        }

        if (Math.abs(p.speed) > 0.3) {
          const dir = p.speed > 0 ? 1 : -1;
          if (keys.left) p.angle -= selectedCar.turnSpeed * dir;
          if (keys.right) p.angle += selectedCar.turnSpeed * dir;

          // Skid marks when turning at high speed
          if (Math.abs(p.speed) > 4 && (keys.left || keys.right)) {
            skidsRef.current.push({ x: p.x, y: p.y, alpha: 0.6 });
          }
        }

        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        // Checkpoint / Lap progress detection
        const nextCp = checkpoints[(p.currentCheckpoint + 1) % checkpoints.length];
        const distToNext = Math.hypot(p.x - nextCp.x, p.y - nextCp.y);

        if (distToNext < nextCp.radius) {
          p.currentCheckpoint = (p.currentCheckpoint + 1) % checkpoints.length;

          // Completed a lap
          if (p.currentCheckpoint === 0) {
            const lapTime = (Date.now() - p.lapStartTime) / 1000;
            setLapTimes((prev) => [...prev, lapTime]);
            p.lapStartTime = Date.now();
            sounds.playSuccess();

            if (p.lap >= totalLaps) {
              // Finished race!
              finishRace('player');
            } else {
              p.lap++;
              setLap(p.lap);
            }
          }
        }

        // Multiplayer transmit
        if (isMultiplayer && Math.random() < 0.3) {
          sendGameAction('race_pos', {
            x: p.x,
            y: p.y,
            angle: p.angle,
            speed: p.speed,
            lap: p.lap,
          });
        }

        // Bot AI Update (Follows checkpoints smoothly)
        if (!isMultiplayer) {
          const opp = opponentRef.current;
          const targetWp = checkpoints[opp.waypointIdx];
          const targetAngle = Math.atan2(targetWp.y - opp.y, targetWp.x - opp.x);

          let angleDiff = targetAngle - opp.angle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          opp.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.05);
          opp.speed = Math.min(5.6, opp.speed + 0.12);
          opp.x += Math.cos(opp.angle) * opp.speed;
          opp.y += Math.sin(opp.angle) * opp.speed;

          if (Math.hypot(opp.x - targetWp.x, opp.y - targetWp.y) < 70) {
            opp.waypointIdx = (opp.waypointIdx + 1) % checkpoints.length;
            if (opp.waypointIdx === 0) {
              opp.lap++;
              if (opp.lap > totalLaps && !winner) {
                finishRace('opponent');
              }
            }
          }
        }
      }

      // Draw Opponent Car (Red/Orange)
      const opp = opponentRef.current;
      ctx.save();
      ctx.translate(opp.x, opp.y);
      ctx.rotate(opp.angle);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-16, -9, 32, 18);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(-8, -7, 16, 14); // Cabin
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(10, -8, 4, 16); // Headlights
      ctx.restore();

      // Draw Player Car (Selected Color)
      const p = playerRef.current;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = selectedCar.color;
      ctx.fillRect(-16, -9, 32, 18);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8, -7, 16, 14); // Cabin
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(10, -8, 4, 16); // Headlights
      // Nitro exhaust flames
      if (keysRef.current.nitro && nitro > 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-16, -4);
        ctx.lineTo(-24 - Math.random() * 8, 0);
        ctx.lineTo(-16, 4);
        ctx.fill();
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    render();
    function render() {
      loop();
    }

    return () => cancelAnimationFrame(animId);
  }, [gameState, nitro, selectedCar]);

  const finishRace = async (victor: 'player' | 'opponent') => {
    setGameState('finished');
    setWinner(victor);

    if (victor === 'player') {
      sounds.playSuccess();
      confetti({ particleCount: 90, spread: 80 });
    }

    try {
      await api.recordMatch({
        gameId: 'racing',
        opponentId: isMultiplayer ? (currentRoom?.guestId || 'guest') : 'bot_racer',
        opponentName: isMultiplayer ? (isHost ? currentRoom?.guestName : currentRoom?.hostName) : 'Racer Bot',
        isBot: !isMultiplayer,
        result: victor === 'player' ? 'win' : 'loss',
        userScore: victor === 'player' ? 1 : 0,
        opponentScore: victor === 'player' ? 0 : 1,
        durationSeconds: 120,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const restartRace = () => {
    playerRef.current = {
      x: 140,
      y: 380,
      angle: -Math.PI / 2,
      speed: 0,
      currentCheckpoint: 0,
      lap: 1,
      lapStartTime: Date.now(),
    };
    opponentRef.current = {
      x: 180,
      y: 380,
      angle: -Math.PI / 2,
      speed: 0,
      waypointIdx: 0,
      lap: 1,
    };
    setLap(1);
    setLapTimes([]);
    setNitro(100);
    setWinner(null);
    setGameState('ready');
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-68px)] flex flex-col items-center justify-center mx-auto p-1 sm:p-2 overflow-hidden select-none">
      {/* HUD Header */}
      <div className="w-full max-w-[calc((100vh-160px)*16/10)] flex items-center justify-between mb-1.5 py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lap</span>
          <span className="text-base font-mono font-bold text-cyan-400">
            {lap} / {totalLaps}
          </span>
        </div>

        {/* Nitro Meter */}
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-400">NITRO</span>
          <div className="w-24 sm:w-32 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div className="bg-cyan-400 h-full transition-all" style={{ width: `${nitro}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span><strong className="text-slate-200">WASD/Arrows</strong> · <strong className="text-cyan-400">Space (Nitro)</strong></span>
        </div>
      </div>

      {/* Canvas Racetrack */}
      <div className="relative w-full aspect-[16/10] max-h-[calc(100vh-160px)] max-w-[calc((100vh-160px)*16/10)] border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-950 flex items-center justify-center">
        <canvas ref={canvasRef} width={840} height={525} className="w-full h-full block" />

        {/* Countdown Overlay */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-7xl font-extrabold font-mono text-cyan-400 animate-bounce">
              {countdown}
            </div>
          </div>
        )}

        {/* Pre-Race Ready Overlay */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
            <Flag className="w-12 h-12 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white tracking-wide">GRAND PRIX 2D RACING</h2>
            <div className="flex gap-2">
              {CARS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCar(c)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    selectedCar.id === c.id ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <button
              onClick={startRace}
              className="py-3 px-8 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm uppercase rounded-lg shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              Start Race! 🏁
            </button>
          </div>
        )}

        {/* Finished Race Results Overlay */}
        {gameState === 'finished' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
            <Trophy className={`w-14 h-14 ${winner === 'player' ? 'text-amber-400' : 'text-slate-500'}`} />
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
              {winner === 'player' ? '1ST PLACE — SPEED DEMON!' : '2ND PLACE — FINISHED!'}
            </h2>
            <div className="text-xs text-slate-300 font-mono space-y-1">
              {lapTimes.map((lt, i) => (
                <div key={i}>Lap {i + 1}: {lt.toFixed(2)}s</div>
              ))}
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={restartRace} className="py-2 px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg">
                Race Again
              </button>
              <button onClick={onBackToDashboard} className="py-2 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
