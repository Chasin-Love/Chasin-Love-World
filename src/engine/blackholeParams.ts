/**
 * Live tuning parameters for the raymarched black hole (Round 20.4).
 *
 * The defaults ARE dgreenheck's runtime-tuned demo config — the settings his
 * reference screenshot shows — carried verbatim so the port renders his look
 * out of the box. Every slider writes through live (the renderer subscribes)
 * and persists, the same contract as the quality tier in capability.ts:
 * module store + localStorage + a window CustomEvent, no engine plumbing.
 *
 * Mass is his `blackHoleMass` (Schwarzschild radius = mass × 2 shader units)
 * and lensing his `gravitationalLensing`: the geodesic shape depends on their
 * PRODUCT (bend per unit path = rs × lensing, step-size independent), so the
 * slider pair reproduces exactly the responsiveness of his demo.
 */

export interface BlackHoleParams {
  /** demo blackHoleMass — rs = mass × 2 shader units */
  mass: number;
  /** demo gravitationalLensing — bend per unit = rs × lensing */
  lensing: number;
  /** demo dopplerStrength */
  doppler: number;
  /** disk inner edge, shader units (his Geometry → Inner Radius) */
  diskInner: number;
  /** disk outer edge, shader units (his Geometry → Outer Radius) */
  diskOuter: number;
  /** demo diskBrightness */
  brightness: number;
  /** demo diskRotationSpeed — the SIGN flips the Doppler beam side */
  rotSpeed: number;
}

/** The reference screenshot's values — dgreenheck's defaults (his panel
    displays 49.78 kK as "50k K"; diskTemperature itself is not tunable here). */
export const BLACKHOLE_DEFAULTS: BlackHoleParams = {
  mass: 0.4,
  lensing: 2.4,
  doppler: 1.0,
  diskInner: 4.1,
  diskOuter: 14.5,
  brightness: 5.0,
  rotSpeed: -8.7,
};

/** His slider ranges (ui.js), verbatim — so the panel feels like the demo. */
export const BLACKHOLE_RANGES: Record<keyof BlackHoleParams, { min: number; max: number; step: number }> = {
  mass: { min: 0.1, max: 3.0, step: 0.1 },
  lensing: { min: 0.5, max: 3.0, step: 0.1 },
  doppler: { min: 0.0, max: 2.0, step: 0.1 },
  diskInner: { min: 2.0, max: 5.0, step: 0.1 },
  diskOuter: { min: 6.0, max: 20.0, step: 0.5 },
  brightness: { min: 0.5, max: 5.0, step: 0.1 },
  rotSpeed: { min: -20.0, max: 20.0, step: 0.1 },
};

const STORAGE_KEY = 'my-universe:blackhole:v1';
export const BLACKHOLE_CHANGE_EVENT = 'eventide-blackhole-change';

let cached: BlackHoleParams | null = null;

function clamp(key: keyof BlackHoleParams, value: number): number {
  const r = BLACKHOLE_RANGES[key];
  return Math.min(r.max, Math.max(r.min, value));
}

export function getBlackHoleParams(): BlackHoleParams {
  if (cached) return { ...cached };
  const p = { ...BLACKHOLE_DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Record<keyof BlackHoleParams, unknown>>;
      for (const key of Object.keys(BLACKHOLE_DEFAULTS) as Array<keyof BlackHoleParams>) {
        const v = saved[key];
        if (typeof v === 'number' && Number.isFinite(v)) p[key] = clamp(key, v);
      }
    }
  } catch { /* private mode or corrupt JSON — defaults stand */ }
  cached = p;
  return { ...p };
}

export function setBlackHoleParam(key: keyof BlackHoleParams, value: number): BlackHoleParams {
  const p = getBlackHoleParams();
  p[key] = clamp(key, value);
  cached = p;
  persist(p);
  window.dispatchEvent(new CustomEvent(BLACKHOLE_CHANGE_EVENT, { detail: { ...p } }));
  return { ...p };
}

export function resetBlackHoleParams(): BlackHoleParams {
  cached = { ...BLACKHOLE_DEFAULTS };
  persist(cached);
  window.dispatchEvent(new CustomEvent(BLACKHOLE_CHANGE_EVENT, { detail: { ...cached } }));
  return { ...cached };
}

function persist(p: BlackHoleParams): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* private mode — live tuning still works, just not remembered */ }
}
