import type { KeySound, ErrorSound } from '@/lib/sound-options';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
}

export function playCompletionSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore audio errors (e.g., autoplay policy)
  }
}

const SAMPLE_PRESETS = {
  soft: { file: 'medium-soft', offset: 0.83 },
  medium: { file: 'white-key-pressed', offset: 0.063 },
  hard: { file: 'red-key-pressed', offset: 0.05 },
  pop: { file: 'pop', offset: 0.1 },
  error: { file: 'error', offset: 0.028 },
  fah: { file: 'fah', offset: 0.05 },
  bruh: { file: 'bruh', offset: 0.567 },
  duck: { file: 'duck', offset: 0.042 },
  huh: { file: 'huh', offset: 0 },
  hiss: { file: 'hiss', offset: 0.028 },
  meow: { file: 'meow', offset: 0.24 },
  fart: { file: 'fart', offset: 0.235 },
} as const;

type Sample = keyof typeof SAMPLE_PRESETS;
const buffers = new Map<string, Promise<AudioBuffer>>();
let currentError: AudioBufferSourceNode | null = null;
let errorRequest = 0;

async function playSample(sample: Sample, error = false): Promise<void> {
  const request = error ? ++errorRequest : 0;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const preset = SAMPLE_PRESETS[sample];
    if (!preset) return;
    let buffer = buffers.get(preset.file);
    if (!buffer) {
      buffer = fetch(`/sounds/${preset.file}.mp3`)
        .then(async (response) => {
          if (!response.ok) throw new Error('Sound unavailable');
          return ctx.decodeAudioData(await response.arrayBuffer());
        })
        .catch((reason) => {
          buffers.delete(preset.file);
          throw reason;
        });
      buffers.set(preset.file, buffer);
    }
    const decoded = await buffer;
    if (error && request !== errorRequest) return;
    const source = ctx.createBufferSource();
    const volume = ctx.createGain();
    volume.gain.value = error ? 0.45 : 0.3;
    source.buffer = decoded;
    source.connect(volume);
    volume.connect(ctx.destination);
    source.onended = () => {
      source.disconnect();
      volume.disconnect();
      if (currentError === source) currentError = null;
    };
    if (error) {
      currentError?.stop();
      currentError = source;
    }
    source.start(0, Math.min(preset.offset, decoded.duration));
  } catch {
    // Optional audio should never interrupt typing, including on load failure.
  }
}

export function playErrorSound(sounds: readonly ErrorSound[]): void {
  if (!sounds.length) {
    errorRequest += 1;
    currentError?.stop();
    currentError = null;
    return;
  }
  const sound = sounds[Math.floor(Math.random() * sounds.length)];
  void playSample(sound, true);
}

export function playKeySound(sound: KeySound): void {
  if (sound !== 'muted') void playSample(sound);
}
