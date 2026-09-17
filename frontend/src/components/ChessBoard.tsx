import React from 'react';
import { ChessBoard as ChessBoardEngine } from '../chess-logic/chess-board';
import {
  CheckState,
  Coords,
  FENChar,
  LastMove,
} from '../chess-logic/models';
import {
  BOARD_THEMES,
  BoardThemeId,
  PieceSetId,
  getPieceSvgPath,
} from '../config/theme.config';

interface ChessBoardProps {
  boardView: (FENChar | null)[][];
  selectedSquare: { x: number; y: number; piece: FENChar } | null;
  safeSquares: Coords[];
  lastMove: LastMove | undefined;
  checkState: CheckState;
  isFlipped: boolean;
  onSquareClick: (x: number, y: number) => void;
  disabled?: boolean;
  boardTheme?: BoardThemeId;
  pieceSet?: PieceSetId;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  boardView,
  selectedSquare,
  safeSquares,
  lastMove,
  checkState,
  isFlipped,
  onSquareClick,
  disabled = false,
  boardTheme = 'green',
  pieceSet = 'cburnett',
}) => {
  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.green;

  // Rows and columns indexing based on flip status:
  // Normal (White perspective): rows 7 down to 0, cols 0 up to 7
  // Flipped (Black perspective): rows 0 up to 7, cols 7 down to 0
  const rowIndices = isFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const colIndices = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const isSquareSelected = (x: number, y: number) => {
    return selectedSquare !== null && selectedSquare.x === x && selectedSquare.y === y;
  };

  const isSquareSafe = (x: number, y: number) => {
    return safeSquares.some((c) => c.x === x && c.y === y);
  };

  const isSquareLastMove = (x: number, y: number) => {
    if (!lastMove) return false;
    const { prevX, prevY, currX, currY } = lastMove;
    return (x === prevX && y === prevY) || (x === currX && y === currY);
  };

  const isSquareChecked = (x: number, y: number) => {
    return checkState.isInCheck && checkState.x === x && checkState.y === y;
  };

  return (
    <div className="relative w-full max-w-[560px] aspect-square select-none touch-manipulation">
      {/* Outer Board Frame with Soft Shadow */}
      <div className="w-full h-full p-2 sm:p-3 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)]">
        {/* 8x8 Board Grid */}
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden shadow-inner border border-slate-700/50">
          {rowIndices.map((x, rowDisplayIdx) =>
            colIndices.map((y, colDisplayIdx) => {
              const piece = boardView[x]?.[y];
              const isDark = ChessBoardEngine.isSquareDark(x, y);
              const isSelected = isSquareSelected(x, y);
              const isSafe = isSquareSafe(x, y);
              const isLast = isSquareLastMove(x, y);
              const isChecked = isSquareChecked(x, y);

              // Coordinates on board edge squares (matching visual reference)
              const showRankLabel = colDisplayIdx === 0;
              const showFileLabel = rowDisplayIdx === 7;

              // Compute background color dynamically based on state
              let squareBg = isDark ? theme.darkSquare : theme.lightSquare;
              if (isLast) {
                squareBg = isDark ? theme.lastMoveDark : theme.lastMoveLight;
              }
              if (isSelected) {
                squareBg = theme.selectedSquare;
              }

              const coordColor = isDark ? theme.lightCoord : theme.darkCoord;

              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => !disabled && onSquareClick(x, y)}
                  style={{ backgroundColor: squareBg }}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors duration-100 touch-manipulation ${
                    isSelected
                      ? 'ring-4 ring-inset ring-amber-400/80 shadow-inner z-10'
                      : ''
                  } ${
                    isChecked
                      ? 'ring-4 ring-inset ring-red-600 !bg-red-500/85 animate-pulse z-20'
                      : ''
                  }`}
                >
                  {/* Coordinates label: Rank at top left */}
                  {showRankLabel && (
                    <span
                      style={{ color: coordColor }}
                      className="absolute top-0.5 sm:top-1 left-1 sm:left-1.5 text-[10px] sm:text-xs font-black font-sans pointer-events-none select-none opacity-85 leading-none"
                    >
                      {x + 1}
                    </span>
                  )}

                  {/* Coordinates label: File at bottom right */}
                  {showFileLabel && (
                    <span
                      style={{ color: coordColor }}
                      className="absolute bottom-0.5 sm:bottom-1 right-1 sm:right-1.5 text-[10px] sm:text-xs font-black font-sans pointer-events-none select-none opacity-85 leading-none"
                    >
                      {String.fromCharCode(97 + y)}
                    </span>
                  )}

                  {/* Move Target Indicator for Empty Square */}
                  {isSafe && !piece && (
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-900/35 ring-2 ring-slate-900/15 pointer-events-none z-10 animate-scaleIn" />
                  )}

                  {/* Capture Target Indicator for Square with Opponent Piece */}
                  {isSafe && piece && (
                    <div className="absolute inset-0 border-4 sm:border-[6px] border-slate-900/30 rounded-none pointer-events-none z-10 animate-fadeIn" />
                  )}

                  {/* Chess Piece Image */}
                  {piece && (
                    <img
                      src={getPieceSvgPath(piece, pieceSet)}
                      alt={piece}
                      draggable={false}
                      className={`w-[85%] h-[85%] object-contain pointer-events-none select-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-transform duration-100 ${
                        isSelected
                          ? 'scale-110 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]'
                          : ''
                      }`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;
