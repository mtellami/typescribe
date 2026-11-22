import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoGridSkeleton } from '@/components/ui/loading-skeletons';

export default function LoadingLibrary() {
  return (
    <AppShell>
      <div className="space-y-8">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <div className="flex justify-between gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-64 max-w-1/2" />
        </div>
        <VideoGridSkeleton />
      </div>
    </AppShell>
  );
}
