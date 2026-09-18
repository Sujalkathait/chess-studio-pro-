import React, { useEffect, useState, useRef } from 'react';
import { apiService, GameRecord } from '../../services/api.service';
import { Upload, Download, Search, Play, Activity } from 'lucide-react';
import { parsePGN } from '../../chess-logic/pgn';

interface GameHistoryViewProps {
  onAnalyze: (pgn: string) => void;
  onReplay: (pgn: string) => void;
}

export const GameHistoryView: React.FC<GameHistoryViewProps> = ({ onAnalyze, onReplay }) => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pgnInput, setPgnInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    try {
      const history = await apiService.getGames();
      setGames(history);
      setError(null);
    } catch (err) {
      setError('Failed to load game history.');
    } finally {
      setLoading(false);
    }
  };

  const handlePgnImport = () => {
    if (!pgnInput.trim()) return;
    
    const parsed = parsePGN(pgnInput);
    if (!parsed.valid) {
      alert(`Invalid PGN: ${parsed.error}`);
      return;
    }
    
    onAnalyze(pgnInput);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPgnInput(content);
    };
    reader.readAsText(file);
  };

  const downloadPgn = (game: GameRecord) => {
    const blob = new Blob([game.pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess_game_${game.id || Date.now()}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Game Library</h2>
          <p className="text-slate-400">Review your past games and analyze your performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main History List */}
        <div className="lg:col-span-2 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-200">Recent Games</h3>
            <button onClick={loadGames} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Refresh
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[600px] p-2">
            {loading ? (
              <div className="flex justify-center items-center h-40 text-slate-500">Loading games...</div>
            ) : error ? (
              <div className="flex justify-center items-center h-40 text-red-400">{error}</div>
            ) : games.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-40 text-slate-500">
                <Search className="w-8 h-8 mb-2 opacity-20" />
                <p>No games found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {games.map((game, i) => (
                  <div key={game.id || i} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/50 group">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0 w-full sm:w-auto">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-900 border border-slate-700">
                        <span className="text-xs font-bold text-slate-300">{game.result}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-200">{game.white_player}</span>
                          <span className="text-slate-500 text-xs">vs</span>
                          <span className="font-semibold text-slate-200">{game.black_player}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{game.game_mode}</span>
                          <span>•</span>
                          <span>{game.moves_count} moves</span>
                          {game.created_at && (
                            <>
                              <span>•</span>
                              <span>{new Date(game.created_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button 
                        onClick={() => onAnalyze(game.pgn)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Analyze
                      </button>
                      <button 
                        onClick={() => downloadPgn(game)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Download PGN"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              Import Game
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Paste a PGN string or upload a .pgn file to analyze games from chess.com, lichess, or OTB tournaments.
            </p>
            
            <textarea 
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
              placeholder="Paste PGN here..."
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 font-mono resize-none focus:outline-none focus:border-indigo-500 transition-colors mb-4"
            />
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={handlePgnImport}
                disabled={!pgnInput.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Analyze PGN
              </button>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept=".pgn"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-colors border border-slate-700"
                >
                  Upload .pgn File
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
