import * as THREE from 'three';
import { BLACKHOLE_CHANGE_EVENT, getBlackHoleParams, type BlackHoleParams } from './blackholeParams';

/**
 * THE black hole renderer — one geodesic raymarcher, nothing stacked on it.
 *
 * ROUND 54 — the single-renderer rebuild. The old flat "composite"
 * (blackhole.ts: baked disk textures, painted photon ring, fake lensed
 * halos, the spacetime funnel) is deleted; this module is the whole hole.
 * It is the corrected port of https://github.com/dgreenheck/webgpu-black-hole
 * (Copyright (c) 2025 Daniel Greenheck, MIT License) — and Round 54 closes
 * the one gap Round 20 left open on purpose: his BACKGROUND.
 *
 *   • HIS BACKGROUND, VERBATIM: escaped rays sample his procedural sky —
 *     hashed-grid stars (core + glow, bluish↔warm) and two FBM nebula
 *     layers — with the FINAL BENT ray direction. That is what smears the
 *     sky into streaks around the shadow: spacetime bending you can see
 *     beyond the disk. His shipped config: density 0.1, size 1.2,
 *     brightness 0.1, near-black navies (#071f44 @ 0.01, #010615 @ 0.21).
 *   • THE SEAM LAW: the quad is finite, so his sky is weighted by the
 *     ray's impact parameter b (full bent sky inside uBgInner ≈ 16 shader
 *     units ≈ 20 rs — shadow, photon ring, streaking zone, whole disk —
 *     fading to fully transparent by uBgOuter ≈ 22, inside the quad's
 *     inscribed 24). Beyond the fade OUR universe shows, still bent by the
 *     R52 sky lens. Both skies are near-black in the band, so the handoff
 *     is seamless.
 *   • THE EARLY-OUT: bending only pulls rays inward, so a ray with
 *     b > uBgInner can never cross the disk (outer radius 14.5) — it skips
 *     the march entirely. The outer half of the quad renders
 *     background-only and is CHEAPER than the R20 version, paying for the
 *     background sampling.
 *   • NO GLOW SPRITE: the R20 sprite fatted the halo into a blob and washed
 *     the arch out. The reference's blaze comes from bloom — the engine now
 *     damps the project bloom toward his 0.68 while a hole is on stage.
 *   • ROUND 56 — THE BACKGROUND IS OURS: his procedural starfield/nebula are
 *     gone. The engine captures the REAL scene into an offscreen buffer each
 *     frame and this shader samples it through the camera with the FINAL
 *     BENT ray direction — your nebula and your stars, displaced and
 *     streaked around the shadow. No seam: at the quad's edge the
 *     deflection is ~0, so the bent background meets the undisplaced one
 *     pixel-for-pixel. Rays whose deflection throws them behind the camera
 *     or out of frame fade out (that zone is shadow/disk dominated).
 *
 * Physics (unchanged since R20.4): his bend per step −(rs/r²)·step·lensing,
 * capture 1.01·rs, escape 100, every disk-plane crossing painted front-to-
 * back, blackbody LUT, Doppler D³, adaptive stepping. Units: 1 shader unit
 * = rs_world / uRs (rs = mass × 2; ÷0.8 at the default mass 0.4).
 */

export interface BlackHoleVisual {
  group: THREE.Group;
  /** true while the geodesic marcher renders the hole (false = hidden) */
  geodesic: boolean;
  update(time: number, camQuat?: THREE.Quaternion, portal?: number): void;
  /** show/hide the geodesic renderer (fallback paths) */
  setGeodesic(on: boolean): void;
  /** point the escaped-ray sampler at the engine's captured-scene buffer */
  setBgTexture(tex: THREE.Texture | null): void;
  dispose(): void;
}

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec4 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec4 vWorld;

uniform vec3 uCamPos;
uniform vec3 uCenter;      /* hole center in world space */
uniform float uScale;      /* world units per shader unit (rs_world × 1.25) */
uniform float uTime;
uniform float uIntensity;
uniform int uSteps;
uniform mat3 uDiskBasis;   /* world → disk-local rotation */
uniform sampler2D uBlackbody;

/* ---- dgreenheck's RUNTIME config, verbatim (shader units, rs = uRs) ---- */
uniform float uRs;           /* Schwarzschild radius in shader units = mass × 2
                                (his blackHoleMass; 0.8 at the default mass) */
uniform float uDiskInner;    /* 4.1 */
uniform float uDiskOuter;    /* 14.5 */
uniform float uDiskTemp;     /* 49.78  (thousands of K) */
uniform float uTempFalloff;  /* 5.22 */
uniform float uDiskBright;   /* 5.0 */
uniform float uDoppler;      /* 1.0 */
uniform float uRotSpeed;     /* -8.7 */
uniform float uCycleTime;    /* 5.0 */
uniform float uTurbScale;    /* 1.81 */
uniform float uTurbStretch;  /* 0.75 */
uniform float uTurbSharp;    /* 7.4 */
uniform float uTurbLac;      /* 3.0 */
uniform float uTurbPers;     /* 0.8 */
uniform float uSoftInner;    /* 0.18 */
uniform float uSoftOuter;    /* 0.5 */
uniform float uLensing;      /* his gravitationalLensing — bend per unit path
                                = uRs × uLensing, step-size independent */

/* ---- ROUND 56 — the REAL background: the engine captures the scene (holes
   hidden, R52 lens zeroed) into uBgTexture each frame; escaped rays sample
   it through the camera with the FINAL BENT direction ---- */
uniform sampler2D uBgTexture;
uniform mat4 uProjMatrix;    /* camera projection */
uniform mat4 uViewMatrix;    /* camera world inverse */
uniform float uBgActive;     /* 1 while the capture is fresh (hole on stage) */

/* ROUND 56b — step 0.38 (was 0.3): the bend-per-unit-path is step-size
   independent (his invariant), so the trajectory is preserved while the
   close-focus march costs ~20% less — the lens is pixel-bound at 1080p+. */
#define MARCH_STEP 0.42

/* ---- Mitchell Charity blackbody colors (CIE 1931), via dgreenheck's LUT ----
   121 texels: 1000K..10000K in 100K steps, then 11000K..40000K in 1KK steps —
   his exact two-segment table; piecewise texel mapping keeps the linear
   filtering exact within each segment. */
vec3 blackbody(float tempK) {
  float t = clamp(tempK, 1000.0, 40000.0);
  float idx = t <= 10000.0
    ? (t - 1000.0) * 0.01
    : 90.0 + (t - 10000.0) * 0.001;
  float u = (idx + 0.5) / 121.0;
  return texture2D(uBlackbody, vec2(u, 0.5)).rgb;
}

/* ---- his hash / value-noise / 4-octave FBM ---- */
float hash31(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = hash31(i);
  float b = hash31(i + vec3(1.0, 0.0, 0.0));
  float c = hash31(i + vec3(0.0, 1.0, 0.0));
  float d = hash31(i + vec3(1.0, 1.0, 0.0));
  float e = hash31(i + vec3(0.0, 0.0, 1.0));
  float g = hash31(i + vec3(1.0, 0.0, 1.0));
  float h = hash31(i + vec3(0.0, 1.0, 1.0));
  float k = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(a, b, u.x), mix(c, d, u.x), u.y),
    mix(mix(e, g, u.x), mix(h, k, u.x), u.y),
    u.z);
}
float fbm(vec3 p, float lac, float pers) {
  float v = 0.0;
  float a = 0.5;
  v += noise3(p) * a; p *= lac; a *= pers;
  v += noise3(p) * a; p *= lac; a *= pers;
  v += noise3(p) * a; p *= lac; a *= pers;
  v += noise3(p) * a;
  return v;
}

/* ---- accretion disk color at a plane crossing — HIS createAccretionDiskColor,
   line for line. hitR/hitAngle in the disk-local frame (shader units);
   rayDirLocal is the local-frame photon direction for the Doppler term. ---- */
vec4 diskColor(float hitR, float hitAngle, vec3 rayDirLocal) {
  float normR = clamp((hitR - uDiskInner) / (uDiskOuter - uDiskInner), 0.0, 1.0);

  /* Temperature profile: T(r) = T_peak · (r_inner / r)^α */
  float tempK = uDiskTemp * 1000.0 * pow(uDiskInner / hitR, uTempFalloff);
  vec3 col = blackbody(tempK);

  /* Doppler beaming: D = 1/(1 − β·cosθ), brightness ∝ D³.
     rotationSign — his disk spins NEGATIVELY; it flips the beam side. */
  float rotationSign = sign(uRotSpeed);
  vec3 velDir = vec3(-sin(hitAngle) * rotationSign, 0.0, cos(hitAngle) * rotationSign);
  float beta = 0.3 / sqrt(hitR / uDiskInner);
  float cosA = dot(velDir, rayDirLocal);
  float dopplerBoost = pow(1.0 / (1.0 - beta * cosA), 3.0 * uDoppler);
  col *= clamp(dopplerBoost, 0.1, 5.0);

  /* Edge falloff (his diskEdgeSoftnessInner/Outer) */
  float edge = smoothstep(0.0, uSoftInner, normR) * smoothstep(1.0, 1.0 - uSoftOuter, normR);

  /* Turbulent ring pattern with cyclic-time crossfade (no winding artifacts):
     Keplerian shear ω ∝ r^−1.5, anisotropic FBM (radial rings, azimuthal arcs) */
  float cyclicTime = mod(uTime, uCycleTime);
  float blendF = cyclicTime / uCycleTime;
  float phase1 = cyclicTime * uRotSpeed / pow(hitR, 1.5);
  float phase2 = (cyclicTime + uCycleTime) * uRotSpeed / pow(hitR, 1.5);
  float stretch = max(uTurbStretch, 0.1);
  vec3 nc1 = vec3(hitR * uTurbScale, cos(hitAngle + phase1) / stretch, sin(hitAngle + phase1) / stretch);
  vec3 nc2 = vec3(hitR * uTurbScale, cos(hitAngle + phase2) / stretch, sin(hitAngle + phase2) / stretch);
  float turb = mix(fbm(nc2, uTurbLac, uTurbPers), fbm(nc1, uTurbLac, uTurbPers), blendF);
  float ringOpacity = pow(clamp(turb, 0.0, 1.0), uTurbSharp);

  return vec4(col * uDiskBright, ringOpacity * edge);
}

void main() {
  vec3 p = (uCamPos - uCenter) / uScale;
  vec3 v = normalize(vWorld.xyz - uCamPos);

  /* Round 54 — impact parameter of the UNBENT ray (its line's distance from
     the hole). Bending only pulls rays inward, so a ray with b beyond the
     disk outer edge (+ bending margin) can never cross the disk: those rays
     skip both march loops — the outer half of the quad stays fully
     transparent (the real scene shows, deflection there is ~0 anyway). */
  float b = length(cross(p, v));

  vec3 color = vec3(0.0);
  float alpha = 0.0;
  bool captured = false;

  if (b <= uDiskOuter + 2.5) {
    /* COARSE APPROACH — the one adaptation his fullscreen demo never needed:
       our camera can be hundreds of units out. Walk the ray straight down to
       the r=16 march sphere in a few long steps (bending is ∝ 1/r² — out there
       the leg stays straight, so its plane crossings are exact for any step
       length and are composited too). Steps brake to land ON the sphere
       (min(r−16, r/2)), never overshooting into the capture zone. */
    for (int i = 0; i < 12; i++) {
      float r0 = length(p);
      if (r0 <= 16.0) break;
      vec3 pPrev = p;
      p += v * min(r0 - 16.0, r0 * 0.5);
      vec3 lPrevA = uDiskBasis * pPrev;
      vec3 lCurA = uDiskBasis * p;
      if (lPrevA.y * lCurA.y < 0.0 && alpha < 0.99) {
        float fA = lPrevA.y / (lPrevA.y - lCurA.y);
        vec3 hitA = mix(lPrevA, lCurA, clamp(fA, 0.0, 1.0));
        float hitRA = length(hitA.xz);
        if (hitRA > uDiskInner && hitRA < uDiskOuter) {
          vec4 dA = diskColor(hitRA, atan(hitA.z, hitA.x), normalize(uDiskBasis * v));
          float remA = 1.0 - alpha;
          color += dA.rgb * dA.a * remA;
          alpha += remA * dA.a;
        }
      }
    }

    /* HIS MARCH — bending = uRs/r² per unit × uLensing (his invariant: bend
       per unit path = uRs × uLensing, step-size independent), capture
       1.01·uRs, escape 100. EVERY disk-plane crossing along the BENT
       ray paints — that is what builds the continuous lensed halo over and
       under the shadow, by construction.
       ADAPTIVE STEP (Round 20, iGPU lifeline): the per-unit bending of his
       integrator is step-size-INDEPENDENT (bend ∝ step·lensing per step, over
       a step of length step), so growing the step away from the hole keeps the
       exact same trajectory at ~3× fewer iterations — fine 0.3 where the
       photon-ring arcs live (r < 8), up to 1.2 out at the march sphere. */
    for (int i = 0; i < 128; i++) {
      if (i >= uSteps) break;
      if (alpha > 0.99) break;
      float r = length(p);
      if (r < uRs * 1.01) { captured = true; break; }
      if (r > 100.0) break;
      /* fully clear of the disk and receding — no further crossing can occur */
      if (r > uDiskOuter && dot(v, p) > 0.0) break;

      float stepLen = MARCH_STEP * clamp(r * 0.125, 1.0, 4.0);
      /* gravitational light bending: a = −rs/r² toward the center */
      vec3 toCenter = -p / r;
      v = normalize(v + toCenter * (uRs / (r * r)) * stepLen * uLensing);
      vec3 pPrev = p;
      p += v * stepLen;

      vec3 lPrev = uDiskBasis * pPrev;
      vec3 lCur = uDiskBasis * p;
      if (lPrev.y * lCur.y < 0.0 && alpha < 0.99) {
        float f = lPrev.y / (lPrev.y - lCur.y);
        vec3 hit = mix(lPrev, lCur, clamp(f, 0.0, 1.0));
        float hitR = length(hit.xz);
        if (hitR > uDiskInner && hitR < uDiskOuter) {
          /* hit and angle already live in the disk-LOCAL frame (via uDiskBasis);
             the photon direction must be expressed in the SAME frame for the
             Doppler term. The basis is a pure rotation, so length(v) survives. */
          vec4 d = diskColor(hitR, atan(hit.z, hit.x), normalize(uDiskBasis * v));
          float remaining = 1.0 - alpha;
          color += d.rgb * d.a * remaining;
          alpha += remaining * d.a;
        }
      }
    }
  }

  /* OUTPUT: his gamma step applies to the DISK light only (his LUT colors
     are display-referred; the step pushes the white-hot band past the bloom
     threshold). The background sample is scene-LINEAR — the same space as
     the buffer it came from — so it must NOT be gamma-encoded here; the
     composer's OutputPass (ACES + sRGB) finishes it exactly like every
     other scene pixel, which is what makes the bent background seamless
     with the undisplaced background outside the quad. Captured rays stay
     fully opaque. */
  color *= uIntensity;
  color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));
  if (!captured && uBgActive > 0.5) {
    vec4 clip = uProjMatrix * uViewMatrix * vec4(uCamPos + v * 1000.0, 1.0);
    vec2 bgUv = clip.xy / clip.w * 0.5 + 0.5;
    float inFront = step(0.0, clip.w);
    float edge = smoothstep(0.0, 0.02, bgUv.x) * smoothstep(0.0, 0.02, 1.0 - bgUv.x)
               * smoothstep(0.0, 0.02, bgUv.y) * smoothstep(0.0, 0.02, 1.0 - bgUv.y);
    float wa = inFront * edge * (1.0 - alpha);
    color += texture2D(uBgTexture, bgUv).rgb * wa;
    alpha += wa;
  }
  gl_FragColor = vec4(color, captured ? 1.0 : clamp(alpha, 0.0, 1.0));
}
`;

/* ---- Mitchell Charity blackbody anchors (CIE 1931 → sRGB) ----
   Transcribed from dgreenheck/webgpu-black-hole (MIT), who transcribed it
   from http://www.vendian.org/mncharity/dir3/blackbody/ */
const BLACKBODY_ANCHORS: Array<[number, number, number, number]> = [
  [1000, 1, 0.0337, 0], [1100, 1, 0.0592, 0], [1200, 1, 0.0846, 0], [1300, 1, 0.1096, 0], [1400, 1, 0.1341, 0],
  [1500, 1, 0.1578, 0], [1600, 1, 0.1806, 0], [1700, 1, 0.2025, 0], [1800, 1, 0.2235, 0], [1900, 1, 0.2434, 0],
  [2000, 1, 0.2647, 0.0033], [2100, 1, 0.2889, 0.012], [2200, 1, 0.3126, 0.0219], [2300, 1, 0.336, 0.0331], [2400, 1, 0.3589, 0.0454],
  [2500, 1, 0.3814, 0.0588], [2600, 1, 0.4034, 0.0734], [2700, 1, 0.425, 0.0889], [2800, 1, 0.4461, 0.1054], [2900, 1, 0.4668, 0.1229],
  [3000, 1, 0.487, 0.1411], [3100, 1, 0.5067, 0.1602], [3200, 1, 0.5259, 0.18], [3300, 1, 0.5447, 0.2005], [3400, 1, 0.563, 0.2216],
  [3500, 1, 0.5809, 0.2433], [3600, 1, 0.5983, 0.2655], [3700, 1, 0.6153, 0.2881], [3800, 1, 0.6318, 0.3112], [3900, 1, 0.648, 0.3346],
  [4000, 1, 0.6636, 0.3583], [4100, 1, 0.6789, 0.3823], [4200, 1, 0.6938, 0.4066], [4300, 1, 0.7083, 0.431], [4400, 1, 0.7223, 0.4556],
  [4500, 1, 0.736, 0.4803], [4600, 1, 0.7494, 0.5051], [4700, 1, 0.7623, 0.5299], [4800, 1, 0.775, 0.5548], [4900, 1, 0.7872, 0.5797],
  [5000, 1, 0.7992, 0.6045], [5100, 1, 0.8108, 0.6293], [5200, 1, 0.8221, 0.6541], [5300, 1, 0.833, 0.6787], [5400, 1, 0.8437, 0.7032],
  [5500, 1, 0.8541, 0.7277], [5600, 1, 0.8642, 0.7519], [5700, 1, 0.874, 0.776], [5800, 1, 0.8836, 0.8], [5900, 1, 0.8929, 0.8238],
  [6000, 1, 0.9019, 0.8473], [6100, 1, 0.9107, 0.8707], [6200, 1, 0.9193, 0.8939], [6300, 1, 0.9276, 0.9168], [6400, 1, 0.9357, 0.9396],
  [6500, 1, 0.9436, 0.9621], [6600, 1, 0.9513, 0.9844], [6700, 0.9937, 0.9526, 1], [6800, 0.9726, 0.9395, 1], [6900, 0.9526, 0.927, 1],
  [7000, 0.9337, 0.915, 1], [7100, 0.9157, 0.9035, 1], [7200, 0.8986, 0.8925, 1], [7300, 0.8823, 0.8819, 1], [7400, 0.8668, 0.8718, 1],
  [7500, 0.852, 0.8621, 1], [7600, 0.8379, 0.8527, 1], [7700, 0.8244, 0.8437, 1], [7800, 0.8115, 0.8351, 1], [7900, 0.7992, 0.8268, 1],
  [8000, 0.7874, 0.8187, 1], [8100, 0.7761, 0.811, 1], [8200, 0.7652, 0.8035, 1], [8300, 0.7548, 0.7963, 1], [8400, 0.7449, 0.789, 1],
  [8500, 0.7353, 0.7827, 1], [8600, 0.726, 0.7762, 1], [8700, 0.7172, 0.7699, 1], [8800, 0.7086, 0.7638, 1], [8900, 0.7004, 0.7579, 1],
  [9000, 0.6925, 0.7522, 1], [9100, 0.6848, 0.7467, 1], [9200, 0.6774, 0.7414, 1], [9300, 0.6703, 0.7362, 1], [9400, 0.6635, 0.731, 1],
  [9500, 0.6568, 0.7263, 1], [9600, 0.6504, 0.7215, 1], [9700, 0.6442, 0.7169, 1], [9800, 0.6382, 0.7124, 1], [9900, 0.6324, 0.7081, 1],
  [10000, 0.6268, 0.7039, 1], [11000, 0.5791, 0.6674, 1], [12000, 0.5431, 0.6389, 1], [13000, 0.5152, 0.6162, 1], [14000, 0.493, 0.5978, 1],
  [15000, 0.4749, 0.5824, 1], [16000, 0.4599, 0.5696, 1], [17000, 0.4474, 0.5586, 1], [18000, 0.4367, 0.5492, 1], [19000, 0.4275, 0.541, 1],
  [20000, 0.4196, 0.5339, 1], [25000, 0.3917, 0.5083, 1], [30000, 0.3751, 0.4926, 1], [35000, 0.3641, 0.4821, 1], [40000, 0.3563, 0.4745, 1],
];

function blackbodyAt(tempK: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, tempK));
  const anchors = BLACKBODY_ANCHORS;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (t >= anchors[i][0] && t <= anchors[i + 1][0]) {
      const f = (t - anchors[i][0]) / (anchors[i + 1][0] - anchors[i][0]);
      /* anchors are [tempK, r, g, b] — interpolate channels j+1 */
      return [0, 1, 2].map((j) => anchors[i][j + 1] + (anchors[i + 1][j + 1] - anchors[i][j + 1]) * f) as [number, number, number];
    }
  }
  const last = anchors[anchors.length - 1];
  return [last[1], last[2], last[3]];
}

/* The shader LUT: 100K samples 1000–10000K, then 1K samples 11000–40000K —
   his exact two-loop construction (121 entries). */
const BLACKBODY_LUT: Array<[number, number, number]> = (() => {
  const rows: Array<[number, number, number]> = [];
  for (let t = 1000; t <= 10000; t += 100) rows.push(blackbodyAt(t));
  for (let t = 11000; t <= 40000; t += 1000) rows.push(blackbodyAt(t));
  return rows;
})();

/** TS mirror of the shader's LUT lookup — for verification gauntlets. */
export function blackbodyColorOf(tempK: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, tempK));
  const idx = t <= 10000 ? (t - 1000) * 0.01 : 90 + (t - 10000) * 0.001;
  const i = Math.min(119, Math.max(0, Math.floor(idx)));
  const f = idx - i;
  const a = BLACKBODY_LUT[i];
  const b = BLACKBODY_LUT[Math.min(120, i + 1)];
  return [0, 1, 2].map((j) => a[j] + (b[j] - a[j]) * f) as [number, number, number];
}

function buildBlackbodyLut(): THREE.DataTexture {
  const data = new Uint8Array(BLACKBODY_LUT.length * 4);
  BLACKBODY_LUT.forEach((c, i) => {
    data[i * 4] = Math.round(Math.min(1, c[0]) * 255);
    data[i * 4 + 1] = Math.round(Math.min(1, c[1]) * 255);
    data[i * 4 + 2] = Math.round(Math.min(1, c[2]) * 255);
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, BLACKBODY_LUT.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/* The disk rides a hair off world-horizontal (a natural, slightly inclined
   plane); its inverse rotation maps world offsets into the disk-local frame
   for the plane-crossing test. The basis maps local +Y → the disk normal
   (the Round 20.1 frame fix — local Y is the plane axis the shader tests). */
const DISK_NORMAL = new THREE.Vector3(0.055, 1.0, 0.04).normalize();

function buildDiskBasis(): THREE.Matrix3 {
  const localToWorld = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), DISK_NORMAL);
  const worldToLocal = localToWorld.clone().invert();
  return new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(worldToLocal));
}

/** The geodesic marcher is the ONLY black hole renderer that has ever existed.
 *  When it cannot run (unsupported GPU, shader failure, the Studio switch),
 *  the hole simply hides itself — the R52 sky lens keeps bending the sky
 *  where it stands. There is no stand-in sphere, no painted fallback. */

export interface BlackHoleOptions {
  /** start with the geodesic marcher live (false = the hole renders nothing) */
  geodesic?: boolean;
  /** global emission multiplier */
  intensity?: number;
  /** ray steps (quality) */
  steps?: number;
}

export function createBlackHole(R: number, opts: BlackHoleOptions = {}): BlackHoleVisual {
  const rs = R * 0.62;
  /* Round 20.2 — 1.35 pushes the white-hot band past the project bloom
     threshold (0.90) so it visibly blazes, as in the demo */
  const intensity = opts.intensity ?? 1.35;
  /* R20.4 — start from the persisted tuning panel (defaults = the reference
     config). Mass sets the shader-space rs = mass × 2; uScale tracks it so
     uScale·uRs stays = rs_world — the shader shadow keeps the reference
     proportions at any mass. */
  const params = getBlackHoleParams();
  let geodesicOn = opts.geodesic ?? true;

  const group = new THREE.Group();
  group.userData.baseIntensity = intensity;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    /* the march accumulates PREMULTIPLIED color (each hit adds rgb·α), so
       blending must be premultiplied too — plain NormalBlending would apply
       the alpha a second time and sink the disk back into mud (the R47 sin) */
    blending: THREE.NormalBlending,
    premultipliedAlpha: true,
    side: THREE.DoubleSide,
    uniforms: {
      uCamPos: { value: new THREE.Vector3() },
      uCenter: { value: new THREE.Vector3() },
      uScale: { value: rs / (params.mass * 2) },  /* world per shader unit */
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uSteps: { value: Math.max(48, Math.min(88, opts.steps ?? 80)) },
      uDiskBasis: { value: buildDiskBasis() },
      uBlackbody: { value: buildBlackbodyLut() },
      /* dgreenheck's runtime config — panel-tunable via blackholeParams (R20.4) */
      uRs: { value: params.mass * 2 },
      uDiskInner: { value: params.diskInner },
      uDiskOuter: { value: params.diskOuter },
      uDiskTemp: { value: 49.78 },
      uTempFalloff: { value: 5.22 },
      uDiskBright: { value: params.brightness },
      uDoppler: { value: params.doppler },
      uRotSpeed: { value: params.rotSpeed },
      uCycleTime: { value: 5.0 },
      uTurbScale: { value: 1.81 },
      uTurbStretch: { value: 0.75 },
      uTurbSharp: { value: 7.4 },
      uTurbLac: { value: 3.0 },
      uTurbPers: { value: 0.8 },
      uSoftInner: { value: 0.18 },
      uSoftOuter: { value: 0.5 },
      uLensing: { value: params.lensing },
      /* ROUND 56 — the REAL background: the engine captures the scene into
         this buffer (holes hidden, R52 lens zeroed) and escaped rays sample
         it through the camera with the final bent direction */
      uBgTexture: { value: null as THREE.Texture | null },
      uProjMatrix: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uBgActive: { value: 0 },
    },
  });

  /* quad frames the disk (14.5 u ≈ 18 rs at the default mass) plus the
     lensed wrap and the bent background */
  const quadSize = rs * 60;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(quadSize, quadSize), material);
  quad.renderOrder = 12;
  quad.frustumCulled = false;
  quad.visible = geodesicOn;
  group.add(quad);

  /* R20.4 — live tuning: panel changes land on this material immediately.
     Mass below ~0.28 would let the fixed 29 u disk diameter outgrow the
     quad's 60·uRs-u span, so the quad mesh rescales up to keep the disk
     framed. */
  const applyParams = (p: BlackHoleParams) => {
    const shaderRs = p.mass * 2;
    material.uniforms.uRs.value = shaderRs;
    material.uniforms.uScale.value = rs / shaderRs;
    material.uniforms.uDiskInner.value = p.diskInner;
    material.uniforms.uDiskOuter.value = p.diskOuter;
    material.uniforms.uDiskBright.value = p.brightness;
    material.uniforms.uDoppler.value = p.doppler;
    material.uniforms.uRotSpeed.value = p.rotSpeed;
    material.uniforms.uLensing.value = p.lensing;
    quad.scale.setScalar(Math.max(1, 34 / (60 * shaderRs)));
  };
  const onParams = (e: Event) => applyParams((e as CustomEvent<BlackHoleParams>).detail);
  window.addEventListener(BLACKHOLE_CHANGE_EVENT, onParams);
  applyParams(params);

  const visual: BlackHoleVisual = {
    group,
    geodesic: geodesicOn,
    update(time, camQuat, _portal) {
      material.uniforms.uTime.value = time;
      /* billboard: the quad must face the camera EVERY frame or the lensed
         image reads as a sheared window clipped by the quad's straight
         edges. Round 20.1 — NO portal fade: in cinematic mode this renderer
         IS the hole; full glory, always. */
      if (camQuat) quad.quaternion.copy(camQuat);
      material.uniforms.uIntensity.value = intensity;
    },
    setGeodesic(on: boolean) {
      geodesicOn = on;
      visual.geodesic = on;
      quad.visible = on;
    },
    setBgTexture(tex: THREE.Texture | null) {
      material.uniforms.uBgTexture.value = tex;
    },
    dispose() {
      window.removeEventListener(BLACKHOLE_CHANGE_EVENT, onParams);
      quad.geometry.dispose();
      const lut = material.uniforms.uBlackbody.value as THREE.DataTexture;
      lut.dispose();
      material.dispose();
    },
  };
  return visual;
}

/* scratch for the parent-aware billboard below */
const _parentQ = new THREE.Quaternion();

/**
 * Per-frame driver the engine calls with the live camera. Sets EVERYTHING
 * the shader needs: the billboard orientation (parent-aware — body groups
 * can ride inside tilted pivots, so the quad's WORLD orientation must equal
 * the camera's, not its local one), the true camera position for the
 * geodesic integration, the hole's world center, time, and the intensity.
 * The portal argument is accepted for interface compatibility but
 * deliberately IGNORED since Round 20.1.
 */
export function updateRaymarchUniforms(
  visual: BlackHoleVisual,
  camera: THREE.Camera,
  time: number,
  bgActive = false,
): void {
  const quad = visual.group.children[0] as THREE.Mesh | undefined;
  const mat = quad?.material as THREE.ShaderMaterial | undefined;
  if (!quad || !mat || !mat.uniforms) return;
  if (camera.quaternion) {
    /* world billboard: parentWorld⁻¹ · cameraWorld → local orientation */
    visual.group.getWorldQuaternion(_parentQ).invert().multiply(camera.quaternion);
    quad.quaternion.copy(_parentQ);
  }
  mat.uniforms.uCenter.value.setFromMatrixPosition(visual.group.matrixWorld);
  mat.uniforms.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
  mat.uniforms.uTime.value = time;
  const base = (visual.group.userData.baseIntensity as number | undefined) ?? 1.35;
  mat.uniforms.uIntensity.value = base;
  /* ROUND 56 — the escaped-ray background sampler needs the camera's
     projection + view to convert a bent direction into a screen UV */
  mat.uniforms.uProjMatrix.value.copy(camera.projectionMatrix);
  mat.uniforms.uViewMatrix.value.copy(camera.matrixWorldInverse);
  mat.uniforms.uBgActive.value = bgActive ? 1 : 0;
}
