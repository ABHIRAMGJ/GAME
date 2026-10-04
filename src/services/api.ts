import { User, GameId, Friend, MatchRecord, Achievement, DailyChallenge, NotificationItem, LeaderboardEntry } from '../types/index.ts';

const TOKEN_KEY = 'ga_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // Auth
  guestLogin: (username?: string) =>
    request<{ token: string; user: User; expiresAt: string }>('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
  register: (body: any) => request<{ token: string; user: User; expiresAt: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<{ token: string; user: User; expiresAt: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: User }>('/auth/me'),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  logoutAll: () => request<{ success: boolean }>('/auth/logout-all', { method: 'POST' }),
  forgotPassword: (email: string) => request<{ success: boolean; message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: any) => request<{ success: boolean; message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  updateProfile: (body: any) => request<{ user: User }>('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Friends
  getFriends: () => request<{ friends: Friend[] }>('/friends'),
  searchUsers: (q: string) => request<{ users: User[] }>(`/friends/search?q=${encodeURIComponent(q)}`),
  sendFriendRequest: (receiverId: string) => request<{ request: any }>('/friends/request', { method: 'POST', body: JSON.stringify({ receiverId }) }),
  respondFriendRequest: (requestId: string, accept: boolean) => request<{ success: boolean }>('/friends/respond', { method: 'POST', body: JSON.stringify({ requestId, accept }) }),
  removeFriend: (friendId: string) => request<{ success: boolean }>(`/friends/${friendId}`, { method: 'DELETE' }),

  // Leaderboard
  getLeaderboard: (gameId?: GameId, type: 'global' | 'friends' = 'global', userId?: string) =>
    request<{ entries: LeaderboardEntry[] }>(`/leaderboard?type=${type}${gameId ? `&gameId=${gameId}` : ''}${userId ? `&userId=${userId}` : ''}`),

  // Matches
  recordMatch: (body: any) => request<{ ratingChange: number; newRating: number; xpGained: number; leveledUp: boolean; user: User }>('/match/record', { method: 'POST', body: JSON.stringify(body) }),
  getMatchHistory: () => request<{ history: MatchRecord[] }>('/match/history'),

  // Achievements & Challenges
  getAchievements: () => request<{ achievements: Achievement[] }>('/achievements'),
  getChallenges: () => request<{ challenges: DailyChallenge[] }>('/challenges'),
  claimChallenge: (challengeId: string) => request<{ success: boolean; user: User }>('/challenges/claim', { method: 'POST', body: JSON.stringify({ challengeId }) }),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationItem[] }>('/notifications'),
  markNotificationRead: (notificationId?: string) => request<{ success: boolean }>('/notifications/read', { method: 'POST', body: JSON.stringify({ notificationId }) }),

  // Trivia
  getTriviaQuestions: (category?: string, count = 5) => request<{ questions: any[] }>(`/trivia/questions?count=${count}${category ? `&category=${encodeURIComponent(category)}` : ''}`),

  // Room
  getRoom: (code: string) => request<{ room: any }>(`/room/${code}`),

  // Tournaments
  getTournaments: () => request<{ tournaments: any[] }>('/tournaments'),
  joinTournament: (tournamentId: string) => request<{ success: boolean; tournament: any }>('/tournaments/join', { method: 'POST', body: JSON.stringify({ tournamentId }) }),
  advanceTournament: (tournamentId: string) => request<{ tournament: any }>('/tournaments/advance', { method: 'POST', body: JSON.stringify({ tournamentId }) }),

  // Chat
  getChatMessages: (channel = 'global') => request<{ messages: any[] }>(`/chat/messages?channel=${encodeURIComponent(channel)}`),
  sendChannelMessage: (text: string, channel = 'global') => request<{ message: any; moderated: boolean }>('/chat/send', { method: 'POST', body: JSON.stringify({ text, channel }) }),
  reportMessage: (messageId: string, reason?: string) => request<{ success: boolean }>('/chat/report', { method: 'POST', body: JSON.stringify({ messageId, reason }) }),
};
