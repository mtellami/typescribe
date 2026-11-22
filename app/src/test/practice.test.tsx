import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playKeySound, playErrorSound } from '@/lib/sound';
import HomePage from '@/components/watch/HomePage';
import RouteLoading from '@/app/loading';
import { LibraryView } from '@/components/watch/LibraryView';
import { SettingsPanel } from '@/components/auth/SettingsPanel';
import { useSession } from '@/store/session';
import { createPlayerAdapter } from '@/lib/player';
import { FakePlayerAdapter } from '@/lib/player/fake';

vi.mock('@/lib/sound', () => ({
  playKeySound: vi.fn(),
  playErrorSound: vi.fn(),
  playCompletionSound: vi.fn(),
}));

const authState = vi.hoisted(() => ({ authenticated: true, pending: false }));
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    listAccounts: vi.fn(async () => ({
      data: [{ providerId: 'credential' }],
      error: null,
    })),
    updateUser: vi.fn(async () => ({ data: { status: true }, error: null })),
    useSession: () => ({
      data: authState.authenticated
        ? {
            user: {
              id: 'test-user',
              name: 'Test User',
              email: 'test@example.com',
            },
          }
        : null,
      isPending: authState.pending,
    }),
  },
}));

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  search: '',
}));
vi.mock('next/navigation', () => ({
  useRouter: () => navigation,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

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
  authState.authenticated = true;
  authState.pending = false;
  navigation.search = '';
  useSession.setState(useSession.getInitialState(), true);
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url === '/api/videos' ? { videos: [video] } : detail),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function selectVideo() {
  act(() => useSession.getState().setSelectOpen(true));
  fireEvent.mouseDown(screen.getByRole('tab', { name: /Library/ }), {
    button: 0,
    ctrlKey: false,
  });
  fireEvent.click(
    (
      await screen.findAllByRole('button', { name: /A real practice video/ })
    )[0],
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
    await selectVideo();
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
      'typescribe-settings',
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

  it('lets Backspace cross a space and correct the previous word during video practice', async () => {
    render(<HomePage />);
    await selectVideo();
    const input = screen.getByRole('textbox', { name: 'Typing input' });
    for (const key of 'Firsx ') fireEvent.keyDown(input, { key });
    expect(useSession.getState().engineSnapshot?.activeWordIndex).toBe(1);
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(useSession.getState().engineSnapshot?.currentWordInput).toBe(
      'Firsx',
    );
    expect(useSession.getState().engineSnapshot?.activeWordIndex).toBe(0);
    fireEvent.keyDown(input, { key: 'Backspace' });
    for (const key of 't ') fireEvent.keyDown(input, { key });
    expect(useSession.getState().engineSnapshot?.charStates[0]).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
    expect(useSession.getState().engineSnapshot?.activeWordIndex).toBe(1);
    expect(useSession.getState().segmentIndex).toBe(0);
  });

  it('updates the profile and practice preferences in the settings panel', async () => {
    render(
      <SettingsPanel name="Test User" email="test@example.com" hasPassword />,
    );
    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Test User');
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Updated Name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Ignore capitalization/ }),
    );
    expect(useSession.getState().ignoreCase).toBe(true);
  });
});

describe('homepage guest experience', () => {
  it('shows the typing demo and auth links while hiding library and settings', () => {
    authState.authenticated = false;
    render(<HomePage />);
    expect(
      screen.getByRole('region', { name: 'Typing demo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Log in to add a video' }),
    ).toHaveAttribute('href', '/login');
    expect(
      screen.queryByRole('button', { name: 'Library' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Browse library' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Settings' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('to practice with your own YouTube video.'),
    ).not.toBeInTheDocument();
  });

  it('tracks demo mistakes, corrections, and moves to the next caption', async () => {
    authState.authenticated = false;
    render(<HomePage />);
    const input = screen.getByRole('textbox', {
      name: 'Type the caption here',
    });
    fireEvent.change(input, { target: { value: 'X' } });
    expect(screen.getByText(/% accuracy/)).toHaveTextContent('0% accuracy');
    fireEvent.change(input, {
      target: {
        value: 'Every sentence you type is a small step toward fluency.',
      },
    });
    expect(screen.getByText('100', { selector: 'strong' })).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue(''));
    expect(input).toHaveAccessibleDescription(
      'Listen first, then let your fingers follow the rhythm.',
    );
  });

  it('allows backspacing a mistake at the end of a full demo caption', async () => {
    authState.authenticated = false;
    const user = userEvent.setup();
    render(<HomePage />);
    const input = screen.getByRole('textbox', {
      name: 'Type the caption here',
    });
    const prefix = 'Every sentence you type is a small step toward fluency';
    fireEvent.change(input, { target: { value: `${prefix}x` } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
    expect(input).toHaveValue(`${prefix}x`);
    expect(input).not.toHaveAttribute('readonly');
    await user.click(input);
    await user.keyboard('{End}{Backspace}');
    expect(input).toHaveValue(prefix);
    await user.keyboard('.');
    await waitFor(() => expect(input).toHaveValue(''));
    expect(input).toHaveAccessibleDescription(
      'Listen first, then let your fingers follow the rhythm.',
    );
  });
});

describe('user menu and loading states', () => {
  it('shows only a user icon until the authenticated menu is opened', async () => {
    render(<HomePage />);
    expect(
      screen.getByRole('button', { name: 'User menu' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Account' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Library' }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'User menu' }), {
      key: 'Enter',
    });
    expect(
      await screen.findByRole('menuitem', { name: 'Library' }),
    ).toHaveAttribute('href', '/library');
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(
      screen.getByRole('menuitem', { name: 'Log out' }),
    ).toBeInTheDocument();
  });

  it('shows skeletons while the session is being checked', () => {
    authState.pending = true;
    render(<HomePage />);
    expect(
      screen
        .getByRole('status', { name: 'Loading user menu' })
        .querySelector('.animate-pulse'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Loading sign-in options' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading account…')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'User menu' }),
    ).not.toBeInTheDocument();
  });

  it('shows video-card skeletons while the library request is pending', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    render(<LibraryView />);
    expect(
      screen
        .getByRole('status', { name: 'Loading videos' })
        .querySelectorAll('.aspect-video'),
    ).toHaveLength(3);
    expect(
      screen.queryByText('Bring your first video'),
    ).not.toBeInTheDocument();
  });

  it('shows player and caption skeletons while a practice video loads', async () => {
    render(<HomePage />);
    await waitFor(() =>
      expect(useSession.getState().featuredLoaded).toBe(true),
    );
    act(() => useSession.getState().setScreen('loading'));
    expect(
      screen.getByRole('status', { name: 'Loading video' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Loading captions' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Loading practice stats' }),
    ).toBeInTheDocument();
  });
});

describe('route video selection', () => {
  it('uses the practice skeleton in the route-level loader for video URLs', () => {
    navigation.search = 'video=sample';
    const html = renderToString(<RouteLoading />);
    expect(html).toContain('practice-workspace');
    expect(html).toContain('Loading captions');
    expect(html).toContain('Loading video');
    expect(html).not.toContain('Loading Typescribe');
    expect(html).not.toContain('md:grid-cols-2');
  });

  it('renders the practice skeleton, never the hero, before a video route hydrates', () => {
    const html = renderToString(<HomePage videoId="sample" />);
    expect(html).not.toContain('Good videos.');
    expect(html).not.toContain('Typing demo');
    expect(html).toContain('Loading video');
    expect(html).toContain('Loading captions');
    expect(html).toContain('practice-shell');
  });

  it('loads the video identified by the URL and returns home when the query is removed', async () => {
    const view = render(<HomePage videoId="sample" />);
    await waitFor(() => expect(useSession.getState().screen).toBe('ready'));
    expect(useSession.getState().video?.id).toBe('sample');
    view.rerender(<HomePage />);
    await waitFor(() => expect(useSession.getState().screen).toBe('idle'));
    expect(
      screen.getByRole('region', { name: 'Typing demo' }),
    ).toBeInTheDocument();
  });

  it('loads a video URL correctly when React restarts effects in Strict Mode', async () => {
    render(
      <StrictMode>
        <HomePage videoId="sample" />
      </StrictMode>,
    );
    await waitFor(() => expect(useSession.getState().screen).toBe('ready'));
    expect(useSession.getState().video?.id).toBe('sample');
  });

  it('navigates from a library card to the practice URL', async () => {
    render(<LibraryView />);
    fireEvent.click(
      (
        await screen.findAllByRole('button', { name: /A real practice video/ })
      )[0],
    );
    expect(navigation.push).toHaveBeenCalledWith('/?video=sample');
  });
});

async function chooseMode(label: 'Type' | 'Fill' | 'Write' | 'Watch') {
  fireEvent.click(screen.getByRole('button', { name: 'Practice mode' }));
  fireEvent.click(
    await screen.findByRole('button', { name: new RegExp(`^${label} `) }),
  );
}

describe('practice mode picker and modes', () => {
  it('shows all four descriptive mode cards and marks the selected mode', async () => {
    render(<HomePage />);
    await selectVideo();
    fireEvent.click(screen.getByRole('button', { name: 'Practice mode' }));
    expect(
      await screen.findByRole('button', {
        name: 'Type Type along with subtitles',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Fill Fill in the missing words' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Write Listen and type what you hear',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Watch Watch with subtitles' }),
    ).toBeInTheDocument();
  });

  it('masks only Fill blanks, reveals a hint, and advances when the answer is complete', async () => {
    render(<HomePage />);
    await selectVideo();
    await chooseMode('Fill');
    expect(useSession.getState().mode).toBe('fill');
    const snapshot = useSession.getState().engineSnapshot!;
    const blank = snapshot.words.find((word) => word.blank)!;
    const canvas = screen.getByRole('button', { name: 'Focus typing area' });
    expect(canvas).toHaveTextContent('•');
    expect(canvas.textContent).not.toContain(blank.expected);
    expect(
      screen.queryByRole('combobox', { name: 'Words to type' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(useSession.getState().engineSnapshot?.currentWordInput).toBe(
      blank.expected[0],
    );
    expect(useSession.getState().engineSnapshot?.hintCount).toBe(1);
    const input = screen.getByRole('textbox', { name: 'Typing input' });
    for (const key of blank.expected.slice(1))
      fireEvent.keyDown(input, { key });
    for (const word of snapshot.words.filter((word) => word.blank).slice(1))
      for (const key of word.chars) fireEvent.keyDown(input, { key });
    expect(useSession.getState().segmentIndex).toBe(1);
  });

  it('masks Write answers and advances completed words without requiring a space', async () => {
    render(<HomePage />);
    await selectVideo();
    await chooseMode('Write');
    const canvas = screen.getByRole('button', { name: 'Focus typing area' });
    expect(canvas.textContent).not.toContain('First');
    expect(canvas.textContent).not.toContain('caption');
    const input = screen.getByRole('textbox', { name: 'Typing input' });
    for (const key of 'First') fireEvent.keyDown(input, { key });
    expect(useSession.getState().engineSnapshot?.activeWordIndex).toBe(1);
    expect(canvas).toHaveTextContent('First');
    expect(canvas.textContent).not.toContain('caption');
    expect(screen.getByRole('button', { name: 'Hint' })).toBeInTheDocument();
  });

  it('shows clickable subtitles in Watch mode, follows playback, and restores typing on return', async () => {
    render(<HomePage />);
    await selectVideo();
    await chooseMode('Watch');
    expect(
      screen.getByRole('region', { name: 'Video subtitles' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Typing input' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('WPM', { exact: true })).not.toBeInTheDocument();
    const adapter = vi.mocked(createPlayerAdapter).mock.results[0]
      .value as FakePlayerAdapter;
    fireEvent.click(
      screen.getByRole('button', { name: 'Play caption 2: Second caption.' }),
    );
    expect(adapter.getCurrentTimeMs()).toBe(3000);
    expect(adapter.getState().isPlaying).toBe(true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Play caption 1: First caption.' }),
    );
    act(() => adapter.advance(3500));
    await waitFor(() => expect(useSession.getState().segmentIndex).toBe(1));
    expect(adapter.getState().isPlaying).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Play caption 2: Second caption.' }),
    ).toHaveAttribute('aria-current', 'true');
    await chooseMode('Type');
    expect(
      screen.getByRole('textbox', { name: 'Typing input' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Video subtitles' }),
    ).not.toBeInTheDocument();
    expect(adapter.getState().isPlaying).toBe(false);
  });
});

describe('practice display, font, and sound controls', () => {
  it('changes layouts through an icon trigger without recreating the player', async () => {
    render(<HomePage />);
    await selectVideo();
    const trigger = screen.getByRole('button', { name: 'Display mode' });
    expect(trigger).toHaveTextContent('');
    fireEvent.click(trigger);
    expect(
      screen.getByRole('button', { name: 'Default view' }),
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Text focus' }));
    expect(
      screen.queryByRole('region', { name: 'Video player' }),
    ).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Expand video' }));
    expect(screen.getByRole('region', { name: 'Video player' })).toBeVisible();
    expect(document.querySelector('.practice-workspace')).toHaveAttribute(
      'data-layout',
      'expandVideo',
    );
    expect(createPlayerAdapter).toHaveBeenCalledTimes(1);
  });

  it('applies preset and custom fonts to typing and Watch subtitles and persists them', async () => {
    render(<HomePage />);
    await selectVideo();
    fireEvent.click(screen.getByRole('button', { name: 'Practice font' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roboto Mono' }));
    expect(
      screen
        .getByRole('button', { name: 'Focus typing area' })
        .querySelector('p')?.style.fontFamily,
    ).toContain('--font-roboto-mono');
    await chooseMode('Watch');
    expect(
      screen.getByRole('region', { name: 'Video subtitles' }).style.fontFamily,
    ).toContain('--font-roboto-mono');
    fireEvent.click(screen.getByRole('button', { name: 'Practice font' }));
    fireEvent.change(screen.getByLabelText(/Enter a font name/), {
      target: { value: 'https://fonts.google.com/specimen/Lora' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply font' }));
    expect(useSession.getState().practiceFont).toBe('Lora');
    expect(
      document.head.querySelector('link[href*="family=Lora"]'),
    ).not.toBeNull();
    expect(
      JSON.parse(localStorage.getItem('typescribe-settings')!).state
        .practiceFont,
    ).toBe('Lora');
  });

  it('lets guests customize sounds, previews selections, and plays feedback when typing', async () => {
    authState.authenticated = false;
    render(<HomePage />);
    await selectVideo();
    fireEvent.click(screen.getByRole('button', { name: 'Customizations' }));
    const user = userEvent.setup();
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Key sound' }), {
      key: 'ArrowDown',
    });
    await user.click(screen.getByRole('option', { name: 'Soft' }));
    expect(playKeySound).toHaveBeenLastCalledWith('soft');
    await user.click(screen.getByRole('button', { name: 'Error sound' }));
    await user.click(screen.getByRole('option', { name: 'Error' }));
    expect(playErrorSound).toHaveBeenCalledOnce();
    await user.keyboard('{Escape}');
    vi.mocked(playKeySound).mockClear();
    vi.mocked(playErrorSound).mockClear();
    const input = screen.getByRole('textbox', { name: 'Typing input' });
    fireEvent.keyDown(input, { key: 'F' });
    expect(playKeySound).toHaveBeenCalledWith('soft');
    fireEvent.keyDown(input, { key: 'x' });
    expect(playErrorSound).toHaveBeenCalledOnce();
    expect(
      JSON.parse(localStorage.getItem('typescribe-settings')!).state,
    ).toMatchObject({ keySound: 'soft', errorSounds: ['error'] });
  });
});

describe('reference sound choices', () => {
  it('allows multiple error sounds, previews additions, toggles choices, and mutes all', async () => {
    render(<HomePage />);
    await selectVideo();
    fireEvent.click(screen.getByRole('button', { name: 'Customizations' }));
    fireEvent.click(screen.getByRole('button', { name: 'Error sound' }));
    expect(
      screen.getByRole('listbox', { name: 'Error sounds' }),
    ).toHaveAttribute('aria-multiselectable', 'true');
    for (const [label, value] of [
      ['Fah', 'fah'],
      ['Bruh!', 'bruh'],
      ['Duck', 'duck'],
      ['Huh?', 'huh'],
      ['Hiss', 'hiss'],
      ['Meow', 'meow'],
      ['Fart', 'fart'],
    ]) {
      fireEvent.click(screen.getByRole('option', { name: label }));
      expect(playErrorSound).toHaveBeenLastCalledWith([value]);
      expect(screen.getByRole('option', { name: label })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    }
    fireEvent.click(screen.getByRole('option', { name: 'Duck' }));
    expect(useSession.getState().errorSounds).not.toContain('duck');
    expect(screen.getByRole('option', { name: 'Duck' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    fireEvent.click(screen.getByRole('option', { name: 'Muted' }));
    expect(useSession.getState().errorSounds).toEqual([]);
    expect(screen.getByRole('option', { name: 'Muted' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('migrates the old error toggle while preserving other preferences', async () => {
    localStorage.setItem(
      'typescribe-settings',
      JSON.stringify({
        version: 0,
        state: {
          errorSound: 'error',
          keySound: 'soft',
          practiceFont: 'Quicksand',
        },
      }),
    );
    await act(async () => useSession.persist.rehydrate());
    expect(useSession.getState()).toMatchObject({
      errorSounds: ['error'],
      keySound: 'soft',
      practiceFont: 'Quicksand',
    });
  });
});
