import type { RawCue } from '@/lib/youtube/types';

export const SEGMENT_CONSTANTS = {
  MERGE_GAP_MS: 600,
  SENTENCE_GAP_MS: 200,
  MAX_SEGMENT_MS: 12000,
  MAX_SEGMENT_CHARS: 120,
  HARD_MAX_CHARS: 180,
  MIN_SEGMENT_MS: 1200,
} as const;

export interface TimedSegment {
  startMs: number;
  endMs: number;
  text: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

export function normalizeCue(text: string): string {
  return decodeEntities(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[♪♫]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitAtWordBoundaries(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ((current + ' ' + word).length <= maxChars) {
      current += ' ' + word;
    } else {
      chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);

  const result: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      result.push(chunk);
      continue;
    }
    for (let i = 0; i < chunk.length; i += maxChars) {
      result.push(chunk.slice(i, i + maxChars));
    }
  }
  return result;
}

function splitOversizedCue(cue: RawCue): RawCue[] {
  if (cue.text.length <= SEGMENT_CONSTANTS.MAX_SEGMENT_CHARS) return [cue];
  const chunks = splitAtWordBoundaries(
    cue.text,
    SEGMENT_CONSTANTS.MAX_SEGMENT_CHARS,
  );
  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0) || 1;
  const duration = Math.max(0, cue.endMs - cue.startMs);

  let cursor = cue.startMs;
  return chunks.map((chunk, index) => {
    const isLast = index === chunks.length - 1;
    const share = Math.max(
      300,
      Math.round((duration * chunk.length) / totalChars),
    );
    const startMs = cursor;
    const endMs = isLast
      ? Math.max(cue.endMs, startMs + 1)
      : Math.min(startMs + share, cue.endMs);
    cursor = endMs;
    return { startMs, endMs, text: chunk };
  });
}

function flushGroup(group: RawCue[]): TimedSegment | null {
  if (group.length === 0) return null;
  const startMs = group[0].startMs;
  let endMs = group[group.length - 1].endMs;
  if (endMs - startMs < SEGMENT_CONSTANTS.MIN_SEGMENT_MS) {
    endMs = startMs + SEGMENT_CONSTANTS.MIN_SEGMENT_MS;
  }
  return { startMs, endMs, text: group.map((c) => c.text).join(' ') };
}

function endsSentence(text: string): boolean {
  return /[.!?…]$/.test(text.trimEnd());
}

function joinedLength(group: RawCue[]): number {
  return group.reduce((sum, cue) => sum + cue.text.length + 1, 0);
}

export function segmentCues(rawCues: RawCue[]): TimedSegment[] {
  const cues = rawCues.flatMap((cue) => {
    const text = normalizeCue(cue.text);
    if (!/[\p{L}\p{N}]/u.test(text)) return [];
    if (cue.endMs <= cue.startMs) return [];
    return splitOversizedCue({ ...cue, text });
  });
  if (cues.length === 0) return [];

  const {
    MERGE_GAP_MS,
    SENTENCE_GAP_MS,
    MAX_SEGMENT_CHARS,
    MAX_SEGMENT_MS,
    HARD_MAX_CHARS,
  } = SEGMENT_CONSTANTS;

  const segments: TimedSegment[] = [];
  let group: RawCue[] = [];

  const flush = () => {
    const segment = flushGroup(group);
    if (segment) segments.push(segment);
    group = [];
  };

  for (const cue of cues) {
    if (group.length > 0) {
      const last = group[group.length - 1];
      const gap = cue.startMs - last.endMs;
      const groupStart = group[0].startMs;
      const nextChars = joinedLength(group) + cue.text.length;

      if (gap > MERGE_GAP_MS) {
        flush();
      } else if (endsSentence(last.text) && gap > SENTENCE_GAP_MS) {
        flush();
      } else if (
        nextChars > MAX_SEGMENT_CHARS ||
        cue.endMs - groupStart > MAX_SEGMENT_MS
      ) {
        flush();
      } else if (nextChars > HARD_MAX_CHARS) {
        // Cues are already word-bounded chunks, so splitting at the cue
        // boundary splits at a word boundary.
        group.pop();
        flush();
        group.push(last);
      }
    }
    group.push(cue);
  }
  flush();

  return segments
    .map((segment, index) => {
      const next = segments[index + 1];
      const endMs = next
        ? Math.min(segment.endMs, next.startMs)
        : segment.endMs;
      return { ...segment, endMs };
    })
    .filter((segment) => segment.endMs > segment.startMs);
}
