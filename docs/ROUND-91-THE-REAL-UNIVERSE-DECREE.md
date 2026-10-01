# ROUND 91 — THE REAL UNIVERSE DECREE (2026-10-01)

> The author's decree, after understanding what the project actually is: *"my universe
> should never be like a music box. It should be exactly like the real universe — N-body
> physics. Make the mini universe, the real physical program, the MAIN program. It's a
> real universe simulator."* This branch (`the-real-universe`, cut from main's R90 tip,
> merging only by `--no-ff` on the author's word) exists to fulfill it, in small provable
> phases. Nothing on this branch is experimental plumbing — it is the project's future
> mainline, and every phase ends with the full verify chain green.

## THE DECREE, IN LAW FORM

**The canon seeds; the session drives; the clockwork is the fallback and the heal.**

1. **The canon (Kepler's clockwork) changes job, not value.** Not one orbital element,
   seed, or constant is edited. It stops being the puppeteer and becomes:
   (a) **the seed** — every N-body session is configured from the canon's exact positions
   and finite-difference velocities (the simTwin seeding math, real kg masses),
   (b) **the fallback** — any frame whose session readback is stale, or any device where
   the core cannot run, renders the clockwork instead, silently and honestly badged,
   (c) **the heal** — Restore Ephemeris re-seeds the session from the canon: the author's
   personal reset from chaos to the divine plan.
2. **The session (the R87 simulator: C++ native / WASM / TS twin) becomes the MAIN
   driver of rendered world positions.** Real mutual gravity, real masses — and the
   vault black hole participates at its **full 10 M☉**: nature's law. "Newton keeps the
   peace" (the ×1e-3 dynamic-mass tempering) is superseded **while the session drives**;
   it remains exactly as-is for the clockwork mode and the lens.
3. **Real chaos is accepted by the author, explicitly.** Orbits wander, precess, and in
   the long run may depart their old paths forever. No hidden guardrails. Restore
   Ephemeris is the one heal.
4. **The universe remembers.** The simulated state is saved and restored: closing and
   reopening the app resumes the same drifted universe. The story is continuous.
5. **Everything everywhere, phased.** Home system first (R92), then every diary-moon
   becomes a real body (R93), then every other galaxy's inner system gets its own lazy
   session (R94). Galaxy-stage visuals, belts, and the cosmic web remain procedural —
   they are scenery, not worlds; the decree's spirit is that every WORLD is real.
6. **The hybrid read-only law (R88) narrows, consciously.** `simTwin.ts` remains the
   untouched, read-only lab. The new `src/physics/sessionDriver.ts` owns the rendered
   writes — through the single `updateBodies` seam, and only there. The R88 gauntlet
   keeps guarding the lab; a new gauntlet guards the driver.
7. **On by default, with an honest exit.** When the core is available, true gravity
   drives the sky automatically (absent-flag = ON, the livingGravity pattern). A console
   switch can always hand the sky back to the clockwork. Safety nets (55 ms breaker,
   composite fallback, shader disarm) and the R71 container law are untouched: the
   driver moves bodies, never the camera.

## THE PHASES (each = a round with its own gauntlet, verify, doc)

- **R91 (this round, Phase 1):** the session gets a memory and a wide eye — batched
  state read (`cosmos_get_body_states` through C++/Rust/WASM/TS), the driver module
  (configure-from-canon, readback, save/restore), the locked storage key, restore on
  boot, Restore Ephemeris extended. No rendered behavior changes yet.
- **R92 (Phase 2):** the driver takes the wheel in shadow — the engine gate (default
  OFF), the updateBodies seam, the extrapolation freshness law, the console switch.
- **R93 (Phase 3):** the moons become real.
- **R94 (Phase 4):** THE FLIP — default ON, inner-system sessions, UI honesty pass,
  R88 reconciliation, v16.0.0.

## The branch law (the author's graph requirement)

The author showed the git graph he wants: two parallel lines, the branch visibly
carrying its own life (image 1), not the stacked look a fast-forward merge produces
(image 2). Therefore: this branch is cut at main's R90 tip and **main does not move**
while the arc runs; every future merge of `the-real-universe` into `main` uses
`--no-ff` so the parallel history is drawn forever; nothing merges until the author
says so.

---

## R91.1 — WHAT SHIPPED: THE SESSION GETS A MEMORY AND A WIDE EYE

No rendered behavior changed this round — the engine does not know the driver exists
yet (that is R92's gate). What shipped is the machinery everything else stands on:

**The wide eye (batched session read, end to end).** One new C++ export,
`cosmos_get_body_states(handle, count, out)` — every body's position+velocity in ONE
call, 6 doubles per body row-major, returning the number written. Wired through the
Rust FFI (real `cosmos_cpp` declaration + the `cosmos_stub` twin kept in lockstep),
a new `cosmos_sim_states` Tauri command (empty session = `count: 0`, never an error),
the WASM `EXPORTED_FUNCTIONS` pin (the R87 gauntlet's dead-strip regex consciously
taught the new symbol), and a `simStates()` method on the bridge speaking all three
tiers — native invoke, WASM `ccall` with a malloc'd buffer + freed in `finally`, and
the TS twin's new `allStates()`. Reading 10–50 bodies must never cost one round-trip
per body; now it costs one.

**The driver module (`src/physics/sessionDriver.ts`).** The session's new owner,
under the narrowed hybrid law: it holds no scene objects, never imports the store,
and publishes to its own module-level map (`driverTelemetry`/`driverState` — the
simTwin.ts purity rules, enforced by the round91 gauntlet). Inside:

- **The canon seeds.** `buildRosterInputs`/`seedFromCanon` reproduce the twin lab's
  seeding math line-faithfully: real kg masses from physicsEngine (the vault at its
  full 10 M☉ — nature, per the decree), SI positions from the exact Kepler solve,
  velocities from the same 0.05-day central finite difference. The 4096 session cap
  is mirrored (`SESSION_BODY_CAP`).
- **The freshness law.** The readback is cached in scene space with a sim-days stamp;
  `driverReadback(simDays)` extrapolates position + velocity × Δt to the LIVE clock
  and returns null beyond a 2.5-day trust window — the engine seam (R92) will render
  the Kepler solve for any stale frame, exactly like the keplerCache rule.
- **The universe remembers.** `saveSession`/`loadSession`/`restoreSession` over the
  locked key `my-universe:sim-session:v1` (registered in `storageKeys.ts`): roster
  metadata + SI states + simDays, per reality. Restore configures FROM SAVED STATES
  (configure-always-resets is the contract — the states ARE the new seed). Saving is
  cadenced inside the tick (every 8 readbacks ≈ 2.7 real seconds) plus on disable;
  corrupt or absent memory falls back to a fresh canon seed.
- **Churn without losing the story.** `reconfigurePreserving`: on any roster change
  (reality switch, body added/removed) the current states are read, mapped onto the
  new roster BY ID (newcomers get canon states), and the session is reconfigured from
  those states — drift survives, the universe never resets unless the author heals.
- **The heal.** `healDriver` deletes the reality's memory and re-seeds from canon —
  Restore Ephemeris, driver edition (the engine wiring lands with R92's gate).
- **The tick.** `driverTick` accumulates the live clock and advances the session
  fire-and-forget with the pending guard at the same 2-sim-day cadence, stepping in
  24 sub-steps (~6-hour RK4 resolution), then refreshes the batched readback and the
  per-body drift telemetry.

**round91-session-memory-gauntlet (21 checks)** joined the verify chain: the batched
read at every layer, the driver's purity, the canon seeding, the locked key, the
save/restore round-trip, churn preservation, the heal, resume-before-seed, the
extrapolation + trust window, fire-and-forget discipline, chain membership.

## Verification of this round

- `npx tsc --noEmit` green; round91 gauntlet ALL GREEN; round87 gauntlet ALL GREEN
  (the export-pin edit); R88 lab gauntlet untouched and green; full `npm run verify`
  green (typecheck + 13 gauntlets + smoke + prod smoke).
- `npm run audit:arch -- --check` consciously refreshed (`--snapshot` in the same
  commit) for the new module's imports — the R72 precedent.
- Honest limits: this machine has no emsdk/MSVC, so the C++/WASM numeric behavior of
  `cosmos_get_body_states` certifies on CI (the R89 pipeline builds and commits the
  artifact); locally the TS tier carries the path, and the stub-tier lockstep keeps
  `cargo check` hosts type-correct. The engine remains Kepler-driven this round —
  the seam is R92's whole job.
