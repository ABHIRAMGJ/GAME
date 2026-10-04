import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { getLevelProgress } from '../../data/games.ts';
import { sounds } from '../../utils/sound.ts';
import { Gamepad2, Users, Trophy, Bell, User as UserIcon, LogOut, Sparkles, Swords, Volume2, VolumeX } from 'lucide-react';

interface NavbarProps {
  onOpenLeaderboard: () => void;
  onOpenFriends: () => void;
  onOpenProfile: () => void;
  onOpenTournaments: () => void;
  onGoHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLeaderboard,
  onOpenFriends,
  onOpenProfile,
  onOpenTournaments,
  onGoHome,
}) => {
  const { user, logout, openAuthModal } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundEnabled(sounds.enabled);
  };

  const levelInfo = user ? getLevelProgress(user.xp) : { level: 1, currentLevelXp: 0, nextLevelXp: 100, progressPercent: 0 };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div onClick={onGoHome} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-black tracking-wider text-white flex items-center gap-1.5">
              GAME<span className="text-cyan-400">ARENA</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              10 Games · Real-Time
            </div>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
          <button onClick={onGoHome} className="text-slate-300 hover:text-white transition-colors">
            Games
          </button>
          <button onClick={onOpenTournaments} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Tournaments
          </button>
          <button onClick={onOpenLeaderboard} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-indigo-400" /> Leaderboard
          </button>
          <button onClick={onOpenFriends} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" /> Friends
          </button>
        </nav>

        {/* Right Section: Sound Toggle & Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 border border-slate-800/60 transition-colors"
            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-900 border border-slate-800/60 transition-colors"
              >
                <img
                  src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                  alt={user.username}
                  className="w-8 h-8 rounded-lg border border-slate-700 object-cover"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    {user.fullName || user.username}
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Lvl {levelInfo.level} · {user.xp.toLocaleString()} XP
                  </div>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 animate-fade-in"
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <div className="pb-3 border-b border-slate-800 mb-2">
                    <div className="text-xs font-bold text-slate-200">{user.fullName || user.username}</div>
                    <div className="text-[11px] text-slate-400">@{user.username}</div>

                    {/* Level Progress Bar */}
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Level {levelInfo.level}</span>
                        <span>{levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full" style={{ width: `${levelInfo.progressPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => { setProfileDropdownOpen(false); onOpenProfile(); }}
                      className="w-full py-2 px-2.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-cyan-400" /> View Full Profile
                    </button>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); onOpenFriends(); }}
                      className="w-full py-2 px-2.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <Users className="w-4 h-4 text-indigo-400" /> Friends & Challenges
                    </button>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); onOpenLeaderboard(); }}
                      className="w-full py-2 px-2.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <Trophy className="w-4 h-4 text-amber-400" /> Global Leaderboards
                    </button>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); logout(); }}
                      className="w-full py-2 px-2.5 rounded-lg text-left text-red-400 hover:bg-red-950/40 flex items-center gap-2 pt-2 border-t border-slate-800/80"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="py-1.5 px-3.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="py-1.5 px-4 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
