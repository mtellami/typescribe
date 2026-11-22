'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

const captions = [
  'Every sentence you type is a small step toward fluency.',
  'Listen first, then let your fingers follow the rhythm.',
  'Mistakes are just a map of where to slow down.',
  'A little practice each day beats a long session once a week.',
];

export function HomeDemo() {
  const [lineIndex, setLineIndex] = useState(0);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [totals, setTotals] = useState({ typed: 0, correct: 0 });
  const startedAt = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const caption = captions[lineIndex];
  const correct = [...value].filter(
    (character, index) => character === caption[index],
  ).length;
  const typed = totals.typed + value.length;
  const accuracy = typed
    ? Math.round(((totals.correct + correct) / typed) * 100)
    : 100;
  const elapsedMinutes = startedAt.current
    ? Math.max((Date.now() - startedAt.current) / 60_000, 0.05)
    : 0;
  const wpm = elapsedMinutes
    ? Math.round((totals.correct + correct) / 5 / elapsedMinutes)
    : 0;
  const progress =
    ((lineIndex + value.length / caption.length) / captions.length) * 100;
  const complete = value === caption;

  useEffect(() => {
    if (!complete) return;
    const timeout = setTimeout(() => {
      setTotals((previous) => ({
        typed: previous.typed + value.length,
        correct: previous.correct + correct,
      }));
      setLineIndex((index) => (index + 1) % captions.length);
      setValue('');
    }, 450);
    return () => clearTimeout(timeout);
  }, [complete, value, correct]);

  return (
    <section
      aria-label="Typing demo"
      className="bg-card min-w-0 overflow-hidden rounded-[18px] border"
    >
      <div className="home-demo-stage relative grid aspect-[16/7] place-items-center">
        <button
          type="button"
          onClick={() => input.current?.focus()}
          aria-label="Start typing demo"
          className="bg-background/70 hover:bg-background/90 flex size-14 items-center justify-center rounded-full border transition-colors"
        >
          <Play
            className="ml-1 size-5"
            fill="currentColor"
            aria-hidden="true"
          />
        </button>
        <div
          role="progressbar"
          aria-label="Demo progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="bg-border absolute inset-x-0 bottom-0 h-1"
        >
          <div
            className="bg-primary h-full transition-[width] motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <div className="relative min-h-[3.4em] rounded-sm font-mono text-lg leading-[1.7] break-words whitespace-pre-wrap sm:text-xl">
          <p aria-hidden="true">
            {[...caption].map((character, index) => (
              <span
                key={`${lineIndex}-${index}`}
                className={
                  index < value.length
                    ? value[index] === character
                      ? 'text-foreground'
                      : 'text-error bg-error/15 rounded-sm'
                    : index === value.length
                      ? 'text-muted-foreground border-primary border-b-2'
                      : 'text-muted-foreground'
                }
              >
                {character}
              </span>
            ))}
          </p>
          <span id="demo-caption" className="sr-only">
            {caption}
          </span>
          <input
            ref={input}
            aria-label="Type the caption here"
            aria-describedby="demo-caption"
            value={value}
            maxLength={caption.length}
            onChange={(event) => {
              if (!startedAt.current) startedAt.current = Date.now();
              setValue(event.target.value);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
        </div>
        <div className="text-muted-foreground mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs sm:text-sm">
          <span>
            {complete
              ? 'Next line…'
              : value
                ? 'Nice. Keep going.'
                : focused
                  ? 'Type what you read.'
                  : 'Click the line and start typing.'}
          </span>
          <div className="flex gap-5 tabular-nums">
            <span>
              <strong className="text-foreground font-medium">{wpm}</strong> wpm
            </span>
            <span>
              <strong className="text-foreground font-medium">
                {accuracy}
              </strong>
              % accuracy
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
