'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/store/session';

export function StatsBar() {
  const mode = useSession((state) => state.mode);
  const showTypingStats = mode === 'type' || mode === 'write';
  const snapshot = useSession((state) => state.engineSnapshot);
  const segmentIndex = useSession((state) => state.segmentIndex);
  const segments = useSession((state) => state.segments);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const [live, setLive] = useState({ wpm: 0, accuracy: 100 });

  useEffect(() => {
    const timer = setInterval(() => {
      const current = snapshotRef.current;
      setLive({
        wpm: current?.wpm ?? 0,
        accuracy: current?.keystrokes ? current.accuracy : 100,
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      {showTypingStats && (
        <p aria-live="polite" className="sr-only">
          WPM {live.wpm}, accuracy {live.accuracy} percent
        </p>
      )}
      <dl className="flex items-center gap-5 sm:gap-8">
        <div className="space-y-1">
          <dt className="text-muted-foreground text-[10px] tracking-wider uppercase">
            Line
          </dt>
          <dd className="font-mono text-sm font-medium tabular-nums">
            {segments.length ? segmentIndex + 1 : 0}
            <span className="text-muted-foreground">/{segments.length}</span>
          </dd>
        </div>
        {showTypingStats && (
          <>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-[10px] tracking-wider uppercase">
                WPM
              </dt>
              <dd className="font-mono text-sm font-medium tabular-nums">
                {snapshot?.wpm ?? 0}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-[10px] tracking-wider uppercase">
                Accuracy
              </dt>
              <dd className="font-mono text-sm font-medium tabular-nums">
                {snapshot?.keystrokes ? snapshot.accuracy : 100}%
              </dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
