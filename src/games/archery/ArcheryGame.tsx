import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, Wind, Target, RotateCcw } from 'lucide-react';

interface ArcheryGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

export const ArcheryGame: React.FC<ArcheryGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [round, setRound] = useState(1);
  const totalRounds = 5;
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [playerScoresHistory, setPlayerScoresHistory] = useState<number[]>([]);
  const [opponentScoresHistory, setOpponentScoresHistory] = useState<number[]>([]);

  const [wind, setWind] = useState(0); // -20 to +20
  const [isCharging, setIsCharging] = useState(false);
  const [power, setPower] = useState(0);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  // Reticle aim coordinates
  const aimRef = useRef({ x: 350, y: 220, swayTime: 0 });
  const mousePosRef = useRef({ x: 350, y: 220 });
  const arrowRef = useRef<{ x: number; y: number; z: number; vz: number; targetX: number; targetY: number } | null>(null);

  // Reset wind each round
  useEffect(() => {
    setWind(Math.round((Math.random() - 0.5) * 30));
  }, [round]);

  const handleMouseDown = () => {
    if (arrowRef.current || winner) return;
    setIsCharging(true);
    setPower(0);
  };

  const handleMouseUp = () => {
    if (!isCharging || arrowRef.current || winner) return;
    setIsCharging(false);

    // Release arrow
    sounds.playMove();

    // Wind drift & power drop
    const windDrift = wind * 2.2;
    const powerDeficit = (100 - power) * 0.9;

    const hitX = aimRef.current.x + windDrift;
    const hitY = aimRef.current.y + powerDeficit;

    arrowRef.current = {
      x: 350,
      y: 400,
      z: 0,
      vz: 0.05,
      targetX: hitX,
      targetY: hitY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mousePosRef.current.x = (e.clientX - rect.left) * scaleX;
    mousePosRef.current.y = (e.clientY - rect.top) * scaleY;
  };

  // Charge power tick
  useEffect(() => {
    if (!isCharging) return;
    const interval = setInterval(() => {
      setPower((p) => {
        if (p >= 100) return 100;
        return p + 4;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isCharging]);

  // Main Render & Sway Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Outdoor Archery Range Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#0284c7');
      bgGrad.addColorStop(0.5, '#bae6fd');
      bgGrad.addColorStop(0.5, '#15803d');
      bgGrad.addColorStop(1, '#166534');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Archery Target Stand & Butt (Center at 350, 200)
      const tcX = 350;
      const tcY = 200;

      // Stand legs
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(tcX - 50, tcY + 120);
      ctx.lineTo(tcX, tcY);
      ctx.lineTo(tcX + 50, tcY + 120);
      ctx.stroke();

      // Target Concentric Rings (Standard Olympic colors)
      const ringRadii = [80, 64, 48, 32, 16, 6];
      const ringColors = ['#f8fafc', '#1e293b', '#3b82f6', '#ef4444', '#facc15', '#eab308'];

      ringRadii.forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(tcX, tcY, r, 0, Math.PI * 2);
        ctx.fillStyle = ringColors[idx];
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      });

      // Reticle Natural Hand Sway
      aimRef.current.swayTime += 0.04;
      const swayX = Math.sin(aimRef.current.swayTime) * 12;
      const swayY = Math.cos(aimRef.current.swayTime * 1.3) * 10;
      aimRef.current.x = mousePosRef.current.x + swayX;
      aimRef.current.y = mousePosRef.current.y + swayY;

      // Draw Reticle (when not flying)
      if (!arrowRef.current && !winner) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        const ax = aimRef.current.x;
        const ay = aimRef.current.y;

        ctx.beginPath();
        ctx.arc(ax, ay, 18, 0, Math.PI * 2);
        ctx.moveTo(ax - 24, ay);
        ctx.lineTo(ax + 24, ay);
        ctx.moveTo(ax, ay - 24);
        ctx.lineTo(ax, ay + 24);
        ctx.stroke();
      }

      // Arrow Flying Animation (3D scale interpolation)
      if (arrowRef.current) {
        const arr = arrowRef.current;
        arr.z += arr.vz;

        const currentX = 350 + (arr.targetX - 350) * arr.z;
        const currentY = 400 + (arr.targetY - 400) * arr.z - Math.sin(arr.z * Math.PI) * 40;
        const arrowScale = 1 - arr.z * 0.7;

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.scale(arrowScale, arrowScale);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-2, -15, 4, 30);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-6, 15);
        ctx.lineTo(0, 24);
        ctx.lineTo(6, 15);
        ctx.fill();
        ctx.restore();

        if (arr.z >= 1) {
          // Arrow reached target
          const hitDist = Math.hypot(arr.targetX - tcX, arr.targetY - tcY);
          let scored = 0;
          if (hitDist <= 6) scored = 10; // Bullseye!
          else if (hitDist <= 16) scored = 9;
          else if (hitDist <= 32) scored = 8;
          else if (hitDist <= 48) scored = 6;
          else if (hitDist <= 64) scored = 4;
          else if (hitDist <= 80) scored = 2;

          sounds.playCapture();
          if (scored === 10) {
            sounds.playSuccess();
            confetti({ particleCount: 50, spread: 50 });
          }

          setPlayerScore((s) => s + scored);
          setPlayerScoresHistory((prev) => [...prev, scored]);

          // Opponent / Bot score simulation
          const botScored = Math.max(4, Math.floor(Math.random() * 6) + 5);
          setOpponentScore((s) => s + botScored);
          setOpponentScoresHistory((prev) => [...prev, botScored]);

          arrowRef.current = null;

          if (round >= totalRounds) {
            finishArcheryMatch(playerScore + scored, opponentScore + botScored);
          } else {
            setRound((r) => r + 1);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    render();
    function render() {
      loop();
    }

    return () => cancelAnimationFrame(animId);
  }, [round, winner, playerScore, opponentScore]);

  const finishArcheryMatch = async (finalP: number, finalO: number) => {
    const isPlayerWin = finalP >= finalO;
    setWinner(isPlayerWin ? 'player' : 'opponent');

    if (isPlayerWin) {
      sounds.playSuccess();
      confetti({ particleCount: 75, spread: 65 });
    }

    try {
      await api.recordMatch({
        gameId: 'archery',
        opponentId: isMultiplayer ? (currentRoom?.guestId || 'guest') : 'bot_archer',
        opponentName: isMultiplayer ? (isHost ? currentRoom?.guestName : currentRoom?.hostName) : 'Archer AI',
        isBot: !isMultiplayer,
        result: isPlayerWin ? 'win' : 'loss',
        userScore: finalP,
        opponentScore: finalO,
        durationSeconds: 90,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const restartMatch = () => {
    setRound(1);
    setPlayerScore(0);
    setOpponentScore(0);
    setPlayerScoresHistory([]);
    setOpponentScoresHistory([]);
    setWinner(null);
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-68px)] flex flex-col items-center justify-center mx-auto p-1 sm:p-2 overflow-hidden select-none">
      {/* Header */}
      <div className="w-full max-w-[calc((100vh-170px)*5/3)] flex items-center justify-between mb-1.5 py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-cyan-400">YOU</span>
          <span className="text-base font-mono font-bold text-slate-100">{playerScore} PTS</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            <Wind className={`w-3.5 h-3.5 ${wind > 0 ? 'text-cyan-400' : 'text-amber-400'}`} />
            Wind: {Math.abs(wind)} {wind > 0 ? '→' : '←'}
          </div>
          <span className="text-xs font-bold font-mono text-slate-400">ROUND {round} / {totalRounds}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-base font-mono font-bold text-slate-100">{opponentScore} PTS</span>
          <span className="text-xs font-bold text-red-400">OPPONENT</span>
        </div>
      </div>

      {/* Archery Canvas Range */}
      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-black cursor-none aspect-[5/3] max-h-[calc(100vh-160px)] max-w-[calc((100vh-160px)*5/3)] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={700}
          height={420}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className="block w-full h-full object-contain"
        />

        {/* Tension Power Bar */}
        {isCharging && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 bg-slate-900/80 p-2 rounded-xl border border-slate-700 backdrop-blur-sm flex flex-col items-center gap-1">
            <span className="text-[10px] text-slate-300 font-bold uppercase">Bow Tension</span>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-600">
              <div
                className={`h-full transition-all ${power > 85 ? 'bg-emerald-400' : power > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${power}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Release to Loose Arrow</span>
          </div>
        )}

        {winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <Trophy className="w-12 h-12 text-amber-400" />
            <h2 className="text-2xl font-bold text-white uppercase">
              {winner === 'player' ? 'BULLSEYE MASTER — VICTORY!' : 'TOURNAMENT OVER!'}
            </h2>
            <div className="text-xs text-slate-300">
              Final Score: {playerScore} - {opponentScore}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={restartMatch} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg">
                Rematch
              </button>
              <button onClick={onBackToDashboard} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-500 mt-1">
        Hold mouse button / tap to draw the bow, compensate for wind drift, and release to hit the gold 10 bullseye!
      </div>
    </div>
  );
};
