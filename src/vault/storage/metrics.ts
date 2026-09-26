/**
 * Timeline, History, & Universe Analytics Engine
 * Calculates writing streaks, chronological events, state snapshots, and cosmic statistics.
 */

import type { TimelineEvent, UniverseState } from '../types';

const DAY_MS = 86400000;

export function eventsOf(s: UniverseState): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  s.bodies.forEach((b) => {
    if (b.id !== 'anchor') {
      ev.push({ t: b.createdAt, label: `${b.name} formed`, kind: 'body', refId: b.id });
    }
  });
  s.entries.forEach((e) => {
    const p = s.bodies.find((b) => b.id === e.planetId);
    ev.push({
      t: e.createdAt,
      label: `“${e.title}” written on ${p ? p.name : 'a world'}`,
      kind: 'entry',
      refId: e.id,
    });
  });
  s.connections.forEach((c) => {
    const a = s.bodies.find((b) => b.id === c.a);
    const b = s.bodies.find((x) => x.id === c.b);
    ev.push({
      t: c.createdAt,
      label: `Link formed — ${a?.name ?? '?'} ⟷ ${b?.name ?? '?'}`,
      kind: 'link',
      refId: c.id,
    });
  });
  s.vault.forEach((f) =>
    ev.push({ t: f.addedAt, label: `${f.name} sealed in Vault`, kind: 'vault', refId: f.id })
  );
  return ev.sort((x, y) => x.t - y.t);
}

function snapshotAt(s: UniverseState, t: number) {
  return {
    bodies: s.bodies.filter((b) => b.createdAt <= t),
    entries: s.entries.filter((e) => e.createdAt <= t),
    connections: s.connections.filter((c) => c.createdAt <= t),
    vault: s.vault.filter((f) => f.addedAt <= t),
  };
}



/** Local calendar-day bucket — UTC day numbers made evening writers lose streaks at 7pm. */
function localDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Computes consecutive writing days ending today or yesterday (in local time) */
export function computeStreak(entries: { createdAt: number }[]): number {
  if (!entries.length) return 0;
  const days = new Set(entries.map((e) => localDay(e.createdAt)));
  const cursor0 = localDay(Date.now());
  let cursor = cursor0;
  if (!days.has(cursor)) cursor = cursor0 - DAY_MS;
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}


