'use client';

import { DisplayModePicker } from './DisplayModePicker';
import { PracticeFontPicker } from './PracticeFontPicker';
import { PracticeCustomizations } from './PracticeCustomizations';
import { PracticeModePicker } from './PracticeModePicker';
import { RotateCcw, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession, type PlaybackRate } from '@/store/session';
import type { PracticeMode } from '@/lib/contracts';
import type { Density } from '@/lib/typing/types';

const DENSITIES = {
  all: 'All words (100%)',
  moderate: 'Moderate (~55%)',
  light: 'Light (~35%)',
  firstLetters: 'First letters only',
};
interface PracticeToolbarProps {
  onSelectVideo: () => void;
  onRestart: () => void;
  disabled: boolean;
  onModeChange?: (mode: PracticeMode) => void;
  onPause?: () => void;
  onFocusInput?: () => void;
}

export function PracticeToolbar({
  onSelectVideo,
  onRestart,
  disabled,
  onModeChange,
  onPause,
  onFocusInput,
}: PracticeToolbarProps) {
  const mode = useSession((state) => state.mode);
  const density = useSession((state) => state.density);
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
      <PracticeModePicker
        value={mode}
        onChange={onModeChange ?? store.setMode}
        onOpen={() => {
          if (useSession.getState().screen === 'playing') onPause?.();
        }}
        onFocusInput={() => onFocusInput?.()}
        disabled={disabled}
      />
      {mode !== 'fill' && mode !== 'watch' && (
        <Select
          value={density}
          onValueChange={(value) => store.setDensity(value as Density)}
        >
          <SelectTrigger
            className="h-9 w-28 border-transparent bg-transparent shadow-none"
            aria-label="Words to type"
          >
            <SelectValue>
              {
                {
                  all: '100%',
                  moderate: '~55%',
                  light: '~35%',
                  firstLetters: 'First letters',
                }[density]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DENSITIES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
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
      <DisplayModePicker onFocusInput={onFocusInput} />
      <PracticeFontPicker onFocusInput={onFocusInput} />
      <PracticeCustomizations onFocusInput={onFocusInput} />
    </div>
  );
}
