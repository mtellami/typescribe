import { z } from 'zod';

export const practiceModeSchema = z.enum(['type', 'fill', 'write']);
export const trackKindSchema = z.enum(['manual', 'auto']);

export const videoSchema = z.object({
  id: z.string(),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string(),
  channel: z.string().nullable(),
  thumbnail: z.string().url().nullable(),
  durationSeconds: z.number().int().nonnegative(),
  sourceLang: z.string(),
  featuredRank: z.number().int().nullable().optional(),
  createdAt: z.number().int(),
});

export const trackSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  lang: z.string(),
  kind: trackKindSchema,
  label: z.string().nullable(),
});

export const segmentSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  idx: z.number().int().nonnegative(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  text: z.string().min(1),
});

export const videoDetailResponseSchema = z.object({
  video: videoSchema,
  track: trackSchema,
  segments: z.array(segmentSchema),
});

export const importRequestSchema = z.object({
  url: z.string().url().max(2048),
  lang: z.string().min(2).max(35).default('en'),
});

export const errorCodeSchema = z.enum([
  'INVALID_URL',
  'NO_CAPTIONS',
  'VIDEO_UNAVAILABLE',
  'TOO_LONG',
  'RATE_LIMITED',
  'FETCH_FAILED',
  'NOT_FOUND',
  'INTERNAL',
]);

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    retryAfterSeconds: z.number().int().positive().optional(),
  }),
});

export type VideoDto = z.infer<typeof videoSchema>;
export type TrackDto = z.infer<typeof trackSchema>;
export type SegmentDto = z.infer<typeof segmentSchema>;
export type VideoDetailResponse = z.infer<typeof videoDetailResponseSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
export type PracticeMode = z.infer<typeof practiceModeSchema>;
