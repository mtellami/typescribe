'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/store/session';
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

const PLAYBACK_RATES = ['0.5', '0.75', '1', '1.25', '1.5', '2'] as const;
type PlaybackRate = (typeof PLAYBACK_RATES)[number];

type AutoReplayOption = 'off' | 'on';

interface PracticeToolbarProps {
  onSelectVideo: () => void;
  playbackRate: PlaybackRate;
  setPlaybackRate: (rate: PlaybackRate) => void;
  autoReplay: AutoReplayOption;
  setAutoReplay: (mode: AutoReplayOption) => void;
}

export function PracticeToolbar({
  onSelectVideo,
  playbackRate,
  setPlaybackRate,
  autoReplay,
  setAutoReplay,
}: PracticeToolbarProps) {
  const mode = useSession((state) => state.mode);
  const density = useSession((state) => state.density);
  const displayMode = useSession((state) => state.displayMode);
  const setMode = useSession((state) => state.setMode);
  const setDensity = useSession((state) => state.setDensity);
  const setDisplayMode = useSession((state) => state.setDisplayMode);

  const isExpandVideo = displayMode === 'expandVideo';

  const cycleDisplayMode = () => {
    if (displayMode === 'default') {
      setDisplayMode('textFocus');
    } else if (displayMode === 'textFocus') {
      setDisplayMode('expandVideo');
    } else {
      setDisplayMode('default');
    }
  };

  const displayModeLabel = {
    default: 'Default layout',
    textFocus: 'Focus typing',
    expandVideo: 'Expand video',
  }[displayMode];

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

      <Select
        value={playbackRate}
        onValueChange={(value) => setPlaybackRate(value as PlaybackRate)}
      >
        <SelectTrigger className="w-20" aria-label="Playback speed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PLAYBACK_RATES.map((rate) => (
            <SelectItem key={rate} value={rate}>
              {rate}x
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={autoReplay}
        onValueChange={(value) => setAutoReplay(value as AutoReplayOption)}
      >
        <SelectTrigger className="w-24" aria-label="Auto replay">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="off">Auto-replay: Off</SelectItem>
          <SelectItem value="on">Auto-replay: On</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant={isExpandVideo ? 'default' : 'outline'}
        aria-pressed={isExpandVideo}
        onClick={cycleDisplayMode}
      >
        {displayModeLabel}
      </Button>
    </div>
  );
}
