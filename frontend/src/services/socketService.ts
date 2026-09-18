import { io, Socket } from 'socket.io-client';
import { FENChar } from '../chess-logic/models';

export type OnlineMovePayload = {
  prevX: number;
  prevY: number;
  newX: number;
  newY: number;
  promotedPiece: FENChar | null;
  from?: string;
  to?: string;
  promotion?: string;
};

export interface CreateRoomResponse {
  success: boolean;
  roomCode?: string;
  displayCode?: string;
  playerColor?: 'white' | 'black';
  hasPin?: boolean;
  message?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  roomCode?: string;
  displayCode?: string;
  playerColor?: 'white' | 'black';
  message?: string;
  isLockedOut?: boolean;
  requiresPin?: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private currentRoom: string | null = null;

  public serverUrl: string = (
    (import.meta as any).env?.VITE_BACKEND_URL ||
    (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:4000'
      : 'https://chess-studio-pro-1.onrender.com')
  )
    .trim()
    .replace(/\/+$/, '');

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnectionAttempts: 5,
        timeout: 25000,
      });

      this.socket.on('connect', () => {
        console.log('📡 Connected to Chess Multiplayer Server:', this.socket?.id);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('⚠️ Socket connection error:', err.message);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from server. Reason:', reason);
      });
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  public getSocket(): Socket {
    return this.connect();
  }

  public createRoom(playerName: string, pin?: string): Promise<CreateRoomResponse> {
    const socket = this.connect();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          message: `Connection timed out (${this.serverUrl}). If the backend was asleep, please try again.`,
        });
      }, 20000);

      socket.emit('create_room', { pin, playerName }, (response: CreateRoomResponse) => {
        clearTimeout(timer);
        if (response && response.success) {
          this.currentRoom = response.roomCode || null;
          resolve(response);
        } else {
          resolve({ success: false, message: response?.message || 'Server failed to create room' });
        }
      });
    });
  }

  public joinRoom(roomCode: string, playerName: string, pin?: string): Promise<JoinRoomResponse> {
    const socket = this.connect();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          message: `Connection to backend server timed out (${this.serverUrl}).`,
        });
      }, 10000);

      socket.emit('join_room', { roomCode, pin, playerName }, (response: JoinRoomResponse) => {
        clearTimeout(timer);
        if (response && response.success && response.roomCode) {
          this.currentRoom = response.roomCode;
        }
        resolve(response);
      });
    });
  }

  public sendMove(roomCode: string, move: OnlineMovePayload, fen?: string) {
    if (!this.socket) return;
    this.socket.emit('send_move', { roomCode, move, fen });
  }

  public resign(roomCode: string) {
    if (!this.socket) return;
    this.socket.emit('resign', { roomCode });
  }

  public offerDraw(roomCode: string) {
    if (!this.socket) return;
    this.socket.emit('offer_draw', { roomCode });
  }

  public respondDraw(roomCode: string, accept: boolean) {
    if (!this.socket) return;
    this.socket.emit('respond_draw', { roomCode, accept });
  }

  public requestRematch(roomCode: string) {
    if (!this.socket) return;
    this.socket.emit('request_rematch', { roomCode });
  }

  public acceptRematch(roomCode: string) {
    if (!this.socket) return;
    this.socket.emit('accept_rematch', { roomCode });
  }

  public leaveRoom(roomCode?: string) {
    const targetRoom = roomCode || this.currentRoom;
    if (this.socket && targetRoom) {
      this.socket.emit('leave_room', { roomCode: targetRoom });
    }
    this.currentRoom = null;
  }
}

export const socketService = new SocketService();
export default socketService;
