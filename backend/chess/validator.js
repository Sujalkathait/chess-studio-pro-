import { Chess } from 'chess.js';

/**
 * Helper to convert 0-7 matrix coordinates to algebraic notation ('e2')
 * prevX: rank 0-7 -> 1-8
 * prevY: file 0-7 -> a-h
 */
export function coordsToAlgebraic(x, y) {
  const file = String.fromCharCode(97 + y);
  const rank = x + 1;
  return `${file}${rank}`;
}

/**
 * Helper to convert algebraic notation ('e4') to 0-7 matrix coordinates
 */
export function algebraicToCoords(square) {
  if (!square || square.length < 2) return null;
  const y = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const x = Number(square[1]) - 1;
  return { x, y };
}

/**
 * Normalize move input from either algebraic format ({ from, to, promotion })
 * or matrix format ({ prevX, prevY, newX, newY, promotedPiece })
 */
export function normalizeMoveInput(move) {
  if (move.from && move.to) {
    return {
      from: move.from.toLowerCase(),
      to: move.to.toLowerCase(),
      promotion: move.promotion ? move.promotion.toLowerCase() : undefined,
    };
  }

  if (
    typeof move.prevX === 'number' &&
    typeof move.prevY === 'number' &&
    typeof move.newX === 'number' &&
    typeof move.newY === 'number'
  ) {
    const from = coordsToAlgebraic(move.prevX, move.prevY);
    const to = coordsToAlgebraic(move.newX, move.newY);
    let promotion;
    if (move.promotedPiece) {
      // FENChar e.g. 'q', 'r', 'b', 'n', 'Q', 'R', etc.
      promotion = String(move.promotedPiece).toLowerCase();
    }
    return { from, to, promotion };
  }

  return null;
}

/**
 * Authoritatively validates and applies a move against a game position
 */
export function validateAndApplyMove(currentFen, moveInput, expectedColor) {
  const normalized = normalizeMoveInput(moveInput);
  if (!normalized) {
    return { valid: false, error: 'Invalid move payload structure' };
  }

  let chess;
  try {
    chess = new Chess(currentFen || undefined);
  } catch (err) {
    return { valid: false, error: `Invalid board FEN: ${err.message}` };
  }

  // 1. Validate Turn Order
  const activeColor = chess.turn() === 'w' ? 'white' : 'black';
  if (expectedColor && activeColor !== expectedColor) {
    return {
      valid: false,
      error: `Not your turn. It is currently ${activeColor}'s turn.`,
      activeColor,
    };
  }

  // 2. Validate Move Legality
  let moveResult;
  try {
    moveResult = chess.move({
      from: normalized.from,
      to: normalized.to,
      promotion: normalized.promotion,
    });
  } catch (err) {
    return {
      valid: false,
      error: `Illegal move: ${normalized.from} to ${normalized.to}`,
      details: err.message,
    };
  }

  if (!moveResult) {
    return {
      valid: false,
      error: `Illegal move: ${normalized.from} to ${normalized.to}`,
    };
  }

  // 3. Determine Game-Over States
  const inCheck = chess.inCheck();
  const isCheckmate = chess.isCheckmate();
  const isStalemate = chess.isStalemate();
  const isThreefold = chess.isThreefoldRepetition();
  const isInsufficient = chess.isInsufficientMaterial();
  const isDraw = chess.isDraw();
  const isGameOver = chess.isGameOver();

  let winner = null;
  let reason = null;

  if (isCheckmate) {
    winner = expectedColor; // Player who just made the checkmating move wins
    reason = `Checkmate! ${winner.toUpperCase()} wins.`;
  } else if (isStalemate) {
    winner = 'draw';
    reason = 'Stalemate! Game ended in a draw.';
  } else if (isThreefold) {
    winner = 'draw';
    reason = 'Draw by threefold repetition.';
  } else if (isInsufficient) {
    winner = 'draw';
    reason = 'Draw by insufficient material.';
  } else if (isDraw) {
    winner = 'draw';
    reason = 'Draw by 50-move rule.';
  }

  return {
    valid: true,
    move: moveResult,
    newFen: chess.fen(),
    pgn: chess.pgn(),
    inCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    isGameOver,
    winner,
    reason,
    nextTurn: chess.turn() === 'w' ? 'white' : 'black',
  };
}

export default {
  coordsToAlgebraic,
  algebraicToCoords,
  normalizeMoveInput,
  validateAndApplyMove,
};
