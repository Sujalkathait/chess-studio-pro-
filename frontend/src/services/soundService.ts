import { MoveType } from '../chess-logic/models';

class SoundService {
  private muted: boolean = false;
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    // Check local storage for mute preference
    const savedMute = localStorage.getItem('chess_sound_muted');
    if (savedMute !== null) {
      this.muted = savedMute === 'true';
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem('chess_sound_muted', String(muted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private getAudio(src: string): HTMLAudioElement {
    let audio = this.audioCache.get(src);
    if (!audio) {
      audio = new Audio(src);
      this.audioCache.set(src, audio);
    }
    return audio;
  }

  public playMoveSound(moveType?: Set<MoveType>): void {
    if (this.muted) return;

    let soundSrc = '/assets/sound/move.mp3';

    if (moveType) {
      if (moveType.has(MoveType.CheckMate)) {
        soundSrc = '/assets/sound/checkmate.mp3';
      } else if (moveType.has(MoveType.Check)) {
        soundSrc = '/assets/sound/check.mp3';
      } else if (moveType.has(MoveType.Promotion)) {
        soundSrc = '/assets/sound/promote.mp3';
      } else if (moveType.has(MoveType.Capture)) {
        soundSrc = '/assets/sound/capture.mp3';
      } else if (moveType.has(MoveType.Castling)) {
        soundSrc = '/assets/sound/castling.mp3';
      }
    }

    try {
      const audio = this.getAudio(soundSrc);
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Autoplay policy or user interaction restriction
      });
    } catch {
      // Ignore audio failure
    }
  }

  public playIllegalMoveSound(): void {
    if (this.muted) return;
    try {
      const audio = this.getAudio('/assets/sound/incorrect-move.mp3');
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  }
}

export const soundService = new SoundService();
