import { Color, FENChar } from '../chess-logic/models';
import {
  DIFFICULTY_LEVEL_MAP,
  ENGINE_SAFETY_MARGIN_MS,
  ENGINE_HARD_TIMEOUT_MS,
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

/**
 * Engine state machine:
 *   idle → thinking → idle
 *
 * Transitions back to idle happen on:
 *   - bestmove received
 *   - safety timeout (soft stop → eventual bestmove)
 *   - hard timeout (Worker terminated and respawned)
 *   - Worker error / messageerror
 *   - explicit cancelSearch()
 */
type EngineState = 'idle' | 'thinking';

class StockfishEngineService {
  private worker: Worker | null = null;
  private isWorkerReady: boolean = false;
  private currentSearchId: number = 0;
  private engineState: EngineState = 'idle';
  private thinkingListeners: Set<EngineThinkingListener> = new Set();
  private pendingResolver: ((move: ChessMove | null) => void) | null = null;
  private pendingSearchId: number = 0;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private hardTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initWorker();
  }

  /**
   * Subscribe to thinking state changes
   */
  public onThinkingChange(listener: EngineThinkingListener): () => void {
    this.thinkingListeners.add(listener);
    listener(this.engineState === 'thinking', this.currentSearchId);
    return () => this.thinkingListeners.delete(listener);
  }

  private setEngineState(state: EngineState, searchId?: number): void {
    this.engineState = state;
    const isThinking = state === 'thinking';
    this.thinkingListeners.forEach((fn) => fn(isThinking, searchId));
  }

  public getIsThinking(): boolean {
    return this.engineState === 'thinking';
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
        // Resolve any pending promise so the UI never gets stuck
        this.resolveAndReset(null);
      };

      // Handle deserialization errors on messages from the Worker
      (this.worker as any).onmessageerror = () => {
        console.warn('⚠️ Stockfish Worker messageerror');
        this.resolveAndReset(null);
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
   * Safely resolve the pending promise with a value and reset state to idle.
   * Idempotent — safe to call multiple times.
   */
  private resolveAndReset(move: ChessMove | null): void {
    this.clearAllTimers();
    const resolver = this.pendingResolver;
    this.pendingResolver = null;
    this.pendingSearchId = 0;
    this.setEngineState('idle');
    if (resolver) {
      resolver(move);
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
      // Guard: discard stale responses from a previous search
      if (this.pendingSearchId !== this.currentSearchId) {
        return;
      }

      const parts = line.split(' ');
      const moveStr = parts[1];

      if (!moveStr || moveStr === '(none)') {
        this.resolveAndReset(null);
        return;
      }

      // Convert UCI move string (e.g. "e2e4", "e7e8q")
      const parsedMove = this.parseUciMove(moveStr);
      this.resolveAndReset(parsedMove);
    }
  }

  private clearAllTimers(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    if (this.hardTimer) {
      clearTimeout(this.hardTimer);
      this.hardTimer = null;
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
    this.clearAllTimers();
    if (this.worker && this.engineState === 'thinking') {
      this.worker.postMessage('stop');
    }
    // Resolve with null so no promise hangs
    const resolver = this.pendingResolver;
    this.pendingResolver = null;
    this.pendingSearchId = 0;
    this.setEngineState('idle');
    if (resolver) {
      resolver(null);
    }
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

    this.setEngineState('thinking', searchId);

    return new Promise<ChessMove | null>((resolve) => {
      this.pendingSearchId = searchId;
      this.pendingResolver = (move) => {
        // Stale-response guard: if searchId no longer matches, discard
        if (searchId !== this.currentSearchId) {
          resolve(null);
          return;
        }

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

      // 6. Tier-1 safety timeout: send 'stop' to engine
      this.safetyTimer = setTimeout(() => {
        if (this.currentSearchId === searchId && this.engineState === 'thinking') {
          this.worker?.postMessage('stop');
        }
      }, movetime + ENGINE_SAFETY_MARGIN_MS);

      // 7. Tier-2 hard timeout: if still no bestmove, terminate Worker and resolve
      this.hardTimer = setTimeout(() => {
        if (this.currentSearchId === searchId && this.engineState === 'thinking') {
          console.warn('⚠️ Stockfish hard timeout — terminating and respawning Worker.');
          // Terminate the stuck Worker
          if (this.worker) {
            try {
              this.worker.terminate();
            } catch {}
            this.worker = null;
            this.isWorkerReady = false;
          }
          // Resolve the promise so UI is never stuck
          this.resolveAndReset(null);
          // Respawn a fresh Worker for the next request
          this.initWorker();
        }
      }, movetime + ENGINE_SAFETY_MARGIN_MS + ENGINE_HARD_TIMEOUT_MS);
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
