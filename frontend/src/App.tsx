import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChessBoard as ChessEngine } from './chess-logic/chess-board';
import {
  Color,
  Coords,
  FENChar,
  LastMove,
  CheckState,
  MoveList as MoveListType,
  GameHistory,
} from './chess-logic/models';
import { soundService } from './services/soundService';
import { stockfishService, ChessMove } from './services/stockfish.service';
import { socketService, OnlineMovePayload } from './services/socketService';
import { apiService, GameRecord } from './services/api.service';
import { generatePGN } from './chess-logic/pgn';
import { Navbar } from './components/Navbar';
import { ChessBoard } from './components/ChessBoard';
import { MoveList } from './components/MoveList';
import { GameHistoryView } from './components/History/GameHistoryView';
import { AnalysisView } from './components/Analysis/AnalysisView';
import { DifficultyModal } from './components/DifficultySelector/DifficultyModal';
import { PromotionModal } from './components/PromotionModal';
import { GameOverModal } from './components/GameOverModal';
import { RoomCodeModal } from './components/RoomCode/RoomCodeModal';
import { ExitConfirmModal } from './components/GameControls/ExitConfirmModal';
import { ThemeModal } from './components/ThemeSelector/ThemeModal';
import { BoardThemeId, PieceSetId } from './config/theme.config';

export const App: React.FC = () => {
  // Engine reference
  const engineRef = useRef<ChessEngine>(new ChessEngine());
  const hasSavedGame = useRef<boolean>(false);

  // Game UI state
  const [boardView, setBoardView] = useState<(FENChar | null)[][]>(() => engineRef.current.chessBoardView);
  const [playerColor, setPlayerColor] = useState<Color>(() => engineRef.current.playerColor);
  const [safeSquaresMap, setSafeSquaresMap] = useState(() => engineRef.current.safeSquares);
  const [selectedSquare, setSelectedSquare] = useState<{ x: number; y: number; piece: FENChar } | null>(null);
  const [pieceSafeSquares, setPieceSafeSquares] = useState<Coords[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | undefined>(() => engineRef.current.lastMove);
  const [checkState, setCheckState] = useState<CheckState>(() => engineRef.current.checkState);
  const [gameOverMessage, setGameOverMessage] = useState<string | undefined>(undefined);
  const [moveList, setMoveList] = useState<MoveListType>([]);
  const [gameHistory, setGameHistory] = useState<GameHistory>(() => engineRef.current.gameHistory);
  const [gameHistoryPointer, setGameHistoryPointer] = useState<number>(0);

  // App Navigation
  const [currentView, setCurrentView] = useState<'play' | 'history' | 'analysis'>('play');
  const [analysisPgn, setAnalysisPgn] = useState<string | null>(null);

  // Settings & Modes
  const [gameMode, setGameMode] = useState<'friend' | 'computer' | 'online'>('computer');
  const [computerConfig, setComputerConfig] = useState<{ color: Color; level: number }>({
    color: Color.Black,
    level: 2,
  });
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundService.isMuted());
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Online Multiplayer State (6-Digit Room Code)
  const [onlineRoomCode, setOnlineRoomCode] = useState<string | null>(null);
  const [onlineDisplayCode, setOnlineDisplayCode] = useState<string | null>(null);
  const [onlinePlayerColor, setOnlinePlayerColor] = useState<Color | null>(null);
  const [onlineWhiteName, setOnlineWhiteName] = useState<string>('White');
  const [onlineBlackName, setOnlineBlackName] = useState<string>('Black');
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [roomExpiresAt, setRoomExpiresAt] = useState<number | null>(null);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [drawOfferedByOpponent, setDrawOfferedByOpponent] = useState<boolean>(false);

  // Modals & Customization
  const [isComputerModalOpen, setIsComputerModalOpen] = useState<boolean>(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState<boolean>(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState<boolean>(false);
  const [promotionCoords, setPromotionCoords] = useState<Coords | null>(null);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  // Board Theme & Piece Set State (with persistence)
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>(() => {
    return (typeof localStorage !== 'undefined' && (localStorage.getItem('chess_board_theme') as BoardThemeId)) || 'green';
  });
  const [pieceSet, setPieceSet] = useState<PieceSetId>(() => {
    return (typeof localStorage !== 'undefined' && (localStorage.getItem('chess_piece_set') as PieceSetId)) || 'cburnett';
  });

  const handleSelectBoardTheme = (themeId: BoardThemeId) => {
    setBoardTheme(themeId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chess_board_theme', themeId);
    }
  };

  const handleSelectPieceSet = (setId: PieceSetId) => {
    setPieceSet(setId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chess_piece_set', setId);
    }
  };

  // Subscribe to Stockfish Worker thinking state & cleanup on unmount
  useEffect(() => {
    const unsubscribe = stockfishService.onThinkingChange((thinking) => {
      setIsAiThinking(thinking);
    });
    return () => {
      unsubscribe();
      stockfishService.terminate(); // Full Worker cleanup on unmount
    };
  }, []);

  // Synchronize board UI from engine
  const syncFromEngine = useCallback(() => {
    const engine = engineRef.current;
    setBoardView([...engine.chessBoardView.map((row) => [...row])]);
    setPlayerColor(engine.playerColor);
    setSafeSquaresMap(engine.safeSquares);
    setLastMove(engine.lastMove);
    setCheckState(engine.checkState);
    setGameOverMessage(engine.gameOverMessage);
    setMoveList([...engine.moveList]);
    setGameHistory([...engine.gameHistory]);
    setGameHistoryPointer(engine.gameHistory.length - 1);
    setSelectedSquare(null);
    setPieceSafeSquares([]);

    if (engine.isGameOver) {
      setIsGameOverModalOpen(true);
      stockfishService.cancelSearch();

      if (!hasSavedGame.current) {
        hasSavedGame.current = true;
        
        let result = "*";
        if (engine.gameOverMessage?.includes("White won")) result = "1-0";
        else if (engine.gameOverMessage?.includes("Black won")) result = "0-1";
        else if (engine.gameOverMessage?.includes("Draw") || engine.gameOverMessage?.includes("Stalemate")) result = "1/2-1/2";

        const pgn = generatePGN(engine.moveList, {
          White: gameMode === 'computer' && computerConfig.color === Color.White ? `Stockfish Lv${computerConfig.level}` : (gameMode === 'online' ? onlineWhiteName : (playerColor === Color.White ? 'Player' : 'Player 2')),
          Black: gameMode === 'computer' && computerConfig.color === Color.Black ? `Stockfish Lv${computerConfig.level}` : (gameMode === 'online' ? onlineBlackName : (playerColor === Color.Black ? 'Player' : 'Player 2')),
          Result: result,
          Event: `${gameMode} match`,
        });

        const gameRecord: GameRecord = {
          white_player: gameMode === 'computer' && computerConfig.color === Color.White ? `Stockfish Lv${computerConfig.level}` : (gameMode === 'online' ? onlineWhiteName : (playerColor === Color.White ? 'Player' : 'Player 2')),
          black_player: gameMode === 'computer' && computerConfig.color === Color.Black ? `Stockfish Lv${computerConfig.level}` : (gameMode === 'online' ? onlineBlackName : (playerColor === Color.Black ? 'Player' : 'Player 2')),
          result: result,
          game_mode: gameMode,
          ai_difficulty: gameMode === 'computer' ? computerConfig.level : undefined,
          moves_count: engine.moveList.length,
          pgn: pgn
        };

        apiService.saveGame(gameRecord).then(saved => {
          if (saved) console.log('✅ Auto-saved game record:', saved.id);
        });
      }
    }
  }, [gameMode, computerConfig, onlineWhiteName, onlineBlackName, playerColor]);

  // Start fresh game
  const startNewGame = useCallback(
    (
      mode: 'friend' | 'computer' | 'online' = gameMode,
      aiConfig?: { color: Color; level: number },
      onlineSide?: Color
    ) => {
      stockfishService.cancelSearch();
      engineRef.current = new ChessEngine();
      setGameMode(mode);
      setIsGameOverModalOpen(false);
      setIsPromotionModalOpen(false);
      setIsExitModalOpen(false);
      setPromotionCoords(null);
      setIsAiThinking(false);
      setDrawOfferedByOpponent(false);

      if (mode === 'computer' && aiConfig) {
        setComputerConfig(aiConfig);
        setIsFlipped(aiConfig.color === Color.White);
        stockfishService.resetNewGame();
      } else if (mode === 'online' && onlineSide !== undefined) {
        setOnlinePlayerColor(onlineSide);
        setIsFlipped(onlineSide === Color.Black);
      } else {
        setIsFlipped(false);
      }
      
      hasSavedGame.current = false;
      syncFromEngine();
    },
    [gameMode, syncFromEngine]
  );

  // Execute a move on the engine
  const executeMove = useCallback(
    (
      prevX: number,
      prevY: number,
      newX: number,
      newY: number,
      promotedPiece: FENChar | null,
      isRemote: boolean = false
    ) => {
      const engine = engineRef.current;
      engine.move(prevX, prevY, newX, newY, promotedPiece);
      syncFromEngine();
      soundService.playMoveSound(engine.lastMove?.moveType);

      // If online move made locally, broadcast authoritative move payload to server
      if (!isRemote && gameMode === 'online' && onlineRoomCode) {
        const movePayload: OnlineMovePayload = {
          prevX,
          prevY,
          newX,
          newY,
          promotedPiece,
        };
        socketService.sendMove(onlineRoomCode, movePayload, engine.boardAsFEN);
      }
    },
    [syncFromEngine, gameMode, onlineRoomCode]
  );

  // ----------------------------------------------------------------
  // Online Multiplayer Socket Event Listeners
  // ----------------------------------------------------------------
  useEffect(() => {
    const socket = socketService.getSocket();

    const onGameStart = ({
      roomCode,
      displayCode,
      whitePlayer,
      whitePlayerName,
      blackPlayerName,
    }: {
      roomCode: string;
      displayCode?: string;
      whitePlayer: string;
      whitePlayerName: string;
      blackPlayerName: string;
    }) => {
      console.log('⚔️ Game started in room:', roomCode);
      const isWhite = socket.id === whitePlayer;
      const assignedColor = isWhite ? Color.White : Color.Black;

      setOnlineRoomCode(roomCode);
      setOnlineDisplayCode(displayCode || `${roomCode.slice(0, 3)} ${roomCode.slice(3)}`);
      setOnlinePlayerColor(assignedColor);
      setOnlineWhiteName(whitePlayerName);
      setOnlineBlackName(blackPlayerName);
      setIsWaitingForOpponent(false);
      setIsOnlineModalOpen(false);
      startNewGame('online', undefined, assignedColor);
    };

    const onOpponentMove = ({ move }: { move: any }) => {
      console.log('♟️ Authoritative move from server:', move);
      if (typeof move.prevX === 'number' && typeof move.newX === 'number') {
        executeMove(move.prevX, move.prevY, move.newX, move.newY, move.promotedPiece, true);
      } else if (move.from && move.to) {
        // Handle algebraic format
        const fromY = move.from.charCodeAt(0) - 'a'.charCodeAt(0);
        const fromX = Number(move.from[1]) - 1;
        const toY = move.to.charCodeAt(0) - 'a'.charCodeAt(0);
        const toX = Number(move.to[1]) - 1;
        let promo = null;
        if (move.promotion) {
          promo = engineRef.current.playerColor === Color.White ? FENChar.WhiteQueen : FENChar.BlackQueen;
        }
        executeMove(fromX, fromY, toX, toY, promo, true);
      }
    };

    const onGameOver = ({ winner, reason }: { winner: string; reason: string }) => {
      engineRef.current.gameOverMessage = reason;
      syncFromEngine();
      setIsGameOverModalOpen(true);
    };

    const onDrawOffered = () => {
      setDrawOfferedByOpponent(true);
    };

    const onDrawDeclined = () => {
      alert('Your opponent declined the draw offer.');
    };

    const onRematchStart = ({ whitePlayer, whitePlayerName, blackPlayerName }: { whitePlayer: string; whitePlayerName: string; blackPlayerName: string }) => {
      const isWhite = socket.id === whitePlayer;
      const assignedColor = isWhite ? Color.White : Color.Black;
      setOnlineWhiteName(whitePlayerName);
      setOnlineBlackName(blackPlayerName);
      startNewGame('online', undefined, assignedColor);
    };

    const onOpponentDisconnected = () => {
      alert('Your opponent disconnected from the match.');
    };

    const onOpponentLeft = () => {
      alert('Your opponent left the game.');
      startNewGame('friend');
    };

    const onRoomExpired = () => {
      setJoinError('Room code expired.');
      setCreatedRoomCode(null);
      setRoomExpiresAt(null);
      setOnlineRoomCode(null);
      setOnlineDisplayCode(null);
    };

    socket.on('game_start', onGameStart);
    socket.on('opponent_move', onOpponentMove);
    socket.on('game_over', onGameOver);
    socket.on('draw_offered', onDrawOffered);
    socket.on('draw_declined', onDrawDeclined);
    socket.on('rematch_start', onRematchStart);
    socket.on('opponent_disconnected', onOpponentDisconnected);
    socket.on('opponent_left', onOpponentLeft);

    return () => {
      socket.off('game_start', onGameStart);
      socket.off('opponent_move', onOpponentMove);
      socket.off('game_over', onGameOver);
      socket.off('draw_offered', onDrawOffered);
      socket.off('draw_declined', onDrawDeclined);
      socket.off('rematch_start', onRematchStart);
      socket.off('opponent_disconnected', onOpponentDisconnected);
      socket.off('opponent_left', onOpponentLeft);
      socket.off('room_expired', onRoomExpired);
    };
  }, [startNewGame, executeMove, syncFromEngine]);

  // Online Room Handlers
  const handleCreateOnlineRoom = async (playerName: string, pin?: string) => {
    setIsCreatingRoom(true);
    setCreateRoomError(null);
    try {
      const res = await socketService.createRoom(playerName, pin);
      if (res.success && res.roomCode) {
        setCreatedRoomCode(res.roomCode);
        setRoomExpiresAt(res.expiresAt || null);
        setOnlineRoomCode(res.roomCode);
        setOnlineDisplayCode(res.displayCode || `${res.roomCode.slice(0, 3)} ${res.roomCode.slice(3)}`);
        setOnlinePlayerColor(Color.White);
        setIsWaitingForOpponent(true);
      } else {
        setCreateRoomError(res.message || 'Failed to generate room code.');
      }
    } catch (err: any) {
      setCreateRoomError(err.message || 'Connection error');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinOnlineRoom = async (code: string, playerName: string, pin?: string) => {
    setJoinError(null);
    setIsLockedOut(false);
    const res = await socketService.joinRoom(code, playerName, pin);
    if (res.success && res.roomCode) {
      setOnlineRoomCode(res.roomCode);
      setOnlineDisplayCode(res.displayCode || `${res.roomCode.slice(0, 3)} ${res.roomCode.slice(3)}`);
      setOnlinePlayerColor(Color.Black);
      setIsOnlineModalOpen(false);
      startNewGame('online', undefined, Color.Black);
    } else {
      setJoinError(res.message || 'Failed to join room. Please check the 6-digit code.');
      if (res.isLockedOut) {
        setIsLockedOut(true);
      }
    }
  };

  // Fallback random legal move for AI in unexpected edge cases
  const executeRandomAiMove = useCallback(() => {
    const engine = engineRef.current;
    const entries = Array.from(engine.safeSquares.entries());
    const validPieces = entries.filter(([_, coords]) => coords.length > 0);
    if (validPieces.length === 0) return;

    const randomPiece = validPieces[Math.floor(Math.random() * validPieces.length)];
    const [prevX, prevY] = randomPiece[0].split(',').map(Number);
    const targetCoords = randomPiece[1][Math.floor(Math.random() * randomPiece[1].length)];

    let promotedPiece: FENChar | null = null;
    const piece = engine.chessBoardView[prevX][prevY];
    if (
      (piece === FENChar.WhitePawn && targetCoords.x === 7) ||
      (piece === FENChar.BlackPawn && targetCoords.x === 0)
    ) {
      promotedPiece = engine.playerColor === Color.White ? FENChar.WhiteQueen : FENChar.BlackQueen;
    }

    executeMove(prevX, prevY, targetCoords.x, targetCoords.y, promotedPiece);
  }, [executeMove]);

  // Fast Stockfish Web Worker response effect
  useEffect(() => {
    const engine = engineRef.current;
    if (
      gameMode !== 'computer' ||
      engine.isGameOver ||
      engine.playerColor !== computerConfig.color ||
      isAiThinking
    ) {
      return;
    }

    let isSubscribed = true;

    // Small dispatch tick so board UI renders the human's move first
    const timer = setTimeout(async () => {
      try {
        const bestMove: ChessMove | null = await stockfishService.getBestMove(
          engine.boardAsFEN,
          computerConfig.level,
          computerConfig.color
        );

        if (!isSubscribed) return;

        if (bestMove) {
          executeMove(
            bestMove.prevX,
            bestMove.prevY,
            bestMove.newX,
            bestMove.newY,
            bestMove.promotedPiece
          );
        } else {
          executeRandomAiMove();
        }
      } catch (err) {
        console.error('Stockfish calculation error:', err);
        if (isSubscribed) executeRandomAiMove();
      }
    }, 50);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [gameMode, playerColor, computerConfig, isAiThinking, executeMove, executeRandomAiMove]);

  // Board square click handler
  const handleSquareClick = useCallback(
    (x: number, y: number) => {
      const engine = engineRef.current;

      if (engine.isGameOver || isAiThinking) return;

      // In computer mode, only human plays
      if (gameMode === 'computer' && engine.playerColor === computerConfig.color) return;

      // In online mode, only allow clicks on player's assigned turn
      if (
        gameMode === 'online' &&
        onlinePlayerColor !== null &&
        engine.playerColor !== onlinePlayerColor
      ) {
        return;
      }

      // If viewing past move, return to latest position on click
      if (gameHistoryPointer !== engine.gameHistory.length - 1) {
        setGameHistoryPointer(engine.gameHistory.length - 1);
        setBoardView([...engine.chessBoardView.map((row) => [...row])]);
        setLastMove(engine.lastMove);
        setCheckState(engine.checkState);
        return;
      }

      const clickedPiece = engine.chessBoardView[x][y];
      const isCurrentPlayerPiece =
        clickedPiece !== null &&
        ((engine.playerColor === Color.White && clickedPiece === clickedPiece.toUpperCase()) ||
          (engine.playerColor === Color.Black && clickedPiece === clickedPiece.toLowerCase()));

      // 1. If no piece selected yet:
      if (!selectedSquare) {
        if (isCurrentPlayerPiece) {
          setSelectedSquare({ x, y, piece: clickedPiece });
          setPieceSafeSquares(safeSquaresMap.get(`${x},${y}`) || []);
        }
        return;
      }

      // 2. If same square clicked, deselect:
      if (selectedSquare.x === x && selectedSquare.y === y) {
        setSelectedSquare(null);
        setPieceSafeSquares([]);
        return;
      }

      // 3. Check if target square is a safe move:
      const isSafeTarget = pieceSafeSquares.some((c) => c.x === x && c.y === y);

      if (isSafeTarget) {
        const isPawn =
          selectedSquare.piece === FENChar.WhitePawn || selectedSquare.piece === FENChar.BlackPawn;
        const isLastRank = isPawn && (x === 7 || x === 0);

        if (isLastRank) {
          setPromotionCoords({ x, y });
          setIsPromotionModalOpen(true);
          return;
        }

        executeMove(selectedSquare.x, selectedSquare.y, x, y, null);
        return;
      }

      // 4. If clicking another piece of the current player, switch selection:
      if (isCurrentPlayerPiece) {
        setSelectedSquare({ x, y, piece: clickedPiece });
        setPieceSafeSquares(safeSquaresMap.get(`${x},${y}`) || []);
        return;
      }

      // 5. Otherwise, click on empty invalid square -> deselect
      setSelectedSquare(null);
      setPieceSafeSquares([]);
    },
    [
      selectedSquare,
      pieceSafeSquares,
      safeSquaresMap,
      gameMode,
      computerConfig,
      onlinePlayerColor,
      isAiThinking,
      gameHistoryPointer,
      executeMove,
    ]
  );

  // Handle Pawn Promotion choice
  const handleSelectPromotionPiece = (piece: FENChar) => {
    if (!selectedSquare || !promotionCoords) return;
    executeMove(
      selectedSquare.x,
      selectedSquare.y,
      promotionCoords.x,
      promotionCoords.y,
      piece
    );
    setIsPromotionModalOpen(false);
    setPromotionCoords(null);
  };

  // Navigate to historic board position
  const handleNavigateHistory = useCallback((pointer: number) => {
    const engine = engineRef.current;
    if (pointer < 0 || pointer >= engine.gameHistory.length) return;

    const historical = engine.gameHistory[pointer];
    setGameHistoryPointer(pointer);
    setBoardView(historical.board);
    setLastMove(historical.lastMove);
    setCheckState(historical.checkState);
    setSelectedSquare(null);
    setPieceSafeSquares([]);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setGameHistoryPointer((curr) => {
          const prev = Math.max(0, curr - 1);
          handleNavigateHistory(prev);
          return prev;
        });
      } else if (e.key === 'ArrowRight') {
        const max = engineRef.current.gameHistory.length - 1;
        setGameHistoryPointer((curr) => {
          const next = Math.min(max, curr + 1);
          handleNavigateHistory(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNavigateHistory]);

  // Toggle Sound
  const handleToggleSound = () => {
    const nextMute = soundService.toggleMute();
    setIsMuted(nextMute);
  };

  // Resign handler
  const handleResign = () => {
    if (engineRef.current.isGameOver) return;
    const confirmResign = window.confirm('Are you sure you want to resign this game?');
    if (!confirmResign) return;

    if (gameMode === 'online' && onlineRoomCode) {
      socketService.resign(onlineRoomCode);
    } else {
      const winner = playerColor === Color.White ? 'Black' : 'White';
      engineRef.current.gameOverMessage = `${playerColor === Color.White ? 'White' : 'Black'} resigned. ${winner} wins!`;
      // Manually trigger gameOver in engine so the sync picks it up
      (engineRef.current as any)._isGameOver = true;
      syncFromEngine();
      setIsGameOverModalOpen(true);
    }
  };

  // Draw Offer handler
  const handleOfferDraw = () => {
    if (gameMode === 'online' && onlineRoomCode) {
      socketService.offerDraw(onlineRoomCode);
      alert('Draw offer sent to opponent.');
    }
  };

  // Exit / Back Button clicked
  const handleExitClick = () => {
    if (moveList.length > 0 && !engineRef.current.isGameOver) {
      setIsExitModalOpen(true);
    } else {
      // Direct reset
      stockfishService.cancelSearch();
      if (gameMode === 'online') {
        socketService.leaveRoom(onlineRoomCode || undefined);
      }
      setOnlineRoomCode(null);
      setOnlineDisplayCode(null);
      startNewGame('friend');
    }
  };

  const handleConfirmExit = () => {
    setIsExitModalOpen(false);
    stockfishService.cancelSearch();
    if (gameMode === 'online') {
      socketService.leaveRoom(onlineRoomCode || undefined);
    }
    setOnlineRoomCode(null);
    setOnlineDisplayCode(null);
    startNewGame('friend');
  };

  const isGameActive = moveList.length > 0 && gameOverMessage === undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Navigation Bar */}
      <Navbar
        gameMode={gameMode}
        onSelectMode={(mode) => {
          if (mode === 'computer') {
            setIsComputerModalOpen(true);
          } else if (mode === 'online') {
            setIsOnlineModalOpen(true);
          } else {
            setOnlineRoomCode(null);
            setOnlineDisplayCode(null);
            setOnlinePlayerColor(null);
            startNewGame('friend');
          }
        }}
        onNewGame={() => startNewGame()}
        onExitGame={handleExitClick}
        onFlipBoard={() => setIsFlipped((prev) => !prev)}
        onResign={handleResign}
        onOfferDraw={handleOfferDraw}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        isFlipped={isFlipped}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
        computerLevel={computerConfig.level}
        playerColor={playerColor}
        onlineRoomCode={onlineRoomCode}
        onlineDisplayCode={onlineDisplayCode}
        isAiThinking={isAiThinking}
        isGameActive={isGameActive}
        currentView={currentView}
        onNavigateView={(view) => setCurrentView(view)}
      />

      {/* Draw Offer Notification Banner (Online) */}
      {drawOfferedByOpponent && (
        <div className="w-full bg-indigo-900/90 border-b border-indigo-700 py-2.5 px-4 text-center flex items-center justify-center gap-3 text-xs text-white animate-fadeIn">
          <span>🤝 Your opponent has offered a draw. Accept?</span>
          <button
            onClick={() => {
              if (onlineRoomCode) socketService.respondDraw(onlineRoomCode, true);
              setDrawOfferedByOpponent(false);
            }}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold"
          >
            Accept Draw
          </button>
          <button
            onClick={() => {
              if (onlineRoomCode) socketService.respondDraw(onlineRoomCode, false);
              setDrawOfferedByOpponent(false);
            }}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold"
          >
            Decline
          </button>
        </div>
      )}

      {/* Main Play Arena */}
      {currentView === 'play' && (
        <main className="flex-1 w-full mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">
          {/* Chess Board Container */}
          <div className="flex flex-col items-center justify-center w-full max-w-[95vw] sm:max-w-[560px] flex-shrink-0">
            <ChessBoard
              boardView={boardView}
              selectedSquare={selectedSquare}
              safeSquares={pieceSafeSquares}
              lastMove={lastMove}
              checkState={checkState}
              isFlipped={isFlipped}
              onSquareClick={handleSquareClick}
              boardTheme={boardTheme}
              pieceSet={pieceSet}
              disabled={
                isAiThinking ||
                (gameMode === 'online' &&
                  onlinePlayerColor !== null &&
                  playerColor !== onlinePlayerColor)
              }
            />
          </div>

          {/* Move History and Game Controls Panel */}
          <div className="w-full max-w-[95vw] lg:w-[400px] flex-shrink-0 flex justify-center mb-6 lg:mb-0">
            <MoveList
              moveList={moveList}
              gameHistoryPointer={gameHistoryPointer}
              gameHistoryLength={gameHistory.length}
              onNavigateHistory={handleNavigateHistory}
              playerColor={playerColor}
              gameOverMessage={gameOverMessage}
              isAiThinking={isAiThinking}
              boardView={boardView}
              computerLevel={computerConfig.level}
              gameMode={gameMode}
              pieceSet={pieceSet}
            />
          </div>
        </main>
      )}

      {currentView === 'history' && (
        <GameHistoryView 
          onAnalyze={(pgn) => {
            setAnalysisPgn(pgn);
            setCurrentView('analysis');
          }}
          onReplay={(pgn) => {
             // For replay we can implement later, for now route to analysis
             setAnalysisPgn(pgn);
             setCurrentView('analysis');
          }}
        />
      )}

      {currentView === 'analysis' && analysisPgn && (
        <AnalysisView 
          pgn={analysisPgn}
          boardTheme={boardTheme}
          pieceSet={pieceSet}
          onBack={() => setCurrentView('history')}
        />
      )}

      {/* Footer */}
      <footer className="w-full py-3 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/70">
        <p>Chess Studio Pro • Web Worker Stockfish AI & Authoritative 6-Digit Online Multiplayer</p>
      </footer>

      {/* Modals */}
      <DifficultyModal
        isOpen={isComputerModalOpen}
        onClose={() => setIsComputerModalOpen(false)}
        onStartGame={(level, color) => {
          setIsComputerModalOpen(false);
          startNewGame('computer', {
            level,
            color: color === Color.White ? Color.Black : Color.White,
          });
        }}
        currentLevel={computerConfig.level}
      />

      <RoomCodeModal
        isOpen={isOnlineModalOpen}
        onClose={() => {
          setIsOnlineModalOpen(false);
          setJoinError(null);
          setCreateRoomError(null);
        }}
        onCreateRoom={handleCreateOnlineRoom}
        onJoinRoom={handleJoinOnlineRoom}
        createdRoomCode={createdRoomCode}
        roomExpiresAt={roomExpiresAt}
        displayCode={onlineDisplayCode}
        isWaitingForOpponent={isWaitingForOpponent}
        joinError={joinError}
        createError={createRoomError}
        isCreating={isCreatingRoom}
        isLockedOut={isLockedOut}
        onRoomExpired={() => {
          setCreatedRoomCode(null);
          setRoomExpiresAt(null);
        }}
      />

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirmExit={handleConfirmExit}
        gameMode={gameMode}
      />

      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentBoardTheme={boardTheme}
        currentPieceSet={pieceSet}
        onSelectBoardTheme={handleSelectBoardTheme}
        onSelectPieceSet={handleSelectPieceSet}
      />

      <PromotionModal
        isOpen={isPromotionModalOpen}
        playerColor={playerColor}
        onSelectPiece={handleSelectPromotionPiece}
        pieceSet={pieceSet}
        onCancel={() => {
          setIsPromotionModalOpen(false);
          setPromotionCoords(null);
        }}
      />

      <GameOverModal
        isOpen={isGameOverModalOpen}
        message={gameOverMessage || 'Game concluded'}
        onNewGame={() => startNewGame()}
        onClose={() => setIsGameOverModalOpen(false)}
      />
    </div>
  );
};

export default App;
