/**
 * Universe simulation clock — a tiny publish/subscribe bridge between the
 * engine's 0.25s onSimDate broadcast and UI that wants to display it (the
 * Core Console epoch tile). Subscribers re-read via useSyncExternalStore,
 * so a date change re-renders only the tile, never the whole app.
 */

let current = '';
let simDays = 0;
const dateListeners = new Set<() => void>();
const daysListeners = new Set<() => void>();

export function publishSimDate(iso: string): void {
  if (iso === current) return;
  current = iso;
  dateListeners.forEach((fn) => fn());
}

export function publishSimDays(days: number): void {
  if (days === simDays) return;
  simDays = days;
  daysListeners.forEach((fn) => fn());
}

export function getSimDate(): string {
  return current;
}

export function getSimDays(): number {
  return simDays;
}

export function subscribeSimDate(fn: () => void): () => void {
  dateListeners.add(fn);
  return () => {
    dateListeners.delete(fn);
  };
}

export function subscribeSimDays(fn: () => void): () => void {
  daysListeners.add(fn);
  return () => {
    daysListeners.delete(fn);
  };
}
