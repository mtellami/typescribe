'use client';

import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSession } from '@/store/session';
import { VideoGrid } from './VideoGrid';

interface SelectVideoDialogProps {
  onSelect: (videoId: string) => void;
}

export function SelectVideoDialog({ onSelect }: SelectVideoDialogProps) {
  const open = useSession((state) => state.selectOpen);
  const setOpen = useSession((state) => state.setSelectOpen);
  const featured = useSession((state) => state.featured);
  const recent = useSession((state) => state.recentVideos);
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  function close() {
    setImportError(null);
    setOpen(false);
  }

  async function handleImport(event: FormEvent) {
    event.preventDefault();
    if (importing || !url.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const response = await fetch('/api/videos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), lang: 'en' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.video) {
        throw new Error(body?.error?.message ?? 'Could not import that video.');
      }
      setUrl('');
      setOpen(false);
      onSelect(body.video.id);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Could not import that video.',
      );
    } finally {
      setImporting(false);
    }
  }

  function handleRecentSelect(videoId: string) {
    close();
    onSelect(videoId);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select a video</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleImport} className="space-y-2">
          <label htmlFor="import-url" className="text-sm font-medium">
            Paste a YouTube link
          </label>
          <div className="flex gap-2">
            <Input
              id="import-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={importing}
              autoComplete="off"
            />
            <Button type="submit" disabled={importing || !url.trim()}>
              {importing && <Loader2 className="size-4 animate-spin" />}
              {importing ? 'Importing…' : 'Import'}
            </Button>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="text-muted-foreground min-h-4 text-sm"
          >
            {importError && <span className="text-error">{importError}</span>}
          </p>
        </form>

        {recent.length > 0 && (
          <div className="border-border border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">Recent</h3>
            <VideoGrid videos={recent} onSelect={handleRecentSelect} />
          </div>
        )}

        <div className="border-border border-t pt-4">
          <VideoGrid
            videos={featured}
            onSelect={(videoId) => {
              close();
              onSelect(videoId);
            }}
          />
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={close}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
