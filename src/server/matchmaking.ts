import crypto from 'crypto';
import { GameId, GameRoom } from '../types/index.ts';

export interface RoomSession extends GameRoom {
  hostSocketId?: string;
  guestSocketId?: string;
  spectatorSocketIds: string[];
  hostReady: boolean;
  guestReady: boolean;
  gameState: any;
  rematchHost: boolean;
  rematchGuest: boolean;
}

export interface MatchmakingQueueEntry {
  userId: string;
  username: string;
  avatar: string;
  gameId: GameId;
  rating: number;
  socketId: string;
  joinedAt: number;
}

class RoomManager {
  private rooms: Map<string, RoomSession> = new Map();
  private matchmakingQueue: Map<GameId, MatchmakingQueueEntry[]> = new Map();

  // Create room with clean 6-character uppercase code (e.g. 8KX92P)
  public createRoom(params: {
    gameId: GameId;
    hostId: string;
    hostName: string;
    hostAvatar: string;
    isPrivate: boolean;
    options?: any;
    socketId?: string;
  }): RoomSession {
    let code = '';
    do {
      code = crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (this.rooms.has(code));

    const room: RoomSession = {
      code,
      gameId: params.gameId,
      hostId: params.hostId,
      hostName: params.hostName,
      hostAvatar: params.hostAvatar,
      isPrivate: params.isPrivate,
      status: 'waiting',
      options: params.options || {},
      createdAt: Date.now(),
      hostSocketId: params.socketId,
      spectatorSocketIds: [],
      hostReady: false,
      guestReady: false,
      gameState: null,
      rematchHost: false,
      rematchGuest: false,
    };

    this.rooms.set(code, room);
    return room;
  }

  public getRoom(code: string): RoomSession | undefined {
    return this.rooms.get(code.toUpperCase().trim());
  }

  public joinRoom(
    code: string,
    player: { userId: string; username: string; avatar: string; socketId?: string }
  ): { success: boolean; error?: string; room?: RoomSession; isHost?: boolean; isSpectator?: boolean } {
    const room = this.rooms.get(code.toUpperCase().trim());
    if (!room) return { success: false, error: 'Room not found' };

    // Host reconnecting
    if (room.hostId === player.userId) {
      room.hostSocketId = player.socketId;
      return { success: true, room, isHost: true };
    }

    // Guest reconnecting
    if (room.guestId === player.userId) {
      room.guestSocketId = player.socketId;
      return { success: true, room, isHost: false };
    }

    // Fresh guest joining
    if (!room.guestId && room.status === 'waiting') {
      room.guestId = player.userId;
      room.guestName = player.username;
      room.guestAvatar = player.avatar;
      room.guestSocketId = player.socketId;
      room.status = 'ready';
      return { success: true, room, isHost: false };
    }

    // Join as spectator if already full
    if (player.socketId && !room.spectatorSocketIds.includes(player.socketId)) {
      room.spectatorSocketIds.push(player.socketId);
    }
    return { success: true, room, isSpectator: true };
  }

  public leaveRoom(code: string, socketId: string): { room?: RoomSession; wasHost?: boolean; wasGuest?: boolean; closed?: boolean } {
    const room = this.rooms.get(code);
    if (!room) return {};

    if (room.hostSocketId === socketId) {
      // Host left, terminate or transfer
      this.rooms.delete(code);
      return { room, wasHost: true, closed: true };
    }

    if (room.guestSocketId === socketId) {
      room.guestId = undefined;
      room.guestName = undefined;
      room.guestAvatar = undefined;
      room.guestSocketId = undefined;
      room.guestReady = false;
      room.status = 'waiting';
      return { room, wasGuest: true };
    }

    room.spectatorSocketIds = room.spectatorSocketIds.filter((s) => s !== socketId);
    return { room };
  }

  // --- Matchmaking Queue ---
  public addToQueue(entry: MatchmakingQueueEntry): { matched?: { room: RoomSession; opponent: MatchmakingQueueEntry } } {
    let queue = this.matchmakingQueue.get(entry.gameId);
    if (!queue) {
      queue = [];
      this.matchmakingQueue.set(entry.gameId, queue);
    }

    // Remove if already in queue
    queue = queue.filter((item) => item.userId !== entry.userId);

    // Look for matching opponent (closest rating)
    if (queue.length > 0) {
      // Pick closest rating
      queue.sort((a, b) => Math.abs(a.rating - entry.rating) - Math.abs(b.rating - entry.rating));
      const opponent = queue.shift()!;
      this.matchmakingQueue.set(entry.gameId, queue);

      // Create quick match room
      const room = this.createRoom({
        gameId: entry.gameId,
        hostId: opponent.userId,
        hostName: opponent.username,
        hostAvatar: opponent.avatar,
        isPrivate: false,
        socketId: opponent.socketId,
      });

      this.joinRoom(room.code, {
        userId: entry.userId,
        username: entry.username,
        avatar: entry.avatar,
        socketId: entry.socketId,
      });

      room.status = 'playing';
      return { matched: { room, opponent } };
    }

    queue.push(entry);
    this.matchmakingQueue.set(entry.gameId, queue);
    return {};
  }

  public removeFromQueue(userId: string, gameId?: GameId): void {
    if (gameId) {
      const q = this.matchmakingQueue.get(gameId);
      if (q) {
        this.matchmakingQueue.set(gameId, q.filter((e) => e.userId !== userId));
      }
    } else {
      for (const [gid, q] of this.matchmakingQueue.entries()) {
        this.matchmakingQueue.set(gid, q.filter((e) => e.userId !== userId));
      }
    }
  }

  public cleanStaleRooms() {
    const ONE_HOUR = 3600000;
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.createdAt > ONE_HOUR) {
        this.rooms.delete(code);
      }
    }
  }
}

export const roomManager = new RoomManager();
