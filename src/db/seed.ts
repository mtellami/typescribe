import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, pool } from './client';
import { segments, videoTracks, videos } from './schema';
import { SEED_VIDEOS } from '@/data/seed-videos';
import { importVideo } from '@/lib/youtube/import-service';

interface FixtureSegment {
  startMs: number;
  endMs: number;
  text: string;
}

interface Fixture {
  video: {
    youtubeId: string;
    title: string;
    channel: string | null;
    thumbnail: string | null;
    durationSeconds: number;
    sourceLang: string;
    featuredRank?: number | null;
  };
  track: {
    lang: string;
    kind: 'manual' | 'auto';
    label: string | null;
  };
  segments: FixtureSegment[];
}

function parseFixture(path: string): Fixture {
  const raw = readFileSync(resolve(process.cwd(), path), 'utf8');
  return JSON.parse(raw) as Fixture;
}

async function seedFixture(fixture: Fixture): Promise<'inserted' | 'skipped'> {
  const existing = await db
    .select({ id: videos.id })
    .from(videos)
    .where(eq(videos.youtubeId, fixture.video.youtubeId))
    .limit(1);
  if (existing.length > 0) {
    console.log(`skip  ${fixture.video.youtubeId} (already exists)`);
    return 'skipped';
  }

  await db.transaction(async (tx) => {
    const videoId = randomUUID();
    await tx.insert(videos).values({
      id: videoId,
      youtubeId: fixture.video.youtubeId,
      title: fixture.video.title,
      channel: fixture.video.channel,
      thumbnail: fixture.video.thumbnail,
      durationSeconds: fixture.video.durationSeconds,
      sourceLang: fixture.video.sourceLang,
      featuredRank: fixture.video.featuredRank ?? null,
      createdAt: Date.now(),
    });

    const trackId = randomUUID();
    await tx.insert(videoTracks).values({
      id: trackId,
      videoId,
      lang: fixture.track.lang,
      kind: fixture.track.kind,
      label: fixture.track.label,
    });

    await tx.insert(segments).values(
      fixture.segments.map((segment, idx) => ({
        id: randomUUID(),
        trackId,
        idx,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
      })),
    );
  });

  console.log(
    `seed  ${fixture.video.youtubeId} (${fixture.segments.length} segments)`,
  );
  return 'inserted';
}

function fixtureArg(): string | null {
  const args = process.argv.slice(2);
  const index = args.indexOf('--fixture');
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
}

async function main() {
  const fixturePath = fixtureArg();
  if (!fixturePath) {
    for (const sample of SEED_VIDEOS) {
      const detail = await importVideo(sample.url, sample.lang);
      await db
        .update(videos)
        .set({ featuredRank: sample.featuredRank })
        .where(eq(videos.id, detail.video.id));
      console.log(
        `featured ${detail.video.title} (${detail.segments.length} caption lines)`,
      );
    }
    // Keep test data available by ID without presenting it as a playable video.
    await db
      .update(videos)
      .set({ featuredRank: null })
      .where(eq(videos.youtubeId, 'testVideo01'));
    return;
  }
  await seedFixture(parseFixture(fixturePath));
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
