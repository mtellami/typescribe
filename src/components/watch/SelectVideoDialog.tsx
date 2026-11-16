'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSession } from '@/store/session';
import { VideoGrid } from './VideoGrid';
import { ImportVideoForm } from './ImportVideoForm';

export function SelectVideoDialog({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const open = useSession((state) => state.selectOpen);
  const setOpen = useSession((state) => state.setSelectOpen);
  const featured = useSession((state) => state.featured);
  const recent = useSession((state) => state.recentVideos);
  function select(id: string) {
    setOpen(false);
    onSelect(id);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find your next practice</DialogTitle>
          <DialogDescription>
            Bring a video you love, or pick up where you left off.
          </DialogDescription>
        </DialogHeader>
        <ImportVideoForm onSelect={select} />
        {recent.length > 0 && (
          <section className="space-y-3 border-t pt-5">
            <h3 className="text-sm font-medium">Recently practiced</h3>
            <VideoGrid videos={recent} onSelect={select} />
          </section>
        )}
        <section className="space-y-3 border-t pt-5">
          <h3 className="text-sm font-medium">Video library</h3>
          <VideoGrid videos={featured} onSelect={select} />
        </section>
      </DialogContent>
    </Dialog>
  );
}
