import type * as THREE from 'three';

/**
 * Runtime frame update parameters passed to the Universe Surface engine.
 * Engine-only (three.js types) — the CONTENT contract, UniverseSurfaceConfig,
 * lives in realities/types.ts (R52 cycle cut).
 */
export interface UniverseSurfaceUpdateParams {
  dt: number;
  clockT: number;
  camera: THREE.Camera;
  kamuiErase: number;
  vortexDir: THREE.Vector3;
  skyVisible: boolean;
  neighborhoodVisibility: number;
}
