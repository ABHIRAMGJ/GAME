import React, { useState, useEffect } from 'react';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Sparkles } from 'lucide-react';

interface SolitaireProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

type Suit = '♠' | '♥' | '♦' | '♣';
type Card = { suit: Suit; value: number; isFaceUp: boolean; id: string };

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const VALUE_NAMES: { [key: number]: string } = {
  1: 'A', 11: 'J', 12: 'Q', 13: 'K',
};

export const SolitaireGame: React.FC<SolitaireProps> = ({ onBackToDashboard }) => {
  const [stock, setStock] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [foundations, setFoundations] = useState<{ [suit in Suit]: Card[] }>({
    '♠': [], '♥': [], '♦': [], '♣': [],
  });
  const [tableaus, setTableaus] = useState<Card[][]>([[], [], [], [], [], [], []]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);

  const initGame = () => {
    // Generate standard 52-card deck
    const deck: Card[] = [];
    SUITS.forEach((suit) => {
      for (let v = 1; v <= 13; v++) {
        deck.push({
          suit,
          value: v,
          isFaceUp: false,
          id: `${suit}_${v}`,
        });
      }
    });

    // Shuffle deck
    deck.sort(() => Math.random() - 0.5);

    // Deal to 7 tableaus
    const newTableaus: Card[][] = [[], [], [], [], [], [], []];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) {
        const card = deck.pop()!;
        if (j === i) card.isFaceUp = true;
        newTableaus[i].push(card);
      }
    }

    setTableaus(newTableaus);
    setStock(deck);
    setWaste([]);
    setFoundations({ '♠': [], '♥': [], '♦': [], '♣': [] });
    setScore(0);
    setMoves(0);
    setIsWon(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleStockClick = () => {
    sounds.playMove();
    if (stock.length === 0) {
      // Recycle waste
      const recycled = [...waste].reverse().map((c) => ({ ...c, isFaceUp: false }));
      setStock(recycled);
      setWaste([]);
    } else {
      const top = { ...stock[stock.length - 1], isFaceUp: true };
      setStock((s) => s.slice(0, -1));
      setWaste((w) => [...w, top]);
      setMoves((m) => m + 1);
    }
  };

  const tryMoveToFoundation = (card: Card, fromLocation: 'waste' | { tableauIndex: number }) => {
    const fSuit = foundations[card.suit];
    const topVal = fSuit.length > 0 ? fSuit[fSuit.length - 1].value : 0;

    if (card.value === topVal + 1) {
      sounds.playCapture();
      // Move to foundation
      setFoundations((prev) => ({
        ...prev,
        [card.suit]: [...prev[card.suit], card],
      }));
      setScore((s) => s + 10);
      setMoves((m) => m + 1);

      // Remove from source
      if (fromLocation === 'waste') {
        setWaste((w) => w.slice(0, -1));
      } else {
        setTableaus((prev) => {
          const updated = [...prev];
          const col = [...updated[fromLocation.tableauIndex]];
          col.pop();
          // Reveal top card if face down
          if (col.length > 0 && !col[col.length - 1].isFaceUp) {
            col[col.length - 1].isFaceUp = true;
            setScore((s) => s + 5);
          }
          updated[fromLocation.tableauIndex] = col;
          return updated;
        });
      }

      // Check win condition (all 4 foundations have 13 cards)
      setTimeout(() => {
        setFoundations((current) => {
          const total = Object.values(current).reduce((acc, pile) => acc + pile.length, 0);
          if (total === 52) {
            setIsWon(true);
            sounds.playSuccess();
            confetti({ particleCount: 100, spread: 80 });
          }
          return current;
        });
      }, 100);
      return true;
    }
    return false;
  };

  const getCardColor = (suit: Suit) => (suit === '♥' || suit === '♦' ? 'text-red-500' : 'text-slate-900');

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Top Header */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👑</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Klondike Solitaire
            </div>
            <div className="text-[10px] text-slate-400">Score: <span className="font-mono text-cyan-400 font-bold">{score}</span></div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            Moves: {moves}
          </div>
          <button
            onClick={initGame}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="Deal New Game"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Play Area: Stock, Waste, and 4 Foundations */}
      <div className="w-full max-w-xl flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          {/* Stock & Waste */}
          <div className="flex items-center gap-2">
            {/* Stock */}
            <div
              onClick={handleStockClick}
              className="w-12 h-16 sm:w-14 sm:h-20 bg-indigo-900 border-2 border-indigo-700 rounded-lg flex items-center justify-center font-bold text-xs text-indigo-300 cursor-pointer shadow-md active:scale-95"
            >
              {stock.length > 0 ? '🂠' : '↺'}
            </div>

            {/* Waste */}
            <div className="w-12 h-16 sm:w-14 sm:h-20 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-center relative shadow-sm">
              {waste.length > 0 && (
                <div
                  onClick={() => tryMoveToFoundation(waste[waste.length - 1], 'waste')}
                  className={`w-full h-full bg-white rounded-lg p-1 flex flex-col justify-between cursor-pointer border border-slate-300 font-bold ${getCardColor(waste[waste.length - 1].suit)} shadow`}
                >
                  <div className="text-[11px] leading-none">{VALUE_NAMES[waste[waste.length - 1].value] || waste[waste.length - 1].value}</div>
                  <div className="text-center text-sm">{waste[waste.length - 1].suit}</div>
                </div>
              )}
            </div>
          </div>

          {/* 4 Foundations */}
          <div className="flex items-center gap-1.5">
            {SUITS.map((suit) => {
              const pile = foundations[suit];
              const top = pile.length > 0 ? pile[pile.length - 1] : null;

              return (
                <div
                  key={suit}
                  className="w-12 h-16 sm:w-14 sm:h-20 bg-slate-900/80 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center relative shadow-inner"
                >
                  {top ? (
                    <div className={`w-full h-full bg-white rounded-lg p-1 flex flex-col justify-between font-bold border border-slate-300 ${getCardColor(suit)}`}>
                      <div className="text-[11px] leading-none">{VALUE_NAMES[top.value] || top.value}</div>
                      <div className="text-center text-sm">{suit}</div>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-lg">{suit}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 7 Tableaus */}
        <div className="grid grid-cols-7 gap-1.5 min-h-[160px] pt-1 px-1">
          {tableaus.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col relative min-h-[140px] bg-slate-900/20 border border-slate-800/40 rounded-lg p-0.5">
              {col.map((card, cardIdx) => (
                <div
                  key={card.id}
                  onClick={() => {
                    if (card.isFaceUp && cardIdx === col.length - 1) {
                      tryMoveToFoundation(card, { tableauIndex: colIdx });
                    }
                  }}
                  className={`w-full h-14 sm:h-16 rounded-md p-1 flex flex-col justify-between transition-all border ${
                    card.isFaceUp
                      ? `bg-white border-slate-300 ${getCardColor(card.suit)} cursor-pointer shadow-sm`
                      : 'bg-indigo-900 border-indigo-700 text-transparent'
                  }`}
                  style={{ marginTop: cardIdx > 0 ? '-34px' : '0' }}
                >
                  {card.isFaceUp && (
                    <>
                      <div className="text-[10px] font-bold leading-none">{VALUE_NAMES[card.value] || card.value}</div>
                      <div className="text-center text-xs leading-none">{card.suit}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Win Celebration */}
      {isWon && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-30 p-4">
          <Trophy className="w-14 h-14 text-amber-400 animate-bounce" />
          <h2 className="text-2xl font-black text-white uppercase">SOLITAIRE VICTORY!</h2>
          <div className="text-xs text-slate-300">All 52 cards built into foundations in {moves} moves!</div>
          <div className="flex gap-2 mt-2">
            <button onClick={initGame} className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase rounded-lg shadow-lg">
              Play Again
            </button>
            <button onClick={onBackToDashboard} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700">
              Dashboard
            </button>
          </div>
        </div>
      )}

      <div className="text-[11px] text-slate-400">
        Tap waste or tableau card to send to foundation · Click stock to draw
      </div>
    </div>
  );
};
