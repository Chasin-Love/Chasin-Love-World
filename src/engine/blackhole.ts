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

/** Full-square top view of the disk for RingGeometry's planar UVs:
 *  blackbody radial ramp, Keplerian-sheared streaks, Doppler asymmetry. */
function makeDiskTexture(rs: number): THREE.CanvasTexture {
  const size = 1024;
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

      /* Shakura–Sunyaev temperature + hot inner rim */
      let bright = Math.pow(1 - t, 1.25) * 0.85 + 0.38 * Math.exp(-t * 9);

      /* Keplerian-sheared turbulence: long streaks stretched ALONG the
         orbit (low radial frequency, higher angular frequency) */
      const sx = Math.cos(th - r * 3.2) * 5.5;
      const sy = Math.sin(th - r * 3.2) * 5.5;
      const n =
        noise(sx + r * 9, sy + r * 5.5) * 0.55 +
        noise(sx * 2.1 + r * 16, sy * 2.1 + r * 9) * 0.45;
      const streak = 0.35 + 0.85 * clamp01((n - 0.2) / 0.62);
      bright *= streak;

      /* Doppler beaming, baked: material orbiting counter-clockwise seen
         from +Y — the +x side approaches and flares white-hot */
      const doppler = 1 + 0.85 * Math.cos(th);
      bright *= 0.42 + 0.58 * doppler;

      /* edge fades — the outer melt is long and soft so the disk dissolves
         into the background instead of ending like a plate */
      bright *= (1 - smoothstepJs(0.74, 1.0, r)) * smoothstepJs(rIn, rIn + 0.05, r);
      bright = Math.min(bright, 3.6);

      /* color: blackbody ramp — white-hot inner, gold mid, deep orange outer;
         the approaching side shifts whiter */
      let cr: number, cg: number, cb: number;
      if (t < 0.35) { cr = 1; cg = mix(0.88, 0.62, t / 0.35); cb = mix(0.6, 0.28, t / 0.35); }
      else if (t < 0.75) { const u = (t - 0.35) / 0.4; cr = 1; cg = mix(0.62, 0.4, u); cb = mix(0.28, 0.1, u); }
      else { const u = (t - 0.75) / 0.25; cr = 0.95; cg = mix(0.4, 0.24, u); cb = mix(0.1, 0.04, u); }
      const white = clamp01((doppler - 1.15) * 0.6) * (1 - t) * 0.55;
      cr = mix(cr, 0.95, white); cg = mix(cg, 0.96, white); cb = mix(cb, 1.0, white);

      const b8 = Math.min(255, bright * 205);
      data[i] = Math.min(255, cr * b8 * 1.4);
      data[i + 1] = Math.min(255, cg * b8 * 1.4);
      data[i + 2] = Math.min(255, cb * b8 * 1.4);
      data[i + 3] = Math.min(255, clamp01(bright * 0.75) * 255);
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

/** Lensed-arc band: white-hot at the inner edge, streaky falloff outward. */
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
      /* band occupies r ∈ [0.52, 1.0] — RingGeometry crops to the arc;
         alpha reaches exactly 0 at r=1 so the outer edge is invisible */
      const inner = smoothstepJs(0.5, 0.56, r);
      const fall = 1 - smoothstepJs(0.56, 1.0, r);
      /* fade the arc's cut ENDS (the horizontal diameter) so it dissolves
         into the flat disk instead of stopping like a plate */
      const endFade = smoothstepJs(0.015, 0.16, Math.abs(dy));
      const streak = 0.7 + 0.3 * noise(Math.cos(th) * 5 + 9, Math.sin(th) * 5 + r * 22);
      let a = inner * fall * streak * 0.95 * endFade;
      /* white-hot line at the very inner edge */
      const hot = smoothstepJs(0.5, 0.53, r) * (1 - smoothstepJs(0.53, 0.62, r)) * endFade;
      const i = (y * size + x) * 4;
      const cr = mix(255, 255, hot), cg = mix(190 * fall + 40, 245, hot), cb = mix(120 * fall + 20, 255, hot);
      a = clamp01(a + hot * 0.8);
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
      const a = smoothstepJs(0.6, 0.72, r) * (1 - smoothstepJs(0.74, 0.99, r)) * 0.5;
      const i = (y * 256 + x) * 4;
      data255(img.data, i, 255 * a, 175 * a, 95 * a, a * 255);
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
  const diskMat = new THREE.MeshBasicMaterial({
    map: diskTex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
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
    blending: THREE.AdditiveBlending,
    opacity: 0.55,
  });
  const haze = new THREE.Mesh(new THREE.RingGeometry(rs * 10, rs * 16.5, 96, 1), hazeMat);
  diskTilt.add(haze);
  group.add(diskTilt);

  /* 3–5. billboarded: photon ring + the lensed arcs over/under the shadow */
  const billboard = new THREE.Group();

  const ringMat = new THREE.MeshBasicMaterial({
    map: makeRingTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const photonRing = new THREE.Mesh(new THREE.RingGeometry(rs * 2.42, rs * 2.62, 96, 1), ringMat);
  billboard.add(photonRing);

  const arcTexTop = makeArcTexture(4242);
  const arcTexBottom = makeArcTexture(909);
  const topArc = new THREE.Mesh(
    new THREE.RingGeometry(rs * 2.7, rs * 5.4, 96, 1, 0, Math.PI),
    new THREE.MeshBasicMaterial({ map: arcTexTop, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  const bottomArc = new THREE.Mesh(
    new THREE.RingGeometry(rs * 2.8, rs * 4.6, 96, 1, Math.PI, Math.PI),
    new THREE.MeshBasicMaterial({ map: arcTexBottom, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.7 }),
  );
  billboard.add(topArc, bottomArc);

  /* Einstein-ring star streams — the continuous smeared band just outside
     the shadow; it slowly rotates so the lensed starlight visibly orbits */
  const lensTex = makeLensingTexture();
  const lensMat = new THREE.MeshBasicMaterial({
    map: lensTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    opacity: 0.34, /* Round 17 — tamed: the funnel owns the surface look now */
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
      disk.rotation.z = -time * 0.055 - warp * (0.55 + 0.12 * Math.sin(time * 6.0));
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
