'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ImportVideoForm({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(event: FormEvent) {
    event.preventDefault();
    if (importing || !url.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const response = await fetch('/api/videos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), lang: 'en' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.video) {
        throw new Error(
          body?.error?.message ??
            'Could not import that video. Try another link.',
        );
      }
      setUrl('');
      onSelect(body.video.id);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not import that video.',
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <form onSubmit={handleImport} className="space-y-3">
      <label htmlFor="import-url" className="text-sm font-medium">
        Practice with your own video
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Link2 className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4" />
          <Input
            id="import-url"
            type="url"
            placeholder="Paste a YouTube link…"
            className="h-10 pl-10"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={importing}
            autoComplete="off"
            aria-describedby="import-help"
          />
        </div>
        <Button
          type="submit"
          className="h-10"
          disabled={importing || !url.trim()}
        >
          {importing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {importing ? 'Importing…' : 'Start practice'}
        </Button>
      </div>
      <p id="import-help" className="text-muted-foreground text-xs">
        Public YouTube videos with English captions. Up to 60 minutes.
      </p>
      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
