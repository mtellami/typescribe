'use client';

import { useEffect, useRef } from 'react';
import { practiceFontFamily } from '@/lib/practice-font';
import { useSession } from '@/store/session';

export function WatchTranscript({
  onSelectSegment,
}: {
  onSelectSegment: (index: number) => void;
}) {
  const font = useSession((state) => state.practiceFont);
  const segments = useSession((state) => state.segments);
  const active = useSession((state) => state.segmentIndex);
  const viewport = useRef<HTMLDivElement>(null);
  const selected = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const container = viewport.current;
    const row = selected.current;
    if (!container || !row) return;
    const top =
      container.scrollTop +
      row.getBoundingClientRect().top -
      container.getBoundingClientRect().top -
      (container.clientHeight - row.clientHeight) / 2;
    if (container.scrollTo)
      container.scrollTo({
        top,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    else container.scrollTop = top;
  }, [active]);
  return (
    <div
      ref={viewport}
      style={{ fontFamily: practiceFontFamily(font) }}
      role="region"
      aria-label="Video subtitles"
      className="relative flex min-h-0 flex-1 [scrollbar-width:none] flex-col gap-2 overflow-y-auto py-2 sm:px-4 [&::-webkit-scrollbar]:hidden"
    >
      {segments.map((segment, index) => (
        <button
          key={segment.id}
          ref={index === active ? selected : undefined}
          type="button"
          aria-current={index === active ? 'true' : undefined}
          aria-label={`Play caption ${index + 1}: ${segment.text}`}
          onClick={() => onSelectSegment(index)}
          className={`w-full shrink-0 rounded-xl border px-4 py-3 text-center text-base leading-relaxed transition-colors sm:text-xl ${index === active ? 'border-primary/20 bg-primary/5 text-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground border-transparent'}`}
        >
          {segment.text}
        </button>
      ))}
    </div>
  );
}
