import { v4 as uuidv4 } from 'uuid';
import { validateAndApplyMove } from './validator.js';

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class GameSession {
  constructor(roomId, whitePlayerId, whitePlayerName = 'White', blackPlayerId = null, blackPlayerName = 'Black') {
    this.id = uuidv4();
    this.roomId = roomId;
    this.whitePlayer = whitePlayerId;
    this.whitePlayerName = whitePlayerName;
    this.blackPlayer = blackPlayerId;
    this.blackPlayerName = blackPlayerName;
    this.fen = STARTING_FEN;
    this.pgn = '';
    this.moves = [];
    this.status = 'waiting'; // 'waiting' | 'playing' | 'finished'
    this.result = null; // 'white' | 'black' | 'draw'
    this.endReason = null;
    this.drawOffer = null; // 'white' | 'black' | null
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  getPlayerColor(socketId) {
    if (this.whitePlayer === socketId) return 'white';
    if (this.blackPlayer === socketId) return 'black';
    return null;
  }

  isParticipant(socketId) {
    return this.whitePlayer === socketId || this.blackPlayer === socketId;
  }

  start() {
    this.status = 'playing';
    this.updatedAt = new Date();
  }

  applyMove(socketId, moveInput) {
    if (this.status !== 'playing') {
      return { valid: false, error: 'Game is not currently active.' };
    }

    const playerColor = this.getPlayerColor(socketId);
    if (!playerColor) {
      return { valid: false, error: 'You are not a participant in this game.' };
    }

    // Authoritative move validation
    const validation = validateAndApplyMove(this.fen, moveInput, playerColor);
    if (!validation.valid) {
      return validation;
    }

    // Clear any pending draw offers once a move is made
    this.drawOffer = null;

    // Update game state
    this.fen = validation.newFen;
    this.pgn = validation.pgn;
    this.moves.push({
      ...validation.move,
      playedBy: playerColor,
      timestamp: new Date().toISOString(),
    });
    this.updatedAt = new Date();

    if (validation.isGameOver) {
      this.status = 'finished';
      this.result = validation.winner;
      this.endReason = validation.reason;
    }

    return {
      valid: true,
      playerColor,
      ...validation,
      movesCount: this.moves.length,
    };
  }

  resign(socketId) {
    if (this.status !== 'playing') {
      return { success: false, error: 'Game is not active.' };
    }

    const resigningColor = this.getPlayerColor(socketId);
    if (!resigningColor) {
      return { success: false, error: 'Not a player in this game.' };
    }

    const winner = resigningColor === 'white' ? 'black' : 'white';
    this.status = 'finished';
    this.result = winner;
    this.endReason = `${resigningColor.toUpperCase()} resigned. ${winner.toUpperCase()} wins!`;
    this.updatedAt = new Date();

    return {
      success: true,
      winner,
      reason: this.endReason,
    };
  }

  offerDraw(socketId) {
    if (this.status !== 'playing') {
      return { success: false, error: 'Game is not active.' };
    }
    const offeringColor = this.getPlayerColor(socketId);
    if (!offeringColor) {
      return { success: false, error: 'Not a player in this game.' };
    }

    this.drawOffer = offeringColor;
    return { success: true, offeringColor };
  }

  acceptDraw(socketId) {
    if (this.status !== 'playing' || !this.drawOffer) {
      return { success: false, error: 'No active draw offer to accept.' };
    }
    const acceptingColor = this.getPlayerColor(socketId);
    if (!acceptingColor || acceptingColor === this.drawOffer) {
      return { success: false, error: 'Cannot accept your own draw offer.' };
    }

    this.status = 'finished';
    this.result = 'draw';
    this.endReason = 'Draw agreed by mutual agreement.';
    this.drawOffer = null;
    this.updatedAt = new Date();

    return {
      success: true,
      winner: 'draw',
      reason: this.endReason,
    };
  }

  declineDraw(socketId) {
    const decliningColor = this.getPlayerColor(socketId);
    if (!decliningColor || !this.drawOffer || decliningColor === this.drawOffer) {
      return { success: false };
    }
    this.drawOffer = null;
    return { success: true };
  }

  resetForRematch() {
    // Swap colors and names for rematch
    const prevWhite = this.whitePlayer;
    this.whitePlayer = this.blackPlayer;
    this.blackPlayer = prevWhite;
    
    const prevWhiteName = this.whitePlayerName;
    this.whitePlayerName = this.blackPlayerName;
    this.blackPlayerName = prevWhiteName;

    this.fen = STARTING_FEN;
    this.pgn = '';
    this.moves = [];
    this.status = 'playing';
    this.result = null;
    this.endReason = null;
    this.drawOffer = null;
    this.updatedAt = new Date();
  }
}

export default GameSession;
