/* KAMUI BEND — the DOM twin of the vortex shader's tidal shear.
 *
 * The forward Kamui bends the ANCHOR STAR because the GLSL pass displaces
 * every pixel by a DIFFERENT amount: a spiral twist and an inward pull, both
 * falling off with distance from the tear (fall = exp(-k·r/R)). Rigid CSS
 * transforms (rotate / skew / scale) can never reproduce that — a rectangle
 * stays a parallelogram, which reads as "tilting". This module drives a real
 * per-pixel warp for the swallowed overlay (diary, vault) via an SVG
 * feDisplacementMap: a generated displacement map stores the vortex field
 * centered on the tear's screen position, and an animated `scale` deepens
 * the bend over the 0.8s swallow — the card smears like taffy while the
 * rigid kamui-suck spiral carries it into the tear.
 *
 * Encoding: displacement maps store WHERE TO SAMPLE FROM — for each output
 * position q the source pixel that lands there — so the map holds the
 * INVERSE of the forward field. Both twist and pull are radial functions
 * (constant on circles), so the inverse is the same field run backwards:
 * rotate by the opposite angle, divide the radius by the pull factor.
 * Channels are normalized to the field's own maximum and read back with
 * color-interpolation-filters="sRGB", so scale = 2·Dmax renders the designed
 * field at exactly 1:1 strength.
 */

const MAP_W = 480;
const MAP_H = 270;

/** the field: twist (radians) and pull (fraction of radius) at the tear's
    mouth, both multiplied by fall = exp(-FIELD_FALLOFF · r/R) */
const TWIST_RAD = 2.1;
const PULL = 0.45;
const FIELD_FALLOFF = 3.2;

/** rendered bend strength: 1 renders the designed field 1:1 at the peak of
    the swallow; the scale cap keeps extreme viewports sane */
const BEND_STRENGTH = 0.85;
const SCALE_CAP = 720;

const SWALLOW_MS = 800;

let raf = 0;

function el<T extends Element>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/** Build the displacement map for this tear position and arm the filter.
    No-op (graceful) when the SVG plumbing is missing. */
export function armKamuiBend(vortexPx: { x: number; y: number }): void {
  const map = el<SVGFEImageElement>('kamui-bend-map');
  const displace = el<SVGFEDisplacementMapElement>('kamui-bend-displace');
  const filter = el<SVGFilterElement>('kamui-bend');
  if (!map || !displace || !filter) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const R = 0.55 * Math.max(vw, vh);

  const canvas = document.createElement('canvas');
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = ctx.createImageData(MAP_W, MAP_H);
  const data = img.data;
  let dMax = 1;
  const dxs = new Float32Array(MAP_W * MAP_H);
  const dys = new Float32Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const px = ((x + 0.5) / MAP_W) * vw;
      const py = ((y + 0.5) / MAP_H) * vh;
      const dx = px - vortexPx.x;
      const dy = py - vortexPx.y;
      const fall = Math.exp(-FIELD_FALLOFF * (Math.hypot(dx, dy) / R));
      const ang = -TWIST_RAD * fall; /* the eject spins the other way */
      const invPull = 1 / Math.max(0.1, 1 - PULL * fall);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const sx = vortexPx.x + (dx * cos - dy * sin) * invPull;
      const sy = vortexPx.y + (dx * sin + dy * cos) * invPull;
      let Dx = sx - px;
      let Dy = sy - py;
      const mag = Math.hypot(Dx, Dy);
      if (mag > R) { Dx *= R / mag; Dy *= R / mag; }
      const i = y * MAP_W + x;
      dxs[i] = Dx;
      dys[i] = Dy;
      if (mag > dMax) dMax = mag;
    }
  }
  for (let i = 0; i < MAP_W * MAP_H; i++) {
    const j = i * 4;
    data[j] = 128 + (dxs[i] / dMax) * 127;
    data[j + 1] = 128 + (dys[i] / dMax) * 127;
    data[j + 2] = 128;
    data[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const url = canvas.toDataURL('image/png');
  map.setAttribute('href', url);
  map.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
  map.setAttribute('x', '0');
  map.setAttribute('y', '0');
  map.setAttribute('width', String(vw));
  map.setAttribute('height', String(vh));
  /* the filter region gets margin so smeared pixels survive at the edges */
  filter.setAttribute('x', '-160');
  filter.setAttribute('y', '-160');
  filter.setAttribute('width', String(vw + 320));
  filter.setAttribute('height', String(vh + 320));
  displace.setAttribute('scale', '0');
  displace.dataset.peak = String(Math.min(SCALE_CAP, 2 * dMax * BEND_STRENGTH));
}

/** Animate the bend over the swallow: gentle at first, ripping as the card
    goes down the throat. Safe to call repeatedly — the previous loop is
    replaced. */
export function playKamuiBend(durationMs = SWALLOW_MS): void {
  stopKamuiBend();
  const displace = el<SVGFEDisplacementMapElement>('kamui-bend-displace');
  if (!displace) return;
  const peak = Number(displace.dataset.peak ?? 0);
  if (!(peak > 0)) return;
  const t0 = performance.now();
  const step = () => {
    const t = Math.min(1, (performance.now() - t0) / durationMs);
    displace.setAttribute('scale', (peak * Math.pow(t, 1.8)).toFixed(1));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function stopKamuiBend(): void {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  const displace = el<SVGFEDisplacementMapElement>('kamui-bend-displace');
  if (displace) displace.setAttribute('scale', '0');
}
