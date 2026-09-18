import { MoveList } from './models';
import { Chess } from 'chess.js';

export interface GameMetadata {
    White?: string;
    Black?: string;
    Result?: string;
    Date?: string;
    Event?: string;
    Site?: string;
    Round?: string;
    TimeControl?: string;
    Termination?: string;
    [key: string]: string | undefined;
}

/**
 * Generate a standard PGN string from our internal MoveList and metadata
 */
export function generatePGN(moveList: MoveList, metadata: GameMetadata): string {
    let pgn = "";
    
    // Add default headers if missing
    const fullMetadata: GameMetadata = {
        Event: "Casual Game",
        Site: "Chess Studio Pro",
        Date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
        Round: "-",
        White: "White",
        Black: "Black",
        Result: "*",
        ...metadata
    };

    // Construct headers
    for (const [key, value] of Object.entries(fullMetadata)) {
        if (value !== undefined) {
            pgn += `[${key} "${value}"]\n`;
        }
    }
    pgn += "\n";
    
    // Construct moves
    let moveString = "";
    moveList.forEach((movePair, idx) => {
        const whiteMove = movePair[0];
        const blackMove = movePair[1] ? ` ${movePair[1]}` : "";
        moveString += `${idx + 1}. ${whiteMove}${blackMove} `;
    });
    
    // Append result at the end
    if (fullMetadata.Result) {
        moveString += fullMetadata.Result;
    }
    
    // Standard PGN line length wrapping (~80 chars)
    const wrappedMoveString = moveString.trim().replace(/(.{1,80})(\s+|$)/g, "$1\n").trim();
    
    return pgn + wrappedMoveString + "\n";
}

export interface ParsedPGN {
    metadata: GameMetadata;
    moves: string[];
    fenHistory: string[];
    result: string;
    valid: boolean;
    error?: string;
}

/**
 * Parses a PGN string into a list of valid moves and FEN history using chess.js
 */
export function parsePGN(pgnString: string): ParsedPGN {
    const chess = new Chess();
    
    try {
        // Load the PGN. If it fails, it throws an error or returns false (depending on chess.js version)
        chess.loadPgn(pgnString);
        
        // Extract headers
        const header = chess.header();
        const metadata: GameMetadata = {};
        for (const [key, value] of Object.entries(header)) {
            metadata[key] = value;
        }

        // Replay moves to get FEN history and move sequence
        const moves = chess.history();
        const result = metadata.Result || "*";
        
        const tempChess = new Chess();
        const fenHistory: string[] = [tempChess.fen()];
        
        for (const move of moves) {
            tempChess.move(move);
            fenHistory.push(tempChess.fen());
        }

        return {
            metadata,
            moves,
            fenHistory,
            result,
            valid: true
        };
    } catch (e: any) {
        return {
            metadata: {},
            moves: [],
            fenHistory: [],
            result: "*",
            valid: false,
            error: e.message || "Invalid PGN format"
        };
    }
}
