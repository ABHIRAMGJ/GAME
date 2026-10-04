/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SocketProvider, useSocket } from './context/SocketContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Dashboard } from './components/dashboard/Dashboard.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { ProfileModal } from './components/profile/ProfileModal.tsx';
import { FriendsDrawer } from './components/friends/FriendsDrawer.tsx';
import { LeaderboardModal } from './components/leaderboard/LeaderboardModal.tsx';
import { GameLobby } from './components/lobby/GameLobby.tsx';
import { MatchmakingModal } from './components/lobby/MatchmakingModal.tsx';
import { GlobalChatOverlay } from './components/chat/GlobalChatOverlay.tsx';
import { TournamentModal } from './components/tournaments/TournamentModal.tsx';
import { useEscapeToDashboard } from './hooks/useEscapeToDashboard.ts';
import { GAMES_LIST } from './data/games.ts';
import { getStoredToken } from './services/api.ts';

// 20 Game Engines
import { ChessGame } from './games/chess/ChessGame.tsx';
import { CarromGame } from './games/carrom/CarromGame.tsx';
import { LudoGame } from './games/ludo/LudoGame.tsx';
import { TanksGame } from './games/tanks/TanksGame.tsx';
import { RacingGame } from './games/racing/RacingGame.tsx';
import { TetrisGame } from './games/tetris/TetrisGame.tsx';
import { TicTacToeGame } from './games/tictactoe/TicTacToeGame.tsx';
import { Connect4Game } from './games/connect4/Connect4Game.tsx';
import { Pool8BallGame } from './games/pool8ball/Pool8BallGame.tsx';
import { AirHockeyGame } from './games/airhockey/AirHockeyGame.tsx';
import { ArcheryGame } from './games/archery/ArcheryGame.tsx';
import { QuizGame } from './games/quiz/QuizGame.tsx';
import { SnakeGame } from './games/snake/SnakeGame.tsx';
import { PongGame } from './games/pong/PongGame.tsx';
import { CheckersGame } from './games/checkers/CheckersGame.tsx';
import { MinesweeperGame } from './games/minesweeper/MinesweeperGame.tsx';
import { MemoryGame } from './games/memory/MemoryGame.tsx';
import { WordleGame } from './games/wordle/WordleGame.tsx';
import { FlappyGame } from './games/flappy/FlappyGame.tsx';
import { SolitaireGame } from './games/solitaire/SolitaireGame.tsx';
import { Kitchen3DGame } from './games/kitchen/Kitchen3DGame.tsx';

import { InGameStatsPanel } from './components/game/InGameStatsPanel.tsx';
import { GameId } from './types/index.ts';
import {
  Swords,
  Check,
  X,
  ArrowLeft,
  Share2,
  Maximize2,
  Minimize2,
  Copy,
  Sparkles,
  BarChart2,
  Bot,
} from 'lucide-react';

function MainApp() {
  const { user, openAuthModal, loginAsGuest } = useAuth();
  const {
    currentRoom,
    createRoom,
    joinRoom,
    incomingChallenge,
    acceptIncomingChallenge,
    declineIncomingChallenge,
  } = useSocket();

  const [activeView, setActiveView] = useState<'dashboard' | 'lobby' | 'game' | 'kitchen'>('dashboard');
  const [selectedGameId, setSelectedGameId] = useState<GameId>('chess');
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');

  // 3-Second Blackout Transition for Special Kitchen Mode
  const [isBlackScreenActive, setIsBlackScreenActive] = useState(false);
  const [blackScreenCountdown, setBlackScreenCountdown] = useState(3);

  // Modals state
  const [profileOpen, setProfileOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [matchmakingGameId, setMatchmakingGameId] = useState<GameId | null>(null);

  // Invite Link feedback
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteNotification, setInviteNotification] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement | null>(null);

  // In-Game Statistics Panel Visibility
  const STATS_SUPPORTED_GAMES: GameId[] = [
    'tanks', 'racing', 'tetris', 'carrom', 'ludo', 'tictactoe', 'connect4',
    'airhockey', 'archery', 'quiz', 'pool8ball', 'snake', 'pong',
    'checkers', 'minesweeper', 'memory', 'wordle', 'flappy', 'solitaire',
  ];

  const [showStatsPanel, setShowStatsPanel] = useState<boolean>(true);
  const isStatsSupported = STATS_SUPPORTED_GAMES.includes(selectedGameId);
  const isStatsVisible = showStatsPanel && isStatsSupported;

  // 1. Hook to listen for 'Esc' key to trigger 'Back to Dashboard' from any active game
  useEscapeToDashboard(() => {
    if (activeView === 'game') {
      setActiveView('dashboard');
    }
  }, activeView === 'game');

  // 2. Handle incoming invite links via pathname (/join/:code) or query string (?join=code or ?room=code)
  useEffect(() => {
    async function processInvite() {
      let code: string | null = null;
      const path = window.location.pathname;

      if (path.startsWith('/join/')) {
        code = path.split('/join/')[1]?.trim();
      } else {
        const params = new URLSearchParams(window.location.search);
        code = params.get('join') || params.get('room');
      }

      if (code) {
        // Friend does NOT need an account: auto-assign guest user if not authenticated!
        if (!user && !getStoredToken()) {
          try {
            await loginAsGuest();
            setInviteNotification('Joined room as Guest! Ready to play.');
            setTimeout(() => setInviteNotification(null), 4000);
          } catch (err) {
            console.error('Guest join failed:', err);
          }
        }

        joinRoom(code);
        setActiveView('lobby');
      }
    }

    processInvite();
  }, [user, joinRoom, loginAsGuest]);

  const handleSelectGame = (
    gameId: GameId,
    multiplayer = false,
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme' = 'medium'
  ) => {
    setSelectedGameId(gameId);
    setIsMultiplayer(multiplayer);
    setBotDifficulty(difficulty);
    setActiveView('game');
  };

  const handleCreatePrivateRoom = (gameId: GameId) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setSelectedGameId(gameId);
    createRoom(gameId, true);
    setActiveView('lobby');
  };

  const handleOpenQuickMatch = (gameId: GameId) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setMatchmakingGameId(gameId);
  };

  // Exit Game action
  const handleExitGame = () => {
    setActiveView('dashboard');
  };

  // Copy Game Invite Link
  const handleCopyGameInviteLink = () => {
    const code = currentRoom?.code || Math.random().toString(36).substring(2, 8).toUpperCase();
    const url = `${window.location.origin}/join/${code}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setLinkCopied(true);
    setInviteNotification('Invite link copied! Send to your friend — No account needed!');
    setTimeout(() => {
      setLinkCopied(false);
      setInviteNotification(null);
    }, 2500);
  };

  // Special Kitchen 3-Second Blackout Transition
  const handleTriggerKitchenSpecial = () => {
    setIsBlackScreenActive(true);
    setBlackScreenCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setBlackScreenCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setIsBlackScreenActive(false);
        setActiveView('kitchen');
      }
    }, 1000);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentGameInfo = GAMES_LIST.find((g) => g.id === selectedGameId);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        onGoHome={() => setActiveView('dashboard')}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenFriends={() => setFriendsOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenTournaments={() => setTournamentOpen(true)}
      />

      {/* Floating Invite Notification Toast */}
      {inviteNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 py-2 px-4 bg-emerald-600 border border-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{inviteNotification}</span>
        </div>
      )}

      {/* Incoming Challenge Live Notification Banner */}
      {incomingChallenge && (
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 border-b border-indigo-500/50 py-2 px-4 text-xs font-semibold text-white flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>
              <strong>@{incomingChallenge.challenger.username}</strong> challenged you to{' '}
              <span className="uppercase text-cyan-300 font-bold">{incomingChallenge.gameId}</span>!
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                acceptIncomingChallenge();
                setSelectedGameId(incomingChallenge.gameId);
                setActiveView('lobby');
              }}
              className="py-1 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Accept
            </button>
            <button
              onClick={declineIncomingChallenge}
              className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {activeView === 'dashboard' && (
          <Dashboard
            onSelectGame={handleSelectGame}
            onCreatePrivateRoom={handleCreatePrivateRoom}
            onOpenQuickMatch={handleOpenQuickMatch}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenFriends={() => setFriendsOpen(true)}
            onOpenKitchenSpecial={handleTriggerKitchenSpecial}
          />
        )}

        {activeView === 'lobby' && (
          <GameLobby
            onStartMatch={(gId, mp) => handleSelectGame(gId, mp)}
            onCancel={() => setActiveView('dashboard')}
          />
        )}

        {activeView === 'game' && (
          <div
            ref={gameContainerRef}
            className="h-[calc(100vh-64px)] w-full overflow-hidden flex flex-col items-center justify-between p-1 bg-[#06080e]"
          >
            {/* Top In-Game Action Bar: Prominent End/Back Button, Game Details, Bot Level, Copy Invite, Fullscreen */}
            <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-1 px-2.5 bg-slate-900/90 border border-slate-800 rounded-xl mb-1 shadow-lg backdrop-blur-sm z-30 shrink-0">
              <div className="flex items-center gap-2">
                {/* OMNIPRESENT END / BACK BUTTON */}
                <button
                  onClick={handleExitGame}
                  className="py-1 px-2.5 bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/40 text-xs font-black rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Leave match and return to Dashboard (or press Esc)"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Exit Game</span>
                  <kbd className="hidden sm:inline bg-slate-950 text-[10px] font-mono px-1 py-0.2 rounded border border-slate-800 text-slate-400">
                    Esc
                  </kbd>
                </button>

                {/* Game Title & Icon */}
                <div className="flex items-center gap-1.5 text-xs font-black text-white pl-1.5 border-l border-slate-800">
                  <span className="text-base">{currentGameInfo?.icon || '🎮'}</span>
                  <span className="hidden sm:inline uppercase tracking-wider font-mono text-cyan-400">
                    {currentGameInfo?.name || selectedGameId}
                  </span>
                </div>
              </div>

              {/* Bot Difficulty Selector (Easy, Medium, Hard, Extreme) */}
              {!isMultiplayer && (
                <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
                  <span className="text-[10px] text-slate-400 font-bold px-1.5 hidden md:inline flex items-center gap-1">
                    <Bot className="w-3 h-3 text-cyan-400" /> Bot:
                  </span>
                  {(['easy', 'medium', 'hard', 'extreme'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setBotDifficulty(lvl)}
                      className={`py-0.5 px-2 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        botDifficulty === lvl
                          ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title={`Switch bot AI to ${lvl.toUpperCase()}`}
                    >
                      {lvl.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}

              {/* Match Mode Badge */}
              <div className="hidden lg:flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border ${
                    isMultiplayer
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                      : 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isMultiplayer ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'
                    }`}
                  />
                  {isMultiplayer ? 'LIVE ARENA' : `BOT (${botDifficulty.toUpperCase()})`}
                </span>
              </div>

              {/* Quick Invite Link, Stats Toggle & Fullscreen */}
              <div className="flex items-center gap-1.5">
                {/* Stats Toggle button */}
                {isStatsSupported && (
                  <button
                    onClick={() => setShowStatsPanel(!showStatsPanel)}
                    className={`py-1 px-2 text-xs font-bold rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                      showStatsPanel
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                    }`}
                    title="Toggle In-Game Live Statistics Panel"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Stats {showStatsPanel ? 'On' : 'Off'}</span>
                  </button>
                )}

                <button
                  onClick={handleCopyGameInviteLink}
                  className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy invite link: friend can join without an account!"
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
                  <span className="hidden sm:inline">{linkCopied ? 'Copied!' : 'Invite Friend'}</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </header>

            {/* Exactly centered, zero-scroll game viewport with right-side statistics panel */}
            <div className="flex-1 w-full max-w-7xl mx-auto overflow-hidden flex flex-row items-center justify-center gap-2 sm:gap-4 p-0.5">
              {/* Center Game Arena */}
              <div className="flex-1 h-full overflow-hidden flex items-center justify-center">
                {selectedGameId === 'chess' && (
                  <ChessGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} />
                )}
                {selectedGameId === 'carrom' && (
                  <CarromGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} />
                )}
                {selectedGameId === 'ludo' && (
                  <LudoGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} />
                )}
                {selectedGameId === 'tanks' && (
                  <TanksGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} />
                )}
                {selectedGameId === 'racing' && (
                  <RacingGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} />
                )}
                {selectedGameId === 'tetris' && (
                  <TetrisGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} />
                )}
                {selectedGameId === 'tictactoe' && (
                  <TicTacToeGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'connect4' && (
                  <Connect4Game onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'pool8ball' && (
                  <Pool8BallGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'airhockey' && (
                  <AirHockeyGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} />
                )}
                {selectedGameId === 'archery' && (
                  <ArcheryGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} />
                )}
                {selectedGameId === 'quiz' && (
                  <QuizGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} />
                )}
                {selectedGameId === 'snake' && (
                  <SnakeGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'pong' && (
                  <PongGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'checkers' && (
                  <CheckersGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'minesweeper' && (
                  <MinesweeperGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'memory' && (
                  <MemoryGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'wordle' && (
                  <WordleGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'flappy' && (
                  <FlappyGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
                {selectedGameId === 'solitaire' && (
                  <SolitaireGame onBackToDashboard={handleExitGame} isMultiplayer={isMultiplayer} botDifficulty={botDifficulty} />
                )}
              </div>

              {/* In-Game Statistics Panel - Conditionally visible on right side based on selected game */}
              {isStatsVisible && (
                <div className="hidden lg:flex h-full items-center shrink-0">
                  <InGameStatsPanel
                    gameId={selectedGameId}
                    user={user}
                    isMultiplayer={isMultiplayer}
                    onClose={() => setShowStatsPanel(false)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3D Kitchen Free-Roam Arena (Requested: full 3D interactive kitchen) */}
        {activeView === 'kitchen' && (
          <div className="h-[calc(100vh-64px)] w-full overflow-hidden flex flex-col items-center justify-center bg-slate-950">
            <Kitchen3DGame onBackToDashboard={() => setActiveView('dashboard')} />
          </div>
        )}
      </main>

      {/* 3-SECOND FULL BLACK SCREEN TRANSITION (Requested: whole screen goes to black for 3 sec and goes to kitchen) */}
      {isBlackScreenActive && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-white text-center select-none animate-in fade-in duration-300">
          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-pink-950/80 border border-pink-500/40 text-xs font-mono text-pink-300 tracking-wider">
              <Sparkles className="w-4 h-4 text-pink-400" /> SPECIAL SECRET LEVEL ACTIVATED
            </div>

            <div className="text-7xl sm:text-8xl font-black text-rose-500 font-mono tracking-tighter animate-pulse">
              {blackScreenCountdown}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-100">
                Loading The Ultimate 3D Arena...
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Generating 3D interactive surfaces & ultra-realistic fixtures...
              </p>
            </div>

            <div className="pt-4 text-xs sm:text-sm text-rose-300/90 font-bold italic tracking-wide">
              "AND I RESPECT ALL WOMEN JUST FOR FUN 😄"
            </div>
          </div>
        </div>
      )}

      {/* Platform Modals */}
      <AuthModal />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <FriendsDrawer
        isOpen={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onStartGame={(gId, mp) => handleSelectGame(gId, mp)}
      />
      <LeaderboardModal isOpen={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <TournamentModal
        isOpen={tournamentOpen}
        onClose={() => setTournamentOpen(false)}
        onStartGame={(gId, mp) => handleSelectGame(gId, mp)}
      />

      {/* Persistent Global Chat Overlay across all views */}
      <GlobalChatOverlay />

      {matchmakingGameId && (
        <MatchmakingModal
          gameId={matchmakingGameId}
          isOpen={true}
          onClose={() => setMatchmakingGameId(null)}
          onPlayBot={(gId) => {
            setMatchmakingGameId(null);
            handleSelectGame(gId, false, botDifficulty);
          }}
        />
      )}

      {/* Clean Gaming Footer - Only visible on Dashboard so it doesn't push games or cause scrolling */}
      {activeView === 'dashboard' && (
        <footer className="w-full bg-slate-950 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="font-mono text-slate-400">
              GAME ARENA · 20 Free Playable Games · 4-Player Carrom & Ludo · Bot AI Easy/Med/Hard/Extreme
            </div>
            <div className="flex gap-4">
              <button onClick={() => setLeaderboardOpen(true)} className="hover:text-slate-300">
                Leaderboards
              </button>
              <button onClick={() => setFriendsOpen(true)} className="hover:text-slate-300">
                Community
              </button>
              <button onClick={() => setProfileOpen(true)} className="hover:text-slate-300">
                Profile
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
