import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { GameId, LeaderboardEntry } from '../../types/index.ts';
import { GAMES_LIST, getTierFromRating } from '../../data/games.ts';
import { X, Trophy, Medal, Users, Globe } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [selectedGameId, setSelectedGameId] = useState<GameId | 'overall'>('overall');
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'friends'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const gameParam = selectedGameId === 'overall' ? undefined : selectedGameId;
        const res = await api.getLeaderboard(gameParam, leaderboardType, user?.id);
        setEntries(res.entries);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [isOpen, selectedGameId, leaderboardType, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">ARENA LEADERBOARDS</h2>
              <p className="text-xs text-slate-400">Competitive global & friends rankings</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters: Global vs Friends & Game Dropdown */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Segmented Control */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setLeaderboardType('global')}
              className={`flex-1 sm:flex-initial py-1.5 px-4 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                leaderboardType === 'global' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Global
            </button>
            <button
              onClick={() => setLeaderboardType('friends')}
              className={`flex-1 sm:flex-initial py-1.5 px-4 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                leaderboardType === 'friends' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Friends
            </button>
          </div>

          {/* Game Selector */}
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value as any)}
            className="w-full sm:w-56 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="overall">⭐ Overall Average Rating</option>
            {GAMES_LIST.map((g) => (
              <option key={g.id} value={g.id}>
                {g.icon} {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table Entries */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1.5">
            {entries.map((entry) => {
              const tier = getTierFromRating(entry.rating);
              const isCurrentUser = user && user.id === entry.userId;

              return (
                <div
                  key={entry.userId}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    isCurrentUser
                      ? 'bg-cyan-950/40 border-cyan-500/50 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 font-mono font-bold text-center ${
                      entry.rank === 1 ? 'text-amber-400 text-base' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </span>

                    <img src={entry.avatar} alt={entry.username} className="w-8 h-8 rounded-lg object-cover" />

                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        {entry.fullName || entry.username}
                        {isCurrentUser && <span className="text-[10px] text-cyan-400 font-normal">(You)</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Lvl {entry.level} · {entry.wins} Wins ({entry.winRate}%)
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-slate-100">{entry.rating}</div>
                    <span className={`text-[10px] font-bold ${tier.color}`}>{tier.tier}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
