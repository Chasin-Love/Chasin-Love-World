# ROUND 57 — THE GRADUAL BEND — no square, no layers, at any distance (2026-09-27)

**The user's three complaints** (with their water-cone analogy — a cone set in the
water surface drains it from its rim): 1) a square region around the hole was
visible; 2) the bending looked like a slab in front of the hole instead of space
*behind* it bending; 3) the bending was "layered" — off, then suddenly fully on —
instead of ramping gradually like real gravity.

## Root cause — all three were the same flaw

The bending lived inside a 60·rs quad and **cut off hard at the quad's edge**: a
~14° background displacement stepping to zero in one pixel. That step was the
square, the "slab", and the layering.

## The fix — gravity's own 1/b law, everywhere

Einstein's weak-field deflection for a ray passing at distance b is
**α = π·rs·L / b** — it never hits zero, it decays gradually. The shader now applies
exactly that:

- **Strong field (b ≤ disk outer + margin)** — the full geodesic march (unchanged):
  shadow, disk crossings, the wrapped arcs; the background comes from the real-sky
  **cubemap** (any deflection, including rays wrapping the hole).
- **Weak field (b beyond)** — the unbent ray is rotated toward the hole by the
  analytic α(b) (Rodrigues rotation) and the **previous frame's captured scene**
  (half-res, holes hidden, R52 lens zeroed) is sampled at the deflected screen
  position. The LIVE universe bends, one frame fresh, with the displacement
  decaying as 1/b out past 240 shader units — fading smoothly to zero before the
  quad's 500·rs-wide edge. **No square, no step, no layers** — a gradual ramp:
  nothing far out, a whisper closer in, extreme near the shadow.
- The quad grew to **500·rs** to span the whole gradual bend (the disk is always
  deep inside it, so the old per-mass rescale is gone).
- The cubemap sweep is **one 512² face per frame** (a 6-face burst spiked the
  frame to ~600 ms; swept, it amortizes) plus the half-res screen capture per
  frame. Both captures hide the holes and zero the R52 lens; both restore after.

## Continuity chain (why there is no seam)

march+cube (b ≤ 17) → analytic+screen (17 → 240, 1/b decay) → live scene
(beyond the quad, where α ≈ 1.4° and fading). Each boundary joins matching content
and near-equal displacements — verified visually at 26 rs, 110 rs and 166 rs.

## Verification

- `npm run verify` GREEN (typecheck + round16 + round17 + smoke).
- Live E2E at 1920×1080 on the Intel UHD: **26 rs** (the full lensed look, no
  square), **110 rs** (the gradual warp fading outward), **166 rs** (the bending
  still present, far beyond the old gate); 31.8 ms avg close focus.
- Evidence: `scripts/verify/r57-focused-26rs.png`, `r57-mid-100rs.png`,
  `r57-far-166rs.png`.
- Gauntlet: the quad/proportions and live-tuning assertions updated to R57; the
  R56 capture check now asserts the per-face sweep.
