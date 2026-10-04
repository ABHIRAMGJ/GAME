export type GameId =
  | 'chess'
  | 'carrom'
  | 'ludo'
  | 'tanks'
  | 'racing'
  | 'tetris'
  | 'tictactoe'
  | 'connect4'
  | 'airhockey'
  | 'archery'
  | 'quiz'
  | 'pool8ball'
  | 'snake'
  | 'pong'
  | 'checkers'
  | 'minesweeper'
  | 'memory'
  | 'wordle'
  | 'flappy'
  | 'solitaire'
  | 'battleship'
  | 'colorclash';

export type RatingTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';

export interface GameInfo {
  id: GameId;
  name: string;
  tagline: string;
  icon: string;
  category: 'Strategy' | 'Arcade' | 'Physics' | 'Racing' | 'Trivia' | 'Cards' | 'Board' | 'Puzzle' | 'Sports' | 'Casual';
  players: string;
  estimatedTime: string;
  description: string;
  featured?: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatar: string;
  level: number;
  xp: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  streak: number;
  bestStreak: number;
  ratings: Record<GameId, number>;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: string;
}

export interface Friend {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  level: number;
  isOnline: boolean;
  statusText?: string;
  lastSeen?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface MatchRecord {
  id: string;
  gameId: GameId;
  userId: string;
  opponentId: string;
  opponentName: string;
  opponentAvatar: string;
  isBot: boolean;
  result: 'win' | 'loss' | 'draw';
  userScore: number;
  opponentScore: number;
  ratingChange: number;
  newRating: number;
  durationSeconds: number;
  createdAt: string;
  replayData?: any;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  gameId?: GameId;
  unlockedAt?: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  gameId: GameId;
  targetCount: number;
  currentCount: number;
  xpReward: number;
  completed: boolean;
  claimed: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'friend_request' | 'game_invite' | 'achievement' | 'challenge' | 'system';
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

export interface RoomPlayer {
  id: string;
  username: string;
  avatar: string;
  isHost?: boolean;
  isReady?: boolean;
  isBot?: boolean;
  color?: string;
  seatIndex: number;
}

export interface GameRoom {
  code: string;
  gameId: GameId;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  guestId?: string;
  guestName?: string;
  guestAvatar?: string;
  players?: RoomPlayer[];
  maxPlayers?: number;
  isPrivate: boolean;
  status: 'waiting' | 'ready' | 'playing' | 'ended';
  options?: any;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  roomId?: string;
  channel?: string; // e.g. 'global', 'lfg', 'strategy', 'tournaments'
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  flagged?: boolean;
}

export interface TournamentMatch {
  id: string;
  round: 'quarter' | 'semi' | 'final';
  matchIndex: number;
  player1?: { id: string; name: string; avatar: string; score?: number };
  player2?: { id: string; name: string; avatar: string; score?: number };
  winnerId?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Tournament {
  id: string;
  title: string;
  gameId: GameId;
  description: string;
  maxPlayers: number;
  currentPlayers: number;
  registeredUserIds: string[];
  status: 'registration' | 'in_progress' | 'completed';
  prizeXp: number;
  prizeTrophy: string;
  matches: TournamentMatch[];
  winnerId?: string;
  winnerName?: string;
  startTime: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatar: string;
  rating: number;
  wins: number;
  winRate: number;
  level: number;
}
