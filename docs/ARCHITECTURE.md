# MY UNIVERSE — Architecture Record

> **Status:** Authoritative. Written at the R52 architecture pass; refreshed at
> R96 (2026-10-02) to the post-v16.0.0 truth — the R91–R95 REAL UNIVERSE arc is
> merged, the sky is driven by the N-body session, and `scripts/` is regrouped
> by purpose. Round-by-round history lives in `docs/ROUND-*.md`; this file
> documents *what is*. Run `npm run audit:arch` for the machine-checked
> version of §3–§7 (150 code files, 383 import edges at this writing).

---

## 1. The one diagram

**Open [`docs/architecture-diagram.html`](architecture-diagram.html)** — the interactive skeleton:
the import graph as nodes, grouped into dependency-ordered layer columns, import arcs, sized by
line count. Hover isolates a file's dependencies; drag pans; wheel zooms; the search box filters.
It is **generated** from the auditor's snapshot by `scripts/tools/generate-architecture-diagram.ts`,
so it cannot drift from reality — rerun `npm run audit:arch --snapshot` + the generator to refresh.

A Mermaid flowchart of the top files by mass lives in
[`architecture-diagram.mmd`](architecture-diagram.mmd) for embedding elsewhere.

```
src/
  main.tsx · App.tsx · index.css      entry point
  domain/                             pure data contracts (universe.ts, vault.ts)
  state/                              store + persist + actions (THE mutation surface)
  platform/                           desktop/adapter · native/ (C++ core + bridge)
                                      · sky/ · sync/ · sentiment/ · storageKeys
  engine/                             three.js cosmos: engine.ts (6.9k orchestrator),
                                      blackhole*.ts, cameraRig, shaders,
                                      surface/ (photo dome, universe surface),
                                      systems/ (kamuiPhases, stageThresholds, levelSystem)
  physics/                            physicsEngine (Kepler + SI) · nbody (Living Gravity)
                                      · sessionDriver (THE N-body session) · simTwin (lab)
  realities/                          path-locked content packs (solPrime/ = canon seed,
                                      bin/ = Quantum Bin) + generators
  vault/                              EFS + crypto + executors (JS/Py/HTML/PDF/ISO/ZIP)
                                      + storage/ (triple-tier persistence)
  ui/                                 every visual component: console/ · diary/ · hud/
                                      · lineage/ · reality/ · vault/ + shared kit
server/     Express dev host + reality disk mirror (web mode only)
src-tauri/  desktop shell: 31 Rust commands + the C++ core compiled in
scripts/    the housekeepers: gauntlets/ (19) · probes/ (4) · tools/ (5) · the gates
```

```
UI (react)           src/ui/*  src/App.tsx
  │  useUniverse() · EngineCallbacks · lazy chunks
STATE                src/state/  (observable store + ~60 actions — the only mutator)
  │
DOMAIN               src/domain/  src/realities/  src/vault/
  │
PLATFORM             src/engine/  src/physics/  src/platform/*
SERVER (node)        server/  (Express + reality daemon; dev host on :3000)
DESKTOP (tauri)      src-tauri/  (mirrors the server API in Rust; C++ core via FFI)
```

**Dependency rules (enforced by review, machine-listed by the auditor):**
- `src/domain/*` and `src/realities/*` never import UI or engine internals
  (the one historical cycle — engine ⇄ realities via surface types — was cut
  in R52; surface content types live in `src/realities/types.ts`).
- The engine speaks to React **only** through `EngineCallbacks`
  (`src/engine/engine.ts:82`); `engine.ts` contains zero imports from `src/state`.
- `src/state/actions.ts` is the single mutation surface; components never mutate
  state directly and never reach into engine internals.
- `server/` never imports from `src/` (codegen templates emit text, they don't import).
- `src/vault/index.ts` is the vault's facade — outside `src/vault/`, import the
  facade, never a deep path.

## 2. The physics tier chain and the real universe (R91–R95)

One C++ core, three tiers, chosen per device at boot by `cpp_bridge.ts`:

```
native C++  cosmos_engine.cpp ── Tauri FFI (src-tauri/src/cosmos.rs)   fastest
WASM        built by scripts/tools/build-wasm.sh → public/wasm/         browser
TypeScript  a line-faithful RK4 twin in cpp_bridge.ts                   fallback
```

The R91 decree made the **N-body session the main driver of the sky**:
**the canon seeds; the session drives; the clockwork is the fallback and the heal.**

- The Kepler `physicsEngine` still seeds every session (canon positions,
  orbit-true speeds √(GM/r), real kg masses) and renders any frame whose
  readback goes stale (the freshness law — an 8-sim-day trust window + crossfade).
- `physics/sessionDriver.ts` owns the session: it steps the integrator on the
  frame clock (the substep law: `simStep(dt / DRIVER_SUBSTEPS, DRIVER_SUBSTEPS)`),
  swaps sessions by camera scope (`activateScope`: home ⇄ `galaxy:${id}`, bounded
  catch-up bursts), leads every roster with the star at index 0, and rides
  memory in `localStorage` under the locked key `my-universe:sim-session:v1`
  (seedLaw-stamped; Restore Ephemeris re-seeds it — the one heal; chaos is real).
- `physics/simTwin.ts` is the READ-ONLY lab (R88) — it must never write rendered
  state (round88 gauntlet); the driver and the twin never run at once.
- Bodies reach the scene through the ONE seam: `updateBodies` feeds driver
  readbacks through the same `b.group.position.set` the Kepler solve always
  used — camera, hover, diaries, the lens all follow for free. The driver moves
  bodies, never the camera (the R71 container law stands).

## 3. The map (one line per module)

| Path | What it is |
|---|---|
| `src/App.tsx` | App shell: engine boot + `EngineCallbacks` wiring, window manager, global keys, lazy chunks |
| `src/state/` | Observable store (`useSyncExternalStore`), ~60 actions, debounced persistence |
| `src/domain/` | Domain types for the whole app (`universe.ts`, `vault.ts` — pure data, no logic) |
| `src/engine/engine.ts` | `UniverseEngine` — the cosmos orchestrator (6,984 lines; the known monster — decomposition is its own planned round) |
| `src/engine/blackholeRaymarch.ts` | Geodesic raymarched hole (verbatim dgreenheck port) — overlay tier |
| `src/engine/blackholeTier.ts` / `blackholeParams.ts` | Tier decision (raymarcher vs the zero-fail composite fallback) / live tuning store |
| `src/engine/cameraRig.ts` / `cameraMemory.ts` | Orbit/pan/zoom rig (`dist = 3 · 800000^zoomT`) / persisted placements |
| `src/engine/capability.ts` | GPU probe + quality tier |
| `src/engine/shaders.ts` + `surface/` | The GLSL library (1,542 lines) / per-reality photo dome + universe surface |
| `src/engine/systems/` | Kamui phase chain, stage thresholds, level system |
| `src/physics/physicsEngine.ts` | Kepler solver, the 41-field solve, SI constants, the 10 M☉ display law |
| `src/physics/nbody.ts` | Living Gravity (Gauss planetary equations) — stands down while the session drives |
| `src/physics/sessionDriver.ts` | THE N-body session driver (863 lines) — see §2 |
| `src/physics/simTwin.ts` | The read-only per-frame twin lab |
| `src/realities/` | **Path-locked** content packs, glob-loaded (`<folder>/index.ts`) + `galaxyGenerator` + Quantum Bin |
| `src/vault/` | EFS (copy-on-write inodes), Argon2id + AES-GCM-256, executors, triple-tier storage (Tauri FS → OPFS → IndexedDB) |
| `src/platform/desktop/adapter.ts` | The single web ⇄ Tauri seam: HTTP paths → Tauri commands |
| `src/platform/native/cpp_bridge.ts` | C++ core via WASM (`public/wasm/`) or Tauri FFI; TS twin fallback |
| `src/platform/sky` · `sync` · `sentiment` | Sky-photo registry client · disk-mirror sync queue · mood/aurora signals |
| `src/ui/` | Feature UI: VaultUI, DiaryWindow, CoreConsole, FileManager, CoreMode, PhysicsHUD, hud/ cards, lineage… |
| `server/` | Express: realities CRUD + bin + sky API; `realityDaemon` (3 s self-healing scan); `realityTemplates` (codegen) |
| `src-tauri/src/` | 1,715 lines, 31 commands: `lib.rs` (shell) · `realities.rs` (daemon port) · `sky.rs` (sky store port) · `store.rs` (persistence) · `cosmos.rs` (C++ FFI) |
| `scripts/` | `gauntlets/` (19, all in verify) · `probes/` (4, hand-run) · `tools/` (5) · `audit-architecture.ts` + `smoke.ts` + `prod-smoke.ts` — see `scripts/README.md` |
| `docs/verify/` | Bundle baseline |

## 4. Verification (every round ends green)

```
npm run verify   =  typecheck (tsc --noEmit)
                 +  19 gauntlets  scripts/gauntlets/round16 … round95-steady-sky
                 +  smoke         (headless boot, zero console errors,
                                   frame match vs scripts/verify/reference-hole.png)
                 +  prod:smoke    (serves the built dist/, asserts the boot again)
npm run audit:arch   architecture drift report (--snapshot / --check)
```

- **Gauntlets assert source text** of the files they guard — a refactor touching
  `engine.ts`, the black-hole files, `kamuiPhases`, the driver, etc. must
  reconcile its gauntlet in the same commit. Gauntlets are never deleted or
  weakened to pass (see `scripts/README.md` §laws).
- **smoke** boots the app headless (playwright), focuses the Eventide hole,
  pins the camera, pauses, and compares the frame to the golden PNG
  (16-bin luminance histogram + region bands). Structural breaks fail loudly.
- **The physics probe** (`scripts/probes/round95-physics-probe.ts`) is the
  honesty gate for the driver: it drives the real `driverTick` headlessly and
  reports detonation/ejection — no regex can tell you whether an integrator is
  stable. It is not in the verify chain; run it when touching physics.
- CI (`.github/workflows/desktop.yml`) runs typecheck + prod:smoke on Linux,
  builds the WASM core (committing the artifact back to `public/wasm/` on main),
  and produces signed desktop installers + the updater manifest on `v*` tags.

## 5. Locked paths (changing any of these is a coordinated multi-language edit)

| Lock | Encoded in |
|---|---|
| `src/realities/<folder>/` layout | `import.meta.glob` (realities/index.ts), vite watch-ignore, tsconfig exclude, server cwd joins ×3 files, Rust dev fallback, daemon repair |
| Generated imports `../types` + `../../engine/surface/types` | `server/realityTemplates.ts` (×2), `src-tauri/src/realities.rs` (×2), every disk `surface.ts` |
| `src/platform/native/cosmos_engine.cpp` | `src-tauri/build.rs` (cc compile) |
| `public/wasm/cosmos_engine.js/.wasm` | `cpp_bridge.ts` (absolute runtime URL import), `scripts/tools/build-wasm.sh` (OUT + export pins), CI (commits the artifact back) |
| `dist/`, `/fonts/`, `/pyodide/` | tauri.conf `frontendDist`, index.html, pyodide `importScripts(document.baseURI)` |
| Route strings `/api/realities/*` ⇄ Tauri commands | server routes ⇄ `desktop/adapter.ts` map ⇄ `src-tauri/src/lib.rs` |
| `localStorage` keys + `window.__*` seams | `src/platform/storageKeys.ts`, the auditor's inventory |
| `my-universe:sim-session:v1` (+ seedLaw stamp) | sessionDriver save/restore, `resetUniverse` (forgets), the R95 law-3 re-seed |

## 6. Persistence map

| Store | What |
|---|---|
| `my-universe:v4` (+ `:v4:recovery`) | Universe state (single source: `STORAGE_KEYS.universeStateRecovery`) |
| `my-universe:sim-session:v1` | The N-body session memory (seedLaw-stamped; adopted/reset by the R95 laws) |
| `my-universe:quality` (+ `:quality-migrated`) | Render tier |
| `my-universe:blackhole:v1` / `:tier:v1` | Black-hole tuning panel / tier |
| `my-universe:camera:v1`, `:muted`, `:hydrate-adopted` | Camera memory, audio mute, the boot-loop guard |
| `eventide:autolock`, `eventide:comet-burned` | Vault locks, courier one-shot |
| IndexedDB/OPFS | Vault binary payloads (encrypted before ANY tier) |
| Tauri app-data | `universe-state.json` + `payloads/` (desktop) |

## 7. Known debt register (conscious, ranked)

1. **`engine.ts` god class** (6,984 lines) — decomposition is planned as its own
   dedicated round with the gauntlets as guardrails. Not executed; do not
   rewrite it wholesale (PROJECT-BRAIN trap #3).
2. **`src/state/actions.ts`** (1,276 lines) — kept as one file for behavior
   safety; a domain split is follow-up work after the engine decomposition.
3. **The UI giants** — `DiaryWindow.tsx` (1,659), `App.tsx` wiring (1,550),
   `keyring.tsx` (1,521), `CoreConsole.tsx` (1,469), `FileManager.tsx` (1,280),
   `MediaPlates.tsx` (1,271) — split candidates, each its own round.
4. **`src/types/`** is vestigial (one `monaco-esm.d.ts` shim left after R52's
   domain split) — fold into `src/` root when convenient.
5. Gauntlet/source-text coupling: source-asserting gauntlets make even comment
   edits in guarded files a reconciled change. Accepted — the pins are the point.

### History
- **R52** (branch `r52-architecture`): the verify gate, the auditor, the dead-code
  purge, the domain/state/platform layers, the engine⇄realities cycle cut,
  `backend/` → `vault/` rename, server routers, UI feature folders.
- **R85–R86**: zero dead exports/imports at the audit's fixed point; the census
  ledger ("looks dead but is gauntlet-pinned").
- **R91–R95** (branch `the-real-universe`, merged as v16.0.0): the session driver
  end-to-end — see §2.
- **R96** (branch `r96-the-tidy-house`): `scripts/` regrouped by purpose; this
  record refreshed; no law, constant, or gauntlet touched.
