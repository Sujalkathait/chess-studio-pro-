import React from 'react';
import { Bot, Users, RotateCcw, Volume2, VolumeX, ArrowUpDown, Globe } from 'lucide-react';
import { Color } from '../chess-logic/models';

interface NavbarProps {
  gameMode: 'friend' | 'computer' | 'online';
  onSelectMode: (mode: 'friend' | 'computer' | 'online') => void;
  onNewGame: () => void;
  onFlipBoard: () => void;
  isFlipped: boolean;
  isMuted: boolean;
  onToggleSound: () => void;
  computerLevel?: number;
  playerColor?: Color;
  onlineRoomCode?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  gameMode,
  onSelectMode,
  onNewGame,
  onFlipBoard,
  isFlipped,
  isMuted,
  onToggleSound,
  computerLevel,
  onlineRoomCode,
}) => {
  return (
    <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-xl">
            ♞
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                CHESS <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">STUDIO</span>
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Play Against Friends, AI, or Online</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800 gap-1">
          <button
            onClick={() => onSelectMode('friend')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              gameMode === 'friend'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pass & Play</span>
          </button>

          <button
            onClick={() => onSelectMode('computer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              gameMode === 'computer'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>vs Computer</span>
            {gameMode === 'computer' && computerLevel && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-800 text-[10px] text-indigo-200">
                Lvl {computerLevel}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectMode('online')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              gameMode === 'online'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Online</span>
            {gameMode === 'online' && onlineRoomCode && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-800 text-[10px] text-emerald-200 font-mono">
                {onlineRoomCode}
              </span>
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Flip Board */}
          <button
            onClick={onFlipBoard}
            title={isFlipped ? 'Board Flipped (Black perspective)' : 'Board Normal (White perspective)'}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isFlipped
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden md:inline">Flip</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* New Game */}
          <button
            onClick={onNewGame}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all active:scale-95 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>
    </header>
  );
};
