import { Color, FENChar } from '../chess-logic/models';

export type ChessMove = {
  prevX: number;
  prevY: number;
  newX: number;
  newY: number;
  promotedPiece: FENChar | null;
};

export type StockfishResponse = {
  success: boolean;
  evaluation?: number | null;
  mate?: number | null;
  bestmove: string;
  continuation?: string;
};

export type ComputerConfiguration = {
  color: Color;
  level: number;
};

export const stockfishLevels: Readonly<Record<number, { depth: number; name: string }>> = {
  1: { depth: 1, name: 'Beginner (Depth 1)' },
  2: { depth: 4, name: 'Casual (Depth 4)' },
  3: { depth: 8, name: 'Intermediate (Depth 8)' },
  4: { depth: 12, name: 'Advanced (Depth 12)' },
  5: { depth: 15, name: 'Master (Depth 15)' },
};

class StockfishService {
  private readonly apiUrl = 'https://stockfish.online/api/s/v2.php';

  private convertColumnLetterToYCoord(letter: string): number {
    return letter.charCodeAt(0) - 'a'.charCodeAt(0);
  }

  private getPromotedPiece(char: string | undefined, computerColor: Color): FENChar | null {
    if (!char) return null;
    const lower = char.toLowerCase();
    if (lower === 'n') return computerColor === Color.White ? FENChar.WhiteKnight : FENChar.BlackKnight;
    if (lower === 'b') return computerColor === Color.White ? FENChar.WhiteBishop : FENChar.BlackBishop;
    if (lower === 'r') return computerColor === Color.White ? FENChar.WhiteRook : FENChar.BlackRook;
    return computerColor === Color.White ? FENChar.WhiteQueen : FENChar.BlackQueen;
  }

  public parseMoveString(move: string, computerColor: Color): ChessMove {
    const prevY = this.convertColumnLetterToYCoord(move[0]);
    const prevX = Number(move[1]) - 1;
    const newY = this.convertColumnLetterToYCoord(move[2]);
    const newX = Number(move[3]) - 1;
    const promotedPiece = this.getPromotedPiece(move[4], computerColor);
    return { prevX, prevY, newX, newY, promotedPiece };
  }

  public async getBestMove(fen: string, level: number, computerColor: Color): Promise<ChessMove | null> {
    const depth = stockfishLevels[level]?.depth || 8;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const url = `${this.apiUrl}?fen=${encodeURIComponent(fen)}&depth=${depth}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Stockfish API error: ${response.statusText}`);
      }

      const data: StockfishResponse = await response.json();
      if (!data.bestmove) {
        throw new Error('Stockfish returned no bestmove');
      }

      // bestmove string format: "bestmove e7e5 ponder d2d4" or "bestmove e7e8q"
      const parts = data.bestmove.split(' ');
      const moveStr = parts[1] || parts[0];

      if (!moveStr || moveStr === '(none)') {
        return null;
      }

      return this.parseMoveString(moveStr, computerColor);
    } catch (err) {
      console.warn('Stockfish online failed or timed out:', err);
      return null;
    }
  }
}

export const stockfishService = new StockfishService();
