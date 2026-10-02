/**
 * ROUND 72 — the STAGE ARRIVAL gauntlet.
 *
 * The user's law: the multiverse Kamui must stop the way the reverse Kamui
 * stops — naturally, gradually — never in one frame. The membrane crossing
 * into the multiverse is a STAGED warp now: the traveler's own stage and
 * dial hold still while the tear builds, and the throat hands the other
 * stage over exactly as the summon expires (the mirror of the R67 portal
 * handoff). The eject face keeps its instant burst — its decay IS the
 * arrival — and the reverse come always lands back in the cosmic web, never
 * written to the home stellar system.
 *
 * Pure-source mirrors of the round's invariants. Checked without a GPU.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const engSrc = readFileSync(new URL('../../src/engine/engine.ts', import.meta.url), 'utf8');
const thrSrc = readFileSync(new URL('../../src/engine/systems/stageThresholds.ts', import.meta.url), 'utf8');

/* ==== 1. the staged stage-warp machine ==== */
{
  const machine = /private stageWarp: \{/.test(engSrc)
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

/* ==== 5. the reverse come lands in the cosmic web, never the home page ==== */
{
  const landing = /this\.beginStageWarp\('toWeb', 0\.72\);/.test(engSrc);
  check('R72: the multiverse floor return still lands at the cosmic web dial (0.72)', landing, 'web landing lost');
}

/* ==== 6. the reverse come is fireable ==== */
{
  const threshold = /export const RETURN_ZOOM_VEL = -0\.02;/.test(thrSrc);
  check('R72: the way home asks the same push as the way out (-0.02, matched to +0.02)', threshold, 'threshold not matched');
}

console.log(failures === 0 ? '\nR72 STAGE ARRIVAL GAUNTLET — ALL GREEN' : `\nR72 STAGE ARRIVAL GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
