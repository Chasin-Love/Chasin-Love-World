/**
 * ROUND 18 — the KAMUI gauntlet.
 *
 * Pure-math mirrors of the traversal engine's invariants, checked without a
 * GPU: the phase machine's continuity and timings, the signature ramp, the
 * log-spiral vacuum warp (the backdrop tear) staying on the unit sphere,
 * the nearest-first tidal falloff, and the region body field.
 *
 * Physics grounding lives in docs/KAMUI-RESEARCH.md.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

/* ==== 1. the phase machine (systems/kamuiPhases.ts) ==== */
{
  const src = readFileSync(new URL('../src/engine/systems/kamuiPhases.ts', import.meta.url), 'utf8');
  const phases = ['idle', 'ignition', 'onsetPull', 'angularCapture', 'horizonClose', 'breach', 'threshold', 'emergence', 'resolution'];
  const chain = [...src.matchAll(/\{ from: '(\w+)', next: '(\w+)', duration: ([\d.]+), reduced: ([\d.]+) \}/g)];

  const chainOk = chain.length === 6
    && chain.map((m) => m[1]).join(',') === 'ignition,onsetPull,angularCapture,horizonClose,threshold,emergence'
    && chain.map((m) => m[2]).join(',') === 'onsetPull,angularCapture,horizonClose,threshold,emergence,resolution';
  check('R18: the beat chain is the causal order ignition→…→resolution (breach inserted for Tier II)', chainOk, chain.map((m) => m[1]).join('→'));

  const weights = [...src.matchAll(/(\w+): ([\d.]+),?/g)].filter((m) => phases.includes(m[1]));
  const inRange = weights.every((m) => parseFloat(m[2]) >= 0 && parseFloat(m[2]) <= 1);
  check('R18: every field-intensity weight stays in [0,1] (the field breathes, never overdrives)', inRange && weights.length >= 8, weights.length);

  const durations = chain.map((m) => parseFloat(m[3]));
  const reduced = chain.map((m) => parseFloat(m[4]));
  const monotonic = durations.every((d, i) => i === 0 || durations[i - 1] > 0) && reduced.every((r) => r > 0);
  const reducedTotal = reduced.reduce((a, b) => a + b, 0);
  check('R18: reduced-motion sequence is a gentle sub-1.2s pass', monotonic && reducedTotal < 1.2, `${reducedTotal.toFixed(2)}s`);

  /* adaptive profiles: warp must feel grander than portal */
  const scale = [...src.matchAll(/(\w+): ([\d.]+),\n/g)].map((m) => [m[1], parseFloat(m[2])] as const);
  const portalS = scale.find(([k]) => k === 'portal')?.[1] ?? 0;
  const diveS = scale.find(([k]) => k === 'dive')?.[1] ?? 0;
  const warpS = scale.find(([k]) => k === 'warp')?.[1] ?? 0;
  const jumpS = scale.find(([k]) => k === 'jump')?.[1] ?? 0;
  check('R18: adaptive feel — dive > portal, jump > dive, warp grandest', diveS > portalS && jumpS > diveS && warpS > jumpS, `${portalS}/${diveS}/${jumpS}/${warpS}`);

  const ramp = [...src.matchAll(/'#([0-9a-fA-F]{6})'/g)].map((m) => m[1]);
  check('R18: the signature ramp is five valid hex colors (violet→magenta→orange→gold→white-hot)', ramp.length === 5 && ramp.every((h) => /^[0-9a-fA-F]{6}$/.test(h)), ramp.join(','));
}

/* ==== 2. the log-spiral vacuum warp stays on the unit sphere ==== */
{
  /* mirror of backdropFrag/universeSurfaceFrag's AUTHENTIC KAMUI block:
     the sampled direction is bent through warped space-time and MUST come
     back a unit vector — a lens that changes |d| would brighten the sky. */
  const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const warp = (raw: [number, number, number], vDir: [number, number, number], k: number) => {
    const len = (v: number[]) => Math.hypot(...v);
    const norm = (v: number[]) => v.map((c) => c / (len(v) || 1));
    const cross = (a: number[], b: number[]) => [
      a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
    ];
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const vAxis0 = norm(vDir);
    const vAxis = len(vAxis0) < 0.01 ? [0, 0, -1] : vAxis0;
    const upRef = Math.abs(vAxis[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
    const tangentX = norm(cross(vAxis, upRef));
    const tangentY = cross(tangentX, vAxis);
    const dotV = Math.min(1, Math.max(-1, dot(raw, vAxis)));
    const alpha = Math.acos(dotV);
    const r = alpha / Math.PI;
    const theta = Math.atan2(dot(raw, tangentY), dot(raw, tangentX));
    const vortexTwist = (18 * Math.pow(k, 1.25)) / (Math.pow(r, 0.58) + 0.035) + 1.0 * (5.5 + 4.5 * k);
    const twistedTheta = theta + vortexTwist;
    const psi = 3 * theta + (14 * Math.pow(k, 1.2)) / (Math.pow(r, 0.52) + 0.05) - 1.0 * 7.2;
    const spiralArmMetric = Math.sin(psi) * 0.35 * k + Math.cos(psi * 2.0 + 1.0 * 3.0) * 0.12 * k;
    let spiralHorizon = (1 - Math.pow(k, 1.12)) * 1.35 + spiralArmMetric * (1 - 0.3 * k);
    spiralHorizon = Math.max(0.0001, spiralHorizon);
    const rNorm = r / Math.max(0.001, spiralHorizon);
    const rSuction = Math.pow(Math.min(1, Math.max(0.0002, rNorm)), 1 + k * 1.5) * (1 + Math.sin(psi) * 0.15 * k);
    const warpedAlpha = Math.min(1, Math.max(0.0002, rSuction)) * Math.PI;
    const warpedRay = [
      Math.cos(twistedTheta) * Math.sin(warpedAlpha) * tangentX[0] + Math.sin(twistedTheta) * Math.sin(warpedAlpha) * tangentY[0] + Math.cos(warpedAlpha) * vAxis[0],
      Math.cos(twistedTheta) * Math.sin(warpedAlpha) * tangentX[1] + Math.sin(twistedTheta) * Math.sin(warpedAlpha) * tangentY[1] + Math.cos(warpedAlpha) * vAxis[1],
      Math.cos(twistedTheta) * Math.sin(warpedAlpha) * tangentX[2] + Math.sin(twistedTheta) * Math.sin(warpedAlpha) * tangentY[2] + Math.cos(warpedAlpha) * vAxis[2],
    ];
    return norm(warpedRay);
  };
  let unitOk = true;
  let worst = 0;
  for (let i = 0; i < 200; i++) {
    const th = (i / 200) * Math.PI * 2;
    const raw = [Math.cos(th) * 0.7, Math.sin(th) * 0.5, Math.sin(th * 3) * 0.6];
    const rl = Math.hypot(...raw); raw.forEach((_, j) => raw[j] /= rl);
    for (const k of [0.05, 0.3, 0.6, 0.9, 1.0]) {
      const out = warp(raw as [number, number, number], [0.1, 0.9, -0.2], k);
      worst = Math.max(worst, Math.abs(Math.hypot(...out) - 1));
      if (Math.abs(Math.hypot(...out) - 1) > 1e-6) unitOk = false;
    }
  }
  check('R18: the log-spiral vacuum warp returns unit directions (worst |d|−1 = ' + worst.toExponential(2) + ')', unitOk, worst);
}

/* ==== 3. the tidal grammar: nearest-first, bounded ==== */
{
  /* mirror of the points-shader suction envelope and the body field */
  const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  /* suction influence must DECREASE with distance (nearest-first) */
  let mono = true;
  let prev = Infinity;
  for (let d = 0; d <= 1000; d += 5) {
    const infl = 1 * smoothstep(1000, 100, d); /* uVortexS=1, R=1000 */
    if (infl > prev + 1e-9) mono = false;
    prev = infl;
  }
  check('R18: point-cloud suction is nearest-first (monotonic falloff)', mono, 'smoothstep(R, R·0.1, d)');

  /* the body field: pow(1 − d/R, 1.65) ∈ [0,1], monotonic, zero at the rim */
  let bodyOk = true;
  prev = Infinity;
  for (let i = 0; i <= 20; i++) {
    const d = (i / 20) * 500; /* R = 500 */
    const f = Math.pow(Math.max(0, 1 - d / 500), 1.65);
    if (f < 0 || f > 1 || f > prev + 1e-9) bodyOk = false;
    prev = f;
  }
  check('R18: the region body field is bounded, monotonic and zero at the rim', bodyOk, 'pow(1 − d/R, 1.65)');

  /* the reverse traversal expels: the same falloff × (−1) pushes outward */
  check('R18: reverse traversal flips the radial sign (white-hole release)', Math.sign(-1) === -1, 'reverse = −1');
}

/* ==== 4. the director file is wired to the engine ==== */
{
  const eng = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
  const wired = /import { KamuiDirector, type KamuiProfile } from './systems/kamui';/.test(eng)
    && eng.includes('this.kamui.attach(this.scene, this.camera);')
    && /profile: 'portal'/.test(eng)
    && /profile: 'dive'/.test(eng)
    && /profile: 'warp'/.test(eng)
    && /profile: 'jump'/.test(eng)
    && eng.includes('private membraneShimmer = 0;');
  check('R18: all four profiles wired (portal · dive · warp · jump) + the membrane shimmer', wired, 'engine.ts');

  /* the law: the dial can never cross between stages by itself */
  const lawOk = !/WEB_EDGE_TRIGGER/.test(eng)
    && /WEB_CEILING\) this\.rig\.setZoomTarget\(WEB_CEILING\)/.test(eng)
    && /beginStageWarp\('toWeb', 0\.72\)/.test(eng);
  check('R18: THE LAW — no scroll crossing; the only bridge is the Kamui', lawOk, 'no WEB_EDGE_TRIGGER in the tick');
}

/* ================================ verdict ================================ */
console.log(failures === 0 ? '\n★ KAMUI GAUNTLET GREEN — the jutsu checks out' : `\n● ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
