'use client';

import { Play } from 'lucide-react';
import type { VideoDto } from '@/lib/contracts';

interface VideoGridProps {
  videos: VideoDto[];
  onSelect: (videoId: string) => void;
}

export function VideoGrid({ videos, onSelect }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <p className="text-muted-foreground">
        No videos yet. Paste a YouTube link to start.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <li key={video.id}>
          <button
            type="button"
            onClick={() => onSelect(video.id)}
            className="group border-border bg-card hover:border-primary/60 focus-visible:ring-ring w-full overflow-hidden rounded-xl border text-left transition focus-visible:ring-2 focus-visible:outline-none"
          >
            <div className="bg-muted relative aspect-video w-full">
              {video.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnail}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <span className="flex size-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Play className="size-4 fill-current" />
                </span>
              </span>
              <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-white">
                {Math.floor(video.durationSeconds / 60)}:
                {String(video.durationSeconds % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="space-y-2 p-4">
              <p className="text-foreground group-hover:text-primary line-clamp-2 text-sm font-medium">
                {video.title}
              </p>
              {video.channel && (
                <p className="text-muted-foreground line-clamp-1 text-xs">
                  {video.channel}
                </p>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
