// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ stored: vi.fn(), fallback: vi.fn() }));
vi.mock('@/db/queries', () => ({ findVideoByYouTubeId: mocks.stored }));
vi.mock('./supadata-client', () => ({
  fetchSupadataVideoPreview: mocks.fallback,
}));
const id = 'at_f98qOGY0';
const info = {
  title: 'Preview title',
  author_name: 'Creator',
  thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
};
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.stored.mockResolvedValue(null);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('video metadata previews', () => {
  it('uses stored video information without contacting external providers', async () => {
    mocks.stored.mockResolvedValue({
      youtubeId: id,
      title: 'Saved title',
      channel: 'Saved channel',
      thumbnail: null,
      durationSeconds: 60,
    });
    const { getVideoPreview } = await import('./video-preview');
    const result = await getVideoPreview(id, new AbortController().signal);
    expect(result.title).toBe('Saved title');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.fallback).not.toHaveBeenCalled();
  });

  it('fetches only oEmbed metadata and caches successful previews', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(info)));
    const { getVideoPreview } = await import('./video-preview');
    const signal = new AbortController().signal;
    const first = await getVideoPreview(id, signal);
    expect(first.title).toBe(info.title);
    expect(await getVideoPreview(id, signal)).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetchMock.mock.calls[0][0])).origin).toBe(
      'https://www.youtube.com',
    );
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
      '/oembed',
    );
    expect(mocks.fallback).not.toHaveBeenCalled();
  });

  it('uses metadata-only fallback when YouTube is blocked', async () => {
    vi.stubEnv('SUPADATA_API_KEY', 'test-server-key');
    fetchMock.mockResolvedValue(new Response('', { status: 429 }));
    mocks.fallback.mockResolvedValue({
      youtubeId: id,
      title: 'Fallback title',
      channel: 'Creator',
      thumbnail: info.thumbnail_url,
      durationSeconds: 60,
    });
    const { getVideoPreview } = await import('./video-preview');
    expect(
      (await getVideoPreview(id, new AbortController().signal)).title,
    ).toBe('Fallback title');
    expect(mocks.fallback).toHaveBeenCalledTimes(1);
  });

  it('does not start fallback work after the caller cancels', async () => {
    vi.stubEnv('SUPADATA_API_KEY', 'test-server-key');
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValue(new Error('Aborted'));
    const { getVideoPreview } = await import('./video-preview');
    await expect(getVideoPreview(id, controller.signal)).rejects.toThrow();
    expect(mocks.fallback).not.toHaveBeenCalled();
  });
});
