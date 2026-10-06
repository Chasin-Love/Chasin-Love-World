import type { RealityConfig } from '../../realities/types';
import type { UniverseSurfaceConfig } from '../../realities/types';

/**
 * Deterministic surface profiles for each reality in the multiverse.
 * Only the Sol Prime baseline is hand-tuned here; every other reality is
 * synthesized on the fly in getSurfaceConfigForReality from its own colors,
 * and realities forged on disk ship their own surface.ts module.
 * R102 — the independent-realities decree: the generic fallback below is
 * NOT Sol Prime. With no reality (or an unknown id) the dome renders from
 * this neutral profile; no reality is load-bearing for the surface.
 */
const SURFACE_PRESETS: Record<string, UniverseSurfaceConfig> = {
  'sol-prime': {
    realityId: 'sol-prime',
    name: 'Sol Prime Horizon',
    colorA: '#38bdf8',
    colorB: '#f59e0b',
    deepColor: '#000104',
    starColor: '#ffb54d',
    webFilaments: '#1e3a8a',
    nebulaIntensity: 1.0,
    dustLaneIntensity: 0.85,
    starDensity: 1.0,
  },
};

/* the reality-agnostic dome — the preset values without a reality's name */
const NEUTRAL_SURFACE: UniverseSurfaceConfig = {
  realityId: '',
  name: 'Universe Surface',
  colorA: '#38bdf8',
  colorB: '#f59e0b',
  deepColor: '#000104',
  starColor: '#ffb54d',
  webFilaments: '#1e3a8a',
  nebulaIntensity: 1.0,
  dustLaneIntensity: 0.85,
  starDensity: 1.0,
};

/**
 * Resolves the appropriate surface configuration for a given reality or fallback.
 */
export function getSurfaceConfigForReality(reality?: RealityConfig | string | null): UniverseSurfaceConfig {
  if (!reality) {
    return NEUTRAL_SURFACE;
  }
  const id = typeof reality === 'string' ? reality : reality.id;
  const preset = SURFACE_PRESETS[id];
  if (preset) {
    return preset;
  }

  // If dynamic reality object has custom colors, synthesize a surface config
  if (typeof reality === 'object' && reality.colorA && reality.colorB) {
    return {
      realityId: reality.id,
      name: `${reality.name} Surface`,
      colorA: reality.colorA,
      colorB: reality.colorB,
      deepColor: '#000104',
      starColor: reality.starColor || '#ffffff',
      webFilaments: reality.colorA,
      nebulaIntensity: 1.0,
      dustLaneIntensity: 0.85,
      starDensity: 1.0,
    };
  }

  return NEUTRAL_SURFACE;
}
