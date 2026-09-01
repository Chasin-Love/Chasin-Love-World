/* GLSL library for MY UNIVERSE — all shaders share a simplex noise chunk. */

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0,0.5,1.0,2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0,i1.z,i2.z,1.0))
        + i.y + vec4(0.0,i1.y,i2.y,1.0)) + i.x + vec4(0.0,i1.x,i2.x,1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0*floor(p*ns.z*ns.z);
  vec4 x_ = floor(j*ns.z);
  vec4 y_ = floor(j - 7.0*x_);
  vec4 x = x_*ns.x + ns.yyyy;
  vec4 y = y_*ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m*m;
  return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float f = 0.0; float a = 0.5;
  for(int i=0;i<5;i++){ f += a*snoise(p); p *= 2.03; a *= 0.5; }
  return f;
}
float fbm3(vec3 p){
  float f = 0.0; float a = 0.5;
  for(int i=0;i<3;i++){ f += a*snoise(p); p *= 2.11; a *= 0.5; }
  return f;
}
`;

/* ------------------------------ star ------------------------------ */

export const starVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const starFrag = /* glsl */ `
uniform float uTime; uniform float uBoost;
uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uCoreColor;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}

// Ultra-detailed thermal palette adapted to current reality's star spectrum
vec3 getStarColor(float t, float spot) {
  vec3 colA = length(uColorA) > 0.05 ? uColorA : vec3(1.0, 0.65, 0.15);
  vec3 colB = length(uColorB) > 0.05 ? uColorB : vec3(0.9, 0.2, 0.02);
  vec3 coreCol = length(uCoreColor) > 0.05 ? uCoreColor : vec3(1.0, 1.0, 1.0);

  vec3 dark = colB * 0.12;
  vec3 cool = colB;
  vec3 warm = colA;
  vec3 hot  = mix(colA, coreCol, 0.65);
  vec3 core = coreCol;
  
  vec3 col = mix(dark, cool, smoothstep(0.0, 0.3, t));
  col = mix(col, warm, smoothstep(0.3, 0.6, t));
  col = mix(col, hot, smoothstep(0.6, 0.85, t));
  col = mix(col, core, smoothstep(0.85, 1.0, t));
  
  // Sunspots dim the thermal emission strongly
  return mix(col, dark, spot);
}

void main(){
  vec3 n = normalize(vN);
  vec3 viewDir = normalize(cameraPosition - vW);
  float mu = max(dot(n, viewDir), 0.0);
  
  vec3 q = normalize(vP);
  float t_slow = uTime * 0.015;
  float t_fast = uTime * 0.04;
  
  // 1. High-frequency Granulation (convection cells)
  float n1 = fbm3(q * 38.0 + vec3(t_fast));
  float n2 = fbm3(q * 72.0 - vec3(t_fast * 1.3));
  float gran = abs(n1 + n2 * 0.5); // cellular look
  gran = 1.0 - smoothstep(0.0, 1.3, gran);
  gran = pow(gran, 2.2); // sharp cell edges
  
  // 2. Magnetic Flux Tubes / Solar Filaments (swirling structures)
  vec3 warp = q * 2.2 + vec3(fbm3(q * 1.8 + t_slow));
  float tubes = fbm(warp * 4.2 - vec3(0.0, t_slow, 0.0));
  
  // 3. Sunspots (dark magnetic disturbances)
  float spotNoise = fbm(q * 3.2 + vec3(t_slow * 0.6));
  float spots = smoothstep(0.62, 0.85, spotNoise);
  // Penumbra (lighter outer ring of spot)
  float penumbra = smoothstep(0.45, 0.62, spotNoise) - spots;
  
  // Combine temperatures
  // Base temp modified by granulation and filaments
  float temp = 0.25 + 0.35 * gran + 0.4 * tubes;
  // Boost temperature at filament ridges (plages/active regions)
  temp += smoothstep(0.4, 0.8, tubes) * 0.35;
  
  // spot strength
  float spotFactor = spots * 0.95 + penumbra * 0.55;
  
  vec3 col = getStarColor(clamp(temp, 0.0, 1.0), spotFactor);
  
  // Extreme limb darkening (center is much brighter, edges are darker/redder)
  float limb = pow(max(mu, 0.0), 0.55); 
  col *= mix(vec3(0.5, 0.1, 0.0), vec3(1.0), limb);
  
  // Active region glowing near limbs
  float limbGlow = pow(1.0 - mu, 3.0);
  vec3 limbCol = length(uColorA) > 0.05 ? uColorA : vec3(1.0, 0.5, 0.1);
  col += limbCol * limbGlow * (tubes * 1.8) * uBoost;
  
  float pulse = 1.0 + 0.02 * sin(uTime * 0.6);
  col *= pulse * uBoost;
  
  // Incandescent central glow
  vec3 coreHighlight = length(uCoreColor) > 0.05 ? uCoreColor : vec3(1.0, 0.95, 0.85);
  col += coreHighlight * pow(max(mu, 0.0), 4.5) * 0.35;
  
  gl_FragColor = vec4(col * 1.25, 1.0);
}`;

/* ----------------------------- planet ----------------------------- */

export const planetVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const planetFrag = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uBase; uniform vec3 uHigh; uniform vec3 uIce;
uniform vec3 uSunDir; uniform float uTime; uniform float uSea; uniform float uGhost;
uniform float uNight; uniform vec3 uSeed; uniform float uFade;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 q = normalize(vP) + uSeed;
  
  float warp = fbm3(q*2.3);
  float h = fbm(q*2.9 + warp*0.55);
  
  // High-frequency detail added to the height directly for coloring (not normals)
  float detail = fbm(q*9.0)*0.16;
  h += detail;
  
  float land = smoothstep(uSea - 0.03, uSea + 0.03, h);
  vec3 terrain = mix(uDeep, uBase, smoothstep(uSea, uSea + 0.30, h));
  terrain = mix(terrain, uHigh, smoothstep(uSea + 0.28, uSea + 0.62, h));
  
  float lat = abs(normalize(vP).y);
  float iceMask = smoothstep(0.62, 0.86, lat + h*0.18 - 0.1);
  terrain = mix(terrain, uIce, iceMask);
  
  vec3 ocean = uDeep * (0.75 + 0.45*smoothstep(-0.5, uSea, h));
  vec3 col = mix(ocean, terrain, land);
  
  // Smooth lighting based on actual sphere normal
  float sun = dot(n, normalize(uSunDir));
  float day = smoothstep(-0.12, 0.28, sun);
  
  // Gentle ambient boost
  vec3 lit = col * (0.15 + 1.15*day);
  
  vec3 viewDir = normalize(cameraPosition - vW);
  float spec = pow(max(dot(reflect(-normalize(uSunDir), n), viewDir), 0.0), 42.0);
  lit += vec3(1.0, 0.92, 0.78) * spec * (1.0 - land) * day * 0.55;
  
  float cityMask = smoothstep(0.52, 0.78, fbm(q*7.5 + 11.0)) * land * (1.0 - iceMask);
  vec3 nightCol = vec3(1.0, 0.78, 0.42) * cityMask * uNight * (1.0 - day) * 0.9;
  lit += nightCol;
  
  float term = smoothstep(-0.14, 0.14, sun);
  lit = mix(lit * vec3(0.5, 0.62, 0.85), lit, term);
  lit = mix(lit, vec3(0.45, 0.53, 0.66) * (0.25 + 0.75*day), uGhost);
  
  gl_FragColor = vec4(lit, uFade);
}`;

/* ----------------------------- clouds ----------------------------- */

export const cloudFrag = /* glsl */ `
uniform float uTime; uniform vec3 uSunDir; uniform vec3 uSeed; uniform float uCover; uniform float uFade;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 q = normalize(vP) + uSeed;
  float c = fbm(q*3.4 + vec3(uTime*0.012, 0.0, uTime*0.008));
  c += 0.35*fbm(q*8.0 - vec3(uTime*0.02));
  float a = smoothstep(0.62 - uCover*0.3, 0.86, c);
  float sun = dot(normalize(vN), normalize(uSunDir));
  float day = smoothstep(-0.2, 0.4, sun); // softened terminator
  vec3 col = vec3(1.0) * (0.25 + 0.85*day); // gentler ambient
  gl_FragColor = vec4(col, a * 0.82 * uFade);
}`;

/* --------------------------- atmosphere --------------------------- */

export const atmoFrag = /* glsl */ `
uniform vec3 uColor; uniform float uStrength; uniform vec3 uSunDir;
varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float ndotv = abs(dot(n, v));
  float rim = pow(max(1.0 - ndotv, 0.0), 3.5);
  float sun = dot(n, normalize(uSunDir));
  float day = smoothstep(-0.25, 0.25, sun);
  float a = rim * uStrength * (0.35 + 0.65*day);
  vec3 col = mix(uColor * 0.8, uColor * 1.5, day);
  gl_FragColor = vec4(col, a);
}`;

/* ------------------------------ rings ----------------------------- */

export const ringVert = /* glsl */ `
varying vec2 vP;
void main(){
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const ringFrag = /* glsl */ `
uniform float uInner; uniform float uOuter; uniform vec3 uTint; uniform vec3 uSunLocal;
varying vec2 vP;
${NOISE}
void main(){
  float r = length(vP);
  float t = (r - uInner) / (uOuter - uInner);
  if(t < 0.0 || t > 1.0) discard;
  float bands = 0.5 + 0.5*snoise(vec3(t*46.0, 3.7, 1.3));
  bands *= 0.55 + 0.45*snoise(vec3(t*130.0, 9.1, 4.4));
  float gap1 = smoothstep(0.02, 0.07, abs(t - 0.62));
  float gap2 = smoothstep(0.015, 0.05, abs(t - 0.31));
  float edge = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.9, 1.0, t));
  float a = bands * gap1 * gap2 * edge * 0.9;
  vec2 dir = normalize(vP + vec2(1e-5));
  vec2 sl = normalize(uSunLocal.xy + vec2(1e-4));
  float shade = 0.3 + 0.7*smoothstep(-0.5, 0.35, dot(dir, sl));
  float lit = 0.45 + 0.55*abs(uSunLocal.z);
  vec3 col = mix(vec3(0.62, 0.55, 0.44), uTint, 0.45) * lit * shade * 1.5;
  gl_FragColor = vec4(col, a);
}`;

/* -------------------------- accretion disc ------------------------ */

export const discFrag = /* glsl */ `
uniform float uTime; uniform float uInner; uniform float uOuter;
uniform vec3 uColor; uniform vec3 uColor2;
varying vec2 vP;
${NOISE}
void main(){
  float r = length(vP);
  float t = (r - uInner) / (uOuter - uInner);
  if(t < 0.0 || t > 1.0) discard;
  float ang = atan(vP.y, vP.x);
  float swirl = fbm3(vec3(cos(ang)*2.0 + r*3.0 - uTime*0.9, sin(ang)*2.0, r*6.0 - uTime*0.6));
  float heat = pow(1.0 - t, 2.2);
  float streaks = 0.55 + 0.45*sin(ang*9.0 + r*30.0 - uTime*2.4 + swirl*4.0);
  vec3 col = mix(uColor, uColor2, heat);
  float a = heat * streaks * (0.4 + 0.6*smoothstep(0.0, 0.18, t)) * (1.0 - smoothstep(0.7, 1.0, t));
  a *= 0.75 + 0.25*swirl;
  gl_FragColor = vec4(col * (0.8 + heat*1.4), a * 0.9);
}`;

/* ------------------------------ nebula ---------------------------- */

export const nebulaFrag = /* glsl */ `
uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  if(r >= 0.98) discard;
  
  // Multi-frequency turbulent coordinates
  vec3 q1 = vec3(p * 2.4, uTime * 0.025);
  vec3 q2 = vec3(p * 4.8 - vec2(uTime * 0.015, uTime * 0.02), uTime * 0.018);
  
  float n1 = fbm(q1);
  float n2 = fbm(q2 + n1 * 0.9);
  
  // Sharp filamentary shock fronts and ionization ridges
  float ridge1 = 1.0 - abs(n1 * 1.8 - 0.9);
  float ridge2 = 1.0 - abs(n2 * 2.0 - 1.0);
  float filaments = pow(max(ridge1 * 0.6 + ridge2 * 0.5, 0.0), 2.2);
  
  // Dark absorption dust veins carving through the emission cloud
  float dustLane = smoothstep(0.48, 0.78, fbm3(vec3(p * 3.6 + 5.3, uTime * 0.01)));
  
  // Luminous stellar nursery core
  float core = exp(-r * 3.8);
  float edgeFade = smoothstep(0.98, 0.2, r) * (1.0 - r);
  
  // Multi-tier cosmic color mapping
  vec3 col = mix(uColorA, uColorB, smoothstep(0.1, 0.9, n2 * 0.6 + n1 * 0.4));
  col = mix(col, vec3(1.0, 0.92, 0.82), core * 0.75 + pow(filaments, 3.0) * 0.4);
  col += uColorB * pow(filaments, 1.8) * 0.6;
  
  // Apply dust absorption
  col *= (1.0 - dustLane * 0.72);
  
  float a = (filaments * 0.65 + core * 0.55) * edgeFade * (1.0 - dustLane * 0.5) * uOpacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(col * 1.35, a * 0.75);
}`;

/* ------------------------- generic points ------------------------- */

export const pointsVert = /* glsl */ `
attribute float aSize; attribute vec3 aColor; attribute float aAlpha;
uniform float uScale; uniform float uTime; uniform float uTwinkle;
varying vec3 vColor; varying float vAlpha; varying float vSize;
void main(){
  vColor = aColor;
  float tw = uTwinkle > 0.5 ? (0.76 + 0.24 * sin(uTime * 2.6 + position.x * 17.3 + position.y * 11.1 + position.z * 7.7)) : 1.0;
  vAlpha = aAlpha * tw;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float pSize = aSize * uScale * (260.0 / max(-mv.z, 0.001));
  gl_PointSize = clamp(pSize, 1.5, 36.0);
  vSize = gl_PointSize;
  gl_Position = projectionMatrix * mv;
}`;

export const pointsFrag = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor; varying float vAlpha; varying float vSize;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if(d >= 0.49) discard;
  
  float mask = smoothstep(0.49, 0.0, d);
  float core = exp(-d * d * 36.0);
  float halo = exp(-d * 6.0) * 0.22;
  
  vec3 col = mix(vColor, vec3(1.0, 0.96, 0.9), core * 0.5);
  float a = (core * 0.85 + halo) * mask * vAlpha * uOpacity;
  
  if (a < 0.003) discard;
  
  gl_FragColor = vec4(col, a);
}`;

/* --------------------------- portal pass -------------------------- */

export const portalFrag = /* glsl */ `
uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength;
uniform float uTime; uniform vec3 uColor; uniform float uAspect;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 uv = vUv;
  vec2 o = uv - uCenter;
  vec2 d = vec2(o.x * uAspect, o.y);
  float r = length(d);
  float s = uStrength;
  
  // Kamui Space-Time Vortex Distortion
  float fall = exp(-r * 3.8);
  // High-frequency spiral twisting effect
  float spiralTwist = s * 6.5 * fall;
  float ripple = sin(r * 32.0 - uTime * 6.0) * s * 0.18 * fall;
  float ang = spiralTwist + ripple;
  
  float ca = cos(ang); float sa = sin(ang);
  d = mat2(ca, -sa, sa, ca) * d;
  
  // Gravitational implosion pull towards portal center
  vec2 pullDir = normalize(o + vec2(1e-6));
  vec2 suv = uCenter + vec2(d.x / uAspect, d.y) - pullDir * s * 0.28 * fall;
  
  // Chromatic dispersion (RGB separation caused by extreme spatial warping)
  float ab = s * 0.025 * fall + 0.0002;
  vec3 col;
  col.r = texture2D(tDiffuse, suv + vec2(ab, 0.0)).r;
  col.g = texture2D(tDiffuse, suv).g;
  col.b = texture2D(tDiffuse, suv - vec2(ab, 0.0)).b;
  
  // Central Kamui singularity void
  float coreR = 0.22 * s;
  float core = smoothstep(coreR, coreR * 0.2, r);
  col *= 1.0 - core * 0.98;
  
  // Concentric spatial rift energy rings
  float ring = exp(-abs(r - (0.15 + 0.12 * s)) * 28.0);
  float ring2 = exp(-abs(r - (0.06 + 0.24 * s)) * 45.0);
  float KamuiGlow = exp(-abs(r - 0.05) * 50.0) * s;
  
  vec3 portalHue = mix(uColor, vec3(0.3, 0.9, 1.0), sin(uTime * 4.0) * 0.3 + 0.3);
  col += portalHue * (ring * 1.2 + ring2 * 0.6 + KamuiGlow * 1.5) * s;
  col += vec3(1.0, 0.95, 0.85) * core * 0.2 * s;
  
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------- surface terrain ------------------------ */

export const terrainFrag = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uBase; uniform vec3 uHigh; uniform vec3 uIce;
uniform vec3 uSunDir; uniform vec3 uFog; uniform float uFogDensity;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 q = vP * 0.16;
  float h = fbm(q*1.4);
  float patch = smoothstep(0.0, 0.4, fbm(q*0.5 + 9.0));
  vec3 col = mix(uBase, uHigh, smoothstep(0.05, 0.5, h));
  col = mix(col, uDeep, smoothstep(-0.1, -0.45, h) * 0.7);
  col = mix(col, uIce * 0.9, smoothstep(0.55, 0.8, h) * 0.4);
  float sun = max(dot(n, normalize(uSunDir)), 0.0);
  vec3 lit = col * (0.16 + 1.05*sun);
  float dist = length(cameraPosition - vW);
  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  lit = mix(lit, uFog, clamp(fog, 0.0, 1.0));
  gl_FragColor = vec4(lit, 1.0);
}`;

export const terrainVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

/* --------------------------- anchor corona ------------------------- */
/* view-space billboard with organic ray structure — no sprite ring edges */
export const coronaVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy;
  gl_Position = projectionMatrix * mv;
}`;

export const coronaFrag = /* glsl */ `
uniform float uTime; uniform float uBoost;
uniform vec3 uColorA; uniform vec3 uColorB;
varying vec2 vUv;
${NOISE}

void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  if(r > 1.0) discard;
  
  float ang = atan(p.y, p.x);
  float t = uTime * 0.05;
  
  // Base field distortion for plasma swirling
  float swirl = fbm(vec3(p * 2.5, t)) * 0.8;
  float angDist = ang + swirl * (1.0 - r); 
  
  // Radial magnetic rays (high frequency)
  float rayNoise1 = snoise(vec3(cos(angDist)*4.0, sin(angDist)*4.0, t * 2.0));
  float rayNoise2 = snoise(vec3(cos(angDist)*14.0, sin(angDist)*14.0, t * 4.0 + 10.0));
  float rays = rayNoise1 * 0.5 + rayNoise2 * 0.25;
  rays = rays * 0.5 + 0.5; // map to 0..1
  
  // Sweeping Coronal Mass Ejections (CMEs) / Prominences
  float eruptDist = ang - swirl * 1.5 - r * 2.5;
  float eruptions = fbm3(vec3(cos(eruptDist)*1.5, sin(eruptDist)*1.5, t*1.2));
  eruptions = smoothstep(0.3, 0.8, eruptions);
  
  // Smooth physical falloff — inner K-corona bright, outer F-corona faint
  float inner = pow(1.0 - smoothstep(0.12, 0.45, r), 2.8);
  float outer = pow(1.0 - smoothstep(0.2, 1.0, r), 1.8);
  
  // Structure details
  float streaks = 0.35 + 0.65 * pow(rays, 1.8);
  float wisps = eruptions * (1.0 - smoothstep(0.15, 1.0, r)) * 1.8;
  
  // Dynamic spectral palette adapted to active reality
  vec3 colA = length(uColorA) > 0.05 ? uColorA : vec3(1.0, 0.6, 0.15);
  vec3 colB = length(uColorB) > 0.05 ? uColorB : vec3(0.9, 0.15, 0.02);

  vec3 ultraHot = mix(vec3(1.0, 1.0, 1.0), colA, 0.4);
  vec3 warm = colA;
  vec3 deep = colB;
  
  // Blend colors radially and structurally
  vec3 col = mix(deep, warm, inner * streaks + wisps * 0.5);
  col = mix(col, ultraHot, pow(inner, 3.0));
  
  // Opacity masking
  float a = (inner * streaks * 0.9 + outer * 0.3 * (0.3 + 0.7*streaks) + wisps * 0.45);
  
  // Hide the center slightly so it doesn't wash out the star completely (additive blending)
  float starMask = smoothstep(0.15, 0.20, r);
  a *= (0.4 + 0.6 * starMask);
  
  a *= uBoost;
  
  gl_FragColor = vec4(col * (1.0 + inner * 1.5), a * (1.0 - smoothstep(0.8, 1.0, r)));
}`;

/* ------------------------- deep-sky backdrop ----------------------- */
export const backdropVert = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const backdropFrag = /* glsl */ `
uniform float uTime;
varying vec3 vDir;
${NOISE}

float starHash(vec3 p){
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main(){
  vec3 d = normalize(vDir);
  
  // Abyssal deep space vacuum background (360-degree dark universe base)
  vec3 col = vec3(0.001, 0.0015, 0.003);
  
  // =========================================================================
  // COSMOLOGICAL HIERARCHY STRUCTURE (From Cosmic Web to Solar System Scale)
  // =========================================================================
  
  // 1. COSMIC WEB & SUPERCLUSTER COMPLEX (Filaments & Voids across billions of light-years)
  vec3 webCoord = d * 4.5 + vec3(uTime * 0.001, 0.0, uTime * 0.0005);
  float n1 = snoise(webCoord);
  float n2 = snoise(webCoord * 2.1 + vec3(3.2, 7.1, 1.4));
  float filaments = pow(max(0.0, 1.0 - abs(n1) - abs(n2)), 3.5); // Web filament lines
  float cosmicVoid = smoothstep(0.2, 0.7, abs(fbm3(d * 1.8)));  // Large cosmic voids
  
  // Cosmic web color (deep indigo & violet intergalactic filaments)
  vec3 webCol = mix(vec3(0.015, 0.035, 0.095), vec3(0.045, 0.025, 0.11), filaments);
  col += webCol * filaments * cosmicVoid * 1.6;
  
  // 2. SUPERCLUSTERS & GALAXY CLUSTERS AT WEB NODES
  // Nodes where filaments intersect house dense galaxy superclusters
  float nodes = pow(filaments, 2.5) * smoothstep(0.3, 0.8, fbm3(d * 6.0));
  vec3 superclusterGlow = vec3(0.08, 0.09, 0.16) * nodes * 2.5;
  col += superclusterGlow;
  
  // 3. DISTANT GALAXIES & GALAXY GROUPS
  // Micro galaxy points and spiral blurs mapped in deep background.
  // Radial falloff inside each cell keeps every galaxy a soft round glow —
  // never a filled square patch.
  vec3 galCell = floor(d * 32.0);
  float galHash = starHash(galCell);
  if (galHash > 0.985) {
    float galDist = length(fract(d * 32.0) - 0.5);
    float galFall = smoothstep(0.42, 0.0, galDist);
    float galCore = pow((galHash - 0.985) / 0.015, 3.0) * galFall;
    vec3 galCol = mix(vec3(0.9, 0.7, 0.5), vec3(0.5, 0.7, 1.0), fract(galHash * 43.0));
    col += galCol * galCore * 0.45;
  }
  
  // 4. MILKY WAY GALAXY PLANE & SPIRAL ARMS (Our Home Galaxy)
  // Equatorial galactic disk projection
  vec3 bn = normalize(vec3(d.x, d.y * 2.2, d.z));
  float galacticPlane = exp(-pow(bn.y * 3.2, 2.0));
  
  // Galactic Bulge & Integrated Starlight
  vec3 bulgeCol = vec3(0.065, 0.05, 0.075);
  col += bulgeCol * galacticPlane;
  
  // 5. DARK MATTER & INTERSTELLAR DUST LANES (Orion Arm Dust Silhouette)
  // Dark molecular dust lanes obscuring the galactic plane
  float dustLanes = fbm3(d * 3.5 + vec3(1.4, -2.1, 4.8));
  float dustMask = 1.0 - smoothstep(0.35, 0.75, dustLanes) * galacticPlane * 0.85;
  col *= dustMask;
  
  // 6. LOCAL STAR-FORMING REGIONS (H II Ionized Molecular Nebulae - e.g. Orion Nebula)
  float HII_region = fbm3(d * 2.2 + vec3(-5.2, 3.1, -1.8));
  float nebulaIon = pow(smoothstep(0.45, 0.82, HII_region), 2.2) * galacticPlane;
  vec3 HII_col = mix(vec3(0.05, 0.015, 0.06), vec3(0.02, 0.05, 0.08), sin(d.x * 3.0) * 0.5 + 0.5);
  col += HII_col * nebulaIon * 1.5;
  
  // 7. STELLAR SYSTEM & LOCAL FOREGROUND STARS (Spectral Classes O, B, A, F, G, K, M)
  vec3 starCell1 = floor(d * 900.0);
  float s1 = starHash(starCell1);
  if(s1 > 0.9986) {
    float starDist1 = length(fract(d * 900.0) - 0.5);
    float b = pow((s1 - 0.9986) / 0.0014, 2.5) * smoothstep(0.45, 0.0, starDist1);
    // Spectral color temperature (Blue O/B stars to Warm G/K/M stars)
    vec3 specCol = mix(vec3(0.65, 0.82, 1.0), vec3(1.0, 0.85, 0.65), fract(s1 * 17.0));
    col += specCol * b * 0.5 * dustMask;
  }

  vec3 starCell2 = floor(d * 1500.0);
  float s2 = starHash(starCell2);
  if(s2 > 0.9997) {
    float starDist2 = length(fract(d * 1500.0) - 0.5);
    float b = pow((s2 - 0.9997) / 0.0003, 3.0) * smoothstep(0.45, 0.0, starDist2);
    vec3 specCol = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 0.92, 0.75), fract(s2 * 31.0));
    col += specCol * b * 0.85;
  }
  
  gl_FragColor = vec4(col, 1.0);
}
`;

/* --------------------------- multiverse bubble ----------------------- */
export const multiverseVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const multiverseFrag = /* glsl */ `
uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float rim = 1.0 - abs(dot(n, v));
  float irid = pow(rim, 2.2);
  
  // Internal cosmic swirl inside bubble universe
  vec3 q = vP * 0.00015 + vec3(uTime * 0.02, uTime * 0.01, 0.0);
  float swirl = fbm(q * 4.0);
  float galCore = exp(-length(vP.xy) * 0.0001);
  
  vec3 col = mix(uColorA, uColorB, swirl * 0.8 + 0.2);
  vec3 rimCol = mix(vec3(0.4, 0.85, 1.0), vec3(1.0, 0.45, 0.85), sin(uTime * 0.8 + rim * 6.2) * 0.5 + 0.5);
  col += rimCol * irid * 2.2;
  col += vec3(1.0, 0.96, 0.88) * galCore * 0.8;
  
  float alpha = (irid * 0.88 + galCore * 0.5 + swirl * 0.2) * uOpacity;
  gl_FragColor = vec4(col * 1.25, alpha);
}`;

/* --------------------------- 3D asteroid ----------------------------- */
export const asteroidVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 p = position;
  float bump = fbm(p * 1.4) * 0.28 + fbm3(p * 4.8) * 0.08;
  p += normal * bump;
  // Compute displaced normal for smooth non-blocky lighting
  vec3 e1 = vec3(0.01, 0.0, 0.0);
  vec3 e2 = vec3(0.0, 0.01, 0.0);
  float bX = fbm((p + e1) * 1.4) * 0.28;
  float bY = fbm((p + e2) * 1.4) * 0.28;
  vec3 norm = normalize(normal + vec3((bX - bump)*20.0, (bY - bump)*20.0, 0.0));
  vN = normalize(normalMatrix * norm);
  vW = (modelMatrix * vec4(p, 1.0)).xyz;
  vP = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const asteroidFrag = /* glsl */ `
uniform vec3 uSunDir; uniform vec3 uColor;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  float sun = max(dot(n, normalize(uSunDir)), 0.0);
  float detail = fbm(vP * 5.5) * 0.35 + 0.65;
  // Crater rim details
  float crater = smoothstep(0.42, 0.68, fbm3(vP * 8.0));
  detail -= crater * 0.25;
  vec3 base = uColor * detail;
  vec3 lit = base * (0.15 + 1.15 * sun);
  gl_FragColor = vec4(lit, 1.0);
}`;

/* -------------------- distant exoplanet horizon plate ------------------- */
export const exoplanetPlateVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const exoplanetPlateFrag = /* glsl */ `
uniform float uTime; uniform vec3 uSunDir; uniform vec3 uColorAtm; uniform float uOpacity;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float sun = dot(n, normalize(uSunDir));
  float day = smoothstep(-0.25, 0.35, sun);
  
  // High-detail planetary landmass & gas giant bands
  vec3 q = vP * 0.002 + vec3(uTime * 0.005, 0.0, 0.0);
  float continent = fbm(q * 2.2);
  float clouds = fbm(q * 5.5 + vec3(uTime * 0.008, 0.0, 0.0));
  
  // Planet surface colors
  vec3 deepSea = vec3(0.04, 0.12, 0.28);
  vec3 land = vec3(0.18, 0.42, 0.32);
  vec3 desert = vec3(0.65, 0.48, 0.28);
  vec3 ice = vec3(0.85, 0.92, 1.0);
  
  vec3 surfCol = mix(deepSea, land, smoothstep(0.38, 0.55, continent));
  surfCol = mix(surfCol, desert, smoothstep(0.58, 0.75, continent));
  surfCol = mix(surfCol, ice, smoothstep(0.72, 0.9, clouds));
  
  // Night side bioluminescent city clusters
  float nightCities = smoothstep(0.62, 0.85, fbm(q * 12.0)) * (1.0 - day);
  vec3 nightGlow = vec3(1.0, 0.75, 0.38) * nightCities * 1.4;
  
  // Surface lighting
  vec3 lit = surfCol * (0.08 + 1.12 * day) + nightGlow;
  
  // Atmospheric rim glow (Rayleigh scattering edge)
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  vec3 atmoCol = mix(uColorAtm * 0.8, uColorAtm * 1.6, day);
  lit += atmoCol * rim * 2.2;
  
  // Alpha edge fade so it blends gracefully into deep space
  float alphaEdge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
  
  gl_FragColor = vec4(lit, (0.85 + rim * 0.3) * alphaEdge * uOpacity);
}`;

/* --------------------------- surface sky -------------------------- */

export const skyFrag = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir;
varying vec3 vW;
void main(){
  vec3 d = normalize(vW - cameraPosition);
  float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.8));
  float sun = pow(max(dot(d, normalize(uSunDir)), 0.0), 220.0);
  float halo = pow(max(dot(d, normalize(uSunDir)), 0.0), 8.0);
  col += vec3(1.0, 0.9, 0.72) * sun * 2.2 + vec3(1.0, 0.85, 0.6) * halo * 0.18;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* --------------------------- sovereign multiverse core -------------------------- */

export const demonCoreVert = /* glsl */ `
uniform float uTime;
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
${NOISE}
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vP = position;
  
  // Harmonic breathing vertex displacement
  float disp = fbm(position * 0.04 + vec3(uTime * 0.25)) * 0.08;
  vec3 displaced = position + normal * disp * (sin(uTime * 2.0) * 0.35 + 0.65);
  
  vW = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

export const demonCoreFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorAura;
uniform float uHover;
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
${NOISE}

void main(){
  vec3 n = normalize(vN);
  vec3 viewDir = normalize(cameraPosition - vW);
  float mu = max(dot(n, viewDir), 0.0);
  
  vec3 q = normalize(vP);
  float t = uTime * 0.65;
  
  // 1. Multi-octave Cosmic Harmonic Vortex Streams
  float ang = atan(q.z, q.x);
  float radius = length(q.xz);
  float swirl = sin(ang * 6.0 + radius * 8.0 - t * 1.8);
  
  // 2. Quantum Singularity Plasma Structure
  float n1 = fbm(q * 5.0 + vec3(t * 0.2, t * 0.15, -t * 0.25));
  float n2 = fbm(q * 12.0 - vec3(t * 0.35, -t * 0.2, t * 0.45));
  float plasma = (n1 * 0.6 + n2 * 0.4 + swirl * 0.15);
  
  // 3. Supreme Sovereign Color Palette: Deep Abyssal Obsidian -> Royal Indigo -> Cosmic Violet -> Radiant Amber/Gold Core
  vec3 colAbyss = vec3(0.02, 0.015, 0.04);
  vec3 colIndigo = vec3(0.08, 0.15, 0.55);
  vec3 colViolet = vec3(0.55, 0.12, 0.85);
  vec3 colCrimsonGold = vec3(0.95, 0.35, 0.12);
  vec3 colPureGold = vec3(1.0, 0.88, 0.42);
  
  vec3 col = mix(colAbyss, colIndigo, smoothstep(0.1, 0.4, plasma));
  col = mix(col, colViolet, smoothstep(0.4, 0.68, plasma));
  col = mix(col, colCrimsonGold, smoothstep(0.68, 0.88, plasma));
  col = mix(col, colPureGold, smoothstep(0.88, 0.98, plasma));
  
  // 4. Central Sacred Singularity Aperture (Focal anchor of the multiverse)
  float eyeGaze = pow(mu, 4.0);
  vec3 eyeCol = mix(vec3(0.85, 0.18, 0.35), vec3(1.0, 0.92, 0.65), eyeGaze);
  col += eyeCol * eyeGaze * 1.4;
  
  // 5. Celestial Stabilization Runes & Lattice Filaments
  float runeGrid = abs(sin(q.x * 24.0 + t) * sin(q.y * 24.0 - t * 0.7) * sin(q.z * 24.0 + t * 0.5));
  float runeSparks = smoothstep(0.72, 0.85, runeGrid) * smoothstep(0.4, 0.8, plasma);
  col += vec3(0.4, 0.9, 1.0) * runeSparks * 1.6;
  
  // 6. Radiant Spacetime Stabilizer Rim Shield
  float rim = pow(1.0 - mu, 2.2);
  vec3 rimCol = mix(vec3(0.2, 0.85, 1.0), vec3(0.95, 0.25, 0.65), sin(t * 1.2 + q.y * 4.0) * 0.5 + 0.5);
  col += rimCol * rim * 2.4;
  
  // Hover & Active Resonance Boost
  col *= 1.1 + uHover * 0.5 + sin(t * 2.5) * 0.08;
  
  gl_FragColor = vec4(col, 1.0);
}
`;
