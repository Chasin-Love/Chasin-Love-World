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

## Verification

- `npm run verify` GREEN (typecheck + round16 + round17 + smoke).
- Live E2E on the Intel UHD: focus holds at 26 rs / 14° below plane; the bent
  region now shows OUR stars streaking and OUR nebula warping around the shadow
  with no seam circle; frame timing ≈ 43 ms avg at 1280×720 close focus (breaker
  held); override Off/Auto round-trip unchanged.
- Evidence: `scripts/verify/r56-focused.png`.
