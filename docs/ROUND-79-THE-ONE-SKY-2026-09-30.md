# ROUND 79 — THE ONE SKY (2026-09-30)

The author's complaint, in their words: *"there shouldn't be two different
different sky or two different layers of sky… there should be only one at a
time"* — and *"a barrier type of bar or the straight line is appear on the
screen vertically and its make two different sides one is totally like the
original photo another side a bit darker a bit grayer"* — and *"the sky
cannot be zoom in zoom out… it should be in full screen all the time."*
Three defects, one law: **while a photo hangs in a reality's sky, the photo
IS the sky — one sky, seam-free, full-screen at every stage of the cosmos.**

## Bug 1 — THE BARRIER (the vertical line splitting the photo)

Two independent causes, both at the same world meridian:

- **The vignette sat on the atan branch cut.** The old shader computed the
  vignette in raw equirect UV space: `r = length(lensUv - 0.5)`. But `u`
  lives in (−0.5, +0.5] — the atan branch cut (+π ↔ −π) is exactly at
  u = ±0.5, where the *old* formula put the vignette's CENTER. On one side
  of that meridian r ≈ 0 (no vignette); one pixel across, r = 1.414 (FULL
  vignette). A hard vertical boundary: the photo's bright side and its
  gray twin — precisely what the author saw.
- **Mipmaps collapsed at the same meridian.** The UV is derived per-pixel
  from `atan(d.z, -d.x)`; the u-derivative spikes to infinity at the branch
  cut, so the GPU's mip selection clamps to the 1×1 mip — the flat gray
  average of the whole photo — painting a thin gray line down the sky.

**Fixes:** the vignette is now **camera-relative and seam-free** — the
angle between the fragment's ray and the traveler's forward
(`dot(vDir, uCamDir)`) decides the falloff, so the *edges of the view* fall
into space, never a meridian of the texture. And the photo texture is
**mip-free** (`generateMipmaps = false`, `LinearFilter`): the dome is
camera-locked and always magnified; bilinear is the correct filter
everywhere on it.

## Bug 2 — TWO SKIES AT ONCE

The old PhotoDome was a *layer*, not a sky: `blend` 0.85 over the
procedural cosmos, a 6% ghost floor "even at blend 0", the reality's glow
color washed into the photo, and the far-star shell, deep nebulae and near
neighborhood all rendered ON TOP of it. Nothing ever stood down.

**Fix — the one-sky gate** (`UniverseSurfaceManager.update`): when the
photo is active, sky-visible, its entry fade complete and no Kamui tear is
erasing it (`hasPhoto && skyVisible && strength > 0.995`), the ENTIRE
procedural family stands down — dome, deep nebulae, far stars, near
neighborhood. It returns for the entry crossfade (the photo fades in over
the cosmos), the Kamui tear (both skies obey the same erase field), the
multiverse stage (the photo rests there) and deactivation. The shader
paints the photo as ITSELF: the glow tint uniform is deleted, the ghost
floor is gone, `alpha = blend · fade` — nothing else. **`blend` defaults to
1.0** (the photo IS the sky) in all three contract tiers —
`skyRegistry.ts`, `server/skyStore.ts`, `src-tauri/src/sky.rs` — and the
author's own active sky (`chasinLove/sky.json`) was migrated to 1.0.
Deactivating rides the SAME fade-out machinery as a reality switch (the
outgoing photo hands its slot to the prev map): no pop, ever. The Presence
slider honestly means photo opacity now — below 100% the procedural cosmos
genuinely returns, by design.

## Bug 3 — THE SKY ZOOMED WITH THE COSMOS

The photo dome was a static world-space sphere (R = 300,000) at the
origin, sampled by world direction. Between the cluster and cosmic-web
stages the camera crosses and exits that wall; off-center, the near-wall
region compresses into a tiny direction range — magnification and crop
growing as the traveler approaches. Procedural noise hides this on the
cosmos dome; a photo reads as "zoomed-in and I can never see the whole
picture." The author's law is the opposite: zoom lives in the UNIVERSE
(stellar system → galaxy → cosmic web), never in the sky.

**Fix — the dome rides the camera.** Every frame the surface manager feeds
the dome the camera's world position and forward; the equirect mapping is
therefore always the intended 1:1 from the exact eye point — full-screen
at every cosmological stage, the whole picture always visible. Because
only a ~50° slice shows at once, uploads now rasterize at **4096×2048**
when the JPEG stays light (≤ ~6 MB base64), falling back to 2048×1024 —
panorama resolution IS on-screen sharpness.

## What was kept

The lens laws (the photo still bends and pours around the hole —
`applyLensBend`, `lensCaptured`, the shared well), the Kamui tear erase,
the ~1.2s reality crossfade, the multiverse-stage rest, the per-reality
disk isolation, and every safety net. The procedural sky family is
untouched — it stands down, it is not deleted.

## Verification

- `npm run verify` — **ALL GREEN** (typecheck; round16/17/18/63/72/73/74/
  75/76/**79** gauntlets; smoke + prod-smoke), with the new
  `round79-sky-gauntlet.ts` pinned into the chain (10 checks: seam-free
  vignette, mip-free texture, camera feed, the gate, the family stand-down,
  no ghost, no glow tint, the smooth exit, the 1.0 contract, chain
  membership).
- Smoke frame vs reference identical to pristine HEAD (histL1 0.0538,
  shadow 0.288/0.290, bright 0.086/0.086) — the boot reality is Sol-Prime
  (no photo sky), so the reference needed no re-capture.
- `audit:arch --check`: exit 1 with findings identical to the pristine
  parent modulo mechanical churn (+6 churn lines: the three sky route
  strings shifted line numbers in `skyRegistry.ts`; engine.ts −3 lines;
  +1 code file = the gauntlet). **Zero semantic new findings.**

## THE INCIDENT — a concurrent session contaminated two runs (resolved)

Mid-round, a foreign in-flight edit appeared in the working tree
(`src/platform/storageKeys.ts` + `src/state/persist.ts` — a desktop
hydration fix whose boot path calls `window.location.reload()`). It
contaminated the first verify run: the smoke browser reloaded mid-test,
the engine rebooted behind the veil, the `v` focus on Eventide never
landed, and the frame compared as a dark early-boot void (histL1 0.1836 —
the exact failure signature). A/B polling proved it: the `v` press sets
`focus: 'eventide'` at pristine HEAD **and** on the clean R79 tree; it
stayed null only while the foreign files were present. The foreign work —
clearly another session's live fix, not mine to destroy — is preserved
verbatim in **`UNCLAIMED-hydrate-adopted-fix.patch`** (repo root, and a
copy in /tmp); the two files were reverted locally, and the full chain was
re-run **green under a 5-minute tree watcher** (zero foreign reappearence).

## Watch items

1. **The unclaimed patch:** the hydration fix (`hydrateAdopted` session
   guard) is NOT part of R79 — its owner should reapply and verify it in
   its own round. Expect verify failures if it lands uncoordinated while
   a verify chain is running.
2. **Live eyeball pending:** the author should walk chasinLove (the
   hinata sky) at stellar zoom → cosmic web: no vertical barrier, no
   double sky, the whole photo visible at every stage.
3. Extreme `drift` + `blur` together still sample across the u-wrap;
   `RepeatWrapping` keeps it continuous, but a deliberately torn photo
   could show its own left/right edges meeting — a photo-content matter,
   not a seam in the sky.
