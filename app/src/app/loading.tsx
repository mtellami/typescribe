'use client';

import { Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PracticeWorkspace } from '@/components/watch/PracticeWorkspace';

const noop = () => {};

function PracticeLoading() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  return (
    <div className="practice-shell mx-auto flex w-full max-w-6xl min-w-0 flex-col px-5 sm:px-8">
      <SiteHeader compact />
      <main className="practice-main" inert>
        <PracticeWorkspace
          loading
          containerRef={containerRef}
          onPlay={noop}
          onPause={noop}
          onReplay={noop}
          onSelectSegment={noop}
          onRestart={noop}
          onSelectVideo={noop}
          onFocusInput={noop}
        />
      </main>
    </div>
  );
}

function RouteLoading() {
  const searchParams = useSearchParams();
  return searchParams.get('video') ? <PracticeLoading /> : <HomeLoading />;
}

export default function Loading() {
  return (
    <Suspense fallback={<PracticeLoading />}>
      <RouteLoading />
    </Suspense>
  );
}

function HomeLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Typescribe"
      className="mx-auto min-h-dvh max-w-6xl px-5 sm:px-8"
    >
      <span className="sr-only">Loading Typescribe</span>
      <div className="flex h-16 items-center justify-between border-b">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div className="grid items-center gap-10 py-16 md:grid-cols-2">
        <div className="space-y-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-12 w-5/6" />
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      </div>
      <div className="grid grid-cols-3 gap-5 border-t py-6">
        {[0, 1, 2].map((key) => (
          <div key={key} className="space-y-3">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
