import { z } from 'zod';
import { findVideoByYouTubeId } from '@/db/queries';
import { AppError } from '@/lib/errors';
import type { VideoPreview } from '@/lib/contracts';
import { fetchSupadataVideoPreview } from './supadata-client';

const cache = new Map<string, { video: VideoPreview; expiresAt: number }>();
const oembedSchema = z.object({
  title: z.string().min(1),
  author_name: z.string(),
  thumbnail_url: z.string().url().optional(),
});

export async function getVideoPreview(
  videoId: string,
  signal: AbortSignal,
): Promise<VideoPreview> {
  const stored = await findVideoByYouTubeId(videoId);
  if (stored)
    return {
      youtubeId: stored.youtubeId,
      title: stored.title,
      channel: stored.channel,
      thumbnail:
        stored.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: stored.durationSeconds || null,
    };
  const cached = cache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) return cached.video;

  let video: VideoPreview;
  try {
    const url = new URL('https://www.youtube.com/oembed');
    url.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
    url.searchParams.set('format', 'json');
    const response = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Video metadata unavailable');
    const info = oembedSchema.parse(await response.json());
    video = {
      youtubeId: videoId,
      title: info.title,
      channel: info.author_name,
      thumbnail:
        info.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: null,
    };
  } catch {
    signal.throwIfAborted();
    if (!process.env.SUPADATA_API_KEY?.trim())
      throw new AppError(
        'VIDEO_UNAVAILABLE',
        404,
        'We couldn’t preview this video. Check the link or choose another video.',
      );
    video = await fetchSupadataVideoPreview(
      videoId,
      AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    );
  }
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(videoId, { video, expiresAt: Date.now() + 10 * 60_000 });
  return video;
}
