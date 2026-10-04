import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Crosshair, Wind, Zap, RotateCcw, Bot, Shield, Trophy } from 'lucide-react';

interface TanksGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

type WeaponType = 'Rocket' | 'Heavy Shell' | 'Cluster Shot' | 'Bounce Bomb' | 'Air Strike';

interface WeaponInfo {
  name: WeaponType;
  damage: number;
  blastRadius: number;
  count: number;
  description: string;
}

const WEAPONS_CATALOG: WeaponInfo[] = [
  { name: 'Rocket', damage: 30, blastRadius: 28, count: 99, description: 'Standard high-velocity ballistic explosive.' },
  { name: 'Heavy Shell', damage: 55, blastRadius: 45, count: 3, description: 'Massive blast crater with extreme kinetic trauma.' },
  { name: 'Cluster Shot', damage: 45, blastRadius: 32, count: 3, description: 'Splits into 3 fragmentation shells at apex.' },
  { name: 'Bounce Bomb', damage: 40, blastRadius: 30, count: 3, description: 'Ricochets across terrain before detonating.' },
  { name: 'Air Strike', damage: 50, blastRadius: 35, count: 2, description: 'Calls 3 vertical kinetic missile strikes from above.' },
];

export const TanksGame: React.FC<TanksGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [playerAngle, setPlayerAngle] = useState(45);
  const [playerPower, setPlayerPower] = useState(65);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('Rocket');
  const [weapons, setWeapons] = useState<Record<WeaponType, number>>({
    Rocket: 99,
    'Heavy Shell': 3,
    'Cluster Shot': 3,
    'Bounce Bomb': 3,
    'Air Strike': 2,
  });

  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [playerHp, setPlayerHp] = useState(100);
  const [opponentHp, setOpponentHp] = useState(100);
  const [wind, setWind] = useState(0); // -50 to +50
  const [isFiring, setIsFiring] = useState(false);
  const [gameOver, setGameOver] = useState<'win' | 'loss' | null>(null);
  const [turnTimer, setTurnTimer] = useState(30);

  // Terrain heightmap array (width 800)
  const terrainRef = useRef<number[]>([]);
  const projectileRef = useRef<any[]>([]);
  const explosionsRef = useRef<Array<{ x: number; y: number; r: number; maxR: number; alpha: number }>>([]);

  const playerPosRef = useRef({ x: 120, y: 0 });
  const opponentPosRef = useRef({ x: 680, y: 0 });

  // Initialize terrain
  const initTerrain = () => {
    const w = 800;
    const h = 450;
    const heights: number[] = [];

    // Perlin-like hills generator
    const hill1 = Math.random() * 80 + 40;
    const hill2 = Math.random() * 50 + 20;

    for (let x = 0; x < w; x++) {
      const base = h - 140;
      const y1 = Math.sin((x / w) * Math.PI * 2.5) * hill1;
      const y2 = Math.cos((x / w) * Math.PI * 4) * hill2;
      const y3 = Math.sin((x / 50)) * 6;
      heights.push(Math.round(base - y1 - y2 - y3));
    }

    terrainRef.current = heights;

    playerPosRef.current.x = 120;
    playerPosRef.current.y = heights[120] - 10;

    opponentPosRef.current.x = 680;
    opponentPosRef.current.y = heights[680] - 10;

    setWind(Math.round((Math.random() - 0.5) * 60));
  };

  useEffect(() => {
    initTerrain();
  }, []);

  // Sync with multiplayer room
  useEffect(() => {
    if (isMultiplayer && currentRoom) {
      setTurn(isHost ? 'player' : 'opponent');
    }
  }, [isMultiplayer, currentRoom, isHost]);

  // Turn timer
  useEffect(() => {
    if (gameOver || isFiring) return;

    const timer = setInterval(() => {
      setTurnTimer((t) => {
        if (t <= 1) {
          // Switch turn on timeout
          setTurn((curr) => (curr === 'player' ? 'opponent' : 'player'));
          return 30;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, isFiring, turn]);

  // Handle network actions
  useEffect(() => {
    if (!isMultiplayer) return;

    const cleanup = onGameAction(({ action, data }) => {
      if (action === 'tank_fire') {
        launchOpponentProjectile(data.angle, data.power, data.weapon);
      }
    });

    return cleanup;
  }, [isMultiplayer]);

  // Trigger Bot Turn
  useEffect(() => {
    if (!isMultiplayer && turn === 'opponent' && !gameOver && !isFiring) {
      const timer = setTimeout(() => {
        botTurn();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [turn, isMultiplayer, gameOver, isFiring]);

  const botTurn = () => {
    const pX = playerPosRef.current.x;
    const pY = playerPosRef.current.y;
    const oX = opponentPosRef.current.x;
    const oY = opponentPosRef.current.y;

    const dx = pX - oX;
    const dy = pY - oY;
    const distance = Math.abs(dx);

    // AI ballistic trajectory estimation with wind compensation
    let estimatedAngle = 135;
    let estimatedPower = Math.min(100, Math.max(30, Math.round(distance / 7.2 - wind * 0.25 + (Math.random() - 0.5) * 8)));

    const botWeapons: WeaponType[] = ['Rocket', 'Heavy Shell', 'Cluster Shot'];
    const chosenWeapon = botWeapons[Math.floor(Math.random() * botWeapons.length)];

    launchOpponentProjectile(estimatedAngle, estimatedPower, chosenWeapon);
  };

  const deformTerrain = (cx: number, cy: number, radius: number) => {
    const heights = terrainRef.current;
    const rSq = radius * radius;

    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(heights.length - 1, Math.ceil(cx + radius)); x++) {
      const dx = x - cx;
      const dyMax = Math.sqrt(Math.max(0, rSq - dx * dx));
      const craterFloor = cy + dyMax;
      if (heights[x] < craterFloor) {
        heights[x] = Math.min(440, Math.round(craterFloor));
      }
    }

    // Adjust tank positions if terrain collapsed beneath them
    const px = Math.round(playerPosRef.current.x);
    if (px >= 0 && px < heights.length) {
      playerPosRef.current.y = heights[px] - 10;
    }
    const ox = Math.round(opponentPosRef.current.x);
    if (ox >= 0 && ox < heights.length) {
      opponentPosRef.current.y = heights[ox] - 10;
    }
  };

  const handleFire = () => {
    if (isFiring || turn !== 'player' || gameOver) return;
    if (weapons[selectedWeapon] <= 0) return;

    // Deduct ammo
    setWeapons((prev) => ({ ...prev, [selectedWeapon]: prev[selectedWeapon] - 1 }));
    setIsFiring(true);
    sounds.playMove();

    if (isMultiplayer) {
      sendGameAction('tank_fire', { angle: playerAngle, power: playerPower, weapon: selectedWeapon });
    }

    const rad = (playerAngle * Math.PI) / 180;
    const speed = playerPower * 0.22;
    const vx = Math.cos(rad) * speed;
    const vy = -Math.sin(rad) * speed;

    projectileRef.current = [
      {
        x: playerPosRef.current.x + 15,
        y: playerPosRef.current.y - 12,
        vx,
        vy,
        weapon: selectedWeapon,
        bounces: 2,
        isFromPlayer: true,
      },
    ];
  };

  const launchOpponentProjectile = (angle: number, power: number, weapon: WeaponType) => {
    setIsFiring(true);
    sounds.playMove();

    const rad = (angle * Math.PI) / 180;
    const speed = power * 0.22;
    const vx = -Math.cos((180 - angle) * (Math.PI / 180)) * speed;
    const vy = -Math.sin((180 - angle) * (Math.PI / 180)) * speed;

    projectileRef.current = [
      {
        x: opponentPosRef.current.x - 15,
        y: opponentPosRef.current.y - 12,
        vx: -Math.abs(vx),
        vy,
        weapon,
        bounces: 2,
        isFromPlayer: false,
      },
    ];
  };

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky background gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#090d16');
      skyGrad.addColorStop(0.7, '#151d2f');
      skyGrad.addColorStop(1, '#1b2438');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137.5) % canvas.width);
        const sy = ((i * 73.1) % (canvas.height - 180));
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Draw Terrain
      const heights = terrainRef.current;
      if (heights.length > 0) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        ctx.lineTo(0, heights[0]);
        for (let x = 1; x < heights.length; x++) {
          ctx.lineTo(x, heights[x]);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();

        const terrainGrad = ctx.createLinearGradient(0, 200, 0, canvas.height);
        terrainGrad.addColorStop(0, '#10b981');
        terrainGrad.addColorStop(0.08, '#065f46');
        terrainGrad.addColorStop(0.3, '#1c1917');
        terrainGrad.addColorStop(1, '#0c0a09');
        ctx.fillStyle = terrainGrad;
        ctx.fill();

        // Edge stroke
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#34d399';
        ctx.stroke();
      }

      // Draw Player Tank (Cyan)
      const p = playerPosRef.current;
      ctx.save();
      ctx.translate(p.x, p.y);
      // Tank body
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-16, -6, 32, 10);
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(-18, 0, 36, 6);
      // Turret
      ctx.beginPath();
      ctx.arc(0, -6, 8, Math.PI, 0);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
      // Barrel
      const pRad = (playerAngle * Math.PI) / 180;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#67e8f9';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(Math.cos(pRad) * 20, -Math.sin(pRad) * 20 - 6);
      ctx.stroke();
      ctx.restore();

      // Draw Opponent Tank (Red/Crimson)
      const o = opponentPosRef.current;
      ctx.save();
      ctx.translate(o.x, o.y);
      // Tank body
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-16, -6, 32, 10);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(-18, 0, 36, 6);
      // Turret
      ctx.beginPath();
      ctx.arc(0, -6, 8, Math.PI, 0);
      ctx.fillStyle = '#fb7185';
      ctx.fill();
      // Barrel
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fda4af';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-Math.cos(0.7) * 20, -Math.sin(0.7) * 20 - 6);
      ctx.stroke();
      ctx.restore();

      // Update & Render Projectiles
      const gravity = 0.28;
      const windForce = wind * 0.003;

      for (let i = projectileRef.current.length - 1; i >= 0; i--) {
        const proj = projectileRef.current[i];
        proj.vx += windForce;
        proj.vy += gravity;
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Draw projectile
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;

        // Trail
        ctx.beginPath();
        ctx.arc(proj.x - proj.vx * 1.5, proj.y - proj.vy * 1.5, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Cluster shot split at apex
        if (proj.weapon === 'Cluster Shot' && proj.vy > 0 && !proj.hasSplit) {
          proj.hasSplit = true;
          projectileRef.current.push(
            { x: proj.x, y: proj.y, vx: proj.vx - 1.8, vy: proj.vy, weapon: 'Rocket', isFromPlayer: proj.isFromPlayer },
            { x: proj.x, y: proj.y, vx: proj.vx + 1.8, vy: proj.vy, weapon: 'Rocket', isFromPlayer: proj.isFromPlayer }
          );
        }

        const tx = Math.floor(proj.x);
        const terrainHeightAtX = heights[tx] ?? canvas.height;

        // Collision with terrain or ground
        if (proj.y >= terrainHeightAtX || proj.y >= canvas.height || proj.x < 0 || proj.x > canvas.width) {
          if (proj.weapon === 'Bounce Bomb' && proj.bounces > 0) {
            proj.bounces--;
            proj.vy = -proj.vy * 0.65;
            proj.vx *= 0.8;
            sounds.playMove();
            continue;
          }

          // Detonation
          const weaponMeta = WEAPONS_CATALOG.find((w) => w.name === proj.weapon) || WEAPONS_CATALOG[0];
          explosionsRef.current.push({ x: proj.x, y: proj.y, r: 4, maxR: weaponMeta.blastRadius, alpha: 1 });
          deformTerrain(proj.x, proj.y, weaponMeta.blastRadius);
          sounds.playExplosion();

          // Calculate damage
          const distToPlayer = Math.hypot(proj.x - p.x, proj.y - p.y);
          const distToOpponent = Math.hypot(proj.x - o.x, proj.y - o.y);

          if (distToPlayer < weaponMeta.blastRadius + 15) {
            const dmg = Math.round(weaponMeta.damage * (1 - distToPlayer / (weaponMeta.blastRadius + 20)));
            setPlayerHp((prev) => {
              const next = Math.max(0, prev - dmg);
              if (next === 0) handleMatchEnd('loss');
              return next;
            });
          }

          if (distToOpponent < weaponMeta.blastRadius + 15) {
            const dmg = Math.round(weaponMeta.damage * (1 - distToOpponent / (weaponMeta.blastRadius + 20)));
            setOpponentHp((prev) => {
              const next = Math.max(0, prev - dmg);
              if (next === 0) handleMatchEnd('win');
              return next;
            });
          }

          projectileRef.current.splice(i, 1);
        }
      }

      // Render explosions
      for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
        const exp = explosionsRef.current[i];
        exp.r += 2.8;
        exp.alpha -= 0.05;

        if (exp.alpha <= 0) {
          explosionsRef.current.splice(i, 1);
          continue;
        }

        const expGrad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.r);
        expGrad.addColorStop(0, `rgba(255, 255, 255, ${exp.alpha})`);
        expGrad.addColorStop(0.3, `rgba(251, 146, 60, ${exp.alpha})`);
        expGrad.addColorStop(0.8, `rgba(239, 68, 68, ${exp.alpha * 0.7})`);
        expGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = expGrad;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // End of firing cycle
      if (isFiring && projectileRef.current.length === 0 && explosionsRef.current.length === 0) {
        setIsFiring(false);
        setWind(Math.round((Math.random() - 0.5) * 60));
        setTurn((prev) => (prev === 'player' ? 'opponent' : 'player'));
        setTurnTimer(30);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [playerAngle, playerPower, isFiring, wind]);

  const handleMatchEnd = async (result: 'win' | 'loss') => {
    setGameOver(result);
    if (result === 'win') {
      sounds.playSuccess();
      confetti({ particleCount: 70, spread: 60 });
    }

    try {
      await api.recordMatch({
        gameId: 'tanks',
        opponentId: isMultiplayer ? (currentRoom?.guestId || 'guest') : 'tank_bot',
        opponentName: isMultiplayer ? (isHost ? currentRoom?.guestName : currentRoom?.hostName) : 'Artillery Bot',
        isBot: !isMultiplayer,
        result,
        userScore: result === 'win' ? 100 : playerHp,
        opponentScore: result === 'win' ? 0 : opponentHp,
        durationSeconds: 90,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRematch = () => {
    setPlayerHp(100);
    setOpponentHp(100);
    setGameOver(null);
    setTurn('player');
    setTurnTimer(30);
    initTerrain();
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-68px)] flex flex-col items-center justify-center mx-auto p-1 sm:p-2 overflow-hidden select-none">
      {/* HUD Header */}
      <div className="w-full max-w-[calc((100vh-210px)*16/9)] flex items-center justify-between mb-1.5 py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-cyan-400">YOU (Cyan Tank)</div>
          <div className="w-24 sm:w-32 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${playerHp}%` }} />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300">{playerHp} HP</span>
        </div>

        {/* Turn & Wind Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
            <Wind className={`w-3.5 h-3.5 ${wind > 0 ? 'text-cyan-400' : 'text-amber-400'}`} />
            Wind: {Math.abs(wind)} {wind > 0 ? '→' : '←'}
          </div>

          <div className={`px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${
            turn === 'player' ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40' : 'bg-red-950/60 text-red-300 border-red-500/40'
          }`}>
            {turn === 'player' ? 'YOUR TURN' : 'OPPONENT AIMING'} ({turnTimer}s)
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-300">{opponentHp} HP</span>
          <div className="w-24 sm:w-32 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${opponentHp}%` }} />
          </div>
          <div className="text-xs font-bold text-red-400">
            {isMultiplayer ? currentRoom?.guestName || 'Opponent' : 'BOT (Red Tank)'}
          </div>
        </div>
      </div>

      {/* Battlefield Canvas */}
      <div className="relative w-full aspect-[16/9] max-h-[calc(100vh-210px)] max-w-[calc((100vh-210px)*16/9)] border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-black">
        <canvas ref={canvasRef} width={800} height={450} className="w-full h-full block" />

        {/* Victory / Defeat Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
            <Trophy className={`w-14 h-14 ${gameOver === 'win' ? 'text-amber-400' : 'text-slate-500'}`} />
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
              {gameOver === 'win' ? 'VICTORY — TANK DESTROYER!' : 'DEFEATED IN COMBAT'}
            </h2>
            <p className="text-xs text-slate-400">
              {gameOver === 'win' ? 'Target neutralized with precision ballistics.' : 'Your armor was breached.'}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleRematch}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-indigo-600/20"
              >
                Rematch
              </button>
              <button
                onClick={onBackToDashboard}
                className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
              >
                Exit to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="w-full max-w-[calc((100vh-210px)*16/9)] mt-1.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
        {/* Angle Slider */}
        <div className="flex-1 w-full flex flex-col gap-0.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300"><Crosshair className="w-3.5 h-3.5 text-cyan-400" /> Angle</span>
            <span className="font-mono text-cyan-400">{playerAngle}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            value={playerAngle}
            disabled={turn !== 'player' || isFiring}
            onChange={(e) => setPlayerAngle(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* Power Slider */}
        <div className="flex-1 w-full flex flex-col gap-0.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300"><Zap className="w-3.5 h-3.5 text-amber-400" /> Power</span>
            <span className="font-mono text-amber-400">{playerPower}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={playerPower}
            disabled={turn !== 'player' || isFiring}
            onChange={(e) => setPlayerPower(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Weapon Selector */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-slate-400 font-semibold">Weapon</label>
          <div className="flex gap-1 overflow-x-auto">
            {WEAPONS_CATALOG.map((w) => (
              <button
                key={w.name}
                onClick={() => setSelectedWeapon(w.name)}
                disabled={weapons[w.name] <= 0 || turn !== 'player' || isFiring}
                className={`py-1 px-2 text-xs font-semibold rounded border transition-all ${
                  selectedWeapon === w.name
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                } ${weapons[w.name] <= 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                {w.name} ({weapons[w.name]})
              </button>
            ))}
          </div>
        </div>

        {/* FIRE BUTTON */}
        <button
          onClick={handleFire}
          disabled={turn !== 'player' || isFiring || weapons[selectedWeapon] <= 0 || !!gameOver}
          className="w-full md:w-28 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs tracking-wider uppercase rounded-lg shadow-lg shadow-red-600/30 active:scale-95 transition-all"
        >
          {isFiring ? 'FIRING...' : 'FIRE! 💥'}
        </button>
      </div>
    </div>
  );
};
