# ROUND 59 — NO CAPTURES, NO LAYERS — the sky bends itself (2026-09-27)

**The user's final verdict on Round 58**: the square was still visible behind the
hole — "two layers on top of each other" — and the user re-stated the model that
matters: **the black hole is a hole in the surface of reality, not a floating
object**. It never appears in front of the stellar system; its bending belongs to
the surface. And: **the black hole itself is finished — do not touch it.**

## Root cause — the last capture

The 1024² cubemap was a stale, low-res *second image of the sky* pasted inside the
quad's square, on top of the live sky. No amount of resolution or cadence tuning
can make a snapshot match a live render.

## The fix — a deletion

- **Every background capture is gone**: the cubemap, the CubeCamera, the per-face
  sweep, the half-res screen buffer, the render-layer machinery, the camera layer
  wiring — all deleted from the engine and the shader.
- **Escaped rays exit transparent**: the quad renders ONLY the hole itself — the
  shadow (opaque black), the disk, and the marched light. The live sky shows
  through everywhere around it.
- **The bending lives in the sky layers' own shaders** (the R52 lens, upgraded in
  R58): the displacement follows the true 1/θ law with **no artificial cutoff**,
  scaled by **uLensScale** — the march's lensing factor — so the sky's bend is
  *exactly* continuous with the geodesic march at the quad's edge (both reduce to
  2·L·rs/b in world units). One law, one renderer of the sky — a boundary cannot
  exist by construction.
- The black hole's own rendering is untouched: disk, shadow, photon ring, Doppler,
  blackbody colors, focus framing, adaptive resolution.

## Verification

- `npm run verify` GREEN (typecheck + round16 + round17 + smoke).
- Live E2E at 1920×1080: **26 rs / 110 rs / 166 rs** — no square, no layer, no
  boundary at any distance; the sky's own warp fades gradually outward; the
  planets and star crisp and unmoved. Timing ≈ 33–60 ms close focus (the variance
  is GPU contention from the user's live session; the breaker held).
- Evidence: `scripts/verify/r59-focused-26rs.png`, `r59-mid-110rs.png`,
  `r59-far-166rs.png`.
- Gauntlet: the R59 no-capture invariant (no cubemap / screen buffer / layer
  filtering anywhere) + the R58 sky-lens law check (the 1/θ decay with no
  cutoff, scaled by the march lensing).

## The architecture, finally right

The black hole is a hole in the surface of reality: the geodesic quad renders the
hole (shadow + disk), and the surface — the sky — bends itself around that hole in
its own shaders, following the same law as the light-rays, live, at any distance.
There is no second image of anything.
