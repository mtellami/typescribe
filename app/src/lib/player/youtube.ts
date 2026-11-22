import { Emitter } from './emitter';
import type { PlayerAdapter, PlayerEvent, PlayerEventListener } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api';
const READY_TIMEOUT_MS = 10_000;
const PLAYER_ERRORS: Record<number, string> = {
  2: 'This video link is invalid. Choose a real YouTube video to practice.',
  5: 'Your browser could not play this video. Try reloading or choose another video.',
  100: 'This video is unavailable or private. Choose another video.',
  101: 'The owner has disabled embedded playback. Choose another video.',
  150: 'The owner has disabled embedded playback. Choose another video.',
  153: 'YouTube could not verify this player. Reload the page and try again.',
};

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
      apiPromise = null;
      script.remove();
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
  private playerError: Error | null = null;

  constructor(private readonly container: HTMLElement) {}

  async loadVideo(youtubeId: string): Promise<void> {
    if (this.destroyed) return;
    this.pendingVideoId = youtubeId;
    this.playerError = null;

    try {
      await loadIFrameApi();
      if (this.destroyed) return;

      if (!this.player) this.player = this.createPlayer();
      if (this.ready) this.cue(youtubeId);
      else await this.waitForReady();
    } catch (error) {
      if (!this.ready) {
        this.player?.destroy?.();
        this.player = null;
      }
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
    this.container.replaceChildren();
    this.player = null;
    this.ready = false;
    this.emitter.clear();
  }

  private cue(youtubeId: string): void {
    this.player?.cueVideoById?.({ videoId: youtubeId });
  }

  private createPlayer(): any {
    // YouTube replaces its target element. Keep React's host intact so cleanup
    // and later sessions can safely create a fresh iframe inside it.
    const initialVideoId = this.pendingVideoId;
    const target = document.createElement('div');
    this.container.replaceChildren(target);
    const player = new window.YT.Player(target, {
      videoId: initialVideoId,
      height: '100%',
      width: '100%',
      playerVars: {
        enablejsapi: 1,
        disablekb: 1,
        controls: 0,
        fs: 0,
        iv_load_policy: 3,
        cc_load_policy: 0,
        rel: 0,
        playsinline: 1,
        autoplay: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          if (this.destroyed) return;
          this.ready = true;
          if (this.pendingVideoId && this.pendingVideoId !== initialVideoId) {
            this.cue(this.pendingVideoId);
          }
          this.emitter.emit('ready');
        },
        onStateChange: (event: any) => {
          if (this.destroyed) return;
          this.emitter.emit('stateChange', event.data);
          if (event.data === 0) this.emitter.emit('ended');
        },
        onError: (event: any) => {
          if (this.destroyed) return;
          const message =
            PLAYER_ERRORS[event.data] ??
            'YouTube could not play this video. Try another video.';
          this.playerError = new Error(message);
          this.emitter.emit('error', { code: event.data, message });
        },
      },
    });
    return player;
  }

  private waitForReady(): Promise<void> {
    if (this.playerError) return Promise.reject(this.playerError);
    if (this.ready) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        unsubscribeReady();
        unsubscribeError();
      };
      const timeout = setTimeout(() => {
        cleanup();
        // Allow retry after a failed initialization.
        this.player?.destroy?.();
        this.player = null;
        this.ready = false;
        reject(new Error('YouTube player ready timeout. Please retry.'));
      }, READY_TIMEOUT_MS);
      const unsubscribeReady = this.emitter.on('ready', () => {
        cleanup();
        resolve();
      });
      const unsubscribeError = this.emitter.on('error', () => {
        cleanup();
        reject(this.playerError ?? new Error('The video could not be loaded.'));
      });
    });
  }
}
