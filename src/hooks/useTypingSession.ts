'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type {
  EngineResult,
  EngineSnapshot,
  TypingEngine,
} from '@/lib/typing/types';
import { createTypingEngine } from '@/lib/typing/engine';
import { useSession } from '@/store/session';
import type { PlayerControls } from './useYouTubePlayer';

const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const TYPABLE_SCREENS = new Set(['ready', 'playing', 'paused']);

function statsFromSnapshot(snapshot: EngineSnapshot) {
  return {
    correctKeystrokes: snapshot.keystrokes - snapshot.errors,
    keystrokes: snapshot.keystrokes,
    hintCount: snapshot.hintCount,
    activeMs: snapshot.activeMs,
  };
}

export interface TypingSession {
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onCompositionEnd: (event: React.CompositionEvent<HTMLInputElement>) => void;
  focusInput: () => void;
}

export function useTypingSession(
  player: PlayerControls,
  inputRef: RefObject<HTMLInputElement | null>,
): TypingSession {
  const engineRef = useRef<TypingEngine | null>(null);
  const prevCompletedRef = useRef(false);

  const screen = useSession((state) => state.screen);
  const segmentIndex = useSession((state) => state.segmentIndex);
  const engineEpoch = useSession((state) => state.engineEpoch);
  const mode = useSession((state) => state.mode);
  const density = useSession((state) => state.density);
  const ignoreCase = useSession((state) => state.ignoreCase);
  const ignorePunctuation = useSession((state) => state.ignorePunctuation);

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const segmentIndexRef = useRef(segmentIndex);
  segmentIndexRef.current = segmentIndex;
  const playerRef = useRef(player);
  playerRef.current = player;

  useIsoLayoutEffect(() => {
    const store = useSession.getState();
    const segment = store.segments[store.segmentIndex];
    if (!segment) {
      engineRef.current = null;
      store.setEngineSnapshot(null);
      return;
    }
    const engine = createTypingEngine(
      { id: segment.id, text: segment.text },
      {
        mode: store.mode,
        density: store.density,
        ignoreCase: store.ignoreCase,
        ignorePunctuation: store.ignorePunctuation,
      },
    );
    engineRef.current = engine;
    prevCompletedRef.current = false;
    store.setEngineSnapshot(engine.snapshot());
  }, [engineEpoch, segmentIndex, mode, density, ignoreCase, ignorePunctuation]);

  function goToSegment(index: number, autoplay: boolean) {
    const store = useSession.getState();
    if (index < 0 || index >= store.segments.length) return;
    store.setSegmentIndex(index);
    playerRef.current.selectSegment(index, autoplay);
    store.setScreen(autoplay ? 'playing' : 'paused');
  }

  function handleSegmentComplete(snapshot: EngineSnapshot) {
    const store = useSession.getState();
    const index = store.segmentIndex;
    store.recordSegmentStats(index, statsFromSnapshot(snapshot));
    if (index < store.segments.length - 1) {
      goToSegment(index + 1, true);
    } else {
      store.completeSession();
    }
  }

  function applyResult(result: EngineResult | undefined) {
    if (!result) return;
    const store = useSession.getState();
    store.setEngineSnapshot(result.snapshot);

    if (screenRef.current === 'ready' && result.snapshot.keystrokes > 0) {
      store.startSession();
      store.setScreen('playing');
      playerRef.current.play();
    }

    if (result.snapshot.completed && !prevCompletedRef.current) {
      prevCompletedRef.current = true;
      handleSegmentComplete(result.snapshot);
    }
  }

  function focusInput() {
    inputRef.current?.focus();
  }

  useEffect(() => {
    const offEnd = player.onSegmentEnd(() => {
      const store = useSession.getState();
      if (store.screen === 'playing') store.setScreen('paused');
    });
    const offVisibility = player.onVisibilityChange(() => {
      const store = useSession.getState();
      if (store.screen === 'playing') store.setScreen('paused');
    });
    return () => {
      offEnd();
      offVisibility();
    };
  }, [player]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;

    const engine = engineRef.current;
    if (!engine) return;

    const key = event.key;

    if (
      event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      (key === 'h' || key === 'H')
    ) {
      event.preventDefault();
      applyResult(engine.hint());
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!TYPABLE_SCREENS.has(screenRef.current)) return;

    if (key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        goToSegment(segmentIndexRef.current - 1, false);
      } else {
        playerRef.current.replay();
        useSession.getState().setScreen('playing');
        focusInput();
      }
      return;
    }
    if (key === 'Enter') {
      event.preventDefault();
      goToSegment(segmentIndexRef.current + 1, false);
      focusInput();
      return;
    }
    if (key === ' ') {
      event.preventDefault();
      applyResult(engine.type(' '));
      return;
    }
    if (key === 'Backspace') {
      event.preventDefault();
      applyResult(engine.backspace());
      return;
    }
    if (key.length === 1) {
      event.preventDefault();
      applyResult(engine.type(key));
    }
  }

  function onCompositionEnd(event: React.CompositionEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const data = input.value;
    input.value = '';
    if (!data) return;
    const engine = engineRef.current;
    if (!engine) return;
    if (!TYPABLE_SCREENS.has(screenRef.current)) return;
    applyResult(engine.type(data));
  }

  return { onKeyDown, onCompositionEnd, focusInput };
}
