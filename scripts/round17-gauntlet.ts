/* Round 17 verification gauntlet — the lens math mirrored exactly in TS.
   Run: npx tsx scripts/round17-gauntlet.ts
   ROUND 54 — the flat composite (blackhole.ts) is deleted; the Flamm/funnel
   sections retired with it, and new checks pin the single-renderer rebuild:
   his background on the escaped bent rays, the seam law, the silhouette. */

import { readFileSync, existsSync } from 'fs';
import { blackbodyColorOf } from '../src/engine/blackholeRaymarch';

let failures = 0;
function check(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
  if (!ok) failures++;
}

/* ==== 1. THE PHOTO DOME'S LENS-SPACE EQUIRECT MAPPING (GLSL, mirrored) ==== */
/* The bent direction d must drive the photo UV exactly like SphereGeometry
   builds it, or the photo swims under the lens. fwd = SphereGeometry layout,
   inv = the fragment's reconstruction; roundtrip must be the identity. */
const TAU = Math.PI * 2;
function fwd(theta: number, phi: number): [number, number, number] {
  /* SphereGeometry: x = −r cosθ sinφ, y = r cosφ, z = r sinθ sinφ */
  return [-Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi)];
}
function inv(d: [number, number, number]): [number, number] {
  /* the EXACT SphereGeometry inverse: u = φ/2π (no offset), v = 1 − θ/π */
  return [Math.atan2(d[2], -d[0]) / TAU, 1 - Math.acos(Math.max(-1, Math.min(1, d[1]))) / Math.PI];
}
{
  let maxErr = 0;
  for (let i = 0; i < 4000; i++) {
    const u = (i * 7919) % 360 / 360 * TAU;          /* deterministic spread */
    const v = (((i * 104729) % 1000) + 0.5) / 1000;  /* (0,1), off the poles */
    const phi = v * Math.PI;
    const d = fwd(u, phi);
    const [u2raw, v2] = inv(d);
    const u2 = u2raw - Math.floor(u2raw); /* the GPU's RepeatWrapping in hardware */
    /* SphereGeometry UV convention: u = θ/τ, v = 1 − φ/π */
    maxErr = Math.max(maxErr, Math.abs(u2 - (((u / TAU) % 1) + 1) % 1), Math.abs(v2 - (1 - v)));
  }
  check('equirect fwd/inv roundtrip = identity', maxErr < 1e-9, `max error = ${maxErr.toExponential(2)}`);
}
/* THE SEAM: photos wrap — a bent direction crossing θ=±π must land on the
   SAME texel column (u≈1 on one bank, u≈0 on the other, adjacent by wrap) */
{
  let seamOk = true, maxGap = 0;
  const eps = 1e-6;
  for (let k = 0; k < 50; k++) {
    const phi = 0.3 + (k / 50) * 2.2;
    const uPlus = inv(fwd(Math.PI - eps, phi))[0];   /* ≈ 1 − ε */
    const uMinus = inv(fwd(-Math.PI + eps, phi))[0]; /* ≈ +ε */
    const gap = 1 - Math.abs(uPlus - uMinus);        /* wrap distance ≈ 2ε */
    maxGap = Math.max(maxGap, gap);
  }
  if (maxGap > 1e-3) seamOk = false;
  check('seam continuity at θ=±π (no photo mirror-flip)', seamOk, `wrap gap = ${maxGap.toExponential(2)} (expect ~0)`);
}
/* POLES: φ→0,π — sinφ→0; the mapping must not produce NaN/garbage UVs */
{
  let polesOk = true;
  for (const phi of [1e-7, Math.PI - 1e-7]) {
    const [u, v] = inv(fwd(1.234, phi));
    if (!isFinite(u) || !isFinite(v)) polesOk = false;
    if (Math.abs(v) > 1e-5 && Math.abs(v - 1) > 1e-5) polesOk = false;
  }
  check('poles map to v∈{0,1}, finite u', polesOk, `v(φ→0)=${inv(fwd(1.234, 1e-7))[1].toFixed(8)}`);
}

/* ==== 2. THE CAPTURE SENTINEL — exact, collision-free ==== */
/* Only the sentinel vec3(−1) may satisfy all three components < −0.99:
   a unit vector's components can't (x²+y²+z² = 1 forbids it). */
{
  const captured = (d: number[]) => d[0] < -0.99 && d[1] < -0.99 && d[2] < -0.99;
  if (!captured([-1, -1, -1])) { failures++; console.log('FAIL  sentinel fires on vec3(-1)'); }
  else console.log('PASS  sentinel fires on vec3(-1)');
  let falsePositives = 0;
  let s = 42;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let k = 0; k < 200000; k++) {
    /* random unit vectors (uniform on sphere) */
    const z = rand() * 2 - 1, t = rand() * TAU, r = Math.sqrt(1 - z * z);
    if (captured([r * Math.cos(t), r * Math.sin(t), z])) falsePositives++;
  }
  check('no unit vector trips the capture test (2×10⁵ samples)', falsePositives === 0, `false positives = ${falsePositives}`);
  /* near-miss: the darkest legit sky direction (0,−1,0) etc. stay safe */
  if (!captured([0, -1, 0]) && !captured([-0.994, -0.1, 0])) console.log('PASS  near-miss directions pass through');
  else { failures++; console.log('FAIL  near-miss directions captured wrongly'); }
}

/* ==== 3. ROUND 19/20 — the ported geodesic engine (dgreenheck, MIT) ==== */
{
  /* Mitchell–Charity LUT spot values: 6600K ≈ white (CIE 1931), 3000K warm,
     1000K deep red — the ported table must agree with the source table. */
  const w = blackbodyColorOf(6600);
  const warm = blackbodyColorOf(3000);
  const red = blackbodyColorOf(1000);
  check('blackbody LUT: 6600K ≈ white', w[0] > 0.94 && w[1] > 0.94 && w[2] > 0.94,
    `rgb(${w.map(v => v.toFixed(3)).join(',')})`);
  check('blackbody LUT: 3000K warm, 1000K deep red',
    warm[0] === 1 && warm[1] > 0.45 && warm[1] < 0.53 && warm[2] < 0.16 && red[1] < 0.05,
    `3000K rgb(${warm.map(v => v.toFixed(2)).join(',')}), 1000K rgb(${red.map(v => v.toFixed(2)).join(',')})`);

  /* ROUND 64 — the verbatim port: his exact physics and the multi-crossing
     halo (docs/PORT-SPEC-webgpu-black-hole.md is the contract) */
  const rmSrc = readFileSync(new URL('../src/engine/blackholeRaymarch.ts', import.meta.url), 'utf8');
  const multiCrossing = /EVERY disk-plane crossing/.test(rmSrc) && /remaining = 1\.0 - alpha/.test(rmSrc);
  const hisConstants = /r < uRs \* 1\.01\)/.test(rmSrc) && /r > 100\.0/.test(rmSrc)
    && /pow\(uDiskInner \/ hitR, uTempFalloff\)/.test(rmSrc)
    && /0\.3 \/ sqrt\(hitR \/ uDiskInner\)/.test(rmSrc)
    && /pow\(1\.0 \/ \(1\.0 - beta \* cosA\), 3\.0 \* uDoppler\)/.test(rmSrc);
  const localFrame = /uDiskBasis \* pPrev/.test(rmSrc) && /uDiskBasis \* p;/.test(rmSrc);
  check('geodesic: multi-crossing halo + front-to-back compositing', multiCrossing, `${multiCrossing}`);
  check('geodesic: his exact constants (1.01·rs capture, 100 escape, T∝(rin/r)^α, β=0.3/√(r/rin), D³)', hisConstants, `${hisConstants}`);
  check('geodesic: disk crossings in the disk-LOCAL frame (uDiskBasis)', localFrame, `${localFrame}`);
  /* his FIXED march step, verbatim — the adaptive-step deviation is gone */
  const fixedStep = /uniform float uStepSize;/.test(rmSrc) && /uStepSize \* uLensing\)/.test(rmSrc)
    && /p \+= v \* uStepSize;/.test(rmSrc) && !/clamp\(r \* 0\.125/.test(rmSrc);
  check('R64: his fixed march step (uStepSize 1.0) — no adaptive stepping', fixedStep, `${fixedStep}`);
  /* his exhaustion semantics: an exhausted ray is ESCAPED (transparent) */
  const hisExhaust = !/budgetOut/.test(rmSrc);
  check('R64: step exhaustion = escaped, his semantics', hisExhaust, `${hisExhaust}`);
}

/* ==== 4. ROUND 20/53 — the presentation fixes + the reference camera ==== */
{
  const rmSrc = readFileSync(new URL('../src/engine/blackholeRaymarch.ts', import.meta.url), 'utf8');
  const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
  const capSrc = readFileSync(new URL('../src/engine/capability.ts', import.meta.url), 'utf8');
  const bpSrc = readFileSync(new URL('../src/engine/blackholeParams.ts', import.meta.url), 'utf8');

  /* ROUND 64 — the port is live again: the renderer-internal pins return.
     SIN 1 — the quad must billboard EVERY frame, inside the per-frame
     uniform updater the engine already calls. */
  const billboard = /updateRaymarchUniforms[\s\S]*?quad\.quaternion\.copy\(_parentQ\)/.test(rmSrc);
  check('R20: quad billboards every frame (updateRaymarchUniforms)', billboard, `${billboard}`);

  /* his TUNED bending, VERBATIM: bend per unit path = rs × lensing, the
     step size cancels; uLensing is his gravitationalLensing (2.4) directly,
     capture rides uRs too. */
  const lensing = /uLensing: \{ value: params\.lensing \}/.test(rmSrc)
    && /uRs \/ \(r \* r\)\) \* uStepSize \* uLensing\)/.test(rmSrc) && /r < uRs \* 1\.01\)/.test(rmSrc);
  check('R20.4: his lensing verbatim — bend/unit = uRs × uLensing, capture 1.01·uRs', lensing, `${lensing}`);

  /* SIN 4 — his gamma step STAYS: his material encodes pow(1/2.2) BEFORE the
     renderer's ACES + sRGB output — exactly our composer's structure (and
     HIS OWN: the spec verified his pipeline double-encodes too). */
  const hisGamma = /pow\(max\(color, vec3\(0\.0\)\), vec3\(1\.0 \/ 2\.2\)\)/.test(rmSrc);
  check('R20: his pipeline gamma step kept (material → bloom → OutputPass)', hisGamma, `${hisGamma}`);

  /* SIN 5 — his RUNTIME config lives in the panel store and feeds the
     uniforms; R64 adds his Peak Temp + Falloff (previously baked). */
  const tuned = /uDiskInner: \{ value: params\.diskInner \}/.test(rmSrc) && /uDiskOuter: \{ value: params\.diskOuter \}/.test(rmSrc)
    && /uDiskTemp: \{ value: params\.diskTemp \}/.test(rmSrc) && /uTempFalloff: \{ value: params\.tempFalloff \}/.test(rmSrc)
    && /uDiskBright: \{ value: params\.brightness \}/.test(rmSrc) && /uRotSpeed: \{ value: params\.rotSpeed \}/.test(rmSrc)
    && /uTurbSharp: \{ value: params\.arcSharpness \}/.test(rmSrc) && /uDoppler: \{ value: params\.doppler \}/.test(rmSrc);
  const fullLut = /clamp\(tempK, 1000\.0, 40000\.0\)/.test(rmSrc) && /90\.0 \+ \(t - 10000\.0\) \* 0\.001/.test(rmSrc);
  const rotSign = /sign\(uRotSpeed\)/.test(rmSrc);
  check('R64: runtime config from the panel store (temp/falloff now tunable)', tuned, `${tuned}`);
  check('R20: LUT reaches 40,000 K (his two-segment table)', fullLut, `${fullLut}`);
  check('R20: Doppler rotation-sign flip present (his disk spins negatively)', rotSign, `${rotSign}`);

  /* R64 — the intensity crutch is GONE: no emission multiplier stands
     between his disk math and the bloom threshold. */
  const noIntensity = !/uIntensity/.test(rmSrc) && !/opts\.intensity/.test(rmSrc);
  check('R64: no intensity multiplier — his disk math feeds the threshold bare', noIntensity, `${noIntensity}`);

  /* unit convention — march in his convention via one scale uniform; uScale
     tracks uRs so uScale·uRs = rs_world */
  const hisUnits = /uScale: \{ value: rs \/ \(params\.mass \* 2\) \}/.test(rmSrc) && /\(uCamPos - uCenter\) \/ uScale/.test(rmSrc)
    && /uRs: \{ value: params\.mass \* 2 \}/.test(rmSrc);
  check('R20.4: unit convention uScale·uRs = rs_world (his mass 0.4 default)', hisUnits, `${hisUnits}`);

  /* the store defaults stay = the reference config (R64 adds temp/falloff) */
  const referenceDefaults = /mass: 0\.4,/.test(bpSrc) && /lensing: 2\.4,/.test(bpSrc)
    && /doppler: 1\.0,/.test(bpSrc) && /diskInner: 4\.1,/.test(bpSrc) && /diskOuter: 14\.5,/.test(bpSrc)
    && /brightness: 5\.0,/.test(bpSrc) && /rotSpeed: -8\.7,/.test(bpSrc)
    && /softInner: 0\.18,/.test(bpSrc) && /arcSharpness: 7\.4,/.test(bpSrc)
    && /diskTemp: 49\.78,/.test(bpSrc) && /tempFalloff: 5\.22,/.test(bpSrc);
  check('R64: store defaults = the reference config (+ softness/sharpness/temp/falloff)', referenceDefaults, `${referenceDefaults}`);

  /* the disk basis (R20.1) + the quad proportions (R57/58) + live tuning */
  const basisFrame = /setFromUnitVectors\(new THREE\.Vector3\(0, 1, 0\), DISK_NORMAL\)/.test(rmSrc)
    && !/setFromUnitVectors\(new THREE\.Vector3\(0, 0, 1\), DISK_NORMAL\)/.test(rmSrc);
  check('R20.1: disk basis maps local +Y to the normal (disk lies flat, X base)', basisFrame, `${basisFrame}`);
  const proportions = /const quadSize = rs \* 64;/.test(rmSrc);
  check('R58: the quad spans the strong field (64·rs)', proportions, `${proportions}`);
  const liveTuning = /window\.addEventListener\(BLACKHOLE_CHANGE_EVENT, onParams\)/.test(rmSrc)
    && /material\.uniforms\.uLensing\.value = p\.lensing;/.test(rmSrc)
    && /window\.removeEventListener\(BLACKHOLE_CHANGE_EVENT, onParams\)/.test(rmSrc);
  check('R20.4: panel events apply live (uniforms, dispose-safe)', liveTuning, `${liveTuning}`);

  /* SIN 6 — Round 55: the disarm swap HIDES the hole itself (one renderer,
     no stand-in; the lattice torii are erased with the old fallback look). */
  const silhouetteSwap = /private setAllGeodesic\(on: boolean\): void \{/.test(engSrc)
    && /visual\.setGeodesic\(on\)/.test(engSrc);
  check('R55: the fallback swap hides the hole itself (no torii, no stand-in)', silhouetteSwap,
    `${silhouetteSwap}`);

  /* the on-by-default policy + its runtime safety nets */
  const policy = /cap\.tier === 'low'/ .test(capSrc) && !/cap\.tier !== 'cinematic'/.test(capSrc);
  const frameGuard = /guardRaymarch\(dt\);/.test(engSrc) && /avg > 0\.055/.test(engSrc)
    && /this\.portal\.phase !== 'idle'/ .test(engSrc);
  const focusClamp = /activeFb\.data\.radius \* 0\.62 \* 7/.test(engSrc);
  check('R20: raymarch on by default (medium+ tier, software excluded)', policy, `${policy}`);
  check('R20: frame-budget circuit breaker wired into tick (portal frames exempt)', frameGuard, `${frameGuard}`);
  check('R20: focus clamp keeps the camera outside the disk inner edge', focusClamp, `${focusClamp}`);

  /* ==== ROUND 60 — the user's found composition (supersedes the R53
     reference camera): focus lands ~31° ABOVE the plane at ~56 rs — the disk
     reads as a tilted ellipse and the stellar belt sweeps around the hole,
     the composition the user photographed and approved. ==== */
  const cinematicFrame = /geodesicHole/.test(engSrc) && /this\.rig\.tPhi = 1\.05;/.test(engSrc)
    && /this\.rig\.setZoomTarget\(0\.25\)/.test(engSrc);
  check('R60: focusing a hole lands the user found composition (56 rs, 31° above plane)', cinematicFrame, `${cinematicFrame}`);
}

/* ==== 5. ROUND 52 — spacetime bending of the BACKGROUND (the star clouds) ==== */
{
  const shSrc = readFileSync(new URL('../src/engine/shaders.ts', import.meta.url), 'utf8');
  const ssSrc = readFileSync(new URL('../src/engine/surface/surfaceShaders.ts', import.meta.url), 'utf8');
  const enSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
  const mgrSrc = readFileSync(new URL('../src/engine/surface/UniverseSurfaceManager.ts', import.meta.url), 'utf8');

  /* The sky's discrete stars are point clouds. Until R52 their materials
     carried no lens uniforms at all, so only the procedural canvas and the
     sky shells bent while the stars the eye actually tracks stayed rigid —
     the sky read flat around a black hole. The helper bends the vertex's
     direction AS SEEN FROM THE CAMERA and preserves its distance (a cloud
     inside an offset group bends wrongly if measured from the origin), and a
     captured direction is mirrored behind the camera so it clips away. */
  const helper = ssSrc.includes('export const LENS_POINT_GLSL')
    && ssSrc.includes('vec3 lensBendWorld(vec3 worldPos)')
    && ssSrc.includes('vec3 delta = worldPos - cameraPosition;')
    && ssSrc.includes('return cameraPosition + bent * dist;')
    && ssSrc.includes('if (lensCaptured(bent)) return cameraPosition - delta;');
  check('R52: star lensing helper bends from the camera, preserves distance, clips capture', helper, String(helper));

  const starBend = shSrc.includes('vec4 wp = modelMatrix * vec4(vp, 1.0);')
    && shSrc.includes('#ifdef LENS_WORLD')
    && shSrc.includes('if (uLensCount > 0) wp.xyz = lensBendWorld(wp.xyz);')
    && shSrc.includes('vec4 mv = viewMatrix * wp;');
  check('R52: every star cloud bends in world space (identity when no lens)', starBend, String(starBend));

  const wired = enSrc.includes('const POINTS_VERT_LENSED')
    && enSrc.includes('#define LENS_WORLD')
    && enSrc.includes('LENS_POINT_GLSL')
    && enSrc.includes('this.surfaceManager.lensUniforms')
    && enSrc.includes('vertexShader: lens ? POINTS_VERT_LENSED : pointsVert, fragmentShader: pointsFrag,');
  check('R52: pointsMaterial receives the shared lens uniforms', wired, String(wired));

  const sharedLens = mgrSrc.includes('public lensUniforms')
    && mgrSrc.includes('uLensCount')
    && mgrSrc.includes('public setLenses');
  check('R52: the lens uniform set is shared across every sky layer', sharedLens, String(sharedLens));
}

/* ==== ROUND 62 — system objects never bend ==== */
{
  const enSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');

  /* THE RIGIDITY LAW — the belt-tear fix: point clouds default to the plain
     vertex shader (no lens defines, no bend) and only the cosmic sky clouds
     opt in with `lens = true`. The belt dust, the inner systems' belt dust,
     the anchor star halos and the inner-star halos must all stay RIGID —
     they are foreground content with an owner, and the capture mirror would
     paint ghost copies of them on the far side of the camera. */
  const rigidDefault = /private makePoints\([\s\S]*?twinkle: boolean, lens = false\)/.test(enSrc)
    && /private pointsMaterial\([\s\S]*?twinkle: boolean, lens = false\)/.test(enSrc)
    && (enSrc.match(/, lens = false/g)?.length ?? 0) === 2;
  check('R62: point clouds default RIGID — lensing is an explicit sky opt-in', rigidDefault, `${rigidDefault}`);

  /* exactly the ten cosmic sky clouds lenize: milky band, marble spiral,
     galaxy disc sprays (both stages), colliding pair, supercluster streams,
     web filaments, web knots, web hubs, cluster star field. The `twinkle,
     lens` pair is always the last two args spelled `bool, bool,` (trailing
     comma) — verified unique across the file; a plain count survives both
     call styles (inline `px, twinkle, lens,` and the trailing-arg form). */
  const optIns = (enSrc.match(/(?:true|false), (?:true|false),/g) ?? []).length;
  check('R62: exactly 10 cosmic sky clouds opted into the lens', optIns === 10, `${optIns}`);

  /* THE CAMERA MEMORY CARRIES ITS SUBJECT — the "the hole is nowhere" bug:
     a saved orbit (theta/phi/zoom) restored around the ORIGIN while the view
     was really orbiting the hole 250 units away. The record must persist the
     focused body id, the boot restore must re-bind it (roster-checked), and
     legacy records without a focus must be discarded, never replayed. */
  const cmSrc = readFileSync(new URL('../src/engine/cameraMemory.ts', import.meta.url), 'utf8');
  const focusMemory = /focusId\?: string \| null/.test(cmSrc)
    && /if \(p\.focusId === undefined\) \{ clearCameraMemory\(\); return null; \}/.test(cmSrc)
    && /focusId: this\.focusId,/.test(enSrc)
    && /remembered\.focusId && this\.bodies\.some/.test(enSrc)
    && /this\.focusId = remembered\.focusId;/.test(enSrc);
  check('R62: the camera memory remembers WHAT it orbited (focus re-bound on boot, legacy records purged)', focusMemory, `${focusMemory}`);
}

/* ==== 6. ROUND 53 — the tier that STAYS: policy fixes + the user's switch ==== */
{
  const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
  const capSrc = readFileSync(new URL('../src/engine/capability.ts', import.meta.url), 'utf8');
  const btSrc = readFileSync(new URL('../src/engine/blackholeTier.ts', import.meta.url), 'utf8');
  const skSrc = readFileSync(new URL('../src/platform/storageKeys.ts', import.meta.url), 'utf8');

  /* THE POLICY FIX — the quality handler tore the geodesic tier down at any
     tier below cinematic (a Version-3 leftover): touching the quality dial
     at medium — the DEFAULT tier — silently killed the lensed renderer for
     the session. Stand-down now happens only when the tier genuinely
     cannot run it, and a round-trip back re-arms it. */
  const policyFix = !/if \(getQualityTier\(\) !== 'cinematic'\)/.test(engSrc)
    && /if \(!canUseRaymarchBlackHole\(\)\) \{/.test(engSrc);
  check('R53: quality changes stand the tier down only when the tier truly cannot run', policyFix, `${policyFix}`);

  /* THE RECOVERABLE BREAKER — exceed the budget → stand down for THIS
     visit; fly away → re-arm; three strikes → permanent (the old one-way
     law, kept as the backstop). The 'on' override skips the breaker. */
  const breaker = /raymarchStoodDown/.test(engSrc) && /raymarchFlaps >= 3/.test(engSrc)
    && /avg > 0\.055/.test(engSrc)
    && /private setAllGeodesic\(on: boolean\): void \{/.test(engSrc)
    && /if \(override === 'on'\) return; \/\* forced: the breaker never stands it down \*\//.test(engSrc);
  check('R53: frame-budget breaker is recoverable (visit stand-down, fly-away re-arm, 3-strike cap)', breaker, `${breaker}`);

  /* THE OVERRIDE — the Studio switch (auto/on/off) gates the tier, drives
     live re-arm/teardown through its event, and is persisted under the
     key registry. 'on' forces past the tier gate but never past a
     software rasterizer. */
  const overrideWired = /const override = getRaymarchOverride\(\);/.test(engSrc)
    && /window\.addEventListener\(RAYMARCH_OVERRIDE_EVENT, this\.onTierOverride\);/.test(engSrc)
    && /window\.removeEventListener\(RAYMARCH_OVERRIDE_EVENT, this\.onTierOverride\);/.test(engSrc)
    && /override === 'on' && !isSoftwareRasterizer\(\)/.test(engSrc);
  const overrideModule = /export type RaymarchOverride = 'auto' \| 'on' \| 'off'/.test(btSrc)
    && /export function setRaymarchStatus/.test(btSrc)
    && skSrc.includes('blackholeTier:');
  check('R53: Cinematic Lensing override wired (attach gate, live events, dispose, key registry)', overrideWired && overrideModule, `wired=${overrideWired} module=${overrideModule}`);

  /* THE STATUS — every tier transition reports itself so the Studio card
     shows what is actually live (no more silent stand-downs). */
  const status = /setRaymarchStatus\('fallback', 'shader-error'\)/.test(engSrc)
    && /setRaymarchStatus\('fallback', 'frame-budget'\)/.test(engSrc)
    && /setRaymarchStatus\(override === 'on' \? 'forced' : 'active', 'attached'\)/.test(engSrc);
  check('R53: tier transitions report status (attach, breaker, shader failure)', status, `${status}`);

  /* capability owns the rasterizer list (no inline duplication) */
  const swOwner = /export function isSoftwareRasterizer\(\): boolean/.test(capSrc)
    && !/includes\('swiftshader'\)/.test(engSrc);
  check('R53: software-rasterizer list lives in capability.ts only', swOwner, `${swOwner}`);
}

/* ==== 7. ROUND 54 — the single-renderer rebuild ==== */
{
  const rmSrc = readFileSync(new URL('../src/engine/blackholeRaymarch.ts', import.meta.url), 'utf8');
  const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');

  /* THE OLD VERSION IS GONE — one renderer, no painted fakes anywhere. */
  const oldGone = !existsSync(new URL('../src/engine/blackhole.ts', import.meta.url));
  check('R54: the flat composite black hole (blackhole.ts) is deleted', oldGone, `${oldGone}`);

  /* ROUND 56/58/64 — escaped rays exit TRANSPARENT: the live sky shows
     through, already bent by its own 1/θ lens (exactly continuous with the
     integrated deflection). Captured rays stay fully opaque: the shadow. */
  const rtLens = !/starField|nebulaField|uStarDensity/.test(rmSrc)
    && /vec3 v = normalize\(vWorld\.xyz - uCamPos\);/.test(rmSrc)
    && /captured \? 1\.0 : clamp\(alpha/.test(rmSrc)
    && !/textureCube/.test(rmSrc);
  check('R56: escaped rays exit transparent — the live bent sky shows through (no procedural sky)', rtLens, `${rtLens}`);

  /* ROUND 59 — NO CAPTURES, NO LAYERS: the sky layers bend themselves (the
     surface manager's 1/θ law), so no second image of the sky exists
     anywhere in the pipeline — no square, no layers, at any distance. */
  const noCapture = !/WebGLCubeRenderTarget|new THREE\.CubeCamera|bgCube|setBgCube|bgScreenRT/.test(engSrc)
    && !/textureCube|uBgCube|uBgScreen|uProjMatrix/.test(rmSrc);
  check('R59: no background captures of any kind — no cubemap, no screen buffer, no layers', noCapture, `${noCapture}`);

  /* ROUND 58 — the sky lens law: the gradual 1/θ decay with NO artificial
     cutoff, scaled by the march's lensing factor (exact continuity with the
     geodesic quad at its edge). Lives in the surface shaders only. */
  const ssSrc = readFileSync(new URL('../src/engine/surface/surfaceShaders.ts', import.meta.url), 'utf8');
  const skyLens = ssSrc.includes('uniform float uLensScale;')
    && !/smoothstep\(m \* 0\.62, m, ang \/ rim\)/.test(ssSrc)
    && /\) \* uLensScale \* uLensBend;/.test(ssSrc);
  check('R58: the sky lens law — gradual 1/θ decay, no cutoff, scaled by the march lensing', skyLens, `${skyLens}`);

  /* NO GLOW SPRITE — it fatted the halo into a blob and washed the arch out;
     the blaze now comes from the damped project bloom (R65: distance-aware —
     his 0.68 at the close encounter, calm baseline in wide views). */
  const noGlow = !/buildGlowTexture/.test(rmSrc) && !/AdditiveBlending/.test(rmSrc)
    && /bloomHoleBoost/.test(engSrc) && /const holeBoostTarget = this\.holeGlowProximity\(\) \* 0\.5;/.test(engSrc);
  check('R54: glow sprite gone; bloom damps toward the reference while a hole is on stage', noGlow, `${noGlow}`);

  /* ROUND 55 — THE FULL ERASE: the geodesic renderer is the only black hole
     renderer that has ever existed. No stand-in sphere, no lattice rings, no
     pulse machinery — when the marcher cannot run, the hole hides itself. */
  const noStandIn = !/buildSilhouette/.test(rmSrc) && !/SphereGeometry/.test(rmSrc)
    && !/latticeMat/.test(engSrc) && !/userData\.spin/.test(engSrc)
    && !/vaultPulse/.test(engSrc) && !/eventide-vault-pulse/.test(engSrc);
  check('R55: full erase — no silhouette sphere, no lattice rings, no pulse machinery', noStandIn, `${noStandIn}`);

  const hidden = /setGeodesic\(on: boolean\)/.test(rmSrc) && /quad\.visible = on;/.test(rmSrc)
    && /private setAllGeodesic\(on: boolean\): void \{/.test(engSrc);
  check('R55: setGeodesic hides the hole itself (one renderer, one switch)', hidden, `${hidden}`);

  /* the portal is a plain camera zoom — the camera dives in toward the world
     and the overlay opens on arrival; the old tear singularity machinery is
     gone entirely */
  const portal = /phase: 'entering', t: 0, fired: false,/.test(engSrc)
    && /this\.cb\.onPortalPeak\(this\.portal\.kind, this\.portal\.bodyId\);/.test(engSrc)
    && !/portalSingularity/.test(engSrc);
  check('R55: the portal is a plain zoom (no tear singularity machinery)', portal, `${portal}`);
}

/* ==== ROUND 61 — the hole is a hole in the surface; the one-law well ==== */
{
  const rmSrc = readFileSync(new URL('../src/engine/blackholeRaymarch.ts', import.meta.url), 'utf8');
  const ssSrc = readFileSync(new URL('../src/engine/surface/surfaceShaders.ts', import.meta.url), 'utf8');
  const usmSrc = readFileSync(new URL('../src/engine/surface/UniverseSurfaceManager.ts', import.meta.url), 'utf8');
  const pdSrc = readFileSync(new URL('../src/engine/surface/photoDome.ts', import.meta.url), 'utf8');

  /* THE SURFACE LAW — the hole paints in the sky band (after the domes at
     -100/-99 and the sky shells at -98, before every stellar-system object
     at 0+), so from no camera angle can it ever appear in front of the
     system. The march itself is untouched (the render-order line is the
     only change to the file's output stage). */
  const surfaceOrder = /quad\.renderOrder = -80;/.test(rmSrc)
    && !/quad\.renderOrder = 12;/.test(rmSrc)
    && /pts\.renderOrder = -98;/.test(usmSrc)
    && /far\.renderOrder = -98;/.test(usmSrc)
    && /near\.renderOrder = -98;/.test(usmSrc);
  check('R61: the hole sits in the sky paint band (-80; shells -98; system 0+) — never in front of the system', surfaceOrder, `${surfaceOrder}`);

  /* ONE WELL LAW — the shared C¹ gradient lives in the shared warp block
     and EVERY sky stage consumes it: the dome, the photo dome and all three
     star shells. The old bespoke dome-only loop is gone (no second law). */
  const oneWell = /float lensWellDarken\(vec3 dir\)/.test(ssSrc)
    && /1\.0 \/ \(x \* x\)/.test(ssSrc)
    && /1\.0 - smoothstep\(3\.1, 4\.0, x\)/.test(ssSrc)
    && /lensWellDarken\(rawD\)/.test(ssSrc)
    && !/wellDarken = max\(wellDarken, 1\.0 - smoothstep\(bcW/.test(ssSrc)
    && /float well = 1\.0 - lensWellDarken\(normalize\(vDir\)\);/.test(pdSrc)
    && /lensWellFactor\(position\)/.test(usmSrc)
    && (usmSrc.match(/lensWellFactor\(position\)/g)?.length ?? 0) === 3;
  check('R61: ONE well law — shared C¹ gradient (zero at 4·b_c) consumed by dome + photo + all shells', oneWell, `${oneWell}`);
}

/* ==== ROUND 61 — the whole universe bends (lensing is not Sol-Prime-only) ==== */
{
  const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');

  /* ONE LENS LAW — every lens (home roster and other galaxies alike) is
     written through the single slot writer: same asin(R/d) rim, same halo
     multiplier, same behind-view cull. The old inline per-body body is gone. */
  const oneLensLaw = /private pushSurfaceLens\(/.test(engSrc)
    && (engSrc.match(/pushSurfaceLens\(/g)?.length ?? 0) >= 4
    && !/lensStrong\[n\] = \(b\.data\.kind/.test(engSrc);
  check('R61: every surface lens obeys ONE slot law (pushSurfaceLens — rim, halo, cull)', oneLensLaw, `${oneLensLaw}`);

  /* CROSS-GALAXY FEED — the lens roster is not just this.bodies: holes in
     other galaxies' isolated inner systems (kind 'vault' with the geodesic
     renderer, built by buildInnerStellarSystem) are fed FIRST (holes before
     ordinary masses), gated by the same node.inner.visible dive gate the
     renderer obeys, and measured in WORLD space through the rotated galaxy
     node (getWorldPosition — a local position would bend the wrong sky). */
  const crossGalaxy = /data\.kind !== 'hole' && b\.data\.kind !== 'vault'/.test(engSrc)
    && /for \(const node of this\.galaxyStageNodes\)/.test(engSrc)
    && /if \(!sys \|\| !node\.inner\.visible\) continue/.test(engSrc)
    && /p\.group\.getWorldPosition\(this\._lensPos\)/.test(engSrc)
    && /ROUND 61 — THE WHOLE UNIVERSE BENDS/.test(engSrc);
  check('R61: inner-system holes of EVERY galaxy lens the sky (holes-first, dive-gated, world-space)', crossGalaxy, `${crossGalaxy}`);
}

/* ================================ verdict ================================ */
console.log(failures === 0 ? '\n● GAUNTLET GREEN — Round 17 math verified' : `\n● ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
