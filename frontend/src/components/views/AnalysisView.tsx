import React, { useEffect, useState } from 'react';
import { parsePGN, ParsedPGN } from '../../chess-logic/pgn';
import { analysisService, GameAnalysisSummary, MoveClassification } from '../../services/analysis.service';
import { ChessBoard } from '../board/ChessBoard';
import { ChevronLeft, ChevronRight, Activity, ArrowLeft, Loader2, FastForward, Rewind } from 'lucide-react';
import { FENChar } from '../../chess-logic/models';
import { BoardThemeId, PieceSetId } from '../../config/theme.config';
import { Chess } from 'chess.js';

interface AnalysisViewProps {
  pgn: string;
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  onBack: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ pgn, boardTheme, pieceSet, onBack }) => {
  const [parsedPgn, setParsedPgn] = useState<ParsedPGN | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysisSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0); // 0 = start position
  const [boardView, setBoardView] = useState<(FENChar | null)[][]>([]);
  
  useEffect(() => {
    const parsed = parsePGN(pgn);
    if (!parsed.valid) {
      alert("Error parsing PGN: " + parsed.error);
      onBack();
      return;
    }
    setParsedPgn(parsed);
    setCurrentMoveIndex(parsed.fenHistory.length - 1); // Go to end of game by default
    updateBoardFromFen(parsed.fenHistory[parsed.fenHistory.length - 1]);
    
    // Start Analysis
    setIsAnalyzing(true);
    analysisService.analyzeGame(parsed.fenHistory, 12).then(result => {
      setAnalysis(result);
      setIsAnalyzing(false);
    }).catch(err => {
      console.error("Analysis failed", err);
      setIsAnalyzing(false);
    });

    return () => {
      analysisService.terminate();
    };
  }, [pgn, onBack]);

  const updateBoardFromFen = (fen: string) => {
    const chess = new Chess(fen);
    const board = chess.board();
    const newBoardView = board.map(row => 
      row.map(piece => {
        if (!piece) return null;
        const colorPrefix = piece.color === 'w' ? 'w' : 'b';
        return `${colorPrefix}${piece.type.toUpperCase()}` as FENChar;
      })
    );
    setBoardView(newBoardView);
  };

  const handleMoveChange = (index: number) => {
    if (!parsedPgn) return;
    const boundedIndex = Math.max(0, Math.min(index, parsedPgn.fenHistory.length - 1));
    setCurrentMoveIndex(boundedIndex);
    updateBoardFromFen(parsedPgn.fenHistory[boundedIndex]);
  };

  const getClassificationColor = (classification: MoveClassification) => {
    switch (classification) {
      case MoveClassification.Best: return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case MoveClassification.Excellent: return 'text-green-400 bg-green-400/10 border-green-400/20';
      case MoveClassification.Good: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case MoveClassification.Inaccuracy: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case MoveClassification.Mistake: return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case MoveClassification.Blunder: return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const currentAnalysis = analysis?.moveAnalyses[currentMoveIndex - 1]; // currentMoveIndex 0 is start pos, index 1 is first move

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col">
      <div className="mb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start justify-center">
        {/* Left: Game Info & Accuracy */}
        <div className="w-full lg:w-[300px] flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Game Review
            </h3>
            
            {parsedPgn && (
              <div className="mb-6 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">White</span>
                  <span className="font-semibold text-slate-200">{parsedPgn.metadata.White || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Black</span>
                  <span className="font-semibold text-slate-200">{parsedPgn.metadata.Black || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Result</span>
                  <span className="font-semibold text-indigo-400">{parsedPgn.result}</span>
                </div>
              </div>
            )}

            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
                <span className="text-sm">Stockfish is analyzing...</span>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">White Accuracy</div>
                  <div className="text-3xl font-bold text-emerald-400">{analysis.whiteAccuracy}%</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Black Accuracy</div>
                  <div className="text-3xl font-bold text-emerald-400">{analysis.blackAccuracy}%</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Center: Board */}
        <div className="flex flex-col items-center flex-shrink-0 w-full max-w-[95vw] sm:max-w-[560px]">
          <ChessBoard
            boardView={boardView}
            selectedSquare={null}
            safeSquares={[]}
            lastMove={undefined}
            checkState={{ isInCheck: false, checkKingSquare: null }}
            isFlipped={false}
            onSquareClick={() => {}}
            boardTheme={boardTheme}
            pieceSet={pieceSet}
            disabled={true}
          />
          
          {/* Controls */}
          <div className="w-full flex items-center justify-center gap-2 mt-4 bg-slate-900 border border-slate-800 p-2 rounded-xl shadow-lg">
            <button 
              onClick={() => handleMoveChange(0)}
              disabled={currentMoveIndex === 0}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Rewind className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleMoveChange(currentMoveIndex - 1)}
              disabled={currentMoveIndex === 0}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-sm font-mono text-slate-300 w-16 text-center">
              {currentMoveIndex} / {parsedPgn?.fenHistory.length ? parsedPgn.fenHistory.length - 1 : 0}
            </span>
            <button 
              onClick={() => handleMoveChange(currentMoveIndex + 1)}
              disabled={!parsedPgn || currentMoveIndex === parsedPgn.fenHistory.length - 1}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button 
              onClick={() => handleMoveChange(parsedPgn ? parsedPgn.fenHistory.length - 1 : 0)}
              disabled={!parsedPgn || currentMoveIndex === parsedPgn.fenHistory.length - 1}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <FastForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right: Move Details */}
        <div className="w-full lg:w-[300px] flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl h-[400px] flex flex-col">
            <h3 className="font-bold text-white mb-4 border-b border-slate-800 pb-2">Position Details</h3>
            
            {currentMoveIndex === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center px-4">
                Starting position. Use the arrows to navigate through the game.
              </div>
            ) : currentAnalysis ? (
              <div className="flex flex-col gap-4">
                <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${getClassificationColor(currentAnalysis.classification)}`}>
                  <span className="text-xs uppercase tracking-wider mb-1 opacity-80">Move Classification</span>
                  <span className="text-2xl font-bold">{currentAnalysis.classification}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase">Eval Before</span>
                    <span className="font-mono text-sm text-slate-300">
                      {currentAnalysis.mate !== undefined 
                        ? `M${currentAnalysis.mate}` 
                        : (currentAnalysis.evaluationBefore / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase">Eval After</span>
                    <span className="font-mono text-sm text-slate-300">
                      {currentAnalysis.mate !== undefined 
                        ? `M${currentAnalysis.mate}` 
                        : (currentAnalysis.evaluationAfter / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Best Move Rec.</span>
                  <span className="font-mono text-sm text-indigo-400 font-bold">{currentAnalysis.bestMoveUci}</span>
                </div>
              </div>
            ) : isAnalyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                Analyzing position...
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                No analysis available for this move.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
