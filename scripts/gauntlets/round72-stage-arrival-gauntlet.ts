/**
 * ROUND 72 — the STAGE ARRIVAL gauntlet.
 *
 * The user's law: the multiverse Kamui must stop the way the reverse Kamui
 * stops — naturally, gradually — never in one frame. The membrane crossing
 * into the multiverse is a STAGED warp now: the traveler's own stage and
 * dial hold still while the tear builds, and the throat hands the other
 * stage over exactly as the summon expires (the mirror of the R67 portal
 * handoff). The eject face keeps its instant burst — its decay IS the
 * arrival.
 *
 * R105 reconciliation — THE SEALED FLOOR: the author's decree deleted the
 * zoom-velocity floor-return whole (with no realities it landed in the
 * phantom single-anchor-star web). Section 5 now guards its ABSENCE: zoom
 * never enters a reality, explicit Kamui doors only.
 *
 * Pure-source mirrors of the round's invariants. Checked without a GPU.
 */
import { engineSource } from './engineSource';
import{ readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const engSrc = engineSource();
const thrSrc = readFileSync(new URL('../../src/engine/systems/stageThresholds.ts', import.meta.url), 'utf8');

/* ==== 1. the staged stage-warp machine ==== */
{
  /* R97 reconciliation: the stageWarp machine moved whole into the kamui
     subsystem and its field is the subsystem's public face — the shape
     invariant (arrival dial, flip target, hold, pinned dial) is unchanged. */
  const machine = /stageWarp: \{/.test(engSrc)
    && /arrivalDial: number;/.test(engSrc)
    && /flipTo: 'multiverse' \| 'web';/.test(engSrc)
    && /hold: number;/.test(engSrc)
    && /pinnedDial: number;/.test(engSrc);
  check('R72: the stageWarp machine exists (arrival dial, flip target, hold, pinned dial)', machine, 'machine missing');

  const signature = /private beginStageWarp\(dir: 'toMultiverse' \| 'toWeb', arrivalDial: number, _after\?: \(\) => void\): void \{/.test(engSrc);
  check('R72: the beginStageWarp signature survives (round18 depends on it)', signature, 'signature drifted');

  const guard = /beginStageWarp\(dir: 'toMultiverse'[\s\S]{0,400}if \(this\.stageWarp \|\| this\.kamuiTimer > 0 \|\| this\.portal\.phase !== 'idle' \|\| this\.bootIntro\) return;/.test(engSrc);
  check('R72: a live warp / vortex / portal refuses a second crossing (no mid-tear re-fire)', guard, 'liveness guard missing');

  const verbatim = /this\.triggerKamui\(undefined, dir === 'toWeb'\);/.test(engSrc);
  check('R72: the pinned trigger line is verbatim (out = summon, back = eject)', verbatim, 'trigger line drifted');
}

/* ==== 2. the same-frame fold is retired ==== */
{
  const retired = !/this\.cosmicStage = dir === 'toMultiverse' \? 'multiverse' : 'web';/.test(engSrc);
  check('R72: the same-frame stage flip is gone from beginStageWarp', retired, 'same-frame flip still present');

  const staged = /hold: KAMUI_ENTRY_HOLD, pinnedDial, after: _after \}/.test(engSrc)
    && /this\.rig\.setZoomTarget\(pinnedDial\);/.test(engSrc);
  check('R72: the summon stages — hold armed, dial pinned where the traveler left it', staged, 'staging missing');
}

/* ==== 3. the throat hands the stage over ==== */
{
  const handoff = /THE THROAT HANDS THE STAGE OVER \(R72\)[\s\S]{0,200}this\.cosmicStage = warp\.flipTo;[\s\S]{0,200}this\.rig\.setZoomTarget\(warp\.arrivalDial\);[\s\S]{0,200}this\.stageWarp = null;/.test(engSrc);
  check('R72: the handoff flips the stage, releases the dial, then disarms — in that order', handoff, 'handoff sequence broken');

  const repin = /if \(warp\.hold > 0\) \{[\s\S]{0,200}this\.rig\.setZoomTarget\(warp\.pinnedDial\);[\s\S]{0,100}this\.rig\.killZoomMomentum\(\);/.test(engSrc);
  check('R72: the hold re-pins the dial and kills zoom momentum every frame', repin, 'hold re-pin missing');
}

/* ==== 4. the still frame stays still ==== */
{
  const guard = /const realityFocusLive = this\.realityFocused && !this\.stageWarp;/.test(engSrc)
    && /focused: !!activeFb \|\| realityFocusLive \|\| galaxyFocusActive,/.test(engSrc);
  check('R72: the marble focus (and its sideways re-aim) waits for the handover', guard, 'focus guard missing');

  const gates = (engSrc.match(/&& !this\.stageWarp/g) ?? []).length >= 2;
  check('R72: both membrane crossing gates refuse while a warp is in flight', gates, 'gate guards missing');
}

/* ==== 5. THE SEALED FLOOR (R105 authorial decree) ==== */
{
  /* Reconciliation: the R72 floor-return — the dial pushed through the
     multiverse floor carrying the traveler into the web — is DELETED WHOLE
     by the author's decree. With no realities it landed in the phantom
     single-anchor-star web, and the law is now absolute: zoom never enters
     a reality; the only bridges are the explicit Kamui doors (the marble
     click, the palette, the stepper). The floor clamp is the last word.
     (These pins read raw source, so the surviving comments deliberately
     avoid the deleted literals — R104's lesson.) */
  const noThresholds = !/MULTIVERSE_FLOOR_RETURN|RETURN_ZOOM_VEL/.test(engSrc)
    && !/MULTIVERSE_FLOOR_RETURN|RETURN_ZOOM_VEL/.test(thrSrc);
  check('R105: the floor-return crossing and its two thresholds are deleted whole (engine + thresholds)', noThresholds, 'the floor return survives');

  /* 240-char window: measured against the real guard shape (threshold +
     velocity + liveness gates + condition close ≈ 145 chars on the R72
     crossing) — a tighter window proved VACUOUS under mutation. */
  const noVelocityEntry = !/this\.rig\.zoomVelocity <[\s\S]{0,240}beginStageWarp\('toWeb'/.test(engSrc);
  check('R105: no inward-velocity condition carries the traveler into the web', noVelocityEntry, 'a velocity-keyed floor crossing survives');

  /* the ONLY velocity-gated crossing left in the family is the web-ceiling
     push — it EXITS to the multiverse (outward `>`), it never enters */
  const exitOnly = (engSrc.match(/this\.rig\.zoomVelocity [<>]/g) ?? []).length === 1
    && /this\.rig\.zoomVelocity > 0\.02/.test(engSrc);
  check('R105: the family\'s one velocity-gated crossing is the outward web-ceiling exit', exitOnly, 'a second velocity gate appeared');

  const clampHeld = /if \(this\.rig\.tZoomT < MULTIVERSE_FLOOR_CLAMP\) this\.rig\.setZoomTarget\(MULTIVERSE_FLOOR_CLAMP\);/.test(engSrc);
  check('R105: the multiverse floor clamp is the last word at the membrane', clampHeld, 'the floor clamp was lost with the crossing');
}

console.log(failures === 0 ? '\nR72 STAGE ARRIVAL GAUNTLET — ALL GREEN' : `\nR72 STAGE ARRIVAL GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
