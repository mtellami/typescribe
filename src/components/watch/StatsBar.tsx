'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/store/session';

export function StatsBar() {
  const snapshot = useSession((state) => state.engineSnapshot);
  const segmentIndex = useSession((state) => state.segmentIndex);
  const segments = useSession((state) => state.segments);

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const [live, setLive] = useState({ wpm: 0, accuracy: 0 });

  useEffect(() => {
    const update = () => {
      const current = snapshotRef.current;
      setLive({ wpm: current?.wpm ?? 0, accuracy: current?.accuracy ?? 0 });
    };
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border-border bg-card text-muted-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm">
      <div aria-live="polite" className="sr-only">
        WPM {live.wpm}, accuracy {live.accuracy} percent
      </div>
      <div className="flex items-center gap-4">
        <span className="text-foreground">
          {snapshot?.wpm ?? 0}{' '}
          <span className="text-muted-foreground">WPM</span>
        </span>
        <span className="text-foreground">
          {snapshot?.accuracy ?? 0}
          <span className="text-muted-foreground">%</span>
        </span>
        <span className="text-muted-foreground">
          Errors {snapshot?.errors ?? 0}
        </span>
      </div>
      <span>
        Segment {segments.length > 0 ? segmentIndex + 1 : 0}/{segments.length}
      </span>
    </div>
  );
}
