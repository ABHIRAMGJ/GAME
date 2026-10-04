import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Target, Shield, Users, Volume2, VolumeX, ArrowLeft } from 'lucide-react';

interface CarromGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

interface Piece {
  id: string;
  type: 'white' | 'black' | 'queen' | 'striker';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPocketed: boolean;
}

export type CarromSeat = 0 | 1 | 2 | 3; // 0: South (Player 1), 1: West (Player 2), 2: North (Player 3), 3: East (Player 4)

interface PlayerInfo {
  seat: CarromSeat;
  name: string;
  isBot: boolean;
  avatar: string;
  team: 'white' | 'black';
  colorLabel: string;
}

export const CarromGame: React.FC<CarromGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<2 | 4>(4); // 2 Players or 4 Players
  const [activeSeat, setActiveSeat] = useState<CarromSeat>(0);

  // Scores
  const [teamWhiteScore, setTeamWhiteScore] = useState(0); // Seats 0 & 2
  const [teamBlackScore, setTeamBlackScore] = useState(0); // Seats 1 & 3
  const [seatScores, setSeatScores] = useState<[number, number, number, number]>([0, 0, 0, 0]);

  // Striker baseline slider (coordinate along active baseline, 120..380)
  const [strikerBaselinePos, setStrikerBaselinePos] = useState(250);
  const [aimAngle, setAimAngle] = useState(-Math.PI / 2);
  const [aimPower, setAimPower] = useState(55);
  const [isSimulating, setIsSimulating] = useState(false);
  const [winner, setWinner] = useState<'white' | 'black' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const piecesRef = useRef<Piece[]>([]);
  const boardSize = 500;
  const pocketRadius = 24;

  const pockets = [
    { x: 30, y: 30 },
    { x: boardSize - 30, y: 30 },
    { x: 30, y: boardSize - 30 },
    { x: boardSize - 30, y: boardSize - 30 },
  ];

  // Players list
  const players: PlayerInfo[] = [
    {
      seat: 0,
      name: user?.username || 'You (South)',
      isBot: false,
      avatar: user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=south',
      team: 'white',
      colorLabel: 'White (P1)',
    },
    {
      seat: 1,
      name: 'Leo (West)',
      isBot: true,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=west_carrom',
      team: 'black',
      colorLabel: 'Black (P2)',
    },
    {
      seat: 2,
      name: mode === 4 ? 'Elena (North)' : 'Opponent (North)',
      isBot: true,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=north_carrom',
      team: mode === 4 ? 'white' : 'black',
      colorLabel: mode === 4 ? 'White (P3)' : 'Black (Opponent)',
    },
    {
      seat: 3,
      name: 'Sam (East)',
      isBot: true,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=east_carrom',
      team: 'black',
      colorLabel: 'Black (P4)',
    },
  ];

  const currentStrikerPlayer = players[activeSeat];
  const isHumanTurn = activeSeat === 0;

  // Initialize board with coins
  const initBoard = useCallback(() => {
    const list: Piece[] = [];
    const cx = boardSize / 2;
    const cy = boardSize / 2;

    // Red Queen in center
    list.push({
      id: 'queen',
      type: 'queen',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: 12,
      color: '#ef4444',
      isPocketed: false,
    });

    // Ring 1 (6 alternating coins)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const r = 26;
      list.push({
        id: `coin_r1_${i}`,
        type: i % 2 === 0 ? 'white' : 'black',
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: 12,
        color: i % 2 === 0 ? '#f8fafc' : '#1e293b',
        isPocketed: false,
      });
    }

    // Ring 2 (12 alternating coins)
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const r = 52;
      list.push({
        id: `coin_r2_${i}`,
        type: i % 2 === 0 ? 'white' : 'black',
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: 12,
        color: i % 2 === 0 ? '#f8fafc' : '#1e293b',
        isPocketed: false,
      });
    }

    // Striker (initial South baseline)
    list.push({
      id: 'striker',
      type: 'striker',
      x: 250,
      y: boardSize - 75,
      vx: 0,
      vy: 0,
      radius: 16,
      color: '#06b6d4',
      isPocketed: false,
    });

    piecesRef.current = list;
    setStrikerBaselinePos(250);
    setAimAngle(-Math.PI / 2);
  }, []);

  useEffect(() => {
    initBoard();
  }, [initBoard, mode]);

  // Position striker for a specific seat along its baseline
  const positionStrikerForSeat = (seat: CarromSeat, baselineOffset: number) => {
    const striker = piecesRef.current.find((p) => p.id === 'striker');
    if (!striker) return;

    striker.vx = 0;
    striker.vy = 0;
    striker.isPocketed = false;

    if (seat === 0) {
      // South (bottom)
      striker.x = baselineOffset;
      striker.y = boardSize - 75;
    } else if (seat === 1) {
      // West (left)
      striker.x = 75;
      striker.y = baselineOffset;
    } else if (seat === 2) {
      // North (top)
      striker.x = baselineOffset;
      striker.y = 75;
    } else if (seat === 3) {
      // East (right)
      striker.x = boardSize - 75;
      striker.y = baselineOffset;
    }
  };

  // Update striker position when baseline slider changes
  useEffect(() => {
    if (!isSimulating) {
      positionStrikerForSeat(activeSeat, strikerBaselinePos);
    }
  }, [strikerBaselinePos, activeSeat, isSimulating]);

  // Fire striker
  const fireStriker = (angle: number, power: number) => {
    const striker = piecesRef.current.find((p) => p.id === 'striker');
    if (!striker) return;

    const speed = (power / 100) * 22;
    striker.vx = Math.cos(angle) * speed;
    striker.vy = Math.sin(angle) * speed;
    setIsSimulating(true);
    if (soundEnabled) sounds.playMove();
  };

  // Bot Turn Simulation
  useEffect(() => {
    if (isSimulating || winner) return;

    const currentP = players[activeSeat];
    if (currentP.isBot) {
      const timer = setTimeout(() => {
        // Calculate best shot: find closest unpocketed coin
        const coins = piecesRef.current.filter((p) => !p.isPocketed && p.type !== 'striker');
        if (coins.length === 0) return;

        // Choose a target coin (prefer queen or own team color)
        const preferredCoins = coins.filter((c) => c.type === 'queen' || c.type === currentP.team);
        const target = preferredCoins.length > 0
          ? preferredCoins[Math.floor(Math.random() * preferredCoins.length)]
          : coins[0];

        // Random baseline position
        const botBaseline = 150 + Math.random() * 200;
        setStrikerBaselinePos(botBaseline);
        positionStrikerForSeat(activeSeat, botBaseline);

        const striker = piecesRef.current.find((p) => p.id === 'striker');
        if (!striker) return;

        // Aim towards target with slight angle variance
        const targetAngle = Math.atan2(target.y - striker.y, target.x - striker.x) + (Math.random() - 0.5) * 0.15;
        const botPower = 45 + Math.random() * 35;

        setAimAngle(targetAngle);
        setAimPower(botPower);

        setTimeout(() => {
          fireStriker(targetAngle, botPower);
        }, 300);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [activeSeat, isSimulating, winner, mode]);

  // Main Canvas Render & Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      ctx.clearRect(0, 0, boardSize, boardSize);

      // Wood table base
      ctx.fillStyle = '#fde047';
      ctx.fillRect(0, 0, boardSize, boardSize);

      // Playing surface
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(20, 20, boardSize - 40, boardSize - 40);

      // Center circle rings
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#854d0e';
      ctx.beginPath();
      ctx.arc(boardSize / 2, boardSize / 2, 42, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(boardSize / 2, boardSize / 2, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // Baselines (All 4 Baselines)
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ca8a04';

      // South baseline (Bottom)
      ctx.strokeRect(90, boardSize - 85, boardSize - 180, 20);
      // North baseline (Top)
      ctx.strokeRect(90, 65, boardSize - 180, 20);
      // West baseline (Left)
      ctx.strokeRect(65, 90, 20, boardSize - 180);
      // East baseline (Right)
      ctx.strokeRect(boardSize - 85, 90, 20, boardSize - 180);

      // Baseline Circles (Red circular foul targets at ends of baselines)
      const baselineEndCircles = [
        // South
        { x: 90, y: boardSize - 75 }, { x: boardSize - 90, y: boardSize - 75 },
        // North
        { x: 90, y: 75 }, { x: boardSize - 90, y: 75 },
        // West
        { x: 75, y: 90 }, { x: 75, y: boardSize - 90 },
        // East
        { x: boardSize - 75, y: 90 }, { x: boardSize - 75, y: boardSize - 90 },
      ];
      baselineEndCircles.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#fee2e2';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      });

      // Pockets
      pockets.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, pocketRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#334155';
        ctx.stroke();
      });

      // Aim Line (when not simulating and for current striker)
      const striker = piecesRef.current.find((p) => p.id === 'striker');
      if (striker && !isSimulating) {
        const aimLength = 50 + (aimPower / 100) * 80;
        ctx.beginPath();
        ctx.moveTo(striker.x, striker.y);
        ctx.lineTo(striker.x + Math.cos(aimAngle) * aimLength, striker.y + Math.sin(aimAngle) * aimLength);
        ctx.lineWidth = 1.5 + (aimPower / 100) * 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = aimPower > 80 ? '#ef4444' : aimPower > 50 ? '#06b6d4' : '#10b981';
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Physics Update
      const pieces = piecesRef.current;
      let anyMoving = false;

      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        if (p.isPocketed) continue;

        // Apply table friction
        p.vx *= 0.985;
        p.vy *= 0.985;

        if (Math.hypot(p.vx, p.vy) > 0.05) {
          anyMoving = true;
          p.x += p.vx;
          p.y += p.vy;
        } else {
          p.vx = 0;
          p.vy = 0;
        }

        // Wall collisions
        const leftWall = 20 + p.radius;
        const rightWall = boardSize - 20 - p.radius;
        const topWall = 20 + p.radius;
        const bottomWall = boardSize - 20 - p.radius;

        if (p.x < leftWall) { p.x = leftWall; p.vx *= -0.85; }
        if (p.x > rightWall) { p.x = rightWall; p.vx *= -0.85; }
        if (p.y < topWall) { p.y = topWall; p.vy *= -0.85; }
        if (p.y > bottomWall) { p.y = bottomWall; p.vy *= -0.85; }

        // Pocket detection
        pockets.forEach((pkt) => {
          if (Math.hypot(p.x - pkt.x, p.y - pkt.y) < pocketRadius) {
            p.isPocketed = true;
            p.vx = 0;
            p.vy = 0;
            if (soundEnabled) sounds.playCapture();

            let pts = 0;
            if (p.type === 'white') pts = 10;
            else if (p.type === 'black') pts = 5;
            else if (p.type === 'queen') pts = 25;

            // Attribute points to active seat and team
            if (currentStrikerPlayer.team === 'white') {
              setTeamWhiteScore((s) => s + pts);
            } else {
              setTeamBlackScore((s) => s + pts);
            }

            setSeatScores((prev) => {
              const updated = [...prev] as [number, number, number, number];
              updated[activeSeat] += pts;
              return updated;
            });
          }
        });

        // Circle-to-Circle Elastic Collisions
        for (let j = i + 1; j < pieces.length; j++) {
          const p2 = pieces[j];
          if (p2.isPocketed) continue;

          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const dist = Math.hypot(dx, dy);
          const minDist = p.radius + p2.radius;

          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            p.x -= nx * overlap;
            p.y -= ny * overlap;
            p2.x += nx * overlap;
            p2.y += ny * overlap;

            // Elastic velocity transfer
            const kx = p.vx - p2.vx;
            const ky = p.vy - p2.vy;
            const pComponent = (2 * (nx * kx + ny * ky)) / (1 + 1);

            p.vx -= pComponent * nx * 0.92;
            p.vy -= pComponent * ny * 0.92;
            p2.vx += pComponent * nx * 0.92;
            p2.vy += pComponent * ny * 0.92;
          }
        }

        // Draw Piece
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = p.type === 'white' ? '#94a3b8' : p.type === 'striker' ? '#0891b2' : '#0f172a';
        ctx.stroke();

        // Inner decorative circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = p.type === 'white' ? '#cbd5e1' : '#334155';
        ctx.stroke();
      }

      // Check if simulation ended
      if (isSimulating && !anyMoving) {
        setIsSimulating(false);

        // Advance turn: 4 players: 0 -> 1 -> 2 -> 3; 2 players: 0 -> 2
        const nextSeat: CarromSeat = mode === 4
          ? (((activeSeat + 1) % 4) as CarromSeat)
          : (activeSeat === 0 ? 2 : 0);

        setActiveSeat(nextSeat);

        // Reset baseline default angle for next seat
        if (nextSeat === 0) setAimAngle(-Math.PI / 2); // aiming up
        else if (nextSeat === 1) setAimAngle(0); // aiming right
        else if (nextSeat === 2) setAimAngle(Math.PI / 2); // aiming down
        else if (nextSeat === 3) setAimAngle(Math.PI); // aiming left

        positionStrikerForSeat(nextSeat, 250);
        setStrikerBaselinePos(250);

        // Check if all coins pocketed
        const unpocketed = pieces.filter((p) => !p.isPocketed && p.type !== 'striker');
        if (unpocketed.length === 0) {
          finishMatch();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animId);
  }, [isSimulating, aimAngle, strikerBaselinePos, activeSeat, mode, currentStrikerPlayer, soundEnabled]);

  const finishMatch = async () => {
    const isWhiteWin = teamWhiteScore >= teamBlackScore;
    setWinner(isWhiteWin ? 'white' : 'black');

    if (isWhiteWin) {
      sounds.playSuccess();
      confetti({ particleCount: 80, spread: 70 });
    }

    try {
      await api.recordMatch({
        gameId: 'carrom',
        opponentId: isMultiplayer ? (currentRoom?.guestId || 'guest') : 'bot_carrom',
        opponentName: isMultiplayer ? (isHost ? currentRoom?.guestName : currentRoom?.hostName) : 'Carrom AI',
        isBot: !isMultiplayer,
        result: isWhiteWin ? 'win' : 'loss',
        userScore: teamWhiteScore,
        opponentScore: teamBlackScore,
        durationSeconds: 120,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestart = () => {
    setTeamWhiteScore(0);
    setTeamBlackScore(0);
    setSeatScores([0, 0, 0, 0]);
    setWinner(null);
    setActiveSeat(0);
    setIsSimulating(false);
    initBoard();
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* 4-Player Top HUD Header */}
      <div className="w-full max-w-[min(540px,calc(100vh-190px))] bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-md">
        {/* Teams and Mode Row */}
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <div>
              <div className="text-xs font-black text-white uppercase tracking-wider">
                Online Carrom ({mode}P)
              </div>
              <div className="text-[10px] text-slate-400">
                Striker: <span className="text-cyan-400 font-bold">{currentStrikerPlayer.name}</span>
              </div>
            </div>
          </div>

          {/* Mode Selector & Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setMode(mode === 4 ? 2 : 4);
                handleRestart();
              }}
              disabled={isSimulating}
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 flex items-center gap-1"
            >
              <Users className="w-3 h-3 text-cyan-400" /> {mode === 4 ? '4 Players (Doubles)' : '2 Players (1v1)'}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            <button
              onClick={handleRestart}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              title="Restart Board"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Seats Status Badges */}
        <div className="grid grid-cols-4 gap-1.5 pt-1.5">
          {players.map((p) => {
            if (mode === 2 && (p.seat === 1 || p.seat === 3)) return null;
            const isTurn = activeSeat === p.seat;
            return (
              <div
                key={p.seat}
                className={`py-1 px-1.5 rounded-lg border text-center transition-all ${
                  isTurn
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-md ring-1 ring-cyan-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-[9px] font-mono uppercase truncate">{p.name}</div>
                <div className="text-[11px] font-mono font-bold text-white">
                  {p.team === 'white' ? teamWhiteScore : teamBlackScore} pts
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carrom Table Canvas */}
      <div className="relative border-4 border-amber-950 rounded-2xl overflow-hidden shadow-2xl bg-amber-900 aspect-square max-h-[calc(100vh-220px)] max-w-[calc(100vh-220px)] flex items-center justify-center">
        <canvas ref={canvasRef} width={boardSize} height={boardSize} className="block w-full h-full object-contain" />

        {/* Turn indicator bubble in center when not simulating */}
        {!isSimulating && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-sm border border-slate-700 px-3 py-0.5 rounded-full text-[10px] font-bold text-slate-200">
            {isHumanTurn ? '🎯 YOUR TURN — AIM & STRIKE' : `⏳ ${currentStrikerPlayer.name} AIMING...`}
          </div>
        )}

        {winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <Trophy className="w-12 h-12 text-amber-400" />
            <h2 className="text-xl font-bold text-white uppercase">
              {winner === 'white' ? 'TEAM WHITE WINS!' : 'TEAM BLACK WINS!'}
            </h2>
            <div className="text-xs text-slate-300">
              White: {teamWhiteScore} pts · Black: {teamBlackScore} pts
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleRestart} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg">
                Play Again
              </button>
              <button onClick={onBackToDashboard} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Striker Controls (for South Player when human turn) */}
      <div className="w-full max-w-[min(540px,calc(100vh-190px))] p-2 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-lg">
        <div className="grid grid-cols-3 gap-2">
          {/* Position Slider */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Position</span>
              <span className="font-mono text-cyan-400">{strikerBaselinePos}px</span>
            </div>
            <input
              type="range"
              min="120"
              max="380"
              value={strikerBaselinePos}
              disabled={isSimulating || !isHumanTurn}
              onChange={(e) => setStrikerBaselinePos(Number(e.target.value))}
              className="accent-cyan-500 cursor-pointer h-1.5"
            />
          </div>

          {/* Aim Angle Slider */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Aim Angle</span>
              <span className="font-mono text-cyan-400">{Math.round((aimAngle * 180) / Math.PI)}°</span>
            </div>
            <input
              type="range"
              min="-3.14"
              max="0"
              step="0.05"
              value={aimAngle}
              disabled={isSimulating || !isHumanTurn}
              onChange={(e) => setAimAngle(Number(e.target.value))}
              className="accent-cyan-500 cursor-pointer h-1.5"
            />
          </div>

          {/* Speed / Strike Power Slider */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Speed / Power</span>
              <span className="font-mono text-amber-400 font-bold">{aimPower}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={aimPower}
              disabled={isSimulating || !isHumanTurn}
              onChange={(e) => setAimPower(Number(e.target.value))}
              className="accent-amber-500 cursor-pointer h-1.5"
            />
          </div>
        </div>

        {/* Speed Presets Buttons */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
          <span className="font-bold">Speed Presets:</span>
          <div className="flex gap-1.5">
            {[
              { label: 'Soft', val: 35 },
              { label: 'Medium', val: 60 },
              { label: 'Hard', val: 85 },
              { label: 'Max', val: 100 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setAimPower(p.val)}
                disabled={isSimulating || !isHumanTurn}
                className={`py-0.5 px-2 rounded font-bold transition-all cursor-pointer ${
                  aimPower === p.val
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {p.label} ({p.val}%)
              </button>
            ))}
          </div>
        </div>

        {/* Strike Button with Speed Value */}
        <button
          onClick={() => fireStriker(aimAngle, aimPower)}
          disabled={isSimulating || !isHumanTurn || !!winner}
          className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-500/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1"
        >
          {isSimulating ? 'SIMULATING CARROM REBOUNDS...' : isHumanTurn ? `STRIKE! 🎯 [Speed: ${aimPower}%]` : `${currentStrikerPlayer.name} AIMING...`}
        </button>
      </div>
    </div>
  );
};
