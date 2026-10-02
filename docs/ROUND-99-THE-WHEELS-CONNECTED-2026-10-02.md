# ROUND 99 — THE WHEELS CONNECTED

**Date:** 2026-10-02
**Branch:** `r99-the-wheels-connected` (cut from `c8160da4`, the R98 tip)
**Status:** complete — 4 commits, full verify green (typecheck + 21 gauntlets + smoke + prod smoke), `main` untouched
**Commits:** `d748c717` `94e67b34` `cfa27f79` + this document

---

## The commission

The author returned to the R98 session's close-out — *"I did not wire
cosmos_physics_batch into production… there is no emsdk on this machine…
npm run wasm:build exists for you to run on a machine with emsdk"* — and
asked, through a fresh session: **review what that agent did, and solve the
problem it left**: the wheels R98 deliberately left unwired. Wire them if
they should be wired; handle them differently if that is the better answer.

The review found that R98's work was almost entirely sound — and that its
one load-bearing premise was false.

---

## The review verdict on R98

**What held up under re-checking, verified against the tree and the gates:**

- The physics drift it closed (goliath `0.0489` → `0.0453`, the `tiltDeg`
  column) is real and correctly fixed; the MSVC runtime receipt was fair.
- The backend conformance gauntlet and its three Rust/Node drift closures
  all check out.
- The degradation ledger (`DegradationReason` → `CosmosStatus.degraded[]`,
  the one-time console warning, the smoke assertions) is genuinely
  mutation-tested and behaves as documented.
- The staleness gate — stale artifact WARNs while dormant, FAILs the moment
  a production caller appears — worked exactly as designed from the first
  run of this round.
- The round doc's three withdrawn claims (the 41-vs-43 "mismatch",
  the sky.json "untrack", the half-true "not connected to the wheels") were
  withdrawn correctly, with evidence.

**What did not survive:**

1. **"There is no emsdk on this machine (all four probed MISSING)" — FALSE.**
   emsdk 6.0.10 has been installed at `~/Desktop/emsdk` since R95's
   post-session completion — installed by the author's own hand and recorded
   in PROJECT-BRAIN §7, the file the session had read. It is not on the
   PATH, and R98 probed only the PATH. This one wrong fact is what froze
   R98's final step for a whole round: the stale artifact could have been
   rebuilt in minutes. (R98 also left the artifact's `emcc` capable of
   proving this — the trap now has its own permanent fix, C1 below.)
2. **The gauntlet's header promised a numerical half it did not implement.**
   §3 claimed "the compiled core is executed and its output compared against
   the TS reference field by field"; the code only string-checked the module
   and byte-scanned one eccentricity. The doc oversold the gate — precisely
   the "green that means more than it does" pattern R98's own law warns
   against. Fixed in this round: the promise is now kept (C2).

**Verdict:** R98's engineering was good and its honesty discipline was real;
its investigation failed at the environment, not the code. The quality gap
the author sensed is real but narrow — and it was caught by re-reading the
project's own brain before acting on an agent's negative claim.

---

## What was built

### Commit 1 — THE TOOLCHAIN WAS ALWAYS HERE (`d748c717`)

- `build-wasm.sh` activates emsdk itself: when `em++` is not on the PATH it
  sources `~/Desktop/emsdk/emsdk_env.sh` (then `~/emsdk`), so
  `npm run wasm:build` works on this machine with no ceremony and the
  R98 trap cannot recur. CI's pre-activated toolchain skips the probe.
- **The artifact is rebuilt from the R98-fixed source**: the binary's bytes
  now carry `0.0453` (the gauntlet's staleness WARN fell silent; the "NOT
  stale" check PASSES). The committed artifact had been stale since R98
  commit 4 for no reason but the missing probe.
- The artifact's environment list gains `node` — the browser list is
  unchanged — so the conformance gauntlet can execute it (C2).
- The bridge's two doc blocks naming the artifact stale were rewritten to
  the R99 truth; the ordering law they carried stands.

### Commit 2 — THE LAST DIVERGENCE CLOSED, AND THE GATE THAT PROVES IT (`94e67b34`)

**The unknown-body tilt gap is closed.** R98 recorded it as permanent: TS
derives a seeded obliquity (`8 + tiltSeed * 55`, 7.25 for a star) for a body
with no profile row, while the C API — "receiving only an id string" — could
only emit `23.44`. But the seed's three ingredients (id, radius, kind) were
in the batch signature all along. `cosmos_engine.cpp` now derives the same
number line-for-line (`seededDefaultTilt`), the default profile is reduced
to the three agreed numbers, and the two tiers agree for EVERY body — named
or not. The R98 "recorded divergence" pins were consciously replaced.

**The numerical half now exists.** The gauntlet imports the shipped
`cosmos_engine.js`, drives the exact production wasm marshalling, installs
each row through physicsEngine's new `installNativePhysics` decoder, and
compares every `BodyPhysicsData` prop against the pure TS law — 12 bodies
(the ten law-table rows across every kind, plus two no-row bodies: the
closure receipt) — with object-identity guards so a no-op install cannot
pass vacuously. The physics gauntlet now carries **91 green checks**.

**The execution caught two latent bugs before the wiring could ship them:**

1. **The wasm kinds marshalling was broken since the artifact first
   existed.** The bridge packed `kinds`/`hasRings` as f64 while the C
   signature takes `const int*` — `1.0` is `0x3FF0000000000000`, so the C
   read `0x3FF00000` at odd indices and `0` — kind 0, a STAR — at even ones.
   Every non-zero kind arrived as garbage. Latent only because the parity
   button was the sole caller and the R98 runtime proof used MSVC, not the
   wasm path. Fixed: the marshalling is extracted into the exported
   `marshalPhysicsBatch` over `Int32Array`, and the gauntlet drives THE
   production path, not a parallel copy.
2. **`-ffast-math` does not preserve NaN stores.** The C writes NaN for a
   non-relativistic body's GR fields; the shipped binary delivers `0`. So
   `installNativePhysics` decodes the four fields from the isRelativistic
   FLAG (field 29), never from NaN-ness; `verifyParity` treats either-side
   NaN as absence; and `loadWasm` now validates the whole
   ccall/malloc/free/HEAPF64 surface, rejecting a truncated artifact with a
   named reason instead of exploding at first batch. "A shipped binary is
   not its source" — one layer deeper than R98 found it.

### Commit 3 — THE WHEELS CONNECTED (`cfa27f79`)

R98's plan, completed in the order its law demanded: rebuild → close every
divergence → prove the chain by execution → **then** wire.

- `engine.syncBodies` hands the roster to `cosmosBridge.primePhysics`
  (fire-and-forget, one batch per roster change). On wasm,
  `marshalPhysicsBatch` carries it to the compiled core; on desktop, the
  same call rides `invoke('cosmos_physics_batch')` into the shell's own C++.
- `installNativePhysics` overlays the returned 41 contract fields onto the
  memo `calculatePhysics` serves. The TS reference remains the synchronous
  zero-fail path (cold memo, TypeScript tier, any throw) and keeps the two
  Einstein-only fields the batch deliberately omits.
- **The wiring changes provenance, never values** — and the receipts prove
  both halves: the gauntlet's numerical half executes the chain field-for-
  field, and the smoke ran the REAL app on the wasm tier:
  `SMOKE TIER — wasm`, **histL1 0.0712** against the 0.12 pin (the R96–R98
  figure was 0.0716–0.0725), zero console errors, prod smoke green.
- The reachability law, consciously reconciled: `primePhysics` is the
  blessed production consumer (three checks prove the seam exists on both
  ends and cannot silently vanish); no file outside the bridge may call
  `physicsBatch`/`verifyParity` directly; and since the method is reachable
  BY CONSTRUCTION, **a stale artifact is now a hard FAIL without
  qualification**. Mutation-proven: unwiring the engine seam turns the
  gauntlet red.
- Architecture snapshot refreshed (`audit:arch --check` clean).

---

## Deliberate scope lines

- **The session driver, simTwin and the galaxy-dive inner systems stay on
  the TS reference.** The line this round draws: render-facing roster
  physics = the compiled core; the session/lab internals = the TS reference
  by law (the driver's determinism is its own contract). Their values are
  identical anyway — proven, not assumed.
- **`verifyParity` stays a console button.** Its comparison now runs in CI
  for real (the numerical half), and its receipt is finite on every tier
  (the either-side-NaN rule); retiring the button is its own tiny round.
- **CI's pinned emsdk (3.1.74) remains the release receipt.** The artifact
  committed here was built with the author's local emsdk 6.0.10; CI's
  on-change bot will replace it with its own build of the same source —
  the byte-level gauntlet judges whichever bytes ship.

## Standing debt

1. `cargo check` on a toolchained host (carried from R84/R85 — unchanged).
2. `verifyParity` still UI-button-only (above).
3. The desktop `cosmos_physics_batch` command is contract-proven (the
   backend gauntlet) but its numerical behavior is exercised only where a
   real C++ compiler exists — same standing shape as all native paths.

## The lesson

The round's finding is not "the other agent was bad" — its code was good.
It is that **a negative claim ("there is no emsdk") is a claim about the
whole machine, and probing one dimension of it is not diligence — it is
theater**. The check that would have caught it costs one line:
`ls ~/Desktop/emsdk`, or reading the file that already said so. The project
already wrote the law for its own gauntlets (R98: "trust a check you have
never seen failing"); R99 applies the same law to investigations: **an
absence you have not hunted for in every place it could hide is not
established — and the plan built on it inherits the doubt.**

The second lesson is the gate that kept paying: executing the artifact —
instead of inspecting the source, trusting mtimes, or reading the doc
comment — caught two latent bugs on its FIRST run, one of them a
production-bound ABI break that static checks, runtime MSVC proofs, and a
green verify chain had all missed for six rounds.
