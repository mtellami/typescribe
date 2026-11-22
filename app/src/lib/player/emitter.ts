import type { PlayerEvent, PlayerEventListener } from './types';

export class Emitter {
  private listeners = new Map<PlayerEvent, Set<PlayerEventListener>>();

  on(event: PlayerEvent, callback: PlayerEventListener): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(callback);
    this.listeners.set(event, set);
    return () => {
      set.delete(callback);
    };
  }

  emit(event: PlayerEvent, data?: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const callback of [...set]) callback(data);
  }

  clear(): void {
    this.listeners.clear();
  }
}
