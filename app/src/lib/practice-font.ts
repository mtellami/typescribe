export const PRACTICE_FONTS = {
  'Be Vietnam Pro': 'var(--font-vietnam), sans-serif',
  'Roboto Mono': 'var(--font-roboto-mono), monospace',
  Quicksand: 'var(--font-quicksand), sans-serif',
  'Playpen Sans': 'var(--font-playpen), cursive',
};

export function parsePracticeFont(input: string): string | null {
  let name = input.trim();
  if (/^https?:\/\//i.test(name)) {
    try {
      const url = new URL(name);
      if (!['fonts.google.com', 'fonts.googleapis.com'].includes(url.hostname))
        return null;
      name =
        url.searchParams.get('family')?.split(':')[0] ??
        /^\/specimen\/(.+)/.exec(url.pathname)?.[1] ??
        '';
      name = decodeURIComponent(name).replaceAll('+', ' ');
    } catch {
      return null;
    }
  }
  return /^[\p{L}\p{N}][\p{L}\p{N} -]{0,79}$/u.test(name) ? name : null;
}

export function practiceFontFamily(font: string): string {
  return (
    PRACTICE_FONTS[font as keyof typeof PRACTICE_FONTS] ??
    (parsePracticeFont(font)
      ? `${JSON.stringify(font)}, var(--font-vietnam), sans-serif`
      : PRACTICE_FONTS['Be Vietnam Pro'])
  );
}
