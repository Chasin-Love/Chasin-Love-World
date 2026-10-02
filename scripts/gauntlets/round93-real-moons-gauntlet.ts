/**
 * ROUND 93 — THE MOONS gauntlet (reconciled to the R95 law).
 *
 * R93 made every diary moon a real N-body body. R95 consciously amends
 * that (docs/ROUND-95-THE-STEADY-SKY-2026-10-01.md, the author's ruling):
 * the canon moon table (14–30-day laps skimming the planet at 2–4 planet
 * radii) is physically impossible — at real gravity the moons escape
 * ~200× over (the detonation the author witnessed), and at physics-true
 * speeds they would blur around the planet in hours. MOONS RIDE PARENTS:
 *
 *  - Moons left the integrated roster (no moon entries, no moon masses, no
 *    moon readback seam). Every world's session roster is star + bodies.
 *  - The PERMANENT moon law is the ornament closed-form: each moon rides
 *    its planet's SESSION-driven position with its own inclined plane and
 *    vertical bob (the body groups never rotate, so the local write is
 *    exact whatever drives the parent — session or clockwork).
 *  - syncMoons' deterministic ids REMAIN (mesh churn identity — surviving
 *    moons carry their meshes across diary changes).
 *  - A moon being born must NOT reconfigure the session (the roster
 *    signature counts bodies only).
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const engineSrc = read('../../src/engine/engine.ts');
const driverSrc = read('../../src/physics/sessionDriver.ts');
const pkgSrc = read('../../package.json');

/* ==== 1. DETERMINISTIC MOON IDS (mesh churn identity — unchanged) ==== */
{
  const engineIds = /id: `\$\{b\.data\.id\}:moon:\$\{i\}`,/.test(engineSrc)
    && /radius: mr,/.test(engineSrc);
  check('R93: syncMoons stamps every moon with its deterministic id and radius', engineIds, 'moons have no churn identity');

  const innerIds = /id: `\$\{data\.id\}:moon:\$\{mi\}`,/.test(engineSrc)
    && /id: `\$\{p\.data\.id\}:moon:\$\{i\}`,/.test(engineSrc);
  check('R93: inner-system moons keep the same deterministic ids', innerIds, 'inner ids drifted');
}

/* ==== 2. THE R95 AMENDMENT — moons ride parents ==== */
{
  const noMoonRoster = !/kind: 'moon',/.test(driverSrc)
    && !/parentId/.test(driverSrc)
    && !/moonMassKg/.test(driverSrc)
    && !/driverMoonReadback/.test(driverSrc);
  check('R95: the integrated moon roster retired (no moon entries, masses, or readback seam)', noMoonRoster, 'moons are still integrated');

  const signatureBodiesOnly = /const ids = bodies\.map\(\(b\) => b\.data\.id\);/.test(driverSrc)
    && !/b\.moons/.test(driverSrc.split('rosterSignature')[1]?.split('}')[0] ?? '');
  check('R95: the roster signature counts bodies only (a moon being born never reconfigures the session)', signatureBodiesOnly, 'moon churn still reconfigures');

  const homeClosedForm = /R95 — MOONS RIDE PARENTS \(the R93 amendment\)/.test(engineSrc)
    && /const ma = m\.phase \+ this\.simDays \* m\.speed;/.test(engineSrc);
  check('R95: the home moon law is the closed-form ornament around the session-driven planet', homeClosedForm, 'the ornament law died');

  const innerClosedForm = /R95 — MOONS RIDE PARENTS \(the R93 amendment, galaxy frame\)/.test(engineSrc)
    && /tiltInPlaneVector\(Math\.cos\(ma\) \* m\.a, Math\.sin\(ma\) \* m\.a, m\.incl \?\? 0, m\.node \?\? 0\)/.test(engineSrc);
  check('R95: the inner-system moon law is the same closed-form (galaxy frame)', innerClosedForm, 'the inner law died');
}

/* ==== 3. THE STAR LEADS — the session's central mass (R95) ==== */
{
  const starLeads = /function setScopeStar\(scopeId: string, data: CosmicBody\): void \{/.test(driverSrc)
    && /if \(bodies\.length > 0 && bodies\[0\]\.data\.kind === 'star'\) return null;/.test(driverSrc)
    && /function synthesizedStar\(scopeId: string\): CosmicBody \{/.test(driverSrc);
  check('R95: every roster leads with a central star (registered, already-leading, or synthesized)', starLeads, 'the session could seed without a central mass');
}

/* ==== 4. THE PURITY (the narrowed hybrid law, re-pinned) ==== */
{
  const purity = !/\.position\.set\(/.test(driverSrc)
    && !/b\.group/.test(driverSrc)
    && !/from '\.\.\/state/.test(driverSrc);
  check('R93: the driver module still never writes rendered state or imports the store', purity, 'purity broken');
}

/* ==== 5. THE CHAIN ==== */
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
