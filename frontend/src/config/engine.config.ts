/**
 * Central Stockfish Engine Configuration
 *
 * Configurable limits:
 * - Beginner: Maximum 100ms, Approx Depth 4
 * - Easy: Maximum 250ms, Approx Depth 6
 * - Medium: Maximum 500ms, Approx Depth 8
 * - Hard: Maximum 1000ms, Approx Depth 12
 * - Expert: Maximum 2000ms, Approx Depth 16
 *
 * All engine parameters and thinking time bounds are managed here.
 */

export interface DifficultyConfig {
  id: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
  level: number;
  name: string;
  movetime: number; // Max thinking time in milliseconds
  depth: number; // Max search depth
  description: string;
  badgeColor: string;
}

export const ENGINE_CONFIG: Record<string, DifficultyConfig> = {
  beginner: {
    id: 'beginner',
    level: 1,
    name: 'Beginner',
    movetime: 100,
    depth: 4,
    description: 'Instant response, tactical blunders possible (100ms, depth 4)',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
  },
  easy: {
    id: 'easy',
    level: 2,
    name: 'Easy',
    movetime: 250,
    depth: 6,
    description: 'Fast casual play (250ms, depth 6)',
    badgeColor: 'text-teal-400 bg-teal-950/60 border-teal-800/80',
  },
  medium: {
    id: 'medium',
    level: 3,
    name: 'Medium',
    movetime: 500,
    depth: 8,
    description: 'Balanced club player strength (500ms, depth 8)',
    badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-800/80',
  },
  hard: {
    id: 'hard',
    level: 4,
    name: 'Hard',
    movetime: 1000,
    depth: 12,
    description: 'Advanced tactical calculation (1s, depth 12)',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
  },
  expert: {
    id: 'expert',
    level: 5,
    name: 'Expert',
    movetime: 2000,
    depth: 16,
    description: 'Deep master analysis (2s, depth 16)',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800/80',
  },
};

export const DIFFICULTY_LEVEL_MAP: Record<number, DifficultyConfig> = {
  1: ENGINE_CONFIG.beginner,
  2: ENGINE_CONFIG.easy,
  3: ENGINE_CONFIG.medium,
  4: ENGINE_CONFIG.hard,
  5: ENGINE_CONFIG.expert,
};

export const ENGINE_SAFETY_MARGIN_MS = 150; // Force-stop engine if response exceeds movetime + margin
export const ENGINE_HARD_TIMEOUT_MS = 2000; // Terminate+respawn Worker if no bestmove after stop
