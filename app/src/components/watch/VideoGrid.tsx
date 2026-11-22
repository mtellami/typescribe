'use client';

import { Play, Video } from 'lucide-react';
import type { VideoDto } from '@/lib/contracts';

interface VideoGridProps {
  videos: VideoDto[];
  onSelect: (videoId: string) => void;
  compact?: boolean;
}

export function VideoGrid({
  videos,
  onSelect,
  compact = false,
}: VideoGridProps) {
  if (!videos.length)
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        No videos yet. Paste a YouTube link to start.
      </p>
    );
  return (
    <ul
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${compact ? '' : 'lg:grid-cols-3'}`}
    >
      {videos.map((video) => (
        <li key={video.id}>
          <button
            type="button"
            onClick={() => onSelect(video.id)}
            className="group border-border bg-card hover:border-primary/60 focus-visible:ring-ring relative aspect-video w-full overflow-hidden rounded-xl border text-left transition focus-visible:ring-2 focus-visible:outline-none"
          >
            {video.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.thumbnail}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                loading="lazy"
              />
            ) : (
              <Video
                aria-hidden="true"
                className="text-muted-foreground absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2"
              />
            )}
            <span className="absolute inset-0 bg-linear-to-t from-black/95 via-black/25 to-black/5" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Play className="size-4 fill-current" />
              </span>
            </span>
            <span className="absolute top-2 right-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-white">
              {Math.floor(video.durationSeconds / 60)}:
              {String(video.durationSeconds % 60).padStart(2, '0')}
            </span>
            <span className="absolute inset-x-0 bottom-0 space-y-1 p-3 text-white">
              <span className="line-clamp-2 block text-sm leading-snug font-medium">
                {video.title}
              </span>
              {video.channel && (
                <span className="block truncate text-xs text-white/75">
                  {video.channel}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
