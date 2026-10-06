# ROUND 95 — THE STEADY SKY

*2026-10-01 · branch `the-real-universe` · after THE FLIP*

R94 landed the decree: the universe boots on true N-body gravity. It was also,
on the author's word, **unstable** — worlds plunged into the star, moons flew
apart, the sky flickered. R94 made gravity real; R95 makes it *bearable*.

This round changes no law and no render. It changes how the universe is
**planted**, and adds the four seams that make an honest chaotic sky legible.
The headline finding is that **R94's sky survived about 40 sim-days**, and that
the deepest cause was neither the seed table nor the softening but a single
missing division in the tick (§4b). Everything here is measured: the round
built a headless physics probe to run the real integrator, and every number
below is an observation, not an argument.

---

## 1. Why R94 detonated

Four independent faults, all in the seed or the seam — plus one in the tick
that the seed work alone would never have found:

1. **The tick ran 24× ahead of the clock.** `simStep(dt, 24)` advances
   `dt × 24`, so the integrator was integrating the whole 2-day span 24 times
   over. This is the deepest fault (§4b) and the reason the sky died in ~40
   sim-days: the readback's stamp and the integrator's real time disagreed by a
   factor of 24, so the star's barycentric arc never closed and the planets
   wound up on enormous fictional eccentricities.
2. **No central mass.** The home scope's roster began at the *first planet*.
   `buildBody` never renders the anchor, so R94's session had **no star at all**
   — every world in the home sky was mutually attracted and nothing held them.
   Unbound orbits from t=0 is not chaos; it is an explosion.
3. **Cinematic speeds against real gravity.** The canon table gives outer worlds
   periods 2–4× Kepler. Under true gravity those are hyperbolic seeds: the
   session reads the *canon* velocities and every world leaves.
4. **Impossible moons.** R93 put moons in the roster at their canon 14–30-day
   laps skimming the planet. At real gravity those orbits are unbound (moons
   escape ~200× over); at physics-true speeds they blur.
5. **A per-frame snap.** The freshness law's trust window (2.5 sim-days) was
   smaller than the frame's sim-delta at speed — so the seam alternated session
   and clockwork **every frame**. The visible "flicker" was that switch.

## 2. THE SEED LAW (three amendments to the planting)

### THE STAR LEADS EVERY ROSTER
`driverState` gained a star registry. Index 0 is **always** the system's star:
registered by the engine (`setScopeStar`, called from `setActiveReality` on the
`anchor` body — `buildBody` never renders it, so the driver must seed it),
already leading, or a synthesized central sun for starless scopes. Galaxy scopes
already led with `sys.starData` and needed nothing. Planets consume the readback
at **index+1**; the readback at index 0 steers the anchor group.

### THE ORBIT-TRUE SEED
Every world keeps its **canon position, direction and plane** — the sky the
author designed — but its session *speed* is the circular-orbit speed of the
gravity actually present: `v = √(GM/r)`, aimed along the canon's direction.
Circularized at their canon radii, the worlds hold their canon sky and then
wander honestly. The canon table's 2–4× periods cannot survive real gravity
as-is; this is the amendment that lets it.

**The vault temper.** A vault's in-session mass is the mass its *own canon orbit
implies* (`v²·r/G`), **and** at most a thousandth of the star. The second half
is the **Hill temper**, and it came out of measurement, not theory: 0.1 M☉ is
not a stable companion inside a real planetary system — the vault scatters the
inner worlds out of the sky within ~600 sim-days (see §7). Capped at 0.001 M☉
the vault is deep inside its own Hill sphere, still a real body that tugs the
star and the outer worlds, but no longer the thing that breaks the sky.
**The 10 M☉ display/UI law in `physicsEngine` is untouched** — it governs the
Living Gravity field and what the author reads, not the session's internal mass.
The two are separate quantities and the gauntlet pins both.

### MOONS RIDE PARENTS (the R93 amendment)
Moons left the integrated roster. They render as the parent's session position
plus their own inclined orbit — the R84 ornament law, now permanent, applied to
both the home scope and the galaxy inner systems. This is *not* a retreat to
Kepler: the parent is still the living session, the moon is still drawn relative
to it, and it now cannot possibly escape.

## 3. THE STEADY SEAM (four seams, no flicker)

* **THE CROSSFADE** (`drvBlend`). The session⇄clockwork source switch eases over
  a breath — rising in 0.4 s while the readback is fresh, falling in 0.15 s from
  the *frozen last session positions* when it goes stale. The clockwork end is
  computed every frame regardless, so the blend always has both endpoints.
* **THE WIDER TRUST WINDOW.** 2.5 → **8 sim-days**. The R94 staleness margin
  (~83 ms against a 0.25-day sub-step cadence) is gone; the seam now holds
  through a normal frame.
* **THE LIVING RINGS.** Hover ellipses are rebuilt ~1 Hz from each world's
  **osculating elements** off the session state (pos + vel → two-body elements
  around the star). Unbound or near-parabolic states refuse the rebuild and the
  canon ring stays — a fixed ring for an escaping world would be a lie. Resting
  on the clockwork restores every canon ellipse exactly once.
* **THE ACCELERATOR RESTS.** The C++ Kepler cache retires for the interim while
  the session is fresh. It is the fallback's accelerator, not the driven sky's.

Plus: **REALM HIDING** (`homeRealmW`) eases the home system out while the camera
dives a galaxy — this is what killed the "three black holes" bug, where the home
vault's geodesic quad rendered beside the visited galaxy's own hole. And the
**dive gate** gained hysteresis (enter < 1600, leave > 2000) so the boundary
cannot chatter.

## 4. SOFTENING

`computeAccelerations` softened from `1e4` m² (100 m) to **`1e12` m²** (ε =
1000 km, a planetary scale). The old value let close encounters reach
near-singular accelerations and sling bodies out of the session at extreme
velocity. Mirrored in the TS twin (`TsNBodySim.SOFTENING`) in lockstep — the
round-87 twin must remain a line-faithful port.

## 4b. THE SUBSTEP LAW (the round's deepest bug)

Found only because the probe in §7 runs the physics headlessly.

`simStep(dt, iterations)` advances `dt × iterations` — every tier (C++, Rust,
the TS twin) steps the *same* `dt` once per iteration. The tick was passing the
**whole** span as `dt` with 24 sub-steps, so the integrator ran the session
**24× ahead of the sim clock** on every fire. `catchUpSession` had the
division (`chunk × SECONDS_PER_DAY / 1000`); `driverTick` did not.

The symptom was subtle and would have been easy to misread as "chaos": the
readback's *stamp* said "day N" while the integrator had actually advanced past
day 24N, so the star's slow barycentric arc never came back — it walked
steadily outward — and the planets accumulated enormous, entirely fictional
eccentricity. Measured: **the sky survived ~40 sim-days** with this bug, and
~600 with the vault still untempered. With both fixed it survives **5000**.

The fix is one division: `.simStep(dt / DRIVER_SUBSTEPS, DRIVER_SUBSTEPS)`.

## 5. THE UNIVERSE REMEMBERS, HONESTLY

* **`resetUniverse` forgets the session memory.** A reset must also drop the
  driving session's saved states — the seedLaw stamp would re-seed them anyway,
  but a reset means reset.
* **Memories carry a `seedLaw` stamp.** Pre-R95 memories re-seed once, on
  sight — a session planted under the old law is not resumable under the new.
* **A memory ahead of the boot clock is ADOPTED.** `activateScope` returns the
  saved sim-days; the engine sets `simDays` to it. The universe you left is the
  universe you return to.
* **The tick accumulates BEFORE the pending guard** — sim-days are no longer
  silently dropped while a step is in flight.

## 6. ONE SESSION PER TIER, ENGINE-SIDE

`setSimTwin(true)` now **refuses** while the session drives. The card already
refused; the seam must not be stealable by a stray call. One tier, one session.

## 7. Receipts

### 7a. THE PHYSICS PROBE — `scripts/round95-physics-probe.ts`

The receipt that actually found the bugs, and the reason this round's claims
are measurements rather than arguments. It seeds the session from the real
canon, drives the **real `driverTick`**, and holds the sky headlessly —
thousands of sim-days in seconds, no browser, no 15-second sampling.

| law | survival |
|---|---|
| R94 as committed | ~40 sim-days (the detonation) |
| + substep fix, vault still 0.1 M☉ | ~594 sim-days |
| + Hill temper | **5000+ sim-days, zero detonation, zero ejection** |

It also isolated the vault by elimination (`R95_NO_VAULT=1`: clean to 1200
days on its own), which is how the Hill temper was found rather than guessed.

**A note on what this round got wrong first.** The R95 gauntlet is entirely
source-regex checks — it passed 21/21 on a sky that detonated in 40 days,
because no regex can tell you whether an integrator is stable. The probe is
what makes the difference, and it should exist for the rounds that follow.

### 7b. THE GAUNTLET — `scripts/round95-steady-sky-gauntlet.ts`

**25 checks, ALL GREEN** (the first count of 24 was a miscount — the script
prints 25 PASSes), in the verify chain: star-led rosters, the orbit-true
seed, canon untouched at t=0, the vault **and** Hill tempers, the substep law in
both the tick and the catch-up burst, the 8-day window, the crossfade, the dive
hysteresis, the catch-up yields, the seedLaw stamp, memory adoption, the living
rings, the realm hide, the 1e12 softening in *both* tiers, the engine-side
refusal, and the reset.

### 7c. THE LIVE RECEIPT — `scripts/round95-steady-sky-live.ts`

Real headless Chromium, three real minutes, asserting continuously that **every
rendered body's scene radius stays within [0.2×, 4×]** of its first observed
radius; that the sim clock advances continuously; that the frame loop never
starves; that the star's wobble stays bounded; and that the console is clean.

*Two harness bugs worth recording, because both faked failures:*

1. The first draft sampled the driver with a page-side
   `import('/src/physics/sessionDriver.ts')`. Under this app's dynamic import
   graph that returns a **second module instance** with its own `driverState`,
   which never sees the engine's session — so every check read a dead duplicate
   and reported "not configured" while the app was driving perfectly well. The
   fix observes `window.__ENGINE__` (a handle the engine publishes on purpose)
   and reads the rendered group positions and the seam's own state, which is
   *more* honest anyway: it measures what the author sees.
2. Passing the sampling closure to `page.evaluate` as a **string** makes
   Playwright evaluate it as an expression and hand back the function object.

### 7e. THE FIRST REAL WASM-TIER RECEIPTS (post-session, on the author's artifact)

After this round's session ended, the author installed emsdk 6.0.10
(`~/Desktop/emsdk`) and built `public/wasm/` from this tree — the first
artifact this branch has ever had locally, since every prior receipt ran the
TypeScript tier. First contact killed two latent dev-tier bugs, both found by
the live receipt:

1. **The dev import 404.** Vite's dev transform wraps dynamic imports in
   `__vite__injectQuery(spec, 'import')`, and its helper passes through only
   specifiers that do NOT start with `.` or `/` — the loader's root-relative
   `'/wasm/cosmos_engine.js'` arrived as `…?import`, which the dev server
   404s for public-dir files (`@vite-ignore` does not shield a bare
   identifier). `loadWasm` now computes an absolute URL at runtime
   (`new URL('/wasm/cosmos_engine.js', window.location.origin).href`) —
   outside the rewrite's contract, resolving identically in prod and Tauri.
2. **HEAPF64 is no longer a module property** in emscripten 4.0+.
   `build-wasm.sh` exported only `ccall`/`cwrap` as runtime methods, so
   `simStates`' first heap read threw and the tier silently fell back to
   TypeScript — the R87 dead-strip lesson, second verse: what the bridge
   touches must be exported by name. The build now pins `HEAPF64` beside
   them. A standalone in-browser probe isolated it cleanly: on the wasm tier
   configure and step both succeeded; only the heap read broke.

With both fixed and the artifact rebuilt, the live receipt runs **ALL GREEN
on the compiled core**: boots DRIVING (crossfade full, readback whole), three
real minutes of true gravity, zero console errors. A unit note for future
probes: the core speaks **scene-units per day** (the driver seeds
`vCircMs × 86400 / METERS_PER_SCENE_UNIT`); feeding it meters and m/s — as
this round's diagnostic first did — yields a correct answer to the wrong
question.

### 7d. The chain

* **Full verify chain green**: typecheck + 19 gauntlets + smoke + prod smoke.
* R91/R92/R93/R94 gauntlets **consciously reconciled** to the evolved contract,
  and **R87's two softening pins updated** from `1e4` to `1e12` — that gauntlet
  asserts the literal constant precisely to keep the C++ core and the TS twin in
  lockstep, so changing the constant *must* change the pin or the law is broken.

## 8. Honest limits

* **The C++ core now runs locally — the author's own build.** On the evening
  of Oct 1 (after this round's session ended) the author installed emsdk
  **6.0.10** to `~/Desktop/emsdk` and produced `public/wasm/` from this very
  tree with `scripts/build-wasm.sh`'s exact flags — a healthy artifact (the
  full `cosmos_*` export surface, the new `1e12` softening inside the binary),
  so the app now drives on the compiled core in dev. CI pins emsdk **3.1.74**
  and remains the canonical receipt — it rebuilds and commits the artifact on
  main pushes and attaches it to releases; MSVC is still absent here, so
  `cargo check` and the release binaries certify there. The §7a probe forces
  the TypeScript tier by design, so its numbers stay TS-tier receipts —
  line-faithful to the C++ core but not the shipped bytes (the live receipt
  in §7c, by contrast, now exercises the author-built WASM tier).
* **5000 sim-days is not forever.** The probe proves the sky holds for roughly
  13.7 years of simulated time with no ejection; it does not prove the
  configuration is stable for a million. Long-horizon behaviour is real chaos
  and Restore Ephemeris remains the one heal.
* **The probe tests the home scope.** Galaxy scopes (the R94 inner systems,
  which seed their own roster with a 10 M☉ companion) are exercised only by the
  gauntlet's source checks, not by the physics probe.
* **Chaos is the point.** Worlds wander off their canon radii over long runs;
  that is real gravity being honest.
* **The canon rings are a lie by construction** for unbound states — the
  osculating rebuild refuses them rather than drawing a fake ellipse.
* **The live watcher measures engine state, not pixels.** It reads rendered
  group positions and the seam's weights through the engine handle — honest
  about what the sky is doing, but it does not diff frames, so the flicker
  claim rests on the crossfade seam plus the frame-loop check, not on image
  comparison.

## 9. Files

| File | Change |
|---|---|
| `src/physics/sessionDriver.ts` | star registry, orbit-true seed, barycentric frame, vault + Hill tempers, moon ornamentation, **the substep law**, 8-day window, seedLaw stamp (3), memory adoption |
| `src/engine/engine.ts` | `setScopeStar`, crossfade seam, living orbit rings, realm hiding, dive hysteresis, engine-side twin refusal |
| `src/platform/native/cosmos_engine.cpp` | softening `1e4` → `1e12` |
| `src/platform/native/cpp_bridge.ts` | TS twin mirroring the softening; `loadWasm` imports the artifact by an absolute runtime URL (the dev `?import` 404) |
| `src/state/actions.ts` | `resetUniverse` forgets the session memory |
| `scripts/round95-steady-sky-gauntlet.ts` | **new** — 25 checks, in the chain |
| `scripts/round95-physics-probe.ts` | **new** — the headless physics receipt (found every real bug) |
| `scripts/round95-steady-sky-live.ts` | **new** — the three-minute browser watcher |
| `scripts/round87-simulator-gauntlet.ts` | the two softening pins `1e4` → `1e12` |
| `scripts/build-wasm.sh` | `HEAPF64` pinned in `EXPORTED_RUNTIME_METHODS` (emscripten 4+ dropped the memory views; found by the first local artifact) |
| `scripts/round9{1,2,3,4}-*.ts` | reconciled to the evolved contract |
| `scripts/architecture-snapshot.json` | refreshed for R95 — the one receipt the session dropped (audit `--check` clean again) |
| `public/wasm/` | the author's own local emsdk 6.0.10 build of the C++ core — the first local artifact, committed with this round; CI (emsdk 3.1.74) re-pins it canonically on main pushes |