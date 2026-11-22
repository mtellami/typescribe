import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountSettingsSkeleton } from '@/components/ui/loading-skeletons';

export default function LoadingSettings() {
  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-8">
        <Skeleton className="h-9 w-36" />
        <AccountSettingsSkeleton />
        <div className="space-y-5 border-t pt-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </AppShell>
  );
}
