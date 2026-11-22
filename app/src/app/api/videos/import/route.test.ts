// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  importVideo: vi.fn(),
  checkRateLimit: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock('@/lib/youtube/import-service', () => ({
  importVideo: mocks.importVideo,
}));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }));
import { POST } from './route';

beforeEach(() => vi.resetAllMocks());

function request() {
  return new Request('http://localhost:3000/api/videos/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      lang: 'en',
    }),
  });
}

describe('video import authorization', () => {
  it('rejects guests before importing or consuming quota', async () => {
    mocks.getSession.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.importVideo).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it('uses the authenticated user for quota and imports the video', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user-123' } });
    mocks.importVideo.mockResolvedValue({ video: { id: 'video-123' } });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith('user-123');
    expect(mocks.importVideo).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      'en',
    );
  });
});
