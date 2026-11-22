import { Skeleton } from './skeleton';

export function VideoGridSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading videos"
      className={`grid gap-4 sm:grid-cols-2 ${compact ? '' : 'lg:grid-cols-3'}`}
    >
      {[0, 1, 2].map((key) => (
        <div
          key={key}
          className="bg-card relative aspect-video overflow-hidden rounded-xl border"
        >
          <Skeleton className="absolute inset-0 size-full rounded-none" />
          <div className="absolute inset-x-4 bottom-4 space-y-2">
            <Skeleton className="bg-background/40 h-4 w-5/6" />
            <Skeleton className="bg-background/40 h-3 w-1/3" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading videos</span>
    </div>
  );
}

export function AccountSettingsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading account settings"
      className="space-y-5"
    >
      <span className="sr-only">Loading account settings</span>
      <Skeleton className="h-5 w-24" />
      {[0, 1].map((key) => (
        <div key={key} className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

export function CaptionSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading captions"
      className="flex min-h-0 flex-1 flex-col justify-center gap-4 px-6 py-6"
    >
      <span className="sr-only">Loading captions</span>
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-5/6" />
      <Skeleton className="h-6 w-2/3" />
    </div>
  );
}

export function AuthFormSkeleton({ signup = false }: { signup?: boolean }) {
  return (
    <main
      role="status"
      aria-label="Loading sign-in form"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-12"
    >
      <span className="sr-only">Loading sign-in form</span>
      <Skeleton className="h-6 w-28" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="space-y-4">
        {Array.from({ length: signup ? 3 : 2 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </main>
  );
}
