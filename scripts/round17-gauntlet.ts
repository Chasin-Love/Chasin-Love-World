/* Round 17 verification gauntlet — the funnel + photo-lens math mirrored exactly in TS.
   Run: npx tsx scripts/round17-gauntlet.ts */

import { readFileSync } from 'fs';
import { flammDepth } from '../src/engine/blackhole';
import { blackbodyColorOf } from '../src/engine/blackholeRaymarch';

let failures = 0;
function check(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
  if (!ok) failures++;
}

/* ============ 1. THE FLAMM PARABOLOID — the exact 1916 embedding ============ */
/* Flamm 1916: the z(r) that makes the spatial slice of the Schwarzschild
   metric a surface of revolution in flat 3-space. z(r) = 2√(rs(r−rs)). */

/* z(2 rs) = 2 rs — the embedding crosses r=2rs at depth 2rs by construction */
{
  const z = flammDepth(2);
  check('Flamm z(2rs) = 2rs', Math.abs(z - 2) < 1e-12, `z = ${z}`);
}
/* z(5 rs) = 4 rs, z(10 rs) = 6 rs — the √(r−1) law */
{
  const z5 = flammDepth(5), z10 = flammDepth(10);
  check('Flamm z(5rs) = 4rs, z(10rs) = 6rs', Math.abs(z5 - 4) < 1e-12 && Math.abs(z10 - 6) < 1e-12, `z5 = ${z5}, z10 = ${z10}`);
}
/* at the throat (r = rs) the depth is exactly 0 */
{
  check('Flamm z(rs) = 0 (throat at horizon)', flammDepth(1) === 0, `z = ${flammDepth(1)}`);
}
/* strictly monotone — the funnel only deepens inward */
{
  let mono = true;
  for (let k = 1; k < 400; k++) {
    const a = 1 + (k / 400) * 29, b = 1 + ((k + 1) / 400) * 29;
    if (flammDepth(b) <= flammDepth(a)) { mono = false; break; }
  }
  check('Flamm strictly monotone on [1,30]', mono, `z(1)=${flammDepth(1)} → z(30)=${flammDepth(30).toFixed(3)}`);
}
/* the embedding slope matches the isometric requirement dz/dr = √(rs/(r−rs))
   (from d/d√(r−1): the paraboloid has metric dr²/(1−rs/r) + r²dφ²) */
{
  /* numeric derivative of z at r=2 vs analytic √(1/(r−1)) at r=2 */
  const h = 1e-6;
  const dz = (flammDepth(2 + h) - flammDepth(2 - h)) / (2 * h);
  const analytic = Math.sqrt(1 / (2 - 1));
  check('Flamm slope dz/dr = √(rs/(r−rs)) at r=2rs', Math.abs(dz - analytic) / analytic < 1e-5, `numeric ${dz.toFixed(6)} vs analytic ${analytic.toFixed(6)}`);
}
/* far-field: the funnel flattens — z ≈ 2√r grows slower than any linear well */
{
  const s10 = flammDepth(10) / 10, s30 = flammDepth(30) / 30;
  check('Flamm flattens far out (z/r decreasing)', s30 < s10, `z/r at 10rs = ${s10.toFixed(3)}, at 30rs = ${s30.toFixed(3)}`);
}

/* ==== 2. THE PHOTO DOME'S LENS-SPACE EQUIRECT MAPPING (GLSL, mirrored) ==== */
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

/* ==== 3. THE CAPTURE SENTINEL — exact, collision-free ==== */
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

/* ==== 4. THE USER'S TWO LAWS (Round 17.1) — checked against the real source ==== */
{
  const bhSrc = readFileSync(new URL('../src/engine/blackhole.ts', import.meta.url), 'utf8');
  const i = bhSrc.indexOf('fragmentShader');
  const s0 = bhSrc.indexOf('`', i);
  const s1 = bhSrc.indexOf('`', s0 + 1);
  const funnelFrag = bhSrc.slice(s0 + 1, s1);

  /* LAW 2 — the POUR is ALWAYS circular: the ring/flow pattern may depend
     on radius only. (The ±Y light-speed lip is the user's own explicit
     exception — the blast is allowed its lobes; the pour is not.) So: no
     theta, no atan, no remnant of the old XZ plane — and the ring line
     itself must be a pure function of r, uv.y and time. */
  const noAngular = !/\btheta\b/.test(funnelFrag) && !/atan/.test(funnelFrag) && !/vPosRs\.z/.test(funnelFrag);
  const ringMatch = funnelFrag.match(/float ring =([^;]+);/);
  const ringPure = !!ringMatch && !/theta|atan|cos\(|sin\(/.test(ringMatch[1]);
  check('law 2 (circle law): the pour is radius-only', noAngular && ringPure,
    `noAngular=${noAngular} ringPure=${ringPure}`);

  /* LAW 1 — the cone plunges along −Z, INTO the screen: rings built in the
     XY plane (which the billboard aligns with the screen), depth sinking
     along −Z; compact mouth hugging the shadow; camera never inside it. */
  const ringsInXY = /pos\[k \+ 1\] = Math\.sin\(th\) \* rRs \* rs;/.test(bhSrc);
  const throatMinusZ = /pos\[k \+ 2\] = -z \* rs;/.test(bhSrc);
  const billboards = /group\.quaternion\.copy\(camQuat\)/.test(bhSrc);
  const compactMouth = /const R_OUT = 7;/.test(bhSrc);
  const camMelt = /uCamDist/.test(funnelFrag);
  check('law 1 (−Z plunge): XY rings, −Z depth, billboard, compact, camera-melt',
    ringsInXY && throatMinusZ && billboards && compactMouth && camMelt,
    `xy=${ringsInXY} z=${throatMinusZ} bb=${billboards} compact=${compactMouth} melt=${camMelt}`);

  /* THE BLAST — the light-speed lip: white band at the mouth's rim,
     emphasized along ±Y exactly as the user demanded. */
  const blast = /blast \*= 0\.35 \+ 0\.65 \* \(yAxis \* yAxis\);/.test(funnelFrag)
    && /vec3\(1\.05, 1\.0, 0\.92\) \* blast/.test(funnelFrag);
  check('light-speed lip: white ±Y energy blast at the rim', blast, `present=${blast}`);

  /* ROUND 18.1 — the disk and halo are DENSE matter: normal blending, so
     they occlude the sky and read over bright photo backgrounds too. (The
     additive era was invisible over the user's white photo sky.) */
  const diskNormal = /const diskMat = new THREE\.MeshBasicMaterial\(\{[\s\S]*?NormalBlending[\s\S]*?\}\);/.test(bhSrc);
  const haloNormal = /const primaryHalo = new THREE\.Mesh\([\s\S]*?NormalBlending[\s\S]*?\);/.test(bhSrc);
  check('dense-matter blending: disk + lensed halo occlude the sky', diskNormal && haloNormal,
    `disk=${diskNormal} halo=${haloNormal}`);
}

/* ==== 5. ROUND 19/20 — the ported geodesic engine (dgreenheck, MIT) ==== */
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
  const hisConstants = /CAPTURE_R \(RS \* 1\.01\)/.test(rmSrc) && /r > 100\.0/.test(rmSrc)
    && /pow\(uDiskInner \/ hitR, uTempFalloff\)/.test(rmSrc)
    && /0\.3 \/ sqrt\(hitR \/ uDiskInner\)/.test(rmSrc)
    && /pow\(1\.0 \/ \(1\.0 - beta \* cosA\), 3\.0 \* uDoppler\)/.test(rmSrc);
  const localFrame = /uDiskBasis \* pPrev/.test(rmSrc) && /uDiskBasis \* p;/.test(rmSrc);
  const ourSky = !/starfield/.test(rmSrc);
  check('geodesic: multi-crossing halo + front-to-back compositing', multiCrossing, `${multiCrossing}`);
  check('geodesic: his exact constants (1.01·rs capture, 100 escape, T∝(rin/r)^α, β=0.3/√(r/rin), D³)', hisConstants, `${hisConstants}`);
  check('geodesic: disk crossings in the disk-LOCAL frame (uDiskBasis)', localFrame, `${localFrame}`);
  check('geodesic: OUR universe is the background (no procedural starfield)', ourSky, `${ourSky}`);
}

/* ==== 6. ROUND 20 — the presentation fixes (the R19 five sins, reversed) ==== */
{
  const rmSrc = readFileSync(new URL('../src/engine/blackholeRaymarch.ts', import.meta.url), 'utf8');
  const bhSrc = readFileSync(new URL('../src/engine/blackhole.ts', import.meta.url), 'utf8');
  const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
  const capSrc = readFileSync(new URL('../src/engine/capability.ts', import.meta.url), 'utf8');

  /* SIN 1 — the quad must billboard EVERY frame, inside the per-frame
     uniform updater the engine already calls (R19 never copied the camera
     rotation → sheared window, straight-edge clipping, edge-on vanishing). */
  const billboard = /updateRaymarchUniforms[\s\S]*?quad\.quaternion\.copy\(camera\.quaternion\)/.test(rmSrc);
  check('R20: quad billboards every frame (updateRaymarchUniforms)', billboard, `${billboard}`);

  /* SIN 2 — the baked core sphere (depth writer) must hide in cinematic mode
     or it punches a circular clip through the lensed image. */
  const coreHides = /setCinematic\(on\) \{[\s\S]*?core\.visible = !on;[\s\S]*?funnel\.group\.visible = !on;[\s\S]*?\},/.test(bhSrc);
  check('R20: cinematic hides core sphere + funnel (no depth punch-out)', coreHides, `${coreHides}`);

  /* SIN 3 — his TUNED bending pair: per-unit bend = step × lensing must equal
     his runtime 1.0 × 2.4. Our 0.3 step demands 8.0 (R19 paired fallbacks:
     0.3 × 1.5 → 5.3× too weak → flat band, no wrap). */
  const lensing = /uLensing: \{ value: 8\.0 \}/.test(rmSrc) && /stepLen \* uLensing/.test(rmSrc)
    && /clamp\(r \* 0\.125, 1\.0, 4\.0\)/.test(rmSrc);
  check('R20: his tuned bending pair reproduced (0.3 × 8.0 = 1.0 × 2.4)', lensing, `${lensing}`);

  /* SIN 4 — his gamma step STAYS: his material encodes pow(1/2.2) BEFORE the
     renderer's ACES + sRGB output — exactly our composer's structure. */
  const hisGamma = /pow\(max\(color, vec3\(0\.0\)\), vec3\(1\.0 \/ 2\.2\)\)/.test(rmSrc);
  check('R20: his pipeline gamma step kept (material → bloom → OutputPass)', hisGamma, `${hisGamma}`);

  /* SIN 5 — his RUNTIME config verbatim (the demo reference look), plus his
     full LUT range (R19 truncated at 10,000 K; his peak runs 49,780 K). */
  const tuned = /uDiskInner: \{ value: 4\.1 \}/.test(rmSrc) && /uDiskOuter: \{ value: 14\.5 \}/.test(rmSrc)
    && /uDiskTemp: \{ value: 49\.78 \}/.test(rmSrc) && /uTempFalloff: \{ value: 5\.22 \}/.test(rmSrc)
    && /uDiskBright: \{ value: 5\.0 \}/.test(rmSrc) && /uRotSpeed: \{ value: -8\.7 \}/.test(rmSrc)
    && /uTurbSharp: \{ value: 7\.4 \}/.test(rmSrc) && /uLensing: \{ value: 8\.0 \}/.test(rmSrc);
  const fullLut = /clamp\(tempK, 1000\.0, 40000\.0\)/.test(rmSrc) && /90\.0 \+ \(t - 10000\.0\) \* 0\.001/.test(rmSrc);
  const rotSign = /sign\(uRotSpeed\)/.test(rmSrc);
  check('R20: his tuned runtime config verbatim (4.1/14.5/49.78/5.22/5/−8.7/7.4)', tuned, `${tuned}`);
  check('R20: LUT reaches 40,000 K (his two-segment table)', fullLut, `${fullLut}`);
  check('R20: Doppler rotation-sign flip present (his disk spins negatively)', rotSign, `${rotSign}`);

  /* unit convention — march in HIS units (rs = 0.8) via one scale uniform */
  const hisUnits = /uScale: \{ value: rs \* 1\.25 \}/.test(rmSrc) && /\(uCamPos - uCenter\) \/ uScale/.test(rmSrc);
  check('R20: his unit convention (rs = 0.8 shader units, uScale bridge)', hisUnits, `${hisUnits}`);

  /* SIN 6 — a disarmed tier must restore the WHOLE composite + torii. */
  const failureRestore = /disableAllRaymarchHoles\(\): void \{[\s\S]*?setCinematicHole\(b\.group, false\)/.test(engSrc);
  const toriiHide = /if \(rm\) \{ r1\.visible = false; r2\.visible = false; \}/.test(engSrc)
    && /if \(ipRaymarch\) \{ r1\.visible = false; r2\.visible = false; \}/.test(engSrc);
  check('R20: shader failure restores composite + torii (both vault sites)', failureRestore && toriiHide,
    `restore=${failureRestore} torii=${toriiHide}`);

  /* the on-by-default policy + its runtime safety nets */
  const policy = /cap\.tier === 'low'/ .test(capSrc) && !/cap\.tier !== 'cinematic'/.test(capSrc);
  const frameGuard = /guardRaymarch\(dt\);/.test(engSrc) && /avg > 0\.055/.test(engSrc)
    && /this\.portal\.phase !== 'idle'/ .test(engSrc);
  const focusClamp = /activeFb\.data\.radius \* 0\.62 \* 7/.test(engSrc);
  check('R20: raymarch on by default (medium+ tier, software excluded)', policy, `${policy}`);
  check('R20: frame-budget circuit breaker wired into tick (portal frames exempt)', frameGuard, `${frameGuard}`);
  check('R20: focus clamp keeps the camera outside the disk inner edge', focusClamp, `${focusClamp}`);

  /* ==== ROUND 20.1 — the disk lies flat (X-axis base) + dive keeps glory ==== */
  /* THE FRAME FIX: the shader tests the plane on local Y, so the basis must
     map local +Y → the disk normal. R19/R20 built it from (0,0,1)→normal and
     the disk stood VERTICAL in the world XY plane (measured normal ≈ −Z). */
  const basisFrame = /setFromUnitVectors\(new THREE\.Vector3\(0, 1, 0\), DISK_NORMAL\)/.test(rmSrc)
    && !/setFromUnitVectors\(new THREE\.Vector3\(0, 0, 1\), DISK_NORMAL\)/.test(rmSrc);
  check('R20.1: disk basis maps local +Y to the normal (disk lies flat, X base)', basisFrame, `${basisFrame}`);

  /* THE GLORY FIX: no portal fade on the geodesic renderer — in cinematic
     mode it IS the hole; fading it during the vault dive left the bare
     black sphere. */
  const noPortalFade = /mat\.uniforms\.uIntensity\.value = base;/.test(rmSrc)
    && !/Math\.abs\(portal\) \* 1\.2/.test(rmSrc);
  check('R20.1: raymarch keeps full glory through portals (no fade)', noPortalFade, `${noPortalFade}`);
}

/* ================================ verdict ================================ */
console.log(failures === 0 ? '\n● GAUNTLET GREEN — Round 17 math verified' : `\n● ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
