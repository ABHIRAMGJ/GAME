import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Tournament, TournamentMatch, GameId } from '../../types/index.ts';
import { GAMES_LIST } from '../../data/games.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import {
  Trophy,
  X,
  Users,
  Calendar,
  Sparkles,
  Swords,
  CheckCircle2,
  Play,
  RotateCw,
  Shield,
} from 'lucide-react';

interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (gameId: GameId, isMultiplayer: boolean) => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
}) => {
  const { user, openAuthModal } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const res = await api.getTournaments();
      setTournaments(res.tournaments);
      if (res.tournaments.length > 0 && !selectedTournament) {
        setSelectedTournament(res.tournaments[0]);
      } else if (selectedTournament) {
        const updated = res.tournaments.find((t: any) => t.id === selectedTournament.id);
        if (updated) setSelectedTournament(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTournaments();
    }
  }, [isOpen]);

  const handleJoinTournament = async (tournamentId: string) => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    try {
      const res = await api.joinTournament(tournamentId);
      setStatusMsg('Successfully registered for the tournament!');
      loadTournaments();
      sounds.playSuccess();
      confetti({ particleCount: 60, spread: 60 });
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      setStatusMsg(err.message || 'Could not join tournament');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const handleAdvanceRound = async (tournamentId: string) => {
    try {
      const res = await api.advanceTournament(tournamentId);
      setSelectedTournament(res.tournament);
      sounds.playGo();
      setStatusMsg('Tournament round advanced!');
      loadTournaments();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const currentTour = selectedTournament || tournaments[0];
  const gameMeta = currentTour ? GAMES_LIST.find((g) => g.id === currentTour.gameId) : null;
  const isRegistered = user && currentTour?.registeredUserIds.includes(user.id);

  // Group matches by round
  const quarters = currentTour?.matches?.filter((m) => m.round === 'quarter') || [];
  const semis = currentTour?.matches?.filter((m) => m.round === 'semi') || [];
  const finals = currentTour?.matches?.filter((m) => m.round === 'final') || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">
                CHAMPIONSHIP TOURNAMENTS
              </h2>
              <p className="text-xs text-slate-400">
                Single-elimination competitive bracket cups with trophy awards
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div className="mx-6 mt-4 p-3 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-xs text-cyan-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Tournament Switcher Tabs */}
        <div className="flex gap-2 p-4 bg-slate-950/50 border-b border-slate-800 overflow-x-auto">
          {tournaments.map((t) => {
            const isSelected = currentTour?.id === t.id;
            const g = GAMES_LIST.find((item) => item.id === t.gameId);

            return (
              <button
                key={t.id}
                onClick={() => setSelectedTournament(t)}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap border ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border-cyan-400 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{g?.icon}</span>
                <span>{t.title}</span>
              </button>
            );
          })}
        </div>

        {/* Tournament Details Banner */}
        {currentTour && (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">{currentTour.title}</h3>
                  <span className="py-0.5 px-2 bg-indigo-950 text-indigo-300 rounded font-semibold text-[10px] border border-indigo-800/50 uppercase">
                    {currentTour.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">{currentTour.description}</p>
                <div className="flex flex-wrap gap-4 text-xs font-mono pt-1 text-slate-300">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Trophy className="w-3.5 h-3.5" /> Prize: {currentTour.prizeXp} XP + {currentTour.prizeTrophy}
                  </span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Users className="w-3.5 h-3.5" /> Slots: {currentTour.currentPlayers} / {currentTour.maxPlayers}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" /> {currentTour.startTime}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {!isRegistered ? (
                  <button
                    onClick={() => handleJoinTournament(currentTour.id)}
                    disabled={currentTour.currentPlayers >= currentTour.maxPlayers}
                    className="flex-1 md:flex-initial py-3 px-6 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                  >
                    Register Now
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="py-2.5 px-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Registered
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onStartGame(currentTour.gameId, false);
                      }}
                      className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Play Match
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleAdvanceRound(currentTour.id)}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                  title="Advance Tournament Round"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" /> Advance Round
                </button>
              </div>
            </div>

            {/* Interactive Tournament Bracket */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Swords className="w-4 h-4 text-cyan-400" /> Tournament Bracket Progression
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-x-auto">
                {/* Quarter Finals Column */}
                <div className="space-y-4">
                  <div className="text-center pb-2 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Quarter-Finals (Round 1)
                  </div>

                  <div className="space-y-3">
                    {quarters.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-6">Pending registration</div>
                    ) : (
                      quarters.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 shadow-md"
                        >
                          <div className={`flex items-center justify-between p-1.5 rounded-lg ${
                            m.winnerId === m.player1?.id ? 'bg-emerald-950/60 text-emerald-300 font-bold' : 'text-slate-300'
                          }`}>
                            <div className="flex items-center gap-2 text-xs truncate">
                              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
                                {idx * 2 + 1}
                              </span>
                              <span className="truncate">{m.player1?.name || 'TBD'}</span>
                            </div>
                            {m.winnerId === m.player1?.id && <span className="text-[10px] text-emerald-400 font-bold">W</span>}
                          </div>

                          <div className={`flex items-center justify-between p-1.5 rounded-lg ${
                            m.winnerId === m.player2?.id ? 'bg-emerald-950/60 text-emerald-300 font-bold' : 'text-slate-300'
                          }`}>
                            <div className="flex items-center gap-2 text-xs truncate">
                              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
                                {idx * 2 + 2}
                              </span>
                              <span className="truncate">{m.player2?.name || 'Open Slot'}</span>
                            </div>
                            {m.winnerId === m.player2?.id && <span className="text-[10px] text-emerald-400 font-bold">W</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Semi Finals Column */}
                <div className="space-y-4">
                  <div className="text-center pb-2 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Semi-Finals
                  </div>

                  <div className="space-y-6 pt-4">
                    {semis.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-10">
                        Awaiting Quarter-Finals conclusion
                      </div>
                    ) : (
                      semis.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 shadow-md"
                        >
                          <div className={`flex items-center justify-between p-1.5 rounded-lg ${
                            m.winnerId === m.player1?.id ? 'bg-emerald-950/60 text-emerald-300 font-bold' : 'text-slate-300'
                          }`}>
                            <span className="text-xs truncate">{m.player1?.name || 'TBD'}</span>
                            {m.winnerId === m.player1?.id && <span className="text-[10px] text-emerald-400 font-bold">W</span>}
                          </div>

                          <div className={`flex items-center justify-between p-1.5 rounded-lg ${
                            m.winnerId === m.player2?.id ? 'bg-emerald-950/60 text-emerald-300 font-bold' : 'text-slate-300'
                          }`}>
                            <span className="text-xs truncate">{m.player2?.name || 'TBD'}</span>
                            {m.winnerId === m.player2?.id && <span className="text-[10px] text-emerald-400 font-bold">W</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Grand Final Column */}
                <div className="space-y-4">
                  <div className="text-center pb-2 border-b border-amber-500/40 text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Grand Championship
                  </div>

                  <div className="p-4 bg-gradient-to-b from-amber-950/40 to-slate-900 border-2 border-amber-500/40 rounded-2xl text-center space-y-3 mt-8 shadow-xl">
                    <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
                    <div className="text-xs font-bold text-slate-200">
                      {finals[0]?.winnerId
                        ? `Champion: ${finals[0].player1?.id === finals[0].winnerId ? finals[0].player1?.name : finals[0].player2?.name}`
                        : 'Finals Match'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Winner takes all: {currentTour.prizeXp} XP + {currentTour.prizeTrophy}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
