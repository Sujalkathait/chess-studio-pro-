import React from 'react';
import { FENChar } from '../../chess-logic/models';
import { PieceSetId, getPieceSvgPath } from '../../config/theme.config';

interface CapturedPiecesProps {
  boardView: (FENChar | null)[][];
  pieceSet?: PieceSetId;
}

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

// Full standard starting set
const INITIAL_PIECES = {
  white: [
    FENChar.WhiteQueen,
    FENChar.WhiteRook,
    FENChar.WhiteRook,
    FENChar.WhiteBishop,
    FENChar.WhiteBishop,
    FENChar.WhiteKnight,
    FENChar.WhiteKnight,
    ...Array(8).fill(FENChar.WhitePawn),
  ],
  black: [
    FENChar.BlackQueen,
    FENChar.BlackRook,
    FENChar.BlackRook,
    FENChar.BlackBishop,
    FENChar.BlackBishop,
    FENChar.BlackKnight,
    FENChar.BlackKnight,
    ...Array(8).fill(FENChar.BlackPawn),
  ],
};

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  boardView,
  pieceSet = 'cburnett',
}) => {
  // Count remaining pieces on board
  const currentCounts: Record<FENChar, number> = {} as any;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = boardView[r]?.[c];
      if (p) {
        currentCounts[p] = (currentCounts[p] || 0) + 1;
      }
    }
  }

  // Calculate captured white pieces (captured by black)
  const capturedWhite: FENChar[] = [];
  const tempWhiteCounts = { ...currentCounts };
  for (const p of INITIAL_PIECES.white) {
    if (tempWhiteCounts[p] && tempWhiteCounts[p] > 0) {
      tempWhiteCounts[p]--;
    } else {
      capturedWhite.push(p);
    }
  }

  // Calculate captured black pieces (captured by white)
  const capturedBlack: FENChar[] = [];
  const tempBlackCounts = { ...currentCounts };
  for (const p of INITIAL_PIECES.black) {
    if (tempBlackCounts[p] && tempBlackCounts[p] > 0) {
      tempBlackCounts[p]--;
    } else {
      capturedBlack.push(p);
    }
  }

  // Calculate material difference
  const whiteScore = capturedBlack.reduce(
    (acc, p) => acc + (PIECE_VALUES[p.toLowerCase()] || 0),
    0
  );
  const blackScore = capturedWhite.reduce(
    (acc, p) => acc + (PIECE_VALUES[p.toLowerCase()] || 0),
    0
  );

  const whiteAdvantage = whiteScore - blackScore;
  const blackAdvantage = blackScore - whiteScore;

  return (
    <div className="w-full flex items-center justify-between gap-2 py-1 px-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
      {/* Captured Black Pieces (White's advantage) */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-[48%] py-0.5 scrollbar-none">
        <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shrink-0 mr-0.5" />
        <div className="flex items-center -space-x-1">
          {capturedBlack.map((piece, i) => (
            <img
              key={i}
              src={getPieceSvgPath(piece, pieceSet)}
              alt={piece}
              className="w-5 h-5 object-contain shrink-0 drop-shadow pointer-events-none select-none"
            />
          ))}
        </div>
        {whiteAdvantage > 0 && (
          <span className="text-[11px] font-bold text-emerald-400 font-mono shrink-0 ml-1">
            +{whiteAdvantage}
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-slate-800 shrink-0" />

      {/* Captured White Pieces (Black's advantage) */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-[48%] justify-end py-0.5 scrollbar-none">
        {blackAdvantage > 0 && (
          <span className="text-[11px] font-bold text-emerald-400 font-mono shrink-0 mr-1">
            +{blackAdvantage}
          </span>
        )}
        <div className="flex items-center -space-x-1">
          {capturedWhite.map((piece, i) => (
            <img
              key={i}
              src={getPieceSvgPath(piece, pieceSet)}
              alt={piece}
              className="w-5 h-5 object-contain shrink-0 drop-shadow pointer-events-none select-none"
            />
          ))}
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-600 shrink-0 ml-0.5" />
      </div>
    </div>
  );
};

export default CapturedPieces;
