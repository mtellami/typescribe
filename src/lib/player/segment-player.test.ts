import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakePlayerAdapter } from './fake';
import { SegmentPlayer, type SegmentBounds } from './segment-player';

const SEGMENTS: SegmentBounds[] = [
  { startMs: 0, endMs: 3000 },
  { startMs: 5000, endMs: 8000 },
  { startMs: 10000, endMs: 12000 },
];

function setup() {
  const adapter = new FakePlayerAdapter({ autoTick: false });
  const player = new SegmentPlayer(adapter, { autoStartPolling: false });
  player.setSegments(SEGMENTS);
  return { adapter, player };
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    value: hidden,
    configurable: true,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  setHidden(false);
});

describe('SegmentPlayer', () => {
  it('selects a segment, seeks to its start, and plays', async () => {
    const { adapter, player } = setup();
    await adapter.loadVideo('dQw4w9WgXcQ');

    player.selectSegment(1);
    expect(adapter.getCurrentTimeMs()).toBe(5000);
    expect(adapter.getState().isPlaying).toBe(true);
    expect(player.currentIndex).toBe(1);
    expect(player.isPlaying).toBe(true);
    player.destroy();
  });

  it('pauses at endMs - 50 and notifies segment-end listeners', async () => {
    const { adapter, player } = setup();
    await adapter.loadVideo('dQw4w9WgXcQ');
    const onEnd = vi.fn();
    player.onSegmentEnd(onEnd);

    player.selectSegment(0);
    adapter.advance(2900);
    player.poll();
    expect(onEnd).not.toHaveBeenCalled();
    expect(adapter.getState().isPlaying).toBe(true);

    adapter.advance(100);
    player.poll();
    expect(onEnd).toHaveBeenCalledWith(0);
    expect(adapter.getState().isPlaying).toBe(false);
    expect(player.isPlaying).toBe(false);

    player.destroy();
  });

  it('replay seeks to the current segment start and plays', async () => {
    const { adapter, player } = setup();
    await adapter.loadVideo('dQw4w9WgXcQ');
    player.selectSegment(0);
    adapter.advance(2960);
    player.poll();

    player.replay();
    expect(adapter.getCurrentTimeMs()).toBe(0);
    expect(adapter.getState().isPlaying).toBe(true);
    player.destroy();
  });

  it('previous and next seek without autoplay', async () => {
    const { adapter, player } = setup();
    await adapter.loadVideo('dQw4w9WgXcQ');
    player.selectSegment(1);

    player.next();
    expect(player.currentIndex).toBe(2);
    expect(adapter.getCurrentTimeMs()).toBe(10000);
    expect(adapter.getState().isPlaying).toBe(false);

    player.previous();
    expect(player.currentIndex).toBe(1);
    expect(adapter.getCurrentTimeMs()).toBe(5000);
    expect(adapter.getState().isPlaying).toBe(false);
    player.destroy();
  });

  it('does not move past the segment boundaries', async () => {
    const { adapter, player } = setup();
    await adapter.loadVideo('dQw4w9WgXcQ');

    player.previous();
    expect(player.currentIndex).toBe(0);

    player.selectSegment(2);
    player.next();
    expect(player.currentIndex).toBe(2);
    player.destroy();
  });

  it('restart returns to the first segment without autoplay', async () => {
    const { adapter, player } = setup();
    await adapter.loadVideo('dQw4w9WgXcQ');
    player.selectSegment(2);

    player.restart();
    expect(player.currentIndex).toBe(0);
    expect(adapter.getCurrentTimeMs()).toBe(0);
    expect(adapter.getState().isPlaying).toBe(false);
    player.destroy();
  });

  it('pauses when the document is hidden and stays paused on return', async () => {
    const { adapter, player } = setup();
    await adapter.loadVideo('dQw4w9WgXcQ');
    const onVisibility = vi.fn();
    player.onVisibilityChange(onVisibility);

    player.selectSegment(1);
    adapter.advance(1000);

    setHidden(true);
    expect(adapter.getState().isPlaying).toBe(false);
    expect(player.isPlaying).toBe(false);

    setHidden(false);
    expect(adapter.getCurrentTimeMs()).toBe(5000);
    expect(adapter.getState().isPlaying).toBe(false);
    expect(onVisibility).toHaveBeenCalledWith(false);
    player.destroy();
  });

  it('destroy stops polling and clears listeners', async () => {
    vi.useFakeTimers();
    const adapter = new FakePlayerAdapter({ autoTick: false });
    const player = new SegmentPlayer(adapter);
    player.setSegments(SEGMENTS);
    await adapter.loadVideo('dQw4w9WgXcQ');
    const onEnd = vi.fn();
    player.onSegmentEnd(onEnd);

    player.selectSegment(0);
    adapter.advance(3000);
    player.destroy();
    vi.advanceTimersByTime(1000);
    expect(onEnd).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
