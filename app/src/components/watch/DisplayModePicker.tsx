'use client';

import { Check, Maximize2, Monitor, Text } from 'lucide-react';
import { useSession } from '@/store/session';
import { ControlPopover } from './ControlPopover';

const LAYOUTS = [
  {
    value: 'default',
    label: 'Default view',
    description: 'Video and typing together',
    icon: Monitor,
  },
  {
    value: 'textFocus',
    label: 'Text focus',
    description: 'Hide the video and focus on typing',
    icon: Text,
  },
  {
    value: 'expandVideo',
    label: 'Expand video',
    description: 'Give the video more space',
    icon: Maximize2,
  },
] as const;

export function DisplayModePicker({
  onFocusInput,
}: {
  onFocusInput?: () => void;
}) {
  const value = useSession((state) => state.displayMode);
  const Icon =
    LAYOUTS.find((layout) => layout.value === value)?.icon ?? Monitor;
  return (
    <ControlPopover
      label="Display mode"
      icon={<Icon className="text-primary size-4" />}
      onFocusInput={onFocusInput}
    >
      {(close) => (
        <div className="space-y-2">
          {LAYOUTS.map((layout) => {
            const LayoutIcon = layout.icon;
            const active = layout.value === value;
            return (
              <button
                type="button"
                key={layout.value}
                aria-label={layout.label}
                aria-pressed={active}
                onClick={() => {
                  useSession.getState().setDisplayMode(layout.value);
                  close();
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/40 hover:bg-primary/10'}`}
              >
                <LayoutIcon className="size-5 shrink-0" />
                <span className="flex-1">
                  <span className="block text-sm font-medium">
                    {layout.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${active ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}
                  >
                    {layout.description}
                  </span>
                </span>
                {active && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </ControlPopover>
  );
}
