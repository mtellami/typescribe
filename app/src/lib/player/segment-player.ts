import type { PlayerAdapter } from './types';

export interface SegmentBounds {
  startMs: number;
  endMs: number;
}

export interface SegmentPlayerOptions {
  /** Polling interval in ms. Default 200. */
  pollIntervalMs?: number;
  /** Pause when currentTime >= endMs - threshold. Default 50. */
  endThresholdMs?: number;
  /** Start the polling interval on construction. Default true. */
  autoStartPolling?: boolean;
}

type SegmentEndListener = (index: number) => void;
type VisibilityListener = (visible: boolean) => void;

export class SegmentPlayer {
  private segments: SegmentBounds[] = [];
  private index = 0;
  private playing = false;
  private continuous = false;
  private readonly changeListeners = new Set<SegmentEndListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private wasPlayingBeforeHide = false;
  private readonly endListeners = new Set<SegmentEndListener>();
  private readonly visibilityListeners = new Set<VisibilityListener>();
  private readonly pollIntervalMs: number;
  private readonly endThresholdMs: number;
  private readonly handleVisibility = () => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      this.onHidden();
    } else {
      this.onVisible();
    }
  };

  constructor(
    private readonly adapter: PlayerAdapter,
    options: SegmentPlayerOptions = {},
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? 200;
    this.endThresholdMs = options.endThresholdMs ?? 50;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
    if (options.autoStartPolling ?? true) this.startPolling();
  }

  setSegments(segments: SegmentBounds[], startIndex = 0): void {
    this.segments = [...segments];
    this.index = Math.min(
      Math.max(startIndex, 0),
      Math.max(this.segments.length - 1, 0),
    );
  }

  setContinuousPlayback(enabled: boolean): void {
    this.continuous = enabled;
  }

  onSegmentChange(listener: SegmentEndListener): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  get currentIndex(): number {
    return this.index;
  }

  get currentSegment(): SegmentBounds | null {
    return this.segments[this.index] ?? null;
  }

  selectSegment(index: number, autoplay = true): void {
    if (this.segments.length === 0) return;
    const next = Math.min(Math.max(index, 0), this.segments.length - 1);
    this.index = next;
    const segment = this.segments[next];
    this.applySeek(segment.startMs);
    if (autoplay) {
      this.play();
    } else {
      this.pause();
    }
  }

  replay(): void {
    const segment = this.currentSegment;
    if (!segment) return;
    this.applySeek(segment.startMs);
    this.play();
  }

  previous(): void {
    if (this.index <= 0) return;
    this.selectSegment(this.index - 1, false);
  }

  next(): void {
    if (this.index >= this.segments.length - 1) return;
    this.selectSegment(this.index + 1, false);
  }

  restart(): void {
    if (this.segments.length === 0) return;
    this.selectSegment(0, false);
  }

  play(): void {
    this.playing = true;
    this.adapter.play();
  }

  pause(): void {
    this.playing = false;
    this.adapter.pause();
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  isAtSegmentEnd(): boolean {
    const segment = this.currentSegment;
    if (!segment) return false;
    return (
      this.adapter.getCurrentTimeMs() >= segment.endMs - this.endThresholdMs
    );
  }

  /** Single polling tick: pause at segment end and notify listeners. */
  poll(): void {
    if (!this.playing) return;
    if (this.continuous && this.segments.length) {
      const position = this.adapter.getCurrentTimeMs();
      let next = this.index;
      while (
        next < this.segments.length - 1 &&
        position >= this.segments[next + 1].startMs
      )
        next += 1;
      while (next > 0 && position < this.segments[next].startMs) next -= 1;
      if (next !== this.index) {
        this.index = next;
        for (const listener of [...this.changeListeners]) listener(next);
      }
      return;
    }
    const segment = this.currentSegment;
    if (!segment) return;
    if (
      this.adapter.getCurrentTimeMs() >=
      segment.endMs - this.endThresholdMs
    ) {
      const endedIndex = this.index;
      this.pause();
      for (const listener of [...this.endListeners]) listener(endedIndex);
    }
  }

  startPolling(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stopPolling(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  onSegmentEnd(listener: SegmentEndListener): () => void {
    this.endListeners.add(listener);
    return () => {
      this.endListeners.delete(listener);
    };
  }

  onVisibilityChange(listener: VisibilityListener): () => void {
    this.visibilityListeners.add(listener);
    return () => {
      this.visibilityListeners.delete(listener);
    };
  }

  destroy(): void {
    this.stopPolling();
    this.endListeners.clear();
    this.changeListeners.clear();
    this.visibilityListeners.clear();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
  }

  private applySeek(startMs: number): void {
    this.adapter.seekMs(startMs);
    if (Math.abs(this.adapter.getCurrentTimeMs() - startMs) > 1500) {
      this.adapter.seekMs(startMs);
    }
  }

  private onHidden(): void {
    this.wasPlayingBeforeHide = this.playing;
    if (this.playing) this.pause();
  }

  private onVisible(): void {
    const segment = this.currentSegment;
    if (segment) this.applySeek(segment.startMs);
    if (this.wasPlayingBeforeHide) {
      this.wasPlayingBeforeHide = false;
      for (const listener of [...this.visibilityListeners]) listener(false);
    }
  }
}
