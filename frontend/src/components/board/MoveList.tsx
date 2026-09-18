import React, { useRef, useEffect } from 'react';
import { Color, FENChar, MoveList as MoveListType } from '../../chess-logic/models';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CapturedPieces } from './CapturedPieces';
import { DIFFICULTY_LEVEL_MAP } from '../../config/engine.config';
import { PieceSetId } from '../../config/theme.config';

interface MoveListProps {
  moveList: MoveListType;
  gameHistoryPointer: number;
  gameHistoryLength: number;
  onNavigateHistory: (pointer: number) => void;
  playerColor: Color;
  gameOverMessage?: string;
  isAiThinking?: boolean;
  boardView: (FENChar | null)[][];
  computerLevel?: number;
  gameMode?: 'friend' | 'computer' | 'online';
  pieceSet?: PieceSetId;
}

export const MoveList: React.FC<MoveListProps> = ({
  moveList,
  gameHistoryPointer,
  gameHistoryLength,
  onNavigateHistory,
  playerColor,
  gameOverMessage,
  isAiThinking = false,
  boardView,
  computerLevel = 2,
  gameMode = 'computer',
  pieceSet = 'cburnett',
}) => {
  const activeMoveRef = useRef<HTMLDivElement | null>(null);
  const currentEngineConfig = DIFFICULTY_LEVEL_MAP[computerLevel] || DIFFICULTY_LEVEL_MAP[2];

  // Auto-scroll to active move in history
  useEffect(() => {
    if (activeMoveRef.current) {
      activeMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [gameHistoryPointer]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col h-[350px] lg:h-[560px] w-full backdrop-blur-sm">
      {/* Header with Turn / AI Status */}
      <div className="pb-3 border-b border-slate-800 mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-3.5 h-3.5 rounded-full border shadow-sm transition-transform ${
                playerColor === Color.White
                  ? 'bg-white border-slate-300'
                  : 'bg-slate-950 border-slate-600'
              }`}
            />
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                {gameOverMessage ? (
                  <span className="text-amber-400 font-semibold">Match Concluded</span>
                ) : isAiThinking ? (
                  <span className="text-indigo-400 flex items-center gap-1.5 animate-pulse font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span>AI is thinking...</span>
                  </span>
                ) : (
                  <span>{playerColor === Color.White ? "White's Turn" : "Black's Turn"}</span>
                )}
              </h3>
            </div>
          </div>

          <div className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{moveList.length} Moves</span>
          </div>
        </div>

        {/* AI Limit Indicator banner when in computer mode */}
        {gameMode === 'computer' && (
          <div className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800/80 text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Limit: <strong>{currentEngineConfig.name}</strong></span>
            </span>
            <span className="font-mono text-slate-300">
              max {currentEngineConfig.movetime}ms / depth {currentEngineConfig.depth}
            </span>
          </div>
        )}
      </div>

      {/* Captured Pieces Material Tracker */}
      <div className="mb-3">
        <CapturedPieces boardView={boardView} pieceSet={pieceSet} />
      </div>

      {/* History Navigation Controls */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/70">
        <button
          onClick={() => onNavigateHistory(0)}
          disabled={gameHistoryPointer === 0}
          title="Start of game"
          className="p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigateHistory(gameHistoryPointer - 1)}
          disabled={gameHistoryPointer === 0}
          title="Previous move (Left arrow)"
          className="p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigateHistory(gameHistoryPointer + 1)}
          disabled={gameHistoryPointer === gameHistoryLength - 1}
          title="Next move (Right arrow)"
          className="p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigateHistory(gameHistoryLength - 1)}
          disabled={gameHistoryPointer === gameHistoryLength - 1}
          title="Latest position"
          className="p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Move History Table */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1 select-none scrollbar-thin scrollbar-thumb-slate-700">
        {moveList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <span className="text-3xl mb-2">♟️</span>
            <p className="text-xs">Moves will appear here as you play</p>
          </div>
        ) : (
          moveList.map((move, idx) => {
            const whiteMoveIndex = idx * 2 + 1;
            const blackMoveIndex = idx * 2 + 2;

            const isWhiteActive = whiteMoveIndex === gameHistoryPointer;
            const isBlackActive = blackMoveIndex === gameHistoryPointer;

            return (
              <div
                key={idx}
                className="grid grid-cols-12 items-center text-xs font-mono rounded-lg hover:bg-slate-800/40 py-1 px-2 transition-colors"
              >
                {/* Move Number */}
                <div className="col-span-2 text-slate-500 font-semibold">{idx + 1}.</div>

                {/* White Move */}
                <div
                  ref={isWhiteActive ? activeMoveRef : null}
                  onClick={() => onNavigateHistory(whiteMoveIndex)}
                  className={`col-span-5 px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                    isWhiteActive
                      ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/50'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {move[0]}
                </div>

                {/* Black Move */}
                <div
                  ref={isBlackActive ? activeMoveRef : null}
                  onClick={() => move[1] && onNavigateHistory(blackMoveIndex)}
                  className={`col-span-5 px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                    move[1]
                      ? isBlackActive
                        ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/50'
                        : 'text-slate-200 hover:bg-slate-800'
                      : 'text-transparent'
                  }`}
                >
                  {move[1] || '...'}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer shortcut helper */}
      <div className="pt-2.5 mt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Shortcuts: ← / → keys</span>
        <span className="text-slate-400 font-mono">Chess Studio Pro</span>
      </div>
    </div>
  );
};

export default MoveList;
