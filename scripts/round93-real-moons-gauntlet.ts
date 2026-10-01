/**
 * ROUND 93 — THE MOONS BECOME REAL gauntlet.
 *
 * The R91 decree's Phase 3: every diary moon of the home system becomes a
 * real N-body body — rock at the profile-fallback density, seeded from its
 * parent's canon plus its own inclined orbit (the ornament formula, bob
 * included, so the flip is seamless at t=0), carried across churn by its
 * DETERMINISTIC id, and driven through the moon seam (world → local by
 * subtraction). The invariants:
 *
 *  - DETERMINISTIC MOON IDS: `${planetId}:moon:${index}` — churn keys that
 *    survive diary changes (the story never resets for a moon being born).
 *  - THE MOON MASS LAW: radius → kg at 3500 kg/m³ (the BODY_PROFILES
 *    fallback density — the same law unknown-body ids obey).
 *  - THE MOON CANON: parent canon state + the engine's own tilted-orbit
 *    formula INCLUDING the vertical bob — seed = what the sky shows.
 *  - THE MOON SEAM: session world − parent group position, consumed once;
 *    a stale readback falls back to the ornament closed-form.
 *  - THE TOLERANCE: moons without id/radius (inner systems, pre-R93 meshes)
 *    are skipped — ornament-only — exactly the designed contract.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const engineSrc = read('../src/engine/engine.ts');
const driverSrc = read('../src/physics/sessionDriver.ts');
const pkgSrc = read('../package.json');

/* ==== 1. DETERMINISTIC MOON IDS ==== */
{
  const engineIds = /id: `\$\{b\.data\.id\}:moon:\$\{i\}`,/.test(engineSrc)
    && /radius: mr,/.test(engineSrc);
  check('R93: syncMoons stamps every moon with its deterministic id and radius', engineIds, 'moons have no churn identity');

  const driverIds = /function moonId\(planetId: string, index: number\): string \{\s*return `\$\{planetId\}:moon:\$\{index\}`;/.test(driverSrc);
  check('R93: the driver builds the same deterministic moon ids (the churn key)', driverIds, 'id templates disagree');

  const staleGuard = /if \(m\.id !== moonId\(b\.data\.id, i\)\) return;/.test(driverSrc);
  check('R93: stale meshes are skipped until the next sync (the churn guard)', staleGuard, 'a stale mesh could seed wrong states');
}

/* ==== 2. THE MOON MASS LAW ==== */
{
  const law = /const MOON_DENSITY_KG_M3 = 3500;/.test(driverSrc)
    && /function moonMassKg\(radiusScene: number\): number \{/.test(driverSrc)
    && /\(radiusScene \/ 2\.05\) \* 6\.371e6/.test(driverSrc);
  check('R93: moons are rock at 3500 kg/m³ via the shared radius law', law, 'the mass law deviates');

  const realBodies = /massKg: phys\.massKg,/.test(driverSrc);
  check('R93: canon bodies keep their physicsEngine masses', realBodies, 'body masses changed');
}

/* ==== 3. THE MOON CANON — parent state + the ornament formula ==== */
{
  const kinds = /kind: 'body' \| 'moon';/.test(driverSrc)
    && /kind: 'moon',/.test(driverSrc)
    && /parentId: b\.data\.id,/.test(driverSrc);
  check('R93: the roster carries moon entries with their parent id', kinds, 'roster kinds missing');

  const composition = /const pIdx = parentIndex\.get\(r\.parentId \?\? ''\);/.test(driverSrc)
    && /tiltInPlaneVector\(Math\.cos\(ma\) \* r\.a, Math\.sin\(ma\) \* r\.a, r\.incl, r\.node\)/.test(driverSrc)
    && /Math\.sin\(ma \* 0\.7\) \* r\.a \* 0\.12 \* Math\.cos\(r\.incl\)/.test(driverSrc);
  check('R93: the moon canon composes the parent position + the tilted orbit + the bob (seed = the sky)', composition, 'seed would jump at the flip');

  const vel = /const b = canonPos\(index, atDays - d\);/.test(driverSrc);
  check('R93: moon velocities finite-difference the composed canon (parent + local)', vel, 'velocities miss the parent motion');
}

/* ==== 4. THE MOON SEAM ==== */
{
  const read = /export function driverMoonReadback\(simDays: number\): Map<string, \[number, number, number\]> \| null \{/.test(driverSrc)
    && /Math\.abs\(dtDays\) > TRUST_WINDOW_DAYS\) return null;/.test(driverSrc);
  check('R93: the moon seam read exists and obeys the same trust window', read, 'no freshness law for moons');

  /* R94 reconciliation: the inner-system moon seam is the second consumer —
     the import + the home seam + the inner seam. */
  const once = (engineSrc.match(/driverMoonReadback/g) || []).length === 3;
  check('R93: the engine consumes the moon readback only through seams (home + inner)', once, 'an unaccounted consumer');

  const local = /wp\[0\] - b\.group\.position\.x,/.test(engineSrc)
    && /wp\[1\] - b\.group\.position\.y,/.test(engineSrc)
    && /wp\[2\] - b\.group\.position\.z,/.test(engineSrc);
  check('R93: moon local = session world − parent group position (exact, unrotated groups)', local, 'the subtraction is wrong');

  const fallback = /const ma = m\.phase \+ this\.simDays \* m\.speed;/.test(engineSrc);
  check('R93: a stale readback falls back to the ornament closed-form', fallback, 'the ornament fallback died');
}

/* ==== 5. THE TOLERANCE ==== */
{
  const skip = /if \(!m\.id \|\| !m\.radius\) return; \/\* ornament-only moon — not a body yet \*\//.test(driverSrc);
  check('R93: moons without id/radius stay ornament-only (inner systems, old meshes)', skip, 'the contract is intolerant');

  const purity = !/\.position\.set\(/.test(driverSrc)
    && !/b\.group/.test(driverSrc)
    && !/from '\.\.\/state/.test(driverSrc);
  check('R93: the driver module still never writes rendered state or imports the store', purity, 'purity broken');
}

/* ==== 6. THE CHAIN ==== */
{
  const chained = pkgSrc.includes('round93-real-moons-gauntlet');
  check('R93: the gauntlet sits in the verify chain', chained, 'add scripts/round93-real-moons-gauntlet.ts to npm run verify');
}

if (failures > 0) {
  console.error(`\nR93 REAL MOONS GAUNTLET — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
  process.exit(1);
} else {
  console.log('\nR93 REAL MOONS GAUNTLET — ALL GREEN');
}
