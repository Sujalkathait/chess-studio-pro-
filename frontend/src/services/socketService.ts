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
  private serverUrl: string = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:4000';

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('📡 Connected to Chess Multiplayer Server:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
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

  public createRoom(): Promise<{ success: boolean; roomCode: string; playerColor: 'white' | 'black' }> {
    const socket = this.connect();
    return new Promise((resolve) => {
      socket.emit('create_room', (response: { success: boolean; roomCode: string; playerColor: 'white' | 'black' }) => {
        if (response.success) {
          this.currentRoom = response.roomCode;
        }
        resolve(response);
      });
    });
  }

  public joinRoom(roomCode: string): Promise<{ success: boolean; roomCode?: string; playerColor?: 'white' | 'black'; message?: string }> {
    const socket = this.connect();
    return new Promise((resolve) => {
      socket.emit('join_room', { roomCode }, (response: { success: boolean; roomCode?: string; playerColor?: 'white' | 'black'; message?: string }) => {
        if (response.success && response.roomCode) {
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
