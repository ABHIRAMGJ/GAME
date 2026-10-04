import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, Shield, Heart, Zap, Sparkles, Flame, Eye } from 'lucide-react';

interface ColorClashProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

type CardColor = 'Crimson' | 'Azure' | 'Emerald' | 'Amber';
type CardAction = 'Strike' | 'Shield' | 'Heal' | 'Surge' | 'Chaos Wild';

interface Card {
  id: string;
  color: CardColor;
  action: CardAction;
  value: number; // damage or heal or shield
  description: string;
}

const COLOR_THEMES: Record<CardColor, { bg: string; border: string; text: string; light: string }> = {
  Crimson: { bg: 'bg-red-950/70', border: 'border-red-500/60', text: 'text-red-400', light: 'bg-red-500' },
  Azure: { bg: 'bg-cyan-950/70', border: 'border-cyan-500/60', text: 'text-cyan-400', light: 'bg-cyan-500' },
  Emerald: { bg: 'bg-emerald-950/70', border: 'border-emerald-500/60', text: 'text-emerald-400', light: 'bg-emerald-500' },
  Amber: { bg: 'bg-amber-950/70', border: 'border-amber-500/60', text: 'text-amber-400', light: 'bg-amber-500' },
};

function generateDeck(): Card[] {
  const colors: CardColor[] = ['Crimson', 'Azure', 'Emerald', 'Amber'];
  const actions: Array<{ action: CardAction; val: number; desc: string }> = [
    { action: 'Strike', val: 20, desc: 'Deals 20 damage' },
    { action: 'Strike', val: 25, desc: 'Heavy 25 damage' },
    { action: 'Shield', val: 20, desc: 'Absorbs 20 incoming damage' },
    { action: 'Heal', val: 18, desc: 'Restores 18 Health' },
    { action: 'Surge', val: 15, desc: 'Deals 15 damage & boosts next attack' },
    { action: 'Chaos Wild', val: 30, desc: 'Wild elemental strike (30 damage)' },
  ];

  const deck: Card[] = [];
  for (let i = 0; i < 35; i++) {
    const c = colors[Math.floor(Math.random() * colors.length)];
    const act = actions[Math.floor(Math.random() * actions.length)];
    deck.push({
      id: 'card_' + i + '_' + Math.random().toString(36).substring(2, 6),
      color: c,
      action: act.action,
      value: act.val,
      description: act.desc,
    });
  }
  return deck;
}

export const ColorClashGame: React.FC<ColorClashProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  const [playerHp, setPlayerHp] = useState(100);
  const [opponentHp, setOpponentHp] = useState(100);
  const [playerShield, setPlayerShield] = useState(0);
  const [opponentShield, setOpponentShield] = useState(0);

  const [hand, setHand] = useState<Card[]>([]);
  const [opponentHandCount, setOpponentHandCount] = useState(5);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Initialize match
  useEffect(() => {
    const fullDeck = generateDeck();
    setHand(fullDeck.slice(0, 5));
    setDiscardPile([fullDeck[5]]);
  }, []);

  const handlePlayCard = (card: Card, index: number) => {
    if (turn !== 'player' || winner) return;

    sounds.playMove();

    // Remove from hand
    const newHand = [...hand];
    newHand.splice(index, 1);
    setHand(newHand);
    setDiscardPile((prev) => [card, ...prev.slice(0, 5)]);

    // Apply Card Effects
    let logMsg = `You played ${card.color} ${card.action}`;

    if (card.action === 'Strike' || card.action === 'Chaos Wild') {
      sounds.playExplosion();
      const dmg = card.value;
      if (opponentShield > 0) {
        const absorbed = Math.min(opponentShield, dmg);
        const remDmg = dmg - absorbed;
        setOpponentShield((s) => s - absorbed);
        setOpponentHp((hp) => {
          const next = Math.max(0, hp - remDmg);
          if (next === 0) finishMatch('player');
          return next;
        });
        logMsg += ` (Absorbed ${absorbed}, dealt ${remDmg} DMG)`;
      } else {
        setOpponentHp((hp) => {
          const next = Math.max(0, hp - dmg);
          if (next === 0) finishMatch('player');
          return next;
        });
        logMsg += ` (Dealt ${dmg} DMG)`;
      }
    } else if (card.action === 'Shield') {
      sounds.playSuccess();
      setPlayerShield((s) => s + card.value);
      logMsg += ` (+${card.value} Shield)`;
    } else if (card.action === 'Heal') {
      sounds.playSuccess();
      setPlayerHp((hp) => Math.min(100, hp + card.value));
      logMsg += ` (+${card.value} HP)`;
    }

    setLogs((prev) => [logMsg, ...prev.slice(0, 4)]);

    // Draw 1 replacement card
    if (newHand.length < 5) {
      const colors: CardColor[] = ['Crimson', 'Azure', 'Emerald', 'Amber'];
      const actions: CardAction[] = ['Strike', 'Shield', 'Heal', 'Surge', 'Chaos Wild'];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const act = actions[Math.floor(Math.random() * actions.length)];
      newHand.push({
        id: 'drawn_' + Math.random(),
        color: c,
        action: act,
        value: act === 'Chaos Wild' ? 30 : act === 'Strike' ? 22 : 18,
        description: `${act} ability`,
      });
      setHand(newHand);
    }

    setTurn('opponent');
  };

  // Bot AI Turn
  useEffect(() => {
    if (turn === 'opponent' && !winner && !isMultiplayer) {
      const timer = setTimeout(() => {
        botPlay();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, isMultiplayer]);

  const botPlay = () => {
    const colors: CardColor[] = ['Crimson', 'Azure', 'Emerald', 'Amber'];
    const actions: CardAction[] = ['Strike', 'Shield', 'Heal', 'Chaos Wild'];
    const botCard: Card = {
      id: 'bot_card',
      color: colors[Math.floor(Math.random() * colors.length)],
      action: actions[Math.floor(Math.random() * actions.length)],
      value: 20,
      description: 'Bot Action',
    };

    sounds.playMove();
    setDiscardPile((prev) => [botCard, ...prev.slice(0, 5)]);

    let logMsg = `Opponent played ${botCard.color} ${botCard.action}`;

    if (botCard.action === 'Strike' || botCard.action === 'Chaos Wild') {
      sounds.playExplosion();
      const dmg = botCard.value;
      if (playerShield > 0) {
        const absorbed = Math.min(playerShield, dmg);
        const rem = dmg - absorbed;
        setPlayerShield((s) => s - absorbed);
        setPlayerHp((hp) => {
          const next = Math.max(0, hp - rem);
          if (next === 0) finishMatch('opponent');
          return next;
        });
      } else {
        setPlayerHp((hp) => {
          const next = Math.max(0, hp - dmg);
          if (next === 0) finishMatch('opponent');
          return next;
        });
      }
    } else if (botCard.action === 'Shield') {
      setOpponentShield((s) => s + 20);
    } else if (botCard.action === 'Heal') {
      setOpponentHp((hp) => Math.min(100, hp + 18));
    }

    setLogs((prev) => [logMsg, ...prev.slice(0, 4)]);
    setTurn('player');
  };

  const finishMatch = async (victor: 'player' | 'opponent') => {
    setWinner(victor);

    if (victor === 'player') {
      sounds.playSuccess();
      confetti({ particleCount: 75, spread: 65 });
    }

    try {
      await api.recordMatch({
        gameId: 'colorclash',
        opponentId: isMultiplayer ? (currentRoom?.guestId || 'guest') : 'bot_chroma',
        opponentName: isMultiplayer ? (isHost ? currentRoom?.guestName : currentRoom?.hostName) : 'Chroma Duelist AI',
        isBot: !isMultiplayer,
        result: victor === 'player' ? 'win' : 'loss',
        userScore: playerHp,
        opponentScore: opponentHp,
        durationSeconds: 100,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const restartMatch = () => {
    setPlayerHp(100);
    setOpponentHp(100);
    setPlayerShield(0);
    setOpponentShield(0);
    setWinner(null);
    setTurn('player');
    const fullDeck = generateDeck();
    setHand(fullDeck.slice(0, 5));
    setDiscardPile([fullDeck[5]]);
    setLogs([]);
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-68px)] flex flex-col items-center justify-center mx-auto p-1 sm:p-2 overflow-hidden select-none">
      {/* Header HUD */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-1.5 py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-cyan-400">YOU</span>
          <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-400">
            <Heart className="w-3.5 h-3.5" /> {playerHp} HP
          </div>
          {playerShield > 0 && (
            <div className="flex items-center gap-1 font-mono text-xs font-bold text-cyan-300">
              <Shield className="w-3.5 h-3.5" /> +{playerShield}
            </div>
          )}
        </div>

        <div className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${
          turn === 'player' ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40' : 'bg-red-950/60 text-red-300 border-red-500/40'
        }`}>
          {turn === 'player' ? 'YOUR TURN TO PLAY' : 'OPPONENT THINKING'}
        </div>

        <div className="flex items-center gap-3">
          {opponentShield > 0 && (
            <div className="flex items-center gap-1 font-mono text-xs font-bold text-cyan-300">
              <Shield className="w-3.5 h-3.5" /> +{opponentShield}
            </div>
          )}
          <div className="flex items-center gap-1 font-mono text-xs font-bold text-red-400">
            <Heart className="w-3.5 h-3.5" /> {opponentHp} HP
          </div>
          <span className="text-xs font-bold text-red-400">OPPONENT</span>
        </div>
      </div>

      {/* Arena Battlefield */}
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-between gap-3 shadow-2xl relative max-h-[calc(100vh-140px)]">
        {/* Opponent Cards (Face Down) */}
        <div className="flex gap-2 justify-center">
          {Array.from({ length: opponentHandCount }).map((_, i) => (
            <div
              key={i}
              className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-lg"
            >
              <div className="w-6 h-6 rounded-full border border-slate-600/50 flex items-center justify-center text-slate-500 text-[10px] font-mono font-bold">
                GA
              </div>
            </div>
          ))}
        </div>

        {/* Center Battle Field / Discard Card */}
        <div className="flex items-center gap-4 sm:gap-6 my-1">
          {discardPile[0] && (
            <div className={`w-20 h-28 sm:w-24 sm:h-32 rounded-xl border-2 p-2 flex flex-col justify-between shadow-2xl animate-fade-in ${COLOR_THEMES[discardPile[0].color].bg} ${COLOR_THEMES[discardPile[0].color].border}`}>
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className={COLOR_THEMES[discardPile[0].color].text}>{discardPile[0].color}</span>
              </div>
              <div className="text-center font-bold text-xs sm:text-sm text-white">
                {discardPile[0].action}
              </div>
              <div className="text-[9px] text-slate-300 text-center line-clamp-2">
                {discardPile[0].description}
              </div>
            </div>
          )}

          {/* Action Combat Log */}
          <div className="w-56 sm:w-64 h-20 sm:h-24 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-0.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            {logs.slice(-4).map((l, i) => (
              <div key={i} className="text-slate-300">{l}</div>
            ))}
          </div>
        </div>

        {/* Player Hand Cards */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
          {hand.map((card, idx) => {
            const theme = COLOR_THEMES[card.color];
            return (
              <div
                key={card.id}
                onClick={() => handlePlayCard(card, idx)}
                className={`w-22 h-32 sm:w-26 sm:h-36 rounded-xl border-2 p-2 sm:p-2.5 flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 ${theme.bg} ${theme.border}`}
              >
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className={theme.text}>{card.color}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.light }} />
                </div>

                <div className="text-center">
                  <div className="font-bold text-xs sm:text-sm text-white">{card.action}</div>
                  <div className="text-[9px] text-slate-300 mt-0.5 line-clamp-2">{card.description}</div>
                </div>

                <div className="text-[9px] font-mono text-center text-slate-400">
                  Tap to Play
                </div>
              </div>
            );
          })}
        </div>

        {/* Victory Modal */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <Trophy className="w-14 h-14 text-amber-400" />
            <h2 className="text-2xl font-bold text-white uppercase">
              {winner === 'player' ? 'COLOR CLASH VICTORY!' : 'DUEL LOST!'}
            </h2>
            <div className="flex gap-2 mt-2">
              <button onClick={restartMatch} className="py-2 px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg">
                Play Again
              </button>
              <button onClick={onBackToDashboard} className="py-2 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
