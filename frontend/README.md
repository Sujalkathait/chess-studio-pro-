# Chess Studio Pro - Frontend

High-performance, modern responsive chess client built with React 19, TypeScript, Vite, and Tailwind CSS.

---

## Directory Structure

```
frontend/
├── public/
│   ├── assets/              # Piece vectors (cburnett, alpha sets) & sound effects
│   ├── stockfish.js         # Stockfish chess engine Web Worker
│   ├── stockfish.wasm       # WebAssembly engine binary
│   └── stockfish.wasm.js    # WASM glue code
├── src/
│   ├── chess-logic/         # Pure chess logic, models, piece move rules, FEN/PGN parser
│   ├── components/
│   │   ├── board/           # ChessBoard, CapturedPieces, MoveList, PromotionModal
│   │   ├── layout/          # Navbar with controls and sound toggle
│   │   ├── modals/          # DifficultyModal, RoomCodeModal, ThemeModal, GameOverModal, ExitConfirmModal
│   │   ├── views/           # AnalysisView (Stockfish evaluation) & GameHistoryView (PGN viewer)
│   │   └── index.ts         # Unified component barrel export
│   ├── config/              # Centralized engine & theme/piece configuration
│   ├── services/            # Stockfish Web Worker, Socket.io, sound, and REST API services
│   ├── App.tsx              # Root application state and layout
│   ├── index.css            # Tailwind directives and custom animation utilities
│   └── main.tsx             # Application bootstrap
├── .env.example             # Frontend environment variables template
├── package.json             # Dependencies and build scripts
├── tailwind.config.js       # Tailwind theme colors and animations
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite configuration
```

---

## Features

- **Responsive Board**: Touch and mouse optimized with flip capability, coordinate indicators, and square highlight indicators.
- **In-Browser Engine (Stockfish)**: Zero server-lag AI opponent calculations executed inside dedicated Web Workers.
- **Real-Time Multiplayer**: 6-digit room matchmaking, move sync, rematch negotiation, and resign/draw workflows.
- **Deep Position Analysis**: Engine evaluation bar, move quality classification (Best, Excellent, Inaccuracy, Mistake, Blunder), and best move recommendations.
- **Customizable Themes**: Multiple board colorways (Green & Cream, Ocean Blue) and vector piece styles (Neo / Vector, Classic Tournament).
- **Match History & PGN Replayer**: Interactive match history, PGN export/download, and past game analysis.

---

## Environment Variables

Copy `.env.example` to `.env`:

```ini
# Backend API & WebSocket endpoints (defaults to production Render URL if omitted)
VITE_API_URL=https://chess-studio-pro-1.onrender.com
VITE_SOCKET_URL=https://chess-studio-pro-1.onrender.com
```

For local backend development, set both to `http://localhost:4000`.

---

## Commands

```bash
# Install dependencies
npm install

# Start local development server (http://localhost:5173)
npm run dev

# Compile TypeScript & build optimized production bundle
npm run build

# Preview local production build
npm run preview

# Run linter
npm run lint
```
