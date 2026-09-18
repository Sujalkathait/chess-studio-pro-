-- =========================================================
-- CHESS STUDIO PRO - DATABASE SCHEMA (PostgreSQL / Supabase)
-- =========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- 1. ROOMS TABLE
-- Stores active multiplayer room states with 6-digit public codes
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_code VARCHAR(6) NOT NULL,
    pin VARCHAR(6) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'finished', 'expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
    game_id UUID DEFAULT NULL
);

-- Partial Unique Index: ensures 6-digit codes are uniquely assigned among active/waiting rooms
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_active_public_code
ON rooms (public_code)
WHERE status IN ('waiting', 'active');

CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms (expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_public_code ON rooms (public_code);

-- ---------------------------------------------------------
-- 2. GAMES TABLE
-- Complete game archive with PGN, players, time controls, and AI difficulty
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT NULL,                     -- Optional user account linkage
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    white_player VARCHAR(100) NOT NULL DEFAULT 'White',
    black_player VARCHAR(100) NOT NULL DEFAULT 'Black',
    result VARCHAR(30) NOT NULL DEFAULT '*',       -- '1-0', '0-1', '1/2-1/2', '*'
    game_mode VARCHAR(30) NOT NULL DEFAULT 'unknown', -- 'computer', 'friend', 'online'
    time_control VARCHAR(30) DEFAULT NULL,
    ai_difficulty INT DEFAULT NULL,                -- 1 to 5 for Stockfish levels
    moves_count INT DEFAULT 0,
    fen TEXT DEFAULT NULL,
    pgn TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'finished',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Foreign key linking room back to games record
ALTER TABLE rooms
    DROP CONSTRAINT IF EXISTS fk_rooms_game,
    ADD CONSTRAINT fk_rooms_game
    FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_games_created_at ON games (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_game_mode ON games (game_mode);

-- ---------------------------------------------------------
-- 3. MATCHES TABLE
-- Fast leaderboard and match archive for multiplayer outcomes
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(6) NOT NULL,
    winner VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    moves_count INT NOT NULL DEFAULT 0,
    final_fen TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_room_code ON matches (room_code);
