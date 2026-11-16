import { asc, eq, isNotNull } from 'drizzle-orm';
import { db } from './client';
import { segments, videoTracks, videos } from './schema';
import type {
  SegmentDto,
  TrackDto,
  VideoDetailResponse,
  VideoDto,
} from '@/lib/contracts';

type VideoRow = typeof videos.$inferSelect;
type TrackRow = typeof videoTracks.$inferSelect;
type SegmentRow = typeof segments.$inferSelect;

export function toVideoDto(row: VideoRow): VideoDto {
  return {
    id: row.id,
    youtubeId: row.youtubeId,
    title: row.title,
    channel: row.channel,
    thumbnail: row.thumbnail,
    durationSeconds: row.durationSeconds,
    sourceLang: row.sourceLang,
    featuredRank: row.featuredRank,
    createdAt: row.createdAt,
  };
}

export function toTrackDto(row: TrackRow): TrackDto {
  return {
    id: row.id,
    videoId: row.videoId,
    lang: row.lang,
    kind: row.kind,
    label: row.label,
  };
}

export function toSegmentDto(row: SegmentRow): SegmentDto {
  return {
    id: row.id,
    trackId: row.trackId,
    idx: row.idx,
    startMs: row.startMs,
    endMs: row.endMs,
    text: row.text,
  };
}

export function pickTrack(
  rows: TrackRow[],
  lang: string | null | undefined,
  sourceLang: string,
): TrackRow | undefined {
  if (lang) {
    const requested = lang.toLowerCase();
    const primary = requested.split('-')[0];
    const pools = [
      rows.filter((r) => r.lang.toLowerCase() === requested),
      rows.filter((r) => r.lang.toLowerCase().split('-')[0] === primary),
    ];
    for (const pool of pools) {
      const match =
        pool.find((r) => r.kind === 'manual') ??
        pool.find((r) => r.kind === 'auto');
      if (match) return match;
    }
    return undefined;
  }
  const manual = rows.filter((r) => r.kind === 'manual');
  const auto = rows.filter((r) => r.kind === 'auto');
  return (
    manual.find((r) => r.lang.toLowerCase() === sourceLang.toLowerCase()) ??
    manual[0] ??
    auto[0]
  );
}

export async function getVideoDetail(
  id: string,
  lang?: string | null,
): Promise<VideoDetailResponse | null> {
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);
  if (!video) return null;

  const tracks = await db
    .select()
    .from(videoTracks)
    .where(eq(videoTracks.videoId, video.id));
  const track = pickTrack(tracks, lang, video.sourceLang);
  if (!track) return null;

  const rows = await db
    .select()
    .from(segments)
    .where(eq(segments.trackId, track.id))
    .orderBy(asc(segments.idx));
  if (rows.length === 0) return null;

  return {
    video: toVideoDto(video),
    track: toTrackDto(track),
    segments: rows.map(toSegmentDto),
  };
}

export async function listFeaturedVideos(limit = 20): Promise<VideoDto[]> {
  const rows = await db
    .select()
    .from(videos)
    .where(isNotNull(videos.featuredRank))
    .orderBy(asc(videos.featuredRank))
    .limit(limit);
  return rows.map(toVideoDto);
}

export async function findVideoByYouTubeId(
  youtubeId: string,
): Promise<VideoRow | null> {
  const [row] = await db
    .select()
    .from(videos)
    .where(eq(videos.youtubeId, youtubeId))
    .limit(1);
  return row ?? null;
}

export type { VideoRow, TrackRow, SegmentRow };
