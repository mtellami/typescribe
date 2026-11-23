import {
  pgTable,
  text,
  integer,
  bigint,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const trackKindEnum = pgEnum('track_kind', ['manual', 'auto']);

export const videos = pgTable(
  'videos',
  {
    id: text('id').primaryKey(),
    youtubeId: text('youtube_id').notNull(),
    title: text('title').notNull(),
    channel: text('channel'),
    thumbnail: text('thumbnail'),
    durationSeconds: integer('duration_seconds').notNull(),
    sourceLang: text('source_lang').notNull(),
    featuredRank: integer('featured_rank'),
    ownerId: text('owner_id'),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('videos_owner_youtube_id_uq').on(t.ownerId, t.youtubeId),
    index('videos_featured_rank_idx').on(t.featuredRank),
  ],
);

export const videoTracks = pgTable(
  'video_tracks',
  {
    id: text('id').primaryKey(),
    videoId: text('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    lang: text('lang').notNull(),
    kind: trackKindEnum('kind').notNull(),
    label: text('label'),
  },
  (t) => [
    uniqueIndex('tracks_video_lang_kind_uq').on(t.videoId, t.lang, t.kind),
  ],
);

export const segments = pgTable(
  'segments',
  {
    id: text('id').primaryKey(),
    trackId: text('track_id')
      .notNull()
      .references(() => videoTracks.id, { onDelete: 'cascade' }),
    idx: integer('idx').notNull(),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    text: text('text').notNull(),
  },
  (t) => [uniqueIndex('segments_track_idx_uq').on(t.trackId, t.idx)],
);
