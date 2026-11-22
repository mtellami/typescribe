'use client';

import { useEffect, useState } from 'react';
import { Check, CaseSensitive } from 'lucide-react';
import { useSession } from '@/store/session';
import {
  PRACTICE_FONTS,
  parsePracticeFont,
  practiceFontFamily,
} from '@/lib/practice-font';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ControlPopover } from './ControlPopover';

export function PracticeFontPicker({
  onFocusInput,
}: {
  onFocusInput?: () => void;
}) {
  const font = useSession((state) => state.practiceFont);
  const [draft, setDraft] = useState('');
  const parsed = parsePracticeFont(draft);
  useEffect(() => {
    if (font in PRACTICE_FONTS || !parsePracticeFont(font)) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replaceAll('%20', '+')}&display=swap`;
    document.head.append(stylesheet);
    return () => stylesheet.remove();
  }, [font]);
  return (
    <ControlPopover
      label="Practice font"
      icon={<CaseSensitive className="size-4" />}
      onFocusInput={onFocusInput}
    >
      {(close) => (
        <>
          <div className="space-y-1">
            {[
              ...Object.keys(PRACTICE_FONTS),
              ...(font in PRACTICE_FONTS ? [] : [font]),
            ].map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={font === name}
                onClick={() => {
                  useSession.getState().setPracticeFont(name);
                  close();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${font === name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                style={{ fontFamily: practiceFontFamily(name) }}
              >
                {name}
                {font === name && <Check className="size-4" />}
              </button>
            ))}
          </div>
          <form
            className="mt-3 space-y-2 border-t pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (parsed) {
                useSession.getState().setPracticeFont(parsed);
                setDraft('');
                close();
              }
            }}
          >
            <label
              htmlFor="custom-practice-font"
              className="text-muted-foreground block text-xs leading-relaxed"
            >
              Enter a font name or link from{' '}
              <a
                href="https://fonts.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Google Fonts
              </a>
            </label>
            <Input
              id="custom-practice-font"
              placeholder="Roboto Mono"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={Boolean(draft && !parsed)}
            />
            {draft && !parsed && (
              <p role="status" className="text-error text-xs">
                Enter a font name or a Google Fonts link.
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="sm"
              disabled={!parsed}
            >
              Apply font
            </Button>
          </form>
        </>
      )}
    </ControlPopover>
  );
}
