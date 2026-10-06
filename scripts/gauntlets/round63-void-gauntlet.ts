/**
 * ROUND 63 — the ABSOLUTE VOID gauntlet.
 *
 * The user's law: the black part of the black hole is a hole torn in the
 * surface of the universe — the void emits nothing, reflects nothing, and
 * nothing inside it reaches the eye. It must read as absolute darkness.
 *
 * Pure-source mirrors of the round's invariants, plus the REAL TS integrator
 * imported and exercised: the marcher's captured set is sealed at every leak
 * (sky-through-gate, sky-through-budget-burnout, turbulence film lifted by the
 * double gamma), the void reads black, and the yellow-white energy flows keep
 * their bloom blaze — the reference's own look — with NO post-process mask
 * ever touching the frame (a pre-bloom restore disc was tried and washed the
 * whole flow out at close focus). Checked without a GPU.
 */
import { engineSource } from './engineSource';
import{ readFileSync } from 'node:fs';
import { criticalImpactParam } from '../../src/engine/blackholeRaymarch';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const marchSrc = readFileSync(new URL('../../src/engine/blackholeRaymarch.ts', import.meta.url), 'utf8');
const engSrc = engineSource();
const shSrc = readFileSync(new URL('../../src/engine/shaders.ts', import.meta.url), 'utf8');
const pkgSrc = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

/* ==== 1. the marcher's void is sealed at the source ==== */
{
  /* the R64 port keeps the structural seal and sheds the R63 crutch: the
     gate covers the WHOLE captured set via uCriticalB (the sky can never
     show through the shadow), while the luminance knee is GONE — the film
     now matches the source's own, because the pipeline matches too */
  const gate = /uniform float uCriticalB;/.test(marchSrc)
    && /if \(b <= max\(uDiskOuter \+ 2\.5, uCriticalB \* 1\.02\)\)/.test(marchSrc);
  const driven = /uCriticalB\.value = criticalImpactParam\(/.test(marchSrc);
  check('R64: the gate covers the whole captured set, driven by the TS mirror', gate && driven, 'gate/driver missing');

  const noKnee = !/smoothstep\(0\.05, 0\.2, lum\)/.test(marchSrc);
  check('R64: the R63 knee is gone — his film, unmodified', noKnee, 'knee found');

  /* his exhaustion semantics: an exhausted ray is ESCAPED (his own budget
     also exhausts long before r=100) — no budgetOut capture machinery */
  const hisExhaust = !/budgetOut/.test(marchSrc);
  check('R64: step exhaustion = escaped, his semantics (no budget-capture crutch)', hisExhaust, 'budget capture found');
}

/* ==== 2. the TS integrator is the shader's own physics ==== */
{
  const bcDefaultLens1 = criticalImpactParam(0.8, 1.0);
  const nearClassic = bcDefaultLens1 > 0.8 * 2.2 && bcDefaultLens1 < 0.8 * 2.9;
  check('R64: b_c at lensing 1 lands in the classic 2.2–2.9·rs band (integrator sane)', nearClassic, bcDefaultLens1.toFixed(4));

  const bcDefault = criticalImpactParam(0.8, 2.4);
  const bcStrong = criticalImpactParam(0.8, 3.0);
  check('R64: b_c grows with the lensing multiplier', bcDefault > bcDefaultLens1 && bcStrong > bcDefault, `${bcDefault.toFixed(3)} !> ${bcDefaultLens1.toFixed(3)} or ${bcStrong.toFixed(3)} !> ${bcDefault.toFixed(3)}`);

  /* golden values — the fixed-step integrator's captured set pinned at the
     panel's corners (default 64-step budget). NOT scale-invariant in rs (the
     march sphere is a fixed r=16 in shader units while rs scales), so these
     exact numbers are the contract: any drift means the march law changed
     and the early-out gate must be consciously re-pinned with it. */
  const GOLDENS: Array<[number, number, number]> = [
    [0.8, 0.5, 1.1259], [0.8, 1.0, 1.8209], [0.8, 2.4, 4.4974], [0.8, 3.0, 5.5046],
    [6.0, 1.0, 11.2215], [6.0, 2.4, 15.9346], [6.0, 3.0, 17.9564],
  ];
  const goldenOk = GOLDENS.every(([rs, l, v]) => Math.abs(criticalImpactParam(rs, l) - v) < v * 0.01);
  check('R64: b_c golden values pinned at the panel corners (fixed-step march law)', goldenOk,
    GOLDENS.filter(([rs, l, v]) => Math.abs(criticalImpactParam(rs, l) - v) >= v * 0.01)
      .map(([rs, l, v]) => `${rs}/${l}: got ${criticalImpactParam(rs, l).toFixed(4)} want ${v}`).join('; '));

  /* THE REGRESSION the gate seals: at the panel's reachable extremes the old
     disk-only gate (diskOuter min 6.0 + 2.5) sat INSIDE the shadow */
  const oldGateMin = 6.0 + 2.5;
  const bcMax = criticalImpactParam(6.0, 3.0);
  check('R64: the old disk-only gate provably sat inside the shadow at panel extremes', bcMax > oldGateMin, `b_c ${bcMax.toFixed(3)} <= old gate ${oldGateMin}`);
}

/* ==== 3. the blaze rides bloom — no post-process mask ever touches it ==== */
{
  /* the canonical chain stays RenderPass → bloom → portal → Output: the
     reference's yellow-white flow IS bloom (his threshold-0.4 blaze), so a
     pre-bloom restore inside the void would wash the band out at close
     focus — the R63 sin this check forbids forever */
  const build = engSrc.slice(engSrc.indexOf('private buildComposerPasses'), engSrc.indexOf('private buildComposerPasses') + 1_200);
  const order =
    build.indexOf('new RenderPass(') !== -1
    && build.indexOf('new UnrealBloomPass(') > build.indexOf('new RenderPass(')
    && build.indexOf('addPass(this.portalPass)') > build.indexOf('addPass(this.bloomPass)')
    && build.indexOf('addPass(new OutputPass())') > build.indexOf('addPass(this.portalPass)');
  const noMask = !/SavePass|voidRestorePass|preBloomPass|updateVoidMaskUniforms|tPreBloom/.test(engSrc)
    && !/voidRestoreFrag/.test(shSrc);
  check('R63: composer chain is RenderPass → bloom → portal → Output (no restore pass)', order, 'chain order broken');
  check('R63: no post-process void mask exists — the flow keeps its bloom blaze', noMask, 'mask machinery found');
}

/* ==== 4. the ring's blaze is the reference's own bloom config, calibrated ==== */
{
  /* his strength 0.68 and radius 0.2 port verbatim — scaled by the R65
     distance-aware proximity (full glory ≤ ~40 rs, calm sky by 120 rs, the
     eye-comfort fix). His THRESHOLD is scene-dependent (his scene = hole on
     black; ours = hole in a living universe) — measured TWICE on the GPU
     probe: his 0.4 floods our void to 0.58–0.65 with the reference's own
     interior at 0.33; the calibrated 0.90 lands it at 0.33. It stays. */
  const bloom = /bloomHoleBoost \+= \(holeBoostTarget - this\.bloomHoleBoost\)/.test(engSrc)
    && /const holeBoostTarget = this\.holeGlowProximity\(\) \* 0\.5;/.test(engSrc)
    && /private holeGlowProximity\(\): number \{/.test(engSrc)
    && /this\.bloomPass\.strength = 0\.18 - this\.coreT \* 0\.08 \+ this\.bloomHoleBoost;/.test(engSrc)
    && /const holeMix = Math\.min\(1, this\.bloomHoleBoost \/ 0\.5\);/.test(engSrc)
    && /this\.bloomPass\.radius = 0\.15 \+ \(0\.20 - 0\.15\) \* holeMix;/.test(engSrc)
    && !/bloomPass\.threshold =/.test(engSrc);
  check('R64/65: his strength/radius port, distance-aware; threshold calibrated to 0.90 (measured twice)', bloom, 'bloom easing wrong');

  /* the on-stage resolution tightening (R64): at base ratio ≤ 1 there is NO
     drop — the blocky disk was the leak; only HiDPI eases, never below 0.7
     of base (the 55 ms breaker stays as the safety net) */
  const resFloor = /const target = holeOnStage && this\.pixelRatioBase > 1\s*\n\s*\? Math\.max\(this\.pixelRatioBase \* 0\.7, 1\)\s*\n\s*: this\.pixelRatioBase;/.test(engSrc);
  check('R64: no resolution drop at base ≤ 1 (the blocky-disk leak is sealed)', resFloor, 'tightening missing');

  /* the user's selected panel knobs: his appearance trio (Inner/Outer
     Softness, Sharpness) is live — store, ranges (his ui.js verbatim),
     uniforms and panel sliders all wired */
  const pSrc = readFileSync(new URL('../../src/engine/blackholeParams.ts', import.meta.url), 'utf8');
  const cardSrc = readFileSync(new URL('../../src/ui/console/BlackHoleTuningCard.tsx', import.meta.url), 'utf8');
  const knobs = /softInner: number;/.test(pSrc) && /softOuter: number;/.test(pSrc) && /arcSharpness: number;/.test(pSrc)
    && /diskTemp: number;/.test(pSrc) && /tempFalloff: number;/.test(pSrc)
    && /softInner: \{ min: 0\.0, max: 0\.5, step: 0\.01 \}/.test(pSrc)
    && /arcSharpness: \{ min: 0\.1, max: 10\.0, step: 0\.1 \}/.test(pSrc)
    && /diskTemp: \{ min: 1, max: 50, step: 1 \}/.test(pSrc)
    && /uSoftInner\.value = p\.softInner;/.test(marchSrc)
    && /uTurbSharp\.value = p\.arcSharpness;/.test(marchSrc)
    && /uDiskTemp\.value = p\.diskTemp;/.test(marchSrc)
    && /key: 'softInner', label: 'Inner Softness'/.test(cardSrc)
    && /key: 'arcSharpness', label: 'Arc Sharpness'/.test(cardSrc)
    && /key: 'diskTemp', label: 'Peak Temp \(kK\)'/.test(cardSrc);
  check('R64: the appearance set (softness pair, sharpness, peak temp, falloff) is wired store → uniforms → panel', knobs, 'knob wiring broken');
}

/* ==== 5. the gate runs in npm run verify ==== */
{
  const wired = pkgSrc.includes('scripts/gauntlets/round63-void-gauntlet.ts');
  check('R63: the gauntlet is wired into the verify chain', wired, 'not in package.json verify');
}

console.log(failures === 0 ? '\nR63 VOID GAUNTLET — ALL GREEN' : `\nR63 VOID GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
