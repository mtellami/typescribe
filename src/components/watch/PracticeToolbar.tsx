'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession, type DisplayMode } from '@/store/session';
import type { PracticeMode } from '@/lib/contracts';
import type { Density } from '@/lib/typing/types';

const MODE_LABELS: Record<PracticeMode, string> = {
  type: 'Type',
  fill: 'Fill',
  write: 'Write',
};

const DENSITY_LABELS: Record<Density, string> = {
  all: '100%',
  moderate: '~55%',
  light: '~35%',
  firstLetters: 'First letters',
};

interface PracticeToolbarProps {
  onSelectVideo: () => void;
}

export function PracticeToolbar({ onSelectVideo }: PracticeToolbarProps) {
  const mode = useSession((state) => state.mode);
  const density = useSession((state) => state.density);
  const displayMode = useSession((state) => state.displayMode);
  const setMode = useSession((state) => state.setMode);
  const setDensity = useSession((state) => state.setDensity);
  const setDisplayMode = useSession((state) => state.setDisplayMode);

  const expandVideo = displayMode === 'expandVideo';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={onSelectVideo}>
        Select video
      </Button>

      <Select
        value={mode}
        onValueChange={(value) => setMode(value as PracticeMode)}
      >
        <SelectTrigger className="w-32" aria-label="Practice mode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(MODE_LABELS) as PracticeMode[]).map((value) => (
            <SelectItem key={value} value={value}>
              {MODE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={density}
        onValueChange={(value) => setDensity(value as Density)}
      >
        <SelectTrigger className="w-36" aria-label="Words to type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(DENSITY_LABELS) as Density[]).map((value) => (
            <SelectItem key={value} value={value}>
              {DENSITY_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={expandVideo ? 'default' : 'outline'}
        aria-pressed={expandVideo}
        onClick={() =>
          setDisplayMode(
            expandVideo ? 'default' : ('expandVideo' as DisplayMode),
          )
        }
      >
        {expandVideo ? 'Show typing area' : 'Hide typing area'}
      </Button>
    </div>
  );
}
