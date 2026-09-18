import React, { useState } from 'react';
import { Globe, Copy, Check, X, Loader2, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { socketService } from '../services/socketService';

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  createdRoomCode: string | null;
  isWaitingForOpponent: boolean;
  joinError?: string | null;
  createError?: string | null;
  isCreating?: boolean;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  createdRoomCode,
  isWaitingForOpponent,
  joinError,
  createError,
  isCreating = false,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!createdRoomCode) return;
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    if (playerName.trim()) {
      onCreateRoom(playerName.trim());
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim().length >= 4 && playerName.trim()) {
      onJoinRoom(inputCode.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full mx-4 text-slate-100 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl shadow-lg shadow-emerald-500/25">
            <Globe className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Play Online Multiplayer</h2>
            <p className="text-xs text-slate-400">Play live in real-time with a friend anywhere</p>
          </div>
        </div>

        {/* Tab switch */}
        {!isWaitingForOpponent && (
          <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-6">
            <button
              onClick={() => setTab('create')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'create'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create New Room
            </button>
            <button
              onClick={() => setTab('join')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'join'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Join Existing Room
            </button>
          </div>
        )}

        {/* Player Name Input (Shared across both tabs) */}
        {!createdRoomCode && (
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Magnus"
              className="w-full text-center py-3 px-4 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>
        )}

        {/* Tab 1: Create Room */}
        {tab === 'create' && (
          <div>
            {!createdRoomCode ? (
              <div className="text-center py-2">
                <p className="text-sm text-slate-300 mb-5">
                  Create a private room, get a 6-letter room code, and share it with your friend. You will play as <strong className="text-white">White</strong>.
                </p>

                {createError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300 flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{createError}</span>
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={isCreating || !playerName.trim()}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting to Server...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Room Code</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-2 space-y-5">
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                    Your Room Code
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-3xl font-black tracking-widest text-emerald-400">
                      {createdRoomCode}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                      title="Copy Code"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Waiting for opponent to join...</span>
                </div>

                <p className="text-xs text-slate-500">
                  Send this code to your friend. The match starts automatically as soon as they enter it!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Join Room */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Enter 6-Letter Room Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. K9X2M1"
                className="w-full text-center tracking-widest uppercase font-mono text-xl py-3 px-4 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              {joinError && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-300 flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{joinError}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 text-center">
              You will join this match and play as <strong className="text-white">Black</strong>.
            </p>

            <button
              type="submit"
              disabled={inputCode.trim().length < 4 || !playerName.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Join Match</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Server connection indicator at bottom */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Server:</span>
          <span className="font-mono text-slate-400 truncate max-w-[200px]">{socketService.serverUrl}</span>
        </div>
      </div>
    </div>
  );
};
