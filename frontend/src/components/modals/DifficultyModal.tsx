import React, { useState } from 'react';
import { Color } from '../../chess-logic/models';
import { ENGINE_CONFIG, DifficultyConfig } from '../../config/engine.config';
import { Bot, Sparkles, X, Swords, Zap, Shield, Clock } from 'lucide-react';

interface DifficultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (level: number, playerColor: Color) => void;
  currentLevel?: number;
}

export const DifficultyModal: React.FC<DifficultyModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  currentLevel = 2,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(currentLevel);
  const [selectedColor, setSelectedColor] = useState<Color>(Color.White);

  if (!isOpen) return null;

  const difficultyList = Object.values(ENGINE_CONFIG);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full mx-4 text-slate-100 overflow-y-auto max-h-[95vh] hide-scrollbar">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-lg shadow-indigo-500/25">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Play vs Stockfish AI</h2>
            <p className="text-xs text-slate-400">Instant in-browser calculations via Web Worker</p>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Engine Thinking Limit
            </span>
            <span className="text-[11px] font-normal text-slate-500">Max Time / Depth</span>
          </label>
          <div className="space-y-2">
            {difficultyList.map((cfg) => {
              const isSelected = selectedLevel === cfg.level;
              return (
                <button
                  key={cfg.id}
                  type="button"
                  onClick={() => setSelectedLevel(cfg.level)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {cfg.level}
                    </span>
                    <div className="text-left">
                      <div className="font-semibold text-white leading-tight">{cfg.name}</div>
                      <div className="text-[11px] text-slate-400">{cfg.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-950/70 border border-slate-800 text-slate-300">
                      {cfg.movetime < 1000 ? `${cfg.movetime}ms` : `${cfg.movetime / 1000}s`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Choice */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-indigo-400" />
            Play As
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedColor(Color.White)}
              className={`flex items-center justify-center gap-3 p-3 rounded-xl border transition-all ${
                selectedColor === Color.White
                  ? 'bg-slate-100 text-slate-900 border-white shadow-lg shadow-white/10 font-bold'
                  : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white border border-slate-300 shadow-sm" />
              <span>White (1st move)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedColor(Color.Black)}
              className={`flex items-center justify-center gap-3 p-3 rounded-xl border transition-all ${
                selectedColor === Color.Black
                  ? 'bg-slate-800 text-white border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg font-bold'
                  : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-slate-950 border border-slate-600 shadow-sm" />
              <span>Black (2nd move)</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onStartGame(selectedLevel, selectedColor)}
            className="flex-1 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Match
          </button>
        </div>
      </div>
    </div>
  );
};

export default DifficultyModal;
