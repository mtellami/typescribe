export const KEY_SOUNDS = {
  muted: 'Muted',
  soft: 'Soft',
  medium: 'Medium',
  hard: 'Hard',
  pop: 'Pop',
  fart: 'Fart',
} as const;

export const ERROR_SOUNDS = {
  error: 'Error',
  fah: 'Fah',
  bruh: 'Bruh!',
  duck: 'Duck',
  huh: 'Huh?',
  hiss: 'Hiss',
  meow: 'Meow',
  fart: 'Fart',
} as const;

export type KeySound = keyof typeof KEY_SOUNDS;
export type ErrorSound = keyof typeof ERROR_SOUNDS;
