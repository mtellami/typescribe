import { describe, expect, it } from 'vitest';
import { normalizeCue, segmentCues, SEGMENT_CONSTANTS } from './segment';
import type { RawCue } from '@/lib/youtube/types';

function cue(startMs: number, endMs: number, text: string): RawCue {
  return { startMs, endMs, text };
}

describe('normalizeCue', () => {
  it('decodes HTML entities', () => {
    expect(normalizeCue('Tom &amp; Jerry &#8212; fun')).toBe(
      'Tom & Jerry — fun',
    );
    expect(normalizeCue('&#x27;quoted&#x27;')).toBe("'quoted'");
  });

  it('strips tags and annotations', () => {
    expect(normalizeCue('<b>Bold</b> text')).toBe('Bold text');
    expect(normalizeCue('Hello [Music] world')).toBe('Hello world');
    expect(normalizeCue('[Applause] Nice.')).toBe('Nice.');
    expect(normalizeCue('♪ La la ♫')).toBe('La la');
  });

  it('collapses whitespace and trims', () => {
    expect(normalizeCue('  too   many\n spaces  ')).toBe('too many spaces');
  });
});

describe('segmentCues', () => {
  it('drops cues with no letters or numbers', () => {
    const result = segmentCues([
      cue(0, 1000, '[Music]'),
      cue(1000, 2000, '♪ ♫ ...'),
      cue(2000, 4000, 'Real words'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Real words');
    expect(result[0].startMs).toBe(2000);
  });

  it('merges cues separated by small gaps', () => {
    const result = segmentCues([
      cue(0, 1000, 'Hello there.'),
      cue(1100, 2000, 'How are you?'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello there. How are you?');
    expect(result[0].startMs).toBe(0);
  });

  it('flushes when the gap exceeds MERGE_GAP_MS', () => {
    const result = segmentCues([
      cue(0, 1000, 'First part.'),
      cue(1000 + SEGMENT_CONSTANTS.MERGE_GAP_MS + 1, 3000, 'Second part.'),
    ]);
    expect(result).toHaveLength(2);
  });

  it('flushes after a sentence end when the gap exceeds SENTENCE_GAP_MS', () => {
    const result = segmentCues([
      cue(0, 1000, 'Done here.'),
      cue(1000 + SEGMENT_CONSTANTS.SENTENCE_GAP_MS + 1, 3000, 'Next sentence.'),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Done here.');
  });

  it('keeps merging short non-sentence cues across larger gaps up to MERGE_GAP_MS', () => {
    const result = segmentCues([
      cue(0, 1000, 'partial'),
      cue(1000 + SEGMENT_CONSTANTS.SENTENCE_GAP_MS + 1, 3000, 'continues'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('partial continues');
  });

  it('flushes when the group would exceed MAX_SEGMENT_CHARS', () => {
    const word = 'word '.repeat(24).trim(); // 119 chars
    expect(word.length).toBe(119);
    const result = segmentCues([
      cue(0, 2000, word),
      cue(2000, 4000, 'overflow'),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe(word);
    expect(result[1].text).toBe('overflow');
  });

  it('extends groups shorter than MIN_SEGMENT_MS', () => {
    const result = segmentCues([cue(0, 500, 'Quick.')]);
    expect(result[0].endMs).toBe(SEGMENT_CONSTANTS.MIN_SEGMENT_MS);
  });

  it('clamps overlapping segment end times', () => {
    const result = segmentCues([
      cue(0, 500, 'Hi there.'),
      cue(800, 2000, 'Next bit.'),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].startMs).toBe(0);
    expect(result[0].endMs).toBe(800);
    expect(result[1].startMs).toBe(800);
  });

  it('drops zero-length and inverted cues', () => {
    const result = segmentCues([
      cue(1000, 1000, 'No duration'),
      cue(5000, 4000, 'Inverted'),
      cue(6000, 8000, 'Kept text'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Kept text');
  });

  it('splits oversized cues at word boundaries with proportional durations', () => {
    const longText =
      'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima ' +
      'mike november oscar papa quebec romeo sierra tango uniform victor whiskey ' +
      'xray yankee zulu';
    expect(longText.length).toBeGreaterThan(
      SEGMENT_CONSTANTS.MAX_SEGMENT_CHARS,
    );
    const result = segmentCues([cue(0, 10_000, longText)]);
    expect(result.length).toBeGreaterThan(1);
    for (const segment of result) {
      expect(segment.text.length).toBeLessThanOrEqual(
        SEGMENT_CONSTANTS.MAX_SEGMENT_CHARS,
      );
      expect(segment.endMs).toBeGreaterThan(segment.startMs);
    }
    expect(result[0].startMs).toBe(0);
    expect(result[result.length - 1].endMs).toBeGreaterThanOrEqual(10_000);
    const joined = result.map((s) => s.text).join(' ');
    expect(joined).toBe(longText);
  });

  it('flushes when the group would exceed MAX_SEGMENT_MS', () => {
    const result = segmentCues([
      cue(0, 6000, 'First half of a long thought'),
      cue(6100, 13_000, 'continues without a sentence break'),
    ]);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].endMs - result[0].startMs).toBeLessThanOrEqual(
      SEGMENT_CONSTANTS.MAX_SEGMENT_MS,
    );
  });
});
