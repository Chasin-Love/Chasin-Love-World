/**
 * ROUND 92 — THE DRIVER TAKES THE WHEEL, IN SHADOW gauntlet.
 *
 * The R91 decree's Phase 2: the N-body session CAN now drive the rendered
 * sky — behind a gate that is OFF by law this round. The invariants:
 *
 *  - THE GATE IS OFF BY LAW: engine.universeDriverOn = false; only the
 *    setUniverseDriver flip (through the store's persisted flag) turns it.
 *  - THE SEAM IS THE ONLY WRITER: the driver's positions reach the scene
 *    ONLY inside updateBodies, through driverReadback(), flowing into the
 *    same b.group.position.set the Kepler solve has always used.
 *  - THE FRESHNESS LAW: the seam falls back to the Kepler solve when the
 *    readback is null (stale beyond the trust window / unconfigured).
 *  - LIVING GRAVITY STANDS DOWN while driving (the session IS the living
 *    gravity now — the vault at its full 10 M☉); it returns when the
 *    clockwork takes the sky back.
 *  - ONE SESSION, ONE OWNER: turning the driver on stops the twin lab.
 *  - THE HEAL: Restore Ephemeris re-seeds the driving session from canon.
 *  - THE SWITCH PERSISTS: the store's single mutation surface carries the
 *    flag; App rides it into the engine; the card flips it and shows the
 *    honest ownership (Verify Twin rests while the driver owns).
 *  - THE MEMORY OUTLIVES THE ENGINE: dispose saves one last time.
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
const domainSrc = read('../../src/domain/universe.ts');
import { stateSource } from './stateSource';
const actionsSrc = stateSource();
const appSrc = read('../../src/App.tsx');
const cardSrc = read('../../src/ui/console/SimulatorTwinCard.tsx');
const driverSrc = read('../../src/physics/sessionDriver.ts');
const pkgSrc = read('../../package.json');

/* ==== 1. THE GATE IS OFF BY LAW ==== */
{
  const gate = /private universeDriverOn = false;/.test(engineSrc);
  check('R92: the engine gate is OFF by law (universeDriverOn = false)', gate, 'the sky would be driven without consent');

  const flip = /setUniverseDriver\(on: boolean\): void \{/.test(engineSrc)
    && /this\.universeDriverOn = on;/.test(engineSrc)
    && /void enableDriver\(this\.bodies, this\.simDays, this\.activeRealityId\);/.test(engineSrc)
    && /disableDriver\(\);/.test(engineSrc);
  check('R92: setUniverseDriver flips the gate (enable with the live clock, disable saves)', flip, 'the gate is incomplete');

  const ownership = /if \(this\.simTwinOn\) \{\s*this\.simTwinOn = false;\s*disableSimTwin\(\);/.test(engineSrc);
  check('R92: turning the driver on stops the twin lab (one session, one owner)', ownership, 'session tug-of-war');

  const hook = /if \(this\.universeDriverOn && !this\.bootIntro\) \{[\s\S]*?const wantId = gal \? gal\.id : this\.activeRealityId;[\s\S]*?driverTick\(wantBodies, this\.lastSimDelta, this\.simDays\);/.test(engineSrc);
  check('R92: the tick hook is gated (driver on, boot intro over) — R94: scope-aware', hook, 'ungated per-frame session calls');

  const dispose = /disableDriver\(\); \/\* R92 — one last save of the session memory before rest \*\//.test(engineSrc);
  check('R92: engine dispose saves the session memory one last time', dispose, 'the story would die with the engine');
}

/* ==== 2. THE SEAM IS THE ONLY WRITER ==== */
{
  /* R94 reconciliation: the home seam is scope-checked now (inside a
     galaxy, the home session rests). R95 reconciliation: THE STEADY SEAM —
     the readback drives through a crossfade (drvBlend) with the star at
     index 0, so bodies consume drvArr[i + 1] and a source switch eases
     instead of snapping (the visible flicker was the snap). */
  const seam = /const drvPos = this\.universeDriverOn && driverState\.scopeId === this\.activeRealityId\s*\? driverReadback\(this\.simDays\)\s*: null;/.test(engineSrc)
    && /const drvArr = drvPos \?\? this\.drvLastPos;/.test(engineSrc)
    && /if \(drvArr && drvArr\.length > i \+ 1 && this\.drvBlend > 0\) \{/.test(engineSrc)
    && /b\.group\.position\.set\(px, py, pz\);/.test(engineSrc);
  check('R92: the seam consumes the readback inside updateBodies only (R95: crossfaded, star-led)', seam, 'driver positions escape the seam');

  /* R94 reconciliation: the inner-system seam is the second consumer —
     the import + the home seam + the inner seam. R97 reconciliation: the
     inner seam moved whole into the inner-galaxy subsystem and each module
     imports the verb once, so the union carries exactly four occurrences —
     still exactly TWO consumption seams. */
  const singleConsumer = (engineSrc.match(/driverReadback/g) || []).length === 4;
  check('R92: driverReadback is consumed only through seams (home + inner)', singleConsumer, 'an unaccounted consumer');

  /* R95 reconciliation: the clockwork anchor (cache → solve) is computed
     every frame as the blend's other end and the stale fallback. */
  const fallback = /if \(accelActive && this\.keplerCache\.xyz\.length >= \(i \+ 1\) \* 3\) \{/.test(engineSrc)
    && /const pos = calculateKeplerPosition\(o\.a, phys\.eccentricity, o\.phase, o\.incl, this\.simDays, o\.speed \|\| 0\.01, o\.node \?\? 0, o\.argP \?\? 0\);/.test(engineSrc);
  check('R92: a stale readback eases back to the Kepler solve (the freshness law, crossfaded)', fallback, 'no clockwork fallback in the seam');

  /* R97 reconciliation: in the monolith the lazy home-seam strip accidentally
     swallowed the inner seam too (it sat earlier in the file); split, BOTH
     legitimate seams are stripped explicitly before the negative scan —
     the invariant (no driver position write outside the two seams) is unchanged. */
  const noDirectWrites = !/driverReadback\([\s\S]*?\.position\.set/.test(
    engineSrc
      .replace(/const drvPos[\s\S]*?b\.group\.position\.set\(px, py, pz\);/, '')
      .replace(/const drvPos = this\.universeDriverOn && driverState\.scopeId === scopeId[\s\S]*?sys\.belt\.position\.copy\(sys\.starMesh\.position\);/, ''),
  );
  check('R92: no driver position write exists outside the single updateBodies write', noDirectWrites, 'a second writer would fight the canon');
}

/* ==== 3. LIVING GRAVITY STANDS DOWN WHILE DRIVING ==== */
{
  const suppressed = /if \(this\.livingGravityOn && !this\.universeDriverOn\) \{\s*this\.updateLivingGravity\(\);\s*\}/.test(engineSrc);
  check('R92: the osculating-element writer stands down while the session drives', suppressed, 'two writers would fight over every body');

  const heal = /healLivingGravity\(\): void \{\s*this\.livingField\.heal\(\);\s*if \(this\.universeDriverOn\) \{\s*void healDriver\(this\.bodies, this\.simDays, this\.activeRealityId\);/.test(engineSrc);
  check('R92: Restore Ephemeris re-seeds the driving session (the decree heal)', heal, 'the heal misses the driver');
}

/* ==== 4. THE SWITCH PERSISTS THROUGH THE STORE ==== */
{
  const flag = /universeDriver\?: boolean;/.test(domainSrc);
  check('R92: the persisted flag exists in the domain contract', flag, 'universeDriver missing from UniverseState');

  const action = /setUniverseDriver\(on: boolean\) \{\s*state\.universeDriver = on;\s*audit\(/.test(actionsSrc);
  check('R92: the action mutates through the single mutation surface (flag + audit)', action, 'the switch bypasses actions.ts');

  /* R94 reconciliation: absent = ON — the flip is the decree's default. */
  const appRide = /const universeDriverOn = state\.universeDriver !== false;/.test(appSrc)
    && /eng\.setUniverseDriver\(universeDriverOn\);/.test(appSrc)
    && /universeDriverOn, engineReady\]/.test(appSrc);
  check('R92: App rides the persisted flag into the engine (R94: absent = ON)', appRide, 'the flag never reaches the engine');
}

/* ==== 5. THE CARD — the driver's honest face ==== */
{
  const imports = /import \{ driverState, driverTelemetry \} from '\.\.\/\.\.\/physics\/sessionDriver';/.test(cardSrc)
    && /import \{ actions, useUniverse \} from '\.\.\/\.\.\/state';/.test(cardSrc);
  check('R92: the card reads the driver module and the store', imports, 'card wiring incomplete');

  const verifyRests = /disabled=\{busy \|\| twinOn \|\| driverOn\}/.test(cardSrc);
  check('R92: Verify Twin rests while the driver owns the session', verifyRests, 'Verify would reconfigure the driving session');

  const twinRests = /if \(driverOn\) \{\s*\/\* one session per tier: the driver owns it while it drives \*\/\s*toast\(/.test(cardSrc);
  check('R92: the twin toggle refuses while the driver owns the session', twinRests, 'the lab could steal the session');

  const switchPersists = /actions\.setUniverseDriver\(next\);/.test(cardSrc);
  check('R92: the driver switch flips through the store (persist + audit)', switchPersists, 'an unpersisted switch would lie across restarts');
}

/* ==== 6. THE DRIVER MODULE STAYS PURE (the R91 law, re-pinned) ==== */
{
  const readOnly = !/\.position\.set\(/.test(driverSrc)
    && !/\.rotation\./.test(driverSrc)
    && !/\.visible\s*=/.test(driverSrc)
    && !/b\.group/.test(driverSrc);
  check('R92: sessionDriver.ts still never writes rendered state', readOnly, 'the driver module grew teeth');

  const noStore = !/from '\.\.\/state/.test(driverSrc);
  check('R92: the driver module still never imports the store', noStore, 'telemetry must not ride notify/persist');
}

/* ==== 7. THE CHAIN ==== */
{
  const chained = pkgSrc.includes('round92-driver-shadow-gauntlet');
  check('R92: the gauntlet sits in the verify chain', chained, 'add scripts/round92-driver-shadow-gauntlet.ts to npm run verify');
}

if (failures > 0) {
  console.error(`\nR92 DRIVER SHADOW GAUNTLET — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
  process.exit(1);
} else {
  console.log('\nR92 DRIVER SHADOW GAUNTLET — ALL GREEN');
}
