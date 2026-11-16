'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  createPlayerAdapter,
  SegmentPlayer,
  type SegmentBounds,
} from '@/lib/player';
import { useSession } from '@/store/session';
import type { PlayerAdapter } from '@/lib/player/types';

export interface PlayerControls {
  loadVideo: (youtubeId: string) => Promise<void>;
  setSegments: (segments: SegmentBounds[]) => void;
  selectSegment: (index: number, autoplay: boolean) => void;
  replay: () => void;
  restart: () => void;
  play: () => void;
  pause: () => void;
  previous: () => void;
  next: () => void;
  isAtSegmentEnd: () => boolean;
  setPlaybackRate: (rate: number) => void;
  onSegmentEnd: (callback: (index: number) => void) => () => void;
  onVisibilityChange: (callback: (visible: boolean) => void) => () => void;
}

interface UseYouTubePlayerResult {
  controls: PlayerControls;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useYouTubePlayer(): UseYouTubePlayerResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adapterRef = useRef<PlayerAdapter | null>(null);
  const segmentPlayerRef = useRef<SegmentPlayer | null>(null);
  const endCallbackRef = useRef<(index: number) => void>(() => {});
  const visibilityCallbackRef = useRef<(visible: boolean) => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const adapter = createPlayerAdapter(container);
    const segmentPlayer = new SegmentPlayer(adapter);
    adapterRef.current = adapter;
    segmentPlayerRef.current = segmentPlayer;

    const offEnd = segmentPlayer.onSegmentEnd((index) =>
      endCallbackRef.current(index),
    );
    const offVisibility = segmentPlayer.onVisibilityChange((visible) =>
      visibilityCallbackRef.current(visible),
    );

    const offState = adapter.on('stateChange', (state) => {
      const store = useSession.getState();
      if (!['ready', 'playing', 'paused'].includes(store.screen)) return;
      if (state === 1 && store.screen !== 'playing') {
        segmentPlayer.play();
        store.startSession();
        store.setScreen('playing');
      } else if ((state === 2 || state === 0) && store.screen === 'playing') {
        segmentPlayer.pause();
        store.setScreen('paused');
      }
    });
    const offError = adapter.on('error', (data) => {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String(data.message)
          : 'The video could not be played. Try another video.';
      segmentPlayer.pause();
      useSession.getState().setError(message);
      useSession.getState().setScreen('error');
    });

    return () => {
      offState();
      offError();
      offEnd();
      offVisibility();
      segmentPlayer.destroy();
      adapter.destroy();
      adapterRef.current = null;
      segmentPlayerRef.current = null;
    };
  }, []);

  const controls = useMemo<PlayerControls>(
    () => ({
      loadVideo: async (youtubeId) => {
        const adapter = adapterRef.current;
        if (!adapter)
          throw new Error('The video player is not ready. Please retry.');
        await adapter.loadVideo(youtubeId);
      },
      setSegments: (segments) => {
        segmentPlayerRef.current?.setSegments(segments);
      },
      selectSegment: (index, autoplay) => {
        segmentPlayerRef.current?.selectSegment(index, autoplay);
      },
      replay: () => {
        segmentPlayerRef.current?.replay();
      },
      restart: () => {
        segmentPlayerRef.current?.restart();
      },
      play: () => {
        segmentPlayerRef.current?.play();
      },
      pause: () => {
        segmentPlayerRef.current?.pause();
      },
      previous: () => {
        segmentPlayerRef.current?.previous();
      },
      next: () => {
        segmentPlayerRef.current?.next();
      },
      isAtSegmentEnd: () => segmentPlayerRef.current?.isAtSegmentEnd() ?? false,
      setPlaybackRate: (rate) => {
        adapterRef.current?.setPlaybackRate(rate);
      },
      onSegmentEnd: (callback) => {
        endCallbackRef.current = callback;
        return () => {
          if (endCallbackRef.current === callback)
            endCallbackRef.current = () => {};
        };
      },
      onVisibilityChange: (callback) => {
        visibilityCallbackRef.current = callback;
        return () => {
          if (visibilityCallbackRef.current === callback) {
            visibilityCallbackRef.current = () => {};
          }
        };
      },
    }),
    [],
  );

  return { controls, containerRef };
}
