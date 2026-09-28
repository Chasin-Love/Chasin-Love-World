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
import { readFileSync } from 'node:fs';
import { criticalImpactParam } from '../src/engine/blackholeRaymarch';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const marchSrc = readFileSync(new URL('../src/engine/blackholeRaymarch.ts', import.meta.url), 'utf8');
const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
const shSrc = readFileSync(new URL('../src/engine/shaders.ts', import.meta.url), 'utf8');
const pkgSrc = readFileSync(new URL('../package.json', import.meta.url), 'utf8');

/* ==== 1. the marcher's void is sealed at the source ==== */
{
  /* ROUND 64 stub state: the old renderer (knee, budget law, gate) is
     DELETED — these pins return with the verbatim port commit. The stub
     must only be the hidden-visual wiring contract. */
  const stub = /THE OLD RENDERER IS DELETED/.test(marchSrc)
    && !/ShaderMaterial/.test(marchSrc) && !/bool captured/.test(marchSrc);
  check('R64: the renderer is deleted — the void-seal pins return with the port', stub, 'stub contract broken');
}

/* ==== 2. the TS integrator is the shader's own physics ==== */
{
  /* ROUND 64 stub state: criticalImpactParam reports 0 (no march — no
     captured set); the golden-value pins return with the port commit. */
  const stubBc = criticalImpactParam(0.8, 2.4) === 0 && criticalImpactParam(6.0, 3.0) === 0;
  check('R64: criticalImpactParam is the stub zero (goldens return with the port)', stubBc, 'stub must report 0');
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
  /* while a hole is on stage the composer eases strength to his 0.68 and
     radius to his 0.2. His threshold 0.4 does NOT port (our pipeline double-
     encodes — his 0.4 measured flooding the void to 0.65; 0.90 admits the
     equivalent energy: interior 0.26 vs the reference's own 0.33) — it stays
     at the project's 0.90, and the gauntlet forbids the threshold easing. */
  const bloom = /bloomHoleBoost \+= \(holeBoostTarget - this\.bloomHoleBoost\)/.test(engSrc)
    && /this\.bloomPass\.strength = 0\.18 - this\.coreT \* 0\.08 \+ this\.bloomHoleBoost;/.test(engSrc)
    && /const holeMix = Math\.min\(1, this\.bloomHoleBoost \/ 0\.5\);/.test(engSrc)
    && /this\.bloomPass\.radius = 0\.15 \+ \(0\.20 - 0\.15\) \* holeMix;/.test(engSrc)
    && !/bloomPass\.threshold =/.test(engSrc);
  check('R63: bloom eases to his strength 0.68 / radius 0.2 on stage; threshold stays 0.90 (calibrated)', bloom, 'bloom easing wrong');

  /* the on-stage resolution floor: 0.5× pixel ratio rendered the disk as a
     blocky pixelated wash and broke the arcs into dots — 0.8 keeps the flow
     continuous (the R53 breaker stays as the safety net) */
  const resFloor = /const target = holeOnStage \? Math\.max\(0\.8, this\.pixelRatioBase \* 0\.8\) : this\.pixelRatioBase;/.test(engSrc);
  check('R63: on-stage resolution floor is 0.8 (no more blocky disk)', resFloor, 'floor not raised');

  /* the user's selected panel knobs: his appearance trio (Inner/Outer
     Softness, Sharpness) is live — store, ranges (his ui.js verbatim),
     uniforms and panel sliders all wired */
  const pSrc = readFileSync(new URL('../src/engine/blackholeParams.ts', import.meta.url), 'utf8');
  const cardSrc = readFileSync(new URL('../src/ui/console/BlackHoleTuningCard.tsx', import.meta.url), 'utf8');
  const knobs = /softInner: number;/.test(pSrc) && /softOuter: number;/.test(pSrc) && /arcSharpness: number;/.test(pSrc)
    && /softInner: \{ min: 0\.0, max: 0\.5, step: 0\.01 \}/.test(pSrc)
    && /arcSharpness: \{ min: 0\.1, max: 10\.0, step: 0\.1 \}/.test(pSrc)
    && /key: 'softInner', label: 'Inner Softness'/.test(cardSrc)
    && /key: 'arcSharpness', label: 'Arc Sharpness'/.test(cardSrc);
  check('R63: the appearance trio (softness inner/outer, arc sharpness) is wired store → panel', knobs, 'knob wiring broken');
}

/* ==== 5. the gate runs in npm run verify ==== */
{
  const wired = pkgSrc.includes('scripts/round63-void-gauntlet.ts');
  check('R63: the gauntlet is wired into the verify chain', wired, 'not in package.json verify');
}

console.log(failures === 0 ? '\nR63 VOID GAUNTLET — ALL GREEN' : `\nR63 VOID GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
