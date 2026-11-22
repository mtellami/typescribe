'use client';

import type { RefObject } from 'react';
import { Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useSession } from '@/store/session';
import { cn } from '@/lib/utils';

interface VideoPanelProps {
  loading?: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  onPlay: () => void;
  className?: string;
}

export function VideoPanel({
  loading = false,
  containerRef,
  onPlay,
  className,
}: VideoPanelProps) {
  const screen = useSession((state) => state.screen);
  const isLoading = loading || screen === 'loading';

  return (
    <div
      className={cn(
        'border-border bg-card relative aspect-video w-full overflow-hidden rounded-lg border',
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {!isLoading && (screen === 'ready' || screen === 'paused') && (
        <Button
          onClick={onPlay}
          aria-label={screen === 'paused' ? 'Resume video' : 'Start video'}
          title={screen === 'paused' ? 'Resume video' : 'Start video'}
          size="icon"
          className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg shadow-black/25 sm:size-16"
        >
          <Play className="size-6 fill-current sm:size-7" />
        </Button>
      )}

      {isLoading && (
        <div
          role="status"
          aria-label="Loading video"
          className="bg-card absolute inset-0"
        >
          <Skeleton className="size-full rounded-none" />
          <span className="sr-only">Loading video</span>
        </div>
      )}
    </div>
  );
}
