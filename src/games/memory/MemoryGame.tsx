import React, { useState, useEffect } from 'react';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Sparkles } from 'lucide-react';

interface MemoryProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

const ICONS = ['🎮', '🚀', '⭐', '🔥', '💎', '👑', '🎯', '⚡'];

export const MemoryGame: React.FC<MemoryProps> = ({ onBackToDashboard }) => {
  const [cards, setCards] = useState<{ id: number; icon: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const initDeck = () => {
    const deck = [...ICONS, ...ICONS]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({
        id,
        icon,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(deck);
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    setIsLocked(false);
  };

  useEffect(() => {
    initDeck();
  }, []);

  const handleCardClick = (id: number) => {
    if (isLocked) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;

    sounds.playMove();

    // Flip card
    const nextCards = cards.map((c) => (c.id === id ? { ...c, isFlipped: true } : c));
    setCards(nextCards);

    const nextFlipped = [...flippedIds, id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      setIsLocked(true);

      const [id1, id2] = nextFlipped;
      const card1 = nextCards.find((c) => c.id === id1)!;
      const card2 = nextCards.find((c) => c.id === id2)!;

      if (card1.icon === card2.icon) {
        // Matched!
        setTimeout(() => {
          sounds.playCapture();
          setCards((prev) =>
            prev.map((c) => (c.id === id1 || c.id === id2 ? { ...c, isMatched: true } : c))
          );
          setMatches((m) => {
            const next = m + 1;
            if (next === 8) {
              sounds.playSuccess();
              confetti({ particleCount: 80, spread: 70 });
            }
            return next;
          });
          setFlippedIds([]);
          setIsLocked(false);
        }, 400);
      } else {
        // Not matched, flip back
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.id === id1 || c.id === id2 ? { ...c, isFlipped: false } : c))
          );
          setFlippedIds([]);
          setIsLocked(false);
        }, 900);
      }
    }
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Memory Match
            </div>
            <div className="text-[10px] text-slate-400">
              Matches: <span className="font-mono font-bold text-cyan-400">{matches} / 8</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            Moves: {moves}
          </div>
          <button
            onClick={initDeck}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4x4 Grid */}
      <div className="relative aspect-square w-full max-w-[min(400px,calc(100vh-220px))] bg-slate-950 border-4 border-slate-800 rounded-2xl shadow-2xl p-2 flex items-center justify-center">
        <div className="grid grid-cols-4 grid-rows-4 gap-2 w-full h-full">
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCardClick(c.id)}
              disabled={c.isMatched || c.isFlipped}
              className={`w-full h-full rounded-xl flex items-center justify-center text-3xl sm:text-4xl transition-all border ${
                c.isMatched
                  ? 'bg-emerald-950/60 border-emerald-500/40 opacity-80'
                  : c.isFlipped
                  ? 'bg-slate-900 border-cyan-400 scale-95 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-transparent cursor-pointer'
              }`}
            >
              {c.isFlipped || c.isMatched ? c.icon : '?'}
            </button>
          ))}
        </div>

        {/* Win Overlay */}
        {matches === 8 && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-30 p-4">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase">ALL PAIRS MATCHED!</h2>
            <div className="text-xs text-slate-300">Completed in {moves} moves</div>
            <div className="flex gap-2 mt-2">
              <button onClick={initDeck} className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase rounded-lg">
                Play Again
              </button>
              <button onClick={onBackToDashboard} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-400">
        Flip matching pairs of cards to clear the deck
      </div>
    </div>
  );
};
