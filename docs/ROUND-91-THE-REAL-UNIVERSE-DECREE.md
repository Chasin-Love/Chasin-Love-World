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
