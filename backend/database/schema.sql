-- =========================================================
-- CHESS STUDIO DATABASE SCHEMA (PostgreSQL / Supabase)
-- =========================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROOMS TABLE
-- Uses internal UUID as primary key, never exposing it as lookup key.
-- Stores the 6-digit public code with uniqueness constraint on active rooms.
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_code VARCHAR(6) NOT NULL,
    pin VARCHAR(6) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'finished', 'expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
    game_id UUID DEFAULT NULL
);

-- Partial Unique Index to ensure public 6-digit code uniqueness among active/waiting rooms:
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_active_public_code
ON rooms (public_code)
WHERE status IN ('waiting', 'active');

-- Index for lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms (expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_public_code ON rooms (public_code);

-- 2. GAMES TABLE
-- Authoritative chess game record with FEN, PGN, players, and match status
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    white_player VARCHAR(100) NOT NULL,
    black_player VARCHAR(100) DEFAULT NULL,
    fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn TEXT DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    result VARCHAR(30) DEFAULT NULL, -- 'white', 'black', 'draw'
    moves_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Foreign key linking room back to game
ALTER TABLE rooms
    ADD CONSTRAINT fk_rooms_game
    FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE SET NULL;

-- 3. MATCHES ARCHIVE / LEADERBOARD (for query and stats)
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
