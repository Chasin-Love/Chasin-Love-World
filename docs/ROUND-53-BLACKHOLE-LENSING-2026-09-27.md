# ROUND 53 — THE SPACETIME BENDING THAT WOULDN'T SHOW (2026-09-27)

**Symptom.** The user compared our black hole against the reference repo's
screenshot (`dgreenheck/webgpu-black-hole`, clone kept at
`..\webgpu-black-hole-reference`): his shows spacetime visibly bent — the
accretion disk's far side wrapped over and under the shadow, stars smeared
around it. Ours showed a flat-ish disk with a soft white halo hugging the
shadow and asked for the same bending.

## The diagnosis (measured, not guessed)

Playwright drives on the real GPU (`--use-angle=d3d11` → Intel UHD):

1. **The geodesic renderer was never broken.** On a clean boot it attaches,
   renders, and holds the frame budget (warm ≈ 41 ms avg at 720p close
   focus). The R20 port carries dgreenheck's physics verbatim — same bend
   `−rs/r² × step × lensing`, same every-crossing disk compositing that
   builds the over/under arcs, same tuned config (lensing 2.4, disk
   4.1–14.5, T 49.78 kK, falloff 5.22).
2. **The flat look was the FRAMING.** Round 20.2's focus constants (tPhi
   1.36 = 13° *above* the plane, zoom 0.235 ≈ 45 rs out) compressed the
   lensed wrap into a halo hugging the shadow. Placing our camera at HIS
   camera (25.8 rs, 13.9° *below* the plane) reproduces his screenshot's
   wrapped arcs from our renderer — verified side-by-side
   (`scripts/verify/e2e-focused.png`).
3. **The kill-switches were real anyway.** Three silent paths could stand
   the lensed tier down with no signal and no way back:
   - the frame-budget breaker was ONE-WAY per session (55 ms avg for 3 s →
     permanent composite), and it measures WHOLE-frame time — on the
     reference iGPU one heavy minute at close focus cost the look all day;
   - the quality-change handler tore the tier down at any tier below
     `cinematic` — a Version-3 leftover contradicting the documented
     on-at-medium+ policy, so merely touching the quality dial at medium
     (the default tier) killed it until reload;
   - the shader-error hook (kept as-is — a broken shader must always fall
     back).

## The fixes

- **Focus framing = the reference camera** (engine.ts `focusOn`): tPhi
  1.814, zoomT 0.1934 (dist = 3·800000^z → 26 rs). Focusing any geodesic
  hole now lands on the composition where the bending is unmistakable.
- **The breaker is recoverable** (engine.ts `guardRaymarch`): exceeding the
  budget stands the tier down for the current visit; flying away (~5 s
  clear of the hole) re-arms it for the next approach; three stand-downs in
  a session → permanent (the old law, kept as the backstop). The 'on'
  override skips the breaker entirely.
- **Quality changes respect the R20 policy**: stand down only when the new
  tier genuinely cannot run it (`!canUseRaymarchBlackHole()`); a round-trip
  back to a capable tier re-arms it.
- **Cinematic Lensing switch** (new `src/engine/blackholeTier.ts` +
  BLACK HOLE STUDIO card): `Auto` (default — safety nets active) /
  `Always On` (forces the lensed look past tier gates and the breaker — but
  never past a software rasterizer or a real shader failure) / `Off`
  (composite only). Persisted via `STORAGE_KEYS.blackholeTier`; the engine
  reports every transition through `setRaymarchStatus`, and the card shows
  a live status dot + line (active / fallback + reason) — no more silent
  stand-downs.
- **Restore path unified** (`disableAllRaymarchHoles` now walks the
  overlays' parent groups): the portal-vault site parents its overlay
  outside `userData.bhRaymarch`, so the old bodies-loop restored the galaxy
  vaults but left portal vaults half-dressed on fallback. Their groups now
  also carry `userData.bh`. `enableAllRaymarchHoles` is the exact inverse.
- **round17 gauntlet updated + extended**: framing assertion tracks the
  reference camera; new R53 checks pin the quality policy, the recoverable
  breaker, the override wiring, the status reporting, and the key registry.

## What was deliberately NOT done

- **No shader physics changes.** The port was already faithful; bending,
  Doppler, blackbody LUT, capture/escape are untouched.
- **No procedural starfield port.** The reference samples his fake stars
  with the escaped rays; we keep our real universe as the background —
  the R52 sky lens bends it around the hole (subtle by design at hole
  scale; the disk wrap now dominates as it should).
- **No bloom/tuning drift.** Project bloom stays gentle; the local glow
  sprite and the reference physics values stand.

## Verification

- `npm run verify` GREEN (typecheck + round16 + round17 + smoke).
- Live E2E on the Intel UHD (1280×720): focus lands 26.6 rs / phi 1.814;
  tier visible; override round-trip Off → 0 overlays visible (composite),
  Auto → 5 visible (geodesic back), Always On → forced; breaker held at
  54.8 ms avg right AT its 55 ms threshold — on slower stretches it now
  stands down gracefully instead of dying silently.
- Evidence: `scripts/verify/e2e-focused.png` (the lensed look at the new
  framing), `scripts/verify/e2e-off-composite.png` (the composite fallback).
