import { STORAGE_KEYS } from '../platform/storageKeys';
/**
 * ROUND 53 — the user's handle on the geodesic black hole tier.
 *
 * The lensed renderer is on by default (medium+ tier) with two runtime nets:
 * the frame-budget breaker and the shader-error disarm. Both stand it down
 * SILENTLY, so a session could lose the spacetime bending with no way to
 * see that — or force it back. This store gives the tier a visible switch:
 *
 *   auto (default) — safety nets active, exactly as before
 *   on             — the lensed look is forced; only a genuine shader
 *                    failure can stand it down (a broken shader can never
 *                    be forced)
 *   off            — the composite hole only
 *
 * Same contract as blackholeParams/capability: module store + localStorage +
 * window CustomEvent, no engine plumbing. The engine REPORTS every tier
 * transition back through setRaymarchStatus so the Studio card can show
 * what is actually live instead of guessing.
 */

export type RaymarchOverride = 'auto' | 'on' | 'off';

export interface RaymarchStatus {
  /** active: geodesic renderer visible · forced: same, via the override ·
      fallback: composite showing (reason says why) · off: switch is off */
  state: 'active' | 'forced' | 'fallback' | 'off';
  reason: string;
}

export const RAYMARCH_OVERRIDE_EVENT = 'eventide-blackhole-tier';
export const RAYMARCH_STATUS_EVENT = 'eventide-raymarch-status';

const OVERRIDE_KEY = STORAGE_KEYS.blackholeTier;
const OVERRIDES: readonly RaymarchOverride[] = ['auto', 'on', 'off'];

let cachedOverride: RaymarchOverride | null = null;
let status: RaymarchStatus = { state: 'fallback', reason: 'boot' };

export function getRaymarchOverride(): RaymarchOverride {
  if (cachedOverride) return cachedOverride;
  let v: RaymarchOverride = 'auto';
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (OVERRIDES.includes(raw as RaymarchOverride)) v = raw as RaymarchOverride;
  } catch { /* private mode — auto stands */ }
  cachedOverride = v;
  return v;
}

export function setRaymarchOverride(v: RaymarchOverride): void {
  cachedOverride = v;
  try {
    localStorage.setItem(OVERRIDE_KEY, v);
  } catch { /* private mode — live switching still works, just not remembered */ }
  window.dispatchEvent(new CustomEvent(RAYMARCH_OVERRIDE_EVENT, { detail: v }));
}

export function getRaymarchStatus(): RaymarchStatus {
  return { ...status };
}

/** Engine-only reporter — every geodesic-tier transition announces itself. */
export function setRaymarchStatus(state: RaymarchStatus['state'], reason: string): void {
  status = { state, reason };
  try {
    window.dispatchEvent(new CustomEvent(RAYMARCH_STATUS_EVENT, { detail: { ...status } }));
  } catch { /* no window in exotic embeds — the getter still tells the truth */ }
}
