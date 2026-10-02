/**
 * ROUND 95 — THE STEADY SKY gauntlet.
 *
 * The R94 flip landed on a session that was not a valid physical system,
 * and the author watched the sky detonate: no star in the home roster
 * (every world unbound), a cinematic orbit table seeded at sub-circular
 * speeds (outer worlds plunging), a 10 M☉ vault on a kamikaze seed diving
 * through the inner system, moons at ~200× escape velocity, and the
 * freshness law flickering between the demolition and the clockwork.
 * The author ruled (docs/ROUND-95-THE-STEADY-SKY-2026-10-01.md):
 *
 *  - THE STAR LEADS EVERY ROSTER: index 0 is always the central sun
 *    (registered anchor, already-leading galaxy star, or synthesized).
 *  - THE ORBIT-TRUE SEED: canon positions, directions and planes kept;
 *    session speeds re-derived as circular-orbit speeds of the gravity
 *    actually present; the barycenter frame at rest.
 *  - THE VAULT TEMPER: in-session vault mass = the mass its own canon
 *    orbit implies (v²·r/G) — the 10 M☉ display law untouched elsewhere.
 *  - MOONS RIDE PARENTS: the closed-form ornament is the permanent moon
 *    law (the R93 amendment; the R93 gauntlet re-pins it).
 *  - THE STEADY SEAM: crossfaded session⇄clockwork (no per-frame snap),
 *    accumulate-before-pending (no dropped sim-days), a wider trust
 *    window, a hysteresis dive gate, a yielding catch-up burst that
 *    trusts the stepped receipt, and the boot-resume adoption (the
 *    universe actually remembers across reopen).
 *  - THE LIVING RINGS: hover ellipses rebuilt from session osculating
 *    elements at 1 Hz; canon ellipses restored on the clockwork.
 *  - REALM HIDING: the home realm (its vault quad included) eases out
 *    while a galaxy's inner system is the dive.
 *  - THE LOCKSTEP SOFTENING: 1e12 m² (ε = 1000 km) in the C++ core and
 *    the TS twin alike.
 */
import { engineSource } from './engineSource';
import{ readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const engineSrc = engineSource();
const driverSrc = read('../../src/physics/sessionDriver.ts');
const cppSrc = read('../../src/platform/native/cosmos_engine.cpp');
const bridgeSrc = read('../../src/platform/native/cpp_bridge.ts');
const actionsSrc = read('../../src/state/actions.ts');
const keysSrc = read('../../src/platform/storageKeys.ts');
const pkgSrc = read('../../package.json');

/* ==== 1. THE STAR LEADS EVERY ROSTER ==== */
{
  const registered = /export function setScopeStar\(scopeId: string, data: CosmicBody\): void \{/.test(driverSrc)
    && /const anchor = reality\.bodies\.find\(\(b\) => b\.id === 'anchor'\) \?\? reality\.bodies\.find\(\(b\) => b\.kind === 'star'\);/.test(engineSrc)
    && /if \(anchor\) setScopeStar\(reality\.id, anchor\);/.test(engineSrc);
  check('R95: the engine registers each reality\'s anchor as the home scope\'s leading star', registered, 'the session has no central sun');

  const alwaysStar = /function starForScope\(scopeId: string, bodies: DriverBody\[\]\): CosmicBody \| null \{/.test(driverSrc)
    && /function synthesizedStar\(scopeId: string\): CosmicBody \{/.test(driverSrc)
    && /const star = starForScope\(driverState\.scopeId, bodies\);/.test(driverSrc)
    && /if \(star\) \{/.test(driverSrc);
  check('R95: the roster always leads with a star (registered, already-leading, or synthesized)', alwaysStar, 'a starless scope seeds unbound worlds');

  const countMirrors = /return bodies\.length \+ \(starForScope\(driverState\.scopeId, bodies\) \? 1 : 0\);/.test(driverSrc);
  check('R95: the memory-match count mirrors the star-led roster', countMirrors, 'restore/resume would misjudge the roster');
}

/* ==== 2. THE ORBIT-TRUE SEED ==== */
{
  const circular = /function seedVelocity\(index: number, atDays: number\): \[number, number, number\] \{/.test(driverSrc)
    && /const vCircMs = Math\.sqrt\(\(CONSTANTS\.G \* central\.massKg\) \/ rMeters\);/.test(driverSrc)
    && /const dir = canonVel\(index, atDays\);/.test(driverSrc);
  check('R95: session speeds are circular-orbit speeds of the real gravity, in the canon direction', circular, 'the cinematic speeds would plunge again');

  const barycenter = /function barycenterFrame\(vels: Array<\[number, number, number\]>\): void \{/.test(driverSrc)
    && /const vels = roster\.map\(\(_, i\) => seedVelocity\(i, atDays\)\);/.test(driverSrc)
    && /barycenterFrame\(vels\);/.test(driverSrc);
  check('R95: the seed rests in the barycenter frame (the star wobbles, never drifts off screen)', barycenter, 'the system would sail away');

  const positionsCanon = /if \(r\.a === 0\) return \[0, 0, 0\];/.test(driverSrc)
    && /const p = calculateKeplerPosition\(r\.a, r\.ecc, r\.phase, r\.incl, atDays, r\.speed, r\.node, r\.argP\);/.test(driverSrc);
  check('R95: canon positions and the exact Kepler solve are untouched (the flip stays seamless at t=0)', positionsCanon, 'positions moved at the flip');
}

/* ==== 3. THE VAULT TEMPER ==== */
{
  const temper = /if \(b\.data\.kind === 'vault' \|\| b\.data\.kind === 'hole'\) \{/.test(driverSrc)
    && /const implied = \(vMs \* vMs \* rMeters\) \/ CONSTANTS\.G;/.test(driverSrc);
  check('R95: the vault\'s in-session mass is the one its own canon orbit implies (v²·r/G, never above phys)', temper, 'the 10 M☉ kamikaze seed survives');

  const hill = /massKg = Math\.min\(implied, starMassKg \/ 1000, phys\.massKg\);/.test(driverSrc)
    && /const starMassKg = star/.test(driverSrc);
  check('R95: the vault is also Hill-tempered (≤1/1000 of the star — 0.1 M☉ scattered the sky in ~600 days)', hill, 'a tenth-solar companion still demolishes the inner system');

  const displayUntouched = /if \(body\.kind === 'hole' \|\| body\.kind === 'vault'\) massKg = 10 \* CONSTANTS\.M_sun;/.test(read('../../src/physics/physicsEngine.ts'));
  check('R95: the 10 M☉ display/UI law in physicsEngine is untouched', displayUntouched, 'the display law was disturbed');
}

/* ==== 3b. THE SUBSTEP LAW — the round's deepest bug ==== */
{
  const substep = /\.simStep\(dt \/ DRIVER_SUBSTEPS, DRIVER_SUBSTEPS\)/.test(driverSrc);
  check('R95: the tick divides dt by the substep count (simStep advances dt×iterations — 24× ahead ran the sky off its orbits)', substep, 'the session runs 24× ahead of the sim clock');

  const catchup = /cosmosBridge\.simStep\(\(chunk \* SECONDS_PER_DAY\) \/ 1000, 1000\)/.test(driverSrc);
  check('R95: the catch-up burst divides too (its sub-steps are honest)', catchup, 'the catch-up burst would jump the sky');

  /* the receipt that would have caught it: a headless probe that drives the
     REAL driverTick and holds the sky for thousands of sim-days, in seconds. */
  const probe = read('../../scripts/probes/round95-physics-probe.ts');
  const probeReal = /driverTick\(bodies, DT_DAYS, simDays\)/.test(probe)
    && /enableDriver\(bodies, 0, 'sol-prime'\)/.test(probe);
  check('R95: the physics probe drives the REAL driverTick (no regex standing in for physics)', probeReal, 'the probe does not exercise the physics');
}

/* ==== 4. THE STEADY SEAM — no more flicker ==== */
{
  const accumulateFirst = /if \(!driverState\.enabled\) return;[\s\S]{0,700}driverState\.accumulatedDays \+= dtDays;[\s\S]{0,120}if \(driverState\.pending\) return;/.test(driverSrc);
  check('R95: the tick accumulates BEFORE the pending guard (no sim-days silently dropped)', accumulateFirst, 'the session clock would lag the sky forever');

  const trust = /const TRUST_WINDOW_DAYS = 8;/.test(driverSrc);
  check('R95: the trust window is 8 sim-days (the ~83 ms staleness margin is gone)', trust, 'the window still flickers');

  const crossfade = /this\.drvBlend = drvPos\s*\? Math\.min\(1, this\.drvBlend \+ dt \/ 0\.4\)\s*: Math\.max\(0, this\.drvBlend - dt \/ 0\.15\);/.test(engineSrc)
    && /const drvArr = drvPos \?\? this\.drvLastPos;/.test(engineSrc);
  check('R95: the session⇄clockwork source switch crossfades (no per-frame snap)', crossfade, 'the sky still snaps between universes');

  const diveGate = /const dive = !!n\.innerSys && nodeDist < \(this\.galaxyDiveId === n\.data\.id \? 2000 : 1600\);/.test(engineSrc)
    && /if \(dive\) \{\s*this\.galaxyDiveId = n\.data\.id;/.test(engineSrc);
  check('R95: the dive gate has hysteresis (enter 1600 / leave 2000 — no boundary churn)', diveGate, 'hovering the realm gate churns the scope swap');

  const catchupYields = /const yieldBetweenChunks = \(\): Promise<void> => new Promise<void>\(\(resolve\) => \{ setTimeout\(resolve, 0\); \}\);/.test(driverSrc)
    && /await yieldBetweenChunks\(\);/.test(driverSrc)
    && /const steppedRatio = receipt\.stepped > 0 \? Math\.min\(1, receipt\.stepped \/ 1000\) : 0;/.test(driverSrc);
  check('R95: the catch-up burst yields between chunks and trusts the stepped receipt', catchupYields, 'the burst still freezes frames or lies the clock ahead');
}

/* ==== 5. THE UNIVERSE ACTUALLY REMEMBERS ==== */
{
  const seedLaw = /const SEED_LAW = 3;/.test(driverSrc)
    && /seedLaw: SEED_LAW,/.test(driverSrc)
    && /saved\.seedLaw === SEED_LAW/.test(driverSrc);
  check('R95: session memories carry the seedLaw stamp; pre-R95 memories re-seed once', seedLaw, 'a detonated memory could resurrect');

  const bootResume = /\/\* R95 — THE BOOT RESUME[\s\S]*?return saved\.simDays;/.test(driverSrc)
    && /void activateScope\(wantId, wantBodies, this\.simDays\)\.then\(\(adopted\) => \{[\s\S]*?this\.simDays = adopted;/.test(engineSrc);
  check('R95: a memory ahead of the boot clock is ADOPTED (the engine sets simDays to the memory\'s time)', bootResume, 'every reopen still silently discards the memory');
}

/* ==== 6. THE LIVING RINGS + REALM HIDING ==== */
{
  const velSeam = /export function driverVelReadback\(simDays: number\): Array<\[number, number, number\]> \| null \{/.test(driverSrc);
  const rebuild = /private rebuildOrbitLineFromState\(/.test(engineSrc)
    && /const pSemi = \(hm \* hm\) \/ mu;/.test(engineSrc)
    && /this\.rebuildOrbitLineFromState\(b\.orbitLine, drvPos\[i \+ 1\], drvVel\[i \+ 1\], drvPos\[0\]\);/.test(engineSrc)
    && /this\.rebuildOrbitLineFromState\(p\.orbitLine, drvPos\[pi \+ 1\], drvVel\[pi \+ 1\], drvPos\[0\]\);/.test(engineSrc);
  const canonRestore = /private rebuildOrbitLineToCanon\(/.test(engineSrc)
    && /this\.rebuildOrbitLineToCanon\(b\.orbitLine, b\.data\);/.test(engineSrc);
  check('R95: the hover ellipses follow the session\'s osculating elements (canon rings restored on the clockwork)', velSeam && rebuild && canonRestore, 'the rings strand on clockwork paths');

  const realmHiding = /this\.homeRealmW \+= \(\(this\.galaxyDiveId \? 0 : 1\) - this\.homeRealmW\) \* Math\.min\(1, dt \* 4\);/.test(engineSrc)
    && /const sysW = \(1 - smoothstep\(430, 860, this\.currentDist\(\)\)\) \* this\.homeRealmW;/.test(engineSrc);
  check('R95: the home realm eases out during a galaxy dive (its vault quad cannot haunt the visited system)', realmHiding, 'three black holes can still photobomb');
}

/* ==== 7. THE LOCKSTEP SOFTENING + HYGIENE ==== */
{
  const cpp = /constexpr double softening = 1e12;/.test(cppSrc);
  const ts = /private static readonly SOFTENING = 1e12;/.test(bridgeSrc);
  check('R95: the softening is 1e12 m² (ε = 1000 km) in the C++ core and the TS twin alike', cpp && ts, 'a tier diverged');

  const twinGuard = /if \(on && this\.universeDriverOn\) \{[\s\S]*?return;/.test(engineSrc);
  check('R95: setSimTwin refuses engine-side while the session drives (one session per tier)', twinGuard, 'a stray call could steal the session');

  const resetClears = /localStorage\.removeItem\(STORAGE_KEYS\.simSession\);/.test(actionsSrc)
    && /simSession: 'my-universe:sim-session:v1',/.test(keysSrc);
  check('R95: resetUniverse also forgets the session memory (a reset means reset)', resetClears, 'drift outlives the reset');
}

/* ==== 8. THE CHAIN ==== */
{
  const chained = pkgSrc.includes('round95-steady-sky-gauntlet');
  check('R95: the gauntlet sits in the verify chain', chained, 'add scripts/round95-steady-sky-gauntlet.ts to npm run verify');
}

if (failures > 0) {
  console.error(`\nR95 STEADY SKY GAUNTLET — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
  process.exit(1);
} else {
  console.log('\nR95 STEADY SKY GAUNTLET — ALL GREEN');
}
