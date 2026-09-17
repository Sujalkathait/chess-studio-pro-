import React from 'react';
import { AlertTriangle, LogOut, ArrowLeft } from 'lucide-react';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  gameMode: 'friend' | 'computer' | 'online';
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
  gameMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-sm w-full mx-4 text-slate-100 overflow-hidden text-center">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">Leave Current Game?</h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {gameMode === 'online'
            ? 'Leaving an active online game will disconnect you and forfeit the match to your opponent.'
            : 'Your current move progress will be reset and you will return to the main menu.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Keep Playing</span>
          </button>
          <button
            type="button"
            onClick={onConfirmExit}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Game</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmModal;
