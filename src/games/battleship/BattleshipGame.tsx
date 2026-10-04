import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { api } from '../../services/api.ts';
import { sounds } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';
import { Anchor, RotateCw, Shuffle, Trophy, Crosshair } from 'lucide-react';

interface BattleshipGameProps {
  onBackToDashboard: () => void;
  isMultiplayer?: boolean;
}

interface Ship {
  name: string;
  size: number;
  hits: number;
}

const SHIPS_CONFIG = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

export const BattleshipGame: React.FC<BattleshipGameProps> = ({ onBackToDashboard, isMultiplayer = false }) => {
  const { user } = useAuth();
  const { currentRoom, isHost, sendGameAction, onGameAction } = useSocket();

  const [phase, setPhase] = useState<'placement' | 'battle' | 'ended'>('placement');
  const [playerGrid, setPlayerGrid] = useState<string[][]>(() => createGrid());
  const [opponentGrid, setOpponentGrid] = useState<string[][]>(() => createGrid());
  const [opponentAttackGrid, setOpponentAttackGrid] = useState<('hit' | 'miss' | null)[][]>(() => createAttackGrid());

  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [selectedShipIndex, setSelectedShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [placedShips, setPlacedShips] = useState<Array<{ name: string; size: number; coords: [number, number][] }>>([]);
  const [opponentShips, setOpponentShips] = useState<Array<{ name: string; size: number; coords: [number, number][] }>>([]);

  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  function createGrid() {
    return Array.from({ length: 10 }, () => Array(10).fill(''));
  }

  function createAttackGrid() {
    return Array.from({ length: 10 }, () => Array(10).fill(null));
  }

  // Random ship placement helper
  const generateRandomPlacement = (): { grid: string[][]; ships: any[] } => {
    const grid = createGrid();
    const ships: any[] = [];

    for (const ship of SHIPS_CONFIG) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        attempts++;
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (horiz ? 10 : 10 - ship.size));
        const c = Math.floor(Math.random() * (horiz ? 10 - ship.size : 10));

        let valid = true;
        const coords: [number, number][] = [];

        for (let i = 0; i < ship.size; i++) {
          const cr = horiz ? r : r + i;
          const cc = horiz ? c + i : c;
          if (grid[cr][cc] !== '') {
            valid = false;
            break;
          }
          coords.push([cr, cc]);
        }

        if (valid) {
          coords.forEach(([cr, cc]) => {
            grid[cr][cc] = ship.name;
          });
          ships.push({ name: ship.name, size: ship.size, coords });
          placed = true;
        }
      }
    }
    return { grid, ships };
  };

  const handleAutoPlace = () => {
    const { grid, ships } = generateRandomPlacement();
    setPlayerGrid(grid);
    setPlacedShips(ships);
    setSelectedShipIndex(SHIPS_CONFIG.length);
  };

  const startGame = () => {
    // Generate opponent fleet
    const opp = generateRandomPlacement();
    setOpponentGrid(opp.grid);
    setOpponentShips(opp.ships);
    setPhase('battle');
    setLogs(['Naval engagement commenced! Call coordinates.']);
  };

  const handleCellClick = (r: number, c: number) => {
    if (phase === 'placement') {
      if (selectedShipIndex >= SHIPS_CONFIG.length) return;
      const ship = SHIPS_CONFIG[selectedShipIndex];

      // Check boundary
      if (isHorizontal && c + ship.size > 10) return;
      if (!isHorizontal && r + ship.size > 10) return;

      // Check collision
      const coords: [number, number][] = [];
      for (let i = 0; i < ship.size; i++) {
        const cr = isHorizontal ? r : r + i;
        const cc = isHorizontal ? c + i : c;
        if (playerGrid[cr][cc] !== '') return;
        coords.push([cr, cc]);
      }

      const nextGrid = playerGrid.map((row) => [...row]);
      coords.forEach(([cr, cc]) => {
        nextGrid[cr][cc] = ship.name;
      });

      setPlayerGrid(nextGrid);
      setPlacedShips((prev) => [...prev, { name: ship.name, size: ship.size, coords }]);
      setSelectedShipIndex((idx) => idx + 1);
      sounds.playMove();
    }
  };

  const handleFireAtOpponent = (r: number, c: number) => {
    if (phase !== 'battle' || turn !== 'player' || opponentAttackGrid[r][c] !== null) return;

    const hasShip = opponentGrid[r][c] !== '';
    const result = hasShip ? 'hit' : 'miss';

    const nextAttack = opponentAttackGrid.map((row) => [...row]);
    nextAttack[r][c] = result;
    setOpponentAttackGrid(nextAttack);

    if (result === 'hit') {
      sounds.playExplosion();
      setLogs((prev) => [`Direct HIT at ${String.fromCharCode(65 + c)}${r + 1}!`, ...prev.slice(0, 5)]);

      // Check if all ships sunk
      const allHits = nextAttack.flat().filter((cell) => cell === 'hit').length;
      const totalShipCells = SHIPS_CONFIG.reduce((sum, s) => sum + s.size, 0);

      if (allHits >= totalShipCells) {
        handleGameOver('player');
        return;
      }
    } else {
      sounds.playMove();
      setLogs((prev) => [`Splash! Miss at ${String.fromCharCode(65 + c)}${r + 1}.`, ...prev.slice(0, 5)]);
    }

    setTurn('opponent');
  };

  // Bot Turn (Hunt & Target)
  useEffect(() => {
    if (phase === 'battle' && turn === 'opponent' && !winner) {
      const timer = setTimeout(() => {
        botFire();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, turn, winner]);

  const botFire = () => {
    // Pick random unhit cell on player's grid
    let r = Math.floor(Math.random() * 10);
    let c = Math.floor(Math.random() * 10);
    while (playerGrid[r][c] === 'hit' || playerGrid[r][c] === 'miss') {
      r = Math.floor(Math.random() * 10);
      c = Math.floor(Math.random() * 10);
    }

    const isHit = playerGrid[r][c] !== '';
    const nextPlayerGrid = playerGrid.map((row) => [...row]);
    nextPlayerGrid[r][c] = isHit ? 'hit' : 'miss';
    setPlayerGrid(nextPlayerGrid);

    if (isHit) {
      sounds.playExplosion();
      setLogs((prev) => [`Enemy hit your ship at ${String.fromCharCode(65 + c)}${r + 1}!`, ...prev.slice(0, 5)]);

      // Check if player fleet wiped
      let remaining = 0;
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          const val = nextPlayerGrid[i][j];
          if (val && val !== 'hit' && val !== 'miss') remaining++;
        }
      }
      if (remaining === 0) {
        handleGameOver('opponent');
        return;
      }
    }

    setTurn('player');
  };

  const handleGameOver = async (victor: 'player' | 'opponent') => {
    setPhase('ended');
    setWinner(victor);

    if (victor === 'player') {
      sounds.playSuccess();
      confetti({ particleCount: 80, spread: 70 });
    }

    try {
      await api.recordMatch({
        gameId: 'battleship',
        opponentId: isMultiplayer ? (currentRoom?.guestId || 'guest') : 'bot_admiral',
        opponentName: isMultiplayer ? (isHost ? currentRoom?.guestName : currentRoom?.hostName) : 'Admiral AI',
        isBot: !isMultiplayer,
        result: victor === 'player' ? 'win' : 'loss',
        userScore: victor === 'player' ? 100 : 40,
        opponentScore: victor === 'player' ? 20 : 100,
        durationSeconds: 150,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestart = () => {
    setPhase('placement');
    setPlayerGrid(createGrid());
    setOpponentGrid(createGrid());
    setOpponentAttackGrid(createAttackGrid());
    setSelectedShipIndex(0);
    setPlacedShips([]);
    setWinner(null);
    setLogs([]);
  };

  return (
    <div className="h-full w-full max-h-[calc(100vh-68px)] flex flex-col items-center justify-center mx-auto p-1 sm:p-2 overflow-hidden select-none">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-1.5 py-1 px-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200 text-xs">NAVAL COMBAT BATTLESHIP</span>
        </div>

        <div className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${
          turn === 'player' ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40' : 'bg-red-950/60 text-red-300 border-red-500/40'
        }`}>
          {phase === 'placement' ? 'PLACEMENT PHASE' : turn === 'player' ? 'YOUR ORDER TO FIRE' : 'ENEMY FIRING'}
        </div>

        <button onClick={onBackToDashboard} className="py-1 px-2.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer">
          Exit
        </button>
      </div>

      {/* Grids Display */}
      <div className="flex flex-row gap-4 sm:gap-6 items-center justify-center w-full">
        {/* Player's Grid */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase mb-1">Your Fleet</span>
          <div className="grid grid-cols-10 gap-0.5 bg-slate-950 p-1 rounded-lg border-2 border-slate-800 shadow-xl">
            {playerGrid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded flex items-center justify-center text-xs font-bold transition-all ${
                    cell === 'hit'
                      ? 'bg-red-600 text-white animate-pulse'
                      : cell === 'miss'
                      ? 'bg-slate-700 text-slate-400'
                      : cell
                      ? 'bg-cyan-600/80 border border-cyan-400 text-white text-[9px]'
                      : 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  {cell === 'hit' ? '💥' : cell === 'miss' ? '•' : cell ? cell.slice(0, 2) : ''}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Opponent Radar Grid (In Battle Phase) */}
        {phase !== 'placement' && (
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-semibold text-red-400 uppercase mb-1">Radar Grid</span>
            <div className="grid grid-cols-10 gap-0.5 bg-slate-950 p-1 rounded-lg border-2 border-red-950/60 shadow-xl">
              {opponentAttackGrid.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleFireAtOpponent(r, c)}
                    className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded flex items-center justify-center text-xs font-bold transition-all ${
                      cell === 'hit'
                        ? 'bg-red-600 text-white'
                        : cell === 'miss'
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-slate-900 hover:bg-red-950/40 cursor-crosshair border border-slate-800/40'
                    }`}
                  >
                    {cell === 'hit' ? '💥' : cell === 'miss' ? '•' : ''}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Placement Controls */}
      {phase === 'placement' && (
        <div className="w-full max-w-md mt-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold">
              Deploy: {SHIPS_CONFIG[selectedShipIndex]?.name || 'All Deployed!'} ({SHIPS_CONFIG[selectedShipIndex]?.size || 0} slots)
            </span>
            <button
              onClick={() => setIsHorizontal(!isHorizontal)}
              className="py-1 px-2.5 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold rounded border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" /> {isHorizontal ? 'Horizontal' : 'Vertical'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAutoPlace}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" /> Auto Deploy
            </button>
            <button
              onClick={startGame}
              disabled={placedShips.length < SHIPS_CONFIG.length}
              className="flex-1 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-bold uppercase rounded shadow-md cursor-pointer"
            >
              Start Battle! 🚢
            </button>
          </div>
        </div>
      )}

      {/* Battle Log */}
      {phase === 'battle' && logs.length > 0 && (
        <div className="w-full max-w-md mt-2 p-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 space-y-0.5">
          {logs.slice(-3).map((log, i) => (
            <div key={i} className="text-cyan-300">{log}</div>
          ))}
        </div>
      )}

      {/* Game Over Modal */}
      {phase === 'ended' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-50">
          <Trophy className="w-14 h-14 text-amber-400" />
          <h2 className="text-2xl font-bold text-white uppercase">
            {winner === 'player' ? 'NAVAL COMMANDER — VICTORY!' : 'FLEET DESTROYED!'}
          </h2>
          <div className="flex gap-3 mt-3">
            <button onClick={handleRestart} className="py-2.5 px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg">
              Play Again
            </button>
            <button onClick={onBackToDashboard} className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700">
              Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
