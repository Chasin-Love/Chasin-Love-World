/**
 * KAMUI — Dimensional Traversal Engine · phase machine definitions
 *
 * The ordered beat chain every Kamui traversal plays, and the per-profile
 * durations (adaptive: small moves feel quick, dimension crossings feel
 * grand) plus a reduced-motion variant. The state machine itself lives in
 * systems/kamui.ts (KamuiDirector); this module formalizes the contract:
 * the phase chain, the field-intensity weight each phase contributes, and
 * the beat durations.
 *
 * Physics grounding (see docs/KAMUI-RESEARCH.md):
 * - PULL/VORTEX — accretion dynamics: matter with angular momentum spirals
 *   into a mass with differential (Keplerian) rotation, inner-first.
 * - The surface bends because a spinning mass drags spacetime around it
 *   (Lense–Thirring frame dragging).
 * - Nearest-first stretching = tidal spaghettification (TDE grammar).
 * - The glowing throat = a Morris–Thorne traversable wormhole REQUIRES
 *   exotic energy at the throat (null-energy-condition violation).
 * - The exit is a white hole: the time-reversal of the entrance.
 */

export type KamuiPhase =
  | 'idle'
  | 'arm'
  | 'pull'
  | 'vortex'
  | 'collapse'
  | 'throat'
  | 'eject'
  | 'settle';

export type KamuiProfile = 'portal' | 'dive' | 'warp' | 'jump';

/** Field intensity each phase contributes (0..1+) before its own progress. */
export const KAMUI_PHASE_WEIGHTS: Record<KamuiPhase, number> = {
  idle: 0,
  arm: 0.06,
  pull: 0.22,
  vortex: 0.62,
  collapse: 1,
  throat: 1,
  eject: 0.55,
  settle: 0,
};

/** One linear beat of the chain. `throat` has bespoke logic (mid-point swap). */
export interface KamuiBeat {
  from: Exclude<KamuiPhase, 'idle' | 'settle'>;
  next: KamuiPhase;
  /** duration in seconds at full motion */
  duration: number;
  /** duration in seconds with reduced motion */
  reduced: number;
}

/** The linear chain in causal order (settle follows eject via `eject` beat). */
const KAMUI_CHAIN: readonly KamuiBeat[] = [
  { from: 'arm', next: 'pull', duration: 0.25, reduced: 0.1 },
  { from: 'pull', next: 'vortex', duration: 0.6, reduced: 0.15 },
  { from: 'vortex', next: 'collapse', duration: 0.7, reduced: 0.2 },
  { from: 'collapse', next: 'throat', duration: 0.4, reduced: 0.12 },
  { from: 'throat', next: 'eject', duration: 0.35, reduced: 0.15 },
  { from: 'eject', next: 'settle', duration: 0.3, reduced: 0.18 },
];

/** Profile scale factors — adaptive feel (dive ≈ portal ×1.25, warp ×1.9, jump ×1.45). */
const PROFILE_SCALE: Record<KamuiProfile, number> = {
  portal: 1,
  dive: 1.25,
  warp: 1.9,
  jump: 1.45,
};

/** Durations for every beat of a profile (seconds). */
export function kamuiBeatDurations(profile: KamuiProfile, reducedMotion: boolean): number[] {
  const scale = PROFILE_SCALE[profile];
  return KAMUI_CHAIN.map((beat) =>
    reducedMotion ? beat.reduced : Math.min(beat.duration * scale, 1.6),
  );
}

/** Total sequence length for a profile (seconds). */
export function kamuiDuration(profile: KamuiProfile, reducedMotion: boolean): number {
  return kamuiBeatDurations(profile, reducedMotion).reduce((a, b) => a + b, 0);
}

/** Lookup: current phase → next beat (null for idle/settle). */
export function kamuiBeatFor(phase: KamuiPhase): KamuiBeat | null {
  return KAMUI_CHAIN.find((b) => b.from === phase) ?? null;
}

/**
 * The signature ramp — the exotic-matter identity (Morris–Thorne throats
 * require energy that violates the null energy condition, so the throat
 * must look bright and *wrong*). The pull/vortex stay in the reality's own
 * palette; everything from collapse onward wears this ramp.
 */
export const KAMUI_RAMP: string[] = ['#a855f7', '#ec4899', '#f97316', '#fbbf24', '#fff7e6'];
