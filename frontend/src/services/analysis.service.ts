import { ChessMove } from './stockfish.service';

export interface AnalysisResult {
    evaluationBefore: number; // in centipawns
    evaluationAfter: number;
    evaluationLoss: number;
    classification: MoveClassification;
    bestMoveUci: string;
    mate?: number; // mate in N, positive for white, negative for black
}

export enum MoveClassification {
    Best = 'Best',
    Excellent = 'Excellent',
    Good = 'Good',
    Inaccuracy = 'Inaccuracy',
    Mistake = 'Mistake',
    Blunder = 'Blunder',
    Book = 'Book',
    Forced = 'Forced',
}

export interface GameAnalysisSummary {
    whiteAccuracy: number;
    blackAccuracy: number;
    moveAnalyses: AnalysisResult[];
}

export class AnalysisService {
    private worker: Worker | null = null;
    private isWorkerReady = false;
    private resolveCurrentEval: ((result: { score: number, mate?: number, bestMoveUci: string }) => void) | null = null;
    private currentBestMove: string = '';
    private currentScore: number = 0;
    private currentMate: number | undefined = undefined;

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        if (typeof window === 'undefined') return;
        try {
            if (this.worker) this.worker.terminate();
            this.worker = new Worker('/stockfish.js');
            this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
            this.worker.postMessage('uci');
        } catch (e) {
            console.error('Failed to init analysis worker', e);
        }
    }

    private handleWorkerMessage(line: string) {
        if (line === 'uciok') {
            this.worker?.postMessage('isready');
            return;
        }
        if (line === 'readyok') {
            this.isWorkerReady = true;
            return;
        }

        if (line.startsWith('info depth')) {
            const scoreMatch = line.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                this.currentScore = parseInt(scoreMatch[1], 10);
                this.currentMate = undefined;
            }
            const mateMatch = line.match(/score mate (-?\d+)/);
            if (mateMatch) {
                this.currentMate = parseInt(mateMatch[1], 10);
            }
        }

        if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
            this.currentBestMove = parts[1] || '';
            
            if (this.resolveCurrentEval) {
                this.resolveCurrentEval({
                    score: this.currentScore,
                    mate: this.currentMate,
                    bestMoveUci: this.currentBestMove
                });
                this.resolveCurrentEval = null;
            }
        }
    }

    private async evaluateFen(fen: string, depth: number = 12): Promise<{ score: number, mate?: number, bestMoveUci: string }> {
        if (!this.worker) this.initWorker();
        
        return new Promise((resolve) => {
            this.resolveCurrentEval = resolve;
            this.currentScore = 0;
            this.currentMate = undefined;
            this.currentBestMove = '';
            
            this.worker?.postMessage('ucinewgame');
            this.worker?.postMessage(`position fen ${fen}`);
            this.worker?.postMessage(`go depth ${depth}`);
        });
    }

    /**
     * Calculates the move classification based on centipawn loss.
     * Evaluates from the perspective of the player who just moved.
     */
    private classifyMove(loss: number, isMateBefore: boolean, isMateAfter: boolean): MoveClassification {
        // Simple logic for mate transitions
        if (isMateBefore && !isMateAfter) return MoveClassification.Blunder;
        
        if (loss <= 20) return MoveClassification.Best;
        if (loss <= 50) return MoveClassification.Excellent;
        if (loss <= 100) return MoveClassification.Good;
        if (loss <= 200) return MoveClassification.Inaccuracy;
        if (loss <= 300) return MoveClassification.Mistake;
        return MoveClassification.Blunder;
    }

    /**
     * Calculates accuracy using a win probability scaling formula.
     * Maps evaluation to expected win probability, then looks at difference.
     */
    private calculateAccuracy(losses: number[]): number {
        if (losses.length === 0) return 100;
        
        // Very basic accuracy model based on average CP loss
        // Real chess.com accuracy is much more complex
        const avgLoss = losses.reduce((a,b) => a + b, 0) / losses.length;
        const accuracy = Math.max(0, 100 - (avgLoss / 4));
        return Math.round(accuracy * 10) / 10;
    }

    public async analyzeGame(fenHistory: string[], depth: number = 12): Promise<GameAnalysisSummary> {
        const moveAnalyses: AnalysisResult[] = [];
        const whiteLosses: number[] = [];
        const blackLosses: number[] = [];

        // Note: fenHistory has N+1 states for N moves (initial state + N moves)
        let previousEval = await this.evaluateFen(fenHistory[0], depth);
        
        for (let i = 1; i < fenHistory.length; i++) {
            const currentEval = await this.evaluateFen(fenHistory[i], depth);
            
            // Stockfish returns score from side to move. 
            // We need to invert previous eval to compare from the same perspective.
            // i is odd: White just moved. previousEval was from White's perspective. currentEval is from Black's perspective.
            // So after White moves, the position evaluation from White's perspective is -currentEval.score.
            
            let evalBefore = previousEval.score;
            let evalAfter = -currentEval.score; // Invert because it's now opponent's turn
            
            let loss = evalBefore - evalAfter;
            // Prevent negative loss due to horizon effect at low depth
            loss = Math.max(0, loss);

            const isWhiteMove = i % 2 !== 0;
            if (isWhiteMove) whiteLosses.push(loss);
            else blackLosses.push(loss);

            const classification = this.classifyMove(
                loss, 
                previousEval.mate !== undefined, 
                currentEval.mate !== undefined
            );

            moveAnalyses.push({
                evaluationBefore: evalBefore,
                evaluationAfter: evalAfter,
                evaluationLoss: loss,
                classification: classification,
                bestMoveUci: previousEval.bestMoveUci,
                mate: previousEval.mate
            });

            previousEval = currentEval;
        }

        return {
            whiteAccuracy: this.calculateAccuracy(whiteLosses),
            blackAccuracy: this.calculateAccuracy(blackLosses),
            moveAnalyses: moveAnalyses
        };
    }
    
    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isWorkerReady = false;
        }
    }
}

export const analysisService = new AnalysisService();
