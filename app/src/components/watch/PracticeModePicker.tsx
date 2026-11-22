'use client';

import { useState } from 'react';
import { Popover } from 'radix-ui';
import {
  Check,
  ChevronDown,
  Headphones,
  Keyboard,
  Puzzle,
  Tv,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PracticeMode } from '@/lib/contracts';
import { useSession } from '@/store/session';

export const PRACTICE_MODES = [
  {
    value: 'type',
    label: 'Type',
    description: 'Type along with subtitles',
    icon: Keyboard,
  },
  {
    value: 'fill',
    label: 'Fill',
    description: 'Fill in the missing words',
    icon: Puzzle,
  },
  {
    value: 'write',
    label: 'Write',
    description: 'Listen and type what you hear',
    icon: Headphones,
  },
  {
    value: 'watch',
    label: 'Watch',
    description: 'Watch with subtitles',
    icon: Tv,
  },
] as const;

export function PracticeModePicker({
  value,
  onChange,
  onOpen,
  onFocusInput,
  disabled = false,
}: {
  value: PracticeMode;
  onChange: (mode: PracticeMode) => void;
  onOpen: () => void;
  onFocusInput: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    PRACTICE_MODES.find((mode) => mode.value === value) ?? PRACTICE_MODES[0];
  const Icon = selected.icon;
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) onOpen();
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          aria-label="Practice mode"
          className="h-9 gap-2 px-3"
        >
          <Icon className="text-primary size-4" />
          {selected.label}
          <ChevronDown className="text-muted-foreground size-3.5" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={12}
          collisionPadding={16}
          aria-label="Practice mode"
          onCloseAutoFocus={(event) => {
            if (useSession.getState().mode !== 'watch') {
              event.preventDefault();
              onFocusInput();
            }
          }}
          className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 z-50 max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border p-3 shadow-xl duration-150 outline-none motion-reduce:animate-none"
        >
          <h2 className="mb-3 px-1 text-sm font-semibold">Practice mode</h2>
          <div className="space-y-2">
            {PRACTICE_MODES.map((mode) => {
              const ModeIcon = mode.icon;
              const active = mode.value === value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${mode.label} ${mode.description}`}
                  onClick={() => {
                    onChange(mode.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/40 hover:bg-primary/10'}`}
                >
                  <ModeIcon
                    className={`size-5 shrink-0 ${active ? '' : 'text-primary'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {mode.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs ${active ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}
                    >
                      {mode.description}
                    </span>
                  </span>
                  {active && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
