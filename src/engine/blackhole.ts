/**
 * Gargantua-class black hole for the Eventide Vault — composite edition.
 *
 * Built entirely from primitives that render identically on every GPU and
 * driver stack (plain meshes + baked canvas textures + MeshBasicMaterial):
 *   • pure-black horizon sphere (the shadow, ~2.4 rs)
 *   • flat accretion disk (3–12 rs) with a baked blackbody + turbulence +
 *     Doppler-asymmetry texture, rotating with Keplerian flavor
 *   • thin blazing photon ring hugging the shadow (billboarded)
 *   • the iconic LENSED ARCS — the far side of the disk appears as an arc
 *     OVER the shadow, its secondary image below (billboarded)
 *   • a soft warm halo for distance reading
 *
 * No custom GLSL anywhere: every earlier ray-marched attempt depended on
 * driver-specific shader compilation (ANGLE/D3D silently produced black on
 * some Windows GPUs). This composition cannot fail that way — worst case a
 * texture tint is off, but the hole always exists and always reads.
 */

import * as THREE from 'three';
import { smoothstep as smoothstepJs } from './math';

/* ------------------------- tiny value-noise (CPU) ------------------------ */

function makeNoise2(seed: number): (x: number, y: number) => number {
  const hash = (x: number, y: number) => {
    let h = seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------ textures -------------------------------- */

/** Full-square top view of the disk for RingGeometry's planar UVs.
 *  Round 18 — the INTERSTELLAR look, matched to the user's reference stills:
 *  thousands of fine filament streaks sheared ALONG the flow, cream-white
 *  → gold → soft amber palette (never cartoon orange), strong Doppler
 *  beaming (the approaching side blazes near-white), and a cloudy, ragged,
 *  feathered outer melt — no plates, no hard rims. */
function makeDiskTexture(rs: number): THREE.CanvasTexture {
  const size = 2048; /* 2048² — the filaments must read as thousands of streaks */
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const data = img.data;
  const noise = makeNoise2(1337);
  const cx = size / 2;
  const rOuterPx = size / 2 - 2;
  const rIn = 3 / 12; /* inner radius as fraction of outer (3rs of 12rs) */

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / rOuterPx;
      const dy = (y - cx) / rOuterPx;
      const r = Math.sqrt(dx * dx + dy * dy);
      const i = (y * size + x) * 4;
      if (r < rIn || r > 1) continue; /* transparent — hole & beyond */

      const t = (r - rIn) / (1 - rIn);          /* 0 at ISCO → 1 at edge */
      const th = Math.atan2(dy, dx);

      /* Shakura–Sunyaev temperature, tuned to the references: a broad,
         luminous field that stays BRIGHT far out — a dim outer disk reads
         as a red-brown donut face-on (the R47 bug); the references' sea is
         creamy to the last wisp */
      let bright = Math.pow(1 - t, 0.6) * 1.05 + 0.62 * Math.exp(-t * 1.8);

      /* Round 18 — FILAMENT SHEAR: three octaves of noise sampled in a
         spiral-sheared frame, sharpened into thousands of fine streaks
         flowing ALONG the orbit — the reference stills' signature */
      /* integer multiples of th only — a fractional multiple would leave a
         visible seam at θ=±π in the sheared sampling */
      const s1 = th + r * 3.5, s2 = th * 2.0 + r * 2.4, s3 = th * 3.0 + r * 1.6;
      const n =
        noise(Math.cos(s1) * 6 + r * 10, Math.sin(s1) * 6 + r * 5) * 0.5 +
        noise(Math.cos(s2) * 13 + r * 22, Math.sin(s2) * 13 + r * 11) * 0.3 +
        noise(Math.cos(s3) * 26 + r * 44, Math.sin(s3) * 26 + r * 22) * 0.2;
      /* Round 18.5 — ENERGY, not mud: the filaments are strong bright/dark
         banding (the references' flow lines). Floors guard against
         VANISHING, never against variation — R48's uniform beige was the
         over-correction. */
      const streakN = clamp01((n - 0.26) / 0.5);
      /* the fast filaments ADD light — compressed, hotter gas (×0.42–1.0
         plus a square-law boost) — so bright streaks blaze even on the
         Doppler-dim side, exactly like the references' white rivers */
      bright = bright * (0.42 + 0.58 * streakN) + 0.35 * streakN * streakN;

      /* Doppler beaming, baked: material orbiting counter-clockwise seen
         from +Y — the +x side approaches and BLAZES (≈2.6× the receding
         side, matching the stills' asymmetric flare) */
      const doppler = 1 + 1.1 * Math.cos(th);
      bright *= 0.60 + 0.55 * (doppler / 2.1);

      /* Round 18 — CLOUDY FEATHERED RIM: the outer melt is modulated by
         low-frequency noise so the edge dissolves in ragged wisps — the
         disk never ends like a machined plate */
      const cloud = noise(Math.cos(th) * 3 + 9, Math.sin(th) * 3 + r * 6);
      const rimR = r * (0.92 + 0.16 * cloud);
      bright *= (1 - smoothstepJs(0.86, 1.0, rimR)) * smoothstepJs(rIn, rIn + 0.04, r);
      /* Round 18.3 — CONTINUITY: the disk is ONE unbroken structure. Density
         varies with the clouds — no sector ever vanishes (the references'
         blade never breaks). Streaks modulate brightness, never existence. */
      const body = smoothstepJs(rIn, rIn + 0.06, r) * (1 - smoothstepJs(0.82, 0.98, rimR));
      bright = Math.max(bright, 0.20 * body);
      bright = Math.min(bright, 3.6);

      /* color: the CREAM-CHAMPAGNE ramp of image 2 — white at the blazing
         limb, champagne gold mid, warm taupe-cream outer. NEVER saturated
         red-brown: the sea stays creamy to the last wisp. */
      let cr: number, cg: number, cb: number;
      if (t < 0.30) { cr = 1; cg = mix(0.965, 0.93, t / 0.30); cb = mix(0.90, 0.80, t / 0.30); }
      else if (t < 0.70) { const u = (t - 0.30) / 0.40; cr = 1; cg = mix(0.93, 0.86, u); cb = mix(0.80, 0.68, u); }
      else { const u = (t - 0.70) / 0.30; cr = 0.97; cg = mix(0.86, 0.79, u); cb = mix(0.68, 0.58, u); }
      /* the approaching side whitens HARD — that blaze is the look */
      const white = clamp01((doppler - 1.35) * 0.75) * (1 - t) * 0.85;
      cr = mix(cr, 1.0, white); cg = mix(cg, 0.985, white); cb = mix(cb, 0.97, white);
      /* Round 18.5 — the FIRE: bright fast streaks blaze toward white,
         deep gaps sink toward burning gold — luminance breathes as color,
         so the sea reads as energy, never flat mud */
      const fire = clamp01((bright - 0.75) * 1.1);
      cr = mix(cr, 1.0, fire); cg = mix(cg, 0.99, fire); cb = mix(cb, 0.96, fire);
      const gap = clamp01((0.72 - bright) * 1.4);
      cr = mix(cr, 0.70, gap * 0.55); cg = mix(cg, 0.52, gap * 0.55); cb = mix(cb, 0.28, gap * 0.55);

      const b8 = Math.min(255, bright * 235);
      data[i] = Math.min(255, cr * b8 * 1.4);
      data[i + 1] = Math.min(255, cg * b8 * 1.4);
      data[i + 2] = Math.min(255, cb * b8 * 1.4);
      data[i + 3] = Math.min(255, clamp01(bright * 1.05) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Helper to write RGBA values to ImageData. Defined early to avoid hoisting issues. */
function data255(d: Uint8ClampedArray, i: number, r: number, g: number, b: number, a: number): void {
  d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
}

/** Thin blazing photon ring. */
function makeRingTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.sqrt((x - 128) ** 2 + (y - 128) ** 2) / 128;
      const band = smoothstepJs(0.78, 0.9, r) * smoothstepJs(1.0, 0.94, r);
      const i = (y * size + x) * 4;
      const b = band * 255;
      data255(img.data, i, 255 * band, 235 * band, 190 * band, b);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Round 18 — the LENSED HALO: the far side of the disk, lifted by gravity
 *  into a full circular wrap AROUND the shadow (not two half-arc stickers).
 *  White-hot at the inner edge; fine tangent filaments streak outward; the
 *  band breathes with noise; alpha reaches exactly 0 at r=1. */
function makeArcTexture(seed: number): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const noise = makeNoise2(seed);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - 256) / 256, dy = (y - 256) / 256;
      const r = Math.sqrt(dx * dx + dy * dy);
      const th = Math.atan2(dy, dx);
      /* the wrap occupies r ∈ [0.5, 1.0] — hugging the shadow, breathing
         outward into fine filaments; alpha is exactly 0 at r=1 */
      const filament = 0.62 + 0.38 * noise(Math.cos(th) * 7 + 9, Math.sin(th) * 7 + r * 26);
      const glow = 0.45 + 0.55 * filament;
      /* Round 18.3 — the wrap is CONTINUOUS: it starts tight against the
         shadow's limb (the mesh's inner edge maps to r=0.432) and NEVER
         breaks — the sides narrow and dim exactly like the references,
         but no arc of the circle ever vanishes. */
      const inner = smoothstepJs(0.425, 0.475, r);
      /* the wrap blazes AND REACHES top and bottom — the far-side disk seen
         above and below the shadow (canvas y+ is down, ±π/2 are the poles) */
      const sin2 = Math.sin(th) * Math.sin(th);
      const tilt = 0.46 + 0.54 * sin2;
      const reach = 1 - smoothstepJs(0.56 + 0.26 * sin2, 1.0, r);
      let a = inner * reach * glow * 0.95 * tilt;
      const bodyW = inner * (1 - smoothstepJs(0.86, 1.0, r));
      a = Math.max(a, 0.30 * bodyW);
      /* the WHITE-HOT inner edge — the lensed disk seen edge-on; a razor
         band that saturates to true 255 immediately */
      const hot = smoothstepJs(0.43, 0.45, r) * (1 - smoothstepJs(0.465, 0.56, r));
      const i = (y * size + x) * 4;
      /* cream body around the white-hot edge — the wrap is the same
         champagne sea as the disk, never orange-red */
      const cr = mix(255, 255, hot), cg = mix(228 * glow * reach + 45, 250, hot), cb = mix(198 * glow * reach + 30, 255, hot);
      a = clamp01(a + hot * 0.9);
      data255(img.data, i, cr * a, cg * a, cb * a, a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Einstein-ring star streams — dozens of overlapping thin smeared arcs
 *  forming one continuous band around the shadow. Billed as the background
 *  starlight dragged around the hole; the mesh slowly rotates so the
 *  streams visibly orbit instead of sitting still. */
function makeLensingTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  let seed = 20260909;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  /* soft base band so the stream never shows gaps */
  const base = g.createRadialGradient(256, 256, 256 * 0.54, 256, 256, 256);
  base.addColorStop(0, 'rgba(0,0,0,0)');
  base.addColorStop(0.18, 'rgba(215, 225, 255, 0.10)');
  base.addColorStop(0.55, 'rgba(230, 215, 190, 0.13)');
  base.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  /* the smeared star arcs */
  const count = 170;
  for (let k = 0; k < count; k++) {
    const rr = 0.55 + Math.pow(rand(), 1.35) * 0.43;            /* ring radius, uv */
    const a0 = rand() * Math.PI * 2;
    const len = (0.35 + rand() * 1.6) * (0.6 + rr);              /* arc length, rad */
    const width = 0.6 + rand() * 1.9;
    const warm = rand() > 0.42;
    const b = 0.10 + rand() * 0.42;
    g.strokeStyle = warm
      ? `rgba(255, ${205 + Math.floor(rand() * 35)}, ${150 + Math.floor(rand() * 60)}, ${b})`
      : `rgba(${185 + Math.floor(rand() * 40)}, ${215 + Math.floor(rand() * 30)}, 255, ${b})`;
    g.lineWidth = width;
    g.beginPath();
    g.arc(256, 256, rr * 256, a0, a0 + len);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft filled warm halo (distant glow reading). */
function makeHaloTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 205, 140, 0.55)');
  grad.addColorStop(0.3, 'rgba(255, 165, 85, 0.26)');
  grad.addColorStop(0.65, 'rgba(160, 90, 40, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Outer haze — an ultra-soft warm skirt that melts the disk edge into the
 *  background so the hole grows out of space instead of floating on it. */
function makeHazeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const img = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const r = Math.sqrt((x - 128) ** 2 + (y - 128) ** 2) / 128;
      /* RingGeometry maps inner 10rs → 0.606; glow peaks just outside the
         disk edge and fades to nothing at the outer rim */
      const a = smoothstepJs(0.6, 0.72, r) * (1 - smoothstepJs(0.74, 0.99, r)) * 0.42;
      const i = (y * 256 + x) * 4;
      /* Round 18 — cream haze to match the references' palette */
      data255(img.data, i, 255 * a, 218 * a, 172 * a, a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------- Round 17 — the spacetime funnel -------------------------
 *
 * THE CONCEPT (the user's ice-cream cone): a black hole is not an object
 * floating ON the universe — it is a HOLE IN THE SURFACE of the universe.
 * Place an ice-cream cone mouth-down in water: the mouth circle sits on the
 * surface, the cone plunges beneath, and the water bends inward around it.
 *
 * THE USER'S TWO LAWS (Round 17.1 corrections — both absolute):
 *  1. THE CONE PLUNGES ALONG −Z, THE VIEW AXIS. The viewer never sees the
 *     cone's geometry — only the void: black, emptiness, nothingness. The
 *     funnel is therefore billboarded face-on to the camera, rings in the
 *     screen plane, throat sinking along the view axis into the shadow.
 *  2. THE POUR IS ALWAYS CIRCULAR. However the surface distorts, the mouth
 *     touches every tangential point equally — rings, never spokes, never
 *     polygons. Water around a cone pours in circles; so does spacetime.
 *
 * THE REAL EQUATION: the membrane's depth profile is the FLAMM PARABOLOID
 * (Flamm 1916) — the EXACT spatial embedding of the Schwarzschild metric:
 *
 *        z(r) = 2·√(rs·(r − rs))
 *
 * The membrane emerges from inside the composite's own black horizon sphere
 * (which occludes it), so funnel and shadow read as ONE object — the
 * surface pouring into the hole — with no seam.
 *
 * SAFETY: pure visuals. It adds no forces, touches no orbits, and its
 * strength rides the damped spacetime-lens toggle (Lens · Clear flattens
 * it away). The Dimensional Anchor and Living Gravity are untouched.
 */

/** The Flamm paraboloid depth (in rs units) at radius r (in rs units). */
export function flammDepth(rRs: number): number {
  return 2 * Math.sqrt(Math.max(rRs - 1, 0));
}

export interface SpacetimeFunnel {
  group: THREE.Group;
  /** strength 0..1 — rides the damped spacetime-lens toggle */
  update(time: number, strength: number, camQuat?: THREE.Quaternion, camDist?: number): void;
  /** the active reality's palette, so the funnel grid is native to its universe */
  setTint(colorA: THREE.Color, colorB: THREE.Color): void;
  dispose(): void;
}

/**
 * Builds the funnel membrane around a hole of nominal radius R.
 * Rings lie in the LOCAL XY plane; the Flamm depth sinks along −Z (law 1).
 * The mesh is billboarded to the camera every frame, so the viewer always
 * looks straight into the mouth: perfect circles around pure void (law 2).
 * Depth from the exact Flamm equation; circles drift inward (the pour);
 * tinted by the reality's own two surface colors.
 */
function createSpacetimeFunnel(R: number, colorA: THREE.Color, colorB: THREE.Color): SpacetimeFunnel {
  const rs = R * 0.62;
  /* Round 17.2 — the mouth is COMPACT and hugs the shadow (the Interstellar
     references): outer rim 7 rs. The pour is the hole's own crown, never a
     room around the camera — the R41 wall/floor bug was the 30 rs scale.
     The throat still plunges along −Z by the exact Flamm law. */
  const R_IN = 1.0;    /* inner ring radius (rs units) — hidden inside the horizon sphere */
  const R_OUT = 7;     /* outer rim (rs units) — melts into the bent sky */
  const RINGS = 44;
  const SEGS = 72;

  const ringCount = RINGS + 1;
  const vertsPerRing = SEGS + 1;
  const pos = new Float32Array(ringCount * vertsPerRing * 3);
  const uvs = new Float32Array(ringCount * vertsPerRing * 2);
  const indices: number[] = [];

  for (let ri = 0; ri < ringCount; ri++) {
    const t = ri / RINGS;
    /* log-spaced rings: uniform in log(r) so the grid densifies toward the
       throat exactly like the classic embedding diagram, and a uniform
       inward drift in v reads as accelerating infall in linear space */
    const rRs = R_IN * Math.pow(R_OUT / R_IN, t);
    const z = flammDepth(rRs);
    for (let a = 0; a <= SEGS; a++) {
      const th = (a / SEGS) * Math.PI * 2;
      const k = (ri * vertsPerRing + a) * 3;
      /* law 1: rings in XY (the screen plane once billboarded), the cone's
         depth sinks along −Z — toward the viewer's axis, into the void */
      pos[k] = Math.cos(th) * rRs * rs;
      pos[k + 1] = Math.sin(th) * rRs * rs;
      pos[k + 2] = -z * rs;
      const u = (ri * vertsPerRing + a) * 2;
      uvs[u] = a / SEGS;
      uvs[u + 1] = t;
    }
    if (ri < RINGS) {
      for (let a = 0; a < SEGS; a++) {
        const i0 = ri * vertsPerRing + a;
        const i1 = i0 + 1;
        const j0 = (ri + 1) * vertsPerRing + a;
        const j1 = j0 + 1;
        indices.push(i0, j0, i1, i1, j0, j1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 1 },
      uRs: { value: rs },
      uCamDist: { value: 1e9 },
      uColorA: { value: colorA.clone() },
      uColorB: { value: colorB.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPosRs;
      varying vec2 vUvF;
      uniform float uRs;   /* declared also on the material — kept local for clarity */
      void main() {
        vPosRs = position / uRs;   /* geometry in rs units, pre-displaced */
        vUvF = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vPosRs;
      varying vec2 vUvF;
      uniform float uTime;
      uniform float uStrength;
      uniform float uRs;       /* world-units per rs — scales the camera melt */
      uniform float uCamDist;  /* camera distance to the hole's center (world) */
      uniform vec3 uColorA;
      uniform vec3 uColorB;

      void main() {
        /* law 2 — THE POUR IS ALWAYS CIRCULAR: only concentric rings exist
           here. The pattern is a function of radius alone — every tangential
           point of the mouth behaves identically. Circle in, circle out. */
        float r = length(vPosRs.xy);            /* radius in rs units */

        /* the pour — circles marching inward, accelerating near the throat:
           one shared phase per ring (a ring is a single thing), spacing
           uniform in log(r) like the embedding */
        float v = vUvF.y * 15.0;
        float flow = uTime * 0.05;
        float ring = abs(fract(v - flow) - 0.5) / 15.0 * 30.0 * r;
        float aa = max(fwidth(r) * 1.2, 1e-4);
        float ringLine = 1.0 - smoothstep(0.0, aa * 1.6, ring * 0.3183099);

        /* membrane sheen — the surface itself, strongest where curvature
           is brutal (near the throat) */
        float deep = 1.0 - smoothstep(1.6, 5.0, r);
        float sheen = deep * 0.16 + 0.02;

        /* Round 17.2 — THE LIGHT-SPEED LIP: at the mouth's rim the bending
           surface moves so fast it rivals light — the user's white energy
           blast in ±Y. A blazing white band hugs the shadow exactly like
           the Interstellar stills: brightest at 12 and 6 o'clock, thinning
           to the sides, flickering, fine circular striations dragged with
           the pour. */
        float lip = smoothstep(3.4, 4.35, r) * (1.0 - smoothstep(4.35, 6.1, r));
        float flut = 0.9 + 0.1 * sin(uTime * 9.0 + r * 14.0);
        float blast = lip * lip * flut;
        float yAxis = abs(vPosRs.y / max(r, 1e-4));
        blast *= 0.35 + 0.65 * (yAxis * yAxis);        /* ±Y emphasis */
        float stria = 0.55 + 0.45 * sin(r * 42.0 - uTime * 2.6);
        blast *= 0.55 + 0.45 * stria;                  /* surface filaments */

        /* color: reality palette through the body; the lip is WHITE HOT —
           it outruns the palette, that is the point */
        float mixK = smoothstep(1.8, 6.4, r);
        vec3 tint = mix(uColorA, uColorB, mixK);
        vec3 col = tint * (0.85 + 0.6 * deep) * (ringLine * 0.9 + sheen)
                 + vec3(1.05, 1.0, 0.92) * blast * 1.9;

        /* outer melt — no edge, only curvature dissolving into the bent sky */
        float rimFade = 1.0 - smoothstep(4.6, 7.0, r);
        /* inner fade — the true black owns everything under the limb */
        float innerFade = smoothstep(1.0, 1.9, r);

        /* CAMERA DISTANCE — the mouth dissolves as the viewer nears it, so
           no camera can ever fly INTO the pour (the R41 wall/floor bug).
           Up close it reads as the solid angle closing around you, never as
           geometry. */
        float near = 1.0 - smoothstep(4.0 * uRs, 12.0 * uRs, uCamDist);

        float alpha = (ringLine * 0.9 + sheen) * rimFade * innerFade * uStrength;
        alpha = max(alpha, blast * rimFade * innerFade * 0.95) * near * uStrength;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
  mat.userData.immuneToVortex = true;

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1; /* above the sky (≤0), under the disk (5) and billboard (6) */
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh);

  return {
    group,
    update(time, strength, camQuat, camDist) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uStrength.value = Math.max(0, Math.min(1, strength));
      /* law 1 — the cone plunges along the VIEW axis: the funnel's rings
         always face the camera dead-on, so the viewer sees only circles
         sinking into the void along −Z — never the cone's geometry */
      if (camQuat) group.quaternion.copy(camQuat);
      if (camDist !== undefined) mat.uniforms.uCamDist.value = camDist;
      group.visible = strength > 0.01;
    },
    setTint(colorA2, colorB2) {
      (mat.uniforms.uColorA.value as THREE.Color).copy(colorA2);
      (mat.uniforms.uColorB.value as THREE.Color).copy(colorB2);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

/* ------------------------------ assembly -------------------------------- */

export interface BlackHoleVisual {
  group: THREE.Group;
  update(time: number, camQuat?: THREE.Quaternion, portal?: number, funnelStrength?: number, camDist?: number): void;
  /** Round 17 — retint the spacetime funnel to a new reality's palette. */
  setTint?(colorA: THREE.Color, colorB: THREE.Color): void;
  /** Round 20 — the geodesic tier owns the whole hole; every baked part
   *  (disk, arcs, core shadow, funnel) steps aside and restores on false. */
  setCinematic?(on: boolean): void;
  dispose(): void;
}

/**
 * Builds the composite black hole. `R` is the body's nominal radius;
 * everything derives from rs = 0.62·R: shadow 2.35 rs, photon ring 2.5 rs,
 * disk 3–12 rs (ISCO outward), lensed arcs above and below.
 *
 * `bh.group` is parented to the body's group and must NEVER set its own
 * position — it inherits the body's transform. (Copying a world position
 * into a local one double-transforms the hole to 2× its orbit position.)
 */
export function createBlackHole(R: number, colorA = '#38bdf8', colorB = '#7c3aed'): BlackHoleVisual {
  const rs = R * 0.62;

  const group = new THREE.Group();

  /* 0. Round 17 — the SPACETIME FUNNEL: the universe surface itself, bending
        into the hole. One object with the shadow — no sticker on the sky. */
  const funnel = createSpacetimeFunnel(R, new THREE.Color(colorA), new THREE.Color(colorB));
  group.add(funnel.group);

  /* 1. the horizon — pure black, occludes properly in the opaque pass */
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(rs * 2.35, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  group.add(core);

  /* 2. the accretion disk — world-oriented, slowly shearing */
  const normal = new THREE.Vector3(0.055, 1.0, 0.04).normalize();
  const diskTex = makeDiskTexture(rs);
  /* Round 18.1 — NORMAL blending: the disk is DENSE matter — it OCCLUDES
     the sky behind it (like every reference still). Additive was invisible
     over the user's bright photo sky: gold light added onto white is white. */
  const diskMat = new THREE.MeshBasicMaterial({
    map: diskTex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(rs * 3, rs * 12, 160, 1), diskMat);
  const diskTilt = new THREE.Group();
  diskTilt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  diskTilt.add(disk);

  /* outer haze skirt — melts the disk edge into the background */
  const hazeMat = new THREE.MeshBasicMaterial({
    map: makeHazeTexture(),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending, /* Round 18.1 — a warm veil, not added light */
    opacity: 0.55,
  });
  const haze = new THREE.Mesh(new THREE.RingGeometry(rs * 10, rs * 16.5, 96, 1), hazeMat);
  diskTilt.add(haze);
  group.add(diskTilt);

  /* 3–5. billboarded: the photon ring and the LENSED HALO — the far side
        of the disk wrapped in a full circle AROUND the shadow (the actual
        lensing look), with its secondary image beneath (smaller, dimmer) */
  const billboard = new THREE.Group();

  const ringMat = new THREE.MeshBasicMaterial({
    map: makeRingTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending, /* Round 18.1 — reads over bright skies */
    side: THREE.DoubleSide,
  });
  const photonRing = new THREE.Mesh(new THREE.RingGeometry(rs * 2.44, rs * 2.58, 128, 1), ringMat);
  billboard.add(photonRing);

  const haloTex = makeArcTexture(4242);
  /* Round 18.1 — the lensed wrap is a solid luminous structure: normal
     blending so it reads over bright photo skies too */
  const primaryHalo = new THREE.Mesh(
    /* inner edge = 0.432 × outer — exactly where the texture's band begins,
       so the wrap paints from the very first row: no gap at the limb */
    new THREE.RingGeometry(rs * 2.42, rs * 5.6, 160, 1),
    new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide }),
  );
  const secondaryHalo = new THREE.Mesh(
    new THREE.RingGeometry(rs * 2.30, rs * 4.0, 128, 1),
    new THREE.MeshBasicMaterial({ map: makeArcTexture(909), transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide, opacity: 0.35 }),
  );
  secondaryHalo.scale.setScalar(0.72);
  billboard.add(primaryHalo, secondaryHalo);

  /* Einstein-ring star streams — the continuous smeared band just outside
     the shadow; it slowly rotates so the lensed starlight visibly orbits */
  const lensTex = makeLensingTexture();
  const lensMat = new THREE.MeshBasicMaterial({
    map: lensTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    opacity: 0.22, /* Round 18 — demoted: the lensed halo owns the wrap now */
  });
  const lensRing = new THREE.Mesh(new THREE.RingGeometry(rs * 2.55, rs * 4.7, 128, 1), lensMat);
  lensRing.renderOrder = 2;
  billboard.add(lensRing);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeHaloTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.26, /* Round 17 — tamed: the surface (not a glow blob) owns the look */
  }));
  halo.scale.setScalar(rs * 9);
  billboard.add(halo);

  billboard.renderOrder = 6;
  disk.renderOrder = 5;
  group.add(billboard);

  return {
    group,
    update(time, camQuat, portal = 0, funnelStrength = 1, camDist?: number) {
      if (camQuat) billboard.quaternion.copy(camQuat);
      const warp = clamp01(portal);
      /* majestic Keplerian-flavored shear; portal energy accelerates and
         stretches the actual disk instead of placing a screen ring over it */
      /* Round 18.5 — the sea VISIBLY FLOWS: ~2.5× the old drift rate */
      disk.rotation.z = -time * 0.14 - warp * (0.55 + 0.12 * Math.sin(time * 6.0));
      disk.scale.setScalar(1 + warp * 0.16);
      diskTilt.scale.setScalar(1 + warp * 0.10);
      /* the lensed starlight continuously orbits the shadow */
      lensRing.rotation.z = time * 0.12 + warp * (0.85 + 0.18 * Math.sin(time * 5.0));
      billboard.scale.setScalar(1 + warp * (0.14 + 0.035 * Math.sin(time * 7.0)));
      /* Round 17 — the surface pours into the hole with the damped lens
         toggle; inside the composite, so Lens · Clear flattens it away */
      funnel.update(time, funnelStrength, camQuat, camDist);
    },
    setTint(colorA2, colorB2) {
      funnel.setTint(colorA2, colorB2);
    },
    /* Round 20 — the geodesic renderer owns the ENTIRE hole now: disk, arcs,
       shadow AND funnel step aside. The baked core sphere in particular MUST
       hide — it writes depth, and with depthTest on the raymarch quad it
       punched a circular clip through the lensed image (the R19 "disk stops
       at the hole" artifact). The raymarch paints its own black shadow. */
    setCinematic(on) {
      diskTilt.visible = !on;
      billboard.visible = !on;
      core.visible = !on;
      funnel.group.visible = !on;
    },
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.MeshBasicMaterial | undefined;
        if (mat) {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      });
      (halo.material as THREE.SpriteMaterial).map?.dispose();
      (halo.material as THREE.Material).dispose();
    },
  };
}
