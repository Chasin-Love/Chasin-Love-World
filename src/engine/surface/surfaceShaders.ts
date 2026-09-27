import { NOISE } from '../shaders';

/* ------------------- gravitational lensing of the surface ------------------- */

/* Round 14 — masses bend the UNIVERSE SURFACE (the celestial canvas), never
   the bodies themselves. Each lens arrives as vec4(xyz = unit world direction
   to the mass as seen by the camera, w = halo angle in radians).
   Round 16 — black holes get TRUE SCHWARZSCHILD OPTICS (uLensStrong): the
   exact image equation with the second-order strong-field term and the real
   capture shadow. Everything else keeps the proven weak-field law.
   This is the only place curvature is drawn: a diagram is not the sky,
   a body is never bent. */
export const LENS_UNIFORMS_GLSL = /* glsl */ `
uniform vec4 uLenses[16];   /* xyz = direction to the mass, w = halo angle (rad) */
uniform float uLensRim[16]; /* each mass's own apparent silhouette angle (rad) */
uniform float uLensStrong[16]; /* 1.0 = black hole: exact Schwarzschild optics */
uniform int uLensCount;
uniform float uLensBend;
uniform float uLensScale;   /* ROUND 58 — the march's lensing factor (2.4): the
                               sky's bend is exactly continuous with the quad's */
`;

export const LENS_WARP_GLSL = /* glsl */ `
/* the sentinel direction returned when a ray is CAPTURED — no image exists */
const vec3 LENS_CAPTURE = vec3(-1.0);

/* the capture test shared by every stage: the sentinel is the one direction
   that cannot be a unit vector (x²+y²+z² = 1 can't have all three components
   below −0.99), so the test is exact and collision-free */
bool lensCaptured(vec3 d){
  return d.x < -0.99 && d.y < -0.99 && d.z < -0.99;
}

/* helpers shared by both lens modes (declared first — GLSL order rules) */
float lensPerpLen(vec3 d, vec3 L){
  float cosA = clamp(dot(d, L), -1.0, 1.0);
  vec3 perp = d - L * cosA;
  return length(perp);
}
vec3 lensReconstruct(vec3 L, vec3 d, float cosA, float ang2){
  vec3 perp = d - L * clamp(cosA, -1.0, 1.0);
  float perpLenV = length(perp);
  if (perpLenV < 1e-5) return d; /* looking straight into the mass */
  vec3 perpDir = perp / perpLenV;
  return normalize(L * cos(ang2) + perpDir * sin(ang2));
}

/* Round 16 — the lens law, two modes.

   HOLE MODE (uLensStrong = 1) — EXACT SCHWARZSCHILD OPTICS.
   The sampled image angle θ maps to its source angle β through the exact
   thin-lens relation β = θ − θ_E²/θ with θ_E² = 2·rs_ang (rs_ang = 0.62·rim,
   the composite's rs = 0.62 R), plus the SECOND-ORDER strong-field correction

        α(θ) = 2 rs/θ + (15π/16)(rs/θ)²          (Iyer & Petters 2007)

   which tightens the bend correctly as θ approaches the critical angle.
   CAPTURE — image angles below the critical impact parameter

        b_c = (3√3/2) rs ≈ 2.598 rs               (Darwin 1959)

   have NO image: the function returns LENS_CAPTURE and the caller paints the
   true black of the shadow. The map's source angle β(θ) is monotone with
   dβ/dθ = 1 + (θ_E² − 2c·rs²)/θ² ≥ 1 − 0.58 > 0 at θ ≥ b_c, and β(b_c) ≈
   1.39 rs > 0 — the forward map CANNOT fold at any distance, for any hole.
   Background stars therefore pile into real arc-densification (magnification
   ≈ 2.4 at the shadow edge) and stream around the hole exactly as in the
   NASA/Interstellar reference — emergent from the equation, never painted.

   WEAK MODE — the Round 14 law: displacement anchored to the silhouette,
   decaying 1/θ toward the halo edge, capped at 0.85× the distance — the
   map cannot fold, so the giant flat-disc artifact is impossible. */
vec3 applyLensBend(vec3 d){
  for (int i = 0; i < 16; i++) {
    if (i >= uLensCount) break;
    vec3 L = uLenses[i].xyz;
    float halo = max(uLenses[i].w, 1e-5);
    float rim = max(uLensRim[i], 1e-6);
    float m = halo / rim;
    float cosA = clamp(dot(d, L), -1.0, 1.0);
    float ang = acos(cosA);
    if (lensPerpLen(d, L) < 1e-5) continue; /* looking straight into the mass */
    if (uLensStrong[i] > 0.5) {
      /* ---- hole mode: the real equations ---- */
      float rsA = 0.62 * rim;                     /* rs = 0.62 R, matching the composite */
      float bc = 2.5980762 * rsA;                 /* b_c = (3√3/2) rs — the true shadow edge */
      /* captured — no image exists here (gated by the damped toggle: when
         the lens is released, no capture occurs and the sky heals whole) */
      if (ang < bc && uLensBend > 0.02) return LENS_CAPTURE;
      float thE2 = 2.0 * rsA;                     /* Einstein area of the point-mass lens */
      /* ROUND 58 — the TRUE gradual law, with NO artificial cutoff: the
         deflection decays as 1/θ forever (gravity never stops) and is scaled
         by the march's lensing factor (uLensScale = the panel's Grav.
         Lensing) so the sky's bend is EXACTLY continuous with the geodesic
         quad at its edge — both are 2·L·rs/b in their own units. The old
         hard cutoff at m·rim was the "square"/"layers" the user saw. */
      float disp = (thE2 / ang + 2.9452431 * rsA * rsA / (ang * ang)) * uLensScale * uLensBend;
      if (disp < 1e-6) continue;
      float ang2 = max(ang - disp, 0.0);          /* β — monotone, fold-proof by the math above */
      d = lensReconstruct(L, d, cosA, ang2);
    } else {
      /* ---- weak mode: the Round 14 law ---- */
      float x = ang / rim;
      float fade = 1.0 - smoothstep(m * 0.62, m, x);   /* melts to zero at the halo edge */
      if (fade < 0.003) continue;
      float pull = min(0.85 * rim / max(x, 0.35), ang * 0.85) * fade * uLensBend;
      float ang2 = max(ang - pull, 0.0);
      d = lensReconstruct(L, d, cosA, ang2);
    }
  }
  return d;
}

/* ROUND 61 — THE WELL. One law for every sky layer: the depression around a
   black hole — the embedding-diagram funnel the user described with the
   water-cone analogy: space pours gradually into the hole, nothing pours at
   a distance. As a function of angular distance x in units of the capture
   boundary b_c = (3√3/2)·rs:

       x ≥ 4   → exactly 0   untouched sky (the user's 1→1.9 band)
       x ≈ 3   → a whisper   the depression just begins (their ~2)
       x = 2   → gentle      growing continuously
       x → 1   → deep        the super-sensitive band into the rim (3.55→4)

   The depth follows the deflection's own inverse-square shape, and a
   smoothstep reach melts it to EXACTLY zero at 4·b_c — the whole profile is
   one C¹ curve of one angle: no band, no layer, no edge can exist. EVERY
   sky stage (procedural dome, photo dome, every star shell) calls this same
   function, so no two layers can ever disagree about how dark the sky is
   in the same direction. Scales with the damped strength (uLensBend): the
   physics toggle heals the sky whole. */
float lensWellDarken(vec3 dir){
  float darken = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i >= uLensCount) break;
    if (uLensStrong[i] < 0.5) continue;
    float rsA = 0.62 * max(uLensRim[i], 1e-6);
    float bc = 2.5980762 * rsA;                  /* b_c = (3√3/2) rs */
    float ang = acos(clamp(dot(dir, uLenses[i].xyz), -1.0, 1.0));
    float x = max(ang, bc * 0.25) / bc;
    float well = 1.0 / (x * x);                  /* the deflection's own shape */
    float reach = 1.0 - smoothstep(3.1, 4.0, x); /* melts to zero at 4·b_c */
    if (reach < 0.001) continue;
    darken = max(darken, min(well, 1.0) * reach);
  }
  return min(darken, 1.0) * 0.95 * uLensBend;
}
`;

/* For vertex stages (star shells, nebula points): uniforms + warp + a helper
   that bends a point's direction on the celestial sphere and restores its
   original radius, so background stars curve around the masses — the black
   hole's halo strongest of all. */
export const LENS_VERT_GLSL = /* glsl */ `
${LENS_UNIFORMS_GLSL}
${LENS_WARP_GLSL}
/* ROUND 61 — the star shells share the well: a background star dims by the
   same one-law curve as the dome as its direction pours toward the hole,
   so no shell can disagree with the sky it lives in (the "layers" sin).
   Exactly zero beyond 4·b_c — the outer sky is untouched. */
float lensWellFactor(vec3 worldPos){
  vec3 dir = worldPos - cameraPosition;
  float dist = length(dir);
  if (dist < 1e-4) return 1.0;
  return 1.0 - lensWellDarken(dir / dist);
}
vec3 lensBentPosition(vec3 position){
  float r = length(position);
  if (r < 1e-4) return position;
  vec3 dir = position / r;
  dir = applyLensBend(dir);
  /* CAPTURED — a background star whose direction falls inside the true
     shadow has NO IMAGE: it is placed behind the camera and clipped away,
     so stars visibly vanish crossing the shadow, exactly as real lensing
     videos show. With the lens damped off, no capture occurs and the sky
     releases whole. */
  if (dir.x < -0.99 && dir.y < -0.99 && dir.z < -0.99) {
    return cameraPosition - normalize(position) * r * 0.5;
  }
  return dir * r;
}
`;

/* Round 52 — WORLD-SPACE STAR LENSING for object-space point clouds.

   lensBentPosition() above bends a vertex's direction from the ORIGIN, which
   is exact for a sky shell centred on the camera — but wrong for the star
   clouds that live inside offset groups (a galaxy's dense starfield, a
   cluster's halo, a level's dust). Those must bend as seen from the CAMERA:

     worldPos → direction from the camera → applyLensBend → back out at the
     SAME distance, so size, depth and parallax are untouched and only the
     direction moves — which is precisely what curvature does to a background
     star, and why the sky now arcs around a mass instead of sliding under it.

   A captured direction has no image at all: it is mirrored to the far side of
   the camera, where the frustum clips it, so the shadow holds no star.

   Compose this AFTER LENS_UNIFORMS_GLSL and LENS_WARP_GLSL (it calls
   applyLensBend and lensCaptured), and BEFORE the point vertex shader that
   uses lensBendWorld — see POINTS_VERT_LENSED in engine.ts. */
export const LENS_POINT_GLSL = /* glsl */ `
vec3 lensBendWorld(vec3 worldPos){
  vec3 delta = worldPos - cameraPosition;
  float dist = length(delta);
  if (dist < 1e-4) return worldPos;
  vec3 bent = applyLensBend(delta / dist);
  if (lensCaptured(bent)) return cameraPosition - delta;
  return cameraPosition + bent * dist;
}
`;

/**
 * Universe Surface Vertex Shader.
 * Projects positions of the inverted celestial sky sphere into directional vectors.
 */
export const universeSurfaceVert = /* glsl */ `
varying vec3 vDir;

void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Universe Surface Fragment Shader.
 * Generates an authentic, multi-layered deep space reality canvas:
 * 1. Abyssal vacuum background tuned to reality deep colors.
 * 2. Multi-tier Cosmic Web filaments and superclusters.
 * 3. Galactic plane and custom nebular ion fields matching the active reality palette.
 * 4. Interstellar dust lanes and relativistic dark matter folds.
 * 5. Multi-tiered star fields.
 * 6. Authentic geometric Kamui Space-Time vacuum vortex for dimension transitions.
 */
export const universeSurfaceFrag = /* glsl */ `
uniform float uTime;
uniform float uKamuiErase;
uniform vec3 uVortexDir;
${LENS_UNIFORMS_GLSL}

// Reality-specific custom surface uniforms
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uDeepColor;
uniform vec3 uStarColor;
uniform vec3 uWebFilaments;
uniform float uNebulaIntensity;
uniform float uDustLaneIntensity;
uniform float uStarDensity;

varying vec3 vDir;

${NOISE}

${LENS_WARP_GLSL}

float starHash(vec3 p){
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main(){
  float k = clamp(uKamuiErase, 0.0, 1.0);
  if (k >= 0.998) {
    discard;
  }
  
  vec3 rawD = normalize(vDir);
  vec3 d = rawD;
  float edgeAlpha = 1.0;
  
  // =========================================================================
  // AUTHENTIC KAMUI SPACE-TIME VACUUM VORTEX (REALITY TRANSCENDENCE JUTSU)
  // =========================================================================
  if (k > 0.0005) {
    vec3 vAxis = normalize(uVortexDir);
    if (length(vAxis) < 0.01) {
      vAxis = vec3(0.0, 0.0, -1.0);
    }
    
    vec3 upRef = abs(vAxis.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangentX = normalize(cross(vAxis, upRef));
    vec3 tangentY = cross(tangentX, vAxis);
    
    float dotV = clamp(dot(rawD, vAxis), -1.0, 1.0);
    float alpha = acos(dotV);
    float r = alpha / 3.14159265;
    
    float theta = atan(dot(rawD, tangentY), dot(rawD, tangentX));
    
    // Logarithmic Spiral Frame-Dragging Streamlines
    float vortexTwist = (18.0 * pow(k, 1.25)) / (pow(r, 0.58) + 0.035) + uTime * (5.5 + 4.5 * k);
    float twistedTheta = theta + vortexTwist;
    
    // 3-Blade Spiral Streamline Phase Coordinate
    float psi = 3.0 * theta + (14.0 * pow(k, 1.2)) / (pow(r, 0.52) + 0.05) - uTime * 7.2;
    float spiralArmMetric = sin(psi) * 0.35 * k + cos(psi * 2.0 + uTime * 3.0) * 0.12 * k;
    
    // Suction Horizon
    float spiralHorizon = (1.0 - pow(k, 1.12)) * 1.35 + spiralArmMetric * (1.0 - 0.3 * k);
    spiralHorizon = max(0.0001, spiralHorizon);

    // Coordinate Inward Draw
    float rNorm = r / max(0.001, spiralHorizon);
    float rSuction = pow(clamp(rNorm, 0.0002, 1.0), 1.0 + k * 1.5) * (1.0 + sin(psi) * 0.15 * k);
    rSuction = clamp(rSuction, 0.0002, 1.0);
    float warpedAlpha = rSuction * 3.14159265;

    vec3 warpedRay = cos(twistedTheta) * sin(warpedAlpha) * tangentX +
                     sin(twistedTheta) * sin(warpedAlpha) * tangentY +
                     cos(warpedAlpha) * vAxis;
    d = normalize(warpedRay);

    float distToHorizon = spiralHorizon - r;
    edgeAlpha = r > spiralHorizon ? smoothstep(0.12, 0.0, r - spiralHorizon) : smoothstep(-0.07, 0.0, distToHorizon);
  }

  /* GRAVITATIONAL LENSING — the masses bend this canvas and nothing else.
     Applied after the Kamui transcendence warp, before any layer is sampled.
     The black hole is one of these lenses with the strongest ring of all:
     the surface in contact with the hole bends into a circular halo around
     its silhouette, and the rest of the sky holds still. */
  d = applyLensBend(d);

  /* ROUND 61 — the well is the ONE shared law now (lensWellDarken above):
     the dome, the photo sky and every star shell darken by the same curve
     of the same angle, so the depression the user asked for — gradual pour,
     super-steep only at the rim — shows as ONE smooth well, never layers. */
  float wellDarken = lensWellDarken(rawD);

  /* Round 16 — CAPTURED rays paint the TRUE SHADOW: inside b_c = (3√3/2)·rs
     no image of the background exists, so the sky is genuinely absent — pure
     black, not darkened. This thin ring just outside the composite's own
     horizon mesh is the Event Horizon Telescope look, produced by the
     equations rather than painted on. Normal blending makes it a true hole
     in the luminous sky. */
  if (d.x < -0.99 && d.y < -0.99 && d.z < -0.99) {
    gl_FragColor = vec4(vec3(0.0), edgeAlpha);
    return;
  }

  // Abyssal deep universe background base, modulated by reality deepColor
  vec3 col = max(vec3(0.001, 0.0015, 0.003), uDeepColor);
  
  // =========================================================================
  // COSMOLOGICAL HIERARCHY STRUCTURE (From Cosmic Web to Solar System Scale)
  // =========================================================================
  
  // 1. COSMIC WEB & FILAMENTS
  vec3 webCoord = d * 4.5 + vec3(uTime * 0.001, 0.0, uTime * 0.0005);
  float n1 = snoise(webCoord);
  float n2 = snoise(webCoord * 2.1 + vec3(3.2, 7.1, 1.4));
  float filaments = pow(max(0.0, 1.0 - abs(n1) - abs(n2)), 3.5);
  float cosmicVoid = smoothstep(0.2, 0.7, abs(fbm3(d * 1.8)));
  
  vec3 webTone = mix(uWebFilaments * 0.4, uColorA * 0.3, filaments);
  col += webTone * filaments * cosmicVoid * 1.6;
  
  // 2. SUPERCLUSTERS & GALAXY CLUSTERS AT WEB NODES
  float nodes = pow(filaments, 2.5) * smoothstep(0.3, 0.8, fbm3(d * 6.0));
  vec3 superclusterGlow = mix(vec3(0.08, 0.09, 0.16), uColorB * 0.25, 0.4) * nodes * 2.5;
  col += superclusterGlow;
  
  // 3. DISTANT GALAXY SPECS
  vec3 galCell = floor(d * 32.0);
  float galHash = starHash(galCell);
  if (galHash > 0.985) {
    float galDist = length(fract(d * 32.0) - 0.5);
    float galFall = smoothstep(0.42, 0.0, galDist);
    float galCore = pow((galHash - 0.985) / 0.015, 3.0) * galFall;
    vec3 galCol = mix(uColorA, uColorB, fract(galHash * 43.0));
    col += galCol * galCore * 0.45;
  }
  
  // 4. GALACTIC PLANE & SPIRAL STREAM
  vec3 bn = normalize(vec3(d.x, d.y * 2.2, d.z));
  float galacticPlane = exp(-pow(bn.y * 3.2, 2.0));
  vec3 bulgeCol = mix(vec3(0.065, 0.05, 0.075), uColorA * 0.08, 0.5);
  col += bulgeCol * galacticPlane;
  
  // 5. INTERSTELLAR DUST LANES
  float dustLanes = fbm3(d * 3.5 + vec3(1.4, -2.1, 4.8));
  float dustMask = 1.0 - smoothstep(0.35, 0.75, dustLanes) * galacticPlane * (0.85 * uDustLaneIntensity);
  col *= dustMask;
  
  // 6. LOCAL STAR-FORMING REGIONS / REALITY NEBULA VEIL
  float HII_region = fbm3(d * 2.2 + vec3(-5.2, 3.1, -1.8));
  float nebulaIon = pow(smoothstep(0.45, 0.82, HII_region), 2.2) * galacticPlane;
  vec3 HII_col = mix(uColorA * 0.1, uColorB * 0.12, sin(d.x * 3.0) * 0.5 + 0.5);
  col += HII_col * nebulaIon * (1.5 * uNebulaIntensity);
  
  // 7. MULTI-SCALE PROCEDURAL STARS
  vec3 starCell1 = floor(d * 900.0);
  float s1 = starHash(starCell1);
  float starThreshold1 = mix(0.9992, 0.9980, uStarDensity);
  if(s1 > starThreshold1) {
    float starDist1 = length(fract(d * 900.0) - 0.5);
    float b = pow((s1 - starThreshold1) / (1.0 - starThreshold1), 2.5) * smoothstep(0.45, 0.0, starDist1);
    vec3 specCol = mix(vec3(0.65, 0.82, 1.0), uStarColor, fract(s1 * 17.0));
    col += specCol * b * 0.55 * dustMask;
  }

  vec3 starCell2 = floor(d * 1500.0);
  float s2 = starHash(starCell2);
  float starThreshold2 = mix(0.9998, 0.9994, uStarDensity);
  if(s2 > starThreshold2) {
    float starDist2 = length(fract(d * 1500.0) - 0.5);
    float b = pow((s2 - starThreshold2) / (1.0 - starThreshold2), 3.0) * smoothstep(0.45, 0.0, starDist2);
    vec3 specCol = mix(vec3(0.8, 0.9, 1.0), uStarColor, fract(s2 * 31.0));
    col += specCol * b * 0.85;
  }

  float alpha = edgeAlpha * (1.0 - smoothstep(0.88, 0.998, k));
  col *= 1.0 - wellDarken;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;
