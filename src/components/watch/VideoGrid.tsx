'use client';

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
            className="group border-border bg-card hover:border-primary/60 focus-visible:ring-ring w-full overflow-hidden rounded-lg border text-left transition focus-visible:ring-2 focus-visible:outline-none"
          >
            <div className="bg-muted aspect-video w-full">
              {video.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="space-y-1 p-3">
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
