# ROUND 54 — ONE BLACK HOLE: the composite deleted, the reference completed (2026-09-27)

**The user's verdict on Round 53 was right:** the flat look kept coming back, and the
two-renderer stack (geodesic overlay on top of the painted composite) was the mess
behind it. This round deletes the old version entirely and completes the geodesic
renderer to full reference fidelity.

## Deleted

- **`src/engine/blackhole.ts` (716 lines) is GONE** — baked disk textures, painted
  photon ring, fake lensed halos, Einstein-ring strokes, and the Round-17 spacetime
  funnel (user-approved deletion: it only ever showed in fallback).
- With it: the `setCinematic` dance, the `userData.bh`/`userData.bhRaymarch` split,
  `InnerPlanet.blackHole`, the per-frame composite update blocks, the `setReality`
  funnel retint, and the round17 gauntlet's Flamm/funnel sections. Net ≈ −600 lines.

## The single renderer (`blackholeRaymarch.ts` is now THE black hole)

- **One attach path** (`attachBlackHole`): every hole gets the geodesic quad when the
  GPU allows it (override `on` forces past the tier gate, never past a software
  rasterizer or a shader-failure disarm) and a **bare black sphere at the
  photon-capture silhouette (√27/2 · rs)** otherwise. `setGeodesic(on)` swaps them —
  the hole is never invisible, and nothing painted exists anywhere.
- **HIS BACKGROUND, the piece Round 20 dropped**: escaped rays sample his procedural
  starfield + two FBM nebula layers with the FINAL BENT ray direction (ported
  verbatim, shipped config: density 0.1, size 1.2, brightness 0.1, near-black
  navies). That is the star-smearing around the shadow — the bending made visible
  beyond the disk.
- **The seam law**: his sky is weighted by the ray's impact parameter (full bent sky
  inside 16 shader units ≈ 20 rs — shadow, photon ring, streaking zone, whole disk —
  fading to fully transparent by 22, inside the quad). Beyond the fade our real
  universe shows, still bent by the R52 sky lens. Rays with b > 16 skip the march
  entirely (bending cannot pull them onto the disk) — the outer half of the quad is
  CHEAPER than before and paid for the background.
- **No glow sprite** — it fatted the halo into a blob and washed the arch out. The
  blaze now comes from the project bloom damping toward the reference's 0.68 while a
  geodesic hole is on stage (`bloomHoleBoost`, threshold untouched, eases back on
  departure).

## THE CRITICAL FIX — the phantom hole

The rebuild exposed a latent landmine: the geodesic uniforms were driven per-body
MID-update, but the vault ephemeris re-places bodies AFTER the main loop's Kepler
pass — so `uCenter` (the hole's position in shader space) lagged the true rendered
position by seconds of orbit. The march then integrated against a phantom hole: no
capture, no disk crossings, fully transparent quad — "the black hole stopped bending
spacetime." Fix: **one late-tick driver** (right before `composer.render()`, after
every position writer) — `updateRaymarchUniforms` force-refreshes the matrix chain
from the current locals, so hole center, camera offset and billboard are exact for
the frame being rendered. The billboard also became parent-aware (world orientation
pinned to the camera), so tilted inner-system groups cannot shear the quad.

## Verification

- `npm run verify` GREEN (typecheck + round16 + round17 + smoke); round17 rebuilt:
  Flamm/funnel sections retired, new R54 checks pin the deletion, the background
  port, the seam law, the no-glow rule and the silhouette swap.
- Live E2E on the Intel UHD (1280×720, ANGLE D3D11): focus lands 26.1–26.5 rs at
  14° below the plane and HOLDS; the screenshot shows the wrapped arcs over AND
  under the shadow, the white-hot lensed ring, streaked bent background, bloom
  blaze; override Off → silhouette, Auto → geodesic, Always On respected; warm
  frame time ≈ 26–47 ms at close focus — the breaker never trips.
- Evidence: `scripts/verify/r54-focused.png` (the lensed look),
  `scripts/verify/r54-silhouette.png` (the fallback).

## Untouched

The R53 reference focus camera, the R52 sky lens, the Studio card switch + status
(text now says "silhouette fallback"), quality tiers, blackholeParams physics values,
and the user's unrelated working-tree changes. Nothing committed.
