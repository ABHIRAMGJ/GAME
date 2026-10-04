import React, { useRef, useState, useEffect } from 'react';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PongProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
}

export const PongGame: React.FC<PongProps> = ({
  onBackToDashboard,
  isMultiplayer = false,
  botDifficulty = 'medium',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [winner, setWinner] = useState<'player' | 'bot' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [botLevel, setBotLevel] = useState<'easy' | 'medium' | 'hard' | 'extreme'>(botDifficulty);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const width = 540;
  const height = 320;
  const paddleHeight = 65;
  const paddleWidth = 10;

  const stateRef = useRef({
    playerY: height / 2 - paddleHeight / 2,
    botY: height / 2 - paddleHeight / 2,
    ballX: width / 2,
    ballY: height / 2,
    ballVx: 4,
    ballVy: 2.5,
  });

  // Track player paddle via mouse or touch
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = height / rect.height;
    const clientY = (e.clientY - rect.top) * scaleY;
    stateRef.current.playerY = Math.max(0, Math.min(height - paddleHeight, clientY - paddleHeight / 2));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = height / rect.height;
    const clientY = (e.touches[0].clientY - rect.top) * scaleY;
    stateRef.current.playerY = Math.max(0, Math.min(height - paddleHeight, clientY - paddleHeight / 2));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resetBall = (toPlayer = true) => {
      stateRef.current.ballX = width / 2;
      stateRef.current.ballY = height / 2;
      stateRef.current.ballVx = toPlayer ? -4.5 : 4.5;
      stateRef.current.ballVy = (Math.random() - 0.5) * 4;
    };

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      // Table background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Center dashed net
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);

      const s = stateRef.current;

      if (isPlaying && !winner) {
        // Move ball
        s.ballX += s.ballVx;
        s.ballY += s.ballVy;

        // Top/Bottom bounce
        if (s.ballY <= 6 || s.ballY >= height - 6) {
          s.ballVy *= -1;
          if (soundEnabled) sounds.playMove();
        }

        // Bot AI movement
        const botSpeed = botLevel === 'easy' ? 2.5 : botLevel === 'medium' ? 4 : botLevel === 'hard' ? 5.5 : 7.5;
        const botCenter = s.botY + paddleHeight / 2;
        if (botCenter < s.ballY - 6) s.botY += botSpeed;
        else if (botCenter > s.ballY + 6) s.botY -= botSpeed;
        s.botY = Math.max(0, Math.min(height - paddleHeight, s.botY));

        // Player paddle collision
        if (
          s.ballX <= 25 + paddleWidth &&
          s.ballX >= 20 &&
          s.ballY >= s.playerY &&
          s.ballY <= s.playerY + paddleHeight
        ) {
          s.ballVx = Math.abs(s.ballVx) * 1.05;
          const delta = (s.ballY - (s.playerY + paddleHeight / 2)) / (paddleHeight / 2);
          s.ballVy = delta * 5;
          if (soundEnabled) sounds.playMove();
        }

        // Bot paddle collision
        if (
          s.ballX >= width - 25 - paddleWidth &&
          s.ballX <= width - 20 &&
          s.ballY >= s.botY &&
          s.ballY <= s.botY + paddleHeight
        ) {
          s.ballVx = -Math.abs(s.ballVx) * 1.05;
          const delta = (s.ballY - (s.botY + paddleHeight / 2)) / (paddleHeight / 2);
          s.ballVy = delta * 5;
          if (soundEnabled) sounds.playMove();
        }

        // Score check
        if (s.ballX < 0) {
          // Bot scores
          setBotScore((bs) => {
            const next = bs + 1;
            if (next >= 7) setWinner('bot');
            return next;
          });
          resetBall(true);
        } else if (s.ballX > width) {
          // Player scores
          setPlayerScore((ps) => {
            const next = ps + 1;
            if (next >= 7) {
              setWinner('player');
              confetti({ particleCount: 70, spread: 60 });
            }
            return next;
          });
          resetBall(false);
        }
      }

      // Draw Paddles
      // Player (Left, Cyan)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(20, s.playerY, paddleWidth, paddleHeight);

      // Bot (Right, Amber)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(width - 20 - paddleWidth, s.botY, paddleWidth, paddleHeight);

      // Draw Ball
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, 6, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, winner, botLevel, soundEnabled]);

  const handleRestart = () => {
    setPlayerScore(0);
    setBotScore(0);
    setWinner(null);
    setIsPlaying(true);
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕹️</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Retro Pong
            </div>
            <div className="text-[10px] text-slate-400">First to 7 points wins</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={botLevel}
            onChange={(e) => setBotLevel(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold py-1 px-2 rounded-lg cursor-pointer focus:outline-none"
          >
            <option value="easy">Easy Bot</option>
            <option value="medium">Medium Bot</option>
            <option value="hard">Hard Bot</option>
            <option value="extreme">Extreme Bot</option>
          </select>

          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Court */}
      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-slate-950 max-h-[calc(100vh-210px)] max-w-full flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="block w-full h-auto object-contain cursor-none rounded-xl"
        />

        {/* Start Overlay */}
        {!isPlaying && !winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 p-4">
            <span className="text-4xl animate-bounce">🕹️</span>
            <h2 className="text-lg font-black text-white uppercase">RETRO PONG</h2>
            <p className="text-xs text-slate-300 text-center">Move mouse or drag finger to control left paddle</p>
            <button
              onClick={() => setIsPlaying(true)}
              className="py-2.5 px-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg"
            >
              Start Match
            </button>
          </div>
        )}

        {/* Winner Overlay */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 p-4">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase">
              {winner === 'player' ? 'YOU WON THE PONG MATCH!' : 'BOT WON THE MATCH!'}
            </h2>
            <div className="text-xs text-slate-300">Score: {playerScore} - {botScore}</div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleRestart} className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase rounded-lg">
                Play Again
              </button>
              <button onClick={onBackToDashboard} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scores Display */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 flex items-center justify-between text-xs font-bold shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-slate-300">You (Paddle):</span>
          <span className="font-mono text-cyan-400 text-sm">{playerScore}</span>
        </div>

        <div className="text-slate-500 font-mono">FIRST TO 7</div>

        <div className="flex items-center gap-2">
          <span className="text-slate-300">Bot:</span>
          <span className="font-mono text-amber-400 text-sm">{botScore}</span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        </div>
      </div>
    </div>
  );
};
