# ROUND 88 — THE PER-FRAME TWIN (2026-10-01)

> The author's "yeah please" to the gated next step: the stateful native simulator now
> runs **alongside the live universe** on its own clock, measuring how far true N-body
> gravity drifts from the Kepler canon. On branch `r88-per-frame-twin` (branched from
> `main` at v15.0.9) — the hybrid law holds in every line: **the twin is read-only
> against the rendered sky.**

## What changed

**R88.1 — the twin module.** `src/physics/simTwin.ts`: the engine's tick hook feeds it
the live clock (`lastSimDelta`, `simDays`); the twin accumulates simulated days and,
every ~2 accumulated sim-days (≈⅓ s at full clock rate), advances the shared native
session (`cosmos_sim_step`, fire-and-forget with a pending guard — the frame never
awaits and never blocks) and reads every body back. Per body it measures the honest
distance between true N-body gravity and the Kepler canon at the twin's own clock time,
in AU, into its own module-level telemetry map (the PhysicsHUD pattern — high-frequency
data never rides the UI store's notify/persist cycle).

- **Real physics:** the twin feeds the home system's *physical* masses
  (physicsEngine-derived kg — the vault really is 10 M☉ here; the dimensional-anchor
  damping is Living Gravity's UI tempering, not nature's), canonical Kepler positions
  converted scene→meters (52 units = 1 AU), velocities by the same central
  finite-difference nbody.ts uses (there is no stored velocity).
- **Roster churn** (reality switch, create, delete, edit) is detected by signature and
  reconfigures the session cleanly.

**The engine hook is the only touch:** a gate field (`simTwinOn = false` — OFF by law),
`setSimTwin(on)` (enable → roster sync + session configure; disable → telemetry clears),
and one gated call in `tickFrame` (`if (this.simTwinOn && !this.bootIntro)`).
`dispose()` rests the twin. Nothing else in the engine changed.

**R88.2 — the card grows the toggle.** The Native Simulator Twin card gains RUN/STOP
(reaching the gate through the `__ENGINE__` boot contract — the same seam smoke.ts
consumes) and a 1 Hz live readout: steps run, twin clock, max drift AU, and the top
drifting bodies by name. Session ownership is explicit: **Verify Twin rests while the
per-frame twin owns the shared session** (the native layer holds one session — last
writer wins, the UI says so).

**R88.3 — the guard.** `round88-per-frame-twin-gauntlet.ts` (12 checks) joins the
verify chain, machine-enforcing the safety story: simTwin.ts must contain no
position/rotation/visible writes and no store imports; the gate is OFF by default; the
hook is gated and fire-and-forget; real masses through the scene→SI conversion; the
card's ownership discipline; the verify-chain membership. Snapshot consciously
refreshed in-commit.

## Reading the drift

The drift number is the round's actual product: it is the honest distance between true
integrated N-body gravity and the analytic Kepler canon as the universe lives. Small
and stable drift = the clockwork and the simulator agree (the hybrid is sound). Growing
drift near the vault = the 10 M☉ hole's real pull, visible at last. This telemetry is
the evidence base for any future round that lets the simulator *drive* — the author
decides when and what, with these numbers in hand.

## Verification of this round

- `npx tsc --noEmit` green after every step; round88 gauntlet ALL GREEN (12 checks);
  round87 + all pinning gauntlets green; full `npm run verify` green at round end;
  `audit:arch --check` clean at the consciously refreshed snapshot.
- The per-frame twin's numeric receipts are live in the app (desktop: native session;
  browser: TS tier until the WASM artifact is rebuilt per R87.2). `desktop:check`
  remains unrunnable on this laptop (no MSVC toolchain — R88 touches no Rust, so the
  cargo caveat is unchanged).
