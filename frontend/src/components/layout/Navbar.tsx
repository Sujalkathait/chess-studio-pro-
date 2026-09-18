import React from 'react';
import {
  Bot,
  Users,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowUpDown,
  Globe,
  LogOut,
  Flag,
  Handshake,
  Sparkles,
  Palette,
} from 'lucide-react';
import { Color } from '../../chess-logic/models';
import { ENGINE_CONFIG, DIFFICULTY_LEVEL_MAP } from '../../config/engine.config';

interface NavbarProps {
  gameMode: 'friend' | 'computer' | 'online';
  onSelectMode: (mode: 'friend' | 'computer' | 'online') => void;
  onNewGame: () => void;
  onExitGame: () => void;
  onFlipBoard: () => void;
  onResign?: () => void;
  onOfferDraw?: () => void;
  onOpenThemeModal?: () => void;
  isFlipped: boolean;
  isMuted: boolean;
  onToggleSound: () => void;
  computerLevel?: number;
  playerColor?: Color;
  onlineRoomCode?: string | null;
  onlineDisplayCode?: string | null;
  isAiThinking?: boolean;
  isGameActive?: boolean;
  currentView?: 'play' | 'history' | 'analysis';
  onNavigateView?: (view: 'play' | 'history' | 'analysis') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  gameMode,
  onSelectMode,
  onNewGame,
  onExitGame,
  onFlipBoard,
  onResign,
  onOfferDraw,
  onOpenThemeModal,
  isFlipped,
  isMuted,
  onToggleSound,
  computerLevel = 2,
  playerColor,
  onlineRoomCode,
  onlineDisplayCode,
  isAiThinking = false,
  isGameActive = false,
  currentView = 'play',
  onNavigateView = () => {},
}) => {
  const currentLevelConfig = DIFFICULTY_LEVEL_MAP[computerLevel] || ENGINE_CONFIG.easy;

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand and Exit / Back Button */}
        <div className="flex items-center gap-3">
          {/* Back / Exit Button */}
          <button
            onClick={onExitGame}
            title="Exit / Back to Menu"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-800/60 transition-all flex items-center gap-1 text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg">
              ♞
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1">
                  CHESS <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">STUDIO</span>
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {gameMode === 'computer'
                  ? `Stockfish (${currentLevelConfig.name} - max ${currentLevelConfig.movetime}ms)`
                  : gameMode === 'online'
                  ? onlineDisplayCode
                    ? `Room: ${onlineDisplayCode}`
                    : 'Online Multiplayer'
                  : 'Pass & Play Local'}
              </p>
            </div>
          </div>

          {/* Active AI Thinking Badge in Header */}
          {isAiThinking && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 text-xs font-semibold animate-pulse shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span>AI is thinking...</span>
            </div>
          )}
        </div>

        {/* Center: Mode Selector Tabs or View Switcher */}
        <div className="flex items-center gap-2">
          {/* Mode Selector Tabs (Scrollable on mobile) - shown when in play view */}
          {currentView === 'play' && (
            <div className="flex w-full md:w-auto overflow-x-auto hide-scrollbar items-center justify-start md:justify-center bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 gap-1.5">
              <button
                onClick={() => onSelectMode('computer')}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  gameMode === 'computer'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>vs Computer</span>
                {gameMode === 'computer' && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-800 text-[10px] text-indigo-200">
                    {currentLevelConfig.name}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectMode('friend')}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  gameMode === 'friend'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>Pass & Play</span>
              </button>

              <button
                onClick={() => onSelectMode('online')}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  gameMode === 'online'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>Online Room</span>
                {gameMode === 'online' && onlineDisplayCode && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-800 text-[10px] text-emerald-200 font-mono font-bold">
                    {onlineDisplayCode}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* View Navigation Switcher (Play vs History & Analysis) */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl p-1.5">
            <button
              onClick={() => onNavigateView('play')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'play'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Play
            </button>
            <button
              onClick={() => onNavigateView('history')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'history' || currentView === 'analysis'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              History & Analysis
            </button>
          </div>
        </div>

        {/* In-Game Actions & Settings (Scrollable on mobile) */}
        <div className="flex w-full md:w-auto overflow-x-auto hide-scrollbar items-center justify-start md:justify-end gap-2 pb-1 md:pb-0">
          {/* Resign Button (Active Game) */}
          {isGameActive && onResign && (
            <button
              onClick={onResign}
              title="Resign Game"
              className="flex-shrink-0 p-2.5 md:p-2 rounded-xl bg-slate-800/60 hover:bg-red-950/70 text-slate-300 hover:text-red-400 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <Flag className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span>Resign</span>
            </button>
          )}

          {/* Offer Draw (Online Game) */}
          {gameMode === 'online' && isGameActive && onOfferDraw && (
            <button
              onClick={onOfferDraw}
              title="Offer Draw"
              className="flex-shrink-0 p-2.5 md:p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <Handshake className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span>Draw</span>
            </button>
          )}

          {/* Theme Selector (Board & Pieces) */}
          {onOpenThemeModal && (
            <button
              onClick={onOpenThemeModal}
              title="Change Board & Pieces Style"
              className="flex-shrink-0 p-2.5 md:p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <Palette className="w-4 h-4 md:w-4 md:h-4 text-amber-400" />
              <span className="hidden sm:inline">Theme</span>
            </button>
          )}

          {/* Flip Board */}
          <button
            onClick={onFlipBoard}
            title={isFlipped ? 'Board Flipped (Black perspective)' : 'Board Normal (White perspective)'}
            className={`flex-shrink-0 p-2.5 md:p-2 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isFlipped
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">Flip</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="flex-shrink-0 p-2.5 md:p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Restart Game */}
          <button
            onClick={onNewGame}
            title="Start New Game"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 md:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 transition-all active:scale-95 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 md:w-3.5 md:h-3.5" />
            <span>New Game</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
