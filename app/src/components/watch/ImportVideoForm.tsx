'use client';

import Link from 'next/link';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link2, Loader2, Plus, X } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { parseYouTubeUrl } from '@/lib/youtube/url';
import {
  videoDetailResponseSchema,
  videoPreviewSchema,
  type VideoPreview as VideoPreviewData,
} from '@/lib/contracts';
import { useSession } from '@/store/session';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VideoPreview } from './VideoPreview';

type PreviewState = { id: string; data?: VideoPreviewData; error?: string };

export function ImportVideoForm({
  onSelect,
  children,
}: {
  onSelect: (id: string) => void;
  children?: ReactNode;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previews = useRef(new Map<string, VideoPreviewData>());
  let videoId: string | null = null;
  try {
    if (url.trim().length <= 2048) videoId = parseYouTubeUrl(url.trim());
  } catch {}
  const current = preview?.id === videoId ? preview : null;
  const video = current?.data;
  const loading = Boolean(videoId && !video && !current?.error && session);
  const userId = session?.user.id;

  useEffect(() => {
    if (!videoId || !userId) return;
    const id = videoId;
    const cached = previews.current.get(id);
    if (cached) {
      setPreview({ id, data: cached });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/videos/preview?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
          { signal: controller.signal },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            'We couldn’t preview this video. Check the link or choose another video.',
          );
        const data = videoPreviewSchema.parse(body.video);
        if (data.youtubeId !== id)
          throw new Error('The video preview did not match this link.');
        if (controller.signal.aborted) return;
        previews.current.set(id, data);
        setPreview({ id, data });
      } catch (failure) {
        if (!controller.signal.aborted)
          setPreview({
            id,
            error:
              failure instanceof Error
                ? failure.message
                : 'Could not load this video.',
          });
      }
    }, 400);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [videoId, userId]);

  async function handleImport(event: FormEvent) {
    event.preventDefault();
    if (importing || !video || !videoId) return;
    setImporting(true);
    setError(null);
    try {
      const response = await fetch('/api/videos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          lang: 'en',
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          body?.error?.message ?? 'Could not add this video. Try another link.',
        );
      const detail = videoDetailResponseSchema.parse(body);
      const store = useSession.getState();
      store.setFeatured([
        detail.video,
        ...store.featured.filter((item) => item.id !== detail.video.id),
      ]);
      store.addRecentVideo(detail.video);
      onSelect(detail.video.id);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not add this video.',
      );
    } finally {
      setImporting(false);
    }
  }

  if (isPending)
    return (
      <>
        <div
          role="status"
          aria-label="Loading import form"
          className="space-y-3"
        >
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
        {children}
      </>
    );
  if (!session)
    return (
      <>
        <p className="text-muted-foreground text-sm">
          <Link href="/login" className="text-primary underline">
            Log in
          </Link>{' '}
          or{' '}
          <Link href="/signup" className="text-primary underline">
            create an account
          </Link>{' '}
          to add your own YouTube video.
        </p>
        {children}
      </>
    );

  return (
    <form onSubmit={handleImport} className="space-y-5">
      <div className="relative">
        <Link2 className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4" />
        <Input
          id="import-url"
          aria-label="YouTube video link"
          type="text"
          inputMode="url"
          placeholder="Paste a YouTube link…"
          className="h-10 pr-10 pl-10"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          maxLength={2048}
          disabled={importing}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {loading ? (
          <Loader2
            aria-label="Fetching video information"
            className="text-muted-foreground absolute top-3 right-3 size-4 animate-spin"
          />
        ) : url && !importing ? (
          <button
            type="button"
            aria-label="Clear YouTube link"
            onClick={() => {
              setUrl('');
              setError(null);
            }}
            className="text-muted-foreground hover:text-foreground absolute top-1 right-1 flex size-8 items-center justify-center rounded-md"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      {loading ? (
        <div
          role="status"
          aria-label="Loading video preview"
          className="space-y-4"
        >
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="mx-auto h-10 w-40" />
        </div>
      ) : video ? (
        <div className="space-y-4">
          <VideoPreview
            key={`${video.youtubeId}:${importing}`}
            video={video}
            disabled={importing}
          />
          <Button type="submit" disabled={importing} className="w-full">
            {importing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {importing ? 'Adding video…' : 'Add this video'}
          </Button>
          {error && (
            <p role="alert" className="text-error text-sm">
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          {current?.error && (
            <p role="status" className="text-muted-foreground text-xs">
              {current.error}
            </p>
          )}
          {children}
        </>
      )}
    </form>
  );
}
