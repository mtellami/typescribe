'use client';

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
          className="font-practice max-w-4xl text-center text-[clamp(1rem,min(2.4vw,4dvh),2rem)] leading-[1.8] tracking-[0.015em] [overflow-wrap:anywhere]"
        >
          {snapshot.words.map((word, wordIndex) => (
            <span key={word.index} className="inline">
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
                  {char}
                </span>
              ))}
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
