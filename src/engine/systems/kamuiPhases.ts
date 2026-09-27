/**
 * KAMUI — Dimensional Traversal Engine · phase machine definitions (v2)
 *
 * The ordered beat chain every Kamui traversal plays — the owner's 9-state
 * model (docs/kamui-owner-research/KAMUI_DESIGN_SPEC.md) — plus the
 * per-profile adaptive durations and a reduced-motion variant. The state
 * machine itself lives in systems/kamui.ts (KamuiDirector).
 *
 * The tiers:
 * - **Tier I — Continuum Warp**: same-reality jumps (portal / dive / jump
 *   profiles). A wormhole shortcut — distance is irrelevant but both points
 *   exist in the same spacetime. Skips the breach beat entirely.
 * - **Tier II — Breach Warp**: crossing into a reality that, by the
 *   project's own law, does not exist for the traveler (Cosmic Web ↔
 *   Multiverse). Plays the extra **breach** beat: the vortex stalls against
 *   the membrane, hairline light fractures cross the view, the frame
 *   stutters and desaturates, one visible failed attempt — then it violently
 *   tears through. This is what sells "impossible, but forced."
 *
 * Physics grounding (docs/KAMUI-RESEARCH.md):
 * - onsetPull → angularCapture: matter infalls radially FIRST; the spiral
 *   forms only as angular momentum takes over (conservation of L — the
 *   accretion-disk formation sequence).
 * - The bending of reality itself = frame dragging (Lense–Thirring).
 * - Nearest-first stretching = tidal spaghettification (TDE grammar).
 * - The glowing threshold = a Morris–Thorne throat REQUIRES exotic energy
 *   (null-energy-condition violation).
 * - The exit is a white hole: the time-reversal of the entrance.
 */

export type KamuiPhase =
  | 'idle'
  | 'ignition'
  | 'onsetPull'
  | 'angularCapture'
  | 'horizonClose'
  | 'breach'
  | 'threshold'
  | 'emergence'
  | 'resolution';

export type KamuiProfile = 'portal' | 'dive' | 'warp' | 'jump';
/** Tier I = continuum warp (same spacetime) · Tier II = breach warp (isolated realities). */
export type KamuiTier = 1 | 2;

/** Field intensity each phase contributes (0..1+) before its own progress. */
export const KAMUI_PHASE_WEIGHTS: Record<KamuiPhase, number> = {
  idle: 0,
  ignition: 0.06,
  onsetPull: 0.2,
  angularCapture: 0.55,
  horizonClose: 0.85,
  breach: 0.85, /* the stall — the tear holds, refusing to close */
  threshold: 1,
  emergence: 0.5,
  resolution: 0,
};

/** One linear beat of the chain. `threshold` has bespoke logic (mid-point swap). */
export interface KamuiBeat {
  from: Exclude<KamuiPhase, 'idle' | 'resolution' | 'breach'>;
  next: KamuiPhase;
  /** duration in seconds at full motion */
  duration: number;
  /** duration in seconds with reduced motion */
  reduced: number;
}

/** The linear chain in causal order (Tier I). Tier II inserts `breach`. */
const KAMUI_CHAIN: readonly KamuiBeat[] = [
  { from: 'ignition', next: 'onsetPull', duration: 0.3, reduced: 0.12 },
  { from: 'onsetPull', next: 'angularCapture', duration: 0.55, reduced: 0.16 },
  { from: 'angularCapture', next: 'horizonClose', duration: 0.75, reduced: 0.2 },
  { from: 'horizonClose', next: 'threshold', duration: 0.45, reduced: 0.14 },
  { from: 'threshold', next: 'emergence', duration: 0.35, reduced: 0.14 },
  { from: 'emergence', next: 'resolution', duration: 0.3, reduced: 0.16 },
];

/** The Tier II stall — inserted between horizonClose and threshold. */
const BREACH_BEAT = { phase: 'breach' as KamuiPhase, duration: 1.5, reduced: 0.5 };

/** Profile scale factors — adaptive feel (dive > portal, jump > dive, warp grandest). */
const PROFILE_SCALE: Record<KamuiProfile, number> = {
  portal: 1,
  dive: 1.25,
  warp: 1.9,
  jump: 1.45,
};

/** Durations for every beat of a profile (seconds), tier-aware. */
export function kamuiBeatDurations(profile: KamuiProfile, reducedMotion: boolean, tier: KamuiTier = 1): number[] {
  const scale = PROFILE_SCALE[profile];
  const beats = KAMUI_CHAIN.map((beat) =>
    reducedMotion ? beat.reduced : Math.min(beat.duration * scale, 1.6),
  );
  if (tier === 2) beats.splice(4, 0, reducedMotion ? BREACH_BEAT.reduced : BREACH_BEAT.duration);
  return beats;
}

/** Total sequence length for a profile (seconds). */
export function kamuiDuration(profile: KamuiProfile, reducedMotion: boolean, tier: KamuiTier = 1): number {
  return kamuiBeatDurations(profile, reducedMotion, tier).reduce((a, b) => a + b, 0);
}

/** The phase sequence for a profile/tier (beats in causal order). */
export function kamuiPhaseSequence(tier: KamuiTier): KamuiPhase[] {
  const base: KamuiPhase[] = ['ignition', 'onsetPull', 'angularCapture', 'horizonClose'];
  if (tier === 2) base.push('breach');
  base.push('threshold', 'emergence', 'resolution');
  return base;
}

/** Lookup: current phase → next beat (null for idle/resolution). */
export function kamuiBeatFor(phase: KamuiPhase): KamuiBeat | null {
  return KAMUI_CHAIN.find((b) => b.from === phase) ?? null;
}

/**
 * The signature ramp — the exotic-matter identity (Morris–Thorne throats
 * require energy that violates the null energy condition, so the throat
 * must look bright and *wrong*). The pull stays in the reality's own
 * palette; everything from horizonClose onward wears this ramp.
 */
export const KAMUI_RAMP: string[] = ['#a855f7', '#ec4899', '#f97316', '#fbbf24', '#fff7e6'];
