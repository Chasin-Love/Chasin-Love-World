/**
 * ROUND 94 — THE FLIP gauntlet.
 *
 * The R91 decree lands: true N-body gravity drives the sky BY DEFAULT
 * (absent flag = ON), and "everything everywhere" is real — every galaxy's
 * inner system gets its own scope of the one session, swapped by
 * proximity, with the resting scope's memory persisting and resuming
 * through a bounded catch-up burst. The invariants:
 *
 *  - THE FLIP: absent flag = ON in BOTH derivations (App rides it into the
 *    engine; the card shows the truth). The switch still restores the
 *    clockwork on demand.
 *  - THE SCOPE SWAP: activateScope saves the resting scope, resumes the
 *    target's own memory with a bounded catch-up burst (250-day chunks,
 *    0.25-day RK4 sub-steps — moon orbits resolved), or seeds fresh.
 *  - THE INNER SEAM: the star leads the roster (the dominant mass — its
 *    barycenter wobble is real and its ensemble follows), planets consume
 *    the readback with the +1 index, stale → Kepler.
 *  - THE SCOPE CHECKS: the home seam renders only home-scope readbacks;
 *    the inner seam only its own galaxy's.
 *  - INNER MOONS have deterministic ids — real in their galaxy's scope.
 *  - UI HONESTY: the Physics Laws panel shows the driving badge and rests
 *    the Living Gravity toggle while the session owns the sky.
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
const appSrc = read('../src/App.tsx');
const cardSrc = read('../src/ui/console/SimulatorTwinCard.tsx');
const consoleSrc = read('../src/ui/console/CoreConsole.tsx');
const pkgSrc = read('../package.json');

/* ==== 1. THE FLIP — absent flag = ON ==== */
{
  const app = /const universeDriverOn = state\.universeDriver !== false;/.test(appSrc);
  check('R94: App derives the driver as ON by default (absent = ON)', app, 'the flip never lands');

  const card = /const driverOn = universe\.universeDriver !== false;/.test(cardSrc);
  check('R94: the card derives the driver as ON by default', card, 'the card would lie about the state');

  const shadowGone = !/universeDriver === true/.test(appSrc) && !/universeDriver === true/.test(cardSrc);
  check('R94: no shadow-phase derivation survives (=== true is the old law)', shadowGone, 'a stale OFF-default would silently disable the revolution');
}

/* ==== 2. THE SCOPE SWAP ==== */
{
  const scope = /scopeId: '',/.test(driverSrc)
    && /export function activateScope\(scopeId: string, bodies: DriverBody\[\], simDays: number\): Promise<void> \{/.test(driverSrc);
  check('R94: activateScope exists over the driverState scope', scope, 'no scope machinery');

  const swap = /saveSession\(driverState\.scopeId, driverState\.readbackDays, 'scope-swap'\);/.test(driverSrc)
    && /await restoreSession\(saved\);/.test(driverSrc)
    && /await catchUpSession\(simDays\);/.test(driverSrc);
  check('R94: the swap saves the resting scope, resumes the target with catch-up', swap, 'a scope change would lose the story');

  const catchup = /CATCHUP_CHUNK_DAYS = 250/.test(driverSrc)
    && /CATCHUP_MAX_DAYS = 100000/.test(driverSrc)
    && /cosmosBridge\.simStep\(\(chunk \* SECONDS_PER_DAY\) \/ 1000, 1000\)/.test(driverSrc);
  check('R94: the catch-up burst is bounded and moon-resolving (0.25-day sub-steps)', catchup, 'catch-up would either crawl or skip moons');

  const tickWants = /driverState\.scopeId !== wantId/.test(engineSrc)
    && /void activateScope\(wantId, wantBodies, this\.simDays\);/.test(engineSrc);
  check('R94: the engine activates the wanted scope and ticks the active one', tickWants, 'the tick would drive a sleeping realm');
}

/* ==== 3. THE INNER SEAM ==== */
{
  const scopeDeclare = /const scopeId = `galaxy:\$\{node\.data\.id\}`;/.test(engineSrc)
    && /bodies: \[\{ data: sys\.starData \}, \.\.\.sys\.planets\]/.test(engineSrc);
  check('R94: the inner system declares its scope with the STAR leading the roster', scopeDeclare, 'the dominant mass would be missing');

  const seam = /drvPos\[pi \+ 1\]\[0\]/.test(engineSrc)
    && /sys\.starMesh\.position\.set\(drvPos\[0\]\[0\], drvPos\[0\]\[1\], drvPos\[0\]\[2\]\);/.test(engineSrc)
    && /sys\.corona\.position\.copy\(sys\.starMesh\.position\);/.test(engineSrc);
  check('R94: the inner seam consumes the readback (+1 for the star) and the star ensemble follows its wobble', seam, 'planets would detach from the visual star');

  const innerMoons = /wp\[0\] - p\.group\.position\.x,/.test(engineSrc)
    && /id: `\$\{data\.id\}:moon:\$\{mi\}`,/.test(engineSrc)
    && /id: `\$\{p\.data\.id\}:moon:\$\{i\}`,/.test(engineSrc);
  check('R94: inner moons carry deterministic ids and the world→local seam', innerMoons, 'inner moons stay ornaments');

  const scopeCheck = /driverState\.scopeId === this\.activeRealityId/.test(engineSrc);
  check('R94: the home seam renders only home-scope readbacks', scopeCheck, 'a galaxy readback would drive the home sky');
}

/* ==== 4. UI HONESTY ==== */
{
  const badge = /TRUE GRAVITY · DRIVING/.test(consoleSrc)
    && /Gravity · In the Session/.test(consoleSrc);
  check('R94: the Physics Laws panel shows the driving badge and rests Living Gravity', badge, 'the panel would keep lying');

  const toggleRests = /disabled=\{state\.universeDriver !== false\}/.test(consoleSrc);
  check('R94: the Living Gravity toggle is disabled while the session drives', toggleRests, 'osculating elements would fight the session');
}

/* ==== 5. THE CHAIN ==== */
{
  const chained = pkgSrc.includes('round94-the-flip-gauntlet');
  check('R94: the gauntlet sits in the verify chain', chained, 'add scripts/round94-the-flip-gauntlet.ts to npm run verify');
}

if (failures > 0) {
  console.error(`\nR94 THE FLIP GAUNTLET — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
  process.exit(1);
} else {
  console.log('\nR94 THE FLIP GAUNTLET — ALL GREEN');
}
