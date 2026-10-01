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
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const engineSrc = read('../src/engine/engine.ts');
const domainSrc = read('../src/domain/universe.ts');
const actionsSrc = read('../src/state/actions.ts');
const appSrc = read('../src/App.tsx');
const cardSrc = read('../src/ui/console/SimulatorTwinCard.tsx');
const driverSrc = read('../src/physics/sessionDriver.ts');
const pkgSrc = read('../package.json');

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
     galaxy, the home session rests). */
  const seam = /const drvPos = this\.universeDriverOn && driverState\.scopeId === this\.activeRealityId\s*\? driverReadback\(this\.simDays\)\s*: null;/.test(engineSrc)
    && /if \(drvPos && drvPos\.length > i\) \{/.test(engineSrc)
    && /px = drvPos\[i\]\[0\];/.test(engineSrc);
  check('R92: the seam consumes the readback inside updateBodies only', seam, 'driver positions escape the seam');

  /* R94 reconciliation: the inner-system seam is the second consumer —
     the import + the home seam + the inner seam. */
  const singleConsumer = (engineSrc.match(/driverReadback/g) || []).length === 3;
  check('R92: driverReadback is consumed only through seams (home + inner)', singleConsumer, 'an unaccounted consumer');

  const fallback = /\} else if \(accelActive && this\.keplerCache\.xyz\.length >= \(i \+ 1\) \* 3\) \{/.test(engineSrc);
  check('R92: a stale readback falls back to the Kepler solve (the freshness law)', fallback, 'no clockwork fallback in the seam');

  const noDirectWrites = !/driverReadback\([\s\S]*?\.position\.set/.test(engineSrc.replace(/const drvPos[\s\S]*?b\.group\.position\.set\(px, py, pz\);/, ''));
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
