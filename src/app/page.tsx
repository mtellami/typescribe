'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VideoPanel } from '@/components/watch/VideoPanel';
import { TypingCanvas } from '@/components/watch/TypingCanvas';
import { TypingInput } from '@/components/watch/TypingInput';
import { SelectVideoDialog } from '@/components/watch/SelectVideoDialog';
import { SessionSummaryDialog } from '@/components/watch/SessionSummaryDialog';
import { useTypingSession } from '@/hooks/useTypingSession';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { useSession, type ScreenState } from '@/store/session';
import type { PracticeMode } from '@/lib/contracts';
import type { Density } from '@/lib/typing/types';

const MODE_LABELS: Record<PracticeMode, string> = {
  type: 'Type',
  fill: 'Fill',
  write: 'Write',
};

const DENSITY_LABELS: Record<Density, string> = {
  all: '100%',
  moderate: '55%',
  light: '35%',
  firstLetters: 'First letters',
};

const DISPLAY_MODE_LABELS: Record<
  'default' | 'textFocus' | 'expandVideo',
  string
> = {
  default: 'Default',
  textFocus: 'Text focus',
  expandVideo: 'Video focus',
};

export default function HomePage() {
  const { controls, containerRef } = useYouTubePlayer();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastVideoIdRef = useRef<string | null>(null);
  const typing = useTypingSession(controls, inputRef);

  const screen = useSession((state) => state.screen);
  const error = useSession((state) => state.error);
  const video = useSession((state) => state.video);
  const segments = useSession((state) => state.segments);
  const segmentIndex = useSession((state) => state.segmentIndex);
  const engineSnapshot = useSession((state) => state.engineSnapshot);
  const mode = useSession((state) => state.mode);
  const density = useSession((state) => state.density);
  const displayMode = useSession((state) => state.displayMode);
  const setMode = useSession((state) => state.setMode);
  const setDensity = useSession((state) => state.setDensity);
  const setDisplayMode = useSession((state) => state.setDisplayMode);

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
  }, [screen, typing]);

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

  function handlePause() {
    controls.pause();
    useSession.getState().setScreen('paused');
  }

  function handleReplay() {
    controls.replay();
    useSession.getState().setScreen('playing');
    typing.focusInput();
  }

  function handlePrevious() {
    controls.previous();
    useSession.getState().setScreen('paused');
  }

  function handleNext() {
    controls.next();
    useSession.getState().setScreen('paused');
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

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  const currentSegment = segments[segmentIndex];
  const currentTime = currentSegment
    ? formatTime(currentSegment.startMs)
    : '00:00';
  const totalTime = video ? formatTime(video.durationSeconds * 1000) : '00:00';
  const lineNumber = segmentIndex + 1;
  const totalLines = segments.length;

  const typingDisabled = !['ready', 'playing', 'paused'].includes(screen);
  const showVideo = displayMode !== 'textFocus';
  const showTyping = displayMode !== 'expandVideo';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <h1 className="text-foreground text-lg font-semibold tracking-tight">
          Gloomtype
        </h1>
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <Button variant="ghost" size="sm" asChild>
            <a href="/trending">Trending</a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://typescribe-type.vercel.app"
              target="_blank"
              rel="noopener"
            >
              Support
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href="/store">Store</a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => useSession.getState().setSelectOpen(true)}
          >
            Settings
          </Button>
        </nav>
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
        <section className="flex flex-1 flex-col gap-6 py-8">
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
          <div className="border-border bg-card text-muted-foreground rounded-lg border p-4 text-center">
            No videos yet. Paste a YouTube link to start.
          </div>
        </section>
      ) : (
        <>
          {showVideo && video && (
            <VideoPanel
              containerRef={containerRef}
              onPlay={handlePlay}
              className="border-border bg-card aspect-video w-full overflow-hidden rounded-lg border"
            />
          )}

          <div className="flex flex-col gap-2">
            <div className="border-border flex flex-wrap items-center gap-2 border-b pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestart}
                disabled={
                  (screen as ScreenState) === 'idle' || screen === 'loading'
                }
              >
                Restart
              </Button>

              <Select
                value={mode}
                onValueChange={(value) => setMode(value as PracticeMode)}
              >
                <SelectTrigger className="w-36" aria-label="Practice mode">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODE_LABELS) as PracticeMode[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {MODE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={density}
                onValueChange={(value) => setDensity(value as Density)}
              >
                <SelectTrigger className="w-36" aria-label="Words to type">
                  <SelectValue placeholder="Words" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DENSITY_LABELS) as Density[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {DENSITY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value="default" onValueChange={() => {}}>
                <SelectTrigger className="w-36" aria-label="Practice font">
                  <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="monospace">Monospace</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => useSession.getState().setSelectOpen(true)}
              >
                Customizations
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDisplayMode(
                    displayMode === 'expandVideo' ? 'default' : 'expandVideo',
                  )
                }
              >
                {displayMode === 'expandVideo'
                  ? 'Show typing area'
                  : 'Hide typing area'}
              </Button>
            </div>

            {showTyping && engineSnapshot && (
              <>
                <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-4">
                    <span>
                      Line {lineNumber}/{totalLines}
                    </span>
                    <span>WPM {engineSnapshot.wpm}</span>
                    <span>Accuracy {engineSnapshot.accuracy}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={segmentIndex === 0 || typingDisabled}
                    >
                      Previous
                    </Button>
                    <Button
                      variant={screen === 'playing' ? 'outline' : 'default'}
                      size="sm"
                      onClick={screen === 'playing' ? handlePause : handlePlay}
                      disabled={typingDisabled}
                    >
                      {screen === 'playing' ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReplay}
                      disabled={typingDisabled}
                    >
                      Replay
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={
                        segmentIndex >= segments.length - 1 || typingDisabled
                      }
                    >
                      Next
                    </Button>
                    <Select
                      value={displayMode}
                      onValueChange={(value) =>
                        setDisplayMode(
                          value as 'default' | 'textFocus' | 'expandVideo',
                        )
                      }
                    >
                      <SelectTrigger className="w-36" aria-label="Display mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(DISPLAY_MODE_LABELS) as (
                            'default' | 'textFocus' | 'expandVideo'
                          )[]
                        ).map((value) => (
                          <SelectItem key={value} value={value}>
                            {DISPLAY_MODE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="font-mono text-xs">
                      {currentTime} / {totalTime}
                    </span>
                  </div>
                </div>

                <div className="border-border bg-card relative min-h-48 w-full rounded-lg border p-6">
                  <TypingCanvas
                    snapshot={engineSnapshot}
                    onFocusInput={typing.focusInput}
                    disabled={typingDisabled}
                  />
                </div>
              </>
            )}

            {showTyping && !engineSnapshot && (
              <div className="border-border bg-card flex min-h-48 w-full items-center justify-center rounded-lg border p-6">
                <p className="text-muted-foreground text-lg">
                  Select a video to start practicing.
                </p>
              </div>
            )}
          </div>
        </>
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
