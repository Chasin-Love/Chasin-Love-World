import { RealityConfig } from './types';
import { solPrimeReality } from './solPrime';
import { hyperionLuminaReality } from './hyperionLumina';
import { ignisEmberReality } from './ignisEmber';
import { kardashevMatrixReality } from './kardashevMatrix';
import { vesperaTwilightReality } from './vesperaTwilight';
import { singularityRiftReality } from './singularityRift';
import { biolumePrimordialReality } from './biolumePrimordial';
import { chronosParadoxReality } from './chronosParadox';
import { parallelRealities } from './parallels';
import { generateClustersForReality } from './clusterGenerator';

export * from './types';
export * from './hierarchyTypes';
export * from './clusterGenerator';
export * from './solPrime';
export * from './hyperionLumina';
export * from './ignisEmber';
export * from './kardashevMatrix';
export * from './vesperaTwilight';
export * from './singularityRift';
export * from './biolumePrimordial';
export * from './chronosParadox';
export * from './parallels';

export const RAW_REALITIES: any[] = [
  solPrimeReality,
  hyperionLuminaReality,
  ignisEmberReality,
  kardashevMatrixReality,
  vesperaTwilightReality,
  singularityRiftReality,
  biolumePrimordialReality,
  chronosParadoxReality,
  ...parallelRealities,
];

// Cosmological 3D Golden Spiral structural layout algorithm for parallel bubble universes orbiting the central Core
export const REALITIES: RealityConfig[] = RAW_REALITIES.map((r, i) => {
  const total = RAW_REALITIES.length;
  // All 20 parallel universes orbit around the central Sovereign Core at (0,0,0)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399963
  const phi = i * goldenAngle;
  const yNorm = ((i + 0.5) / total) * 2 - 1; // vertical spread from -1 to +1
  const radFactor = Math.sqrt(Math.max(0.25, 1 - yNorm * yNorm * 0.7));
  
  // Outer orbital distance from the Core (0,0,0)
  const R = 280000 + (i % 5) * 35000;
  const x = Math.round(Math.cos(phi) * radFactor * R);
  const y = Math.round(yNorm * 220000);
  const z = Math.round(Math.sin(phi) * radFactor * R);
  const bubblePos: [number, number, number] = [x, y, z];

  // Ensure anchor star & black hole vault conform strictly to multiverse philosophy
  // Every reality must have exactly one Anchor Star (at index 0) and exactly one Black Hole Vault
  let hasVault = false;
  let updatedBodies = r.bodies.map((b: any, bIdx: number) => {
    if (bIdx === 0) {
      return {
        ...b,
        id: 'anchor',
        kind: 'star' as const,
        name: b.name.includes('ANCHOR STAR') ? b.name : `${b.name.replace('CORE', '').trim()} ANCHOR STAR`.trim(),
        note: b.note || 'The Anchor Star — central gravitational & physical regulator of this reality stellar system.',
      };
    }
    if (b.kind === 'vault') {
      hasVault = true;
      return {
        ...b,
        kind: 'vault' as const,
        name: b.name.includes('BLACK HOLE') || b.name.includes('VAULT') ? b.name : `${b.name.replace('Vault', '').replace('Monolith', '').trim()} BLACK HOLE`.trim(),
        note: 'Isolated Eventide Black Hole (Vault). Stores, protects, and executes quantum memory data buffers in total isolation.',
      };
    }
    return b;
  });

  // If a reality lacks a black hole vault, insert exactly one black hole vault orbiting the system
  if (!hasVault) {
    const day = 86400000;
    const now = Date.now();
    const TAU = Math.PI * 2;
    const vaultBody = {
      id: `${r.id}-vault-blackhole`,
      name: `${r.name.split(' ')[0]} Eventide Black Hole`,
      kind: 'vault' as const,
      meaning: null,
      note: 'Isolated Eventide Black Hole (Vault). Stores, protects, and executes quantum memory data buffers in total isolation.',
      createdAt: now - 850 * day,
      radius: 2.8,
      palette: { deep: '#000000', base: '#0f172a', high: '#38bdf8', atmo: '#6fc2b4', ice: '#ffffff' },
      orbit: { a: 220 + (i % 4) * 20, speed: TAU / (10000 + i * 500), phase: (i * 1.3) % TAU, incl: -0.15 + (i % 3) * 0.1 },
    };
    updatedBodies.push(vaultBody);
  } else {
    // If multiple vaults were present, ensure only one vault body exists per reality
    let vaultFound = false;
    updatedBodies = updatedBodies.filter((b: any) => {
      if (b.kind === 'vault') {
        if (vaultFound) return false;
        vaultFound = true;
      }
      return true;
    });
  }

  const bubbleSize = 24000;
  const { clusters, homeLineage } = generateClustersForReality(
    r.id,
    r.name,
    r.colorA,
    r.colorB,
    updatedBodies,
    bubbleSize
  );

  return {
    ...r,
    bubblePos,
    bubbleSize,
    bodies: updatedBodies,
    clusters,
    homeLineage,
  };
});


export function getReality(id: string, customDescriptions?: Record<string, string>): RealityConfig {
  const found = REALITIES.find((r) => r.id === id) || REALITIES[0];
  if (customDescriptions && customDescriptions[found.id]) {
    return {
      ...found,
      description: customDescriptions[found.id],
    };
  }
  return found;
}
