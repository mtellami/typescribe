import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { segments, videoTracks, videos } from '@/db/schema';
import {
  findVideoByYouTubeId,
  getVideoDetail,
  toSegmentDto,
  toTrackDto,
  toVideoDto,
} from '@/db/queries';
import type { VideoDetailResponse } from '@/lib/contracts';
import { AppError } from '@/lib/errors';
import { segmentCues } from '@/lib/transcript/segment';
import { fetchVideoTranscript } from './transcript-client';
import { parseYouTubeUrl } from './url';
import type { TranscriptClient } from './types';

const inFlight = new Map<string, Promise<VideoDetailResponse>>();

export interface ImportOptions {
  client?: TranscriptClient;
}

async function findByYouTubeIdAndLang(
  youtubeId: string,
  lang: string,
): Promise<VideoDetailResponse | null> {
  const video = await findVideoByYouTubeId(youtubeId);
  if (!video) return null;
  return getVideoDetail(video.id, lang);
}

export async function importVideo(
  url: string,
  lang: string,
  options: ImportOptions = {},
): Promise<VideoDetailResponse> {
  const youtubeId = parseYouTubeUrl(url);

  const existing = await findByYouTubeIdAndLang(youtubeId, lang);
  if (existing) return existing;

  const key = `${youtubeId}:${lang}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = importVideoInternal(youtubeId, lang, options).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

async function importVideoInternal(
  youtubeId: string,
  lang: string,
  options: ImportOptions,
): Promise<VideoDetailResponse> {
  const client: TranscriptClient = {
    fetch: options.client?.fetch ?? fetchVideoTranscript,
  };
  const result = await client.fetch(youtubeId, lang);
  const timed = segmentCues(result.cues);
  if (timed.length === 0) {
    throw new AppError('NO_CAPTIONS', 422, 'This video has no captions.');
  }

  return db.transaction(async (tx) => {
    await tx
      .insert(videos)
      .values({
        id: crypto.randomUUID(),
        youtubeId,
        title: result.details.title,
        channel: result.details.channel,
        thumbnail: result.details.thumbnail,
        durationSeconds: result.details.durationSeconds,
        sourceLang: result.track.lang,
        createdAt: Math.floor(Date.now() / 1000),
      })
      .onConflictDoNothing({ target: videos.youtubeId });

    const [video] = await tx
      .select()
      .from(videos)
      .where(eq(videos.youtubeId, youtubeId))
      .limit(1);

    await tx
      .insert(videoTracks)
      .values({
        id: crypto.randomUUID(),
        videoId: video.id,
        lang: result.track.lang,
        kind: result.track.kind,
        label: result.track.label,
      })
      .onConflictDoNothing({
        target: [videoTracks.videoId, videoTracks.lang, videoTracks.kind],
      });

    const [track] = await tx
      .select()
      .from(videoTracks)
      .where(
        and(
          eq(videoTracks.videoId, video.id),
          eq(videoTracks.lang, result.track.lang),
          eq(videoTracks.kind, result.track.kind),
        ),
      )
      .limit(1);
    if (!track) {
      throw new AppError('NO_CAPTIONS', 422, 'This video has no captions.');
    }

    const [existing] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(segments)
      .where(eq(segments.trackId, track.id));

    if (existing.count === 0) {
      await tx.insert(segments).values(
        timed.map((segment, index) => ({
          id: crypto.randomUUID(),
          trackId: track.id,
          idx: index,
          startMs: segment.startMs,
          endMs: segment.endMs,
          text: segment.text,
        })),
      );
    }

    const rows = await tx
      .select()
      .from(segments)
      .where(eq(segments.trackId, track.id))
      .orderBy(segments.idx);

    return {
      video: toVideoDto(video),
      track: toTrackDto(track),
      segments: rows.map(toSegmentDto),
    };
  });
}
