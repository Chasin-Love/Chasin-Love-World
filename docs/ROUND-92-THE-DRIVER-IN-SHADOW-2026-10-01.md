# ROUND 92 — THE DRIVER IN SHADOW (2026-10-01)

> The R91 decree's second phase, on branch `the-real-universe`: the N-body session
> takes the wheel of the rendered sky — behind a gate that is OFF by law this round.
> Nothing changes for the author until they flip the new switch; everything is ready
> for the flip. THE CANON SEEDS; THE SESSION DRIVES; THE CLOCKWORK IS THE FALLBACK
> AND THE HEAL — now in the running code, live-verified in a real browser.

## What changed

**The gate (the setSimTwin pattern, twice over).** `engine.setUniverseDriver(on)` —
`private universeDriverOn = false` by law. Turning it ON hands the simulator session
to the driver and force-stops the twin lab first (one session per tier — last writer
wins, so the driver must be it). Turning it OFF saves the session memory one last
time (`disableDriver`) and the clockwork takes the sky back. Engine `dispose()` also
saves. The tick hook is gated `universeDriverOn && !bootIntro`, fire-and-forget with
the driver's own pending guard.

**THE SEAM — the single most important change of the revolution.** In `updateBodies`,
one line upstream of the loop: `const drvPos = this.universeDriverOn ? driverReadback(this.simDays) : null`.
When the driver owns the sky and its readback is fresh, the session's extrapolated
positions ARE the universe — every body flows through the SAME `b.group.position.set`
the Kepler solve has always used, so camera targets, hover colliders, diaries, the
lens, the surface and everything else follow for free. A stale or absent readback
returns null (the 2.5-day trust window — the keplerCache pattern) and the Kepler
solve renders that frame instead: the fallback law, silently. `driverReadback` is
consumed exactly once in the whole engine (the round92 gauntlet counts).

**Living Gravity stands down while driving.** The osculating-element writer is gated
`livingGravityOn && !universeDriverOn` — the session IS the living gravity now
(mutual, real, the vault at its full 10 M☉ per the decree). The toggle keeps working
the moment the clockwork returns. Restore Ephemeris heals both worlds: the field AND
(`healDriver`) the driving session, wiping its memory and re-seeding from canon.

**The switch persists.** `universeDriver?: boolean` in the domain contract; the
`setUniverseDriver` action (flag + audit — the single mutation surface); App derives
`state.universeDriver === true` (absent = OFF this round, the shadow law; R94 flips
the default) and rides it into the engine in the physics-toggles effect.

**The card becomes the driver's face.** The Native Simulator Twin card gains the
UNIVERSE DRIVER panel: the badge (CLOCKWORK / DRIVING THE SKY), the DRIVE THE SKY /
RESTORE CLOCKWORK switch (through the store), and the live readout — steps run,
session clock, memories saved, max drift, and the top-4 per-body drift from
`driverTelemetry` (the 1 Hz module-map poll pattern). Session ownership is honest in
the UI: Verify Twin rests while the driver owns the session, and the twin toggle
refuses with a toast; the poll keeps `twinOn` truthful when the engine force-stops
the lab.

**A pre-existing 404 died on the way.** The first console-open triggers the bridge's
lazy init, whose WASM probe got a 200 text/html from Vite's dev SPA fallback and then
attempted the doomed `import` — logging a loud console error for a perfectly normal
"no artifact yet" host. The probe now verifies the response is actually JavaScript
before importing: the silent-fallback contract holds, and console-open is clean.

## The live receipt (scripts/round92-live-check.ts)

A one-off black-box check (not in the verify chain) driving a real headless Chromium
exactly as the author would: boot → Ctrl+K → Open Core Console → Twin Jump →
DRIVE THE SKY. Nine PASSes: clean boot; console open; the card shows the switch in
CLOCKWORK state; the badge flips to DRIVING THE SKY; **the session actually steps
(steps-run grows across sampled seconds — true N-body gravity drove the sky)**;
drift telemetry live; the frame loop alive (the seam being consumed); RESTORE
CLOCKWORK reverts cleanly; zero console/page errors across the whole drive.

## Verification of this round

- `npx tsc --noEmit` green; round92-driver-shadow-gauntlet (22 checks) ALL GREEN;
  the R88 gauntlet's ownership check consciously reconciled (Verify rests for
  EITHER owner — the R74/R75 reconciliation precedent); full `npm run verify` green
  (typecheck + 14 gauntlets + smoke + prod smoke).
- `npm run audit:arch -- --snapshot` consciously refreshed (the card's store import,
  shifted audited lines) — check clean.
- Honest limits: this checkout has no compiled WASM artifact (no emsdk locally —
  CI builds and commits it), so the live receipt ran on the TypeScript tier at the
  full 6 sim-days/second clock with 24 sub-steps — the engine math holds; native/WASM
  numeric receipts certify on CI. The gate is OFF by law: until the author flips the
  switch (or R94 lands the flip), the sky renders exactly as it always has.
