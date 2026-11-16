import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { YouTubePlayerAdapter } from './youtube';

type PlayerOptions = {
  videoId: string;
  events: { onReady: () => void; onError: (event: { data: number }) => void };
};

let instances: MockPlayer[];
let failNext: boolean;
class MockPlayer {
  cueVideoById = vi.fn();
  destroy = vi.fn(() => this.iframe.remove());
  iframe = document.createElement('iframe');
  constructor(
    target: HTMLElement,
    readonly options: PlayerOptions,
  ) {
    target.replaceWith(this.iframe);
    instances.push(this);
    const shouldFail = failNext;
    failNext = false;
    queueMicrotask(() =>
      shouldFail
        ? options.events.onError({ data: 100 })
        : options.events.onReady(),
    );
  }
}

beforeEach(() => {
  instances = [];
  failNext = false;
  window.YT = { Player: MockPlayer };
});
afterEach(() => {
  delete window.YT;
  document.body.replaceChildren();
});

function createAdapter() {
  const host = document.createElement('div');
  document.body.append(host);
  return { host, adapter: new YouTubePlayerAdapter(host) };
}

describe('YouTube player lifecycle', () => {
  it('creates an iframe inside the React host and passes the initial video ID', async () => {
    const { host, adapter } = createAdapter();
    await adapter.loadVideo('RcGyVTAoXEU');
    expect(host.isConnected).toBe(true);
    expect(host.querySelector('iframe')).not.toBeNull();
    expect(instances[0].options.videoId).toBe('RcGyVTAoXEU');
    expect(instances[0].cueVideoById).not.toHaveBeenCalled();
    adapter.destroy();
    expect(host.isConnected).toBe(true);
    expect(host.childElementCount).toBe(0);
  });

  it('reuses the ready player when changing videos', async () => {
    const { adapter } = createAdapter();
    await adapter.loadVideo('RcGyVTAoXEU');
    await adapter.loadVideo('M7lc1UVf-VE');
    expect(instances).toHaveLength(1);
    expect(instances[0].cueVideoById).toHaveBeenLastCalledWith({
      videoId: 'M7lc1UVf-VE',
    });
    adapter.destroy();
  });

  it('rejects unavailable videos and creates a fresh player on retry', async () => {
    const { host, adapter } = createAdapter();
    failNext = true;
    await expect(adapter.loadVideo('testVideo01')).rejects.toThrow(
      'unavailable or private',
    );
    expect(instances[0].destroy).toHaveBeenCalledOnce();
    await adapter.loadVideo('RcGyVTAoXEU');
    expect(instances).toHaveLength(2);
    expect(host.querySelector('iframe')).not.toBeNull();
    adapter.destroy();
  });
});
