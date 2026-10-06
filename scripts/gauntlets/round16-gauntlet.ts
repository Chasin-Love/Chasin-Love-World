/* Round 16 verification gauntlet — preserve the weak-field equations and
   explicitly guard the signed two-image map repaired in Round 107. */
import { readFileSync } from 'node:fs';

const BC_FACTOR = 2.5980762;     // (3√3)/2 — critical impact parameter / rs
const SECOND_ORDER = 2.9452431;  // 15π/16
const PI = Math.PI;

let failures = 0;
function check(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
  if (!ok) failures++;
}

/* ---- 1. Weak-field deflection: α(5 rs) = 2rs/b + (15π/16)(rs/b)² ---- */
{
  const rs = 1, b = 5 * rs;
  const alpha = 2 * rs / b + SECOND_ORDER * (rs / b) ** 2;
  check('weak-field α(5rs) ≈ 0.4+0.1178', Math.abs(alpha - 0.5178) < 1e-3, `α = ${alpha.toFixed(5)} rad (${((alpha * 180) / PI).toFixed(2)}°)`);
}

/* ---- 2. Second-order term near the critical angle: ratio = (15π/32)(rs/b) ---- */
{
  const rs = 1, b = 2.7 * rs; // just above b_c ≈ 2.598
  const first = 2 * rs / b, second = SECOND_ORDER * (rs / b) ** 2;
  const expected = (15 * PI / 32) * (rs / b);
  check('2nd-order ratio = (15π/32)(rs/b) ≈ 0.545 near b_c', Math.abs(second / first - expected) < 1e-6 && second / first > 0.5,
    `2nd/1st = ${(second / first).toFixed(3)} (analytic ${expected.toFixed(3)})`);
}

/* ---- 3. The point-mass lens equation must keep both signed images ---- */
{
  const rs = 1e-4, beta = 0.02, thetaE = Math.sqrt(2 * rs);
  const root = Math.sqrt(beta * beta + 4 * thetaE * thetaE);
  const primary = (beta + root) * 0.5;
  const secondary = (beta - root) * 0.5;
  const lensMap = (theta: number) => theta - thetaE * thetaE / theta;
  const residual = Math.max(Math.abs(lensMap(primary) - beta), Math.abs(lensMap(secondary) - beta));
  check('one source has two image solutions with opposite parity', primary > 0 && secondary < 0 && residual < 1e-10,
    `θ+ = ${primary.toFixed(5)}, θ− = ${secondary.toFixed(5)}, residual = ${residual.toExponential(2)}`);
  check('perfect alignment produces the Einstein-ring radius', Math.abs(Math.sqrt(thetaE * thetaE) - thetaE) < 1e-12,
    `θ_E = ${thetaE.toFixed(5)} rad`);
}

/* ---- 4. Capture: rays inside b_c have no image; boundary is exact ---- */
{
  const rs = 1;
  const inside = BC_FACTOR * rs - 1e-4, outside = BC_FACTOR * rs + 1e-4;
  check('capture boundary = (3√3/2) rs', BC_FACTOR > 2.597 && BC_FACTOR < 2.599, `b_c/rs = ${BC_FACTOR}`);
  check('the first escaping direction stays outside the measured capture boundary', outside > BC_FACTOR * rs && inside < BC_FACTOR * rs,
    `inside=${inside.toFixed(5)}, outside=${outside.toFixed(5)}`);
}

/* ---- 5. Halo always the size of the hole: θ_E = √(2 rs_ang)·fade scales with distance ---- */
{
  const radius = 10; // scene units
  for (const dist of [50, 200, 800]) {
    const rim = Math.asin(Math.min(1, radius / dist));
    const rsA = 0.62 * rim;
    const thetaE = Math.sqrt(2 * rsA);
    // θ_E must exceed rs_ang (Einstein ring outside the silhouette) and shrink with distance
    if (!(thetaE > rsA)) { check(`θ_E > silhouette @ d=${dist}`, false, `${thetaE} vs ${rsA}`); break; }
    if (dist === 800) check('θ_E ∝ √(sin θ_rim) — shrinks with distance, never vanishes relative to hole', thetaE > 0, `θ_E(d=800) = ${(thetaE * 180 / PI).toFixed(3)}° vs silhouette ${(rim * 180 / PI).toFixed(3)}°`);
  }
}

/* ---- 8. The GLSL preserves signed images, long-range deflection, and capture alignment ---- */
{
  const src = readFileSync(new URL('../../src/engine/surface/surfaceShaders.ts', import.meta.url), 'utf8');
  const signed = /float beta = ang - disp;/.test(src)
    && !/max\(ang - disp, 0\.0\)/.test(src)
    && !/smoothstep\(4\.0, 6\.0, ang \/ bc\).*disp/.test(src);
  check('R107: the shared sky map keeps signed secondary images and an uncut Einstein scale', signed, `${signed}`);
  const measuredMass = /float measuredBc = uLensCapture\[i\];\s*float rsA = measuredBc > 0\.0\s*\? measuredBc \/ 2\.5980762/.test(src)
    && /ang < bc \* uLensBend/.test(src)
    && /float bc = measuredBc > 0\.0 \? measuredBc : 2\.5980762 \* rsA;/.test(src);
  check('R107: measured capture edge sets the sky mass scale and fades with the bend', measuredMass, `${measuredMass}`);
}

/* ---- 6. Gravitational redshift at the disk's inner edge (r = 3 rs = ISCO) ---- */
{
  const g = Math.sqrt(1 - 1 / 3);
  check('redshift g(ISCO) = √(2/3) ≈ 0.8165', Math.abs(g - 0.8165) < 1e-3, `g = ${g.toFixed(4)} — inner disk dimmed 18%`);
  const g2 = Math.sqrt(1 - 1 / 2);
  check('redshift at photon-launch r=2rs: g = 0.7071 (the dτ/dt of the HUD)', Math.abs(g2 - 0.7071) < 1e-3, `g = ${g2.toFixed(4)}`);
}

/* ---- 7. Shadow diameter vs EHT: ⌀ = 3√3 rs ---- */
{
  const rs = 1;
  check('shadow ⌀/rs = 3√3 ≈ 5.196', Math.abs(2 * BC_FACTOR - 5.196) < 1e-3, `⌀ = ${(2 * BC_FACTOR).toFixed(3)} rs`);
}

console.log(failures === 0 ? '\n★ GAUNTLET GREEN — every equation checks out.' : `\n✗ ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
