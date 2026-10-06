# ROUND 58 — THE BENDING LIVES IN THE SKY — no square, no ghosts, at any distance (2026-09-27)

**The user's verdict on Round 57** (with screenshots as proof): the bending zone was
a SQUARE pasted over the scene, it read as space *in front* of the hole bending,
and the transition was "layered" — off, then suddenly fully on. All three were one
root cause, plus one deeper physics error.

## Root cause — owned

1. The weak-field band sampled a **captured image of the whole scene**, so it bent
   EVERYTHING near the hole on screen — including the anchor star, planets and belt
   whose light never passes the hole. That produced the ghost duplicates, the
   smeared pale crescents and the ripple rings in the user's screenshots. The
   user's rule — *only the space BEHIND the black hole bends* — is the correct
   physics, and it forbids bending any captured foreground body.
2. The bend **cut off hard at the quad's edge** (~14° jump to zero) — the square
   and the "layers".

## The fix — the bending lives ONLY in the sky layers

- **The weak-field screen band is deleted** (and its half-res buffer). The quad
  shrinks back to the strong field (64·rs: shadow + disk + the near-hole wrap).
- **The sky layers move to render layer 1** (`setSkyLayer(1)` in the surface
  manager: the 460k dome, the deep nebulae, the far stars, the neighborhood shell,
  the photo dome). The cubemap's face cameras render **layer 1 only** — the capture
  is pure sky; foreground bodies (layer 0) can never enter it. The main camera
  sees layers 0+1, so nothing changes visually outside the capture.
- **The far field lives in the sky layers' own shaders** — the R52 lens's strong
  mode upgraded to the true gradual law: displacement = (2rs/θ + second order) ×
  **uLensScale** (the march's lensing factor, 2.4) — and the old hard cutoff at
  ~3.2 rim radii is **removed entirely**: the 1/θ decay IS the gradual fade, out
  forever. The capture disc stays (it is the hole's shadow on the sky).
- **Mathematical continuity**: both the quad's analytic far-field bend and the
  dome's lens reduce to exactly 2·L·rs/b in world units — the quad's interior and
  the dome outside join with zero discontinuity at every distance, for every
  lensing setting (uLensScale tracks the panel's Grav. Lensing live).

## Why this cannot ghost again

The bent content and the live content are the same sky layers rendered by their own
shaders. No captured image of foreground bodies exists anywhere in the pipeline —
the star, planets and belt render untouched, always.

## Verification

- `npm run verify` GREEN (typecheck + round16 + round17 + smoke).
- Live E2E at 1920×1080 on the Intel UHD: **26 rs** (the full lensed look),
  **110 rs** and **166 rs** (the gradual concentric warp fading outward — far
  beyond the old 120 rs gate); the planets and star crisp and unmoved in every
  shot; **39.2 ms avg** close focus (breaker never trips).
- Evidence: `scripts/verify/r58-focused-26rs.png`, `r58-mid-110rs.png`,
  `r58-far-166rs.png`.
- The other session's concurrent surface refactor (kamui/vortex removal) was
  completed where it intersected: `UniverseSurfaceUpdateParams.kamuiErase` /
  `vortexDir` are optional with neutral defaults.
