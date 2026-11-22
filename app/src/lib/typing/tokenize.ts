import type { EngineWord } from './types';
import { mulberry32, xmur3 } from './prng';

export const HAS_CONTENT = /[\p{L}\p{N}]/u;

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function splitGraphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (part) => part.segment);
}

export interface TokenizeOptions {
  segmentId: string;
  mode: 'type' | 'fill' | 'write' | 'watch';
  density: 'all' | 'moderate' | 'light' | 'firstLetters';
}

const DENSITY_RATIOS: Record<TokenizeOptions['density'], number> = {
  all: 1.0,
  moderate: 0.55,
  light: 0.35,
  firstLetters: 1.0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function tokenize(text: string): EngineWord[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return tokens.map((token, index) => ({
    display: token,
    expected: token,
    chars: splitGraphemes(token),
    index,
    kind: HAS_CONTENT.test(token)
      ? ('word' as const)
      : ('punctuation' as const),
    blank: false,
    firstLetterHint: null,
  }));
}

export function applyBlankSelection(
  words: EngineWord[],
  options: TokenizeOptions,
): EngineWord[] {
  const { mode, density, segmentId } = options;
  const ratio = DENSITY_RATIOS[density];

  if (mode === 'watch')
    return words.map((word) => ({
      ...word,
      blank: false,
      firstLetterHint: null,
    }));

  if (
    (mode === 'type' || mode === 'write') &&
    (density === 'all' || density === 'firstLetters')
  ) {
    return words.map((word) => ({
      ...word,
      blank: word.kind === 'word',
      firstLetterHint:
        density === 'firstLetters' && word.kind === 'word'
          ? (word.chars[0] ?? null)
          : null,
    }));
  }

  if (mode === 'fill' && density === 'moderate') {
    let wordIndex = 0;
    return words.map((word) => ({
      ...word,
      blank: word.kind === 'word' && wordIndex++ % 3 !== 2,
      firstLetterHint: null,
    }));
  }

  if (mode === 'fill' || density === 'moderate' || density === 'light') {
    if (density === 'firstLetters') {
      return words.map((word) => ({
        ...word,
        blank: word.kind === 'word',
        firstLetterHint:
          word.kind === 'word' && word.chars.length > 0 ? word.chars[0] : null,
      }));
    }

    const wordIndices = words
      .map((word, index) => (word.kind === 'word' ? index : -1))
      .filter((index) => index !== -1);

    if (wordIndices.length === 0) {
      return words.map((word) => ({ ...word, blank: false }));
    }

    const n = clamp(
      Math.round(wordIndices.length * ratio),
      1,
      wordIndices.length,
    );

    const seedFn = xmur3(`${segmentId}:${density}`);
    const prng = mulberry32(seedFn());

    const scored = wordIndices.map((index) => ({
      index,
      score: prng(),
    }));

    scored.sort((a, b) => a.score - b.score);
    const blankIndices = new Set(scored.slice(0, n).map((s) => s.index));

    return words.map((word, index) => ({
      ...word,
      blank: blankIndices.has(index),
      firstLetterHint: null,
    }));
  }

  return words;
}
