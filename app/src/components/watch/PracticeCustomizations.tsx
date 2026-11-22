'use client';

import { Check, ChevronDown, Settings2 } from 'lucide-react';
import { useSession, type KeySound, type ErrorSound } from '@/store/session';
import { playKeySound, playErrorSound } from '@/lib/sound';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover } from 'radix-ui';
import { KEY_SOUNDS, ERROR_SOUNDS } from '@/lib/sound-options';
import { ControlPopover } from './ControlPopover';

export function PracticeCustomizations({
  onFocusInput,
}: {
  onFocusInput?: () => void;
}) {
  const keySound = useSession((state) => state.keySound);
  const errorSounds = useSession((state) => state.errorSounds);
  return (
    <ControlPopover
      label="Customizations"
      icon={<Settings2 className="size-4" />}
      onFocusInput={onFocusInput}
    >
      <div className="space-y-4 px-1 pb-1">
        <div className="space-y-2">
          <span id="key-sound-label" className="block text-sm">
            Key sound
          </span>
          <Select
            value={keySound}
            onValueChange={(value) => {
              useSession.getState().setKeySound(value as KeySound);
              playKeySound(value as KeySound);
            }}
          >
            <SelectTrigger aria-labelledby="key-sound-label" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="start"
              sideOffset={4}
              className="z-60 w-(--radix-select-trigger-width) p-1"
            >
              {Object.entries(KEY_SOUNDS).map(([value, label]) => (
                <SelectItem
                  key={value}
                  value={value}
                  className="min-h-9 px-3 pr-8"
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span id="error-sound-label" className="block text-sm">
            Error sound
          </span>
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-labelledby="error-sound-label"
                className="border-input hover:bg-muted focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm outline-none focus-visible:ring-2"
              >
                <span className="truncate">
                  {errorSounds.length
                    ? errorSounds.map((sound) => ERROR_SOUNDS[sound]).join(', ')
                    : 'Muted'}
                </span>
                <ChevronDown className="text-muted-foreground size-4 shrink-0" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="top"
                align="start"
                sideOffset={4}
                collisionPadding={16}
                aria-label="Error sounds"
                className="bg-popover text-popover-foreground z-60 max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) overflow-y-auto rounded-lg border p-1 shadow-xl outline-none"
              >
                <div
                  role="listbox"
                  aria-label="Error sounds"
                  aria-multiselectable="true"
                  className="space-y-0.5"
                  onKeyDown={(event) => {
                    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
                    if (!keys.includes(event.key)) return;
                    event.preventDefault();
                    const options = Array.from(
                      event.currentTarget.querySelectorAll<HTMLButtonElement>(
                        '[role="option"]',
                      ),
                    );
                    const index = options.indexOf(
                      document.activeElement as HTMLButtonElement,
                    );
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? options.length - 1
                          : (index +
                              (event.key === 'ArrowDown' ? 1 : -1) +
                              options.length) %
                            options.length;
                    options[next]?.focus();
                  }}
                >
                  {(
                    [
                      ['muted', 'Muted'],
                      ...Object.entries(ERROR_SOUNDS),
                    ] as const
                  ).map(([value, label]) => {
                    const selected =
                      value === 'muted'
                        ? !errorSounds.length
                        : errorSounds.includes(value as ErrorSound);
                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        key={value}
                        onClick={() => {
                          const store = useSession.getState();
                          if (value === 'muted') {
                            store.setErrorSounds([]);
                            playErrorSound([]);
                          } else {
                            const sound = value as ErrorSound;
                            const enabled = store.errorSounds.includes(sound);
                            store.setErrorSounds(
                              enabled
                                ? store.errorSounds.filter(
                                    (item) => item !== sound,
                                  )
                                : [...store.errorSounds, sound],
                            );
                            if (!enabled) playErrorSound([sound]);
                            else if (store.errorSounds.length === 1)
                              playErrorSound([]);
                          }
                        }}
                        className="hover:bg-primary/15 hover:text-primary focus-visible:bg-primary/15 focus-visible:text-primary flex min-h-9 w-full cursor-pointer items-center justify-between rounded-md px-3 text-left text-sm transition-colors outline-none"
                      >
                        {label}
                        {selected && <Check className="size-4" />}
                      </button>
                    );
                  })}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
    </ControlPopover>
  );
}
