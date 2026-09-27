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

  /* the shader must carry his exact physics and the multi-crossing halo */
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
}

/* ==== 4. ROUND 20/53 — the presentation fixes + the reference camera ==== */
{
  const rmSrc = readFileSync(new URL('../src/engine/blackholeRaymarch.ts', import.meta.url), 'utf8');
  const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
  const capSrc = readFileSync(new URL('../src/engine/capability.ts', import.meta.url), 'utf8');
  const bpSrc = readFileSync(new URL('../src/engine/blackholeParams.ts', import.meta.url), 'utf8');

  /* SIN 1 — the quad must billboard EVERY frame, inside the per-frame
     uniform updater the engine already calls (R19 never copied the camera
     rotation → sheared window, straight-edge clipping, edge-on vanishing). */
  const billboard = /updateRaymarchUniforms[\s\S]*?quad\.quaternion\.copy\(_parentQ\)/.test(rmSrc);
  check('R20: quad billboards every frame (updateRaymarchUniforms)', billboard, `${billboard}`);

  /* SIN 3 — his TUNED bending, VERBATIM: his per-step bend is
     (rs/r²)·stepSize·lensing — the SAME form as ours — so bend per unit
     path = rs × lensing and the step size CANCELS. uLensing is therefore
     his gravitationalLensing (2.4) directly, and capture rides uRs too.
     (R20's 8.0 equated per-step products, forgot his step is 3.33× longer
     and bent light 2.75× too hard — bloated shadow, donut disk. R19 paired
     fallbacks → far too weak → flat band, no wrap.) */
  const lensing = /uLensing: \{ value: params\.lensing \}/.test(rmSrc) && /stepLen \* uLensing/.test(rmSrc)
    && /clamp\(r \* 0\.125, 1\.0, 4\.0\)/.test(rmSrc)
    && /uRs \/ \(r \* r\)\) \* stepLen \* uLensing/.test(rmSrc) && /r < uRs \* 1\.01\)/.test(rmSrc);
  check('R20.4: his lensing verbatim — bend/unit = uRs × uLensing, capture 1.01·uRs', lensing, `${lensing}`);

  /* SIN 4 — his gamma step STAYS: his material encodes pow(1/2.2) BEFORE the
     renderer's ACES + sRGB output — exactly our composer's structure. */
  const hisGamma = /pow\(max\(color, vec3\(0\.0\)\), vec3\(1\.0 \/ 2\.2\)\)/.test(rmSrc);
  check('R20: his pipeline gamma step kept (material → bloom → OutputPass)', hisGamma, `${hisGamma}`);

  /* SIN 5 — his RUNTIME config (the demo reference look) now lives in the
     blackholeParams store (defaults = his panel values) and feeds the
     uniforms; the non-panel numbers stay baked. Plus his full LUT range
     (R19 truncated at 10,000 K; his peak runs 49,780 K). */
  const tuned = /uDiskInner: \{ value: params\.diskInner \}/.test(rmSrc) && /uDiskOuter: \{ value: params\.diskOuter \}/.test(rmSrc)
    && /uDiskTemp: \{ value: 49\.78 \}/.test(rmSrc) && /uTempFalloff: \{ value: 5\.22 \}/.test(rmSrc)
    && /uDiskBright: \{ value: params\.brightness \}/.test(rmSrc) && /uRotSpeed: \{ value: params\.rotSpeed \}/.test(rmSrc)
    && /uTurbSharp: \{ value: 7\.4 \}/.test(rmSrc) && /uDoppler: \{ value: params\.doppler \}/.test(rmSrc);
  const referenceDefaults = /mass: 0\.4,/.test(bpSrc) && /lensing: 2\.4,/.test(bpSrc)
    && /doppler: 1\.0,/.test(bpSrc) && /diskInner: 4\.1,/.test(bpSrc) && /diskOuter: 14\.5,/.test(bpSrc)
    && /brightness: 5\.0,/.test(bpSrc) && /rotSpeed: -8\.7,/.test(bpSrc);
  const fullLut = /clamp\(tempK, 1000\.0, 40000\.0\)/.test(rmSrc) && /90\.0 \+ \(t - 10000\.0\) \* 0\.001/.test(rmSrc);
  const rotSign = /sign\(uRotSpeed\)/.test(rmSrc);
  check('R20.4: runtime config from the panel store (49.78/5.22/7.4 baked)', tuned, `${tuned}`);
  check('R20.4: store defaults = the reference config (0.4/2.4/1.0/4.1/14.5/5/−8.7)', referenceDefaults, `${referenceDefaults}`);
  check('R20: LUT reaches 40,000 K (his two-segment table)', fullLut, `${fullLut}`);
  check('R20: Doppler rotation-sign flip present (his disk spins negatively)', rotSign, `${rotSign}`);

  /* unit convention — march in his convention via one scale uniform; R20.4
     restored his mass 0.4 (rs 0.8) as the live uRs default, and uScale
     tracks it so uScale·uRs = rs_world */
  const hisUnits = /uScale: \{ value: rs \/ \(params\.mass \* 2\) \}/.test(rmSrc) && /\(uCamPos - uCenter\) \/ uScale/.test(rmSrc)
    && /uRs: \{ value: params\.mass \* 2 \}/.test(rmSrc);
  check('R20.4: unit convention uScale·uRs = rs_world (his mass 0.4 default)', hisUnits, `${hisUnits}`);

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

  /* ==== ROUND 20.1 — the disk lies flat (X-axis base) + dive keeps glory ==== */
  const basisFrame = /setFromUnitVectors\(new THREE\.Vector3\(0, 1, 0\), DISK_NORMAL\)/.test(rmSrc)
    && !/setFromUnitVectors\(new THREE\.Vector3\(0, 0, 1\), DISK_NORMAL\)/.test(rmSrc);
  check('R20.1: disk basis maps local +Y to the normal (disk lies flat, X base)', basisFrame, `${basisFrame}`);

  const noPortalFade = /mat\.uniforms\.uIntensity\.value = base;/.test(rmSrc)
    && !/Math\.abs\(portal\) \* 1\.2/.test(rmSrc);
  check('R20.1: raymarch keeps full glory through portals (no fade)', noPortalFade, `${noPortalFade}`);

  /* ==== ROUND 53 — the reference camera (supersedes the R20.2 constants):
     focus lands 25.8 rs out, 13.9° BELOW the plane — the geometry that
     reproduces his demo screenshot's wrapped arcs. ==== */
  const hotIntensity = /opts\.intensity \?\? 1\.35/.test(rmSrc);
  const cinematicFrame = /geodesicHole/.test(engSrc) && /this\.rig\.tPhi = 1\.814;/.test(engSrc)
    && /this\.rig\.setZoomTarget\(0\.1934\)/.test(engSrc);
  check('R20.2: default intensity 1.35 (band feeds the bloom threshold)', hotIntensity, `${hotIntensity}`);
  check('R53: focusing a hole frames the reference camera (25.8 rs, 14° below plane)', cinematicFrame, `${cinematicFrame}`);

  /* ==== ROUND 20.4 — reference restore + live tuning panel ==== */
  const proportions = /uRs: \{ value: params\.mass \* 2 \}/.test(rmSrc) && /const quadSize = rs \* 60;/.test(rmSrc);
  check('R20.4: live uRs (mass × 2) + 60 rs quad (disk stays framed)', proportions, `${proportions}`);
  const liveTuning = /window\.addEventListener\(BLACKHOLE_CHANGE_EVENT, onParams\)/.test(rmSrc)
    && /quad\.scale\.setScalar\(Math\.max\(1, 34 \/ \(60 \* shaderRs\)\)\)/.test(rmSrc)
    && /window\.removeEventListener\(BLACKHOLE_CHANGE_EVENT, onParams\)/.test(rmSrc);
  check('R20.4: panel events apply live (uniforms + quad rescale, dispose-safe)', liveTuning, `${liveTuning}`);
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
    && shSrc.includes('if (uLensCount > 0) wp.xyz = lensBendWorld(wp.xyz);')
    && shSrc.includes('vec4 mv = viewMatrix * wp;');
  check('R52: every star cloud bends in world space (identity when no lens)', starBend, String(starBend));

  const wired = enSrc.includes('const POINTS_VERT_LENSED')
    && enSrc.includes('LENS_POINT_GLSL')
    && enSrc.includes('this.surfaceManager.lensUniforms')
    && enSrc.includes('vertexShader: POINTS_VERT_LENSED, fragmentShader: pointsFrag,');
  check('R52: pointsMaterial receives the shared lens uniforms', wired, String(wired));

  const sharedLens = mgrSrc.includes('public lensUniforms')
    && mgrSrc.includes('uLensCount')
    && mgrSrc.includes('public setLenses');
  check('R52: the lens uniform set is shared across every sky layer', sharedLens, String(sharedLens));
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

  /* HIS BACKGROUND — the piece R20 dropped: stars + nebula sampled with the
     FINAL bent ray direction. That is the streaking around the shadow. */
  const bg = /vec3 starField\(vec3 rd\)/.test(rmSrc) && /vec3 nebulaField\(vec3 rd\)/.test(rmSrc)
    && /starField\(v\) \+ nebulaField\(v\)/.test(rmSrc)
    && /uStarDensity/.test(rmSrc) && /uStarBright/.test(rmSrc);
  check('R54: his starfield + nebula ride the escaped bent rays (shipped config)', bg, `${bg}`);

  /* THE SEAM LAW — his sky is weighted by the ray's impact parameter: full
     bent sky near the hole, our universe beyond the fade; far rays skip the
     march entirely (bending cannot pull them onto the disk). */
  const seam = /length\(cross\(p, v\)\)/.test(rmSrc)
    && /1\.0 - smoothstep\(uBgInner, uBgOuter, b\)/.test(rmSrc)
    && /if \(b <= uBgInner\) \{/.test(rmSrc);
  check('R54: bent sky weighted by impact parameter; far rays skip the march', seam, `${seam}`);

  /* NO GLOW SPRITE — it fatted the halo into a blob and washed the arch out;
     the blaze now comes from the damped project bloom. */
  const noGlow = !/buildGlowTexture/.test(rmSrc) && !/AdditiveBlending/.test(rmSrc)
    && /bloomHoleBoost/.test(engSrc) && /this\.raymarchOnStage\(\) \? 0\.42 : 0/.test(engSrc);
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

  /* the portal tear's singularity is the geodesic renderer too, driven by
     the late-tick pass like every other hole and popped on clear */
  const portal = /geodesic: override !== 'off' && capable/.test(engSrc)
    && /this\.blackHoles\.push\(visual\);/.test(engSrc)
    && /this\.blackHoles\.splice\(i, 1\);/.test(engSrc);
  check('R55: the portal tear singularity is the geodesic renderer, driven like every hole', portal, `${portal}`);
}

/* ================================ verdict ================================ */
console.log(failures === 0 ? '\n● GAUNTLET GREEN — Round 17 math verified' : `\n● ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
