import { describe, expect, it, vi } from 'vitest';
import { FakePlayerAdapter } from './fake';

describe('FakePlayerAdapter', () => {
  it('emits ready on loadVideo', async () => {
    const adapter = new FakePlayerAdapter({ autoTick: false });
    const ready = vi.fn();
    adapter.on('ready', ready);

    await adapter.loadVideo('dQw4w9WgXcQ');
    expect(ready).toHaveBeenCalledTimes(1);
    expect(adapter.getState().isReady).toBe(true);
  });

  it('playSegment seeks to the segment start and plays', async () => {
    const adapter = new FakePlayerAdapter({ autoTick: false });
    await adapter.loadVideo('dQw4w9WgXcQ');

    adapter.playSegment(1500, 4000);
    expect(adapter.getCurrentTimeMs()).toBe(1500);
    expect(adapter.getState().isPlaying).toBe(true);
  });

  it('advance moves the clock scaled by playback rate', () => {
    const adapter = new FakePlayerAdapter({ autoTick: false });
    adapter.setPlaybackRate(1.5);
    adapter.play();
    adapter.advance(1000);
    expect(adapter.getCurrentTimeMs()).toBe(1500);
  });

  it('pause stops playback', async () => {
    const adapter = new FakePlayerAdapter({ autoTick: false });
    await adapter.loadVideo('dQw4w9WgXcQ');
    adapter.play();
    adapter.pause();
    expect(adapter.getState().isPlaying).toBe(false);
    adapter.advance(500);
    expect(adapter.getCurrentTimeMs()).toBe(0);
  });

  it('finishSegment jumps to the segment end', async () => {
    const adapter = new FakePlayerAdapter({ autoTick: false });
    await adapter.loadVideo('dQw4w9WgXcQ');
    adapter.playSegment(0, 3000);
    adapter.finishSegment();
    expect(adapter.getCurrentTimeMs()).toBe(3000);
  });

  it('emitError notifies error listeners and unsubscribes', () => {
    const adapter = new FakePlayerAdapter({ autoTick: false });
    const onError = vi.fn();
    const off = adapter.on('error', onError);

    adapter.emitError(150);
    expect(onError).toHaveBeenCalledWith({ code: 150 });

    off();
    adapter.emitError(100);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('destroy stops events and timers', async () => {
    const adapter = new FakePlayerAdapter({ autoTick: false });
    const ready = vi.fn();
    adapter.on('ready', ready);
    adapter.destroy();

    await adapter.loadVideo('dQw4w9WgXcQ');
    expect(ready).not.toHaveBeenCalled();
    adapter.advance(100);
    expect(adapter.getCurrentTimeMs()).toBe(0);
  });
});
