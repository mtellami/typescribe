import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/page';
import { useSession } from '@/store/session';
import { createPlayerAdapter } from '@/lib/player';
import { FakePlayerAdapter } from '@/lib/player/fake';

vi.mock('@/lib/player', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/player')>();
  return {
    ...original,
    createPlayerAdapter: vi.fn(
      () => new original.FakePlayerAdapter({ autoTick: false }),
    ),
  };
});

const video = {
  id: 'sample',
  youtubeId: 'RcGyVTAoXEU',
  title: 'A real practice video',
  channel: 'TED',
  thumbnail: null,
  durationSeconds: 10,
  sourceLang: 'en',
  createdAt: 0,
};
const detail = {
  video,
  track: {
    id: 'track',
    videoId: 'sample',
    lang: 'en',
    kind: 'manual',
    label: 'English',
  },
  segments: [
    {
      id: 'line-1',
      trackId: 'track',
      idx: 0,
      startMs: 0,
      endMs: 3000,
      text: 'First caption.',
    },
    {
      id: 'line-2',
      trackId: 'track',
      idx: 1,
      startMs: 3000,
      endMs: 6000,
      text: 'Second caption.',
    },
  ],
};

beforeEach(() => {
  useSession.setState(useSession.getInitialState(), true);
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('featured') ? { videos: [video] } : detail,
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function selectVideo() {
  fireEvent.click(screen.getByRole('button', { name: 'Library' }));
  fireEvent.click(
    await screen.findByRole('button', { name: /A real practice video/ }),
  );
  await screen.findByText('Line 1 of 2');
  await waitFor(() => expect(useSession.getState().screen).toBe('ready'));
}

describe('practice workspace', () => {
  it('creates the player host before selection and preserves it across layouts and sessions', async () => {
    render(<HomePage />);
    const factory = vi.mocked(createPlayerAdapter);
    expect(factory).toHaveBeenCalledTimes(1);
    const host = factory.mock.calls[0][0];
    expect(host.isConnected).toBe(true);
    const adapter = factory.mock.results[0].value as FakePlayerAdapter;
    const load = vi.spyOn(adapter, 'loadVideo');
    await selectVideo();
    expect(load).toHaveBeenCalledWith(video.youtubeId);
    act(() => useSession.getState().setDisplayMode('textFocus'));
    expect(host.isConnected).toBe(true);
    act(() => useSession.getState().setDisplayMode('default'));
    fireEvent.click(screen.getByRole('button', { name: 'Library' }));
    expect(host.isConnected).toBe(true);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('moves the video and caption together using Next and Previous', async () => {
    render(<HomePage />);
    await selectVideo();
    const adapter = vi.mocked(createPlayerAdapter).mock.results[0]
      .value as FakePlayerAdapter;
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(useSession.getState().segmentIndex).toBe(1);
    expect(adapter.getCurrentTimeMs()).toBe(3000);
    expect(screen.getByText('Line 2 of 2')).toBeInTheDocument();
    expect(useSession.getState().engineSnapshot?.words[0].display).toBe(
      'Second',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(adapter.getCurrentTimeMs()).toBe(0);
    expect(useSession.getState().engineSnapshot?.words[0].display).toBe(
      'First',
    );
  });

  it.each(['ready', 'playing', 'paused'] as const)(
    'starts the next segment when typing finishes from %s',
    async (initialScreen) => {
      render(<HomePage />);
      await selectVideo();
      const adapter = vi.mocked(createPlayerAdapter).mock.results[0]
        .value as FakePlayerAdapter;
      act(() => useSession.getState().setScreen(initialScreen));
      const input = screen.getByRole('textbox', { name: 'Typing input' });
      for (const key of 'First caption.') fireEvent.keyDown(input, { key });

      expect(useSession.getState().segmentIndex).toBe(1);
      expect(useSession.getState().screen).toBe('playing');
      expect(adapter.getCurrentTimeMs()).toBe(3000);
      expect(adapter.getState().isPlaying).toBe(true);
      expect(useSession.getState().engineSnapshot?.words[0].display).toBe(
        'Second',
      );
      expect(useSession.getState().segmentStats[0].keystrokes).toBeGreaterThan(
        0,
      );
      expect(input).toHaveFocus();
    },
  );

  it('automatically plays the next segment even with the old autoplay preference saved as off', async () => {
    localStorage.setItem(
      'gloomtype-settings',
      JSON.stringify({ state: { autoReplay: 'off' }, version: 0 }),
    );
    await act(async () => {
      await useSession.persist.rehydrate();
    });
    render(<HomePage />);
    await selectVideo();
    const input = screen.getByRole('textbox', { name: 'Typing input' });
    for (const key of 'First caption.') fireEvent.keyDown(input, { key });
    const adapter = vi.mocked(createPlayerAdapter).mock.results[0]
      .value as FakePlayerAdapter;
    expect(adapter.getState().isPlaying).toBe(true);
    expect(useSession.getState().segmentIndex).toBe(1);
  });

  it('pauses playback and shows the summary when the final caption is completed', async () => {
    render(<HomePage />);
    await selectVideo();
    const input = screen.getByRole('textbox', { name: 'Typing input' });
    for (const key of 'First caption.') fireEvent.keyDown(input, { key });
    for (const key of 'Second caption.') fireEvent.keyDown(input, { key });
    const adapter = vi.mocked(createPlayerAdapter).mock.results[0]
      .value as FakePlayerAdapter;
    expect(adapter.getState().isPlaying).toBe(false);
    expect(useSession.getState().segmentIndex).toBe(1);
    expect(useSession.getState().screen).toBe('completed');
    expect(
      screen.getByRole('dialog', { name: 'Session complete' }),
    ).toBeInTheDocument();
  });

  it('surfaces player errors instead of leaving a ready typing session', async () => {
    render(<HomePage />);
    await selectVideo();
    const adapter = vi.mocked(createPlayerAdapter).mock.results[0]
      .value as FakePlayerAdapter;
    act(() => adapter.emitError(150));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The video could not be played',
    );
    expect(useSession.getState().screen).toBe('error');
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  });

  it('opens working settings independently of the video picker', async () => {
    render(<HomePage />);
    await waitFor(() =>
      expect(useSession.getState().featuredLoaded).toBe(true),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(
      screen.getByRole('dialog', { name: 'Practice settings' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Ignore capitalization/ }),
    );
    expect(useSession.getState().ignoreCase).toBe(true);
    expect(useSession.getState().selectOpen).toBe(false);
  });
});
