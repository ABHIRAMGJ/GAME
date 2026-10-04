import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.ts';
import { TRIVIA_QUESTIONS } from './triviaData.ts';
import { roomManager } from './matchmaking.ts';

const router = Router();

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

// Authentication middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.userId = user.id;
  req.user = user;
  next();
}

// --- AUTH ROUTES ---
router.post('/auth/guest', (req, res) => {
  const { username } = req.body;
  const guestNum = Math.floor(1000 + Math.random() * 9000);
  const guestName = (username && username.trim().length > 0) ? username.trim() : `Player_${guestNum}`;
  const guestEmail = `guest_${Date.now()}_${guestNum}@arena.local`;
  const guestPassword = Math.random().toString(36).substring(2, 12);

  const user = db.createUser({
    username: guestName,
    fullName: `${guestName} (Guest)`,
    email: guestEmail,
    password: guestPassword,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(guestName)}`,
  });

  const session = db.createSession(user.id, true);

  return res.status(201).json({
    token: session.token,
    user,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

router.post('/auth/register', (req, res) => {
  const { username, fullName, email, password, confirmPassword, avatar } = req.body;

  if (!username || !fullName || !email || !password) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  // Check unique username or email
  const existing = db.getUserByEmailOrUsername(username) || db.getUserByEmailOrUsername(email);
  if (existing) {
    return res.status(400).json({ error: 'A user with that username or email already exists' });
  }

  const user = db.createUser({
    username,
    fullName,
    email,
    password,
    avatar,
  });

  const session = db.createSession(user.id, true);

  return res.status(201).json({
    token: session.token,
    user,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

router.post('/auth/login', (req, res) => {
  const { identifier, password, rememberMe } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please provide email/username and password' });
  }

  const userRecord = db.getUserByEmailOrUsername(identifier);
  if (!userRecord) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, userRecord.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const session = db.createSession(userRecord.id, rememberMe !== false);
  const user = db.getUserById(userRecord.id);

  return res.json({
    token: session.token,
    user,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

router.post('/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    db.revokeSession(token);
  }
  return res.json({ success: true });
});

router.post('/auth/logout-all', requireAuth, (req: AuthenticatedRequest, res) => {
  db.revokeAllUserSessions(req.userId!);
  return res.json({ success: true });
});

router.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.getUserByEmailOrUsername(email);
  if (!user) {
    // Return standard message to prevent email enumeration
    return res.json({ success: true, message: 'If an account exists, a reset link has been dispatched.' });
  }
  return res.json({ success: true, message: 'Password reset link sent to registered email address.' });
});

router.post('/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  const user = db.getUserByEmailOrUsername(email);
  if (!user) {
    return res.status(404).json({ error: 'Account not found' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  return res.json({ success: true, message: 'Password has been reset. Please log in.' });
});

router.put('/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const { fullName, avatar } = req.body;
  const updated = db.updateUserProfile(req.userId!, { fullName, avatar });
  return res.json({ user: updated });
});

// --- FRIENDS ---
router.get('/friends', requireAuth, (req: AuthenticatedRequest, res) => {
  const friends = db.getFriends(req.userId!);
  return res.json({ friends });
});

router.get('/friends/search', requireAuth, (req: AuthenticatedRequest, res) => {
  const query = (req.query.q as string) || '';
  const results = db.searchUsers(query, req.userId!);
  return res.json({ users: results });
});

router.post('/friends/request', requireAuth, (req: AuthenticatedRequest, res) => {
  const { receiverId } = req.body;
  const request = db.sendFriendRequest(req.userId!, receiverId);
  if (!request) {
    return res.status(400).json({ error: 'Could not send request or already requested/friends' });
  }
  return res.json({ request });
});

router.post('/friends/respond', requireAuth, (req: AuthenticatedRequest, res) => {
  const { requestId, accept } = req.body;
  const success = db.respondFriendRequest(requestId, req.userId!, !!accept);
  return res.json({ success });
});

router.delete('/friends/:friendId', requireAuth, (req: AuthenticatedRequest, res) => {
  const success = db.removeFriend(req.userId!, req.params.friendId);
  return res.json({ success });
});

// --- MATCHES & RATINGS ---
router.post('/match/record', requireAuth, (req: AuthenticatedRequest, res) => {
  const {
    gameId,
    opponentId,
    opponentName,
    opponentAvatar,
    isBot,
    result,
    userScore,
    opponentScore,
    durationSeconds,
    replayData,
  } = req.body;

  const matchStats = db.recordMatchResult({
    gameId,
    userId: req.userId!,
    opponentId: opponentId || 'bot_ai',
    opponentName: opponentName || 'AI Bot',
    opponentAvatar: opponentAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=arena_ai',
    isBot: isBot !== false,
    result,
    userScore: userScore || 0,
    opponentScore: opponentScore || 0,
    durationSeconds: durationSeconds || 60,
    replayData,
  });

  const updatedUser = db.getUserById(req.userId!);
  return res.json({ ...matchStats, user: updatedUser });
});

router.get('/match/history', requireAuth, (req: AuthenticatedRequest, res) => {
  const history = db.getMatchHistory(req.userId!, 30);
  return res.json({ history });
});

// --- LEADERBOARDS ---
router.get('/leaderboard', (req, res) => {
  const gameId = req.query.gameId as any;
  const type = (req.query.type as 'global' | 'friends') || 'global';
  const currentUserId = req.query.userId as string | undefined;

  const entries = db.getLeaderboard(gameId || undefined, type, currentUserId);
  return res.json({ entries });
});

// --- ACHIEVEMENTS & DAILY CHALLENGES ---
router.get('/achievements', requireAuth, (req: AuthenticatedRequest, res) => {
  const achievements = db.getAchievements(req.userId!);
  return res.json({ achievements });
});

router.get('/challenges', requireAuth, (req: AuthenticatedRequest, res) => {
  const challenges = db.getDailyChallenges(req.userId!);
  return res.json({ challenges });
});

router.post('/challenges/claim', requireAuth, (req: AuthenticatedRequest, res) => {
  const { challengeId } = req.body;
  const success = db.claimDailyChallenge(req.userId!, challengeId);
  const user = db.getUserById(req.userId!);
  return res.json({ success, user });
});

// --- NOTIFICATIONS ---
router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const notifications = db.getNotifications(req.userId!);
  return res.json({ notifications });
});

router.post('/notifications/read', requireAuth, (req: AuthenticatedRequest, res) => {
  const { notificationId } = req.body;
  db.markNotificationAsRead(req.userId!, notificationId);
  return res.json({ success: true });
});

// --- TRIVIA QUESTIONS ---
router.get('/trivia/questions', (req, res) => {
  const category = req.query.category as string | undefined;
  const count = parseInt(req.query.count as string) || 5;

  let pool = TRIVIA_QUESTIONS;
  if (category && category !== 'All') {
    pool = pool.filter((q) => q.category.toLowerCase() === category.toLowerCase());
    if (pool.length === 0) pool = TRIVIA_QUESTIONS;
  }

  // Shuffle and pick
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return res.json({ questions: shuffled.slice(0, count) });
});

// --- ROOM INFO ---
router.get('/room/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json({
    room: {
      code: room.code,
      gameId: room.gameId,
      hostId: room.hostId,
      hostName: room.hostName,
      hostAvatar: room.hostAvatar,
      guestId: room.guestId,
      guestName: room.guestName,
      status: room.status,
      options: room.options,
    },
  });
});

// --- TOURNAMENTS ---
router.get('/tournaments', (_req, res) => {
  const tournaments = db.getTournaments();
  return res.json({ tournaments });
});

router.post('/tournaments/join', requireAuth, (req: AuthenticatedRequest, res) => {
  const { tournamentId } = req.body;
  const result = db.joinTournament(tournamentId, req.userId!);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.json({ success: true, tournament: result.tournament });
});

router.post('/tournaments/advance', requireAuth, (req: AuthenticatedRequest, res) => {
  const { tournamentId } = req.body;
  const tour = db.advanceTournamentRound(tournamentId);
  if (!tour) return res.status(404).json({ error: 'Tournament not found' });
  return res.json({ tournament: tour });
});

// --- GLOBAL & LOBBY CHAT ---
router.get('/chat/messages', (req, res) => {
  const channel = (req.query.channel as string) || 'global';
  const messages = db.getChatMessages(channel, 50);
  return res.json({ messages });
});

router.post('/chat/send', requireAuth, (req: AuthenticatedRequest, res) => {
  const { text, channel } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const result = db.addChatMessage({
    senderId: req.userId!,
    senderName: req.user.username,
    senderAvatar: req.user.avatar,
    text: text.trim(),
    channel: channel || 'global',
  });

  return res.json(result);
});

router.post('/chat/report', requireAuth, (req: AuthenticatedRequest, res) => {
  const { messageId, reason } = req.body;
  const success = db.reportChatMessage(messageId, req.userId!, reason || 'Inappropriate content');
  return res.json({ success });
});

export default router;
