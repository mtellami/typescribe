'use client';

import { useSession } from '@/store/session';

export function PracticePreferences() {
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
    <section aria-label="Practice preferences" className="border-t pt-6">
      <h2 className="text-sm font-medium">Practice preferences</h2>
      <p className="text-muted-foreground mt-1 text-xs">
        Saved on this device.
      </p>
      <div className="divide-y">
        {options.map((option) => (
          <label
            key={option.label}
            className="flex cursor-pointer items-center justify-between gap-5 py-5"
          >
            <span>
              <span className="block text-sm font-medium">{option.label}</span>
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
    </section>
  );
}
