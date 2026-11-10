https://gamepro.ai.studio

Game Arena is a modern online gaming platform where players can enjoy multiple interactive games in one place. The platform supports single-player games with intelligent bots as well as real-time multiplayer matches with friends.

Players can create accounts, invite friends, join private rooms, compete in matches, earn achievements, track match history, and climb global leaderboards. The platform includes games such as Chess, Pocket Tanks, 2D Racing, Tetris Battle, Carrom, Battleship, Air Hockey, Archery Duel, Quiz Battle, and an original Card Battle game.

The goal is to create a seamless gaming experience that combines competitive gameplay, social interaction, real-time communication, and persistent player progress in one platform.
1. Frontend & Core UI
React 19 (react ^19.0.1, react-dom): Modern component architecture, hooks (useState, useEffect, useRef, useCallback, useMemo), and Context API (AuthContext, SocketContext).
TypeScript (typescript ^7.0.2): Strict type safety across all client models, server models, game states, and protocol payloads.
Tailwind CSS (tailwindcss ^4.3.3, @tailwindcss/vite): Utility-first responsive styling, custom animations, dark-theme gaming aesthetics, and zero-scroll container layouts.
Lucide React (lucide-react ^0.546.0): Modern iconography across the dashboard, controls, game HUD, statistics, and navigation bars.
Motion (motion ^12.23.24): Hardware-accelerated UI transitions and physics micro-interactions.
2. 3D Graphics & Game Engines
Three.js (three ^0.186.1, @types/three): Full WebGL 3D rendering engine used for the interactive 3D Kitchen arena, featuring:
Perspective camera, directional sunlight, point lighting, and PCF soft shadow maps.
Raycasting for interactive click/hover detection on 3D meshes (appliances, faucets, utensils, dishes).
Real-time particle systems for water flow and cooking steam.
First-person navigation physics with keyboard (WASD/Arrows), mouse-look, and mobile virtual touch controls.
HTML5 Canvas 2D API: High-performance 60 FPS physics engines for 2D games (Carrom board physics, Pool 8-Ball collisions, Tanks ballistic trajectories, Air Hockey puck bouncing, Archery projectile arcs, and Racing).
Chess.js (chess.js ^1.4.0): Complete chess move validation, FEN parsing, board state tracking, and legal move generation.
Canvas-Confetti (canvas-confetti ^1.9.4): Particle victory celebrations on match wins, daily challenges, and bot triumphs.
3. Audio & Sound FX
Web Audio API (AudioContext): Zero-dependency, purely procedural sound synthesizer:
Dynamic sound generation for moves, captures, checkmates, clinks, puck hits, and countdown ticks.
Synthesized white/pink noise buffer filters for flowing water and frying pan sizzle.
4. Backend & Real-Time Networking
Node.js + Express (express ^4.21.2): Lightweight, full-stack HTTP REST API server for user authentication, guest sessions, match histories, and leaderboards.
WebSocket (ws ^8.22.0): Full-duplex real-time synchronization:
Instant room matchmaking and invite link routing (/join/:code).
Live peer-to-peer multiplayer state synchronization across games.
Real-time in-game global chat overlay.
Bcryptjs (bcryptjs ^3.0.3): Secure salt-and-hash password management for registered accounts.
TSX (tsx ^4.21.0): Direct TypeScript execution runtime for the backend server without manual build steps.
5. Build & Development Tooling
Vite (vite ^8.3.0, @vitejs/plugin-react): Blazing fast next-generation bundler with dev middleware mode mounted alongside Express.
ESBuild (esbuild ^0.25.0): Ultra-fast module bundling and minification.
Google GenAI SDK (@google/genai ^2.4.0): Integrated SDK for server-side AI capabilities.

