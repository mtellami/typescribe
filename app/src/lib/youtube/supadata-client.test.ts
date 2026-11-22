import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSupadataTranscript,
  fetchSupadataVideoPreview,
} from './supadata-client';

const id = 'arj7oStGLkU';
const metadata = {
  platform: 'youtube',
  type: 'video',
  id,
  title: 'A captioned video',
  author: { displayName: 'Creator' },
  media: {
    duration: 120,
    thumbnailUrl: 'https://i.ytimg.com/vi/arj7oStGLkU/hqdefault.jpg',
  },
};
const transcript = {
  lang: 'en',
  content: [
    { text: 'First caption.', offset: 12500, duration: 2300 },
    { text: 'Second caption.', offset: 15000, duration: 3000 },
  ],
};
const response = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers });
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  vi.stubEnv('SUPADATA_API_KEY', 'test-server-key');
  vi.stubEnv('IMPORT_MAX_DURATION_SECONDS', '3600');
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function successfulResponses() {
  fetchMock
    .mockResolvedValueOnce(response(metadata))
    .mockResolvedValueOnce(response(transcript));
}

describe('Supadata caption imports', () => {
  it('fetches only metadata when previewing a link', async () => {
    fetchMock.mockResolvedValueOnce(response(metadata));
    const preview = await fetchSupadataVideoPreview(
      id,
      AbortSignal.timeout(1000),
    );
    expect(preview.title).toBe(metadata.title);
    expect(preview.youtubeId).toBe(id);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
      '/v1/metadata',
    );
  });

  it('uses the native captions endpoint with a server-side key and preserves millisecond timing', async () => {
    successfulResponses();
    const result = await fetchSupadataTranscript(id, 'en');
    const [url, init] = fetchMock.mock.calls[1];
    expect(new URL(String(url)).searchParams.get('mode')).toBe('native');
    expect(new URL(String(url)).searchParams.get('text')).toBe('false');
    expect(init?.headers).toMatchObject({ 'x-api-key': 'test-server-key' });
    expect(result.cues[0]).toEqual({
      text: 'First caption.',
      startMs: 12500,
      endMs: 14800,
    });
    expect(result.details.durationSeconds).toBe(120);
    expect(result.details.channel).toBe('Creator');
    expect(JSON.stringify(result)).not.toContain('test-server-key');
  });

  it('rejects videos over the duration limit before requesting captions', async () => {
    fetchMock.mockResolvedValueOnce(
      response({ ...metadata, media: { ...metadata.media, duration: 3601 } }),
    );
    await expect(fetchSupadataTranscript(id, 'en')).rejects.toMatchObject({
      code: 'TOO_LONG',
      status: 422,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects ongoing videos with no finite duration', async () => {
    fetchMock.mockResolvedValueOnce(
      response({ ...metadata, media: { duration: null } }),
    );
    await expect(fetchSupadataTranscript(id, 'en')).rejects.toMatchObject({
      code: 'VIDEO_UNAVAILABLE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('distinguishes genuinely unavailable captions (HTTP 206) from provider failures', async () => {
    fetchMock
      .mockResolvedValueOnce(response(metadata))
      .mockResolvedValueOnce(
        response({ error: 'transcript-unavailable' }, 206),
      );
    await expect(fetchSupadataTranscript(id, 'en')).rejects.toMatchObject({
      code: 'NO_CAPTIONS',
      status: 422,
    });
  });

  it.each([401, 402, 500, 502])(
    'does not misreport provider HTTP %i as missing captions or leak its response',
    async (status) => {
      fetchMock.mockResolvedValueOnce(
        response({ error: 'test-server-key provider detail' }, status),
      );
      await expect(fetchSupadataTranscript(id, 'en')).rejects.toMatchObject({
        code: 'FETCH_FAILED',
        message: expect.not.stringContaining('test-server-key'),
      });
    },
  );

  it('retries transient rate limiting before succeeding', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(response(metadata))
      .mockResolvedValueOnce(
        response({ error: 'limit-exceeded' }, 429, { 'Retry-After': '1' }),
      )
      .mockResolvedValueOnce(response(transcript));
    const result = fetchSupadataTranscript(id, 'en');
    await vi.advanceTimersByTimeAsync(1000);
    expect((await result).cues).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('stops retrying persistent provider quota failures', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () =>
      response({ error: 'limit-exceeded' }, 429),
    );
    const result = expect(
      fetchSupadataTranscript(id, 'en'),
    ).rejects.toMatchObject({ code: 'FETCH_FAILED', status: 503 });
    await vi.advanceTimersByTimeAsync(3000);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('handles async caption jobs without making a second billable transcript request', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(response(metadata))
      .mockResolvedValueOnce(response({ jobId: 'job-123' }, 202))
      .mockResolvedValueOnce(response({ status: 'active' }))
      .mockResolvedValueOnce(response({ status: 'completed', ...transcript }));
    const result = fetchSupadataTranscript(id, 'en');
    await vi.advanceTimersByTimeAsync(2000);
    expect((await result).cues).toHaveLength(2);
    expect(
      fetchMock.mock.calls.filter(
        ([url]) => new URL(String(url)).pathname === '/v1/transcript',
      ),
    ).toHaveLength(1);
  });

  it('rejects empty or malformed caption results', async () => {
    fetchMock
      .mockResolvedValueOnce(response(metadata))
      .mockResolvedValueOnce(response({ ...transcript, content: [] }));
    await expect(fetchSupadataTranscript(id, 'en')).rejects.toMatchObject({
      code: 'NO_CAPTIONS',
    });
    fetchMock.mockResolvedValueOnce(response(metadata)).mockResolvedValueOnce(
      response({
        ...transcript,
        content: [{ text: 'Bad timing', offset: -10, duration: 500 }],
      }),
    );
    await expect(fetchSupadataTranscript(id, 'en')).rejects.toMatchObject({
      code: 'FETCH_FAILED',
    });
  });

  it('fails without sending a request when credentials are missing', async () => {
    vi.stubEnv('SUPADATA_API_KEY', '');
    await expect(fetchSupadataTranscript(id, 'en')).rejects.toMatchObject({
      code: 'FETCH_FAILED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
