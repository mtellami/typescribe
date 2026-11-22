import { Emitter } from './emitter';
import type {
  PlayerAdapter,
  PlayerEvent,
  PlayerEventListener,
  PlayerState,
} from './types';

export interface FakePlayerOptions {
  /** Advance the clock automatically via setInterval while playing. */
  autoTick?: boolean;
  /** Interval used when autoTick is enabled. */
  tickMs?: number;
}

export class FakePlayerAdapter implements PlayerAdapter {
  private emitter = new Emitter();
  private state: PlayerState = {
    isPlaying: false,
    isReady: false,
    currentTimeMs: 0,
    playbackRate: 1,
  };
  private segment: { startMs: number; endMs: number } | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private readonly autoTick: boolean;
  private readonly tickMs: number;

  constructor(options: FakePlayerOptions = {}) {
    this.autoTick = options.autoTick ?? true;
    this.tickMs = options.tickMs ?? 100;
  }

  async loadVideo(youtubeId: string): Promise<void> {
    if (this.destroyed) return;
    this.state.isReady = true;
    this.emitter.emit('ready', { youtubeId });
    this.emitter.emit('stateChange', this.getState());
  }

  playSegment(startMs: number, endMs: number): void {
    this.segment = { startMs, endMs };
    this.seekMs(startMs);
    this.play();
  }

  play(): void {
    if (this.destroyed) return;
    this.state.isPlaying = true;
    this.startTicker();
    this.emitter.emit('stateChange', this.getState());
  }

  pause(): void {
    if (this.destroyed) return;
    this.state.isPlaying = false;
    this.stopTicker();
    this.emitter.emit('stateChange', this.getState());
  }

  seekMs(ms: number): void {
    if (this.destroyed) return;
    this.state.currentTimeMs = Math.max(0, ms);
    this.emitter.emit('stateChange', this.getState());
  }

  setPlaybackRate(rate: number): void {
    if (this.destroyed) return;
    this.state.playbackRate = rate;
    this.emitter.emit('stateChange', this.getState());
  }

  getCurrentTimeMs(): number {
    return this.state.currentTimeMs;
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  on(event: PlayerEvent, callback: PlayerEventListener): () => void {
    return this.emitter.on(event, callback);
  }

  destroy(): void {
    this.destroyed = true;
    this.stopTicker();
    this.state.isPlaying = false;
    this.state.isReady = false;
    this.emitter.clear();
  }

  /** Manually advance the playback clock while playing (scaled by playback rate). */
  advance(ms: number): void {
    if (this.destroyed || !this.state.isPlaying) return;
    this.state.currentTimeMs += ms * this.state.playbackRate;
  }

  /** Jump to the end of the current segment so the next poll detects it. */
  finishSegment(): void {
    if (this.destroyed || !this.segment) return;
    this.state.currentTimeMs = this.segment.endMs;
  }

  emitError(code: number): void {
    if (this.destroyed) return;
    this.emitter.emit('error', { code });
  }

  private startTicker(): void {
    if (!this.autoTick || this.ticker) return;
    this.ticker = setInterval(() => {
      if (this.state.isPlaying) {
        this.state.currentTimeMs += this.tickMs * this.state.playbackRate;
      }
    }, this.tickMs);
  }

  private stopTicker(): void {
    if (!this.ticker) return;
    clearInterval(this.ticker);
    this.ticker = null;
  }
}
