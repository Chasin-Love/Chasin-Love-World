# ROUND 78 — THE LIVING SPIN (2026-09-30)

The author, right after R77's tail trim: the gulp starting at 4.05s and
draining is good — but the summon reads like a "normal chill guy." The
swirling, the bending, the attractiveness should be a bit more aggressive
("a bit, not much, just a bit") — they shouldn't do "just a little bit"
and then stop. And the verdict on the mature vortex: stabilizing is good,
**but it must not stop rotating — it should be rotating inward of the
vortex.**

## What was actually frozen

The tear's twist was a **static bend**. `uTwist` is a running max that
saturates at 1.0 within the first half-second (the tear beat's crest), and
`uWind` winds up once and stays — so `spiralTwist`, a function of radius
only, was fully wound almost immediately. From ~0.5s to the gulp at ~4.0s
the vortex geometry did not move at all; only a faint outward ripple
shimmered. That stillness was the whole complaint: the vortex "stabilized"
into a bent photograph.

## The living spin — the vortex rotates for as long as it is visible

- **Engine:** a new `kamuiSpinPhase` integrates the vortex's own rotation
  every frame in `applyKamuiFrame`, rate = `1.5 · min(1, ease/1.15) +
  1.6 · uVac` rad/s — it rides the eased strength (the beats breathe it),
  **surges with the gulp**, and after the throat expires it coasts to a
  stop with the fading glow (the R67 unwind law, honored: no frozen spin,
  no cut). Reset to zero on every trigger, so each tear spins up from rest.
- **Shader:** a new `uSpin` uniform folds into the spiral
  (`+ uSpin · fall · uDir`) through the existing falloff, making the spin
  **differential** — the inner band winds visibly faster than the rim, so
  the spiral arms shear inward like matter going down a drain. `uDir`
  signs it, so the eject spins the other way. Over a 5.0s summon the core
  accumulates ≈1 extra rotation on top of the static bend (~86°/s at
  peak) — clearly alive, never nauseating.
- **The ripple marches inward:** `sin(r·32 + uTime·6·uDir)` — on the
  summon the radial ripple travels toward the core (suction); on the eject
  it travels outward (the push), matching the jutsu's two faces. Its
  amplitude rises 0.18 → 0.22.

## The early bite — a bit, not much

- Static twist **6.5 → 7.0** (the tear's first bend bites deeper).
- Implosion pull **0.28/0.22 → 0.32/0.26** (twist/wind components).
- The beat table, the 5.0s timeline, the throat, the vacuum window, the
  hold, and the eject are **untouched** — the author approved R77's
  timing as-is.

## Boundary kept

R66b's time-driven vortex (commit `0c2d67e8`, reverted by the author) was
a **Universe Surface** change — the sky lens around the black hole. This
round touches only the Kamui portal post-process, at the author's explicit
request, and leaves `surfaceShaders.ts` untouched.

## Verification

`npx tsc --noEmit` clean; round18 gauntlet GREEN with its pins reconciled
consciously to the evolved shader (twist 7.0, pull 0.32/0.26, the uSpin
term) and a new dedicated check pinning the living spin (uniform, field,
integration, reset, inward ripple); `npm run verify` ALL GREEN —
round16/17/18/63/72/73/74/75/76 gauntlets, smoke + prod-smoke, zero
console errors; `audit:arch --check` shows only the pre-existing R52
baseline findings, none from this round.
