export const SERVER_CONFIG = {
  PORT: process.env.PORT || 4000,
  ROOM_CODE_LENGTH: 6,
  ROOM_CODE_MAX_NUMBER: 1000000, // 000000 - 999999 (1,000,000 possibilities)

  // Room TTL Configuration
  ROOM_WAITING_TTL_MS: 60 * 1000,        // 60 seconds for unjoined/waiting rooms
  ROOM_ACTIVE_TTL_MS: 30 * 60 * 1000,    // 30 minutes for active/playing games
  ROOM_TTL_MS: 30 * 60 * 1000,           // Legacy fallback (active game TTL)
  ROOM_CLEANUP_INTERVAL_MS: 10 * 1000,   // Scan every 10 seconds for expired rooms

  // Rate Limiting for Room Join attempts (brute force protection)
  RATE_LIMIT: {
    MAX_FAILED_ATTEMPTS: 5,
    WINDOW_MS: 2 * 60 * 1000, // 2 minutes window
    LOCKOUT_MS: 5 * 60 * 1000, // 5 minutes lockout after threshold exceeded
  },

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

export default SERVER_CONFIG;
