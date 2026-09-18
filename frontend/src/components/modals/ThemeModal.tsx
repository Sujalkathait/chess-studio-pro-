import React from 'react';
import {
  BOARD_THEMES,
  PIECE_SETS,
  BoardThemeId,
  PieceSetId,
  getPieceSvgPath,
} from '../../config/theme.config';
import { Palette, X, Check, Sparkles } from 'lucide-react';
import { FENChar } from '../../chess-logic/models';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBoardTheme: BoardThemeId;
  currentPieceSet: PieceSetId;
  onSelectBoardTheme: (theme: BoardThemeId) => void;
  onSelectPieceSet: (pieceSet: PieceSetId) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  currentBoardTheme,
  currentPieceSet,
  onSelectBoardTheme,
  onSelectPieceSet,
}) => {
  if (!isOpen) return null;

  const boardThemes = Object.values(BOARD_THEMES);
  const pieceSets = Object.values(PIECE_SETS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full mx-4 text-slate-100 overflow-y-auto max-h-[95vh] hide-scrollbar">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl shadow-lg shadow-amber-500/25">
            <Palette className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Board & Pieces Style</h2>
            <p className="text-xs text-slate-400">Choose board colors and piece sets independently</p>
          </div>
        </div>

        {/* 1. Board Themes */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            1. Select Chess Board Theme
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {boardThemes.map((theme) => {
              const isSelected = currentBoardTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelectBoardTheme(theme.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
                  }`}
                >
                  {/* Board Mini Preview Grid */}
                  <div className="w-full h-14 rounded-xl overflow-hidden grid grid-cols-4 grid-rows-2 border border-slate-700/50 mb-2.5 shadow-inner">
                    {[0, 1].map((r) =>
                      [0, 1, 2, 3].map((c) => {
                        const isDark = (r + c) % 2 === 1;
                        return (
                          <div
                            key={`${r}-${c}`}
                            style={{
                              backgroundColor: isDark ? theme.darkSquare : theme.lightSquare,
                            }}
                            className="w-full h-full"
                          />
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{theme.name}</div>
                      <div className="text-[11px] text-slate-400">{theme.subtitle}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Piece Sets */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            2. Select Piece Set
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pieceSets.map((set) => {
              const isSelected = currentPieceSet === set.id;
              return (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => onSelectPieceSet(set.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-800/90 border-indigo-400 ring-2 ring-indigo-400/30 shadow-lg'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
                  }`}
                >
                  {/* Pieces Mini Preview */}
                  <div className="w-full h-14 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center gap-3 mb-2.5 px-3">
                    <img
                      src={getPieceSvgPath(FENChar.WhiteKnight, set.id)}
                      alt="White Knight"
                      className="w-9 h-9 object-contain drop-shadow"
                    />
                    <img
                      src={getPieceSvgPath(FENChar.WhiteKing, set.id)}
                      alt="White King"
                      className="w-9 h-9 object-contain drop-shadow"
                    />
                    <img
                      src={getPieceSvgPath(FENChar.BlackKnight, set.id)}
                      alt="Black Knight"
                      className="w-9 h-9 object-contain drop-shadow"
                    />
                    <img
                      src={getPieceSvgPath(FENChar.BlackKing, set.id)}
                      alt="Black King"
                      className="w-9 h-9 object-contain drop-shadow"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{set.name}</div>
                      <div className="text-[11px] text-slate-400">{set.subtitle}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          Apply Theme & Save
        </button>
      </div>
    </div>
  );
};

export default ThemeModal;
