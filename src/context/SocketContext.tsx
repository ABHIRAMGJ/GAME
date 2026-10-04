import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext.tsx';
import { GameId, GameRoom, ChatMessage } from '../types/index.ts';
import { sounds } from '../utils/sound.ts';

interface SocketContextType {
  isConnected: boolean;
  currentRoom: GameRoom | null;
  isHost: boolean;
  isSpectator: boolean;
  roomStatus: 'idle' | 'waiting' | 'ready' | 'playing' | 'ended';
  hostReady: boolean;
  guestReady: boolean;
  chatMessages: ChatMessage[];
  isQueueWaiting: boolean;
  incomingChallenge: { challenger: any; gameId: GameId; roomCode: string } | null;
  createRoom: (gameId: GameId, isPrivate?: boolean, options?: any) => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  sendGameAction: (action: string, data: any) => void;
  sendChatMessage: (text: string) => void;
  requestRematch: () => void;
  joinMatchmaking: (gameId: GameId) => void;
  leaveMatchmaking: () => void;
  sendChallenge: (friendId: string, gameId: GameId) => void;
  acceptIncomingChallenge: () => void;
  declineIncomingChallenge: () => void;
  onGameAction: (callback: (payload: { action: string; data: any; senderId: string; timestamp: number }) => void) => () => void;
  onGameOver: (callback: (payload: any) => void) => () => void;
  onRematchAccepted: (callback: () => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [roomStatus, setRoomStatus] = useState<'idle' | 'waiting' | 'ready' | 'playing' | 'ended'>('idle');
  const [hostReady, setHostReady] = useState(false);
  const [guestReady, setGuestReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isQueueWaiting, setIsQueueWaiting] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState<{ challenger: any; gameId: GameId; roomCode: string } | null>(null);

  const actionListeners = useRef<Set<(payload: any) => void>>(new Set());
  const gameOverListeners = useRef<Set<(payload: any) => void>>(new Set());
  const rematchListeners = useRef<Set<() => void>>(new Set());

  // Connect WebSocket
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', payload: { token } }));
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);

          switch (type) {
            case 'room_created':
              setCurrentRoom(payload.room);
              setIsHost(true);
              setIsSpectator(false);
              setRoomStatus(payload.room.status);
              setChatMessages([]);
              sounds.playMove();
              break;

            case 'room_joined':
              setCurrentRoom(payload.room);
              setIsHost(payload.isHost);
              setIsSpectator(payload.isSpectator || false);
              setRoomStatus(payload.room.status);
              setChatMessages([]);
              sounds.playMove();
              break;

            case 'player_joined':
              setCurrentRoom(payload.room);
              setRoomStatus(payload.room.status);
              sounds.playSuccess();
              break;

            case 'room_ready_status':
              setHostReady(payload.hostReady);
              setGuestReady(payload.guestReady);
              break;

            case 'game_started':
              setRoomStatus('playing');
              sounds.playGo();
              break;

            case 'game_action':
              actionListeners.current.forEach((cb) => cb(payload));
              break;

            case 'chat_message':
              setChatMessages((prev) => [...prev.slice(-40), payload]);
              break;

            case 'game_over':
              setRoomStatus('ended');
              gameOverListeners.current.forEach((cb) => cb(payload));
              break;

            case 'rematch_accepted':
              setRoomStatus('playing');
              rematchListeners.current.forEach((cb) => cb());
              sounds.playGo();
              break;

            case 'match_found':
              setCurrentRoom(payload.room);
              setIsHost(payload.isHost);
              setRoomStatus('playing');
              setIsQueueWaiting(false);
              sounds.playSuccess();
              break;

            case 'queue_waiting':
              setIsQueueWaiting(true);
              break;

            case 'queue_cancelled':
              setIsQueueWaiting(false);
              break;

            case 'challenge_received':
              setIncomingChallenge(payload);
              sounds.playSuccess();
              break;

            case 'player_left':
              if (payload.wasHost) {
                leaveRoom();
              }
              break;
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [token]);

  // Auth sync on token change
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && token) {
      socketRef.current.send(JSON.stringify({ type: 'auth', payload: { token } }));
    }
  }, [token]);

  const send = (type: string, payload: any = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  const createRoom = (gameId: GameId, isPrivate = true, options = {}) => {
    send('room_create', { gameId, isPrivate, options });
  };

  const joinRoom = (code: string) => {
    send('room_join', { code });
  };

  const leaveRoom = () => {
    if (currentRoom) {
      send('room_leave', { code: currentRoom.code });
      setCurrentRoom(null);
      setRoomStatus('idle');
      setIsHost(false);
      setIsSpectator(false);
      setChatMessages([]);
    }
  };

  const setReady = (ready: boolean) => {
    if (currentRoom) {
      send('room_ready', { code: currentRoom.code, ready });
    }
  };

  const startGame = () => {
    if (currentRoom) {
      send('game_start', { code: currentRoom.code });
    }
  };

  const sendGameAction = (action: string, data: any) => {
    if (currentRoom) {
      send('game_action', { code: currentRoom.code, action, data });
    }
  };

  const sendChatMessage = (text: string) => {
    if (currentRoom) {
      send('chat_message', { code: currentRoom.code, text });
    }
  };

  const requestRematch = () => {
    if (currentRoom) {
      send('rematch_request', { code: currentRoom.code });
    }
  };

  const joinMatchmaking = (gameId: GameId) => {
    send('queue_join', { gameId });
  };

  const leaveMatchmaking = () => {
    send('queue_leave');
    setIsQueueWaiting(false);
  };

  const sendChallenge = (friendId: string, gameId: GameId) => {
    send('friend_challenge', { friendId, gameId });
  };

  const acceptIncomingChallenge = () => {
    if (incomingChallenge) {
      joinRoom(incomingChallenge.roomCode);
      setIncomingChallenge(null);
    }
  };

  const declineIncomingChallenge = () => {
    setIncomingChallenge(null);
  };

  const onGameAction = useCallback((callback: (payload: any) => void) => {
    actionListeners.current.add(callback);
    return () => {
      actionListeners.current.delete(callback);
    };
  }, []);

  const onGameOver = useCallback((callback: (payload: any) => void) => {
    gameOverListeners.current.add(callback);
    return () => {
      gameOverListeners.current.delete(callback);
    };
  }, []);

  const onRematchAccepted = useCallback((callback: () => void) => {
    rematchListeners.current.add(callback);
    return () => {
      rematchListeners.current.delete(callback);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        currentRoom,
        isHost,
        isSpectator,
        roomStatus,
        hostReady,
        guestReady,
        chatMessages,
        isQueueWaiting,
        incomingChallenge,
        createRoom,
        joinRoom,
        leaveRoom,
        setReady,
        startGame,
        sendGameAction,
        sendChatMessage,
        requestRematch,
        joinMatchmaking,
        leaveMatchmaking,
        sendChallenge,
        acceptIncomingChallenge,
        declineIncomingChallenge,
        onGameAction,
        onGameOver,
        onRematchAccepted,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
