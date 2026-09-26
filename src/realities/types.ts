import { CosmicBody, DiaryEntry } from '../domain/universe';
import { CosmicLineage, GalaxyClusterData, GalaxyData } from './hierarchyTypes';

export * from './hierarchyTypes';

/* The visual content contract for a reality's cosmic background — pure data,
   declared by the reality (R52: moved here from engine/surface/types so the
   content layer never imports the renderer; this killed the engine⇄realities
cycle). */
export interface UniverseSurfaceConfig {
  realityId: string;
  name: string;
  colorA: string;
  colorB: string;
  deepColor: string;
  starColor: string;
  webFilaments: string;
  nebulaIntensity: number;
  dustLaneIntensity: number;
  starDensity: number;
}

/* user-authored appearance/identity overrides — persisted per reality id */
export interface RealityMetaOverride {
  name?: string;
  codeName?: string;
  spectral?: string;
  colorA?: string;
  colorB?: string;
  starColor?: string; /* the anchor star's aura — core surface + corona light */
}

export interface RealityConfig {
  id: string;
  name: string;
  codeName: string;
  spectral: string;
  description: string;
  bubblePos: [number, number, number];
  bubbleSize: number;
  colorA: string;
  colorB: string;
  starColor: string;
  bodies: CosmicBody[];
  entries: DiaryEntry[];
  clusters?: GalaxyClusterData[];
  /* major galaxies — the multiverse view draws ONE ellipse orbit around the
     reality bubble per entry, so this list IS the reality's visible ring */
  galaxies?: GalaxyData[];
  /* the galaxy count requested at the forge — persisted so the roster can be
     regenerated deterministically (recolor etc.) without ever re-rolling */
  galaxyCountHint?: number;
  homeLineage?: CosmicLineage;
}
