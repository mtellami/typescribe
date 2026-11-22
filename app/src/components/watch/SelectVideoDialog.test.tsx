import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectVideoDialog } from './SelectVideoDialog';
import { useSession } from '@/store/session';

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: 'picker-user' } },
      isPending: false,
    }),
  },
}));
const firstId = 'at_f98qOGY0';
const secondId = 'RcGyVTAoXEU';
const preview = {
  youtubeId: firstId,
  title: 'A previewed video',
  channel: 'Preview channel',
  thumbnail: `https://i.ytimg.com/vi/${firstId}/hqdefault.jpg`,
  durationSeconds: 60,
};
const video = {
  id: 'saved-video',
  youtubeId: firstId,
  title: 'A saved video',
  channel: 'Creator',
  thumbnail: preview.thumbnail,
  durationSeconds: 60,
  sourceLang: 'en',
  createdAt: 0,
};
const detail = {
  video,
  track: {
    id: 'track',
    videoId: video.id,
    lang: 'en',
    kind: 'manual',
    label: 'English',
  },
  segments: [
    {
      id: 'caption',
      trackId: 'track',
      idx: 0,
      startMs: 0,
      endMs: 1000,
      text: 'Hello world.',
    },
  ],
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  useSession.setState(useSession.getInitialState(), true);
  useSession.setState({
    selectOpen: true,
    featuredLoaded: true,
    featured: [video],
  });
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function waitForPreview() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
}

describe('preview-first video picker', () => {
  it('defaults to Recent and keeps the tabs for an empty or invalid URL', () => {
    render(<SelectVideoDialog onSelect={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Recent/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.queryByRole('button', { name: 'Start practice' }),
    ).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('textbox', { name: 'YouTube video link' }),
      { target: { value: 'not a youtube link' } },
    );
    expect(screen.getByRole('tab', { name: /Recent/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.queryByRole('button', { name: 'Add this video' }),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Library/ }), {
      button: 0,
      ctrlKey: false,
    });
    expect(
      screen.getByRole('button', { name: /A saved video/ }),
    ).toBeInTheDocument();
  });

  it('debounces preview fetching, remains paused, and imports only after Add this video', async () => {
    const selected = vi.fn();
    fetchMock
      .mockResolvedValueOnce(json({ video: preview }))
      .mockResolvedValueOnce(json(detail));
    render(<SelectVideoDialog onSelect={selected} />);
    fireEvent.change(
      screen.getByRole('textbox', { name: 'YouTube video link' }),
      { target: { value: `https://www.youtube.com/watch?v=${firstId}&t=16s` } },
    );
    expect(
      screen.getByRole('status', { name: 'Loading video preview' }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await waitForPreview();
    expect(screen.getByText(preview.title)).toBeInTheDocument();
    expect(
      screen.queryByTitle(`Video preview: ${preview.title}`),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/videos/preview?',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play video preview' }));
    expect(
      screen.getByTitle(`Video preview: ${preview.title}`),
    ).toHaveAttribute('src', expect.stringContaining('autoplay=1'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add this video' }));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/videos/import');
    expect(selected).toHaveBeenCalledWith(video.id);
    expect(useSession.getState().featured[0].id).toBe(video.id);
    expect(useSession.getState().recentVideos[0].id).toBe(video.id);
    expect(useSession.getState().selectOpen).toBe(false);
  });

  it('cancels stale preview requests when the link changes', async () => {
    let resolveOld!: (value: Response) => void;
    fetchMock
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveOld = resolve;
        }),
      )
      .mockResolvedValueOnce(
        json({
          video: { ...preview, youtubeId: secondId, title: 'New link preview' },
        }),
      );
    render(<SelectVideoDialog onSelect={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'YouTube video link' });
    fireEvent.change(input, {
      target: { value: `https://youtu.be/${firstId}` },
    });
    await waitForPreview();
    fireEvent.change(input, {
      target: { value: `https://youtu.be/${secondId}` },
    });
    await waitForPreview();
    await act(async () => {
      resolveOld(json({ video: preview }));
    });
    expect(screen.getByText('New link preview')).toBeInTheDocument();
    expect(screen.queryByText(preview.title)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('falls back to Recent when a preview is unavailable', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ error: { message: 'Unavailable' } }, 404),
    );
    render(<SelectVideoDialog onSelect={vi.fn()} />);
    fireEvent.change(
      screen.getByRole('textbox', { name: 'YouTube video link' }),
      { target: { value: `https://youtu.be/${firstId}` } },
    );
    await waitForPreview();
    expect(screen.getByRole('tab', { name: /Recent/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.queryByRole('button', { name: 'Add this video' }),
    ).not.toBeInTheDocument();
  });

  it('clearing the link restores Recent without adding anything', async () => {
    fetchMock.mockResolvedValueOnce(json({ video: preview }));
    render(<SelectVideoDialog onSelect={vi.fn()} />);
    fireEvent.change(
      screen.getByRole('textbox', { name: 'YouTube video link' }),
      { target: { value: `https://youtu.be/${firstId}` } },
    );
    await waitForPreview();
    fireEvent.click(screen.getByRole('button', { name: 'Clear YouTube link' }));
    expect(screen.getByRole('tab', { name: /Recent/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
