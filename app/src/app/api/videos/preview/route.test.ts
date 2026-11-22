// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), preview: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock('@/lib/youtube/video-preview', () => ({
  getVideoPreview: mocks.preview,
}));
import { GET } from './route';
beforeEach(() => vi.resetAllMocks());

describe('video preview route', () => {
  it('requires authentication before requesting metadata', async () => {
    mocks.session.mockResolvedValue(null);
    expect(
      (
        await GET(
          new Request(
            'http://localhost:3000/api/videos/preview?url=https://youtu.be/at_f98qOGY0',
          ),
        )
      ).status,
    ).toBe(401);
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it('rejects unrelated URLs before requesting metadata', async () => {
    mocks.session.mockResolvedValue({ user: { id: 'user' } });
    expect(
      (
        await GET(
          new Request(
            'http://localhost:3000/api/videos/preview?url=https://example.com/video',
          ),
        )
      ).status,
    ).toBe(400);
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it('returns metadata for a canonicalized video ID', async () => {
    mocks.session.mockResolvedValue({ user: { id: 'user' } });
    mocks.preview.mockResolvedValue({
      youtubeId: 'at_f98qOGY0',
      title: 'Preview title',
    });
    const response = await GET(
      new Request(
        'http://localhost:3000/api/videos/preview?url=https://youtu.be/at_f98qOGY0',
      ),
    );
    expect(response.status).toBe(200);
    expect(mocks.preview).toHaveBeenCalledWith(
      'at_f98qOGY0',
      expect.any(AbortSignal),
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
