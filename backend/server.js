import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { SERVER_CONFIG } from './config/server.config.js';
import { setupSocketHandlers } from './websocket/socketHandler.js';
import { roomManager } from './rooms/room_manager.js';
import { getRecentMatches, saveGameRecord, getGameHistory } from './database/supabaseClient.js';

dotenv.config();

const app = express();
const PORT = SERVER_CONFIG.PORT;

// Configure CORS for Express
app.use(cors({
  origin: SERVER_CONFIG.CORS_ORIGIN,
  methods: ['GET', 'POST'],
}));
app.use(express.json());

const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: SERVER_CONFIG.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Setup Modular WebSocket Logic
setupSocketHandlers(io);

// -------------------------------------------------------------
// REST Endpoints
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    message: 'Chess Studio Pro Backend',
    status: 'running',
    activeRooms: roomManager.roomsByUuid.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    activeRooms: roomManager.roomsByUuid.size,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get('/api/matches', async (req, res) => {
  const matches = await getRecentMatches(10);
  res.json({ matches });
});

app.get('/api/games', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const games = await getGameHistory(limit, offset);
    res.json({ success: true, games });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ success: false, message: 'Server error fetching games' });
  }
});

app.post('/api/games', async (req, res) => {
  try {
    const gameData = req.body;
    if (!gameData.pgn) {
      return res.status(400).json({ success: false, message: 'PGN is required' });
    }
    
    const savedGame = await saveGameRecord(gameData);
    if (savedGame) {
      res.status(201).json({ success: true, game: savedGame });
    } else {
      res.status(500).json({ success: false, message: 'Database error saving game' });
    }
  } catch (error) {
    console.error('Error in POST /api/games:', error);
    res.status(500).json({ success: false, message: 'Server error saving game' });
  }
});

// -------------------------------------------------------------
// Start Server
// -------------------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================`);
  console.log(`🚀 Chess Studio Backend listening on port ${PORT} (0.0.0.0)`);
  console.log(`📡 WebSocket ready for live multiplayer`);
  console.log(`🛡️ 6-Digit Room security & Authoritative Move Validation active`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`=============================================`);
});
