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
import { stockfishService, ComputerConfiguration } from './services/stockfishService';
import { socketService, OnlineMovePayload } from './services/socketService';
import { Navbar } from './components/Navbar';
import { ChessBoard } from './components/ChessBoard';
import { MoveList } from './components/MoveList';
import { ComputerModal } from './components/ComputerModal';
import { PromotionModal } from './components/PromotionModal';
import { GameOverModal } from './components/GameOverModal';
import { OnlineRoomModal } from './components/OnlineRoomModal';

export const App: React.FC = () => {
  // Engine reference
  const engineRef = useRef<ChessEngine>(new ChessEngine());

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

  // Settings & Modes
  const [gameMode, setGameMode] = useState<'friend' | 'computer' | 'online'>('friend');
  const [computerConfig, setComputerConfig] = useState<ComputerConfiguration>({
    color: Color.Black,
    level: 2,
  });
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundService.isMuted());
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Online Multiplayer State
  const [onlineRoomCode, setOnlineRoomCode] = useState<string | null>(null);
  const [onlinePlayerColor, setOnlinePlayerColor] = useState<Color | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);

  // Modals
  const [isComputerModalOpen, setIsComputerModalOpen] = useState<boolean>(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState<boolean>(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState<boolean>(false);
  const [promotionCoords, setPromotionCoords] = useState<Coords | null>(null);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);

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
    }
  }, []);

  // Start fresh game
  const startNewGame = useCallback((
    mode: 'friend' | 'computer' | 'online' = gameMode,
    aiConfig?: ComputerConfiguration,
    onlineSide?: Color
  ) => {
    engineRef.current = new ChessEngine();
    setGameMode(mode);
    setIsGameOverModalOpen(false);
    setIsPromotionModalOpen(false);
    setPromotionCoords(null);
    setIsAiThinking(false);

    if (mode === 'computer' && aiConfig) {
      setComputerConfig(aiConfig);
      setIsFlipped(aiConfig.color === Color.White);
    } else if (mode === 'online' && onlineSide !== undefined) {
      setOnlinePlayerColor(onlineSide);
      setIsFlipped(onlineSide === Color.Black);
    } else {
      setIsFlipped(false);
    }

    syncFromEngine();
  }, [gameMode, syncFromEngine]);

  // Execute a move on the engine
  const executeMove = useCallback((
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

    // If online move made locally, broadcast to opponent
    if (!isRemote && gameMode === 'online' && onlineRoomCode) {
      const movePayload: OnlineMovePayload = { prevX, prevY, newX, newY, promotedPiece };
      socketService.sendMove(onlineRoomCode, movePayload, engine.boardAsFEN);

      if (engine.isGameOver) {
        const winner = engine.gameOverMessage?.toLowerCase().includes('white')
          ? 'white'
          : engine.gameOverMessage?.toLowerCase().includes('black')
          ? 'black'
          : 'draw';
        socketService.notifyGameOver(
          onlineRoomCode,
          winner,
          engine.gameOverMessage || 'Game Over',
          engine.moveList.length,
          engine.boardAsFEN
        );
      }
    }
  }, [syncFromEngine, gameMode, onlineRoomCode]);

  // ----------------------------------------------------------------
  // Online Multiplayer Socket Event Listeners
  // ----------------------------------------------------------------
  useEffect(() => {
    const socket = socketService.getSocket();

    const onGameStart = ({ roomCode, whitePlayer }: { roomCode: string; whitePlayer: string }) => {
      console.log('⚔️ Game start in room:', roomCode);
      const isWhite = socket.id === whitePlayer;
      const assignedColor = isWhite ? Color.White : Color.Black;

      setOnlineRoomCode(roomCode);
      setOnlinePlayerColor(assignedColor);
      setIsWaitingForOpponent(false);
      setIsOnlineModalOpen(false);
      startNewGame('online', undefined, assignedColor);
    };

    const onOpponentMove = ({ move }: { move: OnlineMovePayload }) => {
      console.log('♟️ Opponent move received:', move);
      executeMove(move.prevX, move.prevY, move.newX, move.newY, move.promotedPiece, true);
    };

    const onOpponentDisconnected = () => {
      alert('Your opponent disconnected.');
    };

    socket.on('game_start', onGameStart);
    socket.on('opponent_move', onOpponentMove);
    socket.on('opponent_disconnected', onOpponentDisconnected);

    return () => {
      socket.off('game_start', onGameStart);
      socket.off('opponent_move', onOpponentMove);
      socket.off('opponent_disconnected', onOpponentDisconnected);
    };
  }, [startNewGame, executeMove]);

  // Online Room Handlers
  const handleCreateOnlineRoom = async () => {
    setIsCreatingRoom(true);
    setCreateRoomError(null);
    try {
      const res = await socketService.createRoom();
      if (res.success && res.roomCode) {
        setCreatedRoomCode(res.roomCode);
        setOnlineRoomCode(res.roomCode);
        setOnlinePlayerColor(Color.White);
        setIsWaitingForOpponent(true);
      } else {
        setCreateRoomError(res.message || 'Failed to create room.');
      }
    } catch (err: any) {
      setCreateRoomError(err.message || 'Connection error');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinOnlineRoom = async (code: string) => {
    setJoinError(null);
    const res = await socketService.joinRoom(code);
    if (res.success && res.roomCode) {
      setOnlineRoomCode(res.roomCode);
      setOnlinePlayerColor(Color.Black);
      setIsOnlineModalOpen(false);
      startNewGame('online', undefined, Color.Black);
    } else {
      setJoinError(res.message || 'Failed to join room. Check code.');
    }
  };

  // Fallback random legal move for AI
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

  // AI response effect
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
    setIsAiThinking(true);

    const timer = setTimeout(async () => {
      try {
        const bestMove = await stockfishService.getBestMove(
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
        console.error('AI move error:', err);
        if (isSubscribed) executeRandomAiMove();
      } finally {
        if (isSubscribed) setIsAiThinking(false);
      }
    }, 400);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [gameMode, playerColor, computerConfig, isAiThinking, executeMove, executeRandomAiMove]);

  // Click on a board square
  const handleSquareClick = useCallback((x: number, y: number) => {
    const engine = engineRef.current;

    if (engine.isGameOver || isAiThinking) return;

    // In computer mode, only human plays
    if (gameMode === 'computer' && engine.playerColor === computerConfig.color) return;

    // In online mode, only allow clicks on player's assigned turn
    if (gameMode === 'online' && onlinePlayerColor !== null && engine.playerColor !== onlinePlayerColor) {
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
  }, [
    selectedSquare,
    pieceSafeSquares,
    safeSquaresMap,
    gameMode,
    computerConfig,
    onlinePlayerColor,
    isAiThinking,
    gameHistoryPointer,
    executeMove,
  ]);

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

  // Navigate to a historic board position
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
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
            setOnlinePlayerColor(null);
            startNewGame('friend');
          }
        }}
        onNewGame={() => startNewGame()}
        onFlipBoard={() => setIsFlipped((prev) => !prev)}
        isFlipped={isFlipped}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
        computerLevel={computerConfig.level}
        playerColor={playerColor}
        onlineRoomCode={onlineRoomCode}
      />

      {/* Main Play Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Chess Board Container */}
        <div className="flex flex-col items-center justify-center w-full max-w-[560px]">
          <ChessBoard
            boardView={boardView}
            selectedSquare={selectedSquare}
            safeSquares={pieceSafeSquares}
            lastMove={lastMove}
            checkState={checkState}
            isFlipped={isFlipped}
            onSquareClick={handleSquareClick}
            disabled={
              isAiThinking ||
              (gameMode === 'online' && onlinePlayerColor !== null && playerColor !== onlinePlayerColor)
            }
          />
        </div>

        {/* Move History and Game Controls Panel */}
        <div className="w-full lg:w-auto flex justify-center">
          <MoveList
            moveList={moveList}
            gameHistoryPointer={gameHistoryPointer}
            gameHistoryLength={gameHistory.length}
            onNavigateHistory={handleNavigateHistory}
            playerColor={playerColor}
            gameOverMessage={gameOverMessage}
            isAiThinking={isAiThinking}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/50">
        <p>Built with React, Node.js & Supabase • Real-time Multiplayer via Socket.io</p>
      </footer>

      {/* Modals */}
      <ComputerModal
        isOpen={isComputerModalOpen}
        onClose={() => setIsComputerModalOpen(false)}
        onStartGame={(level, color) => {
          setIsComputerModalOpen(false);
          startNewGame('computer', { level, color: color === Color.White ? Color.Black : Color.White });
        }}
      />

      <OnlineRoomModal
        isOpen={isOnlineModalOpen}
        onClose={() => {
          setIsOnlineModalOpen(false);
          setCreateRoomError(null);
        }}
        onCreateRoom={handleCreateOnlineRoom}
        onJoinRoom={handleJoinOnlineRoom}
        createdRoomCode={createdRoomCode}
        isWaitingForOpponent={isWaitingForOpponent}
        joinError={joinError}
        createError={createRoomError}
        isCreating={isCreatingRoom}
      />

      <PromotionModal
        isOpen={isPromotionModalOpen}
        playerColor={playerColor}
        onSelectPiece={handleSelectPromotionPiece}
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
