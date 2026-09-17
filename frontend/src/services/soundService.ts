import { MoveType } from '../chess-logic/models';

class SoundService {
  private muted: boolean = false;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isAudioUnlocked: boolean = false;

  private soundFiles: string[] = [
    '/assets/sound/move.mp3',
    '/assets/sound/capture.mp3',
    '/assets/sound/castling.mp3',
    '/assets/sound/check.mp3',
    '/assets/sound/checkmate.mp3',
    '/assets/sound/promote.mp3',
    '/assets/sound/incorrect-move.mp3',
  ];

  constructor() {
    const savedMute = typeof localStorage !== 'undefined' ? localStorage.getItem('chess_sound_muted') : null;
    if (savedMute !== null) {
      this.muted = savedMute === 'true';
    }

    if (typeof window !== 'undefined') {
      // Auto-unlock audio on first touch/click for mobile browsers
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('click', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
      window.addEventListener('click', unlock, { once: true, passive: true });
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chess_sound_muted', String(muted));
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Unlock HTML5 Audio on mobile platforms
   */
  public unlockAudio(): void {
    if (this.isAudioUnlocked) return;
    this.isAudioUnlocked = true;

    for (const src of this.soundFiles) {
      try {
        const audio = this.getAudio(src);
        audio.volume = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              audio.pause();
              audio.currentTime = 0;
              audio.volume = 1;
            })
            .catch(() => {});
        }
      } catch {}
    }
  }

  private getAudio(src: string): HTMLAudioElement {
    let audio = this.audioCache.get(src);
    if (!audio) {
      audio = new Audio(src);
      audio.preload = 'auto';
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
      audio.volume = 1;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy restriction catch
        });
      }
    } catch {
      // Ignore audio failure
    }
  }

  public playIllegalMoveSound(): void {
    if (this.muted) return;
    try {
      const audio = this.getAudio('/assets/sound/incorrect-move.mp3');
      audio.currentTime = 0;
      audio.volume = 1;
      audio.play().catch(() => {});
    } catch {}
  }
}

export const soundService = new SoundService();
export default soundService;
