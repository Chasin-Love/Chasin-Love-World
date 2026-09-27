/**
 * KAMUI (v1) — the Space-Time Vortex shared contract.
 *
 * The red demonic vortex (shaders.ts `portalFrag` + engine.triggerKamui())
 * is theater: it tears the SCREEN around the Multiverse Core while the
 * plain-zoom portal, the galaxy dive and the stage dial do the actual
 * travel. This module keeps the one piece of the old chain the engine
 * still consumes — the portal zoom's field-intensity weights — so the
 * portal timeline and any tooling share one source of truth.
 */

export type PortalPhase =
  | 'idle'
  | 'entering'
  | 'open'
  | 'leaving';

/** Field intensity each phase contributes before its own progress is added. */
export const KAMUI_PHASE_WEIGHTS: Record<PortalPhase, number> = {
  idle: 0,
  entering: 0.55,
  open: 1,
  leaving: 0.4,
};

/** The v1 vortex envelope: a ~0.87s sin pulse (the trigger's decay). */
export const KAMUI_TRIGGER_DECAY = 1.15; /* timer units per second */

export const KAMUI_RAMP: string[] = ['#ff1744', '#8b5cf6', '#f2c178'];
