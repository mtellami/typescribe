'use client';

import { useState } from 'react';
import { Plus, Search, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from '@/store/session';
import { VideoGridSkeleton } from '@/components/ui/loading-skeletons';
import { VideoGrid } from './VideoGrid';

export function VideoLibrary({
  onSelect,
  loadError,
  onRetry,
  onAddVideo,
}: {
  onSelect: (id: string) => void;
  loadError: boolean;
  onRetry: () => void;
  onAddVideo: () => void;
}) {
  const featured = useSession((state) => state.featured);
  const loaded = useSession((state) => state.featuredLoaded);
  const recent = useSession((state) => state.recentVideos);
  const [tab, setTab] = useState<'all' | 'recent'>('all');
  const [search, setSearch] = useState('');
  const videos = (tab === 'recent' ? recent : featured).filter((video) =>
    `${video.title} ${video.channel ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Find a video or pick up where you left off.
          </p>
        </div>
        <Button onClick={onAddVideo}>
          <Plus className="size-4" /> Add video
        </Button>
      </div>
      <section className="space-y-5" aria-label="Video library">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Your next practice
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              A familiar voice. A fresh challenge.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
            <Input
              aria-label="Search videos"
              placeholder="Search videos or channels"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div
          className="flex gap-5 border-b"
          role="tablist"
          aria-label="Library view"
        >
          {(['all', 'recent'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls="library-results"
              id={`tab-${value}`}
              onClick={() => setTab(value)}
              className={`border-b-2 px-1 pb-3 text-sm transition-colors ${tab === value ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
            >
              {value === 'all' ? 'All videos' : 'Recently practiced'}
              <span className="bg-muted text-muted-foreground ml-2 rounded px-1.5 py-0.5 text-[10px]">
                {value === 'all' ? featured.length : recent.length}
              </span>
            </button>
          ))}
        </div>
        <div
          id="library-results"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
        >
          {loadError && tab === 'all' ? (
            <div
              role="alert"
              className="bg-card rounded-xl border p-8 text-center"
            >
              <p className="text-sm">We couldn’t load the video library.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={onRetry}
              >
                Try again
              </Button>
            </div>
          ) : !loaded && tab === 'all' ? (
            <VideoGridSkeleton />
          ) : videos.length ? (
            <VideoGrid videos={videos} onSelect={onSelect} />
          ) : (
            <div className="bg-card/50 flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center">
              <Video className="text-muted-foreground size-6" />
              <p className="text-sm font-medium">
                {search
                  ? 'No matching videos'
                  : tab === 'recent'
                    ? 'Your practice starts here'
                    : 'Bring your first video'}
              </p>
              <p className="text-muted-foreground max-w-sm text-sm">
                {search
                  ? 'Try a different title or channel.'
                  : tab === 'recent'
                    ? 'Videos you practice will appear here, ready for another round.'
                    : 'Add a video to turn its captions into a typing session.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
