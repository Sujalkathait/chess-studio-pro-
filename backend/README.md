# Chess Studio Pro - Backend Service

High-performance, authoritative multiplayer Node.js & Socket.io server with PostgreSQL (Supabase) integration and Stockfish-compatible room management.

---

## Architecture & Modules

```
backend/
├── chess/
│   ├── game.js            # In-memory match representation & move tracking
│   └── validator.js       # Authoritative chess.js rules, turns, checkmate & FEN validation
├── config/
│   └── server.config.js   # Port, CORS, TTL, and rate limiting thresholds
├── database/
│   ├── schema.sql         # PostgreSQL / Supabase table definitions (rooms, games, matches)
│   └── supabaseClient.js  # Supabase client, queries, and match/game persistence
├── rooms/
│   └── room_manager.js    # 6-digit collision-free room codes, UUID isolation, rate limiter
├── tests/
│   └── backend.test.js    # Unit test suite covering codes, security, and chess rules
├── websocket/
│   └── socketHandler.js   # Socket.io event listeners (moves, rooms, draws, rematches)
├── .env.example           # Environment variable template
├── package.json           # Dependencies and scripts
└── server.js              # Express REST API & HTTP server entry point
```

---

## Features

- **6-Digit Room Matchmaking**: Secure, human-friendly 6-digit codes (`000 000` to `999 999`) with internal UUID mapping.
- **PIN Protection**: Optional private room PIN support.
- **Brute-Force Protection**: IP-based rate limiting with automatic lockout after consecutive invalid join attempts.
- **Authoritative Move Validation**: Server-side `chess.js` validation preventing illegal moves, spoofing, and turn hijacking.
- **Automated Room Cleanup**: Active and waiting room TTL expiry sweep.
- **Supabase Cloud Database**: Stores completed games, PGN records, player stats, and historical match outcomes with graceful in-memory fallback.

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```ini
PORT=4000
CORS_ORIGIN=*
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
```

If Supabase variables are omitted, the server automatically defaults to in-memory mode without crashing.

---

## Commands

```bash
# Install dependencies
npm install

# Start production server
npm start

# Start development server with auto-reload
npm run dev

# Run unit test suite
npm test
```

---

## REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service status, timestamp, and active room count |
| `GET` | `/health` | Healthcheck endpoint with uptime and stats |
| `GET` | `/api/games` | Fetch paginated game history records (`?limit=50&offset=0`) |
| `POST` | `/api/games` | Save a completed game record (PGN, mode, players) |
| `GET` | `/api/matches` | Fetch recent competitive matches |

---

## WebSocket Protocol

Namespace: `/` (Socket.io)

### Client to Server Events:
- `create_room`: `{ playerName: string, pin?: string }`
- `join_room`: `{ roomCode: string, playerName: string, pin?: string }`
- `send_move`: `{ roomCode: string, move: MovePayload, fen?: string }`
- `resign`: `{ roomCode: string }`
- `offer_draw`: `{ roomCode: string }`
- `respond_draw`: `{ roomCode: string, accept: boolean }`
- `request_rematch`: `{ roomCode: string }`
- `accept_rematch`: `{ roomCode: string }`
- `leave_room`: `{ roomCode: string }`

### Server to Client Broadcasts:
- `room_created`: `{ roomCode, displayCode, playerColor }`
- `player_joined`: `{ roomCode, opponentName, opponentColor, fen }`
- `receive_move`: `{ move, fen, isCheck, isCheckmate, isDraw, winner }`
- `game_over`: `{ winner, reason }`
- `draw_offered`: Draw request notification
- `rematch_requested`: Rematch request notification
- `rematch_started`: New board state for rematch
- `player_disconnected`: Opponent disconnected event
