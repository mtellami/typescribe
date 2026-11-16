'use client';

import { RotateCcw, Settings2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useSession,
  type DisplayMode,
  type PlaybackRate,
} from '@/store/session';
import type { PracticeMode } from '@/lib/contracts';
import type { Density } from '@/lib/typing/types';

const MODES = { type: 'Type', fill: 'Fill blanks', write: 'Listen & write' };
const DENSITIES = {
  all: '100%',
  moderate: '~55%',
  light: '~35%',
  firstLetters: 'First letters',
};
const LAYOUTS = {
  default: 'Video + typing',
  textFocus: 'Typing focus',
  expandVideo: 'Video focus',
};

interface PracticeToolbarProps {
  onSelectVideo: () => void;
  onRestart: () => void;
  onSettings: () => void;
  disabled: boolean;
}

export function PracticeToolbar({
  onSelectVideo,
  onRestart,
  onSettings,
  disabled,
}: PracticeToolbarProps) {
  const mode = useSession((state) => state.mode);
  const density = useSession((state) => state.density);
  const displayMode = useSession((state) => state.displayMode);
  const playbackRate = useSession((state) => state.playbackRate);
  const loading = useSession((state) => state.screen) === 'loading';
  const store = useSession.getState();
  return (
    <div
      className="bg-card/95 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border p-1.5 shadow-lg shadow-black/10 backdrop-blur-xl"
      role="toolbar"
      aria-label="Practice options"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRestart}
        disabled={disabled}
        aria-label="Restart"
        title="Restart session"
      >
        <RotateCcw className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onSelectVideo}
        className="h-9 gap-2"
        disabled={loading}
      >
        <Video className="text-primary size-4" /> Select video
      </Button>
      <span className="bg-border mx-0.5 hidden h-5 w-px sm:block" />
      <Select
        value={mode}
        onValueChange={(value) => store.setMode(value as PracticeMode)}
      >
        <SelectTrigger
          className="h-9 w-32 border-transparent bg-transparent shadow-none"
          aria-label="Practice mode"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(MODES).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={density}
        onValueChange={(value) => store.setDensity(value as Density)}
      >
        <SelectTrigger
          className="h-9 w-28 border-transparent bg-transparent shadow-none"
          aria-label="Words to type"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(DENSITIES).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={playbackRate}
        onValueChange={(value) => store.setPlaybackRate(value as PlaybackRate)}
      >
        <SelectTrigger
          className="h-9 w-21 border-transparent bg-transparent shadow-none"
          aria-label="Playback speed"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {['0.5', '0.75', '1', '1.25', '1.5', '2'].map((rate) => (
            <SelectItem key={rate} value={rate}>
              {rate}×
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={displayMode}
        onValueChange={(value) => store.setDisplayMode(value as DisplayMode)}
      >
        <SelectTrigger
          className="h-9 w-40 border-transparent bg-transparent shadow-none"
          aria-label="Display mode"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(LAYOUTS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onSettings}
        aria-label="Practice settings"
        title="Practice settings"
      >
        <Settings2 className="size-4" />
      </Button>
    </div>
  );
}
