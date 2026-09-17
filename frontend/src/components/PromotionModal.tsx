import React from 'react';
import { Color, FENChar, pieceImagePaths } from '../chess-logic/models';

interface PromotionModalProps {
  isOpen: boolean;
  playerColor: Color;
  onSelectPiece: (piece: FENChar) => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  playerColor,
  onSelectPiece,
  onCancel,
}) => {
  if (!isOpen) return null;

  const promotionPieces: { piece: FENChar; label: string }[] =
    playerColor === Color.White
      ? [
          { piece: FENChar.WhiteQueen, label: 'Queen' },
          { piece: FENChar.WhiteRook, label: 'Rook' },
          { piece: FENChar.WhiteBishop, label: 'Bishop' },
          { piece: FENChar.WhiteKnight, label: 'Knight' },
        ]
      : [
          { piece: FENChar.BlackQueen, label: 'Queen' },
          { piece: FENChar.BlackRook, label: 'Rook' },
          { piece: FENChar.BlackBishop, label: 'Bishop' },
          { piece: FENChar.BlackKnight, label: 'Knight' },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 transform transition-all text-center">
        <h3 className="text-xl font-bold text-white mb-2">Promote Your Pawn</h3>
        <p className="text-sm text-slate-400 mb-6">Select a piece to promote to</p>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {promotionPieces.map(({ piece, label }) => (
            <button
              key={piece}
              onClick={() => onSelectPiece(piece)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500 transition-all hover:scale-105 active:scale-95 group shadow-md"
            >
              <img
                src={pieceImagePaths[piece]}
                alt={label}
                className="w-12 h-12 mb-1 drop-shadow transition-transform group-hover:scale-110"
              />
              <span className="text-xs font-medium text-slate-300 group-hover:text-white">
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50"
        >
          Cancel Move
        </button>
      </div>
    </div>
  );
};
