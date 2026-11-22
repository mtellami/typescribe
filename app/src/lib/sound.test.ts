import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const starts = vi.fn();
const stops = vi.fn();
const fetchSample = vi.fn();
const decode = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  decode.mockResolvedValue({ duration: 2 });
  fetchSample.mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(4),
  });
  vi.stubGlobal('fetch', fetchSample);
  vi.stubGlobal(
    'AudioContext',
    class {
      state = 'running';
      destination = {};
      decodeAudioData = decode;
      createBufferSource() {
        return {
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: starts,
          stop: stops,
          buffer: null,
          onended: null,
        };
      }
      createGain() {
        return { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
      }
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('sample sound playback', () => {
  it.each([
    ['soft', 'medium-soft', 0.83],
    ['medium', 'white-key-pressed', 0.063],
    ['hard', 'red-key-pressed', 0.05],
    ['pop', 'pop', 0.1],
    ['fart', 'fart', 0.235],
  ] as const)(
    'plays the %s key sample with its leading silence trimmed',
    async (sound, file, offset) => {
      const { playKeySound } = await import('./sound');
      playKeySound(sound);
      await vi.waitFor(() => expect(starts).toHaveBeenCalledWith(0, offset));
      expect(fetchSample).toHaveBeenCalledWith(`/sounds/${file}.mp3`);
      playKeySound(sound);
      await vi.waitFor(() => expect(starts).toHaveBeenCalledTimes(2));
      expect(fetchSample).toHaveBeenCalledOnce();
    },
  );

  it('chooses from enabled error sounds and stops the previous error clip', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const { playErrorSound } = await import('./sound');
    playErrorSound(['fah', 'duck']);
    await vi.waitFor(() => expect(starts).toHaveBeenCalledOnce());
    expect(fetchSample).toHaveBeenCalledWith('/sounds/duck.mp3');
    playErrorSound(['bruh']);
    await vi.waitFor(() => expect(starts).toHaveBeenCalledTimes(2));
    expect(stops).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it('does not load or play samples when muted', async () => {
    const { playErrorSound, playKeySound } = await import('./sound');
    playErrorSound([]);
    playKeySound('muted');
    expect(fetchSample).not.toHaveBeenCalled();
    expect(starts).not.toHaveBeenCalled();
  });
});
