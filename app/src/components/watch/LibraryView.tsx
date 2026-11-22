'use client';

import { useRouter } from 'next/navigation';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import { useSession } from '@/store/session';
import { VideoLibrary } from './VideoLibrary';
import { SelectVideoDialog } from './SelectVideoDialog';

export function LibraryView() {
  const router = useRouter();
  const { loadError, retry } = useVideoLibrary();
  function selectVideo(id: string) {
    router.push(`/?video=${encodeURIComponent(id)}`);
  }
  return (
    <>
      <VideoLibrary
        onSelect={selectVideo}
        loadError={loadError}
        onRetry={retry}
        onAddVideo={() => useSession.getState().setSelectOpen(true)}
      />
      <SelectVideoDialog
        onSelect={selectVideo}
        loadError={loadError}
        onRetry={retry}
      />
    </>
  );
}
