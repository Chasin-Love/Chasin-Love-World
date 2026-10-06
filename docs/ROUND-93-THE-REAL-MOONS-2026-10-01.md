# ROUND 93 — THE REAL MOONS (2026-10-01)

> The R91 decree's third phase, on branch `the-real-universe`: every diary moon
> becomes a real body. Until now moons were ornaments — a closed-form circle riding
> their planet, massless, unperturbed, blind to the black hole's pull. From this round,
> when the driver owns the sky, moons are IN the session: real rock with real mass,
> pulled by the star, the planets, the vault, and each other — and still born from the
> same diary pages, still carried by the same deterministic identity.

## What changed

**Deterministic identity (the churn key).** `syncMoons` stamps every moon with
`id: ${planetId}:moon:${index}` and its scene `radius` (the mass law's input). The ids
are stable across rebuilds — a moon born from a diary page keeps its state through
every later roster change, because `reconfigurePreserving` maps states by id. The
session never resets for a moon being born; the newcomer just seeds from canon and
joins the story.

**The moon mass law.** `moonMassKg`: rock at 3500 kg/m³ (the BODY_PROFILES fallback
density — the same law physicsEngine gives unknown ids) via the shared
`radiusKm = (radius/2.05)·6371` conversion. A moon of an Earth-analogue lands around
10²² kg — a real large-moon mass that tugs its parent measurably and rides the
planet's Hill sphere safely.

**The moon canon.** In the driver's roster, moons are `kind: 'moon'` entries with a
`parentId`. Their canon position composes the PARENT's canon Kepler position with the
engine's own tilted-orbit formula — `tiltInPlaneVector(cos(ma)·a, sin(ma)·a, incl,
node)` **including the vertical bob** (`sin(ma·0.7)·a·0.12·cos(incl)`) — so the seed
is EXACTLY what the ornament sky shows and the flip is seamless at t=0. Velocities
finite-difference the composed canon, so a moon's session velocity carries both the
parent's motion and its own orbital speed. Moon periods (14+8i days) against the
24-sub-step cadence give 168+ RK4 steps per orbit — resolved, not approximated.

**The moon seam.** `driverMoonReadback(simDays)` — the same extrapolation as the
planet seam, keyed by moon id, same 2.5-day trust window. In `updateBodies`'s moon
pass, a fresh readback converts world → local by subtracting the parent group's
position (body groups never rotate, so the subtraction is exact); a stale readback
falls back to the ornament closed-form. Planet and moons always agree — both session
or both canon, never a mix.

**The tolerance.** Moons without an id/radius — the isolated inner systems' moons
(R94's scope) and any pre-R93 mesh — are skipped by the roster builder:
ornament-only, exactly as before. The driver module's purity still holds (no rendered
writes, no store imports — the gauntlet re-pins it).

## Verification of this round

- `npx tsc --noEmit` green; round93-real-moons-gauntlet (16 checks) ALL GREEN and in
  the verify chain; full `npm run verify` green (typecheck + 16 gauntlets + smoke +
  prod smoke); the R92 live check re-run ALL GREEN with moons in the roster.
- Honest limits: the live receipt again ran on the TypeScript tier (no artifact on
  this machine — CI compiles the C++); moon chaos is REAL now — with the vault at
  10 M☉ perturbing planets, a scattered planet carries its moons into whatever orbit
  reality gives them, and Restore Ephemeris remains the one heal. The gate is still
  OFF by law until R94 lands the flip.
