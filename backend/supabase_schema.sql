-- Forward to database/schema.sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_code VARCHAR(6) NOT NULL,
    pin VARCHAR(6) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
    game_id UUID DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_active_public_code
ON rooms (public_code)
WHERE status IN ('waiting', 'active');

CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    white_player VARCHAR(100) NOT NULL,
    black_player VARCHAR(100) DEFAULT NULL,
    fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn TEXT DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'waiting',
    result VARCHAR(30) DEFAULT NULL,
    moves_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(6) NOT NULL,
    winner VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    moves_count INT NOT NULL DEFAULT 0,
    final_fen TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
