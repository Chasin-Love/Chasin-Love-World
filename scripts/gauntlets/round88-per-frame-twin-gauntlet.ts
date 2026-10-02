/**
 * ROUND 88 — THE PER-FRAME TWIN gauntlet.
 *
 * The author's "yeah please": the stateful native simulator now runs
 * alongside the live universe on its own clock, measuring how far true
 * N-body gravity drifts from the Kepler canon. The invariants that keep it
 * safe are pinned here:
 *
 *  - THE HYBRID LAW: simTwin.ts is read-only against the rendered sky —
 *    it must never write a body position, rotation, or visible state.
 *  - The gate is OFF by law (simTwinOn = false) and inert until the author
 *    flips it from the twin card.
 *  - The engine hook is fire-and-forget (no await in the frame path).
 *  - The twin owns its telemetry (a module map, never the UI store) and
 *    its own clock.
 *  - Session discipline: the card's Verify Twin rests while the per-frame
 *    twin owns the shared native session.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const twinSrc = readFileSync(new URL('../../src/physics/simTwin.ts', import.meta.url), 'utf8');
const engSrc = readFileSync(new URL('../../src/engine/engine.ts', import.meta.url), 'utf8');
const cardSrc = readFileSync(new URL('../../src/ui/console/SimulatorTwinCard.tsx', import.meta.url), 'utf8');
const pkgSrc = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

/* ==== 1. THE HYBRID LAW — the twin is read-only against the sky ==== */
{
  const readOnly = !/\.position\.set\(/.test(twinSrc)
    && !/\.rotation\./.test(twinSrc)
    && !/\.visible\s*=/.test(twinSrc)
    && !/b\.group/.test(twinSrc);
  check('R88: simTwin.ts never writes rendered state (no position/rotation/visible writes)', readOnly, 'the twin touches the sky');

  const ownTelemetry = /export const simTwinTelemetry = new Map</.test(twinSrc)
    && !/from '\.\.\/state'/.test(twinSrc)
    && !/from '\.\.\/state\/store'/.test(twinSrc);
  check('R88: the twin publishes to its own module map, never the UI store', ownTelemetry, 'telemetry coupling wrong');
}

/* ==== 2. THE GATE — off by law, inert until flipped ==== */
{
  const gate = /private simTwinOn = false;/.test(engSrc)
    && /setSimTwin\(on: boolean\): void \{/.test(engSrc)
    && /if \(on\) enableSimTwin\(this\.bodies, this\.simDays\);/.test(engSrc)
    && /else disableSimTwin\(\);/.test(engSrc);
  check('R88: the engine gate is OFF by default and flips through setSimTwin', gate, 'gate not wired');

  const hook = /if \(this\.simTwinOn && !this\.bootIntro\) \{/.test(engSrc)
    && /simTwinTick\(this\.bodies, this\.lastSimDelta, this\.simDays\);/.test(engSrc);
  check('R88: the tick hook is gated (twin on, boot intro over) before it runs', hook, 'hook ungated');

  const dispose = /disableSimTwin\(\);/.test(engSrc);
  check('R88: the twin rests when the engine disposes', dispose, 'no dispose cleanup');
}

/* ==== 3. THE CLOCK — accumulated sim-days, threshold, fire-and-forget ==== */
{
  const cadence = /const FIRE_THRESHOLD_DAYS = 2;/.test(twinSrc)
    && /simTwinState\.accumulatedDays \+= dtDays;/.test(twinSrc)
    && /if \(simTwinState\.accumulatedDays < FIRE_THRESHOLD_DAYS\) return;/.test(twinSrc);
  check('R88: the twin advances on accumulated sim-days past its threshold', cadence, 'cadence wrong');

  const async = /simTwinState\.pending = true;/.test(twinSrc)
    && /\.finally\(\(\) => \{\s*\n\s*simTwinState\.pending = false;/.test(twinSrc);
  check('R88: the session call is fire-and-forget with a pending guard', async, 'frame could block');

  const realMasses = /massKg: phys\.massKg,/.test(twinSrc)
    && /const m = METERS_PER_SCENE_UNIT;/.test(twinSrc);
  check('R88: the twin feeds real physical masses through the scene→SI conversion', realMasses, 'units wrong');
}

/* ==== 4. THE CARD — ownership discipline ==== */
{
  /* R92 reconciliation: the driver (the R91 decree) also owns the session
     when it drives — Verify rests for EITHER owner. */
  const ownership = /disabled=\{busy \|\| twinOn( \|\| driverOn)?\}/.test(cardSrc)
    && /The per-frame twin owns the session/.test(cardSrc);
  check('R88: Verify Twin rests while the per-frame twin owns the session', ownership, 'session collision possible');

  const seam = /__ENGINE__/.test(cardSrc)
    && /setSimTwin\(next\)/.test(cardSrc);
  check('R88: the toggle reaches the gate through the __ENGINE__ boot contract', seam, 'wrong seam');

  const readout = /simTwinState\.maxDriftAU/.test(cardSrc)
    && /simTwinTelemetry\.entries\(\)/.test(cardSrc);
  check('R88: the live readout polls the twin map (max drift + per-body)', readout, 'readout missing');
}

/* ==== 5. THE VERIFY CHAIN ==== */
{
  const chain = /"verify".*round88-per-frame-twin-gauntlet/.test(pkgSrc);
  check('R88: the gauntlet sits in the verify chain', chain, 'not in the verify chain');
}

console.log(failures === 0
  ? '\nR88 PER-FRAME TWIN GAUNTLET — ALL GREEN'
  : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
