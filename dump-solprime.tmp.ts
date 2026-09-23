import { solPrimeReality } from './src/realities/solPrime';
import { generateClustersForReality } from './src/realities/clusterGenerator';
import { generateGalaxiesForReality } from './src/realities/galaxyGenerator';

const r = solPrimeReality;
const updatedBodies = r.bodies.map((b, bIdx) => {
  if (bIdx === 0) return { ...b, id: 'anchor', kind: 'star' as const, name: b.name.includes('ANCHOR STAR') ? b.name : `${b.name.replace('CORE', '').trim()} ANCHOR STAR`.trim() };
  if (b.kind === 'vault') return { ...b, kind: 'vault' as const, name: b.name.includes('BLACK HOLE') || b.name.includes('VAULT') ? b.name : `${b.name.replace('Vault', '').replace('Monolith', '').trim()} BLACK HOLE`.trim() };
  return b;
});
const bubbleSize = 24000;
const { clusters, homeLineage } = generateClustersForReality(r.id, r.name, r.colorA, r.colorB, updatedBodies, bubbleSize);
const galaxies = generateGalaxiesForReality({
  realityId: r.id, realityName: r.name, colorA: r.colorA, colorB: r.colorB,
  clusters, anchorStarName: updatedBodies[0].name, worldsCount: updatedBodies.length,
});
console.log(JSON.stringify({ clusters, galaxies, homeLineage }, null, 1));
