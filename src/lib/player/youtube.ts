import { Emitter } from './emitter';
import type { PlayerAdapter, PlayerEvent, PlayerEventListener } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api';
const READY_TIMEOUT_MS = 10_000;
const UNPLAYABLE_CODES = new Set([2, 5, 100, 101, 150]);

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadIFrameApi(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube IFrame API requires a browser.'));
  }
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('YouTube IFrame API ready timeout.'));
    }, READY_TIMEOUT_MS);

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      clearTimeout(timeout);
      resolve();
    };

    const script = document.createElement('script');
    script.src = IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      apiPromise = null;
      reject(new Error('YouTube IFrame API failed to load.'));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}

export class YouTubePlayerAdapter implements PlayerAdapter {
  private emitter = new Emitter();
  private player: any = null;
  private ready = false;
  private destroyed = false;
  private pendingVideoId: string | null = null;

  constructor(private readonly container: HTMLElement) {}

  async loadVideo(youtubeId: string): Promise<void> {
    if (this.destroyed) return;
    this.pendingVideoId = youtubeId;

    try {
      await loadIFrameApi();
      if (this.destroyed) return;

      if (!this.player) {
        this.player = this.createPlayer();
        await this.waitForReady();
      } else if (this.ready) {
        this.cue(youtubeId);
      }
    } catch (error) {
      this.emitter.emit('error', {
        code: 'ready-timeout',
        message: 'The video player could not be loaded.',
      });
      throw error;
    }
  }

  playSegment(startMs: number): void {
    this.seekMs(startMs);
    this.play();
  }

  play(): void {
    this.player?.playVideo?.();
  }

  pause(): void {
    this.player?.pauseVideo?.();
  }

  seekMs(ms: number): void {
    this.player?.seekTo?.(ms / 1000, true);
  }

  setPlaybackRate(rate: number): void {
    this.player?.setPlaybackRate?.(rate);
  }

  getCurrentTimeMs(): number {
    const seconds = this.player?.getCurrentTime?.();
    return typeof seconds === 'number' ? seconds * 1000 : 0;
  }

  on(event: PlayerEvent, callback: PlayerEventListener): () => void {
    return this.emitter.on(event, callback);
  }

  destroy(): void {
    this.destroyed = true;
    this.player?.destroy?.();
    this.player = null;
    this.ready = false;
    this.emitter.clear();
  }

  private cue(youtubeId: string): void {
    this.player?.cueVideoById?.({ videoId: youtubeId });
  }

  private createPlayer(): any {
    const player = new window.YT.Player(this.container, {
      height: '100%',
      width: '100%',
      playerVars: {
        enablejsapi: 1,
        disablekb: 1,
        cc_load_policy: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        autoplay: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          if (this.destroyed) return;
          this.ready = true;
          if (this.pendingVideoId) this.cue(this.pendingVideoId);
          this.emitter.emit('ready');
        },
        onStateChange: (event: any) => {
          if (this.destroyed) return;
          this.emitter.emit('stateChange', event.data);
          if (event.data === 0) this.emitter.emit('ended');
        },
        onError: (event: any) => {
          if (this.destroyed) return;
          console.error('YouTube player error', event.data);
          if (UNPLAYABLE_CODES.has(event.data)) {
            this.emitter.emit('error', {
              code: event.data,
              message: 'This video cannot be played here.',
            });
          } else {
            this.emitter.emit('error', { code: event.data });
          }
        },
      },
    });
    return player;
  }

  private waitForReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribeReady();
        reject(new Error('YouTube player ready timeout.'));
      }, READY_TIMEOUT_MS);
      const unsubscribeReady = this.emitter.on('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}
