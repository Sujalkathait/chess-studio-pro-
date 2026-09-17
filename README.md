# Chess Studio Pro ♞

Chess Studio Pro is a modern, responsive, and fully-featured chess web application built with React, TypeScript, and Vite. It features a stunning premium dark-mode UI, smooth animations, and robust chess logic. 

## Features
- **Play vs AI**: Built-in Stockfish Web Worker integration for instant in-browser engine calculations without server lag.
- **Online Multiplayer**: Real-time 6-digit room code multiplayer powered by Socket.io, featuring authoritative server moves and connection handling.
- **Pass & Play**: Local 2-player mode.
- **Responsive Design**: Fully mobile-optimized, fluid layout with glassmorphism UI elements and touch-friendly controls.
- **Customization**: Independent board theme and piece set selectors.
- **Game History**: Interactive move list with history navigation (keyboard shortcuts supported).

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, Socket.io (for multiplayer rooms).
- **Chess Engine**: Stockfish.js (WebAssembly/Web Worker).

## Deployment Instructions

### Frontend (Client)
The frontend is built with Vite and can be deployed easily to any static hosting service (Vercel, Netlify, GitHub Pages).
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Build for production: `npm run build`
4. The production-ready files will be in the `frontend/dist` directory. You can host this folder directly.

### Backend (Server)
The backend is a Node.js server that handles the Socket.io connections for online multiplayer. It must be deployed to a Node.js hosting provider (Render, Railway, Heroku).
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Start the server: `npm start` (Runs on port 3000 by default, or `process.env.PORT`).

Ensure that your deployed frontend connects to the correct backend URL by updating the socket connection endpoint in `frontend/src/services/socketService.ts`.

## Development
To run locally:
1. Start Backend: `cd backend && npm run dev`
2. Start Frontend: `cd frontend && npm run dev`
