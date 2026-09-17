import React, { useState } from 'react';
import { Globe, Copy, Check, X, Loader2, ArrowRight, Sparkles } from 'lucide-react';

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  createdRoomCode: string | null;
  isWaitingForOpponent: boolean;
  joinError?: string | null;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  createdRoomCode,
  isWaitingForOpponent,
  joinError,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!createdRoomCode) return;
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim().length >= 4) {
      onJoinRoom(inputCode.trim().toUpperCase());
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

        {/* Tab 1: Create Room */}
        {tab === 'create' && (
          <div>
            {!createdRoomCode ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-300 mb-6">
                  Create a private room, get a 6-letter room code, and share it with your friend to play. You will play as <strong className="text-white">White</strong>.
                </p>
                <button
                  onClick={onCreateRoom}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Room Code
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
                autoFocus
              />
              {joinError && (
                <p className="text-xs text-red-400 mt-2 font-medium text-center">{joinError}</p>
              )}
            </div>

            <p className="text-xs text-slate-400 text-center">
              You will join this match and play as <strong className="text-white">Black</strong>.
            </p>

            <button
              type="submit"
              disabled={inputCode.trim().length < 4}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Join Match</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
