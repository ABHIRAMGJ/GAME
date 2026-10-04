import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { GameId } from '../../types/index.ts';
import { GAMES_LIST } from '../../data/games.ts';
import { Bot, Swords, X, Loader2 } from 'lucide-react';

interface MatchmakingModalProps {
  gameId: GameId;
  isOpen: boolean;
  onClose: () => void;
  onPlayBot: (gameId: GameId) => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  gameId,
  isOpen,
  onClose,
  onPlayBot,
}) => {
  const { user } = useAuth();
  const { joinMatchmaking, leaveMatchmaking, isQueueWaiting } = useSocket();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const gameInfo = GAMES_LIST.find((g) => g.id === gameId) || GAMES_LIST[0];

  useEffect(() => {
    if (!isOpen) return;

    joinMatchmaking(gameId);
    setElapsedSeconds(0);

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      leaveMatchmaking();
    };
  }, [isOpen, gameId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center relative">
            <span className="text-3xl">{gameInfo.icon}</span>
            <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>

          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            FINDING OPPONENT
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            {gameInfo.name} · Searching Elo {user?.ratings[gameId] || 1200} ± 150
          </p>
        </div>

        <div className="text-2xl font-mono font-bold text-cyan-400">
          00:{elapsedSeconds < 10 ? `0${elapsedSeconds}` : elapsedSeconds}
        </div>

        <div className="space-y-2 pt-2">
          {elapsedSeconds >= 4 && (
            <button
              onClick={() => {
                onClose();
                onPlayBot(gameId);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all animate-fade-in"
            >
              <Bot className="w-4 h-4" /> Play Against AI Bot
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            Cancel Matchmaking
          </button>
        </div>
      </div>
    </div>
  );
};
