import { FakePlayerAdapter } from './fake';
import { YouTubePlayerAdapter } from './youtube';
import type { PlayerAdapter } from './types';

export * from './types';
export { FakePlayerAdapter } from './fake';
export { YouTubePlayerAdapter } from './youtube';
export { SegmentPlayer } from './segment-player';
export type { SegmentBounds, SegmentPlayerOptions } from './segment-player';

export function createPlayerAdapter(container: HTMLElement): PlayerAdapter {
  const mode = process.env.NEXT_PUBLIC_PLAYER_MODE ?? 'youtube';
  return mode === 'fake'
    ? new FakePlayerAdapter()
    : new YouTubePlayerAdapter(container);
}
