import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { GameId } from '../../types/index.ts';
import { GAMES_LIST } from '../../data/games.ts';
import { Copy, Check, Share2, Users, Bot, Play, X, ShieldCheck } from 'lucide-react';

interface GameLobbyProps {
  onStartMatch: (gameId: GameId, isMultiplayer: boolean) => void;
  onCancel: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ onStartMatch, onCancel }) => {
  const { currentRoom, isHost, hostReady, guestReady, setReady, startGame, leaveRoom } = useSocket();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!currentRoom) return null;

  const gameInfo = GAMES_LIST.find((g) => g.id === currentRoom.gameId) || GAMES_LIST[0];
  const inviteUrl = `${window.location.origin}/join/${currentRoom.code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    startGame();
    onStartMatch(currentRoom.gameId, true);
  };

  const handlePlayBotFallback = () => {
    leaveRoom();
    onStartMatch(currentRoom.gameId, false);
  };

  const opponentJoined = !!currentRoom.guestId;

  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto p-4 w-full">
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Game Title */}
        <div className="text-center pb-4 border-b border-slate-800">
          <span className="text-4xl mb-2 inline-block">{gameInfo.icon}</span>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">{gameInfo.name} LOBBY</h2>
          <p className="text-xs text-slate-400 mt-1">{gameInfo.tagline}</p>
        </div>

        {/* Head-to-Head Player Slots */}
        <div className="flex items-center justify-between gap-4 py-4 px-6 bg-slate-950/80 rounded-2xl border border-slate-800/80">
          {/* Host */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <img
              src={currentRoom.hostAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=host'}
              alt={currentRoom.hostName}
              className="w-16 h-16 rounded-2xl border-2 border-cyan-400 object-cover shadow-lg"
            />
            <div className="text-center">
              <div className="text-xs font-bold text-white">{currentRoom.hostName}</div>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">HOST</span>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-black font-mono text-slate-600">VS</span>
          </div>

          {/* Guest */}
          <div className="flex flex-col items-center gap-2 flex-1">
            {opponentJoined ? (
              <>
                <img
                  src={currentRoom.guestAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=guest'}
                  alt={currentRoom.guestName}
                  className="w-16 h-16 rounded-2xl border-2 border-emerald-400 object-cover shadow-lg animate-fade-in"
                />
                <div className="text-center">
                  <div className="text-xs font-bold text-white">{currentRoom.guestName}</div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> READY
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 animate-pulse">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-500">Waiting for friend...</div>
                  <span className="text-[10px] text-amber-400/80 font-mono">ROOM OPEN</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Room Invite Link Box */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
            <span>Invite Code: <strong className="text-cyan-400 font-mono tracking-widest text-sm">{currentRoom.code}</strong></span>
            <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
              ✨ No account needed for friend
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black rounded-xl border border-cyan-400 flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
              {copied ? 'Copied Link!' : 'Copy Invite Link'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Send this link to your friend. When they open it, the game starts instantly without requiring registration or sign in.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {opponentJoined ? (
            <button
              onClick={handleStartGame}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> START GAME NOW!
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePlayBotFallback}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Bot className="w-4 h-4" /> Switch to Bot
              </button>
              <button
                onClick={() => { leaveRoom(); onCancel(); }}
                className="py-3 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/40 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel Lobby
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
