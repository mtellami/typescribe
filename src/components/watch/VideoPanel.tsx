'use client';

import type { RefObject } from 'react';
import { Loader2, Play } from 'lucide-react';
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
  const video = useSession((state) => state.video);

  return (
    <div
      className={cn(
        'border-border bg-card relative aspect-video w-full overflow-hidden rounded-lg border',
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {screen === 'loading' && (
        <div className="bg-card/80 absolute inset-0 flex items-center justify-center">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      )}

      {screen === 'ready' && (
        <div className="from-background/90 text-muted-foreground pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-4 text-center text-sm">
          Press play or start typing
        </div>
      )}

      {screen === 'paused' && video && (
        <button
          type="button"
          aria-label="Play"
          onClick={onPlay}
          className="bg-background/60 hover:bg-background/40 absolute inset-0 flex items-center justify-center transition"
        >
          <span className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full">
            <Play className="size-7 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}
