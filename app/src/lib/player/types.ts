export interface PlayerState {
  isPlaying: boolean;
  isReady: boolean;
  currentTimeMs: number;
  playbackRate: number;
}

export type PlayerEvent = 'ready' | 'stateChange' | 'ended' | 'error';

export type PlayerEventListener = (data?: unknown) => void;

export interface PlayerAdapter {
  loadVideo(youtubeId: string): Promise<void>;
  playSegment(startMs: number, endMs: number): void;
  play(): void;
  pause(): void;
  seekMs(ms: number): void;
  setPlaybackRate(rate: number): void;
  getCurrentTimeMs(): number;
  on(event: PlayerEvent, callback: PlayerEventListener): () => void;
  destroy(): void;
}
