import { AppError } from './errors';

const limit = Number(process.env.IMPORT_RATE_LIMIT_PER_HOUR ?? 10);
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + 3_600_000 });
    return;
  }

  if (bucket.count >= limit) {
    throw new AppError(
      'RATE_LIMITED',
      429,
      'Too many imports. Try again later.',
      Math.ceil((bucket.resetAt - now) / 1000),
    );
  }

  bucket.count += 1;
}
