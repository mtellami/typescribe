'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { PracticeWorkspace } from '@/components/watch/PracticeWorkspace';
import { HomeIntro } from '@/components/watch/HomeIntro';
import { TypingInput } from '@/components/watch/TypingInput';
import { SelectVideoDialog } from '@/components/watch/SelectVideoDialog';
import { SessionSummaryDialog } from '@/components/watch/SessionSummaryDialog';
import { useTypingSession } from '@/hooks/useTypingSession';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { useSession } from '@/store/session';
import { videoDetailResponseSchema, type PracticeMode } from '@/lib/contracts';

export default function HomePage({ videoId }: { videoId?: string }) {
  const router = useRouter();
  const { loadError: libraryError, retry: retryLibrary } = useVideoLibrary();
  const { data: account, isPending: accountLoading } = authClient.useSession();
  const { controls, containerRef } = useYouTubePlayer();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef(0);
  const lastVideoIdRef = useRef<string | null>(null);
  const typing = useTypingSession(controls, inputRef);
  const mode = useSession((state) => state.mode);
  const screen = useSession((state) => state.screen);
  const error = useSession((state) => state.error);
  const segments = useSession((state) => state.segments);
  const playbackRate = useSession((state) => state.playbackRate);

  useEffect(() => {
    controls.setPlaybackRate(Number(playbackRate));
  }, [controls, playbackRate]);
  useEffect(() => {
    if (screen === 'ready' && !useSession.getState().selectOpen)
      inputRef.current?.focus();
  }, [screen]);

  const loadVideoById = useCallback(
    async (id: string) => {
      const request = ++requestRef.current;
      lastVideoIdRef.current = id;
      const store = useSession.getState();
      controls.pause();
      store.setScreen('loading');
      store.setError(null);
      try {
        const response = await fetch(`/api/videos/${encodeURIComponent(id)}`);
        const body = await response.json().catch(() => null);
        if (request !== requestRef.current) return;
        if (!response.ok)
          throw new Error(body?.error?.message ?? 'Could not load the video.');
        const detail = videoDetailResponseSchema.parse(body);
        if (!detail.segments.length)
          throw new Error('This video has no captions to practice.');
        store.loadDetail(detail);
        await controls.loadVideo(detail.video.youtubeId);
        if (request !== requestRef.current) return;
        controls.setPlaybackRate(Number(useSession.getState().playbackRate));
        controls.setSegments(detail.segments);
        controls.selectSegment(0, false);
        store.setScreen('ready');
      } catch (loadError) {
        if (request !== requestRef.current) return;
        store.setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load this video.',
        );
        store.setScreen('error');
      }
    },
    [controls],
  );

  function play() {
    if (mode !== 'watch' && controls.isAtSegmentEnd()) controls.replay();
    else controls.play();
    if (useSession.getState().mode !== 'watch')
      useSession.getState().startSession();
    useSession.getState().setScreen('playing');
    typing.focusInput();
  }
  function pause() {
    controls.pause();
    useSession.getState().setScreen('paused');
  }
  function replay() {
    controls.replay();
    useSession.getState().setScreen('playing');
    typing.focusInput();
  }
  function selectSegment(index: number) {
    if (index < 0 || index >= segments.length) return;
    const watching = useSession.getState().mode === 'watch';
    controls.selectSegment(index, watching);
    useSession.getState().setSegmentIndex(index);
    useSession.getState().setScreen(watching ? 'playing' : 'paused');
    if (!watching) typing.focusInput();
  }
  function restart() {
    controls.pause();
    useSession.getState().restartSession();
    controls.restart();
    typing.focusInput();
  }
  function goHome() {
    ++requestRef.current;
    lastVideoIdRef.current = null;
    controls.pause();
    useSession.getState().clearSession();
  }
  function library() {
    controls.pause();
    router.push('/library');
  }
  function selectVideo(id: string) {
    void loadVideoById(id);
    router.push(`/?video=${encodeURIComponent(id)}`);
  }

  useEffect(() => {
    if (videoId) {
      if (lastVideoIdRef.current !== videoId) void loadVideoById(videoId);
    } else {
      ++requestRef.current;
      lastVideoIdRef.current = null;
      controls.pause();
      useSession.getState().clearSession();
    }
  }, [videoId, loadVideoById, controls]);

  useEffect(
    () => () => {
      ++requestRef.current;
      lastVideoIdRef.current = null;
    },
    [],
  );

  function changeMode(next: PracticeMode) {
    if (next === mode) return;
    controls.pause();
    useSession.getState().setMode(next);
    if (['ready', 'playing', 'paused'].includes(screen)) {
      controls.selectSegment(useSession.getState().segmentIndex, false);
      useSession.getState().setScreen('paused');
    }
  }

  useEffect(() => {
    controls.setContinuousPlayback(mode === 'watch');
    return controls.onSegmentChange((index) => {
      if (useSession.getState().mode === 'watch')
        useSession.getState().setSegmentIndex(index);
    });
  }, [mode, controls]);

  function chooseVideo() {
    if (screen === 'playing') pause();
    useSession.getState().setSelectOpen(true);
  }

  const preparingVideo = Boolean(videoId) && screen === 'idle';
  const active = Boolean(videoId) || screen !== 'idle';
  const home = !active;
  const disabled = !['ready', 'playing', 'paused'].includes(screen);

  return (
    <div
      className={`mx-auto flex w-full max-w-6xl min-w-0 flex-col px-5 sm:px-8 ${active ? 'practice-shell' : home ? 'home-shell' : 'min-h-dvh'}`}
    >
      <SiteHeader compact={active} home={home} onHome={goHome} />
      <main
        className={
          active
            ? 'practice-main'
            : home
              ? 'home-main'
              : 'min-w-0 flex-1 py-6 sm:py-8'
        }
      >
        {screen === 'error' && error && (
          <div
            role="alert"
            className="border-error/30 bg-error/5 mb-2 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"
          >
            <p>{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                lastVideoIdRef.current &&
                void loadVideoById(lastVideoIdRef.current)
              }
            >
              Retry video
            </Button>
          </div>
        )}
        {!active && (
          <HomeIntro
            authenticated={Boolean(account)}
            accountLoading={accountLoading}
          />
        )}
        <PracticeWorkspace
          loading={preparingVideo}
          onModeChange={changeMode}
          onHint={typing.hint}
          containerRef={containerRef}
          onPlay={play}
          onPause={pause}
          onReplay={replay}
          onSelectSegment={selectSegment}
          onRestart={restart}
          onSelectVideo={chooseVideo}
          onFocusInput={typing.focusInput}
        />
      </main>
      <footer
        hidden={active}
        className={`text-muted-foreground flex shrink-0 flex-wrap items-center justify-between gap-3 border-t text-xs ${home ? 'home-footer' : 'mt-8 py-5'}`}
      >
        <span>typescribe · Find your flow, one line at a time.</span>
        <span className="hidden sm:inline">Made for mindful practice.</span>
      </footer>
      {mode !== 'watch' && (
        <TypingInput
          inputRef={inputRef}
          onKeyDown={typing.onKeyDown}
          onCompositionEnd={typing.onCompositionEnd}
          disabled={disabled}
        />
      )}
      <SelectVideoDialog
        onSelect={selectVideo}
        loadError={libraryError}
        onRetry={retryLibrary}
      />
      <SessionSummaryDialog onRestart={restart} onNewVideo={library} />
    </div>
  );
}
