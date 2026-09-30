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

/* ---- multiverse floor: the way back to the web ---- */

/** Soft floor the rig is held at inside the multiverse. */
export const MULTIVERSE_FLOOR_CLAMP = 0.8;
/** Crossing below this while pushing inward carries the dial back to the web. */
export const MULTIVERSE_FLOOR_RETURN = 0.802;
/** Inward zoom velocity (dial/s) required to cross back. R72: matched to the
    web-side push (0.02) — at -0.05 the way home asked twice the effort and
    the reverse come read as if it did not exist. */
export const RETURN_ZOOM_VEL = -0.02;
/** Reality marble frame releases below this zoom. */
export const REALITY_FLOOR = 0.787;
