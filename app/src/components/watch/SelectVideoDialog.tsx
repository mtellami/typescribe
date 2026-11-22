'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/store/session';
import { Button } from '@/components/ui/button';
import { VideoGridSkeleton } from '@/components/ui/loading-skeletons';
import { VideoGrid } from './VideoGrid';
import { ImportVideoForm } from './ImportVideoForm';

export function SelectVideoDialog({
  onSelect,
  loadError = false,
  onRetry,
}: {
  onSelect: (id: string) => void;
  loadError?: boolean;
  onRetry?: () => void;
}) {
  const open = useSession((state) => state.selectOpen);
  const setOpen = useSession((state) => state.setSelectOpen);
  const loaded = useSession((state) => state.featuredLoaded);
  const library = useSession((state) => state.featured);
  const recent = useSession((state) => state.recentVideos);
  function select(id: string) {
    setOpen(false);
    onSelect(id);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        overlayClassName="video-picker-overlay"
        className="video-picker-dialog max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-6 sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Find your next practice</DialogTitle>
          <DialogDescription>
            Paste a YouTube link to preview it, or choose a video below.
          </DialogDescription>
        </DialogHeader>
        <div className="video-picker-body min-h-0 min-w-0 overflow-y-auto">
          <ImportVideoForm onSelect={select}>
            <Tabs defaultValue="recent" className="gap-4">
              <TabsList
                variant="line"
                aria-label="Video collection"
                className="w-full justify-start border-b pb-2"
              >
                <TabsTrigger value="recent" className="flex-none px-3">
                  Recent{' '}
                  <span className="text-muted-foreground text-xs">
                    {recent.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="library" className="flex-none px-3">
                  Library{' '}
                  <span className="text-muted-foreground text-xs">
                    {library.length}
                  </span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="recent">
                {recent.length ? (
                  <VideoGrid videos={recent} onSelect={select} compact />
                ) : (
                  <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center text-sm">
                    <p className="text-foreground mb-1 font-medium">
                      No recent videos yet
                    </p>
                    Videos you practice will appear here. Paste a link or browse
                    the Library.
                  </div>
                )}
              </TabsContent>
              <TabsContent value="library">
                {loadError ? (
                  <div role="alert" className="space-y-3 text-sm">
                    <p>We couldn’t load the video library.</p>
                    <Button variant="outline" onClick={onRetry}>
                      Try again
                    </Button>
                  </div>
                ) : loaded ? (
                  <VideoGrid videos={library} onSelect={select} compact />
                ) : (
                  <VideoGridSkeleton compact />
                )}
              </TabsContent>
            </Tabs>
          </ImportVideoForm>
        </div>
      </DialogContent>
    </Dialog>
  );
}
