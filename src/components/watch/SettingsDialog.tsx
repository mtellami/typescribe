'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSession } from '@/store/session';

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ignoreCase = useSession((state) => state.ignoreCase);
  const ignorePunctuation = useSession((state) => state.ignorePunctuation);
  const options = [
    {
      label: 'Ignore capitalization',
      description: 'Accept uppercase and lowercase letters equally.',
      checked: ignoreCase,
      change: useSession.getState().setIgnoreCase,
    },
    {
      label: 'Ignore punctuation',
      description: 'Focus on words without typing punctuation.',
      checked: ignorePunctuation,
      change: useSession.getState().setIgnorePunctuation,
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Practice settings</DialogTitle>
          <DialogDescription>
            Make your practice feel right. Preferences are saved on this device.
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y">
          {options.map((option) => (
            <label
              key={option.label}
              className="flex cursor-pointer items-center justify-between gap-5 py-5"
            >
              <span>
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                  {option.description}
                </span>
              </span>
              <input
                type="checkbox"
                className="accent-primary size-4 shrink-0"
                checked={option.checked}
                onChange={(event) => option.change(event.target.checked)}
              />
            </label>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
