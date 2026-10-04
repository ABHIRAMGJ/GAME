import React, { useState, useEffect } from 'react';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Delete } from 'lucide-react';

interface WordleProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

const WORDS = [
  'ARENA', 'CHESS', 'CROWN', 'SWORD', 'PIECE', 'POWER', 'SCORE', 'STRIKE', 'BOARD', 'GAMES',
  'SPEED', 'TURBO', 'MATCH', 'CHAMP', 'ROBOT', 'TILES', 'QUEEN', 'DRAWS', 'SOLVE', 'LEVEL',
];

export const WordleGame: React.FC<WordleProps> = ({ onBackToDashboard }) => {
  const [targetWord, setTargetWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const handleKeyInput = (char: string) => {
    if (gameStatus !== 'playing') return;

    if (char === 'ENTER') {
      if (currentGuess.length === 5) {
        const nextGuesses = [...guesses, currentGuess];
        setGuesses(nextGuesses);
        sounds.playMove();

        if (currentGuess === targetWord) {
          setGameStatus('won');
          sounds.playSuccess();
          confetti({ particleCount: 70, spread: 60 });
        } else if (nextGuesses.length >= 6) {
          setGameStatus('lost');
          sounds.playExplosion();
        }
        setCurrentGuess('');
      }
    } else if (char === 'BACKSPACE') {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (currentGuess.length < 5 && /^[A-Z]$/.test(char)) {
      setCurrentGuess((prev) => prev + char);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE') {
        handleKeyInput(key);
      } else if (/^[A-Z]$/.test(key)) {
        handleKeyInput(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameStatus]);

  const handleRestart = () => {
    setTargetWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('playing');
  };

  const getLetterStatus = (letter: string, index: number, word: string) => {
    if (targetWord[index] === letter) return 'bg-emerald-600 border-emerald-500 text-white';
    if (targetWord.includes(letter)) return 'bg-yellow-600 border-yellow-500 text-white';
    return 'bg-slate-800 border-slate-700 text-slate-400';
  };

  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ];

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔤</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Word Master
            </div>
            <div className="text-[10px] text-slate-400">Guess the 5-letter word in 6 tries</div>
          </div>
        </div>

        <button
          onClick={handleRestart}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
          title="New Word"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 6 Rows of 5 Letters */}
      <div className="flex flex-col gap-1.5 py-1">
        {Array(6).fill(0).map((_, rowIdx) => {
          const guess = guesses[rowIdx];
          const isCurrent = rowIdx === guesses.length;

          return (
            <div key={rowIdx} className="flex gap-1.5 justify-center">
              {Array(5).fill(0).map((__, colIdx) => {
                let char = '';
                let statusClasses = 'bg-slate-950 border-slate-800 text-slate-200';

                if (guess) {
                  char = guess[colIdx];
                  statusClasses = getLetterStatus(char, colIdx, guess);
                } else if (isCurrent && currentGuess[colIdx]) {
                  char = currentGuess[colIdx];
                  statusClasses = 'bg-slate-900 border-cyan-400 text-white animate-pulse';
                }

                return (
                  <div
                    key={colIdx}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border-2 flex items-center justify-center font-mono font-black text-base transition-all ${statusClasses}`}
                  >
                    {char}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Game Over Dialog */}
      {gameStatus !== 'playing' && (
        <div className="py-2 px-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
          <div className="text-xs font-bold text-white uppercase">
            {gameStatus === 'won' ? '🎉 SPLENDID! YOU SOLVED IT!' : `WORD WAS: ${targetWord}`}
          </div>
          <button
            onClick={handleRestart}
            className="py-1 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase rounded-lg shadow-md"
          >
            Play Next Word
          </button>
        </div>
      )}

      {/* On-screen Keyboard */}
      <div className="w-full max-w-sm flex flex-col gap-1 px-1">
        {keyboardRows.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-1 justify-center">
            {row.map((k) => (
              <button
                key={k}
                onClick={() => handleKeyInput(k)}
                className={`py-2 px-2 rounded-md font-mono font-bold text-[11px] sm:text-xs transition-colors ${
                  k === 'ENTER' || k === 'BACKSPACE'
                    ? 'bg-slate-700 text-slate-200 px-2.5'
                    : 'bg-slate-800 hover:bg-slate-700 text-white min-w-[28px]'
                }`}
              >
                {k === 'BACKSPACE' ? <Delete className="w-3.5 h-3.5" /> : k}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
