'use client';

import { useState, type ReactNode } from 'react';
import { Popover } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { useSession } from '@/store/session';

export function ControlPopover({
  label,
  icon,
  children,
  onFocusInput,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  onFocusInput?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={label}
          title={label}
        >
          {icon}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={12}
          collisionPadding={16}
          aria-label={label}
          onCloseAutoFocus={(event) => {
            if (useSession.getState().mode !== 'watch' && onFocusInput) {
              event.preventDefault();
              onFocusInput();
            }
          }}
          className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 z-50 max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border p-3 shadow-xl duration-150 outline-none motion-reduce:animate-none"
        >
          <h2 className="mb-3 px-1 text-sm font-semibold">{label}</h2>
          {typeof children === 'function'
            ? children(() => setOpen(false))
            : children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
