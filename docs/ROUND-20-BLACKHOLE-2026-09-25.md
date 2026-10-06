# ROUND 20 (BLACK HOLE) — 2026-09-25 — The Black Hole, Made Real (R19 fixed)

**Build:** R50 → R51 · **Cinematic tier:** the geodesic renderer, corrected · **Status:** SHIPPED & VISUALLY VERIFIED
*(Doc named `ROUND-20-BLACKHOLE` because `ROUND-20` is taken by the Key Ring wave.)*

> **20.1 ADDENDUM (same day, user-caught):** two live bugs fixed after user testing —
> see §6. The disk now lies FLAT on the world XZ ground plane (base along X), and the
> vault dive keeps the hole at full glory instead of collapsing to the bare sphere.

Round 19 transliterated [dgreenheck/webgpu-black-hole](https://github.com/dgreenheck/webgpu-black-hole)
(MIT, © 2025 Daniel Greenheck) correctly at the physics level and shipped it broken at the
presentation level. This round names the five presentation sins, reverses every one, adopts his
**runtime-tuned look** (the config behind the demo's reference image), makes the tier **on by
default** with an automatic frame-budget circuit breaker, and verifies the result in the live app.

Reference clone kept at `..\webgpu-black-hole-reference` (outside this repo, for tuning diffs).

---

## 1. Why R50 looked broken — the five sins (all verified in code)

| # | Sin | Effect on screen |
|---|-----|------------------|
| 1 | **The quad never billboards.** The per-frame call was `updateRaymarchUniforms`, which set uniforms but never copied the camera rotation; nothing ever called the visual's `update()`. | A sheared window facing world +Z: the lensed image compressed, clipped by the quad's straight edges (the "half-ring"), vanishing at some orbit angles. |
| 2 | **The baked core sphere stayed.** `setCinematic(true)` hid only the baked disk + billboard; the opaque 2.35 rs sphere kept writing depth against the quad's `depthTest: true`. | A circular punch-out — the disk "stopped" at the hole. |
| 3 | **Fallback-pair bending.** The port paired his shader-fallback step (0.3) with his fallback lensing (1.5) → 0.45 bend/unit. His demo look comes from the *runtime* pair (step 1.0 × lensing 2.4 = 2.4 bend/unit). | 5.3× too little bending — no wrap over/under the shadow, the disk read as a flat translucent band. |
| 4 | **Untuned palette.** Shader-fallback values (10,000 K peak, brightness 2, falloff 0.75, softness 0.15, rotation 0.3, sharpness 1.0) and a LUT truncated at 10,000 K. | Blue-white mud instead of the white-hot→orange-amber gradient; his peak temperature is 49,780 K. |
| 5 | **No restore on failure.** `disableAllRaymarchHoles()` hid the overlay but never un-hid the baked disk the error hook had stepped aside. | Any shader failure left a half-dressed hole forever. |

Plus one latent runtime bug found by measurement: `raymarchOnStage()` read `b.group.position`
(local — origin) instead of the world position, so the frame guard could never see a hole on stage.

## 2. The fixes

**`blackholeRaymarch.ts`** — rewritten against his exact source (cloned):

- **Billboard every frame** inside `updateRaymarchUniforms` (the call the engine already makes).
- **His exact unit convention:** the march runs in units where rs = 0.8 (his mass 0.4 × 2); one
  `uScale = rs × 1.25` uniform bridges world → shader units. Every constant below transfers
  verbatim — zero rescaling drift, still scale-invariant at any hole size.
- **His tuned bending pair:** `uLensing = 8.0` at our 0.3 step ≡ his 1.0 × 2.4. Bending per unit
  distance is what shapes the trajectory — now identical to his demo.
- **ADAPTIVE STEP (iGPU lifeline):** `step = 0.3 × clamp(r/8, 1, 4)`. His per-unit bending is
  step-size-independent (bend ∝ step·lensing over a step of length step), so trajectories are
  unchanged at ~3× fewer iterations — fine 0.3 where the photon-ring arcs live, coarse out far.
- **His runtime config, verbatim:** disk 4.1–14.5, `T_peak` 49.78 kK, falloff 5.22, brightness 5,
  rotation −8.7 (Doppler `rotationSign` flip included), Doppler 1.0, turbulence 1.81/0.75/7.4,
  cycle 5, lacunarity 3, persistence 0.8, softness 0.18/0.5.
- **Full 121-entry Mitchell–Charity LUT** (100 K steps to 10,000 K, then 1 K steps to 40,000 K) —
  his exact two-segment table, piecewise texel mapping, linear filtering exact within segments.
- **His gamma step kept:** his material applies `pow(1/2.2)` *before* the renderer's ACES + sRGB —
  structurally identical to our composer (material → UnrealBloom → OutputPass). Removing it would
  have been the unfaithful choice.
- Quad 34 → 48 rs; capture 1.01·rs, escape 100, coarse approach to r = 16 with brake-stepping;
  early-out when clear of the disk and receding.

**`blackhole.ts`** — `setCinematic` now steps aside the WHOLE composite: disk, arcs, **core sphere
(no more depth punch-out)** and **spacetime funnel**; restores everything on `false`.

**`engine.ts`**:
- `setCinematicHole(g, on)` — one switch for the composite + the vault lattice torii (they cut
  dark silhouettes through the disk glow; they return with the fallback).
- Shader-failure hook now restores the full composite via `disableAllRaymarchHoles` (fixes sin 5).
- **Frame-budget circuit breaker** (`guardRaymarch`): while a raymarched hole is on stage
  (world-distance < 120 rs — the local-position bug is fixed), 180 frames averaging **> 55 ms**
  (an 18 fps floor; measured ~47–50 ms on Intel UHD at close focus) stand the tier down for the
  session, one-way, composite restored. Software renderers never arm the tier at all.
- Focus clamp: hole/vault orbits can't dive inside the disk's inner edge (≥ 7 rs ≈ his own demo
  minimum of ~6.25 rs).

**`capability.ts`** — the geodesic hole is **ON BY DEFAULT at medium tier and up**, independent of
the Cinematic toggle: it is a bounded overlay on a small camera-facing quad, not a fullscreen cost.
What lagged integrated GPUs years ago was the whole Cinematic tier (pixelRatio 2 + particles).
Safety now lives in the runtime nets (shader-error hook + circuit breaker), not in a hidden toggle.

## 3. Verification

- `scripts/round17-gauntlet.ts` — Round 20 section: billboard wiring, cinematic hides core+funnel,
  bending pair, his gamma kept, tuned constants, 40 kK LUT, rotation sign, unit convention,
  failure restore (both vault sites), on-by-default policy, circuit breaker, focus clamp. **GREEN.**
- `npm run typecheck` clean (engine/scripts), `npm run build` passes.
- **Live on-GPU verification** (dev server, this machine — Intel UHD integrated):
  - System view: the hole reads as a real lensed ring at side-character scale; star/planets untouched.
  - Approach view: shadow + far-side disk wrapped over AND under, white-hot inner edge →
    orange-amber turbulent body, Doppler asymmetry — the reference signature, on the reference config.
  - Guard telemetry at close focus: **avg 47–50 ms — alive, not tripped**; the fallback path was
    exercised live earlier (composite + torii restored, session continues).

## 4. Honest limits

- Behind the hole, our real scene shows through **un-lensed** (escaped rays exit transparent).
  Lensing the actual background needs a fullscreen depth-aware pass — a future round if wanted.
- On integrated GPUs the close-focus march runs ~20 fps. The circuit breaker stands it down if a
  machine can't hold ~18 fps; the composite takes over instantly.

## 5. Attribution

`blackholeRaymarch.ts` is a transliteration of dgreenheck/webgpu-black-hole `blackhole-shader.js`
and `blackhole.js`, MIT License, © 2025 Daniel Greenheck — see `THIRD-PARTY-NOTICES.md`.
The gauntlet-mirrored LUT comes from the same source (ultimately Mitchell Charity's blackbody table).

## 6. Out-of-scope fixes made to unblock the dev server

Two syntax errors from parallel in-progress work broke the vite overlay mid-verification and were
minimally repaired (semantics preserved): `src/backend/storage/totp.ts:59` (`??`/`||` needs
parentheses) and `src/ui/VaultUI.tsx:3491` (one extra closing paren in the `health` formula).

---

## §6 ADDENDUM — Round 20.1 (user-caught live bugs)

**20.1.a — The disk stood VERTICAL ("x axis as base" fix).**
Probed the live material: the shader's disk normal measured **(−0.053, 0.043, −0.998) ≈ world −Z**
— the accretion disk was standing upright in the world XY plane like a wheel. Root cause: the
shader tests the disk plane on its local **Y** axis (`lPrev.y · lCur.y < 0`, `hitR = length(hit.xz)`),
but `buildDiskBasis()` built the rotation with `setFromUnitVectors((0,0,1), DISK_NORMAL)` — mapping
local **Z** to the normal, so local **Y** landed on an in-plane world direction. The R19 frame
mismatch survived every screenshot review because a lensed ring reads similarly from any
orientation without ground context. Fix: `setFromUnitVectors((0, 1, 0), DISK_NORMAL)`. Verified
live: disk normal now **(0.055, 0.998, 0.040) ≈ +Y** — the disk lies flat on the XZ ground plane,
base along X, its band parallel to the system's ecliptic (the reference composition).

**20.1.b — The vault dive kept collapsing the hole to the bare black sphere.**
The engine feeds the portal-target body a `portalTear` value; the port scaled the raymarch's
intensity by it — and in cinematic mode there is NO baked composite underneath, so the dive faded
the hole into nothing. Two fixes: (1) `updateRaymarchUniforms` (and the visual's `update`) no
longer apply any portal fade — the geodesic hole keeps full glory through the whole dive (verified
live: `uIntensity = 1` through arming → vortex at visualT 0.67); (2) `guardRaymarch` resets and
skips while `portal.phase !== 'idle'` — a dive's frame cost can never permanently stand the tier
down. Verified end-to-end: `portalTo('eventide')` → dive holds glory → `leavePortal()` → hole
intact, tier alive (`disabled: false`, `uIntensity: 1`).

Note: during the live dive test the vault UI itself did not mount (the Key Ring wave's
in-progress work); the black-hole side of the dive is verified independent of it.

**Gauntlet:** new checks — basis frame (+Y), no portal fade, guard portal exemption. GREEN.

---

## §7 ADDENDUM — Round 20.2 (the glow upgrade — match the demo's bloom look)

User comparison: our hole read hard-edged next to the demo's soft blaze. Three causes, three fixes:

1. **Local warm glow halo.** The demo's soft blaze is its bloom (strength 0.68 / threshold 0.4) —
   far hotter than the project-wide UnrealBloom (0.12 / 0.90) the planets depend on. Instead of
   re-lighting the universe, the geodesic hole now carries its own additive radial-gradient halo
   (`buildGlowTexture`, warm white → amber → transparent), scale 44 rs, opacity 0.38, renderOrder
   below the quad (which stays `children[0]`). Depth-tested, so planets still occlude it.
2. **Hotter core.** Default intensity 1.0 → **1.35** — the white-hot band now crosses the project
   bloom threshold (0.90) and visibly blazes, as in the demo.
3. **Cinematic focus framing.** The demo is shot from ≈13° above the disk plane; whatever angle the
   previous view left made the band read fat or vanish edge-on. `focusOn` on a geodesic hole now
   frames the reference composition (tPhi 1.36, zoom 0.235 ≈ band-width fill); orbiting away stays free.

Verified live at the focused framing: thin band + over-wrap + under-crescent + white-hot core +
Doppler shading + soft halo — the reference signature. Gauntlet: glow halo, hot intensity, cinematic
framing checks. GREEN.

---

## §8 ADDENDUM — Round 20.3 (smaller shadow, grander disk — the sizing request)

User: "reduce the radius of the black sphere… increase the radius of the disk." Both asks are one
knob: the mass-equivalent. The shadow's apparent size is physics (2.6 rs) and the disk radii were
fixed numbers — lowering **RS 0.8 → 0.66** (mass-equiv 0.4 → 0.33) keeps the wrap/shadow physics
identical in rs-units while the fixed disk numbers (4.1–14.5 u) grow from 5.1–18.1 rs to
**6.2–22 rs** relative to it. Every other panel number from the demo (4.1 / 14.5 / 5.0 / 50 kK /
5.22 / 0.18 / 0.5 / 1.81 / 0.75 / 7.4 / −8.7 / 5) is untouched. Support changes: `uScale =
rs/0.66`, quad 48 → 60 rs, glow halo 44 → 56 rs @ 0.45.

Diagnostic note: the user reported "nothing changed" — probing their live tab showed the opposite
(latest build, glow present, tuned uniforms, raymarch attached). The earlier changes were real but
subtle at their viewing angle; R20.3's proportion change is unmistakable. Verified live: RS 0.66
in the running shader, focus framing intact.

**Gauntlet:** RS 0.66 / 60 rs quad check. GREEN.

---

## §9 ADDENDUM — Round 20.4 (reference restore — the real bug was the lensing invariant)

User comparison, reference demo screenshot vs our render: ours read as a fat donut with a bloated
shadow; his had the classic thin photon ring + over-wrap. The panel numbers were NOT the problem —
auditing against his actual source (`blackhole-shader.js`, `main.js` defaults) showed every value
already ported verbatim, including Peak Temp: his panel formats 49.78 with `toFixed(0)`, so his
"50k K" IS our 49.78. Two real divergences:

1. **THE LENSING INVARIANT (the donut).** His per-step bend is
   `(rs/r²) · stepSize · gravitationalLensing` — the SAME form as ours — so bend **per unit of
   path** = rs × lensing and the step size cancels. R20's derivation ("0.3 × 8.0 = 1.0 × 2.4")
   equated per-STEP products while our step is 3.33× finer, so we bent light 2.75× too hard
   (0.66 × 8.0 = 5.28 vs his 0.8 × 2.4 = 1.92). Over-bending bloats the capture cross-section and
   wraps the disk into the donut. Fix: **uLensing = 2.4 verbatim** — his slider value, no
   step compensation, and mass changes now scale bending exactly like his demo.
2. **MASS.** §8's R20.3 shrink (RS 0.66) moved away from the reference composition. Restored:
   rs = mass × 2 with the reference **mass 0.4 → rs 0.8**.

Implementation: `#define RS`/`CAPTURE_R` are gone — rs is the live uniform **uRs** (capture
`r < uRs · 1.01`), and `uScale = rs_world / (mass · 2)` tracks it so `uScale · uRs = rs_world`
always — the shader shadow never drifts off the composite's baked sphere beneath, at any mass.
Below mass ≈ 0.28 the fixed 29 u disk diameter would outgrow the quad's 60·uRs-u span, so the
quad mesh rescales up (`max(1, 34/(60·uRs))`).

**The Black Hole Studio panel.** New `blackholeParams.ts` store (quality-tier pattern:
localStorage `my-universe:blackhole:v1` + window CustomEvent) and `BlackHoleTuningCard.tsx`
mounted full-width after the engine card in the Core Console. Seven live sliders with his ui.js
ranges verbatim — Mass 0.4, Grav. Lensing 2.4, Doppler 1.0, Inner 4.1, Outer 14.5, Brightness 5.0,
Rotation −8.7 — plus Reset-to-Reference. Non-panel numbers (49.78 kK, falloff 5.22, turbulence
1.81/0.75/7.4, softness 0.18/0.5) stay baked at the reference values. `createRaymarchBlackHole`
seeds from the store and subscribes; dispose unsubscribes.

**Gauntlet:** SIN 3 rewritten for the corrected invariant (bend/unit = uRs × uLensing), config
checks moved to the store defaults, uRs/uScale convention + live-apply + dispose checks. GREEN.

