# ROUND 60 — THE FOUND COMPOSITION & THE GRADIENT WELL (2026-09-27)

**The user's report**: while I was mid-build they checked the app and found a
composition they loved (the angled view — the disk a tilted ellipse, the stellar
belt sweeping around the hole); after my completion it was "lost" — the camera
reset to a face-on view where the sky's darkened lensing zone read as a flat
second-layer bubble.

## Root cause — the camera orbit, not the build

Both looks were the same build at different camera orbits: the mid-build check had
the camera orbited ~31° above the disk plane at ~56 rs; the post-reload camera
reset to a face-on-ish view where the dome's darkened lensing zone (the hole's
shadow on the sky) reads as a flat bubble. (A stale browser bundle can also hold
the old version back — hard refresh, Ctrl+Shift+R.)

## The fixes

1. **The focus landing view = the user's found composition**: focusing a hole
   (press V / focus the vault) now lands the camera **~31° above the disk plane
   at ~56 rs** (tPhi 1.05, zoom 0.25) — the disk reads as a tilted ellipse, the
   belt sweeps around the hole, and the lensed wrap fills the frame. Orbiting
   away is still free. (Supersedes the R53 near-edge-on reference camera.)
2. **The depression gradient**: the sky's capture boundary (the hole's shadow on
   the sky — the dome shader's hard instant-black disc) is softened into a
   smooth darkening ramp: the sky darkens gradually as it approaches the hole's
   silhouette (bc → 2.2·bc band, reaching black at the disc) — the
   embedding-diagram "well" feel, no visible edge. The capture disc's core stays
   pure black. Foreground bodies are never darkened (they are not sky).

## The physics footnote (from the research the user demanded)

- The Flamm paraboloid / embedding diagrams are **maps of curved space**, not
  camera images — the vertical direction is an artifact of the embedding, and no
  literal funnel exists to photograph. What a camera sees is the shadow, the
  photon ring, the lensed disk and the lensed sky — which is what the renderer
  produces.
- **Face-on views are physically calm**: a symmetric ring with the inner disk
  dimmed by gravitational redshift; the dramatic wrap appears near edge-on.
- Sources: [NASA – Black Hole Anatomy](https://science.nasa.gov/universe/black-holes/anatomy),
  [NASA SVS – Accretion Disk Visualization](https://svs.gsfc.nasa.gov),
  [Marolf – Spacetime Embedding Diagrams](https://arxiv.org),
  [JILA – Schwarzschild Geometry](https://jila.colorado.edu),
  [Sadegh 2024 – Embedding diagrams](https://www.nature.com),
  [Wang 2025 – Disk geometry and viewing angle](https://link.aps.org).

## Verification

- `npm run verify` GREEN (typecheck + round16 + round17 + smoke; the smoke
  reference re-captured at the new framing).
- Live E2E at 1920×1080: press V lands **phi 1.05 / zoom 0.25** (the found
  composition); the face-on view shows the softened gradient; the far view keeps
  the gradual bend; **34.3 ms avg** close focus (breaker never trips).
- Evidence: `scripts/verify/r60-focus-landing.png`, `r60-faceon-softened.png`,
  `r60-far.png`.
