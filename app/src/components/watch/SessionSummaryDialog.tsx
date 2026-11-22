'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { sumSegmentStats, useSession } from '@/store/session';

interface SessionSummaryDialogProps {
  onRestart: () => void;
  onNewVideo: () => void;
}

export function SessionSummaryDialog({
  onRestart,
  onNewVideo,
}: SessionSummaryDialogProps) {
  const screen = useSession((state) => state.screen);
  const segmentStats = useSession((state) => state.segmentStats);
  const startedAt = useSession((state) => state.sessionStartedAt);
  const completedAt = useSession((state) => state.sessionCompletedAt);

  const totals = sumSegmentStats(segmentStats);
  const wpm = Math.round(
    totals.correctKeystrokes / 5 / (Math.max(totals.activeMs, 1000) / 60000),
  );
  const accuracy = Math.round(
    (totals.correctKeystrokes /
      Math.max(totals.keystrokes + totals.hintCount, 1)) *
      100,
  );
  const elapsedSeconds =
    startedAt && completedAt ? Math.round((completedAt - startedAt) / 1000) : 0;

  return (
    <Dialog open={screen === 'completed'} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&_[data-slot=dialog-close]]:hidden"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Session complete</DialogTitle>
          <DialogDescription>Here is how you did.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-muted-foreground text-sm">WPM</dt>
            <dd className="text-foreground text-3xl font-semibold">{wpm}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Accuracy</dt>
            <dd className="text-foreground text-3xl font-semibold">
              {accuracy}%
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Time</dt>
            <dd className="text-foreground text-3xl font-semibold">
              {elapsedSeconds}s
            </dd>
          </div>
        </dl>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onNewVideo}>
            New video
          </Button>
          <Button onClick={onRestart}>Restart</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
