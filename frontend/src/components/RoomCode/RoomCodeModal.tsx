import React, { useState } from 'react';
import {
  Globe,
  Copy,
  Check,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Lock,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { socketService } from '../../services/socketService';

interface RoomCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (playerName: string, pin?: string) => void;
  onJoinRoom: (roomCode: string, playerName: string, pin?: string) => void;
  createdRoomCode: string | null;
  roomExpiresAt?: number | null;
  displayCode: string | null;
  isWaitingForOpponent: boolean;
  joinError?: string | null;
  createError?: string | null;
  isCreating?: boolean;
  isLockedOut?: boolean;
  onRoomExpired?: () => void;
}

export const RoomCodeModal: React.FC<RoomCodeModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  createdRoomCode,
  displayCode,
  isWaitingForOpponent,
  joinError,
  createError,
  isCreating = false,
  isLockedOut = false,
  roomExpiresAt,
  onRoomExpired,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [inputCode, setInputCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [inputPin, setInputPin] = useState<string>('');
  const [createPin, setCreatePin] = useState<string>('');
  const [enablePin, setEnablePin] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!roomExpiresAt || !isWaitingForOpponent) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((roomExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && onRoomExpired) {
        onRoomExpired();
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [roomExpiresAt, isWaitingForOpponent, onRoomExpired]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = createdRoomCode || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    if (playerName.trim()) {
      onCreateRoom(playerName.trim(), enablePin && createPin ? createPin : undefined);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.replace(/\s+/g, '').trim();
    if (cleanCode.length === 6 && playerName.trim()) {
      onJoinRoom(cleanCode, playerName.trim(), inputPin.trim() || undefined);
    }
  };

  // Format code input with space: "004 721"
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
    setInputCode(raw);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full mx-4 text-slate-100 overflow-y-auto max-h-[95vh] hide-scrollbar">
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
            <h2 className="text-2xl font-bold text-white tracking-tight">Friend Multiplayer</h2>
            <p className="text-xs text-slate-400">Play live with a simple 6-digit room code</p>
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
              Create 6-Digit Room
            </button>
            <button
              onClick={() => setTab('join')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'join'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enter 6-Digit Code
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
              <div className="py-2">
                <p className="text-sm text-slate-300 mb-4 text-center">
                  Generate a simple 6-digit code to invite a friend. You will play as{' '}
                  <strong className="text-white">White</strong>.
                </p>

                {/* Optional PIN Protection */}
                <div className="mb-5 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Protect with optional PIN</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={enablePin}
                      onChange={(e) => setEnablePin(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
                    />
                  </div>
                  {enablePin && (
                    <div className="mt-3">
                      <input
                        type="text"
                        maxLength={6}
                        value={createPin}
                        onChange={(e) => setCreatePin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 4-6 digit PIN"
                        className="w-full text-center tracking-widest font-mono text-sm py-2 px-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

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
                      <span>Generating Code...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate 6-Digit Room Code</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-2 space-y-5">
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                    Room Code
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-4xl font-black tracking-widest text-emerald-400">
                      {displayCode || (createdRoomCode ? `${createdRoomCode.slice(0, 3)} ${createdRoomCode.slice(3)}` : '')}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                      title="Copy Code"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {copied && (
                    <span className="text-[11px] text-emerald-400 font-medium block mt-1">
                      Copied to clipboard!
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Waiting for opponent to enter code...</span>
                </div>
                
                {timeLeft !== null && (
                  <div className={`text-xs font-semibold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                    Room expires in: {timeLeft}s
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  Share this 6-digit code with your friend. The game will start instantly as soon as they join!
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
                Enter 6-Digit Room Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={handleInputChange}
                placeholder="e.g. 004721"
                className="w-full text-center tracking-widest font-mono text-2xl py-3 px-4 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              {inputCode.length === 6 && (
                <div className="text-center mt-1 text-[11px] text-slate-400 font-mono">
                  Displaying: {inputCode.slice(0, 3)} {inputCode.slice(3)}
                </div>
              )}
            </div>

            {/* PIN field if room is protected */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Room PIN (if required)
              </label>
              <input
                type="text"
                maxLength={6}
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Leave blank if none"
                className="w-full text-center tracking-widest font-mono text-sm py-2 px-3 bg-slate-950/80 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {joinError && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 text-left ${
                  isLockedOut
                    ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                    : 'bg-red-950/60 border-red-800/80 text-red-300'
                }`}
              >
                {isLockedOut ? (
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span>{joinError}</span>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center">
              You will join this match and play as <strong className="text-white">Black</strong>.
            </p>

            <button
              type="submit"
              disabled={inputCode.length !== 6 || isLockedOut || !playerName.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Join Match</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Server status indicator */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Multiplayer Server Ready</span>
          </div>
          <span className="font-mono text-slate-400">1,000,000 Room Codes</span>
        </div>
      </div>
    </div>
  );
};

export default RoomCodeModal;
