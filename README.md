# Chess Studio Pro (Full-Stack)

A complete real-time multiplayer chess platform with **React 18**, **Tailwind CSS**, **Node.js**, **Socket.io**, and **Supabase (PostgreSQL)**.

## Architecture

```
[ Frontend (React + Vite) ]   <--- (Live moves via Socket.io) --->   [ Backend (Node.js + Express) ]
   Deployed on VERCEL (Free)                                           Deployed on RENDER (Free)
                                                                                  │
                                                                                  ▼
                                                                        [ Supabase Database ]
                                                                       Hosted PostgreSQL (Free)
```

---

## Features
- **Online Real-time Multiplayer**: Create a private 6-letter room code, invite a friend, and play live with sub-second latency via Socket.io.
- **vs Computer (Stockfish AI)**: Challenge Stockfish engine with 5 difficulty levels.
- **Pass & Play (Local 2-Player)**: Play on the same screen with optional board flipping.
- **Database Game Logs**: Automatic saving of match results (winner, reason, moves count, FEN) to Supabase PostgreSQL.
- **Interactive Move History**: Step through previous board states with keyboard arrows (`←` / `→`) or click on any move in the list.
- **Rich Visuals & Sound Effects**: Dynamic sound effects, valid move highlights, and sleek dark mode.

---

## Quick Start (Running Locally)

### 1. Start the Backend Server (Port 4000)
```bash
cd backend
npm install
npm start
```

### 2. Start the Frontend Application (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Supabase Database Setup (1 Minute)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and paste the contents of [`backend/supabase_schema.sql`](file:///c:/Users/LENOVO/Desktop/cyber%20project/chess%20game/backend/supabase_schema.sql), then click **Run**.
3. In your Supabase Project Settings, copy your `SUPABASE_URL` and `SUPABASE_KEY` (anon key) into `backend/.env`.

---

## Deployment (Free)

### 1. Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com) and import this repository.
2. Set **Root Directory** to `frontend`.
3. Add Environment Variable:
   - `VITE_BACKEND_URL`: Your Render backend URL (e.g. `https://chess-backend.onrender.com`).
4. Click **Deploy**.

### 2. Deploy Backend to Render
1. Go to [render.com](https://render.com) and create a new **Web Service**.
2. Select this repository.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add Environment Variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase API key
5. Click **Create Web Service**.
