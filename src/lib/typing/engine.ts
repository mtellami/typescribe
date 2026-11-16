import type {
  CharStatus,
  EngineEffect,
  EngineOptions,
  EngineResult,
  EngineSnapshot,
  EngineWord,
  TypingEngine,
} from './types';
import {
  HAS_CONTENT,
  splitGraphemes,
  tokenize,
  applyBlankSelection,
  type TokenizeOptions,
} from './tokenize';

const IDLE_GAP_MS = 5000;

export interface SegmentInput {
  id: string;
  text: string;
}

export interface EngineDeps {
  now?: () => number;
}

interface WordState {
  def: EngineWord;
  typed: string[];
  committed: boolean;
  wordCorrect: boolean;
}

const SMART_QUOTES: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
};

function normalizeGrapheme(grapheme: string): string {
  const mapped = SMART_QUOTES[grapheme] ?? grapheme;
  return mapped;
}

function compareGrapheme(
  typed: string,
  expected: string,
  ignoreCase: boolean,
): boolean {
  const a = normalizeGrapheme(typed);
  const b = normalizeGrapheme(expected);
  return ignoreCase ? a.toLowerCase() === b.toLowerCase() : a === b;
}

export function createTypingEngine(
  segment: SegmentInput,
  options: EngineOptions,
  deps: EngineDeps = {},
): TypingEngine {
  const now = deps.now ?? (() => Date.now());

  let words: WordState[] = [];
  let activeIdx = -1;
  let completed = false;
  let keystrokes = 0;
  let correctKeystrokes = 0;
  let errors = 0;
  let hintCount = 0;
  let startedAt: number | null = null;
  let lastActivityAt: number | null = null;
  let accumulatedMs = 0;

  function isAutoExpected(
    def: EngineWord,
    grapheme: string,
    graphemeIndex: number,
  ): boolean {
    if (def.kind === 'punctuation') return true;
    if (def.firstLetterHint && graphemeIndex === 0) return true;
    if (options.mode === 'fill' && !def.blank) return true;
    return options.ignorePunctuation && !HAS_CONTENT.test(grapheme);
  }

  function requiredPositions(def: EngineWord): number[] {
    const positions: number[] = [];
    def.chars.forEach((grapheme, index) => {
      if (!isAutoExpected(def, grapheme, index)) positions.push(index);
    });
    return positions;
  }

  function isActiveWord(def: EngineWord): boolean {
    if (def.kind !== 'word') return false;
    if (options.mode === 'fill') return def.blank;
    return true;
  }

  function buildWords(): WordState[] {
    const baseWords = tokenize(segment.text);
    const tokenizeOptions: TokenizeOptions = {
      segmentId: segment.id,
      mode: options.mode,
      density: options.density,
    };
    const wordsWithBlanks = applyBlankSelection(baseWords, tokenizeOptions);
    return wordsWithBlanks.map((def) => ({
      def,
      typed: [],
      committed: false,
      wordCorrect: false,
    }));
  }

  function findFirstActive(from: number): number {
    for (let i = from; i < words.length; i += 1) {
      if (isActiveWord(words[i].def)) return i;
    }
    return -1;
  }

  function hasActiveAfter(index: number): boolean {
    return findFirstActive(index + 1) !== -1;
  }

  function resetState(): void {
    words = buildWords();
    activeIdx = findFirstActive(0);
    completed = activeIdx === -1;
    keystrokes = 0;
    correctKeystrokes = 0;
    errors = 0;
    hintCount = 0;
    startedAt = null;
    lastActivityAt = null;
    accumulatedMs = 0;
  }

  function tickTiming(): void {
    const timestamp = now();
    if (startedAt === null) {
      startedAt = timestamp;
      lastActivityAt = timestamp;
      accumulatedMs = 0;
      return;
    }
    if (lastActivityAt !== null) {
      const gap = timestamp - lastActivityAt;
      if (gap <= IDLE_GAP_MS) accumulatedMs += gap;
    }
    lastActivityAt = timestamp;
  }

  function freezeTiming(): void {
    const timestamp = now();
    if (lastActivityAt !== null) {
      const gap = timestamp - lastActivityAt;
      if (gap <= IDLE_GAP_MS) accumulatedMs += gap;
      lastActivityAt = null;
    }
  }

  function currentActiveMs(): number {
    if (completed || startedAt === null) return accumulatedMs;
    if (lastActivityAt === null) return accumulatedMs;
    const gap = now() - lastActivityAt;
    return accumulatedMs + (gap <= IDLE_GAP_MS ? gap : 0);
  }

  function statesFor(state: WordState): CharStatus[] {
    const def = state.def;
    if (def.kind === 'punctuation') {
      return def.chars.map(() => 'auto' as const);
    }
    const required = requiredPositions(def);
    const requiredRank = new Map(
      required.map((position, rank) => [position, rank]),
    );
    return def.chars.map((grapheme, index) => {
      if (isAutoExpected(def, grapheme, index)) return 'auto' as const;
      const rank = requiredRank.get(index);
      if (rank === undefined) return 'pending' as const;
      if (rank < state.typed.length) {
        return compareGrapheme(state.typed[rank], grapheme, options.ignoreCase)
          ? ('correct' as const)
          : ('incorrect' as const);
      }
      if (!state.committed && rank === state.typed.length)
        return 'current' as const;
      return 'pending' as const;
    });
  }

  function buildSnapshot(): EngineSnapshot {
    const activeState = activeIdx >= 0 ? words[activeIdx] : undefined;
    const activeMs = currentActiveMs();
    return {
      words: words.map((state) => state.def),
      activeWordIndex: activeIdx,
      currentWordInput: activeState ? activeState.typed.join('') : '',
      charStates: words.map(statesFor),
      accuracy: Math.round(
        (correctKeystrokes / Math.max(keystrokes + hintCount, 1)) * 100,
      ),
      wpm: Math.round(
        correctKeystrokes / 5 / (Math.max(activeMs, 1000) / 60000),
      ),
      completed,
      errors,
      keystrokes,
      hintCount,
      activeMs,
    };
  }

  function result(effects: EngineEffect[]): EngineResult {
    return { snapshot: buildSnapshot(), effects };
  }

  function completeSegment(effects: EngineEffect[]): void {
    if (completed) return;
    freezeTiming();
    completed = true;
    activeIdx = -1;
    effects.push({ type: 'segment-completed' });
  }

  function advance(effects: EngineEffect[]): void {
    const next = findFirstActive(activeIdx + 1);
    if (next === -1) {
      completeSegment(effects);
      return;
    }
    activeIdx = next;
  }

  function evaluateWord(state: WordState): boolean {
    const required = requiredPositions(state.def);
    if (state.typed.length !== required.length) return false;
    return required.every((position, rank) =>
      compareGrapheme(
        state.typed[rank],
        state.def.chars[position],
        options.ignoreCase,
      ),
    );
  }

  function commitActive(
    effects: EngineEffect[],
    forceIncorrect: boolean,
  ): boolean {
    if (completed || activeIdx < 0) return false;
    const state = words[activeIdx];
    if (state.typed.length === 0 && !forceIncorrect) return false;
    state.committed = true;
    state.wordCorrect = forceIncorrect ? false : evaluateWord(state);
    effects.push({
      type: 'word-committed',
      wordIndex: activeIdx,
      correct: state.wordCorrect,
    });
    advance(effects);
    return true;
  }

  function appendGrapheme(grapheme: string, effects: EngineEffect[]): void {
    if (completed || activeIdx < 0) return;
    const state = words[activeIdx];
    const required = requiredPositions(state.def);
    tickTiming();

    if (state.typed.length >= required.length) {
      keystrokes += 1;
      errors += 1;
      effects.push({ type: 'incorrect-keystroke' });
      return;
    }

    keystrokes += 1;
    const position = required[state.typed.length];
    const matches = compareGrapheme(
      grapheme,
      state.def.chars[position],
      options.ignoreCase,
    );
    if (matches) {
      correctKeystrokes += 1;
      effects.push({ type: 'correct-keystroke' });
    } else {
      errors += 1;
      effects.push({ type: 'incorrect-keystroke' });
    }
    state.typed.push(grapheme);

    if (state.typed.length === required.length && !hasActiveAfter(activeIdx)) {
      commitActive(effects, false);
    }
  }

  const engine: TypingEngine = {
    type(text: string): EngineResult {
      const effects: EngineEffect[] = [];
      if (text.length === 0) return result(effects);

      const hasWhitespace = /\s/.test(text);
      const parts = text.split(/\s+/).filter((part) => part.length > 0);

      if (parts.length === 0) {
        if (hasWhitespace) commitActive(effects, false);
        return result(effects);
      }

      for (let index = 0; index < parts.length; index += 1) {
        for (const grapheme of splitGraphemes(parts[index])) {
          appendGrapheme(grapheme, effects);
        }
        if (hasWhitespace) commitActive(effects, false);
      }
      return result(effects);
    },

    commit(): EngineResult {
      const effects: EngineEffect[] = [];
      commitActive(effects, false);
      return result(effects);
    },

    backspace(): EngineResult {
      const effects: EngineEffect[] = [];
      if (completed || activeIdx < 0) return result(effects);
      const state = words[activeIdx];
      state.typed.pop();
      return result(effects);
    },

    skip(): EngineResult {
      const effects: EngineEffect[] = [];
      commitActive(effects, true);
      return result(effects);
    },

    hint(): EngineResult {
      const effects: EngineEffect[] = [];
      if (completed || activeIdx < 0) return result(effects);
      hintCount += 1;
      effects.push({ type: 'hint-revealed', wordIndex: activeIdx });
      return result(effects);
    },

    reset(): EngineResult {
      resetState();
      return result([]);
    },

    snapshot(): EngineSnapshot {
      return buildSnapshot();
    },
  };

  resetState();
  return engine;
}
