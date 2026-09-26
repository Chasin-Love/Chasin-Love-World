/**
 * Universe simulation clock — a tiny publish/subscribe bridge between the
 * engine's 0.25s onSimDate broadcast and UI that wants to display it (the
 * Core Console epoch tile). Subscribers re-read via useSyncExternalStore,
 * so a date change re-renders only the tile, never the whole app.
 */

let current = '';
const listeners = new Set<() => void>();

export function publishSimDate(iso: string): void {
  if (iso === current) return;
  current = iso;
  listeners.forEach((fn) => fn());
}

export function getSimDate(): string {
  return current;
}

export function subscribeSimDate(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
