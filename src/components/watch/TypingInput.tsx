'use client';

import type { RefObject } from 'react';

interface TypingInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onCompositionEnd: (event: React.CompositionEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

export function TypingInput({
  inputRef,
  onKeyDown,
  onCompositionEnd,
  disabled,
}: TypingInputProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      aria-label="Typing input"
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      inputMode="text"
      tabIndex={-1}
      disabled={disabled}
      className="pointer-events-none absolute h-px w-px opacity-0"
      onKeyDown={onKeyDown}
      onCompositionEnd={onCompositionEnd}
    />
  );
}
