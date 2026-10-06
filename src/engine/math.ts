import * as THREE from 'three';

/**
 * Shared math helpers for the cosmos engine.
 * Previously re-implemented in engine.ts, cameraRig.ts and blackhole.ts.
 */

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Frame-rate-independent exponential damping: `1 − e^(−λ·dt)`. */
export const damp = (cur: number, target: number, lambda: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-lambda * dt));

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Soft window over a distance: 1 inside [inA,inB], easing to 0 by outA/outB. */
export function windowFn(d: number, inA: number, inB: number, outA: number, outB: number): number {
  return smoothstep(inA, inB, d) * (1 - smoothstep(outA, outB, d));
}

/* tiny CPU noise for terrain displacement */
export function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function cpuFbm(x: number, y: number): number {
  let f = 0, amp = 0.5, fx = x, fy = y;
  for (let i = 0; i < 4; i++) { f += amp * (vnoise(fx, fy) * 2 - 1); fx *= 2.07; fy *= 2.03; amp *= 0.5; }
  return f;
}

/**
 * Circular soft radial gradient canvas texture for star/glow sprites.
 * Canonical variant: transparent outside the circle, no mipmaps, linear filtering.
 */
export function makeGlowTexture(size: number, stops: [number, string][]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, size, size);
  const half = size / 2;
  const radius = half - 1;
  const grad = g.createRadialGradient(half, half, 0, half, half, radius);
  stops.forEach(([p, col]) => grad.addColorStop(p, col));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(half, half, radius, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}
