import { v4 as uuidv4 } from 'uuid';
import { GameSession } from '../chess/game.js';
import { SERVER_CONFIG } from '../config/server.config.js';

export class RoomManager {
  constructor() {
    // Map internal UUID -> Room Object
    this.roomsByUuid = new Map();
    // Map 6-digit public code -> Room Object
    this.roomsByCode = new Map();

    // Brute force / Enumeration Rate Limiting
    // clientKey -> { failedCount, firstAttempt, lockoutUntil }
    this.rateLimits = new Map();

    // Periodic cleanup of expired rooms
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredRooms();
    }, SERVER_CONFIG.ROOM_CLEANUP_INTERVAL_MS);
  }

  /**
   * Format a 6-digit string as "004 721" for display readability
   */
  static formatDisplayCode(code) {
    if (!code || code.length !== 6) return code;
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }

  /**
   * Sanitize room code input (removes spaces, enforces 6 digits)
   */
  static normalizeCode(code) {
    if (!code) return '';
    return String(code).replace(/\s+/g, '').trim();
  }

  /**
   * Generate a random 6-digit room code (000000 - 999999)
   * Always preserves leading zeros
   */
  generateUniquePublicCode() {
    const maxAttempts = 50;
    for (let i = 0; i < maxAttempts; i++) {
      const randomNum = Math.floor(Math.random() * SERVER_CONFIG.ROOM_CODE_MAX_NUMBER);
      const code = String(randomNum).padStart(SERVER_CONFIG.ROOM_CODE_LENGTH, '0');

      // Server-side active-room collision prevention
      if (!this.roomsByCode.has(code)) {
        return code;
      }
    }
    throw new Error('Unable to generate unique room code. System at high capacity.');
  }

  /**
   * Rate limiter check: Protects against room-code enumeration & brute-force
   */
  checkRateLimit(clientKey) {
    const now = Date.now();
    const entry = this.rateLimits.get(clientKey);

    if (!entry) return { allowed: true };

    // Check if client is locked out
    if (entry.lockoutUntil && now < entry.lockoutUntil) {
      const remainingSec = Math.ceil((entry.lockoutUntil - now) / 1000);
      return {
        allowed: false,
        error: `Too many failed room attempts. Locked out for ${remainingSec}s.`,
        remainingSec,
      };
    }

    // Reset window if expired
    if (now - entry.firstAttempt > SERVER_CONFIG.RATE_LIMIT.WINDOW_MS) {
      this.rateLimits.delete(clientKey);
      return { allowed: true };
    }

    return { allowed: true };
  }

  recordFailedAttempt(clientKey) {
    const now = Date.now();
    let entry = this.rateLimits.get(clientKey);

    if (!entry || now - entry.firstAttempt > SERVER_CONFIG.RATE_LIMIT.WINDOW_MS) {
      entry = { failedCount: 1, firstAttempt: now, lockoutUntil: 0 };
    } else {
      entry.failedCount += 1;
    }

    if (entry.failedCount >= SERVER_CONFIG.RATE_LIMIT.MAX_FAILED_ATTEMPTS) {
      entry.lockoutUntil = now + SERVER_CONFIG.RATE_LIMIT.LOCKOUT_MS;
      console.warn(`🚨 Rate limit lockout triggered for client ${clientKey}. Locked for 5 mins.`);
    }

    this.rateLimits.set(clientKey, entry);
  }

  clearRateLimit(clientKey) {
    this.rateLimits.delete(clientKey);
  }

  /**
   * Create a new room with internal UUID and public 6-digit code
   */
  createRoom(creatorSocketId, pin = null) {
    const internalId = uuidv4();
    const publicCode = this.generateUniquePublicCode();
    const now = Date.now();

    const game = new GameSession(internalId, creatorSocketId);

    const room = {
      id: internalId, // Internal UUID (never exposed as room lookup)
      publicCode, // 6-digit public code
      pin: pin ? String(pin).trim() : null, // Optional 4-6 digit PIN
      game,
      status: 'waiting', // 'waiting' | 'active' | 'finished' | 'expired'
      createdAt: now,
      expiresAt: now + SERVER_CONFIG.ROOM_TTL_MS,
      lastActivity: now,
    };

    this.roomsByUuid.set(internalId, room);
    this.roomsByCode.set(publicCode, room);

    console.log(`🏠 Created room [Public: ${publicCode} | UUID: ${internalId.slice(0, 8)}...]`);

    return {
      publicCode,
      displayCode: RoomManager.formatDisplayCode(publicCode),
      playerColor: 'white',
      hasPin: Boolean(room.pin),
    };
  }

  /**
   * Join an existing room via 6-digit code and optional PIN
   */
  joinRoom(clientKey, joinerSocketId, rawCode, enteredPin = null) {
    // 1. Check rate limits
    const rateCheck = this.checkRateLimit(clientKey);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.error, isLockedOut: true };
    }

    // 2. Normalize 6-digit code
    const code = RoomManager.normalizeCode(rawCode);
    if (!code || code.length !== SERVER_CONFIG.ROOM_CODE_LENGTH) {
      this.recordFailedAttempt(clientKey);
      return { success: false, error: 'Please enter a valid 6-digit room code.' };
    }

    // 3. Server-side lookup
    const room = this.roomsByCode.get(code);
    if (!room || room.status === 'expired') {
      this.recordFailedAttempt(clientKey);
      return { success: false, error: 'Room not found or expired. Please check the code.' };
    }

    // 4. Check if already full
    if (room.game.blackPlayer && room.game.blackPlayer !== joinerSocketId) {
      return { success: false, error: 'Room is already full.' };
    }

    // 5. Check optional PIN
    if (room.pin) {
      if (!enteredPin || String(enteredPin).trim() !== room.pin) {
        this.recordFailedAttempt(clientKey);
        return { success: false, error: 'Incorrect room PIN.', requiresPin: true };
      }
    }

    // Successful attempt -> clear rate limit
    this.clearRateLimit(clientKey);

    // Assign second player as Black
    room.game.blackPlayer = joinerSocketId;
    room.game.start();
    room.status = 'active';
    room.lastActivity = Date.now();
    room.expiresAt = Date.now() + SERVER_CONFIG.ROOM_TTL_MS;

    console.log(`⚔️ Player ${joinerSocketId} joined room ${code} as Black`);

    return {
      success: true,
      publicCode: room.publicCode,
      displayCode: RoomManager.formatDisplayCode(room.publicCode),
      playerColor: 'black',
      whitePlayerId: room.game.whitePlayer,
      blackPlayerId: room.game.blackPlayer,
    };
  }

  /**
   * Find room by public 6-digit code
   */
  getRoomByCode(rawCode) {
    const code = RoomManager.normalizeCode(rawCode);
    return this.roomsByCode.get(code) || null;
  }

  /**
   * Find room where socket is an active participant
   */
  getRoomBySocket(socketId) {
    for (const room of this.roomsByUuid.values()) {
      if (room.game.isParticipant(socketId)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Update room activity timestamp and extend expiration
   */
  touchRoom(room) {
    if (!room) return;
    room.lastActivity = Date.now();
    room.expiresAt = Date.now() + SERVER_CONFIG.ROOM_TTL_MS;
  }

  /**
   * Close and delete a room
   */
  deleteRoom(room) {
    if (!room) return;
    this.roomsByUuid.delete(room.id);
    this.roomsByCode.delete(room.publicCode);
    console.log(`🧹 Cleaned up room ${room.publicCode}`);
  }

  /**
   * Remove inactive/expired rooms
   */
  cleanupExpiredRooms() {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, room] of this.roomsByUuid.entries()) {
      if (now > room.expiresAt) {
        this.deleteRoom(room);
        cleaned += 1;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Expired rooms sweep: Removed ${cleaned} inactive room(s).`);
    }
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

export const roomManager = new RoomManager();
export default roomManager;
