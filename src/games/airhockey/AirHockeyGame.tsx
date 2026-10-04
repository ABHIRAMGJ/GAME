import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw } from 'lucide-react';

interface AirHockeyGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

export const AirHockeyGame: React.FC<AirHockeyGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [targetScore, setTargetScore] = useState(5);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  const tableW = 700;
  const tableH = 400;
  const goalH = 120;
  const goalTop = (tableH - goalH) / 2;
  const goalBottom = goalTop + goalH;

  const puckRef = useRef({
    x: tableW / 2,
    y: tableH / 2,
    vx: 0,
    vy: 0,
    r: 12,
  });

  const playerMalletRef = useRef({
    x: 100,
    y: tableH / 2,
    r: 22,
  });

  const opponentMalletRef = useRef({
    x: tableW - 100,
    y: tableH / 2,
    r: 22,
  });

  // Reset puck in center after goal
  const resetPuck = (towardsPlayer = false) => {
    puckRef.current.x = tableW / 2;
    puckRef.current.y = tableH / 2;
    puckRef.current.vx = towardsPlayer ? -4 : 4;
    puckRef.current.vy = (Math.random() - 0.5) * 3;
    sounds.playMove();
  };

  useEffect(() => {
    resetPuck();
  }, []);

  // Mouse / Touch control for player mallet
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || winner) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Confine to player's left defensive half
    playerMalletRef.current.x = Math.max(30, Math.min(tableW / 2 - 30, mx));
    playerMalletRef.current.y = Math.max(30, Math.min(tableH - 30, my));

    if (isMultiplayer) {
      sendGameAction('hockey_pos', {
        x: playerMalletRef.current.x,
        y: playerMalletRef.current.y,
      });
    }
  };

  // Main Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      ctx.clearRect(0, 0, tableW, tableH);

      // Rink Surface (Ice Neon Dark)
      const rinkGrad = ctx.createLinearGradient(0, 0, tableW, tableH);
      rinkGrad.addColorStop(0, '#020617');
      rinkGrad.addColorStop(0.5, '#0f172a');
      rinkGrad.addColorStop(1, '#020617');
      ctx.fillStyle = rinkGrad;
      ctx.fillRect(0, 0, tableW, tableH);

      // Outer Rink Border
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(0, 0, tableW, tableH);

      // Center Line & Circle
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(tableW / 2, 0);
      ctx.lineTo(tableW / 2, tableH);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tableW / 2, tableH / 2, 60, 0, Math.PI * 2);
      ctx.stroke();

      // Goal Slots
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(0, goalTop, 8, goalH);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(tableW - 8, goalTop, 8, goalH);

      // Physics Update for Puck
      if (!winner) {
        const puck = puckRef.current;
        puck.vx *= 0.992;
        puck.vy *= 0.992;
        puck.x += puck.vx;
        puck.y += puck.vy;

        // Top & Bottom cushion bounce
        if (puck.y - puck.r <= 6) {
          puck.y = 6 + puck.r;
          puck.vy = -puck.vy * 0.95;
          sounds.playMove();
        } else if (puck.y + puck.r >= tableH - 6) {
          puck.y = tableH - 6 - puck.r;
          puck.vy = -puck.vy * 0.95;
          sounds.playMove();
        }

        // Left wall or Player Goal
        if (puck.x - puck.r <= 6) {
          if (puck.y >= goalTop && puck.y <= goalBottom) {
            // GOAL for Opponent!
            sounds.playExplosion();
            setOpponentScore((s) => {
              const next = s + 1;
              if (next >= targetScore) handleMatchEnd('opponent');
              return next;
            });
            resetPuck(false);
          } else {
            puck.x = 6 + puck.r;
            puck.vx = -puck.vx * 0.95;
            sounds.playMove();
          }
        }

        // Right wall or Opponent Goal
        if (puck.x + puck.r >= tableW - 6) {
          if (puck.y >= goalTop && puck.y <= goalBottom) {
            // GOAL for Player!
            sounds.playSuccess();
            setPlayerScore((s) => {
              const next = s + 1;
              if (next >= targetScore) handleMatchEnd('player');
              return next;
            });
            resetPuck(true);
          } else {
            puck.x = tableW - 6 - puck.r;
            puck.vx = -puck.vx * 0.95;
            sounds.playMove();
          }
        }

        // Mallet collisions (Player)
        const pm = playerMalletRef.current;
        const dxP = puck.x - pm.x;
        const dyP = puck.y - pm.y;
        const distP = Math.hypot(dxP, dyP);

        if (distP < puck.r + pm.r && distP > 0) {
          const nx = dxP / distP;
          const ny = dyP / distP;
          puck.vx = nx * 14;
          puck.vy = ny * 14;
          puck.x = pm.x + nx * (puck.r + pm.r + 1);
          puck.y = pm.y + ny * (puck.r + pm.r + 1);
          sounds.playMove();
        }

        // Mallet collisions (Opponent / Bot)
        const om = opponentMalletRef.current;
        const dxO = puck.x - om.x;
        const dyO = puck.y - om.y;
        const distO = Math.hypot(dxO, dyO);

        if (distO < puck.r + om.r && distO > 0) {
          const nx = dxO / distO;
          const ny = dyO / distO;
          puck.vx = nx * 14;
          puck.vy = ny * 14;
          puck.x = om.x + nx * (puck.r + om.r + 1);
          puck.y = om.y + ny * (puck.r + om.r + 1);
          sounds.playMove();
        }

        // Bot AI movement
        if (!isMultiplayer) {
          const targetY = puck.y;
          om.y += (targetY - om.y) * 0.08;

          // If puck is on bot side, strike!
          if (puck.x > tableW / 2) {
            om.x += (puck.x - om.x) * 0.06;
          } else {
            om.x += (tableW - 100 - om.x) * 0.05;
          }
        }
      }

      // Draw Puck
      const puck = puckRef.current;
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, puck.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#f87171';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Player Mallet (Cyan)
      const pm = playerMalletRef.current;
      ctx.beginPath();
      ctx.arc(pm.x, pm.y, pm.r, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Opponent Mallet (Red/Pink)
      const om = opponentMalletRef.current;
      ctx.beginPath();
      ctx.arc(om.x, om.y, om.r, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#fb7185';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    render();
    function render() {
      loop();
    }

    return () => cancelAnimationFrame(animId);
  }, [winner, targetScore]);

  const handleMatchEnd = async (victor: 'player' | 'opponent') => {
    setWinner(victor);

    if (victor === 'player') {
      sounds.playSuccess();
      confetti({ particleCount: 75, spread: 65 });
    }

    try {
      await api.recordMatch({
        gameId: 'airhockey',
        opponentId: isMultiplayer ? (currentRoom?.guestId || 'guest') : 'hockey_bot',
        opponentName: isMultiplayer ? (isHost ? currentRoom?.guestName : currentRoom?.hostName) : 'Air Hockey AI',
        isBot: !isMultiplayer,
        result: victor === 'player' ? 'win' : 'loss',
        userScore: playerScore,
        opponentScore,
        durationSeconds: 90,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestart = () => {
    setPlayerScore(0);
    setOpponentScore(0);
    setWinner(null);
    resetPuck();
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-68px)] flex flex-col items-center justify-center mx-auto p-1 sm:p-2 overflow-hidden select-none">
      {/* HUD Header */}
      <div className="w-full max-w-[calc((100vh-170px)*5/3)] flex items-center justify-between mb-1.5 py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-cyan-400">YOU</span>
          <span className="text-xl font-mono font-bold text-cyan-400">{playerScore}</span>
        </div>

        <div className="text-xs font-mono font-bold text-slate-400">
          FIRST TO {targetScore} GOALS
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xl font-mono font-bold text-red-400">{opponentScore}</span>
          <span className="text-xs font-bold text-red-400">OPPONENT</span>
        </div>
      </div>

      {/* Rink Canvas */}
      <div className="relative border-4 border-slate-700 rounded-2xl overflow-hidden shadow-2xl bg-black cursor-crosshair aspect-[5/3] max-h-[calc(100vh-160px)] max-w-[calc((100vh-160px)*5/3)] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={tableW}
          height={tableH}
          onMouseMove={handleMouseMove}
          className="block w-full h-full object-contain"
        />

        {winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <Trophy className="w-12 h-12 text-amber-400" />
            <h2 className="text-2xl font-bold text-white uppercase">
              {winner === 'player' ? 'HOCKEY CHAMPION!' : 'DEFEATED!'}
            </h2>
            <div className="text-xs text-slate-300">
              Score: {playerScore} - {opponentScore}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleRestart} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg">
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
        Move pointer inside your left half to strike the puck!
      </div>
    </div>
  );
};
