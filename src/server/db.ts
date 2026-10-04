import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, MatchRecord, Achievement, DailyChallenge, NotificationItem, GameId, FriendRequest, ChatMessage, LeaderboardEntry, Tournament, TournamentMatch } from '../types/index.ts';

export interface UserRecord extends User {
  passwordHash: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  rememberMe: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface FriendshipRecord {
  userId: string;
  friendId: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: Record<string, UserRecord>;
  sessions: Record<string, SessionRecord>;
  friendships: FriendshipRecord[];
  friendRequests: FriendRequest[];
  matches: MatchRecord[];
  achievements: Achievement[];
  userAchievements: Record<string, string[]>; // userId -> achievementId[]
  dailyChallenges: Record<string, DailyChallenge[]>; // userId -> challenges
  notifications: NotificationItem[];
  chatMessages: ChatMessage[];
  tournaments: Tournament[];
  chatReports: Array<{ id: string; messageId: string; reportedBy: string; reason: string; timestamp: number }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'gamearena.json');

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'First Victory', description: 'Win your first game in any category', icon: '🏆', xpReward: 250 },
  { id: 'streak_5', title: '5 Win Streak', description: 'Win 5 competitive games consecutively', icon: '🔥', xpReward: 500 },
  { id: 'streak_10', title: '10 Win Streak', description: 'Ascend to glory with a 10-match win streak', icon: '⚡', xpReward: 1000 },
  { id: 'chess_master', title: 'Grandmaster Sight', description: 'Achieve a Chess rating above 1500 or win with checkmate', icon: '♟️', xpReward: 600, gameId: 'chess' },
  { id: 'tank_destroyer', title: 'Tank Destroyer', description: 'Deliver a direct hit high-damage strike in Pocket Tanks', icon: '💣', xpReward: 400, gameId: 'tanks' },
  { id: 'speed_demon', title: 'Speed Demon', description: 'Complete 3 racing laps with zero wall collisions', icon: '🏎️', xpReward: 400, gameId: 'racing' },
  { id: 'block_master', title: 'Tetris Architect', description: 'Clear a 4-line Tetris in competitive battle', icon: '🧱', xpReward: 500, gameId: 'tetris' },
  { id: 'carrom_queen', title: 'Queen Majesty', description: 'Pocket the Red Queen with immediate cover', icon: '🎯', xpReward: 500, gameId: 'carrom' },
  { id: 'naval_admiral', title: 'Naval Commander', description: 'Sink an entire enemy fleet in Battleship', icon: '🚢', xpReward: 450, gameId: 'battleship' },
  { id: 'hockey_pro', title: 'Air Hockey Ace', description: 'Score 5 goals in a single Air Hockey duel', icon: '🏓', xpReward: 400, gameId: 'airhockey' },
  { id: 'bullseye_king', title: 'Robin Hood', description: 'Hit three consecutive 10-point Bullseyes', icon: '🏹', xpReward: 500, gameId: 'archery' },
  { id: 'trivia_genius', title: 'Omniscient Mind', description: 'Answer 5 trivia questions correctly in under 5 seconds each', icon: '🧠', xpReward: 450, gameId: 'quiz' },
  { id: 'card_clash_tactician', title: 'Chroma Master', description: 'Defeat opponent in Color Clash with 50+ HP remaining', icon: '🃏', xpReward: 450, gameId: 'colorclash' },
  { id: 'century_club', title: 'Centurion', description: 'Play 100 total matches across Game Arena', icon: '👑', xpReward: 2000 },
];

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;
  public onlineUserIds: Set<string> = new Set();

  constructor() {
    this.data = this.load();
    this.seedDefaultsIfEmpty();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.tournaments || parsed.tournaments.length === 0) {
          parsed.tournaments = this.getInitialTournaments();
        }
        if (!parsed.chatReports) parsed.chatReports = [];
        if (!parsed.chatMessages || parsed.chatMessages.length === 0) {
          parsed.chatMessages = this.getInitialChatMessages();
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load database file, creating fresh store:', e);
    }
    return {
      users: {},
      sessions: {},
      friendships: [],
      friendRequests: [],
      matches: [],
      achievements: INITIAL_ACHIEVEMENTS,
      userAchievements: {},
      dailyChallenges: {},
      notifications: [],
      chatMessages: this.getInitialChatMessages(),
      tournaments: this.getInitialTournaments(),
      chatReports: [],
    };
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (err) {
        console.error('Failed to persist database file:', err);
      }
    }, 200);
  }

  private seedDefaultsIfEmpty() {
    if (Object.keys(this.data.users).length === 0) {
      // Seed default accounts requested by prompt (e.g. Abhiram and top players)
      const abhiramId = 'usr_abhiram';
      const hash = bcrypt.hashSync('password123', 10);

      const defaultRatings: Record<GameId, number> = {
        chess: 1428,
        carrom: 1280,
        ludo: 1320,
        tanks: 1210,
        racing: 1350,
        tetris: 1510,
        tictactoe: 1380,
        connect4: 1340,
        airhockey: 1190,
        archery: 1270,
        quiz: 1450,
        pool8ball: 1310,
        snake: 1260,
        pong: 1200,
        checkers: 1330,
        minesweeper: 1290,
        memory: 1220,
        wordle: 1400,
        flappy: 1180,
        solitaire: 1250,
        battleship: 1300,
        colorclash: 1250,
      };

      this.data.users[abhiramId] = {
        id: abhiramId,
        username: 'abhiram',
        fullName: 'Abhiram',
        email: 'abhiram@gamearena.com',
        passwordHash: hash,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        level: 18,
        xp: 8420,
        totalGames: 142,
        wins: 92,
        losses: 42,
        draws: 8,
        winRate: 64.8,
        streak: 4,
        bestStreak: 9,
        ratings: defaultRatings,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      };

      // Seed opponent players for friends & leaderboards
      const botUsers: Array<{ id: string; username: string; name: string; avatar: string; ratings: Record<GameId, number> }> = [
        {
          id: 'usr_elena',
          username: 'elena_chess',
          name: 'Elena Rostova',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          ratings: { ...defaultRatings, chess: 1680, tetris: 1490, quiz: 1510 },
        },
        {
          id: 'usr_marcus',
          username: 'marcus_tanks',
          name: 'Marcus Vance',
          avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
          ratings: { ...defaultRatings, tanks: 1540, airhockey: 1410, archery: 1380 },
        },
        {
          id: 'usr_cyber',
          username: 'cyber_racer',
          name: 'Kai Takahashi',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          ratings: { ...defaultRatings, racing: 1690, colorclash: 1420, carrom: 1390 },
        },
        {
          id: 'usr_sarah',
          username: 'valkyrie_sky',
          name: 'Sarah Jenkins',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          ratings: { ...defaultRatings, battleship: 1520, archery: 1490, quiz: 1380 },
        },
      ];

      for (const u of botUsers) {
        this.data.users[u.id] = {
          id: u.id,
          username: u.username,
          fullName: u.name,
          email: `${u.username}@gamearena.com`,
          passwordHash: hash,
          avatar: u.avatar,
          level: 15,
          xp: 6800,
          totalGames: 110,
          wins: 70,
          losses: 35,
          draws: 5,
          winRate: 63.6,
          streak: 3,
          bestStreak: 7,
          ratings: u.ratings,
          createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        };

        // Create mutual friendship with abhiram
        this.data.friendships.push({ userId: abhiramId, friendId: u.id, createdAt: new Date().toISOString() });
        this.data.friendships.push({ userId: u.id, friendId: abhiramId, createdAt: new Date().toISOString() });
      }

      // Initial achievements for abhiram
      this.data.userAchievements[abhiramId] = ['first_win', 'streak_5', 'chess_master', 'speed_demon'];

      this.data.tournaments = this.getInitialTournaments();
      this.data.chatMessages = this.getInitialChatMessages();

      this.scheduleSave();
    }
  }

  public getInitialTournaments(): Tournament[] {
    return [
      {
        id: 'tour_chess_grand',
        title: 'Grandmaster Blitz Open',
        gameId: 'chess',
        description: 'Single-elimination 8-player blitz chess tournament. 3+0 blitz time controls.',
        maxPlayers: 8,
        currentPlayers: 6,
        registeredUserIds: ['usr_elena', 'usr_marcus', 'usr_cyber', 'usr_sarah', 'usr_abhiram'],
        status: 'registration',
        prizeXp: 1500,
        prizeTrophy: '🏆 Grandmaster Blitz Trophy',
        startTime: 'Today, 21:00 UTC',
        matches: [
          {
            id: 'm_q1',
            round: 'quarter',
            matchIndex: 0,
            player1: { id: 'usr_elena', name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
            player2: { id: 'usr_marcus', name: 'Marcus Vance', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' },
            status: 'pending',
          },
          {
            id: 'm_q2',
            round: 'quarter',
            matchIndex: 1,
            player1: { id: 'usr_cyber', name: 'Kai Takahashi', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
            player2: { id: 'usr_sarah', name: 'Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
            status: 'pending',
          },
          {
            id: 'm_q3',
            round: 'quarter',
            matchIndex: 2,
            player1: { id: 'usr_abhiram', name: 'Abhiram', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
            status: 'pending',
          },
          {
            id: 'm_q4',
            round: 'quarter',
            matchIndex: 3,
            status: 'pending',
          },
        ],
      },
      {
        id: 'tour_tanks_cup',
        title: 'Iron Artillery Cup',
        gameId: 'tanks',
        description: 'High-stakes artillery duel across destructible warzones. 5 weapon limit.',
        maxPlayers: 8,
        currentPlayers: 4,
        registeredUserIds: ['usr_marcus', 'usr_cyber', 'usr_sarah'],
        status: 'registration',
        prizeXp: 1200,
        prizeTrophy: '💣 Iron Cannon Trophy',
        startTime: 'Tomorrow, 18:00 UTC',
        matches: [],
      },
      {
        id: 'tour_racing_apex',
        title: 'Neon Drift Apex Cup',
        gameId: 'racing',
        description: '3-lap high speed drift tournament across neon grand prix circuits.',
        maxPlayers: 8,
        currentPlayers: 5,
        registeredUserIds: ['usr_cyber', 'usr_marcus', 'usr_abhiram'],
        status: 'registration',
        prizeXp: 1200,
        prizeTrophy: '🏎️ Golden Nitro Piston',
        startTime: 'In 3 hours',
        matches: [],
      },
    ];
  }

  public getInitialChatMessages(): ChatMessage[] {
    return [
      {
        id: 'msg_init_1',
        channel: 'global',
        senderId: 'usr_elena',
        senderName: 'Elena Rostova',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        text: 'Welcome to Game Arena! The Stockfish AI on Master difficulty is intense!',
        timestamp: Date.now() - 15 * 60000,
      },
      {
        id: 'msg_init_2',
        channel: 'global',
        senderId: 'usr_marcus',
        senderName: 'Marcus Vance',
        senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        text: 'Just scored 100 HP flawless victory in Pocket Tanks with bounce bombs!',
        timestamp: Date.now() - 10 * 60000,
      },
      {
        id: 'msg_init_3',
        channel: 'lfg',
        senderId: 'usr_cyber',
        senderName: 'Kai Takahashi',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        text: 'Looking for 1v1 in 2D Racing or Tetris Battle! Room code 8KX92P',
        timestamp: Date.now() - 5 * 60000,
      },
      {
        id: 'msg_init_4',
        channel: 'strategy',
        senderId: 'usr_elena',
        senderName: 'Elena Rostova',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        text: 'Pro tip for Chess: The post-game analysis highlights accuracy & opening identification automatically.',
        timestamp: Date.now() - 3 * 60000,
      },
      {
        id: 'msg_init_5',
        channel: 'tournaments',
        senderId: 'usr_abhiram',
        senderName: 'Abhiram',
        senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        text: 'Grandmaster Blitz Open registration is filling up fast! 2 spots left!',
        timestamp: Date.now() - 1 * 60000,
      },
    ];
  }

  // --- Auth & Users ---
  public getUserByEmailOrUsername(identifier: string): UserRecord | null {
    const term = identifier.trim().toLowerCase();
    for (const user of Object.values(this.data.users)) {
      if (user.email.toLowerCase() === term || user.username.toLowerCase() === term) {
        return user;
      }
    }
    return null;
  }

  public getUserById(id: string): User | null {
    const user = this.data.users[id];
    if (!user) return null;
    const { passwordHash, ...cleanUser } = user;
    return cleanUser;
  }

  public createUser(params: {
    username: string;
    fullName: string;
    email: string;
    password: string;
    avatar?: string;
  }): User {
    const id = 'usr_' + crypto.randomUUID().slice(0, 8);
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(params.password, salt);

    const defaultRatings: Record<GameId, number> = {
      chess: 1200,
      carrom: 1200,
      ludo: 1200,
      tanks: 1200,
      racing: 1200,
      tetris: 1200,
      tictactoe: 1200,
      connect4: 1200,
      airhockey: 1200,
      archery: 1200,
      quiz: 1200,
      pool8ball: 1200,
      snake: 1200,
      pong: 1200,
      checkers: 1200,
      minesweeper: 1200,
      memory: 1200,
      wordle: 1200,
      flappy: 1200,
      solitaire: 1200,
      battleship: 1200,
      colorclash: 1200,
    };

    const newUser: UserRecord = {
      id,
      username: params.username.toLowerCase().trim(),
      fullName: params.fullName.trim(),
      email: params.email.toLowerCase().trim(),
      passwordHash,
      avatar: params.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${params.username}`,
      level: 1,
      xp: 0,
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      streak: 0,
      bestStreak: 0,
      ratings: defaultRatings,
      createdAt: new Date().toISOString(),
    };

    this.data.users[id] = newUser;
    this.generateDailyChallenges(id);
    this.scheduleSave();

    const { passwordHash: _, ...clean } = newUser;
    return clean;
  }

  public updateUserProfile(userId: string, updates: Partial<User>): User | null {
    const user = this.data.users[userId];
    if (!user) return null;

    if (updates.fullName) user.fullName = updates.fullName;
    if (updates.avatar) user.avatar = updates.avatar;

    this.scheduleSave();
    const { passwordHash, ...clean } = user;
    return clean;
  }

  // --- Sessions ---
  public createSession(userId: string, rememberMe = true): SessionRecord {
    const token = 'ga_sess_' + crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    // 30 days if rememberMe, 24 hours otherwise
    const duration = rememberMe ? 30 * 86400000 : 86400000;
    const session: SessionRecord = {
      token,
      userId,
      rememberMe,
      createdAt: now,
      expiresAt: now + duration,
    };
    this.data.sessions[token] = session;
    this.onlineUserIds.add(userId);
    this.scheduleSave();
    return session;
  }

  public getSession(token: string): SessionRecord | null {
    const session = this.data.sessions[token];
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      delete this.data.sessions[token];
      this.scheduleSave();
      return null;
    }
    return session;
  }

  public revokeSession(token: string): boolean {
    if (this.data.sessions[token]) {
      const sess = this.data.sessions[token];
      delete this.data.sessions[token];
      // Check if user has other active sessions before marking offline
      const hasOther = Object.values(this.data.sessions).some((s) => s.userId === sess.userId);
      if (!hasOther) this.onlineUserIds.delete(sess.userId);
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public revokeAllUserSessions(userId: string): void {
    for (const [t, s] of Object.entries(this.data.sessions)) {
      if (s.userId === userId) {
        delete this.data.sessions[t];
      }
    }
    this.onlineUserIds.delete(userId);
    this.scheduleSave();
  }

  // --- Friends System ---
  public getFriends(userId: string) {
    const friendIds = this.data.friendships
      .filter((f) => f.userId === userId)
      .map((f) => f.friendId);

    return friendIds
      .map((fid) => {
        const u = this.data.users[fid];
        if (!u) return null;
        return {
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          avatar: u.avatar,
          level: u.level,
          isOnline: this.onlineUserIds.has(u.id),
          lastSeen: 'Recently active',
        };
      })
      .filter(Boolean);
  }

  public searchUsers(query: string, currentUserId: string): User[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.values(this.data.users)
      .filter((u) => u.id !== currentUserId && (u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q)))
      .slice(0, 10)
      .map(({ passwordHash, ...clean }) => clean);
  }

  public sendFriendRequest(senderId: string, receiverId: string): FriendRequest | null {
    if (senderId === receiverId) return null;
    const sender = this.data.users[senderId];
    const receiver = this.data.users[receiverId];
    if (!sender || !receiver) return null;

    // Check if already friends
    const alreadyFriends = this.data.friendships.some(
      (f) => (f.userId === senderId && f.friendId === receiverId)
    );
    if (alreadyFriends) return null;

    // Check existing request
    const existing = this.data.friendRequests.find(
      (r) => r.senderId === senderId && r.receiverId === receiverId && r.status === 'pending'
    );
    if (existing) return existing;

    const request: FriendRequest = {
      id: 'req_' + crypto.randomUUID().slice(0, 8),
      senderId,
      senderUsername: sender.username,
      senderAvatar: sender.avatar,
      receiverId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.data.friendRequests.push(request);

    // Notify receiver
    this.addNotification({
      userId: receiverId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${sender.username} sent you a friend request.`,
      actionUrl: '/friends',
      data: { requestId: request.id },
    });

    this.scheduleSave();
    return request;
  }

  public respondFriendRequest(requestId: string, currentUserId: string, accept: boolean): boolean {
    const req = this.data.friendRequests.find((r) => r.id === requestId && r.receiverId === currentUserId && r.status === 'pending');
    if (!req) return false;

    req.status = accept ? 'accepted' : 'rejected';
    if (accept) {
      this.data.friendships.push({ userId: req.senderId, friendId: req.receiverId, createdAt: new Date().toISOString() });
      this.data.friendships.push({ userId: req.receiverId, friendId: req.senderId, createdAt: new Date().toISOString() });

      const receiver = this.data.users[currentUserId];
      this.addNotification({
        userId: req.senderId,
        type: 'friend_request',
        title: 'Friend Request Accepted',
        message: `${receiver?.username || 'A player'} accepted your friend request!`,
      });
    }

    this.scheduleSave();
    return true;
  }

  public removeFriend(userId: string, friendId: string): boolean {
    this.data.friendships = this.data.friendships.filter(
      (f) => !(f.userId === userId && f.friendId === friendId) && !(f.userId === friendId && f.friendId === userId)
    );
    this.scheduleSave();
    return true;
  }

  // --- Ratings & Match History ---
  public recordMatchResult(params: {
    gameId: GameId;
    userId: string;
    opponentId: string;
    opponentName: string;
    opponentAvatar: string;
    isBot: boolean;
    result: 'win' | 'loss' | 'draw';
    userScore: number;
    opponentScore: number;
    durationSeconds: number;
    replayData?: any;
  }): { ratingChange: number; newRating: number; xpGained: number; leveledUp: boolean } {
    const user = this.data.users[params.userId];
    if (!user) {
      return { ratingChange: 0, newRating: 1200, xpGained: 0, leveledUp: false };
    }

    const currentRating = user.ratings[params.gameId] || 1200;
    let ratingChange = 0;

    // Elo rating calculation (K = 32)
    const opponentRating = params.isBot ? 1250 : (this.data.users[params.opponentId]?.ratings[params.gameId] || 1200);
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
    const actualScore = params.result === 'win' ? 1 : params.result === 'loss' ? 0 : 0.5;
    ratingChange = Math.round(32 * (actualScore - expectedScore));

    // Guarantee minimum changes
    if (params.result === 'win' && ratingChange <= 0) ratingChange = 12;
    if (params.result === 'loss' && ratingChange >= 0) ratingChange = -12;

    const newRating = Math.max(100, currentRating + ratingChange);
    user.ratings[params.gameId] = newRating;

    // XP calculation
    let xpGained = params.result === 'win' ? 150 : params.result === 'loss' ? 50 : 80;
    if (params.result === 'win') {
      user.streak += 1;
      if (user.streak > user.bestStreak) user.bestStreak = user.streak;
      xpGained += user.streak * 10;
    } else if (params.result === 'loss') {
      user.streak = 0;
    }

    const oldLevel = user.level;
    user.xp += xpGained;
    user.totalGames += 1;
    if (params.result === 'win') user.wins += 1;
    else if (params.result === 'loss') user.losses += 1;
    else user.draws += 1;

    user.winRate = Math.round((user.wins / user.totalGames) * 1000) / 10;
    user.level = Math.max(1, Math.floor(Math.sqrt(user.xp / 100)) + 1);
    const leveledUp = user.level > oldLevel;

    // Save match record
    const matchRecord: MatchRecord = {
      id: 'mat_' + crypto.randomUUID().slice(0, 8),
      gameId: params.gameId,
      userId: params.userId,
      opponentId: params.opponentId,
      opponentName: params.opponentName,
      opponentAvatar: params.opponentAvatar,
      isBot: params.isBot,
      result: params.result,
      userScore: params.userScore,
      opponentScore: params.opponentScore,
      ratingChange,
      newRating,
      durationSeconds: params.durationSeconds,
      createdAt: new Date().toISOString(),
      replayData: params.replayData,
    };
    this.data.matches.unshift(matchRecord);

    // Update daily challenges
    this.updateDailyChallengesForGame(params.userId, params.gameId, params.result === 'win');

    // Check achievements
    this.checkUserAchievements(user, params.gameId, params.result);

    this.scheduleSave();
    return { ratingChange, newRating, xpGained, leveledUp };
  }

  public getMatchHistory(userId: string, limit = 20): MatchRecord[] {
    return this.data.matches.filter((m) => m.userId === userId).slice(0, limit);
  }

  // --- Leaderboards ---
  public getLeaderboard(gameId?: GameId, type: 'global' | 'friends' = 'global', currentUserId?: string): LeaderboardEntry[] {
    let candidateUsers = Object.values(this.data.users);

    if (type === 'friends' && currentUserId) {
      const friendIds = new Set(
        this.data.friendships.filter((f) => f.userId === currentUserId).map((f) => f.friendId)
      );
      friendIds.add(currentUserId);
      candidateUsers = candidateUsers.filter((u) => friendIds.has(u.id));
    }

    const sorted = [...candidateUsers].sort((a, b) => {
      const rA = gameId ? (a.ratings[gameId] || 1200) : Object.values(a.ratings).reduce((s, v) => s + v, 0) / 10;
      const rB = gameId ? (b.ratings[gameId] || 1200) : Object.values(b.ratings).reduce((s, v) => s + v, 0) / 10;
      return rB - rA;
    });

    return sorted.slice(0, 50).map((u, idx) => ({
      rank: idx + 1,
      userId: u.id,
      username: u.username,
      fullName: u.fullName,
      avatar: u.avatar,
      rating: gameId ? (u.ratings[gameId] || 1200) : Math.round(Object.values(u.ratings).reduce((s, v) => s + v, 0) / 10),
      wins: u.wins,
      winRate: u.winRate,
      level: u.level,
    }));
  }

  // --- Achievements & Challenges ---
  public getAchievements(userId: string) {
    const unlockedIds = new Set(this.data.userAchievements[userId] || []);
    return INITIAL_ACHIEVEMENTS.map((a) => ({
      ...a,
      unlockedAt: unlockedIds.has(a.id) ? 'Unlocked' : undefined,
    }));
  }

  public unlockAchievement(userId: string, achievementId: string): boolean {
    if (!this.data.userAchievements[userId]) {
      this.data.userAchievements[userId] = [];
    }
    if (this.data.userAchievements[userId].includes(achievementId)) return false;

    const ach = INITIAL_ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!ach) return false;

    this.data.userAchievements[userId].push(achievementId);
    const user = this.data.users[userId];
    if (user) {
      user.xp += ach.xpReward;
      user.level = Math.max(1, Math.floor(Math.sqrt(user.xp / 100)) + 1);
    }

    this.addNotification({
      userId,
      type: 'achievement',
      title: 'Achievement Unlocked! 🏆',
      message: `${ach.title}: ${ach.description} (+${ach.xpReward} XP)`,
    });

    this.scheduleSave();
    return true;
  }

  private checkUserAchievements(user: UserRecord, gameId: GameId, result: 'win' | 'loss' | 'draw') {
    if (user.wins >= 1) this.unlockAchievement(user.id, 'first_win');
    if (user.streak >= 5) this.unlockAchievement(user.id, 'streak_5');
    if (user.streak >= 10) this.unlockAchievement(user.id, 'streak_10');
    if (user.totalGames >= 100) this.unlockAchievement(user.id, 'century_club');

    if (gameId === 'chess' && result === 'win') this.unlockAchievement(user.id, 'chess_master');
    if (gameId === 'racing' && result === 'win') this.unlockAchievement(user.id, 'speed_demon');
    if (gameId === 'tanks' && result === 'win') this.unlockAchievement(user.id, 'tank_destroyer');
    if (gameId === 'tetris' && result === 'win') this.unlockAchievement(user.id, 'block_master');
  }

  public getDailyChallenges(userId: string): DailyChallenge[] {
    if (!this.data.dailyChallenges[userId] || this.data.dailyChallenges[userId].length === 0) {
      this.generateDailyChallenges(userId);
    }
    return this.data.dailyChallenges[userId];
  }

  public generateDailyChallenges(userId: string) {
    this.data.dailyChallenges[userId] = [
      {
        id: 'dc_1',
        title: 'Tactical Victor',
        description: 'Win 2 competitive matches in any game',
        gameId: 'chess',
        targetCount: 2,
        currentCount: 0,
        xpReward: 300,
        completed: false,
        claimed: false,
      },
      {
        id: 'dc_2',
        title: 'Master of Pieces',
        description: 'Complete a Chess match against bot or friend',
        gameId: 'chess',
        targetCount: 1,
        currentCount: 0,
        xpReward: 250,
        completed: false,
        claimed: false,
      },
      {
        id: 'dc_3',
        title: 'Artillery Ace',
        description: 'Score a victory in Pocket Tanks',
        gameId: 'tanks',
        targetCount: 1,
        currentCount: 0,
        xpReward: 250,
        completed: false,
        claimed: false,
      },
    ];
    this.scheduleSave();
  }

  private updateDailyChallengesForGame(userId: string, gameId: GameId, isWin: boolean) {
    const list = this.data.dailyChallenges[userId];
    if (!list) return;

    for (const c of list) {
      if (c.completed) continue;
      if (c.id === 'dc_1' && isWin) {
        c.currentCount += 1;
      } else if (c.id === 'dc_2' && gameId === 'chess') {
        c.currentCount += 1;
      } else if (c.id === 'dc_3' && gameId === 'tanks' && isWin) {
        c.currentCount += 1;
      }
      if (c.currentCount >= c.targetCount) {
        c.completed = true;
      }
    }
    this.scheduleSave();
  }

  public claimDailyChallenge(userId: string, challengeId: string): boolean {
    const list = this.data.dailyChallenges[userId];
    if (!list) return false;
    const c = list.find((item) => item.id === challengeId);
    if (!c || !c.completed || c.claimed) return false;

    c.claimed = true;
    const user = this.data.users[userId];
    if (user) {
      user.xp += c.xpReward;
      user.level = Math.max(1, Math.floor(Math.sqrt(user.xp / 100)) + 1);
    }
    this.scheduleSave();
    return true;
  }

  // --- Notifications ---
  public getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications.filter((n) => n.userId === userId).slice(0, 30);
  }

  public addNotification(params: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>): NotificationItem {
    const notif: NotificationItem = {
      id: 'notif_' + crypto.randomUUID().slice(0, 8),
      read: false,
      createdAt: new Date().toISOString(),
      ...params,
    };
    this.data.notifications.unshift(notif);
    this.scheduleSave();
    return notif;
  }

  public markNotificationAsRead(userId: string, notifId?: string): void {
    for (const n of this.data.notifications) {
      if (n.userId === userId && (!notifId || n.id === notifId)) {
        n.read = true;
      }
    }
    this.scheduleSave();
  }

  // --- Tournaments ---
  public getTournaments(): Tournament[] {
    return this.data.tournaments;
  }

  public joinTournament(tournamentId: string, userId: string): { success: boolean; tournament?: Tournament; error?: string } {
    const tour = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!tour) return { success: false, error: 'Tournament not found' };

    if (tour.registeredUserIds.includes(userId)) {
      return { success: false, error: 'Already registered for this tournament' };
    }

    if (tour.currentPlayers >= tour.maxPlayers) {
      return { success: false, error: 'Tournament is already full' };
    }

    tour.registeredUserIds.push(userId);
    tour.currentPlayers += 1;

    // Place into bracket slot if open
    const user = this.data.users[userId];
    if (user && tour.matches && tour.matches.length > 0) {
      const openMatch = tour.matches.find((m) => m.round === 'quarter' && (!m.player1 || !m.player2));
      if (openMatch) {
        if (!openMatch.player1) {
          openMatch.player1 = { id: user.id, name: user.fullName || user.username, avatar: user.avatar };
        } else if (!openMatch.player2) {
          openMatch.player2 = { id: user.id, name: user.fullName || user.username, avatar: user.avatar };
        }
      }
    }

    this.scheduleSave();
    return { success: true, tournament: tour };
  }

  public advanceTournamentRound(tournamentId: string): Tournament | null {
    const tour = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!tour) return null;

    // Simulate quarter-finals completion into semi-finals, or semi into final
    tour.status = 'in_progress';

    // Quarter finals resolution
    const quarters = tour.matches.filter((m) => m.round === 'quarter');
    const winners: Array<{ id: string; name: string; avatar: string }> = [];

    for (const qm of quarters) {
      if (!qm.winnerId && qm.player1 && qm.player2) {
        const p1Win = Math.random() < 0.5;
        qm.winnerId = p1Win ? qm.player1.id : qm.player2.id;
        qm.status = 'completed';
        winners.push(p1Win ? qm.player1 : qm.player2);
      } else if (qm.player1 && !qm.player2) {
        qm.winnerId = qm.player1.id;
        qm.status = 'completed';
        winners.push(qm.player1);
      }
    }

    // Populate Semi-Finals if not present
    let semis = tour.matches.filter((m) => m.round === 'semi');
    if (semis.length === 0 && winners.length >= 2) {
      tour.matches.push(
        {
          id: 'm_s1',
          round: 'semi',
          matchIndex: 0,
          player1: winners[0],
          player2: winners[1],
          status: 'in_progress',
        },
        {
          id: 'm_s2',
          round: 'semi',
          matchIndex: 1,
          player1: winners[2] || { id: 'bot_semi1', name: 'Grandmaster Bot', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gm1' },
          player2: winners[3] || { id: 'bot_semi2', name: 'Tactical Bot', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gm2' },
          status: 'in_progress',
        }
      );
    }

    this.scheduleSave();
    return tour;
  }

  // --- Global & Channel Chat with Moderation ---
  public getChatMessages(channel = 'global', limit = 50): ChatMessage[] {
    return this.data.chatMessages
      .filter((m) => !m.roomId && (m.channel || 'global') === channel)
      .slice(-limit);
  }

  public addChatMessage(params: {
    senderId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    channel?: string;
  }): { message: ChatMessage; moderated: boolean } {
    const channel = params.channel || 'global';

    // Moderation Filter
    const PROFANITY_REGEX = /\b(damn|hell|bastard|crap|idiot|noob|trash|loser|suck|stupid|ass|bitch|fuck|shit)\b/gi;
    let flagged = false;
    const cleanText = params.text.replace(PROFANITY_REGEX, (match) => {
      flagged = true;
      return '*'.repeat(match.length);
    });

    const msg: ChatMessage = {
      id: 'chat_' + crypto.randomUUID().slice(0, 8),
      channel,
      senderId: params.senderId,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      text: cleanText.slice(0, 280),
      timestamp: Date.now(),
      flagged,
    };

    this.data.chatMessages.push(msg);
    if (this.data.chatMessages.length > 500) {
      this.data.chatMessages.shift();
    }

    this.scheduleSave();
    return { message: msg, moderated: flagged };
  }

  public reportChatMessage(messageId: string, reportedBy: string, reason: string): boolean {
    const msg = this.data.chatMessages.find((m) => m.id === messageId);
    if (!msg) return false;

    msg.flagged = true;
    this.data.chatReports.push({
      id: 'rep_' + crypto.randomUUID().slice(0, 8),
      messageId,
      reportedBy,
      reason,
      timestamp: Date.now(),
    });

    this.scheduleSave();
    return true;
  }
}

export const db = new Database();
