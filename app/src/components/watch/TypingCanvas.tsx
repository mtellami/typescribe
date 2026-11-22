'use client';

import { practiceFontFamily } from '@/lib/practice-font';
import { useSession } from '@/store/session';
import { HAS_CONTENT, splitGraphemes } from '@/lib/typing/tokenize';
import { cn } from '@/lib/utils';
import type { CharStatus, EngineSnapshot } from '@/lib/typing/types';

interface TypingCanvasProps {
  snapshot: EngineSnapshot | null;
  onFocusInput: () => void;
  disabled: boolean;
}

function statusClass(status: CharStatus): string {
  switch (status) {
    case 'correct':
      return 'text-correct';
    case 'incorrect':
      return 'text-error underline decoration-wavy decoration-error';
    case 'current':
      return 'text-foreground relative before:absolute before:-left-0.5 before:top-[0.12em] before:h-[1.15em] before:w-0.5 before:rounded-full before:bg-primary';
    case 'auto':
      return 'text-pending/60';
    default:
      return 'text-pending';
  }
}

export function TypingCanvas({
  snapshot,
  onFocusInput,
  disabled,
}: TypingCanvasProps) {
  const font = useSession((state) => state.practiceFont);
  const mode = useSession((state) => state.mode);
  const density = useSession((state) => state.density);
  const typed = splitGraphemes(snapshot?.currentWordInput ?? '');
  function displayedCharacter(
    char: string,
    wordIndex: number,
    charIndex: number,
  ) {
    if (!snapshot) return char;
    const word = snapshot.words[wordIndex];
    const status = snapshot.charStates[wordIndex][charIndex];
    const masked =
      (mode === 'fill' || mode === 'write') &&
      word.blank &&
      HAS_CONTENT.test(char);
    if (!masked || status === 'correct') return char;
    if (status === 'auto' && !(mode === 'write' && density === 'firstLetters'))
      return char;
    if (status === 'incorrect' && wordIndex === snapshot.activeWordIndex) {
      const rank = snapshot.charStates[wordIndex]
        .slice(0, charIndex)
        .filter((state) => state !== 'auto').length;
      return typed[rank] ?? '•';
    }
    return '•';
  }
  return (
    <div
      role="button"
      aria-label="Focus typing area"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onFocusInput();
        }
      }}
      onClick={() => {
        if (!disabled) onFocusInput();
      }}
      className={cn(
        'focus-visible:ring-ring/40 practice-canvas flex min-h-0 w-full cursor-text items-center justify-center rounded-lg px-2 py-2 outline-none focus-visible:ring-1 sm:px-8',
        disabled && 'cursor-default opacity-60',
      )}
    >
      {snapshot ? (
        <p
          dir="auto"
          style={{ fontFamily: practiceFontFamily(font) }}
          className="font-practice max-w-4xl text-center text-[clamp(1rem,min(2.4vw,4dvh),2rem)] leading-[1.8] tracking-[0.015em] [overflow-wrap:anywhere]"
        >
          {snapshot.words.map((word, wordIndex) => (
            <span
              key={word.index}
              className={cn(
                'inline',
                mode === 'fill' &&
                  word.blank &&
                  'border-primary/50 border-b border-dashed pb-1',
              )}
            >
              {word.chars.map((char, charIndex) => (
                <span
                  key={`${word.index}-${charIndex}`}
                  className={statusClass(
                    snapshot.charStates[wordIndex][charIndex] === 'current' &&
                      wordIndex !== snapshot.activeWordIndex
                      ? 'pending'
                      : snapshot.charStates[wordIndex][charIndex],
                  )}
                >
                  {displayedCharacter(char, wordIndex, charIndex)}
                </span>
              ))}
              {wordIndex === snapshot.activeWordIndex &&
                !snapshot.charStates[wordIndex].includes('current') && (
                  <span
                    aria-hidden="true"
                    className="border-primary inline-block h-[1.15em] border-l-2 align-[-0.15em]"
                  />
                )}
              {wordIndex < snapshot.words.length - 1 ? ' ' : null}
            </span>
          ))}
        </p>
      ) : (
        <p className="font-practice text-pending text-lg lg:text-2xl">
          Select a video to start practicing.
        </p>
      )}
    </div>
  );
}
