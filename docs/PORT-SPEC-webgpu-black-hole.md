# PORT SPEC — dgreenheck/webgpu-black-hole (the gathered source, R64)

Everything needed to port the reference black hole verbatim, gathered by
reading every file of `webgpu-black-hole-reference` (three 0.181.1,
WebGPU/TSL) function by function, and verified against three's own render
pipeline source. This is the contract the R64 rebuild implements.

## 1. The march (blackhole-shader.js)

- `rs = blackHoleMass * 2.0` (Schwarzschild radius in shader units; config
  mass 0.4 → rs 0.8).
- Ray generation: fullscreen `uv ∈ [−1,1]`, `screenPos = (uv.x·aspect, uv.y)`,
  camera basis from `cameraPosition`/`cameraTarget` uniforms, **fov = 1.0
  hard-coded (fixed 90°)** — the PerspectiveCamera's fov is ignored.
- **Loop: exactly 64 iterations.** Break at top on
  `escaped | captured | alpha > 0.99`.
- Capture: `r < rs * 1.01` → captured, break. Escape: `r > 100.0` → escaped,
  break. **Step-exhausted rays count as escaped** (`if (captured < 0.5)
  escaped = 1`) — with 64 steps × stepSize the r=100 escape rarely fires;
  exhaustion is the normal exit.
- Bend (Euler, per step, before stepping): `rayDir += (−p/r)·(rs/r²)·stepSize
  ·lensing`, then `normalize`. **Fixed step — no adaptive stepping, no
  jitter** (the README's "adaptive step size" claim does not match the code).
- Disk plane crossing y=0: `prevPos.y · rayPos.y < 0`; linear interp to the
  hit; `inDisk = innerR < hitR < outerR`; `hitAngle = atan(z, x)`.
- Compositing front-to-back premultiplied: `color += rgb·a·(1−alpha)`,
  `alpha += (1−alpha)·a`.
- Background hook for escaped rays (lines 396–409): `bgColor =
  starBackgroundColor + starField(finalRayDir) + nebulaField(finalRayDir)`,
  `color += bgColor·(1−alpha)`. **A transparent-background port deletes this
  block — the live sky replaces it at exactly this point.**

## 2. The disk color (`createAccretionDiskColor`) — exact math

1. `normR = clamp((hitR − innerR)/(outerR − innerR), 0, 1)`.
2. `tempK = diskTemperature·1000 · (innerR/hitR)^temperatureFalloff`;
   `diskColor = blackbodyColor(tempK)`.
3. Doppler: `rotationSign = sign(diskRotationSpeed)`; `velDir =
   (−sin(angle)·sign, 0, cos(angle)·sign)`; `β = 0.3/√(hitR/innerR)`;
   `boost = pow(1/(1 − β·dot(velDir, rayDir)), 3·dopplerStrength)`;
   **`diskColor *= clamp(boost, 0.1, 5.0)`**.
4. Edge: `smoothstep(0, softInner, normR) · smoothstep(1, 1−softOuter, normR)`.
5. Turbulence (cyclic crossfade against Keplerian shear): `cyclicTime = time %
   cycleLength`; `blend = cyclicTime/cycleLength`; `phase_i = (cyclicTime [+
   cycleLength]) · rotSpeed / hitR^1.5`; noise coords
   `vec3(hitR·turbScale, cos(angle_i)/max(stretch,0.1), sin(angle_i)/max(stretch,0.1))`;
   `turb = mix(fbm2, fbm1, blend)`; `ringOpacity = pow(clamp(turb,0,1), sharpness)`.
6. Return `vec4(diskColor·diskBrightness, ringOpacity·edge)` — RGB is
   premultiplied-style (already brightness-scaled).
7. **Not in this version** (dead config keys, never read): diskDensity,
   thickness, ring/sparkle passes, temporal AA. Do not port.

Noise: `hash31`/`hash21`/`hash22` (fract·sin·43758.5453 family), 3D value
noise with `f·f·(3−2f)` smoothing, 4-octave unrolled FBM
(amplitudes 0.5, 0.5p, 0.5p², 0.5p³).

Blackbody LUT: Mitchell Charity CIE 1931 (sRGB values used raw as linear
multipliers — the reference's own approximation), 121 entries: 1000→10000 K
per 100 K, then 11000→40000 K per 1000 K, linear interpolation.

## 3. The color pipeline — the definitive answer

Verified in three's `RenderPipeline.js` / `RenderOutputNode.js`:

```
accumulate (linear-ish) → pow(1/2.2) IN-SHADER → scene RT (stored raw)
  → bloom luminosity high-pass threshold 0.4 ON THE ENCODED values
    (smoothstep(threshold, threshold+0.01) — a sharp knee)
  → scenePass + bloom (added in encoded space)
  → ACES tone map → sRGB encode → screen
```

**The reference itself double-encodes** (in-shader gamma, then renderer ACES
+ sRGB via `outputColorTransform`). A faithful port therefore KEEPS the
in-shader `pow(1/2.2)` and lets our `OutputPass` (ACES + sRGB) play the
identical second role. Bloom threshold 0.4 operates on gamma-encoded
luminance in both pipelines.

Bloom config (main.js): strength **0.68**, radius **0.2**, threshold **0.4**.
Mip blend factors [1.0, 0.8, 0.6, 0.4, 0.2] with
`lerpBloomFactor(factor, 1.2 − factor, radius)`.

## 4. Scene/post setup (main.js)

- `WebGPURenderer({ antialias: true })`, pixelRatio ≤ 2,
  `toneMapping = ACESFilmicToneMapping`, default sRGB output.
- The "fullscreen" surface is an **inverted 100-unit sphere**
  (`SphereGeometry(100)` scaled −1 in x) with the shader as its color node —
  geometry is incidental; the ray gen is screen-UV based.
- Camera: fov 60 (ignored by the shader), orbit distance clamped 5–50 world
  units; animation keyframes orbit at radii ≈ 5–25 (≈6–31·rs), always below
  the disk plane.
- `time` accumulates `min(dt, 0.033)` seconds (sim slows below 30 fps).

## 5. Full parameter table (ui.js — min/max/step/default)

| Param | min | max | step | default |
|---|---|---|---|---|
| blackHoleMass | 0.1 | 3.0 | 0.1 | 0.4 |
| gravitationalLensing | 0.5 | 3.0 | 0.1 | 2.4 |
| dopplerStrength | 0.0 | 2.0 | 0.1 | 1.0 |
| diskInnerRadius | 2.0 | 5.0 | 0.1 | 4.1 |
| diskOuterRadius | 6.0 | 20.0 | 0.5 | 14.5 |
| diskBrightness | 0.5 | 5.0 | 0.1 | 5 |
| diskTemperature | 1 | 50 | 1 | 49.78 |
| temperatureFalloff | 0.25 | 15.0 | 0.01 | 5.22 |
| diskEdgeSoftnessInner | 0.0 | 0.5 | 0.01 | 0.18 |
| diskEdgeSoftnessOuter | 0.0 | 0.5 | 0.01 | 0.5 |
| turbulenceScale | 0.1 | 2.0 | 0.01 | 1.81 |
| turbulenceStretch | 0.1 | 10.0 | 0.01 | 0.75 |
| turbulenceSharpness | 0.1 | 10.0 | 0.1 | 7.4 |
| diskRotationSpeed | −20 | 20 | 0.1 | −8.7 |
| turbulenceCycleTime | 5 | 30 | 1 | 5 |
| turbulenceLacunarity | 1.0 | 4.0 | 0.1 | 3 |
| turbulencePersistence | 0.1 | 1.0 | 0.05 | 0.8 |
| bloomStrength / Radius / Threshold | 0–3 / 0–1 / 0–1 | | 0.01 | 0.68 / 0.2 / 0.4 |

`stepSize` is a uniform (default 1) with **no UI binding**.

## 6. Required adaptations for our project (and why)

1. **Transparent background**: delete the background block; return
   premultiplied `vec4(pow(color,1/2.2), alpha)` with `alpha = 1` for
   captured rays. The live sky's own lens (surfaceShaders' 1/θ law, scaled
   to the same `2·L·rs/b`) renders what escaped rays see — the whirlpool
   law, no layers.
2. **Far camera**: our camera sits at ~56 rs (the R60 composition) and
   hundreds of units in wide views; the source never exceeds 31 rs. A
   straight-line coarse approach leg (12 steps to the r=16 sphere, crossings
   composited exactly, bend ∝ 1/r² negligible out there and supplied by the
   sky's lens) hands off to the verbatim 64-step march. Physically exact —
   not a hack.
3. **Camera-true rays**: the fixed-90° FOV quirk is unportable — the live
   sky bends through the real camera projection, so the hole's rays must use
   the same projection or the two bend fields would disagree (layers). The
   deflection law itself is unaffected.
4. **Disk tilt**: ours rides a hair off world-horizontal (DISK_NORMAL) —
   composition, kept.
5. **Critical impact parameter**: the gate covering the captured set is
   mirrored in TS against the exact fixed-step integrator (the discrete
   captured set differs slightly from the analytic 2.598·rs, and drifts with
   the lensing multiplier).
