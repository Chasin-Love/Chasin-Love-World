import { STORAGE_KEYS } from '../platform/storageKeys';
/**
 * ROUND 61 — the camera remembers.
 *
 * The user's report (the third time the same ghost appeared): a composition
 * they found and loved — the black hole as a tilted disk with the stellar
 * belt sweeping around it — was on screen mid-session, and after closing and
 * reopening the app the view was back at the boot default. Round 60 traced
 * one instance of this to in-session camera resets; this module closes the
 * cross-boot half: THE VIEW ITSELF IS NOW PERSISTED.
 *
 * The contract is deliberately identical to blackholeParams/blackholeTier
 * (Round 20.4 / 53): module store + localStorage + a window CustomEvent, no
 * engine plumbing. The engine alone decides WHEN a placement is worth
 * remembering — a mid-Kamui dive or a portal flight must never be saved —
 * and calls capture()/restore() at the same two moments the portal system
 * already uses: beginPortal saves, the boot finalize restores.
 *
 * The black hole itself is not touched. This is where the camera sits, not
 * what the hole renders.
 */

export interface CameraMemory {
  /** the rig's zoom dial (dist = 3 · 800000^zoomT) */
  zoomT: number;
  /** orbit longitude/latitude, radians */
  theta: number;
  phi: number;
  /** world-space pan offset */
  pan: [number, number, number];
  /** wall-clock ms, for diagnostics only */
  savedAt: number;
}

const STORAGE_KEY = STORAGE_KEYS.cameraView;
const CAMERA_MEMORY_EVENT = 'eventide-camera-memory';

let cached: CameraMemory | null = null;

export const CAMERA_MEMORY_CHANGE_EVENT = CAMERA_MEMORY_EVENT;

/** The saved placement, or null when this browser/device has none yet. */
export function getCameraMemory(): CameraMemory | null {
  if (cached) return { ...cached };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<CameraMemory>;
    if (
      typeof p.zoomT === 'number' && Number.isFinite(p.zoomT) &&
      typeof p.theta === 'number' && Number.isFinite(p.theta) &&
      typeof p.phi === 'number' && Number.isFinite(p.phi) &&
      Array.isArray(p.pan) && p.pan.length === 3 && p.pan.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      cached = { zoomT: p.zoomT, theta: p.theta, phi: p.phi, pan: p.pan as [number, number, number], savedAt: typeof p.savedAt === 'number' ? p.savedAt : 0 };
      return { ...cached };
    }
  } catch { /* private mode or corrupt JSON — no memory stands */ }
  return null;
}

/** Persist a placement. The engine calls this only from its idle-quiescent
    checkpoint, never mid-traversal. */
export function setCameraMemory(m: Omit<CameraMemory, 'savedAt'>): void {
  cached = { ...m, savedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch { /* private mode — live session keeps its own memory */ }
  window.dispatchEvent(new CustomEvent(CAMERA_MEMORY_EVENT, { detail: { ...cached } }));
}

/** FORGET the saved placement (the reset-view path: the boot default becomes
    the view worth remembering again). */
export function clearCameraMemory(): void {
  cached = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(CAMERA_MEMORY_EVENT, { detail: null }));
}
