import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { GameId, DailyChallenge, MatchRecord } from '../../types/index.ts';
import { GAMES_LIST, getLevelProgress, getTierFromRating } from '../../data/games.ts';
import {
  Swords,
  Bot,
  Users,
  Trophy,
  Flame,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Search,
  X,
  Dices,
  Play,
} from 'lucide-react';

interface DashboardProps {
  onSelectGame: (gameId: GameId, isMultiplayer: boolean, botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme') => void;
  onCreatePrivateRoom: (gameId: GameId) => void;
  onOpenQuickMatch: (gameId: GameId) => void;
  onOpenLeaderboard: () => void;
  onOpenFriends: () => void;
  onOpenKitchenSpecial?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectGame,
  onCreatePrivateRoom,
  onOpenQuickMatch,
  onOpenLeaderboard,
  onOpenFriends,
  onOpenKitchenSpecial,
}) => {
  const { user, openAuthModal } = useAuth();
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchRecord[]>([]);

  // Search & Filter state (like MSN Play)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [globalBotLevel, setGlobalBotLevel] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');

  useEffect(() => {
    if (user) {
      api.getChallenges().then((res) => setChallenges(res.challenges)).catch(() => {});
      api.getMatchHistory().then((res) => setRecentMatches(res.history.slice(0, 5))).catch(() => {});
    }
  }, [user]);

  const handleClaimChallenge = async (challengeId: string) => {
    try {
      const res = await api.claimChallenge(challengeId);
      if (res.success) {
        setChallenges((prev) =>
          prev.map((c) => (c.id === challengeId ? { ...c, claimed: true } : c))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Launch a random game
  const handlePlayRandomGame = () => {
    const randomGame = GAMES_LIST[Math.floor(Math.random() * GAMES_LIST.length)].id;
    onSelectGame(randomGame, false, globalBotLevel);
  };

  const levelInfo = user ? getLevelProgress(user.xp) : { level: 1, currentLevelXp: 0, nextLevelXp: 100, progressPercent: 0 };

  // Filtered games (MSN Play style)
  const filteredGames = useMemo(() => {
    return GAMES_LIST.filter((game) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = game.name.toLowerCase().includes(query);
        const matchesCategory = game.category.toLowerCase().includes(query);
        const matchesDesc = game.description.toLowerCase().includes(query);
        const matchesTagline = game.tagline.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesDesc && !matchesTagline) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Board' && !['Board', 'Strategy'].includes(game.category)) return false;
        if (selectedCategory === 'Arcade' && game.category !== 'Arcade') return false;
        if (selectedCategory === 'Physics' && !['Physics', 'Racing'].includes(game.category)) return false;
        if (selectedCategory === 'Sports' && game.category !== 'Sports') return false;
        if (selectedCategory === 'Puzzles' && !['Puzzle', 'Casual'].includes(game.category)) return false;
        if (selectedCategory === 'Cards' && !['Cards', 'Trivia'].includes(game.category)) return false;
      }

      // Tag filter
      if (selectedTag === '4player' && !game.players.includes('4')) return false;
      if (selectedTag === 'trending' && !game.featured) return false;

      return true;
    });
  }, [searchQuery, selectedCategory, selectedTag]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Hero Banner with Random Game Button */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-xs font-semibold text-cyan-300">
            <Sparkles className="w-3.5 h-3.5" /> 20 Playable Games · 4-Player Carrom & Ludo · AI Difficulty Modes
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-none">
            PLAY. COMPETE. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">WIN.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Discover 20 free multiplayer & physics games. Challenge friends with instant invite links (no account required) or battle bots from Easy to Extreme!
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {/* RANDOM GAME BUTTON (Replaced Quick Play Chess) */}
            <button
              onClick={handlePlayRandomGame}
              className="py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Dices className="w-4 h-4" /> 🎲 Play Random Game
            </button>

            <button
              onClick={onOpenLeaderboard}
              className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" /> Leaderboards
            </button>
          </div>

          {/* REQUESTED BUTTON BELOW PLAY RANDOM: For Women - Here is the best game for you */}
          {onOpenKitchenSpecial && (
            <div className="pt-2">
              <button
                onClick={onOpenKitchenSpecial}
                className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-rose-500/25 active:scale-98 transition-all flex items-center justify-between sm:justify-start gap-3 border border-pink-400/40 cursor-pointer group"
                title="Secret Special Kitchen Arena (Just for fun!)"
              >
                <span className="flex items-center gap-2">
                  <span className="text-base group-hover:scale-125 transition-transform">👑</span>
                  <span>For Women: Here is the Best Game for You ✨</span>
                </span>
                <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full text-pink-200 font-mono normal-case tracking-normal border border-pink-300/30">
                  Just for fun! 😄
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MSN Play Style Discovery & Search Header */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Prominent Search Bar (like MSN Play) */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 20 free games (e.g. Carrom, Ludo, Pool, Chess, Snake...)"
              className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Bot Level Global Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 self-start md:self-auto">
            <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-cyan-400" /> Bot:
            </span>
            {(['easy', 'medium', 'hard', 'extreme'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setGlobalBotLevel(lvl)}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  globalBotLevel === lvl
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills (like MSN Play) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'All', label: 'All Games (20)' },
            { id: 'Board', label: '🎲 Board & Tabletop' },
            { id: 'Sports', label: '🎱 Sports & Billiards' },
            { id: 'Arcade', label: '🕹️ Arcade Classics' },
            { id: 'Physics', label: '💥 Physics & Racing' },
            { id: 'Puzzles', label: '🧩 Puzzles & Logic' },
            { id: 'Cards', label: '🃏 Cards & Trivia' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`py-1.5 px-3.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Quick Filter Tags */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span>Filter:</span>
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                selectedTag === 'all' ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedTag('4player')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                selectedTag === '4player' ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              4-Player (Carrom & Ludo)
            </button>
            <button
              onClick={() => setSelectedTag('trending')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                selectedTag === 'trending' ? 'text-amber-400 bg-amber-950/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              Trending 🔥
            </button>
          </div>

          <div className="font-mono text-[11px] text-slate-400">
            Showing {filteredGames.length} of {GAMES_LIST.length} Games
          </div>
        </div>
      </div>

      {/* 20 Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredGames.map((game) => {
          const userRating = user?.ratings[game.id] || 1200;
          const tier = getTierFromRating(userRating);

          return (
            <div
              key={game.id}
              className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-cyan-500/10"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
                    {game.icon}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] py-0.5 px-2 bg-slate-800 text-slate-300 rounded-md font-semibold">
                      {game.category}
                    </span>
                    {user && (
                      <div className="mt-1">
                        <span className="text-xs font-mono font-bold text-slate-200">{userRating}</span>
                        <span className={`text-[10px] ml-1.5 font-bold ${tier.color}`}>
                          {tier.tier}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                    {game.name}
                    {game.featured && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono">HOT</span>}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>
                </div>
              </div>

              {/* Game Action Buttons */}
              <div className="pt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSelectGame(game.id, false, globalBotLevel)}
                  className="py-2.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title={`Play against ${globalBotLevel.toUpperCase()} bot`}
                >
                  <Bot className="w-3.5 h-3.5 text-cyan-400" /> PLAY BOT
                </button>

                <button
                  onClick={() => onCreatePrivateRoom(game.id)}
                  className="py-2.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-cyan-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Invite friend with direct link — No account needed!"
                >
                  <Users className="w-3.5 h-3.5" /> WITH FRIEND
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <p className="text-sm">No games found matching "{searchQuery}".</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedTag('all'); }}
            className="text-xs text-cyan-400 hover:underline"
          >
            Clear filters and show all 20 games
          </button>
        </div>
      )}
    </div>
  );
};
