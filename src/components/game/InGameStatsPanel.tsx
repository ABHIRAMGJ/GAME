import React, { useState, useEffect } from 'react';
import { GameId, User } from '../../types/index.ts';
import { GAMES_LIST, getTierFromRating } from '../../data/games.ts';
import {
  Trophy,
  Clock,
  Zap,
  TrendingUp,
  Target,
  Flame,
  Award,
  ChevronRight,
  Shield,
  Activity,
  BarChart2,
  X,
} from 'lucide-react';

interface InGameStatsPanelProps {
  gameId: GameId;
  user: User | null;
  isMultiplayer: boolean;
  onClose?: () => void;
}

export const InGameStatsPanel: React.FC<InGameStatsPanelProps> = ({
  gameId,
  user,
  isMultiplayer,
  onClose,
}) => {
  // Live elapsed match timer
  const [matchSeconds, setMatchSeconds] = useState(0);
  const [turnSeconds, setTurnSeconds] = useState(30);

  useEffect(() => {
    setMatchSeconds(0);
    setTurnSeconds(30);

    const matchInterval = setInterval(() => {
      setMatchSeconds((s) => s + 1);
    }, 1000);

    const turnInterval = setInterval(() => {
      setTurnSeconds((s) => (s > 1 ? s - 1 : 30));
    }, 1000);

    return () => {
      clearInterval(matchInterval);
      clearInterval(turnInterval);
    };
  }, [gameId]);

  const gameInfo = GAMES_LIST.find((g) => g.id === gameId);
  const userRating = user?.ratings ? (user.ratings[gameId] || 1200) : 1200;
  const tierInfo = getTierFromRating(userRating);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Dynamic game-specific stat cards
  const renderGameSpecificStats = () => {
    switch (gameId) {
      case 'tanks':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Weapon Shell</span>
              <span className="font-mono text-cyan-400 font-bold">Standard Explosive</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Terrain Destruction</span>
              <span className="font-mono text-amber-400 font-bold">High Density</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Trajectory Physics</span>
              <span className="font-mono text-emerald-400 font-bold">Wind Enabled</span>
            </div>
          </div>
        );

      case 'racing':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Current Lap</span>
              <span className="font-mono text-cyan-400 font-bold">Lap 2 / 3</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Nitrous Capacity</span>
              <span className="font-mono text-amber-400 font-bold">100% Ready</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Drift Friction</span>
              <span className="font-mono text-emerald-400 font-bold">Asphalt Grip</span>
            </div>
          </div>
        );

      case 'tetris':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Drop Multiplier</span>
              <span className="font-mono text-cyan-400 font-bold">1.5x APM</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Garbage Queue</span>
              <span className="font-mono text-emerald-400 font-bold">0 Pending</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">T-Spin Sensor</span>
              <span className="font-mono text-purple-400 font-bold">Armed</span>
            </div>
          </div>
        );

      case 'carrom':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Board Format</span>
              <span className="font-mono text-cyan-400 font-bold">2-4P Doubles</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Red Queen Value</span>
              <span className="font-mono text-red-400 font-bold">+25 PTS</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Surface Friction</span>
              <span className="font-mono text-amber-400 font-bold">Tournament Powder</span>
            </div>
          </div>
        );

      case 'ludo':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Board Quadrants</span>
              <span className="font-mono text-cyan-400 font-bold">4 Players</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Star Safe Tiles</span>
              <span className="font-mono text-amber-400 font-bold">8 Protected</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">6 Roll Bonus</span>
              <span className="font-mono text-emerald-400 font-bold">+1 Turn</span>
            </div>
          </div>
        );

      case 'battleship':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Fleet Status</span>
              <span className="font-mono text-emerald-400 font-bold">5 Ships Deployed</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Radar Recon</span>
              <span className="font-mono text-cyan-400 font-bold">10x10 Grid</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Salvo Mode</span>
              <span className="font-mono text-amber-400 font-bold">Direct Fire</span>
            </div>
          </div>
        );

      case 'airhockey':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Goal Target</span>
              <span className="font-mono text-cyan-400 font-bold">First to 7</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Puck Cushion</span>
              <span className="font-mono text-emerald-400 font-bold">0.96 Friction</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Mallet Reflex</span>
              <span className="font-mono text-amber-400 font-bold">Ultra Crisp</span>
            </div>
          </div>
        );

      case 'archery':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Target Range</span>
              <span className="font-mono text-cyan-400 font-bold">50 Meters</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Bullseye 10 Ring</span>
              <span className="font-mono text-yellow-400 font-bold">High Precision</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Arrow Gravity</span>
              <span className="font-mono text-emerald-400 font-bold">9.8 m/s²</span>
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Question Pool</span>
              <span className="font-mono text-cyan-400 font-bold">Global Trivia</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Speed Bonus</span>
              <span className="font-mono text-amber-400 font-bold">Up to +500 PTS</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Streak Shield</span>
              <span className="font-mono text-emerald-400 font-bold">Active</span>
            </div>
          </div>
        );

      case 'colorclash':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Deck Affinity</span>
              <span className="font-mono text-cyan-400 font-bold">4 Elements</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Mana Gauge</span>
              <span className="font-mono text-purple-400 font-bold">Full Recharge</span>
            </div>
            <div className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400">Wild Synergy</span>
              <span className="font-mono text-emerald-400 font-bold">2x Impact</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <aside className="w-64 xl:w-72 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between shrink-0 h-full max-h-[calc(100vh-125px)] overflow-y-auto space-y-3.5 z-20 transition-all select-none">
      {/* Panel Header */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              In-Game Statistics
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800"
                title="Hide Panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* User Rank & Rating Card */}
        <div className="mt-3 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-black text-xs font-mono">
                {user ? user.username.slice(0, 2).toUpperCase() : 'P1'}
              </div>
              <div>
                <div className="text-xs font-bold text-white truncate max-w-[120px]">
                  {user ? user.username : 'Guest Player'}
                </div>
                <div className="text-[10px] text-slate-400">Current Standing</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-black text-cyan-400">{userRating} ELO</div>
              <div className={`text-[10px] font-bold ${tierInfo.color}`}>{tierInfo.tier}</div>
            </div>
          </div>

          {/* Rank Badge */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-400 font-mono">
            <span>Arena Rank:</span>
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Rank #1 Active
            </span>
          </div>
        </div>
      </div>

      {/* Live Clocks: Match Duration & Turn Timer */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Match Timing & Turn
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Match Time */}
          <div className="p-2 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
              <Clock className="w-3 h-3 text-cyan-400" /> Elapsed
            </div>
            <div className="text-sm font-mono font-black text-white">{formatTime(matchSeconds)}</div>
          </div>

          {/* Turn Clock */}
          <div className="p-2 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
              <Activity className="w-3 h-3 text-emerald-400" /> Turn Clock
            </div>
            <div className={`text-sm font-mono font-black ${turnSeconds < 10 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {turnSeconds}s
            </div>
          </div>
        </div>
      </div>

      {/* Game Specific Live Parameters */}
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
          <span>{gameInfo?.name} Metrics</span>
          <span className="text-cyan-400 font-mono text-[9px]">LIVE SYNC</span>
        </div>
        {renderGameSpecificStats()}
      </div>

      {/* Career Record for this Game */}
      <div className="p-2.5 bg-gradient-to-r from-slate-950 to-indigo-950/40 border border-slate-800/90 rounded-xl space-y-1.5">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
          <span>Win Rate</span>
          <span className="text-white font-mono font-bold">
            {user ? `${user.winRate}%` : '68%'}
          </span>
        </div>

        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${user ? user.winRate : 68}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" /> Streak: {user ? user.streak : 3}W
          </span>
          <span className="font-mono text-slate-300">
            {isMultiplayer ? 'PVP Ranked' : 'Practice vs Bot'}
          </span>
        </div>
      </div>
    </aside>
  );
};
