import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { Friend, GameId } from '../../types/index.ts';
import { GAMES_LIST } from '../../data/games.ts';
import { X, Search, UserPlus, Swords, Check, Trash2, ShieldAlert } from 'lucide-react';

interface FriendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (gameId: GameId, isMultiplayer: boolean) => void;
}

export const FriendsDrawer: React.FC<FriendsDrawerProps> = ({ isOpen, onClose, onStartGame }) => {
  const { user } = useAuth();
  const { sendChallenge } = useSocket();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFriendToChallenge, setSelectedFriendToChallenge] = useState<Friend | null>(null);
  const [challengeGameId, setChallengeGameId] = useState<GameId>('chess');
  const [statusMsg, setStatusMsg] = useState('');

  const loadFriends = async () => {
    try {
      const res = await api.getFriends();
      setFriends(res.friends);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadFriends();
    }
  }, [isOpen, user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await api.searchUsers(searchQuery);
      setSearchResults(res.users);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendFriendRequest = async (targetId: string) => {
    try {
      await api.sendFriendRequest(targetId);
      setStatusMsg('Friend request dispatched!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      setStatusMsg(err.message || 'Could not send request');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await api.removeFriend(friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendChallenge = () => {
    if (!selectedFriendToChallenge) return;
    sendChallenge(selectedFriendToChallenge.id, challengeGameId);
    setStatusMsg(`Challenge sent to ${selectedFriendToChallenge.username}!`);
    setTimeout(() => {
      setSelectedFriendToChallenge(null);
      setStatusMsg('');
      onStartGame(challengeGameId, true);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col shadow-2xl overflow-y-auto">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">Friends & Challenges</h2>
            <p className="text-xs text-slate-400">Play real-time matches with friends</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div className="my-3 p-2.5 bg-cyan-950/70 border border-cyan-500/40 rounded-xl text-xs text-cyan-300">
            {statusMsg}
          </div>
        )}

        {/* User Search Form */}
        <form onSubmit={handleSearch} className="my-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search players by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Search Results</span>
            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <img src={u.avatar} alt={u.username} className="w-7 h-7 rounded-lg object-cover" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{u.username}</div>
                    <div className="text-[10px] text-slate-500">Lvl {u.level}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleSendFriendRequest(u.id)}
                  className="py-1 px-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded text-xs font-bold flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" /> Add
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Challenge Modal Overlay */}
        {selectedFriendToChallenge && (
          <div className="mb-4 p-4 bg-indigo-950/70 border border-indigo-500/50 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">Challenge @{selectedFriendToChallenge.username}</span>
              <button onClick={() => setSelectedFriendToChallenge(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-300 mb-1 block">Select Game</label>
              <select
                value={challengeGameId}
                onChange={(e) => setChallengeGameId(e.target.value as GameId)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
              >
                {GAMES_LIST.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSendChallenge}
              className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-indigo-500/20"
            >
              Dispatch Challenge! ⚔️
            </button>
          </div>
        )}

        {/* Friends List */}
        <div className="flex-1 space-y-2 mt-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Your Friends ({friends.length})
          </span>

          {friends.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No friends added yet. Search players above to build your squad!
            </div>
          ) : (
            friends.map((f) => (
              <div
                key={f.id}
                className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={f.avatar} alt={f.username} className="w-9 h-9 rounded-xl object-cover" />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                        f.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{f.fullName || f.username}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      @{f.username} · {f.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedFriendToChallenge(f)}
                    className="p-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/20"
                    title="Challenge to a game"
                  >
                    <Swords className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(f.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                    title="Remove Friend"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
