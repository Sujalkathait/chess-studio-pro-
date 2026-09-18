import { roomManager } from '../rooms/room_manager.js';
import { saveMatchRecord } from '../database/supabaseClient.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || socket.id;
    console.log(`🔌 Player connected: ${socket.id} (IP: ${clientIp})`);

    // -------------------------------------------------------------
    // 1. Create 6-Digit Room
    // -------------------------------------------------------------
    socket.on('create_room', (data, callback) => {
      // Support callback as either 1st or 2nd arg
      const cb = typeof data === 'function' ? data : callback;
      const pin = (typeof data === 'object' && data?.pin) ? data.pin : null;
      const playerName = (typeof data === 'object' && data?.playerName) ? data.playerName : 'White';

      try {
        const roomData = roomManager.createRoom(socket.id, pin, playerName);
        socket.join(roomData.publicCode);

        if (typeof cb === 'function') {
          cb({
            success: true,
            roomCode: roomData.publicCode,
            displayCode: roomData.displayCode,
            playerColor: roomData.playerColor,
            hasPin: roomData.hasPin,
            createdAt: roomData.createdAt,
            expiresAt: roomData.expiresAt,
          });
        }

        // Set a timeout to emit room_expired to the creator if the room expires while waiting
        setTimeout(() => {
          const room = roomManager.roomsByUuid.get(roomData.id) || roomManager.getRoomByCode(roomData.publicCode);
          if (room && roomManager.isRoomExpired(room) && room.status === 'waiting') {
            socket.emit('room_expired');
          }
        }, roomData.expiresAt - Date.now());
      } catch (err) {
        console.error('Error creating room:', err.message);
        if (typeof cb === 'function') {
          cb({ success: false, message: 'Server could not create room. Please try again.' });
        }
      }
    });

    // -------------------------------------------------------------
    // 2. Join 6-Digit Room with Rate Limiting & PIN validation
    // -------------------------------------------------------------
    socket.on('join_room', ({ roomCode, pin, playerName = 'Black' }, callback) => {
      const result = roomManager.joinRoom(clientIp, socket.id, roomCode, pin, playerName);

      if (!result.success) {
        if (typeof callback === 'function') {
          callback({
            success: false,
            message: result.error,
            errorCode: result.errorCode,
            isLockedOut: result.isLockedOut,
            requiresPin: result.requiresPin,
          });
        }
        return;
      }

      socket.join(result.publicCode);

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: result.publicCode,
          displayCode: result.displayCode,
          playerColor: 'black',
        });
      }

      // Notify room that both players are present and game is live
      const room = roomManager.getRoomByCode(result.publicCode);
      io.to(result.publicCode).emit('game_start', {
        roomCode: result.publicCode,
        displayCode: result.displayCode,
        whitePlayer: room.game.whitePlayer,
        whitePlayerName: room.game.whitePlayerName,
        blackPlayer: room.game.blackPlayer,
        blackPlayerName: room.game.blackPlayerName,
        fen: room.game.fen,
      });
    });

    // -------------------------------------------------------------
    // 3. Authoritative Move Execution
    // -------------------------------------------------------------
    socket.on('send_move', ({ roomCode, move }) => {
      const room = roomManager.getRoomByCode(roomCode);
      if (!room) return;

      const validation = room.game.applyMove(socket.id, move);

      if (!validation.valid) {
        // Move was illegal or out of turn: Reject and resynchronize client
        socket.emit('move_rejected', {
          error: validation.error,
          fen: room.game.fen,
        });
        return;
      }

      // Move is legal and applied on server:
      roomManager.touchRoom(room);

      // Broadcast authoritative move to opponent
      socket.to(room.publicCode).emit('opponent_move', {
        move: validation.move,
        fen: validation.newFen,
        inCheck: validation.inCheck,
      });

      // If move resulted in checkmate / draw
      if (validation.isGameOver) {
        io.to(room.publicCode).emit('game_over', {
          winner: validation.winner,
          reason: validation.reason,
          movesCount: validation.movesCount,
          finalFen: validation.newFen,
        });

        // Mark room as finished when game is over
        room.status = 'finished';

        // Persist match to database
        saveMatchRecord({
          roomCode: room.publicCode,
          winner: validation.winner,
          reason: validation.reason,
          movesCount: validation.movesCount,
          finalFen: validation.newFen,
        }).catch(() => {});
      }
    });

    // -------------------------------------------------------------
    // 4. Resignation
    // -------------------------------------------------------------
    socket.on('resign', ({ roomCode }) => {
      const room = roomManager.getRoomByCode(roomCode);
      if (!room) return;

      const res = room.game.resign(socket.id);
      if (res.success) {
        io.to(room.publicCode).emit('game_over', {
          winner: res.winner,
          reason: res.reason,
          movesCount: room.game.moves.length,
          finalFen: room.game.fen,
        });

        // Mark room as finished
        room.status = 'finished';

        saveMatchRecord({
          roomCode: room.publicCode,
          winner: res.winner,
          reason: res.reason,
          movesCount: room.game.moves.length,
          finalFen: room.game.fen,
        }).catch(() => {});
      }
    });

    // -------------------------------------------------------------
    // 5. Draw Offers
    // -------------------------------------------------------------
    socket.on('offer_draw', ({ roomCode }) => {
      const room = roomManager.getRoomByCode(roomCode);
      if (!room) return;

      const res = room.game.offerDraw(socket.id);
      if (res.success) {
        socket.to(room.publicCode).emit('draw_offered', {
          byColor: res.offeringColor,
        });
      }
    });

    socket.on('respond_draw', ({ roomCode, accept }) => {
      const room = roomManager.getRoomByCode(roomCode);
      if (!room) return;

      if (accept) {
        const res = room.game.acceptDraw(socket.id);
        if (res.success) {
          io.to(room.publicCode).emit('game_over', {
            winner: 'draw',
            reason: res.reason,
            movesCount: room.game.moves.length,
            finalFen: room.game.fen,
          });

          // Mark room as finished
          room.status = 'finished';

          saveMatchRecord({
            roomCode: room.publicCode,
            winner: 'draw',
            reason: res.reason,
            movesCount: room.game.moves.length,
            finalFen: room.game.fen,
          }).catch(() => {});
        }
      } else {
        room.game.declineDraw(socket.id);
        socket.to(room.publicCode).emit('draw_declined');
      }
    });

    // -------------------------------------------------------------
    // 6. Rematch Handlers
    // -------------------------------------------------------------
    socket.on('request_rematch', ({ roomCode }) => {
      const room = roomManager.getRoomByCode(roomCode);
      if (!room) return;
      socket.to(room.publicCode).emit('rematch_requested');
    });

    socket.on('accept_rematch', ({ roomCode }) => {
      const room = roomManager.getRoomByCode(roomCode);
      if (!room) return;

      room.game.resetForRematch();
      io.to(room.publicCode).emit('rematch_start', {
        whitePlayer: room.game.whitePlayer,
        whitePlayerName: room.game.whitePlayerName,
        blackPlayer: room.game.blackPlayer,
        blackPlayerName: room.game.blackPlayerName,
        fen: room.game.fen,
      });
    });

    // -------------------------------------------------------------
    // 7. Disconnect & Leave Handlers
    // -------------------------------------------------------------
    socket.on('leave_room', ({ roomCode }) => {
      const room = roomManager.getRoomByCode(roomCode);
      if (room) {
        socket.to(room.publicCode).emit('opponent_left', {
          message: 'Your opponent left the game.',
        });
        roomManager.deleteRoom(room);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Player disconnected: ${socket.id}`);
      const room = roomManager.getRoomBySocket(socket.id);
      if (room) {
        socket.to(room.publicCode).emit('opponent_disconnected', {
          message: 'Your opponent disconnected.',
        });
        
        // If room is still waiting, delete immediately (no grace period needed)
        if (room.status === 'waiting' && !room.game.blackPlayer) {
          roomManager.deleteRoom(room);
          return;
        }

        // Grace period before removing active abandoned room
        setTimeout(() => {
          const check = roomManager.roomsByUuid.get(room.id);
          if (check && (check.status === 'waiting' || check.status === 'active')) {
            roomManager.deleteRoom(check);
          }
        }, 60000);
      }
    });
  });
}

export default setupSocketHandlers;
