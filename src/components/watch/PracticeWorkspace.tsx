'use client';

import type { RefObject } from 'react';
import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/store/session';
import { VideoPanel } from './VideoPanel';
import { TypingCanvas } from './TypingCanvas';
import { StatsBar } from './StatsBar';
import { PracticeToolbar } from './PracticeToolbar';

interface PracticeWorkspaceProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onSelectSegment: (index: number) => void;
  onRestart: () => void;
  onSelectVideo: () => void;
  onSettings: () => void;
  onFocusInput: () => void;
}

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function PracticeWorkspace({
  containerRef,
  onPlay,
  onPause,
  onReplay,
  onSelectSegment,
  onRestart,
  onSelectVideo,
  onSettings,
  onFocusInput,
}: PracticeWorkspaceProps) {
  const screen = useSession((state) => state.screen);
  const video = useSession((state) => state.video);
  const segments = useSession((state) => state.segments);
  const index = useSession((state) => state.segmentIndex);
  const snapshot = useSession((state) => state.engineSnapshot);
  const displayMode = useSession((state) => state.displayMode);
  const stats = useSession((state) => state.segmentStats);
  const disabled = !['ready', 'playing', 'paused'].includes(screen);
  const progress = segments.length
    ? Math.round((Object.keys(stats).length / segments.length) * 100)
    : 0;
  const playing = screen === 'playing';

  return (
    <div
      hidden={screen === 'idle'}
      className="practice-workspace mx-auto w-full max-w-5xl"
      data-layout={displayMode}
    >
      <h1
        className="practice-title text-muted-foreground truncate text-center text-xs font-normal"
        title={video?.title}
      >
        {video?.title ?? 'Preparing your practice…'}
        {video?.channel ? (
          <span className="text-muted-foreground/60"> · {video.channel}</span>
        ) : null}
      </h1>
      {/* This host stays mounted when entering practice or changing layouts. */}
      <section
        hidden={displayMode === 'textFocus'}
        aria-label="Video player"
        className="practice-video-stage"
      >
        <VideoPanel
          containerRef={containerRef}
          onPlay={onPlay}
          className="practice-video-frame rounded-xl shadow-lg shadow-black/15"
        />
      </section>
      <section
        aria-label="Practice controls"
        className="space-y-3 px-0.5 sm:px-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <StatsBar />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous"
              title="Previous line (Shift + Tab)"
              onClick={() => onSelectSegment(index - 1)}
              disabled={disabled || index === 0}
            >
              <SkipBack className="size-4" />
            </Button>
            <Button
              size="icon"
              className="shadow-primary/15 rounded-full shadow-sm"
              aria-label={playing ? 'Pause' : 'Play'}
              title={playing ? 'Pause' : 'Play'}
              onClick={playing ? onPause : onPlay}
              disabled={disabled}
            >
              {playing ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Replay line"
              title="Replay line (Tab)"
              onClick={onReplay}
              disabled={disabled}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next"
              title="Next line (Enter)"
              onClick={() => onSelectSegment(index + 1)}
              disabled={disabled || index >= segments.length - 1}
            >
              <SkipForward className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            role="progressbar"
            aria-label="Session progress"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="bg-muted h-1 flex-1 overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span
            className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums"
            aria-label="Current caption time and video duration"
          >
            {formatTime(segments[index]?.startMs ?? 0)} /{' '}
            {formatTime((video?.durationSeconds ?? 0) * 1000)}
          </span>
        </div>
        <span className="sr-only">
          Line {segments.length ? index + 1 : 0} of {segments.length}
        </span>
      </section>
      <section
        hidden={displayMode === 'expandVideo'}
        aria-label="Typing practice"
        className="practice-typing"
      >
        {screen === 'loading' ? (
          <div
            role="status"
            className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center gap-2 text-sm"
          >
            <Loader2 className="size-4 animate-spin" /> Loading video and
            captions…
          </div>
        ) : (
          <TypingCanvas
            snapshot={snapshot}
            onFocusInput={onFocusInput}
            disabled={disabled}
          />
        )}
        <p className="practice-hint text-muted-foreground/70 shrink-0 px-2 text-center text-xs leading-6">
          Click the text to type <span className="mx-2">·</span> <kbd>Tab</kbd>{' '}
          replay <span className="mx-2">·</span> <kbd>Enter</kbd> next
        </p>
      </section>
      <div className="practice-dock relative z-20">
        <PracticeToolbar
          onSelectVideo={onSelectVideo}
          onRestart={onRestart}
          onSettings={onSettings}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
