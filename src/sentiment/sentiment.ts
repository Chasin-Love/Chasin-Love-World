/**
 * Sentiment engine — the aurora wave's signal processor.
 *
 * Derives, from the ACTIVE reality's diary entries only:
 *   - a recency-weighted mood spectrum (the anchor star's aurora),
 *   - the "on this day" echoes (every year, the same date's entries).
 *
 * Mood palette mirrors the app's MEANINGS colors so a page's meaning chip
 * and the light it lends the star always agree.
 */

import type { Mood, DiaryEntry } from '../domain/universe';

const MOOD_AURORA: Record<Mood, string> = {
  calm: '#7fc4e8',     /* soft daylight blue */
  warm: '#f2c178',     /* solar gold */
  bright: '#ffe9a8',   /* incandescent white-gold */
  heavy: '#5a6b9e',    /* deep slate blue */
  burning: '#ff7a5a',  /* ember red-orange */
};

export const MOOD_HEX = Object.values(MOOD_AURORA);

export interface AuroraSignal {
  weights: number[];      /* parallel to MOOD_HEX, normalized, recency-weighted */
  intensity: number;      /* 0..1 — how emotionally loud the recent sky is */
  storm: number;          /* 0..1 — turbulence (burning/heavy pull the band apart) */
  dominant: string;       /* hex of the strongest mood */
}

const HALF_LIFE_DAYS = 14;      /* two weeks of entries dominate the aurora */
const INTENSITY_FLOOR = 0.18;   /* the star never goes fully emotionally dark */

/**
 * Recency-weighted mood spectrum: each entry lends its mood color with
 * exponential time decay (14-day half-life). Entries without a mood count
 * as 'calm' at half weight — they still feed the light, just gently.
 */
export function computeAurora(entries: DiaryEntry[], now = Date.now()): AuroraSignal {
  const weights = MOOD_HEX.map(() => 0);
  const DAY = 86400000;
  let total = 0;
  let energy = 0;
  let stormEnergy = 0;

  for (const e of entries ?? []) {
    if (!e || e.archived) continue;
    const mood: Mood = e.mood ?? 'calm';
    const w = mood === 'calm' && !e.mood ? 0.5 : 1;
    const ageDays = Math.max(0, (now - (e.updatedAt ?? e.createdAt)) / DAY);
    const decay = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    const signal = w * decay;
    if (signal < 1e-4) continue;

    const idx = Object.keys(MOOD_AURORA).indexOf(mood);
    weights[idx >= 0 ? idx : 0] += signal;
    total += signal;

    /* emotional energy: bright/burning read loud, calm reads quiet */
    const loud = mood === 'bright' ? 1 : mood === 'burning' ? 0.9 : mood === 'warm' ? 0.6 : mood === 'heavy' ? 0.45 : 0.3;
    energy += signal * loud;
    /* storm: turbulent moods tear the band */
    const torn = mood === 'burning' ? 1 : mood === 'heavy' ? 0.75 : 0;
    stormEnergy += signal * torn;
  }

  const norm = total > 0 ? weights.map((w) => w / total) : MOOD_HEX.map(() => 1 / MOOD_HEX.length);
  const intensity = Math.min(1, INTENSITY_FLOOR + (total > 0 ? energy / total : 0) * 0.8);
  const storm = Math.min(1, stormEnergy / Math.max(total, 1e-6) * 1.4);

  let best = 0;
  norm.forEach((w, i) => { if (w > norm[best]) best = i; });
  const dominant = total > 0 ? MOOD_HEX[best] : '#f2c178';

  return { weights: norm, intensity, storm, dominant };
}

export interface EchoEntry {
  entry: DiaryEntry;
  planetName: string;
  planetId: string;
  yearsAgo: number;
  yearsAgoExact: number;
}

/** Every entry written on this calendar day in any earlier year. */
export function onThisDay(entries: DiaryEntry[], now = Date.now()): EchoEntry[] {
  const d = new Date(now);
  const month = d.getMonth();
  const day = d.getDate();
  const thisYear = d.getFullYear();
  const DAY = 86400000;

  const bodyNames = new Map<string, string>();
  (entries ?? []).forEach((e) => { if (e.planetId && !bodyNames.has(e.planetId)) bodyNames.set(e.planetId, e.planetId); });

  const out: EchoEntry[] = [];
  for (const e of entries ?? []) {
    if (!e || e.archived) continue;
    const t = new Date(e.createdAt);
    if (t.getMonth() !== month || t.getDate() !== day) continue;
    const years = thisYear - t.getFullYear();
    if (years < 1) continue;
    out.push({
      entry: e,
      planetId: e.planetId,
      planetName: bodyNames.get(e.planetId) ?? e.planetId,
      yearsAgo: years,
      yearsAgoExact: Math.round((now - e.createdAt) / DAY),
    });
  }
  return out.sort((a, b) => a.entry.createdAt - b.entry.createdAt);
}

/** Does this reality have any echo today? (cheap gate for callers) */

