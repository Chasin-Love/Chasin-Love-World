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
 * (Round 20.4 / 53): module store + localStorage, no engine plumbing. (R85:
 * the siblings' window announcement never had a twin here — nothing ever
 * listened to 'eventide-camera-memory', so the vestigial dispatch is gone;
 * persistence alone is the contract.) The engine alone decides WHEN a
 * placement is worth remembering — a mid-Kamui dive or a portal flight must
 * never be saved — and calls capture()/restore() at the same two moments the
 * portal system already uses: beginPortal saves, the boot finalize restores.
 *
 * The black hole itself is not touched. This is where the camera sits, not
 * what the hole renders.
 */

export interface CameraMemory {
  /* ROUND 62 — the FULL rig placement: current AND target channels. Saving
     only the targets forced the rig to ease in from its constructor default
     (a huge distance), and the engine's auto-release (dist > 1200 lets go
     of a focus) fired during that ease — the restored focus was dropped
     before the camera ever arrived. A full snapshot starts the camera AT the
     saved view, so nothing can un-bind it mid-flight. */
  zoomT: number;
  tZoomT: number;
  theta: number;
  tTheta: number;
  phi: number;
  tPhi: number;
  /** world-space pan offset */
  pan: [number, number, number];
  /** WHAT the view was orbiting: the focused body's id, or null for the
      origin. The orbit angles alone are meaningless without this — a hole
      composition restored around the ORIGIN leaves the hole out of frame
      entirely (the "the hole is nowhere" report). */
  focusId?: string | null;
  /** wall-clock ms, for diagnostics only */
  savedAt: number;
}

const STORAGE_KEY = STORAGE_KEYS.cameraView;

let cached: CameraMemory | null = null;

/** The saved placement, or null when this browser/device has none yet. */
export function getCameraMemory(): CameraMemory | null {
  if (cached) return { ...cached };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<CameraMemory>;
    const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    if (
      num(p.zoomT) && num(p.tZoomT) &&
      num(p.theta) && num(p.tTheta) &&
      num(p.phi) && num(p.tPhi) &&
      Array.isArray(p.pan) && p.pan.length === 3 && p.pan.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      /* ROUND 62 — legacy records (targets only, or no focus at all) cannot
         be restored safely — the target-only ones ease in from a huge
         distance and lose their focus to the auto-release, the focus-less
         ones describe a subject that was never recorded. They are purged
         once; the next idle checkpoint writes a complete record. A
         deliberate origin view of the NEW format saves focusId: null and
         restores as one. */
      if (p.focusId === undefined) { clearCameraMemory(); return null; }
      cached = {
        zoomT: p.zoomT, tZoomT: p.tZoomT,
        theta: p.theta, tTheta: p.tTheta,
        phi: p.phi, tPhi: p.tPhi,
        pan: p.pan as [number, number, number],
        focusId: typeof p.focusId === 'string' ? p.focusId : null,
        savedAt: typeof p.savedAt === 'number' ? p.savedAt : 0,
      };
      return { ...cached };
    }
    /* any unreadable shape (legacy, corrupt, hand-edited) is purged — a
       stale record must never survive to mis-point a future boot */
    clearCameraMemory();
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
}

/** FORGET the saved placement (the reset-view path: the boot default becomes
    the view worth remembering again). */
export function clearCameraMemory(): void {
  cached = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* private mode */ }
}
