const API_BASE_URL = 'https://chess-studio-pro-1.onrender.com';

export interface GameRecord {
  id?: string;
  white_player: string;
  black_player: string;
  result: string;
  game_mode: string;
  time_control?: string;
  ai_difficulty?: number;
  moves_count: number;
  pgn: string;
  created_at?: string;
}

class ApiService {
  /**
   * Save a completed game to the backend
   */
  async saveGame(gameRecord: GameRecord): Promise<GameRecord | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameRecord),
      });

      const data = await response.json();
      if (data.success && data.game) {
        return data.game;
      }
      console.error('Failed to save game:', data.message);
      return null;
    } catch (error) {
      console.error('Error in saveGame API call:', error);
      return null;
    }
  }

  /**
   * Fetch game history
   */
  async getGames(limit: number = 50, offset: number = 0): Promise<GameRecord[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/games?limit=${limit}&offset=${offset}`);
      const data = await response.json();
      if (data.success && data.games) {
        return data.games;
      }
      return [];
    } catch (error) {
      console.error('Error in getGames API call:', error);
      return [];
    }
  }
}

export const apiService = new ApiService();
