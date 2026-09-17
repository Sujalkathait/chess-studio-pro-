import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Eye, Award } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  message: string;
  onNewGame: () => void;
  onClose: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  message,
  onNewGame,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen && message.toLowerCase().includes('win')) {
      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'],
        });
      } catch {}
    }
  }, [isOpen, message]);

  if (!isOpen) return null;

  const isCheckmate = message.toLowerCase().includes('checkmate');
  const isDraw = message.toLowerCase().includes('draw') || message.toLowerCase().includes('stalemate');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-4 text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30">
          {isDraw ? (
            <Award className="w-8 h-8 text-slate-900" />
          ) : (
            <Trophy className="w-8 h-8 text-slate-900" />
          )}
        </div>

        <h2 className="text-2xl font-extrabold text-white mb-2">Game Over</h2>
        <p className="text-base font-semibold text-amber-300 mb-1">{message}</p>
        <p className="text-xs text-slate-400 mb-8">
          {isCheckmate
            ? 'A decisive victory achieved by checkmate!'
            : 'The game ended peacefully with no remaining legal moves.'}
        </p>

        <div className="space-y-3">
          <button
            onClick={onNewGame}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-sm rounded-xl border border-slate-700/60 transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Review Board
          </button>
        </div>
      </div>
    </div>
  );
};
