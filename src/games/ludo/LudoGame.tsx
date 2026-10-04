import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  Bot,
  Users,
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX,
  Play,
  Shield,
  Star,
} from 'lucide-react';

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export interface LudoToken {
  id: string;
  color: LudoColor;
  tokenIndex: number; // 0..3
  state: 'base' | 'track' | 'homestretch' | 'home';
  position: number; // 0..51 for track, 0..5 for homestretch, 6 for home
}

export interface LudoPlayer {
  id: string;
  name: string;
  color: LudoColor;
  isBot: boolean;
  avatar: string;
  tokensHome: number;
}

interface LudoGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

// 52-tile track path coordinates on a 15x15 board (col: 0..14, row: 0..14)
const TRACK_COORDINATES: { [index: number]: [number, number] } = {
  // Red start & arm going up
  0: [6, 13], 1: [6, 12], 2: [6, 11], 3: [6, 10], 4: [6, 9],
  5: [5, 8], 6: [4, 8], 7: [3, 8], 8: [2, 8], 9: [1, 8], 10: [0, 8],
  11: [0, 7], // turning top-left
  12: [0, 6], 13: [1, 6], 14: [2, 6], 15: [3, 6], 16: [4, 6], 17: [5, 6],
  18: [6, 5], 19: [6, 4], 20: [6, 3], 21: [6, 2], 22: [6, 1], 23: [6, 0],
  24: [7, 0], // turning top-right
  25: [8, 0], 26: [8, 1], 27: [8, 2], 28: [8, 3], 29: [8, 4], 30: [8, 5],
  31: [9, 6], 32: [10, 6], 33: [11, 6], 34: [12, 6], 35: [13, 6], 36: [14, 6],
  37: [14, 7], // turning bottom-right
  38: [14, 8], 39: [13, 8], 40: [12, 8], 41: [11, 8], 42: [10, 8], 43: [9, 8],
  44: [8, 9], 45: [8, 10], 46: [8, 11], 47: [8, 12], 48: [8, 13], 49: [8, 14],
  50: [7, 14], // turning bottom-left
  51: [6, 14],
};

// Start track index for each color
const START_POSITIONS: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Safe star tiles on track where no capture is allowed
const SAFE_TILES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Home stretch coordinates (steps 0..4 leading to center at step 5)
const HOME_STRETCH: Record<LudoColor, [number, number][]> = {
  red: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Base token slot coordinates
const BASE_SLOTS: Record<LudoColor, [number, number][]> = {
  red: [[2, 11], [3, 11], [2, 12], [3, 12]],
  green: [[2, 2], [3, 2], [2, 3], [3, 3]],
  yellow: [[11, 2], [12, 2], [11, 3], [12, 3]],
  blue: [[11, 11], [12, 11], [11, 12], [12, 12]],
};

const COLOR_THEMES: Record<LudoColor, {
  name: string;
  primary: string;
  secondary: string;
  bgLight: string;
  border: string;
  text: string;
  dot: string;
}> = {
  red: {
    name: 'Red',
    primary: '#ef4444',
    secondary: '#b91c1c',
    bgLight: 'bg-red-500/20',
    border: 'border-red-500',
    text: 'text-red-400',
    dot: 'bg-red-500',
  },
  green: {
    name: 'Green',
    primary: '#10b981',
    secondary: '#047857',
    bgLight: 'bg-emerald-500/20',
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
  },
  yellow: {
    name: 'Yellow',
    primary: '#eab308',
    secondary: '#a16207',
    bgLight: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    dot: 'bg-yellow-500',
  },
  blue: {
    name: 'Blue',
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    bgLight: 'bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-blue-400',
    dot: 'bg-blue-500',
  },
};

export const LudoGame: React.FC<LudoGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, sendGameAction, onGameAction } = useSocket();

  const [playerCount, setPlayerCount] = useState<2 | 4>(4);
  const [activeTurnColor, setActiveTurnColor] = useState<LudoColor>('red');
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [canRoll, setCanRoll] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Your turn! Roll the dice.');
  const [winner, setWinner] = useState<LudoPlayer | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize players
  const players = useMemo<LudoPlayer[]>(() => {
    const list: LudoPlayer[] = [
      {
        id: user?.id || 'usr_player1',
        name: user?.username || 'You',
        color: 'red',
        isBot: false,
        avatar: user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=red',
        tokensHome: 0,
      },
      {
        id: 'bot_green',
        name: 'Leo (Bot)',
        color: 'green',
        isBot: true,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=leo_ludo',
        tokensHome: 0,
      },
      {
        id: 'bot_yellow',
        name: 'Elena (Bot)',
        color: 'yellow',
        isBot: true,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=elena_ludo',
        tokensHome: 0,
      },
      {
        id: 'bot_blue',
        name: 'Sam (Bot)',
        color: 'blue',
        isBot: true,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sam_ludo',
        tokensHome: 0,
      },
    ];

    if (playerCount === 2) {
      // Red vs Yellow
      return [list[0], list[2]];
    }
    return list;
  }, [user, playerCount]);

  // 4 tokens per player
  const [tokens, setTokens] = useState<LudoToken[]>(() => {
    const colors: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
    const initialTokens: LudoToken[] = [];
    colors.forEach((color) => {
      for (let i = 0; i < 4; i++) {
        initialTokens.push({
          id: `${color}_${i}`,
          color,
          tokenIndex: i,
          state: 'base',
          position: 0,
        });
      }
    });
    return initialTokens;
  });

  const activePlayer = players.find((p) => p.color === activeTurnColor) || players[0];

  // Helper to get next player's turn
  const getNextTurnColor = (currentColor: LudoColor): LudoColor => {
    const activeColors = players.map((p) => p.color);
    const currentIndex = activeColors.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % activeColors.length;
    return activeColors[nextIndex];
  };

  // Check valid moves for active player given diceValue
  const getMovableTokens = (color: LudoColor, roll: number): LudoToken[] => {
    return tokens.filter((token) => {
      if (token.color !== color) return false;
      if (token.state === 'home') return false;

      // Unlocking from base requires a 6
      if (token.state === 'base') {
        return roll === 6;
      }

      // Moving on main track
      if (token.state === 'track') {
        // Can always move along track or enter homestretch
        return true;
      }

      // In homestretch
      if (token.state === 'homestretch') {
        // Must land exactly on 5 to reach home
        return token.position + roll <= 5;
      }

      return false;
    });
  };

  // Roll dice handler
  const handleRollDice = () => {
    if (!canRoll || isRolling || winner) return;

    setIsRolling(true);
    if (soundEnabled) sounds.playMove();

    let rollCount = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount > 8) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalRoll);
        setIsRolling(false);
        setCanRoll(false);
        processRoll(finalRoll);
      }
    }, 50);
  };

  // Process roll
  const processRoll = (roll: number) => {
    let nextSixes = roll === 6 ? consecutiveSixes + 1 : 0;
    setConsecutiveSixes(nextSixes);

    // Rule: 3 consecutive sixes forfeits the turn
    if (nextSixes >= 3) {
      setStatusMessage(`${activePlayer.name} rolled three 6s in a row! Turn skipped.`);
      setTimeout(() => advanceTurn(getNextTurnColor(activeTurnColor)), 1200);
      return;
    }

    const movable = getMovableTokens(activeTurnColor, roll);

    if (movable.length === 0) {
      setStatusMessage(`${activePlayer.name} rolled a ${roll} — No valid moves.`);
      setTimeout(() => advanceTurn(getNextTurnColor(activeTurnColor)), 1000);
      return;
    }

    // If only one token can move, or if bot's turn, execute automatically
    if (activePlayer.isBot) {
      setStatusMessage(`${activePlayer.name} rolled a ${roll} and is moving...`);
      setTimeout(() => {
        // Bot AI chooses best token:
        // Priority: 1. Knock opponent, 2. Move token into home, 3. Unlock 6 from base, 4. Advance furthest token
        const chosen = chooseBotToken(movable, roll);
        if (chosen) {
          executeMove(chosen, roll);
        } else {
          advanceTurn(getNextTurnColor(activeTurnColor));
        }
      }, 700);
    } else {
      if (movable.length === 1) {
        setStatusMessage(`Rolled ${roll}! Auto-moving token.`);
        setTimeout(() => executeMove(movable[0], roll), 400);
      } else {
        setStatusMessage(`Rolled ${roll}! Tap a highlighted token to move.`);
      }
    }
  };

  // Bot move heuristic
  const chooseBotToken = (movable: LudoToken[], roll: number): LudoToken | null => {
    if (movable.length === 0) return null;

    // 1. Check if any move captures an opponent token
    for (const t of movable) {
      if (t.state === 'track') {
        const nextPos = (t.position + roll) % 52;
        if (!SAFE_TILES.has(nextPos)) {
          const hasOpponent = tokens.some(
            (o) => o.color !== t.color && o.state === 'track' && o.position === nextPos
          );
          if (hasOpponent) return t;
        }
      }
    }

    // 2. Check if a token can reach home
    for (const t of movable) {
      if (t.state === 'homestretch' && t.position + roll === 5) {
        return t;
      }
    }

    // 3. If rolled 6, prefer opening a new token from base
    if (roll === 6) {
      const baseToken = movable.find((t) => t.state === 'base');
      if (baseToken) return baseToken;
    }

    // 4. Otherwise move token furthest along
    return movable.sort((a, b) => {
      const posA = a.state === 'homestretch' ? 60 + a.position : a.position;
      const posB = b.state === 'homestretch' ? 60 + b.position : b.position;
      return posB - posA;
    })[0];
  };

  // Execute token move
  const executeMove = (token: LudoToken, roll: number) => {
    let bonusTurn = roll === 6;
    let didCapture = false;

    setTokens((prev) => {
      return prev.map((t) => {
        if (t.id !== token.id) return t;

        // Move from base to starting position
        if (t.state === 'base') {
          return {
            ...t,
            state: 'track',
            position: START_POSITIONS[t.color],
          };
        }

        // Move on track
        if (t.state === 'track') {
          const start = START_POSITIONS[t.color];
          // Total tiles traveled since start
          const traveledSoFar = (t.position - start + 52) % 52;
          const nextTraveled = traveledSoFar + roll;

          if (nextTraveled >= 51) {
            // Enters homestretch
            const stretchPos = nextTraveled - 51;
            if (stretchPos >= 5) {
              // Reached Home!
              bonusTurn = true;
              return { ...t, state: 'home', position: 5 };
            }
            return {
              ...t,
              state: 'homestretch',
              position: stretchPos,
            };
          }

          const nextTrackPos = (t.position + roll) % 52;
          return { ...t, position: nextTrackPos };
        }

        // Homestretch movement
        if (t.state === 'homestretch') {
          const nextStretch = t.position + roll;
          if (nextStretch === 5) {
            bonusTurn = true;
            return { ...t, state: 'home', position: 5 };
          }
          return { ...t, position: nextStretch };
        }

        return t;
      });
    });

    if (soundEnabled) sounds.playMove();

    // Check for captures if landed on track
    setTimeout(() => {
      setTokens((currentTokens) => {
        const movedToken = currentTokens.find((t) => t.id === token.id);
        if (!movedToken || movedToken.state !== 'track') return currentTokens;

        // If safe tile, no capture
        if (SAFE_TILES.has(movedToken.position)) return currentTokens;

        // Find any opponent token on the same square
        const opponentTokens = currentTokens.filter(
          (o) => o.color !== movedToken.color && o.state === 'track' && o.position === movedToken.position
        );

        if (opponentTokens.length > 0) {
          didCapture = true;
          bonusTurn = true;
          if (soundEnabled) sounds.playExplosion();

          // Send captured token back to base!
          return currentTokens.map((ct) => {
            if (opponentTokens.some((op) => op.id === ct.id)) {
              return { ...ct, state: 'base', position: 0 };
            }
            return ct;
          });
        }

        return currentTokens;
      });

      // Check win condition
      setTokens((tokensAfterCapture) => {
        const playerTokens = tokensAfterCapture.filter((t) => t.color === activeTurnColor);
        const homeCount = playerTokens.filter((t) => t.state === 'home').length;

        if (homeCount === 4) {
          setWinner(activePlayer);
          sounds.playSuccess();
          confetti({ particleCount: 100, spread: 80 });
          setStatusMessage(`🏆 ${activePlayer.name} WON THE MATCH!`);
          return tokensAfterCapture;
        }

        // Advance turn or give bonus turn
        if (bonusTurn) {
          setStatusMessage(`${activePlayer.name} earned a bonus roll! ${didCapture ? '(Capture!)' : '(Rolled 6!)'}`);
          setCanRoll(true);
          if (activePlayer.isBot) {
            setTimeout(handleRollDice, 800);
          }
        } else {
          advanceTurn(getNextTurnColor(activeTurnColor));
        }

        return tokensAfterCapture;
      });
    }, 250);
  };

  const advanceTurn = (nextColor: LudoColor) => {
    setActiveTurnColor(nextColor);
    setDiceValue(null);
    setCanRoll(true);
    setConsecutiveSixes(0);

    const nextP = players.find((p) => p.color === nextColor) || players[0];
    setStatusMessage(`${nextP.name}'s turn!`);

    // If bot's turn, auto-trigger roll
    if (nextP.isBot && !winner) {
      setTimeout(() => {
        handleRollDice();
      }, 700);
    }
  };

  const handleRestart = () => {
    setTokens((prev) =>
      prev.map((t) => ({ ...t, state: 'base', position: 0 }))
    );
    setWinner(null);
    setActiveTurnColor('red');
    setDiceValue(null);
    setCanRoll(true);
    setConsecutiveSixes(0);
    setStatusMessage('New match started! Roll the dice.');
  };

  // Convert token state & position to board row & column (0..14)
  const getTokenCoords = (token: LudoToken): [number, number] => {
    if (token.state === 'base') {
      const slot = BASE_SLOTS[token.color][token.tokenIndex];
      return slot || [0, 0];
    }
    if (token.state === 'track') {
      return TRACK_COORDINATES[token.position] || [7, 7];
    }
    if (token.state === 'homestretch') {
      const stretch = HOME_STRETCH[token.color];
      return stretch[token.position] || [7, 7];
    }
    // Finished Home: center
    return [7, 7];
  };

  const movableTokens = diceValue ? getMovableTokens(activeTurnColor, diceValue) : [];
  const isHumanTurn = !activePlayer.isBot;

  return (
    <div className="h-full w-full max-h-[calc(100vh-108px)] flex flex-col items-center justify-between p-1 select-none overflow-hidden">
      {/* Top Status & Controls Bar */}
      <div className="w-full max-w-[min(540px,calc(100vh-190px))] flex items-center justify-between py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎲</span>
          <div>
            <div className="text-xs font-black text-white uppercase tracking-wider">
              Ludo Arena ({playerCount}P)
            </div>
            <div className="text-[10px] text-slate-400">
              Turn: <span className={`font-bold ${COLOR_THEMES[activeTurnColor].text}`}>{activePlayer.name}</span>
            </div>
          </div>
        </div>

        {/* Players count selector & Sound */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPlayerCount(playerCount === 4 ? 2 : 4)}
            disabled={isRolling}
            className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
          >
            <Users className="w-3 h-3 text-cyan-400" /> {playerCount}P
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="Restart Match"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 15x15 Ludo Board */}
      <div className="relative aspect-square w-full max-w-[min(540px,calc(100vh-210px))] max-h-[min(540px,calc(100vh-210px))] bg-[#090d16] border-4 border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex items-center justify-center p-1.5">
        <svg viewBox="0 0 1500 1500" className="w-full h-full block">
          <defs>
            {/* Gradients */}
            <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>
            <linearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>

          {/* Background Grid */}
          <rect width="1500" height="1500" fill="#0b1120" />

          {/* 4 Quadrant Home Bases */}
          {/* Top Left: Green */}
          <rect x="0" y="0" width="600" height="600" fill="url(#greenGrad)" />
          <rect x="100" y="100" width="400" height="400" rx="40" fill="#042f2e" stroke="#10b981" strokeWidth="6" />

          {/* Top Right: Yellow */}
          <rect x="900" y="0" width="600" height="600" fill="url(#yellowGrad)" />
          <rect x="1000" y="100" width="400" height="400" rx="40" fill="#422006" stroke="#facc15" strokeWidth="6" />

          {/* Bottom Left: Red */}
          <rect x="0" y="900" width="600" height="600" fill="url(#redGrad)" />
          <rect x="100" y="1000" width="400" height="400" rx="40" fill="#450a0a" stroke="#ef4444" strokeWidth="6" />

          {/* Bottom Right: Blue */}
          <rect x="900" y="900" width="600" height="600" fill="url(#blueGrad)" />
          <rect x="1000" y="1000" width="400" height="400" rx="40" fill="#172554" stroke="#3b82f6" strokeWidth="6" />

          {/* Base Inner Circles for tokens */}
          {Object.entries(BASE_SLOTS).map(([color, slots]) =>
            slots.map(([col, row], idx) => (
              <circle
                key={`${color}_base_${idx}`}
                cx={col * 100 + 50}
                cy={row * 100 + 50}
                r="34"
                fill="#020617"
                stroke={COLOR_THEMES[color as LudoColor].primary}
                strokeWidth="4"
              />
            ))
          )}

          {/* Central Victory Triangle (Center 6..8, 6..8) */}
          {/* Green Triangle (Top) */}
          <polygon points="600,600 900,600 750,750" fill="#10b981" />
          {/* Yellow Triangle (Right) */}
          <polygon points="900,600 900,900 750,750" fill="#facc15" />
          {/* Blue Triangle (Bottom) */}
          <polygon points="600,900 900,900 750,750" fill="#3b82f6" />
          {/* Red Triangle (Left) */}
          <polygon points="600,600 600,900 750,750" fill="#ef4444" />
          <circle cx="750" cy="750" r="32" fill="#0f172a" stroke="#e2e8f0" strokeWidth="4" />

          {/* Track Grid Lines and Cells */}
          {Object.entries(TRACK_COORDINATES).map(([idxStr, [col, row]]) => {
            const idx = Number(idxStr);
            const isSafe = SAFE_TILES.has(idx);
            let fillColor = '#1e293b';

            // Start squares have special color
            if (idx === 0) fillColor = '#ef4444';
            if (idx === 13) fillColor = '#10b981';
            if (idx === 26) fillColor = '#facc15';
            if (idx === 39) fillColor = '#3b82f6';

            return (
              <g key={`track_${idx}`}>
                <rect
                  x={col * 100 + 3}
                  y={row * 100 + 3}
                  width="94"
                  height="94"
                  rx="10"
                  fill={fillColor}
                  stroke="#334155"
                  strokeWidth="2"
                />
                {isSafe && (
                  <text
                    x={col * 100 + 50}
                    y={row * 100 + 64}
                    textAnchor="middle"
                    fontSize="42"
                    fill={idx === 0 || idx === 13 || idx === 26 || idx === 39 ? '#ffffff' : '#fbbf24'}
                  >
                    ★
                  </text>
                )}
              </g>
            );
          })}

          {/* Homestretch Paths */}
          {Object.entries(HOME_STRETCH).map(([color, coords]) =>
            coords.slice(0, 5).map(([col, row], idx) => (
              <rect
                key={`stretch_${color}_${idx}`}
                x={col * 100 + 5}
                y={row * 100 + 5}
                width="90"
                height="90"
                rx="12"
                fill={COLOR_THEMES[color as LudoColor].primary}
                stroke="#ffffff"
                strokeWidth="2"
                opacity="0.85"
              />
            ))
          )}

          {/* Active Tokens Rendering */}
          {tokens.map((token) => {
            const [col, row] = getTokenCoords(token);
            const isMovable = isHumanTurn && movableTokens.some((m) => m.id === token.id);
            const theme = COLOR_THEMES[token.color];

            // Offset slightly if multiple tokens share the square
            const sameSquareTokens = tokens.filter((other) => {
              if (token.state === 'base' || other.state === 'base') return false;
              const [c, r] = getTokenCoords(other);
              return c === col && r === row;
            });

            const indexInSquare = sameSquareTokens.findIndex((t) => t.id === token.id);
            const offset = sameSquareTokens.length > 1 ? (indexInSquare - (sameSquareTokens.length - 1) / 2) * 14 : 0;

            const cx = col * 100 + 50 + offset;
            const cy = row * 100 + 50 + offset;

            return (
              <g
                key={token.id}
                onClick={() => {
                  if (isMovable && diceValue) {
                    executeMove(token, diceValue);
                  }
                }}
                className={`transition-all duration-300 ${isMovable ? 'cursor-pointer animate-bounce' : ''}`}
              >
                {/* Glow ring if movable */}
                {isMovable && (
                  <circle cx={cx} cy={cy} r="38" fill="none" stroke="#38bdf8" strokeWidth="6" opacity="0.9" />
                )}

                {/* Outer token ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="28"
                  fill={theme.primary}
                  stroke="#ffffff"
                  strokeWidth="5"
                  className="filter drop-shadow-lg"
                />
                {/* Inner token jewel */}
                <circle cx={cx} cy={cy} r="14" fill="#ffffff" opacity="0.9" />
                <circle cx={cx} cy={cy} r="8" fill={theme.secondary} />
              </g>
            );
          })}
        </svg>

        {/* Winner Overlay */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-40 gap-3">
            <Trophy className="w-14 h-14 text-amber-400 animate-bounce" />
            <h2 className="text-2xl font-black text-white uppercase">{winner.name} WINS!</h2>
            <p className="text-xs text-slate-300 text-center">
              All 4 tokens arrived home safely in the Ludo Arena!
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRestart}
                className="py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg"
              >
                Play Again
              </button>
              <button
                onClick={onBackToDashboard}
                className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Play Console: Dice & Turn Banner */}
      <div className="w-full max-w-[min(540px,calc(100vh-190px))] bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between shadow-lg">
        {/* Active Player Card */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={activePlayer.avatar}
              alt={activePlayer.name}
              className={`w-10 h-10 rounded-xl border-2 ${COLOR_THEMES[activeTurnColor].border} object-cover`}
            />
            {activePlayer.isBot && (
              <span className="absolute -bottom-1 -right-1 bg-slate-800 text-[8px] font-mono px-1 py-0.2 rounded border border-slate-700 text-slate-300">
                BOT
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${COLOR_THEMES[activeTurnColor].text}`}>
                {activePlayer.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({tokens.filter((t) => t.color === activeTurnColor && t.state === 'home').length}/4 Home)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 max-w-[220px] truncate">
              {statusMessage}
            </div>
          </div>
        </div>

        {/* Dice Rolling Pad */}
        <div className="flex items-center gap-2">
          {diceValue !== null ? (
            <div
              className={`w-12 h-12 bg-slate-950 border-2 ${
                COLOR_THEMES[activeTurnColor].border
              } rounded-xl flex items-center justify-center text-2xl font-black font-mono shadow-inner ${
                isRolling ? 'animate-spin text-slate-500' : 'text-white'
              }`}
            >
              {diceValue}
            </div>
          ) : (
            <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-slate-600 text-xs font-bold">
              --
            </div>
          )}

          <button
            onClick={handleRollDice}
            disabled={!canRoll || isRolling || !isHumanTurn || !!winner}
            className={`py-2.5 px-4 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 ${
              isHumanTurn && canRoll && !winner
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 cursor-pointer shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isRolling ? 'Rolling...' : isHumanTurn ? 'ROLL DICE 🎲' : 'Bot Rolling...'}
          </button>
        </div>
      </div>
    </div>
  );
};
