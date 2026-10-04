import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { GAMES_LIST, getTierFromRating, getLevelProgress } from '../../data/games.ts';
import { MatchRecord, Achievement } from '../../types/index.ts';
import { X, Trophy, Swords, Flame, Sparkles, CheckCircle2, History } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ratings' | 'history' | 'achievements'>('ratings');
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    async function loadData() {
      setLoading(true);
      try {
        const [hRes, aRes] = await Promise.all([
          api.getMatchHistory(),
          api.getAchievements(),
        ]);
        setMatchHistory(hRes.history);
        setAchievements(aRes.achievements);
      } catch (e) {
        console.error('Error fetching profile data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const levelInfo = getLevelProgress(user.xp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                alt={user.username}
                className="w-16 h-16 rounded-2xl border-2 border-cyan-400/80 object-cover shadow-lg"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{user.fullName || user.username}</h2>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  Lvl {levelInfo.level}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">@{user.username}</div>

              {/* XP Progress bar */}
              <div className="w-48 mt-2">
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{user.xp.toLocaleString()} XP</span>
                  <span>Next Level</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full" style={{ width: `${levelInfo.progressPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-4 gap-2 p-4 bg-slate-950/60 border-b border-slate-800/80 text-center">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Games</div>
            <div className="text-base font-mono font-bold text-slate-200">{user.totalGames}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Wins</div>
            <div className="text-base font-mono font-bold text-emerald-400">{user.wins}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Win Rate</div>
            <div className="text-base font-mono font-bold text-cyan-400">{user.winRate}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Streak</div>
            <div className="text-base font-mono font-bold text-amber-400 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5" /> {user.streak}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 pt-2">
          <button
            onClick={() => setActiveTab('ratings')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'ratings' ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Game Ratings (10)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Match History
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'achievements' ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Achievements
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'ratings' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GAMES_LIST.map((game) => {
                const rating = user.ratings[game.id] || 1200;
                const tierInfo = getTierFromRating(rating);

                return (
                  <div
                    key={game.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{game.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-200">{game.name}</div>
                        <div className="text-[10px] text-slate-400">{game.category}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-slate-100">{rating}</div>
                      <span className={`text-[10px] font-bold ${tierInfo.color}`}>
                        {tierInfo.tier}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {matchHistory.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">No match records yet. Play a game to record stats!</div>
              ) : (
                matchHistory.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                        m.result === 'win' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-red-950 text-red-400 border border-red-500/30'
                      }`}>
                        {m.result}
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 uppercase">{m.gameId}</div>
                        <div className="text-[10px] text-slate-400">vs {m.opponentName}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono font-bold ${m.ratingChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.ratingChange >= 0 ? `+${m.ratingChange}` : m.ratingChange} Elo
                      </div>
                      <div className="text-[10px] text-slate-500">Rating: {m.newRating}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                    ach.unlockedAt ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-950/30 border-slate-900 opacity-40'
                  }`}
                >
                  <span className="text-2xl">{ach.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200">{ach.title}</h4>
                      {ach.unlockedAt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{ach.description}</p>
                    <span className="text-[10px] font-mono text-cyan-400">+{ach.xpReward} XP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
