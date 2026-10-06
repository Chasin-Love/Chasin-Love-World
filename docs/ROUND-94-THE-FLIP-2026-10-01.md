# ROUND 94 — THE FLIP (2026-10-01)

> The R91 decree lands. From this round the universe BOOTS on true N-body
> gravity — absent flag = ON — and "everything everywhere" is real: every
> galaxy's inner system has its own scope of the one session, swapped by
> proximity, each scope's story persisting across visits and restarts. The
> music box is no longer the puppeteer; it is the seed, the fallback, and
> the heal — exactly as the author decreed on the founding charter.

## What changed

**THE FLIP.** Both derivations (`App.tsx`, the twin card) now read
`universeDriver !== false` — a universe with no saved preference BOOTS DRIVING.
The console switch still restores the clockwork on demand (and the switch's
state persists). A device where the core cannot run gets the clockwork
automatically through the freshness law — silent, honest, always.

**THE SCOPE SWAP — everything everywhere with one session.** The bridge holds
ONE simulator session per tier, so the driver now has SCOPES:
`activateScope(scopeId, bodies, simDays)` — the engine declares which realm
the camera is in each frame (home reality, or `galaxy:${id}` from
`updateInnerSystem`); the tick block activates the wanted scope and ticks the
active one. Activating saves the resting scope's memory (scope-swap), then
either resumes the target's own memory — with a BOUNDED CATCH-UP BURST
(250-day chunks of 1000 × 0.25-day RK4 sub-steps: moon orbits stay resolved;
a 5-real-minute absence ≈ 1,800 sim-days ≈ 8 calls) — or seeds it fresh from
the canon. Beyond a 100,000-day absence the memory is re-seeded (the honest
limit). The visible universe is the living one; the resting one rests with
its story intact.

**THE INNER SEAM.** The inner system's STAR leads its scope's roster (the
dominant mass — its barycenter wobble is real physics, and with a 10 M☉
companion in some systems it is BIG), and its ensemble follows: corona, both
halo rings, and the belt ride the star's readback. Planets consume the
readback at index+1; inner moons (now carrying deterministic
`${planetId}:moon:${i}` ids, both the natural court and diary moons) convert
world → local by subtracting the parent group — R93's law, galaxy frame. A
stale readback falls back to the Kepler solve everywhere, and the session's
frame IS the galaxy-local frame (the canon was seeded in it) — no rotation
conversion ever. The home seam is scope-checked: inside a galaxy, the home
session rests; its sky renders Kepler until its scope returns.

**UI HONESTY.** The Physics Laws panel wears the state: the badge reads
"TRUE GRAVITY · DRIVING" (emerald, breathing) and the Living Gravity toggle
rests disabled — "Gravity · In the Session" — because true mutual gravity IS
the session now. Restore Ephemeris' tooltip says what it truly does: re-seeds
the driving session too.

## The R88 law, reconciled by the decree

The R88 gauntlet needed no rewrite: its checks grep `simTwin.ts` — the lab —
which remains untouched and read-only. The narrowed hybrid law is
machine-enforced by the R91–R94 gauntlets on the driver side. The R92/R93
consumer-count checks and the R91 resume check were consciously reconciled to
the evolved contract (the inner seam is the second consumer; enabling IS
activating the home scope with catch-up).

## The live receipt (the updated round92-live-check flow)

Real headless Chromium, driven as the author would: the app BOOTS DRIVING —
the card shows the flip, the session steps from frame one — then RESTORE
CLOCKWORK reverts on demand, DRIVE THE SKY hands it back, the frame loop
stays alive, and the whole drive logs ZERO console/page errors. Eight PASSes.

## Verification of this round

- `npx tsc --noEmit` green; round94-the-flip-gauntlet (14 checks) ALL GREEN
  and in the verify chain; R91/R92/R93 reconciliations green; full
  `npm run verify` green — typecheck + 18 gauntlets + smoke + prod smoke,
  WITH the driver live by default (the boot smoke itself now runs on the
  session-driven sky).
- Architecture snapshot consciously refreshed (the DriverMoonSpec export
  folded into DriverBody — the auditor's dead-type law honored).
- Honest limits: the receipt again ran on the TypeScript tier (CI compiles
  the C++ and commits the artifact — native/WASM receipts certify there).
  Chaos is now the default state of the universe: the vault's 10 M☉, real
  moon masses, and honest N-body coupling will move every world off its
  canon path over time. Restore Ephemeris is the one heal; the memories make
  the story continuous. THE ARC IS COMPLETE ON THE BRANCH — the `--no-ff`
  merge to main and the v16.0.0 tag await the author's word.
