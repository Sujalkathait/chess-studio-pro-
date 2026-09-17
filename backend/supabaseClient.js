import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase connected successfully.');
  } catch (err) {
    console.warn('⚠️ Could not initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️ Supabase credentials not set in .env. Running in in-memory mode for matches.');
}

/**
 * Save a completed chess match record into Supabase PostgreSQL database
 */
export async function saveMatchRecord({ roomCode, winner, reason, movesCount, finalFen }) {
  if (!supabase) {
    console.log(`[Demo/In-Memory Match Log] Room: ${roomCode} | Winner: ${winner} | Reason: ${reason} | Moves: ${movesCount}`);
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('matches')
      .insert([
        {
          room_code: roomCode,
          winner,
          reason,
          moves_count: movesCount,
          final_fen: finalFen,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('❌ Error saving match to Supabase:', error.message);
      return null;
    }

    console.log('✅ Match saved to Supabase:', data);
    return data;
  } catch (err) {
    console.error('❌ Unexpected Supabase write error:', err.message);
    return null;
  }
}

/**
 * Fetch recent matches from Supabase
 */
export async function getRecentMatches(limit = 10) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error fetching recent matches:', err.message);
    return [];
  }
}

export default supabase;
