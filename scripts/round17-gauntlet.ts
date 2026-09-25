/* Round 17 verification gauntlet — the funnel + photo-lens math mirrored exactly in TS.
   Run: npx tsx scripts/round17-gauntlet.ts */

import { readFileSync } from 'fs';
import { flammDepth } from '../src/engine/blackhole';

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
}

/* ================================ verdict ================================ */
console.log(failures === 0 ? '\n● GAUNTLET GREEN — Round 17 math verified' : `\n● ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
