import { describe, expect, it } from 'vitest';
import { createTypingEngine } from './engine';
import type { EngineOptions, EngineResult } from './types';

function options(overrides: Partial<EngineOptions> = {}): EngineOptions {
  return {
    mode: 'type',
    density: 'all',
    ignoreCase: false,
    ignorePunctuation: false,
    ...overrides,
  };
}

function effectTypes(result: EngineResult): string[] {
  return result.effects.map((effect) => effect.type);
}

describe('typing engine — type mode basics', () => {
  it('tracks per-character states while typing a word', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'hi there' },
      options(),
    );

    let result = engine.type('h');
    expect(result.snapshot.activeWordIndex).toBe(0);
    expect(result.snapshot.charStates[0]).toEqual(['correct', 'current']);
    expect(result.snapshot.currentWordInput).toBe('h');
    expect(effectTypes(result)).toContain('correct-keystroke');

    result = engine.type('i');
    expect(result.snapshot.charStates[0]).toEqual(['correct', 'correct']);
    expect(result.snapshot.completed).toBe(false);
    expect(effectTypes(result)).not.toContain('word-committed');
  });

  it('commits on space and advances to the next word', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'hi there' },
      options(),
    );
    engine.type('h');
    engine.type('i');

    const result = engine.commit();
    expect(effectTypes(result)).toContain('word-committed');
    expect(result.snapshot.activeWordIndex).toBe(1);
    expect(result.snapshot.currentWordInput).toBe('');
  });

  it('marks incorrect keystrokes and lowers accuracy', () => {
    const engine = createTypingEngine({ id: 's1', text: 'ab' }, options());

    const result = engine.type('x');
    expect(result.snapshot.charStates[0]).toEqual(['incorrect', 'current']);
    expect(result.snapshot.errors).toBe(1);
    expect(result.snapshot.keystrokes).toBe(1);
    expect(result.snapshot.accuracy).toBe(0);
    expect(effectTypes(result)).toContain('incorrect-keystroke');
  });

  it('auto-completes the segment on the last character without a trailing space', () => {
    const engine = createTypingEngine({ id: 's1', text: 'hi' }, options());
    engine.type('h');

    const result = engine.type('i');
    expect(result.snapshot.completed).toBe(true);
    expect(result.snapshot.activeWordIndex).toBe(-1);
    expect(effectTypes(result)).toEqual([
      'correct-keystroke',
      'word-committed',
      'segment-completed',
    ]);
  });

  it('does not auto-complete a non-final word', () => {
    const engine = createTypingEngine({ id: 's1', text: 'a b' }, options());
    const result = engine.type('a');
    expect(result.snapshot.completed).toBe(false);
    expect(result.snapshot.activeWordIndex).toBe(0);
    expect(effectTypes(result)).not.toContain('word-committed');
  });

  it('ignores input after completion', () => {
    const engine = createTypingEngine({ id: 's1', text: 'a' }, options());
    engine.type('a');

    const result = engine.type('zzz');
    expect(result.snapshot.keystrokes).toBe(1);
    expect(result.snapshot.completed).toBe(true);
    expect(result.effects).toEqual([]);
  });

  it('completes a full segment through commit', () => {
    const engine = createTypingEngine({ id: 's1', text: 'go now' }, options());
    engine.type('g');
    engine.type('o');
    engine.commit();
    engine.type('n');
    engine.type('o');
    const result = engine.type('w');

    expect(result.snapshot.completed).toBe(true);
    expect(effectTypes(result)).toContain('segment-completed');
    expect(result.snapshot.accuracy).toBe(100);
  });
});

describe('typing engine — punctuation', () => {
  it('never activates punctuation-only tokens', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'Hello — world' },
      options(),
    );

    const first = engine.type('H');
    expect(first.snapshot.words[1].kind).toBe('punctuation');
    expect(first.snapshot.charStates[1]).toEqual(['auto']);

    engine.type('e');
    engine.type('l');
    engine.type('l');
    engine.type('o');
    const committed = engine.commit();

    expect(committed.snapshot.activeWordIndex).toBe(2);
    expect(committed.snapshot.charStates[1]).toEqual(['auto']);
  });

  it('requires in-word punctuation by default', () => {
    const engine = createTypingEngine({ id: 's1', text: 'jumps.' }, options());
    for (const key of ['j', 'u', 'm', 'p', 's']) engine.type(key);

    expect(engine.snapshot().completed).toBe(false);

    const result = engine.type('.');
    expect(result.snapshot.completed).toBe(true);
    expect(result.snapshot.keystrokes).toBe(6);
  });

  it('skips in-word punctuation when ignorePunctuation is set', () => {
    const engine = createTypingEngine(
      { id: 's1', text: "it's fine" },
      options({ ignorePunctuation: true }),
    );
    engine.type('i');
    engine.type('t');
    const afterT = engine.type('s');
    expect(afterT.snapshot.charStates[0]).toEqual([
      'correct',
      'correct',
      'auto',
      'correct',
    ]);

    engine.commit();
    for (const key of ['f', 'i', 'n', 'e']) engine.type(key);
    expect(engine.snapshot().completed).toBe(true);
    expect(engine.snapshot().keystrokes).toBe(7);
  });
});

describe('typing engine — case and unicode', () => {
  it('compares case-insensitively when ignoreCase is set', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'The' },
      options({ ignoreCase: true }),
    );
    engine.type('t');
    engine.type('h');
    const result = engine.type('e');

    expect(result.snapshot.completed).toBe(true);
    expect(result.snapshot.errors).toBe(0);
    expect(result.snapshot.accuracy).toBe(100);
  });

  it('is case-sensitive by default', () => {
    const engine = createTypingEngine({ id: 's1', text: 'The' }, options());
    engine.type('t');
    engine.type('h');
    const result = engine.type('e');
    expect(result.snapshot.errors).toBe(1);
  });

  it('normalizes smart quotes during comparison', () => {
    const engine = createTypingEngine({ id: 's1', text: 'don’t' }, options());
    engine.type('d');
    engine.type('o');
    engine.type('n');
    const result = engine.type("'");

    expect(result.snapshot.charStates[0][3]).toBe('correct');
    engine.type('t');
    expect(engine.snapshot().completed).toBe(true);
  });

  it('treats accented characters as single graphemes', () => {
    const engine = createTypingEngine({ id: 's1', text: 'café' }, options());
    engine.type('c');
    engine.type('a');
    engine.type('f');
    const result = engine.type('é');

    expect(result.snapshot.completed).toBe(true);
    expect(result.snapshot.charStates[0]).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('treats emoji with skin tone as a single grapheme', () => {
    const engine = createTypingEngine({ id: 's1', text: 'go👍🏽' }, options());
    engine.type('g');
    engine.type('o');
    const result = engine.type('👍🏽');

    expect(result.snapshot.completed).toBe(true);
    expect(result.snapshot.charStates[0]).toHaveLength(3);
    expect(result.snapshot.errors).toBe(0);
  });
});

describe('typing engine — editing and shortcuts', () => {
  it('backspace only edits the current word', () => {
    const engine = createTypingEngine({ id: 's1', text: 'ab cd' }, options());
    engine.type('a');
    engine.type('b');
    engine.commit();
    engine.type('x');

    const result = engine.backspace();
    expect(result.snapshot.currentWordInput).toBe('');
    expect(result.snapshot.activeWordIndex).toBe(1);
    expect(result.snapshot.charStates[0]).toEqual(['correct', 'correct']);

    const typed = engine.type('c');
    expect(typed.snapshot.charStates[1][0]).toBe('correct');
    expect(typed.snapshot.keystrokes).toBe(4);
    expect(typed.snapshot.errors).toBe(1);
  });

  it('treats a commit with an empty buffer as a no-op', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'hi there' },
      options(),
    );
    const result = engine.commit();
    expect(result.effects).toEqual([]);
    expect(result.snapshot.activeWordIndex).toBe(0);
  });

  it('skips the current word as incorrect', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'hello world' },
      options(),
    );
    engine.type('x');

    const result = engine.skip();
    expect(effectTypes(result)).toContain('word-committed');
    expect(result.effects).toContainEqual({
      type: 'word-committed',
      wordIndex: 0,
      correct: false,
    });
    expect(result.snapshot.activeWordIndex).toBe(1);
    expect(result.snapshot.errors).toBe(1);
  });

  it('hint increments hintCount without keystrokes', () => {
    const engine = createTypingEngine({ id: 's1', text: 'hi' }, options());
    const result = engine.hint();

    expect(result.snapshot.hintCount).toBe(1);
    expect(result.snapshot.keystrokes).toBe(0);
    expect(result.effects).toContainEqual({
      type: 'hint-revealed',
      wordIndex: 0,
    });
    expect(result.snapshot.accuracy).toBe(0);
  });

  it('processes pasted text with whitespace as words plus commits', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'hi there' },
      options(),
    );
    const result = engine.type('hi there');

    expect(result.snapshot.completed).toBe(true);
    expect(effectTypes(result)).toContain('word-committed');
    expect(effectTypes(result)).toContain('segment-completed');
  });

  it('treats a bare space as a commit', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'hi there' },
      options(),
    );
    engine.type('h');
    engine.type('i');

    const result = engine.type(' ');
    expect(result.snapshot.activeWordIndex).toBe(1);
  });

  it('reset restores the initial state', () => {
    const engine = createTypingEngine({ id: 's1', text: 'hi' }, options());
    engine.type('x');
    engine.type('i');
    expect(engine.snapshot().completed).toBe(true);

    const result = engine.reset();
    expect(result.snapshot.completed).toBe(false);
    expect(result.snapshot.activeWordIndex).toBe(0);
    expect(result.snapshot.keystrokes).toBe(0);
    expect(result.snapshot.errors).toBe(0);
    expect(result.snapshot.charStates[0]).toEqual(['current', 'pending']);
  });
});

describe('typing engine — stats', () => {
  it('computes WPM from correct keystrokes and active time', () => {
    let time = 0;
    const engine = createTypingEngine({ id: 's1', text: 'abc' }, options(), {
      now: () => time,
    });

    time = 0;
    engine.type('a');
    time = 1000;
    engine.type('b');
    time = 2000;
    const snapshot = engine.type('c').snapshot;

    expect(snapshot.activeMs).toBe(2000);
    expect(snapshot.wpm).toBe(18);
  });

  it('excludes idle gaps over 5 seconds from active time', () => {
    let time = 0;
    const engine = createTypingEngine({ id: 's1', text: 'ab cd' }, options(), {
      now: () => time,
    });

    time = 0;
    engine.type('a');
    time = 9000;
    const snapshot = engine.type('b').snapshot;

    expect(snapshot.activeMs).toBe(0);
    expect(snapshot.wpm).toBe(24);
  });

  it('counts hints in the accuracy denominator', () => {
    const engine = createTypingEngine({ id: 's1', text: 'ab cd' }, options());
    engine.type('a');
    engine.type('x');
    engine.hint();

    const snapshot = engine.snapshot();
    expect(snapshot.keystrokes).toBe(2);
    expect(snapshot.hintCount).toBe(1);
    expect(snapshot.accuracy).toBe(33);
  });
});

describe('typing engine — fill mode', () => {
  it('only blank words are active; visible words are auto-completed', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'alpha beta gamma delta' },
      options({ mode: 'fill', density: 'all' }),
    );

    // With density 'all', all words are blank (ratio 1.0)
    expect(engine.snapshot().words.map((w) => w.blank)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(engine.snapshot().activeWordIndex).toBe(0);
  });

  it('density moderate selects a subset of words as blanks deterministically', () => {
    const engine = createTypingEngine(
      { id: 'seg-123', text: 'one two three four five six' },
      options({ mode: 'fill', density: 'moderate' }),
    );

    const blanks = engine.snapshot().words.map((w) => w.blank);
    // moderate ratio = 0.55, 6 words -> round(3.3) = 3 blanks
    expect(blanks.filter((b) => b).length).toBe(3);
    // Deterministic: same segmentId and density should produce same blanks
    const engine2 = createTypingEngine(
      { id: 'seg-123', text: 'one two three four five six' },
      options({ mode: 'fill', density: 'moderate' }),
    );
    expect(engine2.snapshot().words.map((w) => w.blank)).toEqual(blanks);
  });

  it('density light selects fewer blanks', () => {
    const engine = createTypingEngine(
      { id: 'seg-456', text: 'a b c d e f g h' },
      options({ mode: 'fill', density: 'light' }),
    );

    const blanks = engine.snapshot().words.map((w) => w.blank);
    // light ratio = 0.35, 8 words -> round(2.8) = 3 blanks (clamped to at least 1, at most length)
    expect(blanks.filter((b) => b).length).toBe(3);
  });

  it('punctuation tokens are never blank and are auto-completed', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'Hello — world' },
      options({ mode: 'fill', density: 'all' }),
    );

    expect(engine.snapshot().words[1].kind).toBe('punctuation');
    expect(engine.snapshot().words[1].blank).toBe(false);
    expect(engine.snapshot().charStates[1]).toEqual(['auto']);
  });

  it('completes segment when all blank words are typed', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'one two three' },
      options({ mode: 'fill', density: 'light' }),
    );

    // Type only the blank words (depends on deterministic selection)
    const blanks = engine
      .snapshot()
      .words.filter((w) => w.blank)
      .map((w) => w.expected);

    for (const word of blanks) {
      for (const ch of word) engine.type(ch);
      engine.commit();
    }

    expect(engine.snapshot().completed).toBe(true);
  });
});

describe('typing engine — first letters density', () => {
  it('all words are blank with firstLetterHint set', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'alpha beta' },
      options({ mode: 'fill', density: 'firstLetters' }),
    );

    const words = engine.snapshot().words;
    expect(words[0].blank).toBe(true);
    expect(words[0].firstLetterHint).toBe('a');
    expect(words[1].blank).toBe(true);
    expect(words[1].firstLetterHint).toBe('b');
  });

  it('first grapheme is auto and not typed', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'cat dog' },
      options({ mode: 'fill', density: 'firstLetters' }),
    );

    // First word 'cat': first letter 'c' is auto, user types 'at'
    engine.type('a');
    engine.type('t');
    engine.commit();

    // Second word 'dog': first letter 'd' is auto, user types 'og'
    engine.type('o');
    engine.type('g');
    const result = engine.type(' '); // space commits

    expect(result.snapshot.completed).toBe(true);
    expect(result.snapshot.keystrokes).toBe(4); // a,t,o,g
  });

  it('works with type mode too', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'cat dog' },
      options({ mode: 'type', density: 'firstLetters' }),
    );

    expect(engine.snapshot().words[0].firstLetterHint).toBe('c');
    expect(engine.snapshot().words[1].firstLetterHint).toBe('d');
  });
});

describe('typing engine — write mode', () => {
  it('behaves like type mode (all words active)', () => {
    const engine = createTypingEngine(
      { id: 's1', text: 'hello world' },
      options({ mode: 'write' }),
    );

    expect(engine.snapshot().activeWordIndex).toBe(0);
    expect(engine.snapshot().words.map((w) => w.blank)).toEqual([true, true]);

    engine.type('h');
    engine.type('e');
    engine.type('l');
    engine.type('l');
    engine.type('o');
    engine.commit();
    for (const ch of 'world') engine.type(ch);
    const result = engine.commit();

    expect(result.snapshot.completed).toBe(true);
  });
});
