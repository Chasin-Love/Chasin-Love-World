/**
 * Reality module templates — the single source for generated reality source
 * code. Both writers use these:
 *   - server/index.ts      POST /api/realities/create-folder (full reality)
 *   - server/realityDaemon.ts  3s auto-repair of folders missing files
 *
 * Output contract (consumed by src/realities/index.ts at build time):
 *   <folder>/index.ts    exports a RealityConfig named `<folder>Reality`
 *                        and re-exports the surface preset
 *   <folder>/surface.ts  exports a UniverseSurfaceConfig named
 *                        `<folder>Surface` keyed by the reality id
 */

/* Generated modules interpolate the folder name into exported identifiers
   (`export const <folder>Reality`). A folder like "my-reality" would emit an
   invalid identifier and, because all realities are compiled together via an
   eager glob, one bad file white-screens the whole app — so fold everything
   non-identifier-safe down to "_" here. */
function ident(s: string): string {
  const cleaned = (s ?? '').replace(/[^a-zA-Z0-9_$]/g, '_');
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned || 'reality';
}

function realityVarNameOf(folderName: string): string {
  return `${ident(folderName)}Reality`;
}

function surfaceVarNameOf(folderName: string): string {
  return `${ident(folderName)}Surface`;
}

const esc = (s: string): string => JSON.stringify(s ?? '');

export interface SurfaceTemplateInput {
  id: string;
  name: string;
  colorA: string;
  colorB: string;
  starColor: string;
  folderName: string;
}

export function renderSurfaceModule(input: SurfaceTemplateInput): string {
  return `import { UniverseSurfaceConfig } from '../types';

export const ${surfaceVarNameOf(input.folderName)}: UniverseSurfaceConfig = {
  realityId: ${esc(input.id)},
  name: ${esc(input.name)},
  colorA: ${esc(input.colorA)},
  colorB: ${esc(input.colorB)},
  deepColor: '#030108',
  starColor: ${esc(input.starColor)},
  webFilaments: '${input.colorA}',
  nebulaIntensity: 1.0,
  dustLaneIntensity: 0.8,
  starDensity: 0.85,
};
`;
}

export interface RealityTemplateInput {
  id: string;
  name: string;
  codeName: string;
  spectral: string;
  description: string;
  colorA: string;
  colorB: string;
  starColor: string;
  folderName: string;
  /** Pre-rendered TS array literal for the `bodies:` field. */
  bodiesSource: string;
  /** JSON string (already serialized) for the `entries:` field. */
  entriesSource: string;
  /** Requested galaxy count — persisted into the module so the roster is
      regenerated deterministically instead of re-rolled. */
  galaxyCountHint?: number;
}

export function renderRealityModule(input: RealityTemplateInput): string {
  return `import { RealityConfig } from '../types';
import { ${surfaceVarNameOf(input.folderName)} } from './surface';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const ${realityVarNameOf(input.folderName)}: RealityConfig = {
  id: ${esc(input.id)},
  name: ${esc(input.name)},
  codeName: ${esc(input.codeName)},
  spectral: ${esc(input.spectral)},
  description: ${esc(input.description)},
  bubblePos: [0, 0, 0],
  bubbleSize: 7500,
  colorA: ${esc(input.colorA)},
  colorB: ${esc(input.colorB)},
  starColor: ${esc(input.starColor)},
  bodies: ${input.bodiesSource},
  entries: ${input.entriesSource},${input.galaxyCountHint != null ? `\n  galaxyCountHint: ${Math.max(1, Math.min(12, Math.round(input.galaxyCountHint)))},` : ''}
};

export * from './surface';
`;
}

/** Full default body set: an anchor star plus a primordial terrestrial world. */
export function defaultBodiesSource(id: string, name: string, colorA: string, colorB: string): string {
  const bodies = [
    {
      id: `${id}-core`,
      name: `${name} Core Star`,
      kind: 'star',
      meaning: null,
      note: `The stellar anchor of ${name}.`,
      createdAt: Date.now(),
      radius: 6.5,
      palette: { deep: '#1c0e35', base: colorA, high: '#ffffff', atmo: colorB, ice: '#ffffff' },
      orbit: { a: 0, speed: 0, phase: 0, incl: 0 },
    },
    {
      id: `${id}-prime`,
      name: `${name} Prime`,
      kind: 'planet',
      meaning: 'moment',
      note: `The primordial terrestrial world of ${name}.`,
      createdAt: Date.now(),
      radius: 2.2,
      clouds: true,
      nightside: true,
      palette: { deep: '#0c1b33', base: '#10b981', high: '#6ee7b7', atmo: colorA, ice: '#e0f2fe' },
      orbit: { a: 45, speed: Math.PI * 2 / 365, phase: 1.2, incl: 0.04 },
    },
  ];
  return JSON.stringify(bodies, null, 2);
}

/** Minimal repair body set: a single anchor star, used by the daemon auto-repair. */
export function anchorOnlyBodiesSource(id: string, title: string): string {
  const bodies = [
    {
      id: 'anchor',
      name: `${title} Anchor Star`,
      kind: 'star',
      createdAt: Date.now(),
      radius: 7.5,
      palette: { deep: '#0f172a', base: '#00f5d4', high: '#ffffff', atmo: '#8b5cf6', ice: '#c084fc' },
      orbit: { a: 0, speed: 0, phase: 0, incl: 0 },
    },
  ];
  return JSON.stringify(bodies, null, 2);
}
