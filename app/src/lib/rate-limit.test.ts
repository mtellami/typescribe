import { describe, expect, it } from 'vitest';
import { AppError } from './errors';
import { checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  it('allows requests under the hourly limit and throws after it', () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const limit = Number(process.env.IMPORT_RATE_LIMIT_PER_HOUR ?? 10);

    for (let i = 0; i < limit; i++) {
      expect(() => checkRateLimit(key)).not.toThrow();
    }

    try {
      checkRateLimit(key);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('RATE_LIMITED');
      expect((error as AppError).status).toBe(429);
      expect((error as AppError).retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});
