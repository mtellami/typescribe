'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Keyboard, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PracticeWorkspace } from '@/components/watch/PracticeWorkspace';
import { HomeIntro } from '@/components/watch/HomeIntro';
import { VideoLibrary } from '@/components/watch/VideoLibrary';
import { TypingInput } from '@/components/watch/TypingInput';
import { SelectVideoDialog } from '@/components/watch/SelectVideoDialog';
import { SettingsDialog } from '@/components/watch/SettingsDialog';
import { SessionSummaryDialog } from '@/components/watch/SessionSummaryDialog';
import { useTypingSession } from '@/hooks/useTypingSession';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { useSession } from '@/store/session';
import { videoDetailResponseSchema } from '@/lib/contracts';

export default function HomePage() {
  const { controls, containerRef } = useYouTubePlayer();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef(0);
  const lastVideoIdRef = useRef<string | null>(null);
  const typing = useTypingSession(controls, inputRef);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<'home' | 'library'>('home');
  const [libraryError, setLibraryError] = useState(false);
  const screen = useSession((state) => state.screen);
  const error = useSession((state) => state.error);
  const segments = useSession((state) => state.segments);
  const playbackRate = useSession((state) => state.playbackRate);

  const fetchLibrary = useCallback(async (signal?: AbortSignal) => {
    setLibraryError(false);
    try {
      const response = await fetch('/api/videos/featured', { signal });
      const body = await response.json();
      if (!response.ok || !Array.isArray(body.videos))
        throw new Error('Library unavailable');
      useSession.getState().setFeatured(body.videos);
    } catch {
      if (!signal?.aborted) {
        useSession.getState().setFeatured([]);
        setLibraryError(true);
      }
    }
  }, []);

  useEffect(() => {
    if (useSession.getState().featuredLoaded) return;
    const controller = new AbortController();
    void fetchLibrary(controller.signal);
    return () => controller.abort();
  }, [fetchLibrary]);

  useEffect(() => {
    controls.setPlaybackRate(Number(playbackRate));
  }, [controls, playbackRate]);
  useEffect(() => {
    if (
      screen === 'ready' &&
      !settingsOpen &&
      !useSession.getState().selectOpen
    )
      inputRef.current?.focus();
  }, [screen, settingsOpen]);

  async function loadVideoById(id: string) {
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
  }

  function play() {
    if (controls.isAtSegmentEnd()) controls.replay();
    else controls.play();
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
    controls.selectSegment(index, false);
    useSession.getState().setSegmentIndex(index);
    useSession.getState().setScreen('paused');
    typing.focusInput();
  }
  function restart() {
    controls.pause();
    useSession.getState().restartSession();
    controls.restart();
    typing.focusInput();
  }
  function navigate(nextView: 'home' | 'library') {
    ++requestRef.current;
    controls.pause();
    useSession.getState().clearSession();
    setView(nextView);
  }
  function library() {
    navigate('library');
  }
  function openSettings() {
    if (screen === 'playing') pause();
    setSettingsOpen(true);
  }
  function chooseVideo() {
    if (screen === 'playing') pause();
    useSession.getState().setSelectOpen(true);
  }

  const active = screen !== 'idle';
  const home = !active && view === 'home';
  const disabled = !['ready', 'playing', 'paused'].includes(screen);

  return (
    <div
      className={`mx-auto flex w-full max-w-6xl min-w-0 flex-col px-5 sm:px-8 ${active ? 'practice-shell' : home ? 'home-shell' : 'min-h-dvh'}`}
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-4 border-b ${active ? 'h-14' : home ? 'h-16' : 'min-h-20'}`}
      >
        <button
          type="button"
          onClick={() => navigate('home')}
          aria-label="Gloomtype home"
          className="flex items-center gap-3"
        >
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
            <Keyboard className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            gloomtype<span className="text-primary">.</span>
          </span>
        </button>
        <nav
          className="flex items-center gap-1 sm:gap-3"
          aria-label="Main navigation"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={library}
            aria-current={!active && view === 'library' ? 'page' : undefined}
          >
            <BookOpen className="size-4" /> Library
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openSettings}
            aria-label="Settings"
          >
            <Settings2 className="size-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sr-only sm:hidden">Settings</span>
          </Button>
        </nav>
      </header>
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
        {!active && view === 'home' && (
          <HomeIntro onSelect={loadVideoById} onBrowse={library} />
        )}
        {!active && view === 'library' && (
          <VideoLibrary
            onSelect={loadVideoById}
            loadError={libraryError}
            onRetry={() => void fetchLibrary()}
            onAddVideo={chooseVideo}
          />
        )}
        <PracticeWorkspace
          containerRef={containerRef}
          onPlay={play}
          onPause={pause}
          onReplay={replay}
          onSelectSegment={selectSegment}
          onRestart={restart}
          onSelectVideo={chooseVideo}
          onSettings={openSettings}
          onFocusInput={typing.focusInput}
        />
      </main>
      <footer
        hidden={active}
        className={`text-muted-foreground flex shrink-0 flex-wrap items-center justify-between gap-3 border-t text-xs ${home ? 'home-footer' : 'mt-8 py-5'}`}
      >
        <span>gloomtype · Find your flow, one line at a time.</span>
        <span className="hidden sm:inline">Made for mindful practice.</span>
      </footer>
      <TypingInput
        inputRef={inputRef}
        onKeyDown={typing.onKeyDown}
        onCompositionEnd={typing.onCompositionEnd}
        disabled={disabled || settingsOpen}
      />
      <SelectVideoDialog onSelect={loadVideoById} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <SessionSummaryDialog onRestart={restart} onNewVideo={library} />
    </div>
  );
}
