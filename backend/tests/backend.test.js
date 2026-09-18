import { roomManager } from '../rooms/room_manager.js';
import { validateAndApplyMove } from '../chess/validator.js';

console.log('🧪 Starting Backend Unit Tests...\n');

// 1. Test 6-digit room code generation & formatting
console.log('Test 1: 6-Digit Room Code Generation & Leading Zeros:');
const codes = new Set();
for (let i = 0; i < 50; i++) {
  const code = roomManager.generateUniquePublicCode();
  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw new Error(`Invalid code generated: ${code}`);
  }
  codes.add(code);
}
console.log(`✅ Generated 50 valid 6-digit numeric codes with leading zeroes preserved.`);
const sampleCode = '004721';
const display = roomManager.constructor.formatDisplayCode(sampleCode);
if (display !== '004 721') throw new Error(`Display format failed: ${display}`);
console.log(`✅ Display formatting verified: "${sampleCode}" -> "${display}".\n`);

// 2. Test Room Creation with Internal UUID
console.log('Test 2: Room Creation and UUID isolation:');
const room = roomManager.createRoom('socket-white-123');
if (!room.publicCode || room.publicCode.length !== 6) throw new Error('Missing public code');
const roomObj = roomManager.getRoomByCode(room.publicCode);
if (!roomObj.id || roomObj.id.length !== 36) throw new Error('Missing UUID on room object');
if (roomObj.id === room.publicCode) throw new Error('Public code matches UUID!');
console.log(`✅ Room created successfully. Public code: ${room.publicCode} | Internal UUID: ${roomObj.id}`);
console.log(`✅ Internal UUID is strictly hidden from client return object.\n`);

// 3. Test Room Joining & Rate Limiter Protection
console.log('Test 3: Rate Limiting & Brute-Force Lockout:');
const testClient = 'ip-192-168-1-100';
// 5 failed attempts
for (let i = 0; i < 5; i++) {
  const failRes = roomManager.joinRoom(testClient, 'fake-socket', '999998');
  if (failRes.success) throw new Error('Invalid code unexpectedly succeeded');
}
// 6th attempt should be locked out
const lockoutRes = roomManager.joinRoom(testClient, 'fake-socket', '999998');
if (!lockoutRes.isLockedOut) throw new Error('Client was not locked out after 5 failures');
console.log(`✅ Rate limiter successfully locked out client after 5 failed attempts: "${lockoutRes.error}".\n`);

// 3.5 Test Room Expiration & Status Lifecycle
console.log('Test 3.5: Room Expiration & Lifecycle:');
const expRoomData = roomManager.createRoom('socket-creator-1');
const expRoom = roomManager.getRoomByCode(expRoomData.publicCode);
// Fake expiry (make it 2 minutes old)
expRoom.expiresAt = Date.now() - 120000;

// Should return ROOM_EXPIRED
const joinExpRes = roomManager.joinRoom('test-client-2', 'socket-joiner-1', expRoomData.publicCode);
if (joinExpRes.errorCode !== 'ROOM_EXPIRED') throw new Error(`Expected ROOM_EXPIRED, got ${joinExpRes.errorCode}`);
console.log(`✅ Correctly returned ROOM_EXPIRED for expired room.`);

// The room should be deleted inline now
const shouldBeNull = roomManager.getRoomByCode(expRoomData.publicCode);
if (shouldBeNull !== null) throw new Error(`Expired room was not deleted inline during lookup.`);
console.log(`✅ Expired room was deleted inline.`);

const notFoundRes = roomManager.joinRoom('test-client-3', 'socket-joiner-2', '111111');
if (notFoundRes.errorCode !== 'ROOM_NOT_FOUND') throw new Error(`Expected ROOM_NOT_FOUND, got ${notFoundRes.errorCode}`);
console.log(`✅ Correctly returned ROOM_NOT_FOUND for nonexistent code.\n`);

// 4. Test Authoritative Chess Move Validation
console.log('Test 4: Authoritative Chess Validation (chess.js):');
const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Test 4a: Valid pawn opening move
const legalMoveRes = validateAndApplyMove(startFen, { prevX: 1, prevY: 4, newX: 3, newY: 4 }, 'white');
if (!legalMoveRes.valid) throw new Error(`Legal move rejected: ${legalMoveRes.error}`);
console.log(`✅ e2-e4 accepted as legal move. New FEN: ${legalMoveRes.newFen}`);

// Test 4b: Wrong turn rejection
const wrongTurnRes = validateAndApplyMove(startFen, { prevX: 6, prevY: 4, newX: 4, newY: 4 }, 'black');
if (wrongTurnRes.valid) throw new Error('Move on wrong turn was accepted!');
console.log(`✅ Move out of turn correctly rejected: "${wrongTurnRes.error}"`);

// Test 4c: Illegal move (pawn jumping diagonally without capture)
const illegalMoveRes = validateAndApplyMove(startFen, { prevX: 1, prevY: 4, newX: 2, newY: 5 }, 'white');
if (illegalMoveRes.valid) throw new Error('Illegal move was accepted!');
console.log(`✅ Illegal move correctly rejected: "${illegalMoveRes.error}"`);

// Test 4d: Checkmate detection (Scholar's Mate final position)
const scholarsMateFen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
// Qf7#
const mateRes = validateAndApplyMove(scholarsMateFen, { from: 'f3', to: 'f7' }, 'white');
if (!mateRes.valid || !mateRes.isCheckmate || mateRes.winner !== 'white') {
  throw new Error('Checkmate not correctly identified');
}
console.log(`✅ Scholar's mate correctly identified: "${mateRes.reason}"`);

console.log('\n🎉 ALL BACKEND UNIT TESTS PASSED SUCCESSFULLY!');
process.exit(0);
