# ROUND 97 — THE ENGINE, DIVIDED (2026-10-02)

> The author's follow-on to the R96 tidy-house verdict: "the house is tidy, but
> the engine is still a monolith — divide it for real." This round does exactly
> that. Branch `r97-the-engine-divided`, cut from `r96-the-tidy-house`'s tip.
> Eight independently-green commits; `main` untouched until the author merges.

## 1. THE METHOD (the laws every cut obeyed)

1. **Public API frozen** — `new UniverseEngine(canvas, bodies, {19 callbacks})`
   and all 34 public methods are byte-identical for `App.tsx` and
   `SimulatorTwinCard.tsx`; neither UI file changed.
2. **Verbatim moves by default** — every extracted method body is a byte-identical
   slice of the monolith (most commits extracted with a line-cut `sed`, not by
   retyping). The statics `dayKey`/`streakOf`/`daysOf` rode with the bodies that
   use them (`BodyBuilders`); the engine retains them as the shared engine doorstop
   only where tickFrame still calls them.
3. **Single-owner state** — dive state, galaxy stage nodes, physics toggles and
   the whole view-state family stay ENGINE-owned (the shell's tick, the picker,
   updateBodies, updateLevels and the moved bodies all read them). Subsystems
   reach them through **name-preserving getter/setter pairs** on a private `eng`
   handle, so moved text reads exactly as it did inside `engine.ts` — pins
   included.
4. **The frame order is frozen** — tickFrame keeps its 22-step order exactly;
   the four Kamui/portal segments became `updateKamuiBeats` / `updatePortalHold`
   / `updateStageWarp` / `updatePortalPhases` calls placed in the same positions.
   **`updateBodies` — THE single writer of rendered state — stays in the shell.**
5. **Dispose order frozen** — including the R67/R85 rule that hole visuals are
   released BEFORE the generic scene teardown (`skyFx.dispose()` sits at the same
   position the echo teardown occupied).
6. **Gauntlets read the union** — `engineSource.ts` (commit 0) joins engine.ts
   plus all subsystem modules in a fixed order; absent-tomorrow files read empty,
   so the harness was green before, during and after each extraction. The same
   trick for the state split: `stateSource.ts` joins the barrel + shared + five
   domain modules. No pin was deleted to pass; three pins were consciously
   reconciled (below).

## 2. THE EXTRACTIONS (each = one commit, full chain green before the next)

| Module | Lines | What left the monolith | Receipts |
|---|---|---|---|
| `engine/sky/SkyFxSystem.ts` | 412 | meteors, Cosmic Echo shower, sentiment aurora, planet surface dressing | first cut; the R62 `lens=false` rigid-default count pin passed via a deliberate `lens?` pass-through on the delegate — count stays exactly 2 |
| `engine/blackhole/BlackHoleSystem.ts` | 277 | attach/release, tier switch, the R20/53 breaker, adaptive resolution, camera checkpoint | round63 caught one wrong cut (`bloomHoleBoost` rewired inside two pinned bloom lines); answered ARCHITECTURALLY — the boost is the composer's, it stays engine-owned — not by editing the check |
| `engine/kamui/KamuiPortalSystem.ts` | 594 | the v1 vortex, plain-zoom portal, the R67 summon hold, the R72 staged stage-warp | moved as ONE machine — beats, hold and throat share the pass and the beat clock; one reconciliation (round72's `private stageWarp {` shape pin) |
| `engine/worlds/InnerGalaxySystem.ts` | 816 | a dived galaxy's inner stellar system: build, per-frame life, lifecycle | two round92 union reconciliations: `driverReadback` count 3→4 (each module imports the verb once; still TWO seams), and the negative scan now strips BOTH legitimate seams explicitly (the monolith's lazy strip had accidentally swallowed the inner seam because it sat earlier in the file — the split made the order-dependence visible and fixed it honestly) |
| `engine/worlds/BodyBuilders.ts` | 716 | Anchor Star, the per-body builder, the belt, diary-moon sync, roster sync, orbit-ring rebuilders | one recovery: a mis-bounded multi-range `sed` left `setLevelOpacity`'s tail orphaned; typecheck caught it instantly and the cut was redone check-out → verified single-pass |
| `engine/stages/LevelStageSystem.ts` | 1,990 | the multiverse builder, the level stages, the intro marble, `updateLevels` | behavior extraction — the ~40 stage fields stay engine-owned and the moved bodies reach them through **129 generated getter/setter pairs** typed `UniverseEngine['field']` (no hand-typed drift) |
| **the actions barrel** | actions.ts: 1,275 → 16 | domains: `shared · realities · bodies · entries · vault · portability` | byte-identical slices; `stateSource.ts` keeps round92/84/95 honest with ZERO reconciliations needed |

**Result:** `engine.ts` 6,983 → **2,785** (the shell: constructor, the frozen
22-step tickFrame, `updateBodies` — the one write seam — interaction, the
camera/zoom API, dispose). The engine's rendered shape is unchanged — the smoke
frame-pin (histL1 0.0716) keeps passing on the divided engine.

### The reconciliation ledger (the honest list — R88/R91 precedent)

| Gauntlet | Pin that changed | Why it's still the same invariant |
|---|---|---|
| round17 | `private makePoints(` → `makePoints(` | the L62 rigid-default count pin is the real check; publicizing the engine's factory so the sky subsystem can delegate through it does not alter the enum of upcoming lens-eligible clouds |
| round72 | `private stageWarp {` shape pin → public field on the subsystem | the machine's shape is unchanged; the check now reads the union and finds the identical struct |
| round92 | driverReadback count 3 → 4 | two consumption seams existed in the monolith (home + inner); after the split each module imports the verb once — the pin counts imports+seams and 4 is the union-correct count for the same two seams |
| round92 | the "no driver write outside updateBodies" negative scan now strips both seams | the old lazy regex accidentally swallowed the inner seam too because it sat earlier in the monolith; the split removed that accident and the check is now explicit and honest |

No pinned TEXT was weakened anywhere: the seams, the tick order, the swallow
grammar, the R67 throat handoff, the R72 stage handoff, the R95 crossfade and
trust window are all still byte-identical inside the union.

## 3. THE GATE

Every one of the eight commits ends with the full chain green in its own run:
`npm run verify` (typecheck + 19 union-reading gauntlets + smoke + prod smoke)
+ `audit:arch --snapshot/--check` land in the same commit. Two smoke cold-boot
flakes appeared mid-round (the same R96 note — env timing, not a regression);
both re-ran green immediately and the full chain re-ran green each time. The
final tree's own run is the close-out receipt below.

**THE CLOSE-OUT RUN.** A third flake sighting landed here, and it is worth
recording because its signature is now recognizable. The chained run exited 1
with `SMOKE RED — 38 problems`, but **every** problem was a refused connection
— Vite's HMR socket on **:24678** plus page resources — and the captured frame
was uniformly dark (shadow 0.000 vs 0.290, bright 0.000 vs 0.086). That is the
signature of an app that booted before its module/HMR server finished binding,
not a rendering regression: the shader-compile errors in the log were the
downstream effect of the same failed module fetches, not a shader defect.
Standalone re-run on a clear port: **histL1 0.0716 · shadow 0.289 vs 0.290 ·
mean 0.061 vs 0.075 · bright 0.086 vs 0.086** — the R96 figures to the digit.
The full chain then ran green end to end (**exit 0**: typecheck + 19 gauntlets
all green, `SMOKE GREEN`, `PROD SMOKE GREEN`), and `audit:arch --check` is clean
with no structural drift. The practical rule, now in PROJECT-BRAIN §9: *a red
smoke run whose errors are all `ERR_CONNECTION_REFUSED` and whose frame is flat
dark is the flake — re-run standalone before investigating anything.*

## 4. WHAT DID NOT CHANGE

- `App.tsx`, `SimulatorTwinCard.tsx`, every UI file — the public engine API and
  the `EngineCallbacks` contract are byte-identical.
- `physics/`, `platform/`, `realities/`, `vault/`, `server/`, `src-tauri/` —
  untouched.
- Every shader string, every physics constant, every seed table.
- No gauntlet deleted or weakened; three pins reconciled and logged (§2).
- The R71 container law, the R71.1 slice law, the R86 anti-reduced-motion decree.
- `src/realities/solPrime/sky.json` was left byte-untouched. **Correction (R98):**
  it was never untracked — the author committed it in `3b28c37` alongside the
  Node/Rust backend fixes, and it is tracked today. That is correct and stays:
  the file is not author state. Its contents are exactly the default manifest
  (`version 1`, `activeId: null`, empty `photos`, and the five slider values that
  `server/skyStore.ts:41-46`, `src-tauri/src/sky.rs:65-69` and
  `src/platform/sky/skyRegistry.ts:128` each hardcode), so both backends fall back
  to it when it is absent, and its siblings (`index.ts`, `surface.ts`,
  `data.json`) are all tracked. Only the author's own sky *state* — an uploaded
  photo or a moved slider — is machine-local, and that belongs in `.gitignore`,
  which the Sky Studio route already respects.
