import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { saveMatchRecord, getRecentMatches } from './supabaseClient.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configure CORS for Express
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

const server = http.createServer(app);

// Configure Socket.io with permissive CORS for Vercel and local dev
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Active game rooms map
// Key: roomCode -> Value: { code, players: { white, black }, moves: [], fen: string, status }
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// -------------------------------------------------------------
// REST Endpoints
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    message: 'Chess Studio Multiplayer Server',
    status: 'running',
    activeRooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', activeRooms: rooms.size });
});

app.get('/api/matches', async (req, res) => {
  const matches = await getRecentMatches(10);
  res.json({ matches });
});

// -------------------------------------------------------------
// Socket.io Real-Time Game Logic
// -------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);

  // Create a new room
  socket.on('create_room', (callback) => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const room = {
      code: roomCode,
      players: {
        white: socket.id,
        black: null,
      },
      moves: [],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      status: 'waiting',
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);

    console.log(`🏠 Room created: ${roomCode} by ${socket.id} (White)`);

    if (typeof callback === 'function') {
      callback({
        success: true,
        roomCode,
        playerColor: 'white',
      });
    }
  });

  // Join an existing room
  socket.on('join_room', ({ roomCode }, callback) => {
    const code = roomCode?.trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      if (typeof callback === 'function') {
        callback({ success: false, message: 'Room not found. Please check the code.' });
      }
      return;
    }

    if (room.players.black !== null) {
      if (typeof callback === 'function') {
        callback({ success: false, message: 'Room is already full.' });
      }
      return;
    }

    // Assign second player as Black
    room.players.black = socket.id;
    room.status = 'playing';
    socket.join(code);

    console.log(`⚔️ Player ${socket.id} joined room ${code} as Black`);

    if (typeof callback === 'function') {
      callback({
        success: true,
        roomCode: code,
        playerColor: 'black',
      });
    }

    // Notify both players that game is starting!
    io.to(code).emit('game_start', {
      roomCode: code,
      whitePlayer: room.players.white,
      blackPlayer: room.players.black,
    });
  });

  // Relay a chess move to opponent
  socket.on('send_move', ({ roomCode, move, fen }) => {
    const code = roomCode?.trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) return;

    room.moves.push(move);
    if (fen) room.fen = fen;

    // Broadcast the move to the other player in the room
    socket.to(code).emit('opponent_move', {
      move,
      fen,
    });
  });

  // Game over event (Checkmate, Stalemate, Resignation)
  socket.on('game_over', async ({ roomCode, winner, reason, movesCount, finalFen }) => {
    const code = roomCode?.trim().toUpperCase();
    const room = rooms.get(code);

    if (room) {
      room.status = 'finished';
      // Broadcast to room
      io.to(code).emit('game_over', { winner, reason });

      // Save match to Supabase PostgreSQL database
      await saveMatchRecord({
        roomCode: code,
        winner,
        reason,
        movesCount: movesCount || room.moves.length,
        finalFen: finalFen || room.fen,
      });
    }
  });

  // Rematch request
  socket.on('request_rematch', ({ roomCode }) => {
    const code = roomCode?.trim().toUpperCase();
    socket.to(code).emit('rematch_requested');
  });

  socket.on('accept_rematch', ({ roomCode }) => {
    const code = roomCode?.trim().toUpperCase();
    const room = rooms.get(code);
    if (room) {
      // Swap colors for rematch
      const prevWhite = room.players.white;
      room.players.white = room.players.black;
      room.players.black = prevWhite;
      room.moves = [];
      room.status = 'playing';

      io.to(code).emit('rematch_start', {
        whitePlayer: room.players.white,
        blackPlayer: room.players.black,
      });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);

    // Check all rooms this socket was in
    for (const [code, room] of rooms.entries()) {
      if (room.players.white === socket.id || room.players.black === socket.id) {
        // Notify opponent
        socket.to(code).emit('opponent_disconnected', {
          message: 'Your opponent disconnected.',
        });

        // Clean up room after a brief delay if abandoned
        setTimeout(() => {
          rooms.delete(code);
        }, 60000);
      }
    }
  });
});

// -------------------------------------------------------------
// Start Server
// -------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 Chess Studio Backend listening on port ${PORT}`);
  console.log(`📡 WebSocket ready for live multiplayer`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`=============================================`);
});
