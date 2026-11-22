import { describe, expect, it } from 'vitest';
import { parsePracticeFont, practiceFontFamily } from './practice-font';

describe('custom practice fonts', () => {
  it.each([
    ['  Roboto Mono  ', 'Roboto Mono'],
    ['https://fonts.google.com/specimen/Playpen+Sans', 'Playpen Sans'],
    ['https://fonts.google.com/specimen/Be%20Vietnam%20Pro', 'Be Vietnam Pro'],
    [
      'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&display=swap',
      'Roboto Mono',
    ],
  ])('extracts a font name from %s', (input, expected) => {
    expect(parsePracticeFont(input)).toBe(expected);
  });
  it.each([
    '',
    'https://example.com/font',
    'font"; color:red',
    'url(https://example.com)',
    'https://fonts.google.com/',
  ])('rejects invalid font input %s', (input) => {
    expect(parsePracticeFont(input)).toBeNull();
  });
  it('uses a safe fallback for invalid stored fonts', () => {
    expect(practiceFontFamily('font"; color:red')).toBe(
      'var(--font-vietnam), sans-serif',
    );
  });
});
