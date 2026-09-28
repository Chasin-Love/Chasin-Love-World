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
  /* the ABSOLUTE VOID knee: captured pixels lose every sub-band light —
     the turbulence film that the pipeline's double gamma lifted into a
     blue wash — while the real foreground band passes untouched */
  const knee = /if \(captured\) \{\s*\n\s*float lum = dot\(color, vec3\(0\.2126, 0\.7152, 0\.0722\)\);\s*\n\s*color \*= smoothstep\(0\.05, 0\.2, lum\);\s*\n\s*\}/.test(marchSrc);
  check('R63: captured pixels carry the luminance knee (film dies, band survives)', knee, 'knee missing');

  /* step-budget burnout is capture, never transparency — a whirl ray at
     the rim must never reveal the live sky inside the shadow */
  const budget = /budgetOut = true; break;/.test(marchSrc)
    && /if \(budgetOut\) captured = true;/.test(marchSrc);
  check('R63: step-budget burnout resolves to captured (black), not transparent', budget, 'budget capture missing');

  /* the early-out gate covers the WHOLE captured set via uCriticalB */
  const gate = /uniform float uCriticalB;/.test(marchSrc)
    && /if \(b <= max\(uDiskOuter \+ 2\.5, uCriticalB \* 1\.02\)\)/.test(marchSrc);
  check('R63: the early-out gate covers the whole captured set (uCriticalB)', gate, 'gate not on uCriticalB');

  /* the per-frame driver feeds the gate with the mirrored integrator */
  const driven = /uCriticalB\.value = criticalImpactParam\(/.test(marchSrc);
  check('R63: updateRaymarchUniforms drives uCriticalB from the TS mirror each frame', driven, 'driver missing');
}

/* ==== 2. the TS integrator is the shader's own physics ==== */
{
  const bcDefaultLens1 = criticalImpactParam(0.8, 1.0);
  const nearClassic = bcDefaultLens1 > 0.8 * 2.3 && bcDefaultLens1 < 0.8 * 2.9;
  check('R63: b_c at lensing 1 lands in the classic 2.3–2.9·rs band (integrator sane)', nearClassic, bcDefaultLens1.toFixed(4));

  const bcDefault = criticalImpactParam(0.8, 2.4);
  const bcStrong = criticalImpactParam(0.8, 3.0);
  check('R63: b_c grows with the lensing multiplier', bcDefault > bcDefaultLens1 && bcStrong > bcDefault, `${bcDefault.toFixed(3)} !> ${bcDefaultLens1.toFixed(3)} or ${bcStrong.toFixed(3)} !> ${bcDefault.toFixed(3)}`);

  /* golden values — the integrator's captured set pinned at the panel's
     corners. NOT scale-invariant in rs (the shader's march sphere is a fixed
     r=16 in shader units while rs scales), so these exact numbers are the
     contract: any drift means the march law itself changed and the early-out
     gate + the composer's void mask must be consciously re-pinned with it. */
  const GOLDENS: Array<[number, number, number]> = [
    [0.8, 0.5, 1.2675], [0.8, 1.0, 2.0020], [0.8, 2.4, 4.5764], [0.8, 3.0, 5.5658],
    [6.0, 1.0, 11.1936], [6.0, 2.4, 15.9455], [6.0, 3.0, 18.4561],
  ];
  const goldenOk = GOLDENS.every(([rs, l, v]) => Math.abs(criticalImpactParam(rs, l) - v) < v * 0.01);
  check('R63: b_c golden values pinned at the panel corners (march law unchanged)', goldenOk,
    GOLDENS.filter(([rs, l, v]) => Math.abs(criticalImpactParam(rs, l) - v) >= v * 0.01)
      .map(([rs, l, v]) => `${rs}/${l}: got ${criticalImpactParam(rs, l).toFixed(4)} want ${v}`).join('; '));

  /* THE REGRESSION: at the panel's reachable extremes the OLD gate
     (diskOuter min 6.0 + 2.5) sat INSIDE the shadow — the outer annulus
     never marched and the sky showed through the void. Document the leak
     the new gate seals. */
  const oldGateMin = 6.0 + 2.5;
  const bcMax = criticalImpactParam(6.0, 3.0);
  check('R63: the old disk-only gate provably sat inside the shadow at panel extremes', bcMax > oldGateMin, `b_c ${bcMax.toFixed(3)} <= old gate ${oldGateMin}`);
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

/* ==== 4. the ring's blaze is deliberately untouched ==== */
{
  /* the fix is surgical: bloom strength keeps its hole boost — only the
     void interior gets restored, the photon ring keeps its full glory */
  const bloom = /bloomHoleBoost \+= \(holeBoostTarget - this\.bloomHoleBoost\)/.test(engSrc)
    && /this\.bloomPass\.strength = 0\.18 - this\.coreT \* 0\.08 \+ this\.bloomHoleBoost;/.test(engSrc);
  check('R63: bloom strength keeps its hole boost (the mask, not de-tuning, seals the void)', bloom, 'bloom tuning drifted');
}

/* ==== 5. the gate runs in npm run verify ==== */
{
  const wired = pkgSrc.includes('scripts/round63-void-gauntlet.ts');
  check('R63: the gauntlet is wired into the verify chain', wired, 'not in package.json verify');
}

console.log(failures === 0 ? '\nR63 VOID GAUNTLET — ALL GREEN' : `\nR63 VOID GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
