import { z } from 'zod';
import { AppError } from '@/lib/errors';
import type { TranscriptResult } from './types';

const API_BASE = 'https://api.supadata.ai/v1/';
const metadataSchema = z.object({
  platform: z.literal('youtube'),
  type: z.literal('video'),
  id: z.string(),
  title: z.string().min(1),
  author: z.object({ displayName: z.string() }),
  media: z.object({
    duration: z.number().finite().nonnegative().nullable(),
    thumbnailUrl: z.string().url().nullish(),
  }),
});
const transcriptSchema = z.object({
  lang: z.string().min(2),
  content: z.array(
    z.object({
      text: z.string(),
      offset: z.number().finite().nonnegative(),
      duration: z.number().finite().nonnegative(),
    }),
  ),
});
const jobSchema = z.object({ jobId: z.string().min(1).max(128) });
const jobStatusSchema = z.object({
  status: z.enum(['queued', 'active', 'completed', 'failed']),
});

function unavailable() {
  return new AppError(
    'FETCH_FAILED',
    502,
    'The caption service is temporarily unavailable. Please try again later.',
  );
}

async function requestProvider(
  path: string,
  apiKey: string,
  signal: AbortSignal,
  params?: Record<string, string>,
  attempt = 0,
): Promise<{ status: number; body: unknown }> {
  const url = new URL(path, API_BASE);
  for (const [key, value] of Object.entries(params ?? {}))
    url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
    signal,
    cache: 'no-store',
    redirect: 'error',
  });
  if (response.status === 429) {
    if (attempt < 2) {
      const seconds = Number(response.headers.get('Retry-After')) || 1;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(5000, Math.max(1000, seconds * 1000))),
      );
      return requestProvider(path, apiKey, signal, params, attempt + 1);
    }
    throw new AppError(
      'FETCH_FAILED',
      503,
      'The caption service has reached its usage limit. Please try again later.',
    );
  }
  if (response.status === 206)
    throw new AppError(
      'NO_CAPTIONS',
      422,
      'This video has no available captions.',
    );
  if (response.status === 404 || response.status === 403)
    throw new AppError(
      'VIDEO_UNAVAILABLE',
      404,
      'This video is unavailable or restricted.',
    );
  // Provider authentication, subscription, and quota errors are service failures,
  // not evidence that the user's video has no captions. Never echo provider bodies.
  if (!response.ok) throw unavailable();
  return { status: response.status, body: (await response.json()) as unknown };
}

async function fetchCaptions(
  videoUrl: string,
  lang: string,
  apiKey: string,
  signal: AbortSignal,
) {
  const response = await requestProvider('transcript', apiKey, signal, {
    url: videoUrl,
    lang,
    text: 'false',
    mode: 'native',
  });
  if (response.status !== 202) return transcriptSchema.parse(response.body);
  const { jobId } = jobSchema.parse(response.body);
  while (true) {
    signal.throwIfAborted();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const { body } = await requestProvider(
      `transcript/${encodeURIComponent(jobId)}`,
      apiKey,
      signal,
    );
    const { status } = jobStatusSchema.parse(body);
    if (status === 'completed') return transcriptSchema.parse(body);
    if (status === 'failed') throw unavailable();
  }
}

export async function fetchSupadataTranscript(
  videoId: string,
  requestedLang: string,
): Promise<TranscriptResult> {
  const apiKey = process.env.SUPADATA_API_KEY?.trim();
  if (!apiKey) throw unavailable();
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId))
    throw new AppError('INVALID_URL', 400, 'Invalid YouTube video ID.');
  const signal = AbortSignal.timeout(45_000);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const { body } = await requestProvider('metadata', apiKey, signal, {
      url: videoUrl,
    });
    const metadata = metadataSchema.parse(body);
    if (metadata.id !== videoId) throw unavailable();
    const durationSeconds = metadata.media.duration;
    if (!durationSeconds)
      throw new AppError(
        'VIDEO_UNAVAILABLE',
        404,
        'This video is unavailable or still live.',
      );
    if (
      durationSeconds > Number(process.env.IMPORT_MAX_DURATION_SECONDS ?? 3600)
    ) {
      throw new AppError('TOO_LONG', 422, 'This video is too long.');
    }
    const transcript = await fetchCaptions(
      videoUrl,
      requestedLang,
      apiKey,
      signal,
    );
    const cues = transcript.content
      .filter((cue) => cue.text.trim() && cue.duration > 0)
      .map((cue) => ({
        startMs: Math.round(cue.offset),
        endMs: Math.round(cue.offset + cue.duration),
        text: cue.text,
      }))
      .sort((a, b) => a.startMs - b.startMs);
    if (!cues.length)
      throw new AppError(
        'NO_CAPTIONS',
        422,
        'This video has no available captions.',
      );
    return {
      track: {
        lang: transcript.lang,
        kind: 'auto',
        label: `${transcript.lang} captions`,
      },
      details: {
        title: metadata.title,
        channel: metadata.author.displayName,
        thumbnail:
          metadata.media.thumbnailUrl ??
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        durationSeconds: Math.ceil(durationSeconds),
        isLive: false,
      },
      cues,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (
      signal.aborted ||
      (error instanceof Error &&
        ['AbortError', 'TimeoutError'].includes(error.name))
    ) {
      throw new AppError(
        'FETCH_FAILED',
        504,
        'Fetching captions took too long. Please try again.',
      );
    }
    throw unavailable();
  }
}

// Metadata only: previewing a link must not request or import its transcript.
export async function fetchSupadataVideoPreview(
  videoId: string,
  signal: AbortSignal,
) {
  const apiKey = process.env.SUPADATA_API_KEY?.trim();
  if (!apiKey) throw unavailable();
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId))
    throw new AppError('INVALID_URL', 400, 'Invalid YouTube video ID.');
  const { body } = await requestProvider('metadata', apiKey, signal, {
    url: `https://www.youtube.com/watch?v=${videoId}`,
  });
  const metadata = metadataSchema.parse(body);
  if (metadata.id !== videoId || !metadata.media.duration)
    throw new AppError('VIDEO_UNAVAILABLE', 404, 'This video is unavailable.');
  return {
    youtubeId: videoId,
    title: metadata.title,
    channel: metadata.author.displayName,
    thumbnail:
      metadata.media.thumbnailUrl ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    durationSeconds: Math.ceil(metadata.media.duration),
  };
}
