import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { parseYouTubeUrl } from './url';

describe('parseYouTubeUrl', () => {
  it('parses standard watch URLs', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=aqz-KE-bpKQ')).toBe(
      'aqz-KE-bpKQ',
    );
    expect(
      parseYouTubeUrl('https://youtube.com/watch?v=aqz-KE-bpKQ&t=42s'),
    ).toBe('aqz-KE-bpKQ');
    expect(parseYouTubeUrl('https://m.youtube.com/watch?v=aqz-KE-bpKQ')).toBe(
      'aqz-KE-bpKQ',
    );
  });

  it('parses youtu.be short URLs', () => {
    expect(parseYouTubeUrl('https://youtu.be/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
    expect(parseYouTubeUrl('https://youtu.be/aqz-KE-bpKQ?t=10')).toBe(
      'aqz-KE-bpKQ',
    );
  });

  it('parses shorts, embed, and live URLs', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/shorts/aqz-KE-bpKQ')).toBe(
      'aqz-KE-bpKQ',
    );
    expect(parseYouTubeUrl('https://www.youtube.com/embed/aqz-KE-bpKQ')).toBe(
      'aqz-KE-bpKQ',
    );
    expect(parseYouTubeUrl('https://www.youtube.com/live/aqz-KE-bpKQ')).toBe(
      'aqz-KE-bpKQ',
    );
  });

  it('rejects non-YouTube hosts', () => {
    expect(() =>
      parseYouTubeUrl('https://example.com/watch?v=aqz-KE-bpKQ'),
    ).toThrowError(
      expect.objectContaining({ code: 'INVALID_URL', status: 400 }),
    );
  });

  it('rejects malformed input', () => {
    for (const input of [
      'not a url',
      'https://www.youtube.com/watch',
      'https://www.youtube.com/watch?v=short',
      'https://www.youtube.com/watch?v=has spaces!!',
      'https://youtu.be/',
    ]) {
      expect(() => parseYouTubeUrl(input)).toThrowError(AppError);
      expect(() => parseYouTubeUrl(input)).toThrowError(
        expect.objectContaining({ code: 'INVALID_URL', status: 400 }),
      );
    }
  });
});
