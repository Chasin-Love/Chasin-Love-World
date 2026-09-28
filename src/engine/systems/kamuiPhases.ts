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

/** The v1 vortex envelope: one slow sin breath over KAMUI_TRIGGER_DURATION
    seconds (rise → crest → fall), so the summon can actually be watched. */
export const KAMUI_TRIGGER_DURATION = 7; /* seconds */

export const KAMUI_RAMP: string[] = ['#ff1744', '#8b5cf6', '#f2c178'];

/**
 * CAMERA STABILITY — the summon hold.
 *
 * The vortex breathes for KAMUI_TRIGGER_DURATION seconds, cresting at the
 * midpoint, but the portal's zoom used to start on the same frame as the
 * tear, so the camera was already arriving at the body while the red swirl
 * was still rising — the jutsu was never actually seen, and pinning the rig
 * to the clicked body on that frame swept the whole sky sideways. The entry
 * therefore holds the camera EXACTLY where the traveler left it for this
 * long, and only then hands the focus and the dive to the rig — through the
 * crest, into the fall, so the arrival still feels like falling through it.
 */
export const KAMUI_ENTRY_HOLD = 4.2; /* seconds */

/** The arrival framing, as a multiple of the body's radius. The old 3.2 put
    the camera almost on the surface by the time the overlay opened; 4.2 keeps
    the world composed instead of filling the screen. */
export const KAMUI_ENTRY_FRAMING = 4.2;
