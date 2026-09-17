import { io, Socket } from 'socket.io-client';
import { FENChar } from '../chess-logic/models';

export type OnlineMovePayload = {
  prevX: number;
  prevY: number;
  newX: number;
  newY: number;
  promotedPiece: FENChar | null;
};

class SocketService {
  private socket: Socket | null = null;
  private currentRoom: string | null = null;
  public serverUrl: string = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:4000';

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnectionAttempts: 5,
        timeout: 8000,
      });

      this.socket.on('connect', () => {
        console.log('📡 Connected to Chess Multiplayer Server:', this.socket?.id, 'at', this.serverUrl);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('⚠️ Socket connection error to', this.serverUrl, ':', err.message);
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

  public createRoom(): Promise<{ success: boolean; roomCode?: string; playerColor?: 'white' | 'black'; message?: string }> {
    const socket = this.connect();

    return new Promise((resolve) => {
      // 5-second timeout in case backend is unreachable
      const timer = setTimeout(() => {
        resolve({
          success: false,
          message: `Cannot connect to backend at ${this.serverUrl}. If deployed on Vercel, deploy your backend to Render and add VITE_BACKEND_URL.`,
        });
      }, 5000);

      socket.emit('create_room', (response: { success: boolean; roomCode: string; playerColor: 'white' | 'black' }) => {
        clearTimeout(timer);
        if (response && response.success) {
          this.currentRoom = response.roomCode;
          resolve(response);
        } else {
          resolve({ success: false, message: 'Server failed to create room' });
        }
      });
    });
  }

  public joinRoom(roomCode: string): Promise<{ success: boolean; roomCode?: string; playerColor?: 'white' | 'black'; message?: string }> {
    const socket = this.connect();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          message: `Connection to backend server timed out (${this.serverUrl}).`,
        });
      }, 5000);

      socket.emit('join_room', { roomCode }, (response: { success: boolean; roomCode?: string; playerColor?: 'white' | 'black'; message?: string }) => {
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

  public notifyGameOver(roomCode: string, winner: 'white' | 'black' | 'draw', reason: string, movesCount: number, finalFen: string) {
    if (!this.socket) return;
    this.socket.emit('game_over', { roomCode, winner, reason, movesCount, finalFen });
  }

  public leaveRoom() {
    this.currentRoom = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
