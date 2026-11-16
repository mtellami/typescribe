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
      return 'border-b-2 border-cursor motion-safe:animate-pulse';
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
      role="presentation"
      onClick={onFocusInput}
      className={cn(
        'border-border bg-card min-h-48 w-full cursor-text rounded-lg border p-6',
        disabled && 'cursor-default opacity-60',
      )}
    >
      {snapshot ? (
        <p
          dir="auto"
          className="font-practice text-lg leading-[1.7] tracking-wide lg:text-2xl"
        >
          {snapshot.words.map((word, wordIndex) => (
            <span
              key={word.index}
              className={cn(
                'mr-3 inline-block rounded px-0.5',
                wordIndex === snapshot.activeWordIndex && 'bg-primary/10',
              )}
            >
              {word.chars.map((char, charIndex) => (
                <span
                  key={`${word.index}-${charIndex}`}
                  className={cn(
                    'inline-block',
                    statusClass(snapshot.charStates[wordIndex][charIndex]),
                  )}
                >
                  {char}
                </span>
              ))}
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
