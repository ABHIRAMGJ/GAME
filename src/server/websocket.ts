import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { db } from './db.ts';
import { roomManager, RoomSession } from './matchmaking.ts';
import { GameId } from '../types/index.ts';

interface ClientSocket extends WebSocket {
  id: string;
  userId?: string;
  username?: string;
  avatar?: string;
  currentRoomCode?: string;
  isAlive: boolean;
}

export function setupWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, ClientSocket>();

  function broadcastToRoom(code: string, message: any, excludeSocketId?: string) {
    const room = roomManager.getRoom(code);
    if (!room) return;

    const payload = JSON.stringify(message);
    const targetSocketIds = [
      room.hostSocketId,
      room.guestSocketId,
      ...room.spectatorSocketIds,
    ].filter(Boolean) as string[];

    for (const sid of targetSocketIds) {
      if (sid === excludeSocketId) continue;
      const sock = clients.get(sid);
      if (sock && sock.readyState === WebSocket.OPEN) {
        sock.send(payload);
      }
    }
  }

  function sendToSocket(socketId: string, message: any) {
    const sock = clients.get(socketId);
    if (sock && sock.readyState === WebSocket.OPEN) {
      sock.send(JSON.stringify(message));
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    const socket = ws as ClientSocket;
    socket.id = 'ws_' + Math.random().toString(36).substring(2, 9);
    socket.isAlive = true;
    clients.set(socket.id, socket);

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());
        const { type, payload } = msg;

        switch (type) {
          case 'auth': {
            const { token } = payload || {};
            if (token) {
              const sess = db.getSession(token);
              if (sess) {
                const user = db.getUserById(sess.userId);
                if (user) {
                  socket.userId = user.id;
                  socket.username = user.username;
                  socket.avatar = user.avatar;
                  db.onlineUserIds.add(user.id);
                  sendToSocket(socket.id, { type: 'auth_success', payload: { user } });
                }
              }
            }
            break;
          }

          case 'room_create': {
            const { gameId, isPrivate, options } = payload;
            if (!socket.userId || !socket.username) {
              const guestNum = Math.floor(1000 + Math.random() * 9000);
              const guestName = `Host_${guestNum}`;
              const user = db.createUser({
                username: guestName,
                fullName: `${guestName} (Guest)`,
                email: `guest_${Date.now()}_${guestNum}@arena.local`,
                password: Math.random().toString(36).substring(2, 12),
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(guestName)}`,
              });
              const sess = db.createSession(user.id, true);
              socket.userId = user.id;
              socket.username = user.username;
              socket.avatar = user.avatar;
              db.onlineUserIds.add(user.id);
              sendToSocket(socket.id, { type: 'auth_success', payload: { user, token: sess.token } });
            }

            const room = roomManager.createRoom({
              gameId,
              hostId: socket.userId,
              hostName: socket.username,
              hostAvatar: socket.avatar || '',
              isPrivate: !!isPrivate,
              options: options || {},
              socketId: socket.id,
            });

            socket.currentRoomCode = room.code;
            sendToSocket(socket.id, {
              type: 'room_created',
              payload: {
                room: sanitizeRoom(room),
                isHost: true,
              },
            });
            break;
          }

          case 'room_join': {
            const { code, guestName } = payload;
            if (!socket.userId || !socket.username) {
              const guestNum = Math.floor(1000 + Math.random() * 9000);
              const name = (guestName && guestName.trim().length > 0) ? guestName.trim() : `Player_${guestNum}`;
              const user = db.createUser({
                username: name,
                fullName: `${name} (Guest)`,
                email: `guest_${Date.now()}_${guestNum}@arena.local`,
                password: Math.random().toString(36).substring(2, 12),
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
              });
              const sess = db.createSession(user.id, true);
              socket.userId = user.id;
              socket.username = user.username;
              socket.avatar = user.avatar;
              db.onlineUserIds.add(user.id);
              sendToSocket(socket.id, { type: 'auth_success', payload: { user, token: sess.token } });
            }

            const result = roomManager.joinRoom(code, {
              userId: socket.userId,
              username: socket.username,
              avatar: socket.avatar || '',
              socketId: socket.id,
            });

            if (!result.success || !result.room) {
              sendToSocket(socket.id, { type: 'error', payload: { message: result.error || 'Failed to join' } });
              return;
            }

            socket.currentRoomCode = result.room.code;

            // Notify joining player
            sendToSocket(socket.id, {
              type: 'room_joined',
              payload: {
                room: sanitizeRoom(result.room),
                isHost: result.isHost,
                isSpectator: result.isSpectator,
              },
            });

            // Notify other room members
            broadcastToRoom(
              result.room.code,
              {
                type: 'player_joined',
                payload: {
                  room: sanitizeRoom(result.room),
                  guest: {
                    id: socket.userId,
                    username: socket.username,
                    avatar: socket.avatar,
                  },
                },
              },
              socket.id
            );
            break;
          }

          case 'room_ready': {
            const { code, ready } = payload;
            const room = roomManager.getRoom(code);
            if (!room) return;

            if (room.hostId === socket.userId) {
              room.hostReady = ready;
            } else if (room.guestId === socket.userId) {
              room.guestReady = ready;
            }

            broadcastToRoom(code, {
              type: 'room_ready_status',
              payload: {
                hostReady: room.hostReady,
                guestReady: room.guestReady,
              },
            });
            break;
          }

          case 'game_start': {
            const { code } = payload;
            const room = roomManager.getRoom(code);
            if (!room || room.hostId !== socket.userId) return;

            room.status = 'playing';
            room.gameState = { startTime: Date.now() };

            broadcastToRoom(code, {
              type: 'game_started',
              payload: {
                room: sanitizeRoom(room),
                gameState: room.gameState,
              },
            });
            break;
          }

          case 'game_action': {
            const { code, action, data } = payload;
            const room = roomManager.getRoom(code);
            if (!room) return;

            // Broadcast real-time move to opponent and spectators
            broadcastToRoom(
              code,
              {
                type: 'game_action',
                payload: {
                  action,
                  data,
                  senderId: socket.userId,
                  timestamp: Date.now(),
                },
              },
              socket.id
            );
            break;
          }

          case 'chat_message': {
            const { code, text } = payload;
            if (!text || !text.trim() || !socket.username) return;

            const chatItem = {
              id: 'msg_' + Math.random().toString(36).substring(2, 9),
              senderId: socket.userId || 'anon',
              senderName: socket.username,
              senderAvatar: socket.avatar || '',
              text: text.slice(0, 200),
              timestamp: Date.now(),
            };

            broadcastToRoom(code, {
              type: 'chat_message',
              payload: chatItem,
            });
            break;
          }

          case 'channel_chat_message': {
            const { channel, text } = payload;
            if (!text || !text.trim() || !socket.username) return;

            const result = db.addChatMessage({
              senderId: socket.userId || 'anon',
              senderName: socket.username,
              senderAvatar: socket.avatar || '',
              text: text.trim(),
              channel: channel || 'global',
            });

            // Broadcast to all active clients
            const broadcastPayload = JSON.stringify({
              type: 'channel_chat_message',
              payload: result.message,
            });

            for (const client of clients.values()) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastPayload);
              }
            }
            break;
          }

          case 'rematch_request': {
            const { code } = payload;
            const room = roomManager.getRoom(code);
            if (!room) return;

            if (room.hostId === socket.userId) {
              room.rematchHost = true;
            } else if (room.guestId === socket.userId) {
              room.rematchGuest = true;
            }

            if (room.rematchHost && room.rematchGuest) {
              // Both agreed to rematch!
              room.rematchHost = false;
              room.rematchGuest = false;
              room.status = 'playing';
              room.gameState = { startTime: Date.now(), rematch: true };

              broadcastToRoom(code, {
                type: 'rematch_accepted',
                payload: {
                  room: sanitizeRoom(room),
                },
              });
            } else {
              broadcastToRoom(code, {
                type: 'rematch_requested',
                payload: {
                  requesterId: socket.userId,
                  requesterName: socket.username,
                },
              });
            }
            break;
          }

          case 'match_end': {
            const { code, winnerId, userScore, opponentScore, durationSeconds, replayData } = payload;
            const room = roomManager.getRoom(code);
            if (!room || room.status === 'ended') return;

            room.status = 'ended';

            // Authoritatively persist match record and compute Elo ratings
            let hostResult: 'win' | 'loss' | 'draw' = 'draw';
            let guestResult: 'win' | 'loss' | 'draw' = 'draw';

            if (winnerId === room.hostId) {
              hostResult = 'win';
              guestResult = 'loss';
            } else if (winnerId === room.guestId) {
              hostResult = 'loss';
              guestResult = 'win';
            }

            const hostStats = db.recordMatchResult({
              gameId: room.gameId,
              userId: room.hostId,
              opponentId: room.guestId || 'guest',
              opponentName: room.guestName || 'Player 2',
              opponentAvatar: room.guestAvatar || '',
              isBot: false,
              result: hostResult,
              userScore: winnerId === room.hostId ? (userScore || 1) : (opponentScore || 0),
              opponentScore: winnerId === room.hostId ? (opponentScore || 0) : (userScore || 1),
              durationSeconds: durationSeconds || 120,
              replayData,
            });

            let guestStats: any = null;
            if (room.guestId) {
              guestStats = db.recordMatchResult({
                gameId: room.gameId,
                userId: room.guestId,
                opponentId: room.hostId,
                opponentName: room.hostName,
                opponentAvatar: room.hostAvatar,
                isBot: false,
                result: guestResult,
                userScore: winnerId === room.guestId ? (userScore || 1) : (opponentScore || 0),
                opponentScore: winnerId === room.guestId ? (opponentScore || 0) : (userScore || 1),
                durationSeconds: durationSeconds || 120,
                replayData,
              });
            }

            broadcastToRoom(code, {
              type: 'game_over',
              payload: {
                winnerId,
                hostStats,
                guestStats,
                hostResult,
                guestResult,
              },
            });
            break;
          }

          case 'queue_join': {
            const { gameId } = payload;
            if (!socket.userId || !socket.username) {
              sendToSocket(socket.id, { type: 'error', payload: { message: 'Must be logged in to queue' } });
              return;
            }

            const user = db.getUserById(socket.userId);
            const rating = user ? user.ratings[gameId as GameId] || 1200 : 1200;

            const queueResult = roomManager.addToQueue({
              userId: socket.userId,
              username: socket.username,
              avatar: socket.avatar || '',
              gameId,
              rating,
              socketId: socket.id,
              joinedAt: Date.now(),
            });

            if (queueResult.matched) {
              const { room, opponent } = queueResult.matched;
              socket.currentRoomCode = room.code;

              // Notify both players match is found
              sendToSocket(opponent.socketId, {
                type: 'match_found',
                payload: {
                  room: sanitizeRoom(room),
                  opponent: { id: socket.userId, username: socket.username, avatar: socket.avatar },
                  isHost: true,
                },
              });

              sendToSocket(socket.id, {
                type: 'match_found',
                payload: {
                  room: sanitizeRoom(room),
                  opponent: { id: opponent.userId, username: opponent.username, avatar: opponent.avatar },
                  isHost: false,
                },
              });
            } else {
              sendToSocket(socket.id, {
                type: 'queue_waiting',
                payload: { gameId },
              });
            }
            break;
          }

          case 'queue_leave': {
            if (socket.userId) {
              roomManager.removeFromQueue(socket.userId);
              sendToSocket(socket.id, { type: 'queue_cancelled' });
            }
            break;
          }

          case 'friend_challenge': {
            const { friendId, gameId } = payload;
            if (!socket.userId || !socket.username) return;

            // Create private room for challenge
            const room = roomManager.createRoom({
              gameId,
              hostId: socket.userId,
              hostName: socket.username,
              hostAvatar: socket.avatar || '',
              isPrivate: true,
              socketId: socket.id,
            });

            socket.currentRoomCode = room.code;

            // Notify target friend if online
            db.addNotification({
              userId: friendId,
              type: 'game_invite',
              title: `Challenge from ${socket.username}!`,
              message: `Invited you to a match in ${gameId.toUpperCase()}`,
              actionUrl: `/join/${room.code}`,
              data: { code: room.code, gameId },
            });

            // If friend has an open socket, send live invite alert
            for (const [_, client] of clients.entries()) {
              if (client.userId === friendId && client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: 'challenge_received',
                    payload: {
                      challenger: { id: socket.userId, username: socket.username, avatar: socket.avatar },
                      gameId,
                      roomCode: room.code,
                    },
                  })
                );
              }
            }

            sendToSocket(socket.id, {
              type: 'challenge_created',
              payload: { room: sanitizeRoom(room) },
            });
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    socket.on('close', () => {
      clients.delete(socket.id);
      if (socket.currentRoomCode) {
        const { room, wasHost, closed } = roomManager.leaveRoom(socket.currentRoomCode, socket.id);
        if (room) {
          broadcastToRoom(socket.currentRoomCode, {
            type: closed ? 'room_closed' : 'player_left',
            payload: { wasHost, playerId: socket.userId },
          });
        }
      }
      if (socket.userId) {
        roomManager.removeFromQueue(socket.userId);
        // Only set offline if no other sockets open for this user
        let hasOtherSocket = false;
        for (const [_, c] of clients.entries()) {
          if (c.userId === socket.userId) {
            hasOtherSocket = true;
            break;
          }
        }
        if (!hasOtherSocket) {
          db.onlineUserIds.delete(socket.userId);
        }
      }
    });
  });

  // Heartbeat keep-alive every 30s
  const interval = setInterval(() => {
    for (const [id, socket] of clients.entries()) {
      if (!socket.isAlive) {
        clients.delete(id);
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
    roomManager.cleanStaleRooms();
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

function sanitizeRoom(room: RoomSession) {
  return {
    code: room.code,
    gameId: room.gameId,
    hostId: room.hostId,
    hostName: room.hostName,
    hostAvatar: room.hostAvatar,
    guestId: room.guestId,
    guestName: room.guestName,
    guestAvatar: room.guestAvatar,
    isPrivate: room.isPrivate,
    status: room.status,
    options: room.options,
    hostReady: room.hostReady,
    guestReady: room.guestReady,
    createdAt: room.createdAt,
    spectatorCount: room.spectatorSocketIds.length,
  };
}
