import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { videos } from '@/db/schema';
import type { TranscriptClient, TranscriptResult } from './types';

const YOUTUBE_ID = 'aqz-KE-bpKQ';
const URL = `https://www.youtube.com/watch?v=${YOUTUBE_ID}`;

function fakeResult(): TranscriptResult {
  return {
    track: { lang: 'en', kind: 'manual', label: 'English' },
    details: {
      title: 'Import Test Video',
      channel: 'Gloomtype Tests',
      thumbnail: `https://i.ytimg.com/vi/${YOUTUBE_ID}/hqdefault.jpg`,
      durationSeconds: 12,
      isLive: false,
    },
    cues: [
      { startMs: 0, endMs: 3000, text: 'The quick brown fox jumps.' },
      { startMs: 3300, endMs: 6000, text: 'Pack my box with five dozen.' },
      { startMs: 6300, endMs: 9000, text: 'Sphinx of black quartz, judge.' },
    ],
  };
}

async function cleanup() {
  await db.delete(videos).where(eq(videos.youtubeId, YOUTUBE_ID));
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await db.$client.end?.();
});

describe('importVideo (integration)', () => {
  it('imports a transcript, segments it, and serves the second call from cache', async () => {
    const { importVideo } = await import('./import-service');

    let fetchCount = 0;
    const client: TranscriptClient = {
      fetch: async () => {
        fetchCount += 1;
        return fakeResult();
      },
    };

    const first = await importVideo(URL, 'en', { client });
    expect(fetchCount).toBe(1);
    expect(first.video.youtubeId).toBe(YOUTUBE_ID);
    expect(first.video.title).toBe('Import Test Video');
    expect(first.track.lang).toBe('en');
    expect(first.track.kind).toBe('manual');
    expect(first.segments.length).toBeGreaterThanOrEqual(3);
    expect(first.segments[0].idx).toBe(0);
    expect(first.segments[0].text).toBe('The quick brown fox jumps.');
    for (const segment of first.segments) {
      expect(segment.endMs).toBeGreaterThan(segment.startMs);
    }

    const second = await importVideo(URL, 'en', { client });
    expect(fetchCount).toBe(1);
    expect(second.video.id).toBe(first.video.id);
    expect(second.track.id).toBe(first.track.id);
    expect(second.segments).toEqual(first.segments);

    const [row] = await db
      .select()
      .from(videos)
      .where(eq(videos.youtubeId, YOUTUBE_ID))
      .limit(1);
    expect(row.title).toBe('Import Test Video');
  });

  it('returns the cached video on a fresh call without a client', async () => {
    const { importVideo } = await import('./import-service');
    const detail = await importVideo(URL, 'en');
    expect(detail.video.youtubeId).toBe(YOUTUBE_ID);
    expect(detail.segments.length).toBeGreaterThanOrEqual(3);
  });
});
