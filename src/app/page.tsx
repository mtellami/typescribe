'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PracticeToolbar } from '@/components/watch/PracticeToolbar';
import { SelectVideoDialog } from '@/components/watch/SelectVideoDialog';
import { SessionSummaryDialog } from '@/components/watch/SessionSummaryDialog';
import { StatsBar } from '@/components/watch/StatsBar';
import { TypingCanvas } from '@/components/watch/TypingCanvas';
import { TypingInput } from '@/components/watch/TypingInput';
import { VideoGrid } from '@/components/watch/VideoGrid';
import { VideoPanel } from '@/components/watch/VideoPanel';
import { useTypingSession } from '@/hooks/useTypingSession';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { useSession } from '@/store/session';

export default function HomePage() {
  const { controls, containerRef } = useYouTubePlayer();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastVideoIdRef = useRef<string | null>(null);
  const typing = useTypingSession(controls, inputRef);

  const screen = useSession((state) => state.screen);
  const error = useSession((state) => state.error);
  const video = useSession((state) => state.video);
  const engineSnapshot = useSession((state) => state.engineSnapshot);
  const featured = useSession((state) => state.featured);
  const displayMode = useSession((state) => state.displayMode);

  useEffect(() => {
    if (useSession.getState().featuredLoaded) return;
    let cancelled = false;
    fetch('/api/videos/featured')
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) useSession.getState().setFeatured(data.videos ?? []);
      })
      .catch(() => {
        if (!cancelled) useSession.getState().setFeatured([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen === 'ready') typing.focusInput();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  async function loadVideoById(videoId: string) {
    lastVideoIdRef.current = videoId;
    const store = useSession.getState();
    store.setScreen('loading');
    store.setError(null);
    try {
      const response = await fetch(`/api/videos/${videoId}`);
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.video) {
        throw new Error(body?.error?.message ?? 'Could not load the video.');
      }
      store.loadDetail(body);
      await controls.loadVideo(body.video.youtubeId);
      controls.setSegments(
        body.segments.map((segment: { startMs: number; endMs: number }) => ({
          startMs: segment.startMs,
          endMs: segment.endMs,
        })),
      );
      controls.selectSegment(0, false);
      store.setScreen('ready');
    } catch (loadError) {
      store.setError(
        loadError instanceof Error
          ? loadError.message
          : 'Something went wrong.',
      );
      store.setScreen('error');
    }
  }

  function handlePlay() {
    if (controls.isAtSegmentEnd()) {
      controls.replay();
    } else {
      controls.play();
    }
    useSession.getState().setScreen('playing');
    typing.focusInput();
  }

  function handleRestart() {
    useSession.getState().restartSession();
    controls.restart();
    typing.focusInput();
  }

  function handleNewVideo() {
    controls.pause();
    useSession.getState().clearSession();
  }

  function retry() {
    if (lastVideoIdRef.current) loadVideoById(lastVideoIdRef.current);
  }

  const showTypingArea = displayMode !== 'expandVideo';
  const typingDisabled = !['ready', 'playing', 'paused'].includes(screen);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-foreground text-lg font-semibold tracking-tight">
          Gloomtype
        </h1>
        {screen !== 'idle' && (
          <PracticeToolbar
            onSelectVideo={() => useSession.getState().setSelectOpen(true)}
          />
        )}
      </header>

      {screen === 'error' && error && (
        <div
          role="alert"
          className="border-error/50 bg-error/10 text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
        >
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      {screen === 'idle' ? (
        <section className="flex flex-col gap-6 py-8">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-foreground text-3xl font-bold tracking-tight lg:text-4xl">
              Type along with the video.
            </h2>
            <p className="text-muted-foreground">
              Paste a YouTube link or pick a video, then type each caption as it
              plays.
            </p>
            <Button onClick={() => useSession.getState().setSelectOpen(true)}>
              Select a video
            </Button>
          </div>
          <VideoGrid videos={featured} onSelect={loadVideoById} />
        </section>
      ) : (
        <div
          className={
            showTypingArea
              ? 'grid flex-1 gap-4 lg:grid-cols-[3fr_2fr]'
              : 'grid flex-1 gap-4'
          }
        >
          <div className="flex flex-col gap-4">
            <VideoPanel containerRef={containerRef} onPlay={handlePlay} />
            {!showTypingArea && screen !== 'completed' && video && <StatsBar />}
          </div>
          {showTypingArea && (
            <div className="flex flex-col gap-4">
              <StatsBar />
              <TypingCanvas
                snapshot={engineSnapshot}
                onFocusInput={typing.focusInput}
                disabled={typingDisabled}
              />
            </div>
          )}
        </div>
      )}

      <TypingInput
        inputRef={inputRef}
        onKeyDown={typing.onKeyDown}
        onCompositionEnd={typing.onCompositionEnd}
        disabled={typingDisabled}
      />
      <SelectVideoDialog onSelect={loadVideoById} />
      <SessionSummaryDialog
        onRestart={handleRestart}
        onNewVideo={handleNewVideo}
      />
    </main>
  );
}
