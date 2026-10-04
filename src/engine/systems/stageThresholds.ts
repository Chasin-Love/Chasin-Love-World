/**
 * Stage-edge dial thresholds — the magic numbers that govern stage crossings
 * in the engine's tick loop, extracted from inline literals so the stage
 * grammar lives in one documented place.
 *
 * The camera zoom dial `zoomT ∈ [0,1]` maps to distance via
 * `dist = 3.0 · 800000^zoomT` (see cameraRig.ts). These thresholds are
 * calibrated against the scale-label ladder in levelSystem.ts.
 */

/* ---- cosmic web ceiling: the edge that hands you to the multiverse ---- */

/** Hard clamp — the dial can never rest above this on the web stage. */
export const WEB_CEILING = 0.865;
/** Pulling at or beyond this with outward zoom velocity crosses into the multiverse. */
const WEB_EDGE_TRIGGER = 0.855;
/** Outward zoom velocity (dial/s) required to cross at a stage edge. */
const WARP_ZOOM_VEL = 0.05;

/* ---- multiverse floor: a wall, not a door (R105) ---- */

/** Soft floor the rig is held at inside the multiverse. R105 authorial
    decree — THE SEALED FLOOR: pushing through it no longer crosses into the
    web. The old push-through crossing (a 0.802 return threshold gated by a
    −0.02 inward zoom velocity) was deleted whole — with no realities it
    landed in the phantom single-anchor-star web; zoom never enters a
    reality, explicit Kamui doors only (the marble click, the palette, the
    stepper). */
export const MULTIVERSE_FLOOR_CLAMP = 0.8;
/** Reality marble frame releases below this zoom. */
export const REALITY_FLOOR = 0.787;
