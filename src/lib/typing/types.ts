import type { PracticeMode } from '@/lib/contracts';

export type { PracticeMode };

export type CharStatus =
  'correct' | 'incorrect' | 'current' | 'pending' | 'auto';

export type Density = 'all' | 'moderate' | 'light' | 'firstLetters';

export interface EngineOptions {
  mode: PracticeMode;
  density: Density;
  ignoreCase: boolean;
  ignorePunctuation: boolean;
  seed?: string;
}

export interface EngineWord {
  display: string;
  expected: string;
  chars: string[];
  index: number;
  kind: 'word' | 'punctuation';
  blank: boolean;
  firstLetterHint: string | null;
}

export interface EngineSnapshot {
  words: EngineWord[];
  activeWordIndex: number;
  currentWordInput: string;
  charStates: CharStatus[][];
  accuracy: number;
  wpm: number;
  completed: boolean;
  errors: number;
  keystrokes: number;
  hintCount: number;
  activeMs: number;
}

export type EngineEffect =
  | { type: 'segment-completed' }
  | { type: 'correct-keystroke' }
  | { type: 'incorrect-keystroke' }
  | { type: 'word-committed'; wordIndex: number; correct: boolean }
  | { type: 'hint-revealed'; wordIndex: number };

export interface EngineResult {
  snapshot: EngineSnapshot;
  effects: EngineEffect[];
}

export interface TypingEngine {
  type(text: string): EngineResult;
  commit(): EngineResult;
  backspace(): EngineResult;
  skip(): EngineResult;
  hint(): EngineResult;
  reset(): EngineResult;
  snapshot(): EngineSnapshot;
}
