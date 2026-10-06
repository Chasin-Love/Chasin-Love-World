# ROUND 56 — THE BACKGROUND IS OURS (2026-09-27)

**User's verdict on Round 55:** the spacetime bending works, but the part of the
background that bends was the REFERENCE PROJECT's procedural sky — a dark circle
pasted over the real universe — not the background actually present. Correct. This
round makes the lens act on **our real universe**.

## The fix — screen-space lensing of the real scene

- **His procedural starfield/nebula are deleted** from the geodesic shader (the
  R54 stopgap that caused the visible dark-circle seam).
- **The engine captures the real scene into a half-resolution render target**
  (`bgRT`) every frame while a hole is on stage: hole quads hidden (no feedback),
  the shared R52 `uLensBend` zeroed for the capture (no double-bending, no capture
  disc), `scene.updateMatrixWorld()`, render, restore. Created lazily at half the
  drawing-buffer size; resized in `resize()`; disposed with the engine.
- **Escaped rays sample that buffer through the camera** (`uProjMatrix` /
  `uViewMatrix`) using the FINAL BENT direction: a far point along the bent ray is
  projected to a screen UV and the real nebula/stars are read from it. Rays bent
  behind the camera or out of frame fade out (that zone is shadow/disk dominated).
  An `uBgActive` flag gates sampling to frames with a fresh capture.
- **The seam is gone by construction**: at the quad's edge the deflection is ~0, so
  the displaced background matches the undisplaced one pixel-for-pixel — inside and
  outside are the same universe, continuously bent.
- **Color-space discipline**: the disk keeps dgreenheck's `pow(1/2.2)` (display-
  referred LUT colors, pushes the hot band past bloom); the background sample is
  scene-linear and must NOT be gamma-encoded — the composer's OutputPass (ACES +
  sRGB) finishes it exactly like every other pixel. (The first cut gamma-encoded
  the sample and washed the whole frame out — caught in E2E.)
- The march's far-ray early-out survives: rays with impact parameter beyond the
  disk outer edge + margin skip the march (deflection ~0 there; the undisplaced
  scene shows through the transparent quad).

## Invariants (round17 gauntlet, R56 checks)

- No procedural starfield/nebula in the shader; escaped rays sample `uBgTexture`
  through `uProjMatrix · uViewMatrix`.
- The engine's capture pass: half-res RT, holes hidden, `uLensBend = 0`, restored.

## 56c — "it must work no matter how far I am" — the screen-space limit, removed

The user was right twice over: screen-space sampling only bends the background when
the bent rays point *inside the captured screen image*. Near the hole the deflection
throws rays far outside the frame (the sample faded out), and the strong-field
region shrank with distance. Replaced with a **direction-based sky**:

- **`WebGLCubeRenderTarget(512²)` + `CubeCamera`**: the scene (holes hidden, R52
  lens zeroed) is captured into 6 faces **from the camera**, and the shader's
  escaped rays look the sky up **by their final bent direction** —
  `textureCube(uBgCube, v)`. No screen-position dependence, no gates, no fades:
  valid at 2 rs or 2,000 rs alike, and rays wrapping the hole sample the opposite
  sky — the multiple-image Einstein ring emerges naturally.
- **One face per frame** — a full 6-face burst spiked the frame to ~600 ms; swept,
  the cube refreshes over 6 frames at a small amortized cost. `bgCubeDirty`
  triggers an immediate sweep when a hole attaches.
- **Seam-free at every distance**: at the quad's edge the deflection is ~0, so the
  cube lookup equals the real sky; and the quad's angular footprint (18.6R/d)
  always covers the R52 halo's (2R/d).
- **Verified at 166 rs (far, beyond the old 120 rs gate) and 26 rs (focused)** —
  the lensed structure shows in both (`r56c-far-1080p.png`,
  `r56c-focused-1080p.png`); 45 ms avg at 1080p close focus.

## 56b — the resolution wall (found while answering "why can't I see it")

At 1920×1080 the focused hole ran **147 ms/frame (7 fps)** — pixel-bound — and the
breaker would hide the hole ~27 s after focusing. Fix: **adaptive resolution**
(the composer drops to 0.5× pixel ratio while a hole is on stage, damped, applied
in 0.1 steps to avoid per-frame target reallocation, restores on departure) plus a
**march trim** (MARCH_STEP 0.3 → 0.42 — the bend-per-unit-path invariant keeps the
trajectory — and uSteps 96 → 80). Result: **147 → 35.5 ms**, quality verified at
full 1080p.

## The far view matters

After boot the camera sits ~189 rs from the hole — the bending is physically tiny
there and was gated off. With the cubemap it is now always on; but the dramatic
view remains the FOCUS framing (press V / focus the hole → 26 rs, 14° below the
plane). The user's screenshot was the far view — the answer included both: the
cubemap makes bending distance-independent, and focusing still gives the money shot.
