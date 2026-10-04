import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, Clock, Flame, Brain, CheckCircle2, XCircle } from 'lucide-react';

interface QuizGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

interface Question {
  id: string;
  category: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export const QuizGame: React.FC<QuizGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [playerStreak, setPlayerStreak] = useState(0);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);

  // Load questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await api.getTriviaQuestions('All', 5);
        setQuestions(res.questions);
      } catch (e) {
        console.error('Failed to load questions:', e);
      }
    }
    loadQuestions();
  }, []);

  // Question Timer
  useEffect(() => {
    if (isAnswered || winner || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleAnswer(-1); // Timeout
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered, winner, currentQuestionIndex, questions]);

  const handleAnswer = (optionIdx: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(optionIdx);

    const q = questions[currentQuestionIndex];
    const isCorrect = optionIdx === q.answerIndex;

    if (isCorrect) {
      sounds.playSuccess();
      const streakMultiplier = 1 + playerStreak * 0.25;
      const speedBonus = timeLeft * 10;
      const points = Math.round((100 + speedBonus) * streakMultiplier);
      setPlayerScore((s) => s + points);
      setPlayerStreak((st) => st + 1);
    } else {
      sounds.playMove();
      setPlayerStreak(0);
    }

    // Bot Answer simulation
    if (!isMultiplayer) {
      const botCorrect = Math.random() < 0.75;
      if (botCorrect) {
        const botPoints = Math.round(100 + Math.random() * 80);
        setOpponentScore((s) => s + botPoints);
      }
    }

    // Move to next question after 2.5s
    setTimeout(() => {
      if (currentQuestionIndex + 1 < questions.length) {
        setCurrentQuestionIndex((idx) => idx + 1);
        setIsAnswered(false);
        setSelectedOption(null);
        setTimeLeft(15);
      } else {
        finishQuiz();
      }
    }, 2500);
  };

  const finishQuiz = async () => {
    const isPlayerWin = playerScore >= opponentScore;
    setWinner(isPlayerWin ? 'player' : 'opponent');

    if (isPlayerWin) {
      sounds.playSuccess();
      confetti({ particleCount: 80, spread: 70 });
    }

    try {
      await api.recordMatch({
        gameId: 'quiz',
        opponentId: isMultiplayer ? (currentRoom?.guestId || 'guest') : 'bot_scholar',
        opponentName: isMultiplayer ? (isHost ? currentRoom?.guestName : currentRoom?.hostName) : 'Quizmaster AI',
        isBot: !isMultiplayer,
        result: isPlayerWin ? 'win' : 'loss',
        userScore: playerScore,
        opponentScore,
        durationSeconds: 75,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="h-full w-full max-h-[calc(100vh-68px)] flex flex-col items-center justify-center mx-auto p-1 sm:p-2 overflow-hidden select-none">
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-1.5 py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-200">QUIZ BATTLE</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-500/30">
          <Flame className="w-3.5 h-3.5" /> {playerStreak}x Streak
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-cyan-400 font-bold">You: {playerScore}</span>
          <span className="text-slate-500">|</span>
          <span className="text-red-400 font-bold">Opp: {opponentScore}</span>
        </div>
      </div>

      {currentQ && !winner && (
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5">
          {/* Question Meta */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="py-0.5 px-2 bg-purple-950 text-purple-300 rounded border border-purple-800/50">
              {currentQ.category}
            </span>
            <div className="flex items-center gap-1 font-mono text-cyan-400">
              <Clock className="w-3.5 h-3.5" /> {timeLeft}s
            </div>
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          </div>

          {/* Question Text */}
          <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
            {currentQ.question}
          </h2>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectAnswer = idx === currentQ.answerIndex;

              let btnStyle = 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200';
              if (isAnswered) {
                if (isCorrectAnswer) {
                  btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40';
                } else if (isSelected && !isCorrectAnswer) {
                  btnStyle = 'bg-red-950/80 border-red-500 text-red-200';
                } else {
                  btnStyle = 'opacity-40 border-slate-800 text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isAnswered}
                  className={`p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm font-semibold text-left transition-all flex items-center justify-between active:scale-98 cursor-pointer ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isAnswered && isCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {isAnswered && isSelected && !isCorrectAnswer && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation reveal */}
          {isAnswered && (
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 animate-fade-in">
              💡 {currentQ.explanation}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {winner && (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white uppercase">
            {winner === 'player' ? 'QUIZMASTER VICTORY!' : 'NICE EFFORT!'}
          </h2>
          <div className="text-sm text-slate-300 font-mono">
            Final Score: <strong className="text-cyan-400">{playerScore}</strong> vs <strong className="text-red-400">{opponentScore}</strong>
          </div>
          <button
            onClick={onBackToDashboard}
            className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg"
          >
            Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
