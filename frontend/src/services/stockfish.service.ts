import { Color, FENChar } from '../chess-logic/models';
import {
  DIFFICULTY_LEVEL_MAP,
  ENGINE_SAFETY_MARGIN_MS,
  DifficultyConfig,
} from '../config/engine.config';

export type ChessMove = {
  prevX: number;
  prevY: number;
  newX: number;
  newY: number;
  promotedPiece: FENChar | null;
  uciMove?: string;
};

export type EngineThinkingListener = (isThinking: boolean, searchId?: number) => void;

class StockfishEngineService {
  private worker: Worker | null = null;
  private isWorkerReady: boolean = false;
  private currentSearchId: number = 0;
  private isThinking: boolean = false;
  private thinkingListeners: Set<EngineThinkingListener> = new Set();
  private pendingResolver: ((move: ChessMove | null) => void) | null = null;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initWorker();
  }

  /**
   * Subscribe to thinking state changes
   */
  public onThinkingChange(listener: EngineThinkingListener): () => void {
    this.thinkingListeners.add(listener);
    listener(this.isThinking, this.currentSearchId);
    return () => this.thinkingListeners.delete(listener);
  }

  private setThinking(thinking: boolean, searchId?: number): void {
    this.isThinking = thinking;
    this.thinkingListeners.forEach((fn) => fn(thinking, searchId));
  }

  public getIsThinking(): boolean {
    return this.isThinking;
  }

  /**
   * Initialize or reinitialize the Web Worker
   */
  private initWorker(): void {
    if (typeof window === 'undefined') return;

    try {
      if (this.worker) {
        try {
          this.worker.terminate();
        } catch {}
      }

      // Load stockfish.js from public directory
      this.worker = new Worker('/stockfish.js');
      this.isWorkerReady = false;

      this.worker.onmessage = (event: MessageEvent) => {
        const line = typeof event.data === 'string' ? event.data : '';
        this.handleEngineOutput(line);
      };

      this.worker.onerror = (err) => {
        console.warn('⚠️ Stockfish Worker error:', err);
        this.isWorkerReady = false;
      };

      // UCI handshake
      this.worker.postMessage('uci');
    } catch (err) {
      console.warn('⚠️ Could not spawn Stockfish Web Worker:', err);
      this.worker = null;
      this.isWorkerReady = false;
    }
  }

  /**
   * Handle incoming UCI lines from Stockfish Worker
   */
  private handleEngineOutput(line: string): void {
    if (!line) return;

    if (line === 'uciok') {
      this.worker?.postMessage('isready');
      return;
    }

    if (line === 'readyok') {
      this.isWorkerReady = true;
      this.worker?.postMessage('ucinewgame');
      return;
    }

    // Best move response: "bestmove e7e5 ponder d2d4" or "bestmove e7e8q"
    if (line.startsWith('bestmove')) {
      this.clearSafetyTimer();
      const parts = line.split(' ');
      const moveStr = parts[1];

      const resolver = this.pendingResolver;
      this.pendingResolver = null;
      this.setThinking(false);

      if (!resolver) return;

      if (!moveStr || moveStr === '(none)') {
        resolver(null);
        return;
      }

      // Convert UCI move string (e.g. "e2e4", "e7e8q")
      const parsedMove = this.parseUciMove(moveStr);
      resolver(parsedMove);
    }
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }

  /**
   * Convert file letter ('a'-'h') to 0-7 column coordinate
   */
  private convertCol(letter: string): number {
    return letter.charCodeAt(0) - 'a'.charCodeAt(0);
  }

  /**
   * Parse promotion piece character ('q', 'r', 'b', 'n')
   */
  private getPromotedPiece(char: string | undefined): FENChar | null {
    if (!char) return null;
    const lower = char.toLowerCase();
    if (lower === 'n') return FENChar.WhiteKnight; // Color determined by context later if needed
    if (lower === 'b') return FENChar.WhiteBishop;
    if (lower === 'r') return FENChar.WhiteRook;
    return FENChar.WhiteQueen;
  }

  /**
   * Parse UCI notation into game coordinates:
   * Rank 1-8 -> 0-7 index (Rank 1 is index 0)
   * File a-h -> 0-7 index (File a is index 0)
   */
  public parseUciMove(move: string, computerColor: Color = Color.Black): ChessMove {
    const prevY = this.convertCol(move[0]);
    const prevX = Number(move[1]) - 1;
    const newY = this.convertCol(move[2]);
    const newX = Number(move[3]) - 1;

    let promotedPiece: FENChar | null = null;
    if (move.length >= 5) {
      const char = move[4].toLowerCase();
      if (char === 'n') {
        promotedPiece = computerColor === Color.White ? FENChar.WhiteKnight : FENChar.BlackKnight;
      } else if (char === 'b') {
        promotedPiece = computerColor === Color.White ? FENChar.WhiteBishop : FENChar.BlackBishop;
      } else if (char === 'r') {
        promotedPiece = computerColor === Color.White ? FENChar.WhiteRook : FENChar.BlackRook;
      } else {
        promotedPiece = computerColor === Color.White ? FENChar.WhiteQueen : FENChar.BlackQueen;
      }
    }

    return {
      prevX,
      prevY,
      newX,
      newY,
      promotedPiece,
      uciMove: move,
    };
  }

  /**
   * Cancel any active calculation immediately
   */
  public cancelSearch(): void {
    this.clearSafetyTimer();
    if (this.worker && this.isThinking) {
      this.worker.postMessage('stop');
    }
    if (this.pendingResolver) {
      const resolver = this.pendingResolver;
      this.pendingResolver = null;
      resolver(null);
    }
    this.setThinking(false);
  }

  /**
   * Calculate best move for a given FEN position with strict configured limits
   */
  public async getBestMove(
    fen: string,
    level: number,
    computerColor: Color
  ): Promise<ChessMove | null> {
    // 1. Cancel previous engine search if still calculating
    this.cancelSearch();

    // 2. Concurrency guard & search ID
    const searchId = ++this.currentSearchId;

    // 3. Central engine configuration lookup
    const config: DifficultyConfig = DIFFICULTY_LEVEL_MAP[level] || DIFFICULTY_LEVEL_MAP[3];
    const { movetime, depth } = config;

    // 4. Check worker availability; lazy respawn if terminated
    if (!this.worker) {
      this.initWorker();
    }

    if (!this.worker) {
      console.warn('⚠️ Web Worker unavailable for Stockfish.');
      return null;
    }

    this.setThinking(true, searchId);

    return new Promise<ChessMove | null>((resolve) => {
      this.pendingResolver = (move) => {
        if (move && move.promotedPiece) {
          // Adjust promotion color to actual computer side
          if (computerColor === Color.Black) {
            if (move.promotedPiece === FENChar.WhiteQueen) move.promotedPiece = FENChar.BlackQueen;
            if (move.promotedPiece === FENChar.WhiteRook) move.promotedPiece = FENChar.BlackRook;
            if (move.promotedPiece === FENChar.WhiteBishop) move.promotedPiece = FENChar.BlackBishop;
            if (move.promotedPiece === FENChar.WhiteKnight) move.promotedPiece = FENChar.BlackKnight;
          }
        }
        resolve(move);
      };

      // 5. Send UCI commands to Web Worker
      this.worker?.postMessage(`position fen ${fen}`);
      this.worker?.postMessage(`go movetime ${movetime} depth ${depth}`);

      // 6. Hard safety timeout: if engine takes longer than movetime + safety margin, send 'stop'
      this.safetyTimer = setTimeout(() => {
        if (this.currentSearchId === searchId && this.isThinking) {
          this.worker?.postMessage('stop');
        }
      }, movetime + ENGINE_SAFETY_MARGIN_MS);
    });
  }

  /**
   * Reset engine for a new game
   */
  public resetNewGame(): void {
    this.cancelSearch();
    if (this.worker) {
      this.worker.postMessage('ucinewgame');
    }
  }

  /**
   * Cleanly terminate the Web Worker when game ends or component unmounts
   */
  public terminate(): void {
    this.cancelSearch();
    if (this.worker) {
      try {
        this.worker.postMessage('quit');
        this.worker.terminate();
      } catch {}
      this.worker = null;
      this.isWorkerReady = false;
    }
  }
}

export const stockfishService = new StockfishEngineService();
export default stockfishService;
