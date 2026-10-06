# ROUND 84 — THE ASCENDING NODES (2026-09-30)

> The author's observation: "in the universe the planets are actually rotating — take a
> round of the sun itself, right, in the real universe, in different angles — some
> directly horizontally, some vertically, some with a cone. But in our project everything
> is rotating in the horizontal. Our project is a real universe simulator. This needs to
> be changed and upgraded, especially the logic."
>
> The audit agreed with the symptom and refined the diagnosis: the tilt machinery
> **already existed** (`orbit.incl`, true-3D solver, real solar-system values) — what was
> missing was each orbit's **ascending node Ω** and **periapsis argument ω**. Nine orbits
> tilting about one shared +X node line reads as a slightly-fanned book, not the sky. R84
> adds the missing two elements end-to-end and composes the full plane math everywhere.

## The author's two rulings (pre-plan)

1. **Real physics + exoplanet spice** — Sol-Prime keeps its true measured inclinations
   (a real solar system IS near-coplanar; Earth defines 0°) but gains real nodes;
   newly created worlds get randomized planes with a spiced tail.
2. **The test realities die** — testOne, testWorld, auroraTest and chasinLove were
   declared test data ("not even the real data — delete all of them"). `git rm`; history
   preserves everything, including the Obito sky JPEG
   (`src/realities/testOne/assets/sky-muoc1ce9-1duin.jpg` in history) for the day the
   author builds their real reality.

## What changed

**Step 0 — the test realities deleted.** Four folders removed; nothing in code,
gauntlets or server referenced them; `getReality` already falls back to Sol-Prime
(`realities/index.ts:250`), so stale active-reality pointers boot safely into home.
This also resolves R83's "test realities ship in the product UI" finding.

**Steps 1–2 — the contract and the solver (THE LOGIC).**
`Orbit` gains optional `node?: number` (Ω, radians) and `argP?: number` (ω, radians)
(`src/domain/universe.ts`), defaulted 0 everywhere — every legacy seed, pack and stored
body keeps its exact historical plane with zero migration. The solver's plane math is
now one shared helper, `tiltInPlaneVector` (`physicsEngine.ts`): rotate the in-plane
position by ω (periapsis direction, +X toward +Z), tilt about the ascending-node line
by i (the blessed existing tilt), then carry the node to its azimuth Ω about the star's
pole. At node=0/argP=0 the composition reproduces the old math **bit-for-bit**; the
memo signature invalidates on both. All five engine solve sites, the orbit-line bakes
and the kepler-cache feed thread the elements.

**Step 3 — native parity.** `cosmos_engine.cpp keplerSolve` composes ω/i/Ω identically;
`cosmos_kepler_batch` extends its ABI with `node`/`argP` arrays (null-tolerant);
`cosmos_engine.hpp`, the Rust FFI (real + stub in `cosmos.rs`), the Tauri command
(`lib.rs` — serde-defaulted, older callers tolerated) and `cpp_bridge.ts` (input type,
invoke args, wasm ccall, TS fallback + its `keplerPositionTS` mirror) all speak the
same elements. `cosmos_orbit_position` keeps its ABI and passes 0/0 (R83: it has no
live callers).

**Step 4 — Sol-Prime wears the real sky.** The authoritative seed (`vault/storage/
seeds.ts`), the RealityConfig twin (`solPrime/index.ts`) and the disk mirror
(`solPrime/data.json`) now carry the real J2000 elements — JPL "Approximate Positions
of the Planets" Table 1, ω = ϖ − Ω, verified against the source during the round:
Cinder Ω=48.33076593°/ω=29.12703035° (Mercury), Veil 76.67984255/54.92262463 (Venus),
Aurelia 0/102.93768193 (Earth: i=0 makes Ω degenerate, so argP carries the real
longitude of perihelion), Rust 49.55953891/286.49683150 (Mars), Goliath
100.47390909/274.25457074 (Jupiter), Mirror 74.01692503/96.93735127 (Uranus), Hollow
110.30393684/113.76497945 (Pluto), Wisp 250/35 and Eventide 200/80 (no real analogues —
distinct crossings of their own; the retrograde vault now visibly crosses opposite the
planets). The BODY_PROFILES axial-tilt table is untouched — those are spin-axis laws.

**Step 5 — the exoplanet spice.** One shared helper, `inclinedOrbitElements`
(`galaxyGenerator.ts`): mostly the caller's gentle coplanar band, ~15% steep (30–60°),
~5% near-polar (80–95°, the WASP-79b cone worlds), random sign, and node/argP scattered
around the full circle. Wired into every codegen site: new-reality factory
(`realities/index.ts`, band 0.18), user `addBody` (`actions.ts`, band 0.24-band 0.4),
foreign stellar systems (galaxyGenerator, band 0.24), the server's codegen template, and
both auto-vault paths (fixed incl preserved, node/argP randomized).

**Step 6 — moons.** Every diary moon gains its own `node` (deterministic from the entry
index + planet id) alongside its existing incl; both per-frame moon sites (home + inner
systems) now ride `tiltInPlaneVector`, preserving the decorative 0.7× bob exactly.

**Step 7 — Living Gravity.** `GravityNode` carries canonical node/argP; sync passes
them; the velocity-derivative uses the full composition; and `perturbedPosition` folds
the integrated Δω into `argP` and Δi into the inclination — which makes the apsidal
precession **exactly** in-plane for any node azimuth (the old post-solve about-Y
rotation was only exact for node-at-+X). Fences untouched.

**Step 8 — the star's wobble.** The barycentric wobble now points each tug along the
tugging world's real plane geometry via the shared helper.

**Step 9 — the other flat sheet.** Both asteroid belts (home + inner systems) get
per-speck inclination (gaussian σ≈6°) — dust and rocks alike — turning the flat annulus
into a toroidal belt. `makePoints` signatures untouched (the R62 gauntlet tripwire).

**Out of scope (explicit):** the multiverse layer's `orbitIncl` ellipses (already
varied, own UI slider), the black-hole disk, the zoom slices, new dependencies.

## Invariants and verification

- New `scripts/round84-inclination-gauntlet.ts` (21 source-text checks: contract,
  solver composition, C++/hpp/Rust/bridge parity, the J2000 pins, the spice law, moon
  nodes, wobble, N-body, belts, call sites, README) — **ALL GREEN**, wired into
  `npm run verify`.
- Typecheck clean; full verify run recorded in §8 of the brain.
- README reconciled in the same round: §4.3 interface, §6.1 roster (+node/ω column,
  degrees, JPL citation), §7.1 eventide + auto-vault. No pinned value erased — the
  columns extend, the old numbers stay.
- The smoke reference frame **held** — no re-pin needed. The golden capture is the
  hole-focused view (Eventide's own plane changed, but the capture polls until the
  hole's bright band lands center-frame), and the tilted planets stay outside its
  bands: final runs measured histL1 0.066–0.074 (max 0.12), shadow 0.289 vs 0.290,
  mean 0.062 vs 0.075, bright 0.086 exact. One mid-round RED was diagnosed as a
  cold-boot capture flake (a black frame — the shot landed before the settle logic
  found the hole, on the first boot of a freshly spawned dev server); it never
  reproduced in isolation or in the final full-chain run.

## The author's view, after

At the home system the nine orbit rings now cross the ecliptic at nine different
places — Cinder steep and quick near Mercury's line, Hollow thrown wide on Pluto's,
the retrograde vault sliding under the plane on the far side. Created worlds lean with
the exoplanet tail; some near-vertical cones; the belt has depth. The flat sheet is
gone; the sky is real.
