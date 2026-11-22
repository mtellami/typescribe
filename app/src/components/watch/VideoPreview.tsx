'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import type { VideoPreview as VideoPreviewData } from '@/lib/contracts';
import { Button } from '@/components/ui/button';

export function VideoPreview({
  video,
  disabled = false,
}: {
  video: VideoPreviewData;
  disabled?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div
      aria-label="Video preview"
      className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl border"
    >
      {playing && !disabled ? (
        <iframe
          title={`Video preview: ${video.title}`}
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&playsinline=1`}
          className="absolute inset-0 size-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnail}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/10 to-transparent" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Play video preview"
            disabled={disabled}
            onClick={() => setPlaying(true)}
            className="absolute top-[42%] left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-white/20 bg-black/60 text-white hover:bg-black/80 sm:top-1/2 sm:size-14"
          >
            <Play className="ml-0.5 size-6 fill-current" />
          </Button>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-1 p-4 text-white sm:p-5">
            <p className="line-clamp-2 font-medium sm:text-base">
              {video.title}
            </p>
            {video.channel && (
              <p className="truncate text-xs text-white/75">{video.channel}</p>
            )}
          </div>
          {video.durationSeconds && (
            <span className="absolute top-3 right-3 rounded bg-black/70 px-2 py-1 font-mono text-xs text-white">
              {Math.floor(video.durationSeconds / 60)}:
              {String(video.durationSeconds % 60).padStart(2, '0')}
            </span>
          )}
        </>
      )}
    </div>
  );
}
