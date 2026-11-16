'use client';

import type { RefObject } from 'react';
import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/store/session';
import { cn } from '@/lib/utils';

interface VideoPanelProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onPlay: () => void;
  className?: string;
}

export function VideoPanel({
  containerRef,
  onPlay,
  className,
}: VideoPanelProps) {
  const screen = useSession((state) => state.screen);

  return (
    <div
      className={cn(
        'border-border bg-card relative aspect-video w-full overflow-hidden rounded-lg border',
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {(screen === 'ready' || screen === 'paused') && (
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

      {screen === 'loading' && (
        <div className="bg-card/80 absolute inset-0 flex items-center justify-center">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
