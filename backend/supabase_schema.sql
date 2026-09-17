-- ============================================================
-- Supabase PostgreSQL Schema for Chess Matches & Stats
-- Copy and run this script in your Supabase SQL Editor
-- ============================================================

-- Create the matches table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL,
    winner TEXT NOT NULL,           -- 'white', 'black', or 'draw'
    reason TEXT NOT NULL,           -- 'checkmate', 'stalemate', 'resignation', etc.
    moves_count INTEGER DEFAULT 0,
    final_fen TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Allow public read access to matches
CREATE POLICY "Allow public read of matches" 
ON public.matches 
FOR SELECT 
USING (true);

-- Allow public insert of match records from backend service
CREATE POLICY "Allow public insert of matches" 
ON public.matches 
FOR INSERT 
WITH CHECK (true);

-- Create an index on created_at for fast match history queries
CREATE INDEX IF NOT EXISTS idx_matches_created_at 
ON public.matches (created_at DESC);
