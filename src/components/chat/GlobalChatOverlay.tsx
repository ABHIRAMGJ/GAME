import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { ChatMessage } from '../../types/index.ts';
import { sounds } from '../../utils/sound.ts';
import {
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Send,
  Smile,
  ShieldAlert,
  Hash,
  Flag,
  Users,
  Swords,
  Trophy,
} from 'lucide-react';

const CHANNELS = [
  { id: 'global', name: 'global', label: 'Global', icon: Hash },
  { id: 'lfg', name: 'lfg', label: 'Looking for Group', icon: Swords },
  { id: 'strategy', name: 'strategy', label: 'Tactics & Strategy', icon: MessageSquare },
  { id: 'tournaments', name: 'tournaments', label: 'Tournaments', icon: Trophy },
];

const QUICK_EMOTES = ['GG', 'GLHF', '🔥', '🏆', '⚔️', '♟️', '💣', '🏎️', '🎯', '🧱'];

export const GlobalChatOverlay: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState('global');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reportedMessageIds, setReportedMessageIds] = useState<Set<string>>(new Set());
  const [statusToast, setStatusToast] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch channel messages on channel switch or initial load
  const loadChannelMessages = async (channel: string) => {
    try {
      const res = await api.getChatMessages(channel);
      setMessages(res.messages);
    } catch (e) {
      console.error('Failed to load chat:', e);
    }
  };

  useEffect(() => {
    loadChannelMessages(activeChannel);
  }, [activeChannel]);

  // Periodic refresh & live incoming messages
  useEffect(() => {
    const interval = setInterval(() => {
      api.getChatMessages(activeChannel).then((res) => {
        setMessages((prev) => {
          if (res.messages.length > prev.length && !isOpen) {
            setUnreadCount((c) => c + (res.messages.length - prev.length));
          }
          return res.messages;
        });
      }).catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [activeChannel, isOpen]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!user) {
      openAuthModal('login');
      return;
    }

    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await api.sendChannelMessage(textToSend, activeChannel);
      setMessages((prev) => [...prev, res.message]);
      sounds.playMove();

      if (res.moderated) {
        setStatusToast('Notice: Some words were filtered by the moderation system.');
        setTimeout(() => setStatusToast(''), 4000);
      }
    } catch (e: any) {
      setStatusToast(e.message || 'Failed to send message');
      setTimeout(() => setStatusToast(''), 3000);
    }
  };

  const handleReport = async (messageId: string) => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    try {
      await api.reportMessage(messageId, 'Inappropriate language');
      setReportedMessageIds((prev) => new Set([...prev, messageId]));
      setStatusToast('Message flagged and reported to moderators.');
      setTimeout(() => setStatusToast(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Toast Alert */}
      {statusToast && (
        <div className="mb-2 p-2.5 bg-slate-900 border border-slate-700 text-xs text-amber-300 rounded-xl shadow-2xl animate-fade-in flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Floating Toggle Button (When Minimized) */}
      {!isOpen && (
        <button
          onClick={handleToggleOpen}
          className="relative group p-3.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-2"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs font-bold tracking-wider uppercase pr-1 hidden sm:inline">
            Arena Chat
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded Chat Overlay Box */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[520px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Arena Global Chat
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleOpen}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Minimize Chat"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleOpen}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="flex bg-slate-950/40 border-b border-slate-800/80 px-2 pt-1.5 gap-1 overflow-x-auto text-[11px] font-semibold">
            {CHANNELS.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChannel === ch.id;

              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3 h-3" /> #{ch.name}
                </button>
              );
            })}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
            {messages.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                No messages yet in #{activeChannel}. Be the first to start the chat!
              </div>
            ) : (
              messages.map((m) => {
                const isMe = user && user.id === m.senderId;
                const isReported = reportedMessageIds.has(m.id);

                return (
                  <div key={m.id} className="group flex items-start gap-2.5">
                    <img
                      src={m.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                      alt={m.senderName}
                      className="w-7 h-7 rounded-lg object-cover border border-slate-800 mt-0.5"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${isMe ? 'text-cyan-400' : 'text-slate-200'}`}>
                            {m.senderName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {!isMe && (
                          <button
                            onClick={() => handleReport(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-amber-400 transition-opacity"
                            title="Report Message"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className={`p-2.5 rounded-xl text-xs break-words leading-relaxed ${
                        isMe
                          ? 'bg-cyan-950/40 text-cyan-100 border border-cyan-800/30'
                          : 'bg-slate-950/70 text-slate-300 border border-slate-800/60'
                      }`}>
                        {m.text}
                      </div>

                      {m.flagged && (
                        <span className="text-[9px] text-amber-500/70 italic block mt-0.5">
                          ⚠️ Filtered by Automated Moderation
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Emote Palette */}
          {showEmotes && (
            <div className="p-2 bg-slate-950 border-t border-slate-800 flex flex-wrap gap-1.5 animate-fade-in">
              {QUICK_EMOTES.map((em) => (
                <button
                  key={em}
                  onClick={() => {
                    setInputText((prev) => `${prev} ${em}`.trim());
                    setShowEmotes(false);
                  }}
                  className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200 transition-colors"
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {/* Input Box Form */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmotes(!showEmotes)}
              className="p-2 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-900 transition-colors"
              title="Add Emote / Quick Words"
            >
              <Smile className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder={user ? `Chat in #${activeChannel}...` : 'Log in to participate in chat'}
              value={inputText}
              disabled={!user}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!user || !inputText.trim()}
              className="p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
