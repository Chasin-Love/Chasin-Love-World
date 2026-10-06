# ROUND 55 — THE FULL ERASE (2026-09-27)

**User request:** after Round 54's rebuild, the last stand-in — the bare black
fallback sphere and the vault's lattice rings over it — should be erased "so it
seems it never existed". Done.

## What was erased

- **The silhouette fallback sphere** (`buildSilhouette`) — deleted. The geodesic
  renderer is the ONLY black hole renderer that has ever existed in this codebase.
  `setGeodesic(false)` now simply hides the quad: when the marcher cannot run
  (unsupported GPU, shader failure, frame-budget breaker, the Studio "Off" switch),
  the hole renders nothing at all. The R52 sky lens keeps bending the universe
  surface where the hole stands — real gravitational darkening, not an object.
- **The vault lattice torii** ("rings over it") — deleted from both vault build
  sites, along with their spin/pulse machinery: `userData.spin`, the per-frame
  rotation + "feed the void" emissive pulses, the `vaultPulse` state and the
  `eventide-vault-pulse` listener. They only ever showed in the erased fallback.
- **Portal singularity** now uses the geodesic renderer itself (gated by the same
  capability/override logic as every hole), rides the late-tick uniform driver, and
  is popped from the registry on clear.

## Invariants (round17 gauntlet, R55 checks)

- No `buildSilhouette` / `SphereGeometry` in the renderer; no `latticeMat`,
  `userData.spin`, `vaultPulse` or `eventide-vault-pulse` anywhere in the engine.
- `setGeodesic` hides the hole itself — one renderer, one switch.
- The portal singularity is geodesic-gated and driver-registered.

## Verification

- `npm run verify` GREEN (typecheck + round16 + round17 + smoke).
- Live E2E on the Intel UHD: Auto → 5/5 holes geodesic, each visual contains
  exactly ONE child (the quad — no sphere); Off → 0 visible, screenshot shows only
  sky (the sky-lens darkening is physics, not geometry); Auto again → restored.
- Evidence: `scripts/verify/r55-focused.png` (the lensed hole),
  `scripts/verify/r55-off-hidden.png` (Off — nothing renders).
