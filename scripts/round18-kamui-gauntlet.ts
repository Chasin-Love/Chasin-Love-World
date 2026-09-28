/**
 * ROUND 18 — the KAMUI gauntlet (v1 — the red Space-Time Vortex).
 *
 * Pure-source mirrors of the summon's invariants, checked without a GPU:
 * the vortex pass exists and is wired, triggerKamui() drives it with the
 * sin envelope, the Demon-Core summon flows through it, the summon tears
 * the screen ONLY (no reality-crossing machinery survives), and the CSS
 * vortex animations are present.
 *
 * The v2 wormhole director (systems/kamui.ts) is retired — its gauntlet
 * asserts that retirement instead.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
const shSrc = readFileSync(new URL('../src/engine/shaders.ts', import.meta.url), 'utf8');
const appSrc = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const cssSrc = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const mbSrc = readFileSync(new URL('../src/ui/hud/MultiverseBar.tsx', import.meta.url), 'utf8');
const phaseSrc = readFileSync(new URL('../src/engine/systems/kamuiPhases.ts', import.meta.url), 'utf8');

/* ==== 1. the vortex pass ==== */
{
  /* the v1 fragment shader is ported with its signature terms intact */
  const shaderOk = /Kamui Space-Time Vortex Distortion/.test(shSrc)
    && /spiralTwist = s \* 6\.5 \* fall/.test(shSrc)
    && /Central Kamui singularity void/.test(shSrc)
    && /KamuiGlow/.test(shSrc)
    && /if \(s < 0\.001\) \{ gl_FragColor = texture2D\(tDiffuse, uv\); return; \}/.test(shSrc);
  check('R18: portalFrag carries the v1 vortex (twist, pull, dispersion, void, rings) with an idle fast-path', shaderOk, 'shader terms missing');

  /* the composer runs it after bloom, before OutputPass */
  const wired = /this\.portalPass = new ShaderPass\(/.test(engSrc)
    && /fragmentShader: portalFrag/.test(engSrc)
    && /this\.composer\.addPass\(this\.portalPass\);/.test(engSrc);
  check('R18: the vortex pass is composed (bloom → portalPass → OutputPass)', wired, 'pass wiring missing');
}

/* ==== 2. the trigger ==== */
{
  const trigger = /triggerKamui\(targetUv\?: THREE\.Vector2\) \{[\s\S]*?this\.kamuiTimer = 1\.0;[\s\S]*?\n  \}/.test(engSrc);
  const envelope = /this\.kamuiTimer = Math\.max\(0, this\.kamuiTimer - dt \* 1\.15\);/.test(engSrc)
    && /const kEase = Math\.sin\(this\.kamuiTimer \* Math\.PI\);/.test(engSrc)
    && /kEase \* 1\.15/.test(engSrc)
    && /this\.kamuiEase \*= Math\.max\(0, 1 - dt \* 6\);/.test(engSrc);
  check('R18: triggerKamui fires the 1s timer; the tick relaxes it through the sin envelope (×1.15 peak)', trigger && envelope, `${trigger}/${envelope}`);

  const center = /uCenter\.value\.set\(this\._vScratch4\.x \* 0\.5 \+ 0\.5, this\._vScratch4\.y \* 0\.5 \+ 0\.5\)/.test(engSrc)
    && /\(this\.portalPass\.uniforms\.uColor\.value as THREE\.Color\)\.set\('#ff1744'\)/.test(engSrc);
  check('R18: the tear centers on the kamui source (projected) and wears the demonic red', center, 'center/color missing');

  const events = /onKamuiTrigger\?: \(\) => void;/.test(engSrc)
    && /onKamuiTrigger\?\.\(\);/.test(engSrc)
    && /onKamuiTrigger: \(\) => setKamuiKey\(\(k\) => k \+ 1\),/.test(appSrc);
  check('R18: every tear re-keys the HUD through onKamuiTrigger (the vortex re-entry)', events, 'callback chain missing');
}

/* ==== 3. the summon flow ==== */
{
  const summon = /onSelectDemonCore: \(\) => \{[\s\S]*?setKamuiKey\(\(k\) => k \+ 1\);[\s\S]*?toast\('✦ Kamui: Core Activated'\);/.test(appSrc)
    && /onTriggerKamui\?: \(\) => void;/.test(mbSrc)
    && /kamuiKey\?: number;/.test(mbSrc)
    && /key=\{kamuiKey\}/.test(mbSrc)
    && /kamui-appear/.test(mbSrc)
    && /onTriggerKamui\(\); onOpenCoreConsole\?\.\(\);/.test(mbSrc);
  check('R18: Demon Core → vortex re-entry of the bar; the CORE badge tears then opens the console', summon, 'summon flow incomplete');

  const css = /@keyframes kamuiVortexIn/.test(cssSrc)
    && /@keyframes kamuiVortexOut/.test(cssSrc)
    && /\.kamui-appear \{/.test(cssSrc)
    && /\.kamui-demon-badge \{/.test(cssSrc)
    && /\.demon-eye-spin \{/.test(cssSrc);
  check('R18: the v1 CSS vortex animations are present (appear / disappear / demon pulse / eye warp)', css, 'css missing');
}

/* ==== 4. THE LAW — the tear is screen-only now ==== */
{
  const retired = !/KamuiDirector/.test(engSrc)
    && !/kamui\.fire\(/.test(engSrc)
    && !/this\.kamui\.active/.test(engSrc)
    && !/breachK|crackK|glitchK|desatK/.test(engSrc)
    && !/spiralMix/.test(engSrc)
    && !/uSpiralMix/.test(engSrc);
  check('R18: the v2 wormhole director is fully retired (no beats, no breach, no geometry field)', retired, 'v2 residue in engine.ts');

  const fieldRetired = !/this\.kamui\.fieldStrength/.test(engSrc)
    && /uGravityStrength\.value = 0;/.test(engSrc)
    && /uniforms\.uTear\.value = 0;/.test(engSrc)
    && !/addScaledVector\(this\._vScratch4, kDist \* pull/.test(engSrc);
  check('R18: bodies bend no more — the geometry field is zeroed, the screen carries the jutsu', fieldRetired, 'field residue');

  const stages = /beginStageWarp\(dir: 'toMultiverse' \| 'toWeb'/.test(engSrc)
    && (engSrc.match(/this\.triggerKamui\(\);/g)?.length ?? 0) === 4
    && /kamuiTearBodyId: string \| null = null;/.test(engSrc);
  check('R18: stage warps and portals play the tear and keep their zooms (theater-only Kamui)', stages, 'stage wiring changed');
}

/* ==== 5. the phases module ==== */
{
  const phases = /export type PortalPhase =/.test(phaseSrc)
    && /KAMUI_PHASE_WEIGHTS/.test(phaseSrc)
    && /KAMUI_TRIGGER_DECAY = 1\.15/.test(phaseSrc)
    && !/KamuiPhase/.test(phaseSrc)
    && !/'breach'/.test(phaseSrc);
  check('R18: kamuiPhases.ts carries the v1 contract (portal phases, trigger decay — no 9-beat chain)', phases, 'phases module drifted');
}

/* ==== 6. CAMERA STABILITY — the summon holds the frame ==== */
{
  const armed = /export const KAMUI_ENTRY_HOLD = 0\.8;/.test(phaseSrc)
    && /export const KAMUI_ENTRY_FRAMING = 4\.2;/.test(phaseSrc)
    && /private portalHold = 0;/.test(engSrc)
    && /private portalFocusPending = false;/.test(engSrc)
    && /this\.portalHold = KAMUI_ENTRY_HOLD;/.test(engSrc)
    && /this\.portalFocusPending = true;/.test(engSrc)
    && /Math\.max\(0\.4, b\.data\.radius\) \* KAMUI_ENTRY_FRAMING/.test(engSrc);
  check('R18: the entry arms a hold and withholds the focus (the dive can no longer start on the click)', armed, 'entry hold not armed');

  const pinned = /if \(this\.portalHold > 0\) \{[\s\S]*?setZoomTarget\(this\.portalReturnDial\)[\s\S]*?killZoomMomentum\(\)[\s\S]*?this\.portalHold === 0[\s\S]*?this\.focusId = this\.portalPendingFocusId;[\s\S]*?setZoomTarget\(this\.portalEnterDial\)/
    .test(engSrc)
    && /this\.portalHold = 0;[\s\S]{0,200}this\.portalFocusPending = false;/.test(engSrc);
  check('R18: while it holds, the dial is pinned and momentum killed; on expiry the body and the dive are released', pinned, 'hold resolution drifted');
}

/* ================================ verdict ================================ */
console.log(failures === 0 ? '\n★ KAMUI GAUNTLET GREEN — the v1 vortex checks out' : `\n● ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
