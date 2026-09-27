import { STORAGE_KEYS } from '../platform/storageKeys';
/**
 * GPU capability probe + render quality tiers.
 *
 * Tiers:
 *   low       — low-power devices: pixelRatio 1, reduced particles (existing behavior)
 *   medium    — current defaults
 *   cinematic — desktop headroom: pixelRatio up to 2, richer particles
 *               (the raymarched black hole rides medium+ since Round 20)
 *
 * The probe reads the GPU renderer string via WEBGL_debug_renderer_info and
 * never throws — any failure simply degrades the tier.
 */

export type QualityTier = 'low' | 'medium' | 'cinematic';

export interface GpuCapability {
  tier: QualityTier;
  renderer: string;
  webgl2: boolean;
  maxTextureSize: number;
  maxPixelRatio: number;
}

const STORAGE_KEY = STORAGE_KEYS.quality;
const MIGRATION_KEY = STORAGE_KEYS.qualityMigrated;
export const QUALITY_CHANGE_EVENT = 'eventide-quality-change';

let cached: GpuCapability | null = null;

/** Rough allow/deny lists for the raymarched tier. Software rasterizers never qualify. */
const SW_RASTERIZERS = ['swiftshader', 'llvmpipe', 'mesa offscreen', 'basic render', 'software'];

export function probeCapability(): GpuCapability {
  if (cached) return cached;
  let tier: QualityTier = 'medium';
  let renderer = 'unknown';
  let webgl2 = false;
  let maxTextureSize = 2048;
  let maxPixelRatio = 1.35;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { powerPreference: 'high-performance' })
      ?? canvas.getContext('webgl', { powerPreference: 'high-performance' });
    if (gl) {
      webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? 'unknown');
      }
      const low = renderer.toLowerCase();
      const isSoftware = SW_RASTERIZERS.some((s) => low.includes(s));

      if (isSoftware) {
        tier = 'low';
      } else {
        /* Medium is the DEFAULT — it matches the long-standing render cost
           (pixelRatio 1.35, composite black hole only). Cinematic is strictly
           OPT-IN via the engine card: auto-enabling it proved too heavy on
           integrated GPUs and made the whole app lag after the intro. */
        tier = 'medium';
      }
    } else {
      tier = 'low';
    }
  } catch {
    tier = 'low';
  }

  /* one-time migration: early builds auto-set 'cinematic' behind the user's
     back and it was persisted — that saved override re-applied on every boot
     and lagged the whole app. Reset it so medium is the real default; the
     user can still opt into cinematic from the engine card. */
  try {
    if (!localStorage.getItem(MIGRATION_KEY)) {
      if (localStorage.getItem(STORAGE_KEY) === 'cinematic') {
        localStorage.removeItem(STORAGE_KEY);
      }
      localStorage.setItem(MIGRATION_KEY, '1');
    }
  } catch { /* private mode */ }

  /* user override always wins */
  const stored = localStorage.getItem(STORAGE_KEY) as QualityTier | null;
  if (stored === 'low' || stored === 'medium' || stored === 'cinematic') {
    tier = stored;
  }

  if (tier === 'cinematic') maxPixelRatio = 2.0;
  else if (tier === 'low') maxPixelRatio = 1.0;

  cached = { tier, renderer, webgl2, maxTextureSize, maxPixelRatio };
  return cached;
}

export function getQualityTier(): QualityTier {
  return probeCapability().tier;
}

export function setQualityTier(tier: QualityTier): void {
  localStorage.setItem(STORAGE_KEY, tier);
  cached = null;
  window.dispatchEvent(new CustomEvent(QUALITY_CHANGE_EVENT, { detail: tier }));
}

/** True when the probe's GL renderer string is a software rasterizer. */
export function isSoftwareRasterizer(): boolean {
  const cap = probeCapability();
  return SW_RASTERIZERS.some((s) => cap.renderer.toLowerCase().includes(s));
}

/** True when the raymarched black hole may be created at all.
 *  Round 20 — the geodesic hole is ON BY DEFAULT at medium tier and up,
 *  independent of the Cinematic toggle: it is a bounded overlay on a small
 *  camera-facing quad, not a fullscreen cost (what lagged integrated GPUs
 *  years ago was the whole Cinematic tier — pixelRatio 2 + richer particles).
 *  Safety now comes from the runtime nets, not the tier: the shader-error
 *  hook disarms the tier on any compile failure, and the engine's frame-budget
 *  circuit breaker stands it down if the average frame drifts past ~34 ms. */
export function canUseRaymarchBlackHole(): boolean {
  const cap = probeCapability();
  if (cap.tier === 'low') return false;
  if (!cap.webgl2 && cap.maxTextureSize < 4096) return false;
  return !isSoftwareRasterizer();
}

/** Converts a Three renderer's pixel ratio policy to the tier's policy. */
export function pixelRatioFor(tier: QualityTier, deviceRatio: number): number {
  const cap = probeCapability();
  const ceiling = tier === 'cinematic' ? Math.min(cap.maxPixelRatio, 2) : tier === 'low' ? 1 : 1.35;
  return Math.min(deviceRatio, ceiling);
}
