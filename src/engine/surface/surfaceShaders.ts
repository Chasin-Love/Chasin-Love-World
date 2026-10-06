import { NOISE } from '../shaders';

/* ------------------- gravitational lensing of the surface ------------------- */

/* Round 14 — masses bend the UNIVERSE SURFACE (the celestial canvas), never
   the bodies themselves. Each lens arrives as vec4(xyz = unit world direction
   to the mass as seen by the camera, w = halo angle in radians).
   Round 107 — black holes use a signed second-order point-lens map for the
   background. Point-source vertices solve its forward image equation; sky
   fragments sample the inverse map. The captured shadow uses the raymarcher's
   measured boundary when available. This background approximation is not a
   full null-geodesic trace.
   This is the only place curvature is drawn: a diagram is not the sky,
   a body is never bent. */
export const LENS_UNIFORMS_GLSL = /* glsl */ `
uniform vec4 uLenses[16];   /* xyz = direction to the mass, w = halo angle (rad) */
uniform float uLensRim[16]; /* weak lens: apparent radius; hole: angular Schwarzschild radius */
uniform float uLensStrong[16]; /* 1.0 = black hole: black-hole sky lens map */
uniform float uLensCapture[16]; /* measured angular capture radius; 0 = Schwarzschild fallback */
uniform int uLensCount;
uniform float uLensBend;
uniform float uLensScale;   /* the black-hole raymarch's far-field mass scale */
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

/* Round 107 — map each observed direction θ to the background/source
   direction β = θ − α(θ). The black-hole branch uses the standard weak-field
   Schwarzschild deflection through second order. Crucially β stays SIGNED:
   when β crosses zero the tangent direction flips, producing the secondary
   image on the opposite side and an Einstein ring for exact alignment.
   The previous max(β, 0) silently deleted that image. There is no arbitrary
   six-shadow-radius cutoff: the deflection itself decays as 1/θ, so the
   Einstein-scale image survives at ordinary camera distances.

   The near-field shadow edge comes from the same marcher's measured critical
   impact parameter when available. The second-order weak-field map is an
   approximation outside that capture region; the accretion disk continues
   to use its existing raymarch. This is not a claim of full null-geodesic
   tracing for the background. Ordinary stars retain their existing bounded
   visual halo map. */
vec3 applyLensBend(vec3 d){
  for (int i = 0; i < 16; i++) {
    if (i >= uLensCount) break;
    vec3 L = uLenses[i].xyz;
    float halo = max(uLenses[i].w, 1e-5);
    float rim = max(uLensRim[i], 1e-6);
    float m = halo / rim;
    float cosA = clamp(dot(d, L), -1.0, 1.0);
    float ang = acos(cosA);
    if (uLensStrong[i] > 0.5) {
      /* ---- black-hole mode ---- */
      float measuredBc = uLensCapture[i];
      float rsA = measuredBc > 0.0
        ? measuredBc / 2.5980762
        : rim * max(uLensScale, 0.0);             /* analytic fallback without a live marcher */
      float bc = measuredBc > 0.0 ? measuredBc : 2.5980762 * rsA;
      /* captured — no image exists here (gated by the damped toggle: when
         the lens is released, no capture occurs and the sky heals whole) */
      if (ang < bc * uLensBend && uLensBend > 0.02) return LENS_CAPTURE;
      if (lensPerpLen(d, L) < 1e-5) continue; /* exact axis is captured above */
      float effectiveRsA = rsA * uLensBend;
      float disp = 2.0 * effectiveRsA / ang
        + 2.9452431 * effectiveRsA * effectiveRsA / (ang * ang);
      if (disp < 1e-6) continue;
      float beta = ang - disp;                    /* signed β preserves opposite-side and wrapped images */
      float ang2 = beta;
      d = lensReconstruct(L, d, cosA, ang2);
    } else {
      /* ---- weak mode: the Round 14 law ---- */
      if (lensPerpLen(d, L) < 1e-5) continue;
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
    float measuredBc = uLensCapture[i];
    float rsA = measuredBc > 0.0
      ? measuredBc / 2.5980762
      : max(uLensRim[i], 1e-6) * max(uLensScale, 0.0);
    float bc = (measuredBc > 0.0 ? measuredBc : 2.5980762 * rsA)
      * max(uLensBend, 1e-4);
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

/* Geometry points store SOURCE directions, so their vertex path must solve
   the forward lens equation for an IMAGE direction. The dome/photo fragment
   path above does the inverse operation (image pixel → source sample). Using
   applyLensBend on a star vertex had applied that inverse map in the wrong
   direction and pulled stars toward the hole. */
export const LENS_POINT_GLSL = /* glsl */ `
float lensBlackHoleDeflection(float theta, float rsA){
  float t = max(theta, 1e-6);
  float q = rsA / t;
  return 2.0 * q + 2.9452431 * q * q;
}
vec3 lensImageWorld(vec3 worldPos){
  vec3 delta = worldPos - cameraPosition;
  float dist = length(delta);
  if (dist < 1e-4) return worldPos;
  vec3 d = delta / dist;
  for (int i = 0; i < 16; i++) {
    if (i >= uLensCount) break;
    vec3 L = uLenses[i].xyz;
    float cosA = clamp(dot(d, L), -1.0, 1.0);
    float beta = acos(cosA);
    float rim = max(uLensRim[i], 1e-6);
    if (uLensStrong[i] > 0.5) {
      float strength = clamp(uLensBend, 0.0, 1.0);
      if (strength < 1e-4 || lensPerpLen(d, L) < 1e-5) continue;
      float bcFull = uLensCapture[i] > 0.0
        ? uLensCapture[i]
        : 2.5980762 * rim * max(uLensScale, 0.0);
      float rsA = (uLensCapture[i] > 0.0 ? bcFull / 2.5980762 : rim * max(uLensScale, 0.0)) * strength;
      float bc = max(bcFull * strength, 1e-6);
      float lo = bc * 1.0001;
      /* The primary image can cross the antipode for a source behind the
         lens. Keep the scalar root unwrapped; lensReconstruct's sin/cos maps
         it back onto the sphere without pinning the source to π. */
      float hi = max(beta + 2.0 * sqrt(max(2.0 * rsA, 0.0)), lo * 2.0);
      for (int j = 0; j < 12; j++) {
        float mid = 0.5 * (lo + hi);
        float mapped = mid - lensBlackHoleDeflection(mid, rsA);
        if (mapped < beta) lo = mid;
        else hi = mid;
      }
      d = lensReconstruct(L, d, cosA, 0.5 * (lo + hi));
    } else {
      if (lensPerpLen(d, L) < 1e-5) continue;
      float x = beta / rim;
      float fade = 1.0 - smoothstep((uLenses[i].w / rim) * 0.62, uLenses[i].w / rim, x);
      float pull = min(0.85 * rim / max(x, 0.35), beta * 0.85) * fade * uLensBend;
      d = lensReconstruct(L, d, cosA, beta + pull);
    }
  }
  return cameraPosition + d * dist;
}
vec3 lensBendWorld(vec3 worldPos){ return lensImageWorld(worldPos); }
`;

/* Vertex stages operate on world-space source positions. The shared well is
   evaluated on the resulting image direction so a lensed source is not
   darkened at its unlensed position. */
export const LENS_VERT_GLSL = /* glsl */ `
${LENS_UNIFORMS_GLSL}
${LENS_WARP_GLSL}
${LENS_POINT_GLSL}
float lensWellFactor(vec3 worldPos){
  vec3 dir = worldPos - cameraPosition;
  float dist = length(dir);
  if (dist < 1e-4) return 1.0;
  return 1.0 - lensWellDarken(dir / dist);
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
