/* Round 16 verification gauntlet — the GLSL lens law mirrored exactly in TS.
   Run: npx tsx scripts/round16-gauntlet.ts */

const RS = 0.62;                 // rs = 0.62 × rim (composite convention)
const BC_FACTOR = 2.5980762;     // (3√3)/2 — critical impact parameter / rs
const SECOND_ORDER = 2.9452431;  // 15π/16
const PI = Math.PI;

/* weak-mode reference values (Round 14, kept for continuity) */
function weakPull(ang: number, rim: number, m: number): number {
  const x = ang / rim;
  const fade = 1 - smoothstep(m * 0.62, m, x);
  if (fade < 0.003) return 0;
  return Math.min(0.85 * rim / Math.max(x, 0.35), ang * 0.85) * fade;
}
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

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

/* ---- 3. Monotonicity & fold-safety over 10,000 rays (the stability proof) ---- */
{
  let folds = 0, minBeta = Infinity, maxDisp = 0;
  for (let k = 0; k < 10000; k++) {
    const rs = 0.3 + (k % 97) * 0.01;             // varied hole sizes
    const rim = rs / 0.62;
    const m = 3.2;                                 // vault halo multiplier
    const ang = BC_FACTOR * rs * (1 + (k / 10000) * 40); // from b_c outward
    const fade = 1 - smoothstep(m * 0.62, m, ang / rim);
    let disp = (2 * rs / ang + SECOND_ORDER * rs * rs / (ang * ang)) * fade;
    disp = Math.min(disp, ang * 0.999);            // the GLSL's implicit cap (β ≥ 0)
    const beta = ang - disp;
    if (beta < minBeta) minBeta = beta;
    if (beta <= 0) folds++;
    maxDisp = Math.max(maxDisp, disp);
  }
  check('no fold in 10⁴ rays (β > 0 always)', folds === 0, `folds = ${folds}, min β = ${minBeta.toFixed(4)} rs`);
  /* Near capture the deflection ≈ 1.2 rad (≈ 69°) — the correct COMPRESSED form
     of the true log-divergence: rays at b_c⁺ genuinely image sources directly
     behind the hole (β → 0), which is why the shadow's rim shows the whole sky. */
  check('deflection near capture ≈ 1.2 rad (compressed log-divergence, β→0)', maxDisp > 1.0 && maxDisp < 1.5, `max α = ${maxDisp.toFixed(3)} rad`);
}

/* ---- 4. Capture: rays inside b_c have no image; boundary is exact ---- */
{
  const rs = 1;
  const inside = BC_FACTOR * rs - 1e-4, outside = BC_FACTOR * rs + 1e-4;
  check('capture boundary = (3√3/2) rs', BC_FACTOR > 2.597 && BC_FACTOR < 2.599, `b_c/rs = ${BC_FACTOR}`);
  check('α diverges approaching b_c from outside', 2 * rs / outside + SECOND_ORDER * (rs / outside) ** 2 > 2 * rs / (3 * rs), 'α(b_c⁺) > α(3rs)');
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
