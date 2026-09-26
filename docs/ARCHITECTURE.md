# MY UNIVERSE — Architecture Record (R52)

> **Status:** Authoritative. Rewritten at the R52 architecture pass (branch
> `r52-architecture`) — the previous version (Sept 21) had drifted (wrong line
> counts, a phantom `src/server/` path). Round-by-round history lives in
> `docs/ROUND-*.md` and `docs/AUDIT-*.md`; this file documents *what is*.
> Run `npm run audit:arch` for the machine-checked version of §4–§6.

---

## 1. The one diagram

**Open [`docs/architecture-diagram.html`](architecture-diagram.html)** — the interactive skeleton:
every file as a node, grouped into 10 dependency-ordered layer columns, 429 import arcs, sized by
line count. Hover isolates a file's dependencies; drag pans; wheel zooms; the search box filters.
It is **generated** from the auditor's snapshot by `scripts/generate-architecture-diagram.ts`, so
it cannot drift from reality — rerun `npm run audit:arch` + the generator to refresh.

A Mermaid flowchart of the top-34 files by mass lives in
[`architecture-diagram.mmd`](architecture-diagram.mmd) for embedding elsewhere.

```
src/
  main.tsx · App.tsx · index.css      entry point
  domain/                             pure data contracts (universe, vault)
  state/                              store + persist + actions
  platform/                           audio · simClock · performance · storageKeys
                                      · desktop/ · native/ · sky/ · sentiment/ · sync/
  engine/                             three.js cosmos (+ blackhole/, surface/, systems/)
  physics/                            orbital physics + living gravity
  vault/                              the encrypted vault domain
  realities/                          content packs (path-locked)
  ui/                                 every visual component:
                                      vault/ · diary/ · console/ · hud/ · lineage/
                                      reality/ · shared kit (bits, toast, format…)
server/   routes/ + daemon + templates
src-tauri/ desktop shell
```

```
UI (react)           src/ui/*  src/App.tsx
  │  useUniverse() · callbacks · lazy chunks
STATE                src/state/  (observable store + ~60 actions)
  │
DOMAIN               src/domain/  src/realities/  src/vault/
  │
PLATFORM             src/engine/  src/physics/  src/platform/*
SERVER (node)        server/  (Express + reality daemon; dev host on :3000)
DESKTOP (tauri)      src-tauri/  (mirrors the server API in Rust; C++ core via FFI)
```

```

```

**Dependency rules (enforced by review, machine-listed by the auditor):**
- `src/domain/*` and `src/realities/*` never import UI or engine internals (the one
  historical cycle — engine ⇄ realities via surface types — was cut in Phase 3;
  surface content types now live in `src/realities/types.ts`).
- The engine speaks to React **only** through `EngineCallbacks` (engine.ts:56).
- `src/state/` (its `actions`) is the single mutation surface; components never mutate the engine.
- `server/` never imports from `src/` (codegen templates emit text, they don't import).

## 2. The map (one line per module)

| Path | What it is |
|---|---|
| `src/App.tsx` | App shell: engine boot + `EngineCallbacks` wiring, window manager, global keys, lazy chunk loading |
| `src/state/` | Observable store (`useSyncExternalStore`), ~60 actions, debounced persistence (localStorage + Tauri file) |
| `src/domain/` | Domain types for the whole app (`universe.ts`, `vault.ts`; `realities/types.ts` re-exports for generated content — highest inbound count, treat changes as API changes) |
| `src/engine/engine.ts` | `UniverseEngine` — three.js cosmos orchestrator (6.6k lines; R52 register: decompose into systems) |
| `src/engine/blackhole.ts` | Composite (baked) black hole — the infallible fallback tier |
| `src/engine/blackholeRaymarch.ts` | Geodesic raymarched hole (dgreenheck port, R20.4 tuning) — overlay tier |
| `src/engine/blackholeParams.ts` | Live tuning panel store (localStorage `my-universe:blackhole:v1`) |
| `src/engine/cameraRig.ts` | Orbit/pan/zoom rig; `dist = 3 · 800000^zoomT` |
| `src/engine/capability.ts` | GPU probe + quality tier (localStorage `my-universe:quality`) |
| `src/engine/surface/` | Per-reality planet-surface lens/dome renderer |
| `src/engine/systems/` | Level/stage labels, portal phase chain, stage thresholds |
| `src/physics/` | Cached body physics + `LivingGravityField` n-body |
| `src/vault/` | The Vault domain: `storage/` (EFS, crypto, indexedDB, seeds, importers, metrics…), `executors/` (JS/Py/PDF/ISO sandboxes) |
| `src/platform/desktop/adapter.ts` | Web↔Tauri switch: HTTP API paths → Tauri commands; payload/file stores |
| `src/platform/native/cpp_bridge.ts` | C++ core via WASM (`src/platform/native/wasm/`) or Tauri FFI; TS fallback |
| `src/realities/` | **Path-locked** content packs, glob-loaded (`index.ts` per folder) + daemon-generated modules |
| `src/platform/sky`, `src/platform/sync`, `src/platform/sentiment` | Sky-photo registry client, disk-mirror sync queue, mood/aurora signals |
| `src/ui/` | Feature UI: VaultUI (5.5k lines — R52 register: split), DiaryWindow, FileManager, MediaPlates, CoreMode, toast bus |
| `src/ui/console/`, `src/ui/hud/`, `src/ui/lineage/`, `src/ui/reality/` | Console dashboard, HUD overlays, lineage modal, reality editors |
| `server/` | Express: realities CRUD + bin + sky API; `realityDaemon` (3s scan/repair); `realityTemplates` (codegen) |
| `src-tauri/` | Rust shell: `realities.rs` (API mirror), `store.rs` (files), `cosmos.rs` (C++ FFI) |
| `scripts/` | `round16/17-gauntlet.ts` (verification), `audit-architecture.ts` (R52), `smoke.ts` (R52), toolchain helpers |
| `docs/verify/` | Smoke reference frame + bundle baseline |

## 3. Verification (every phase of every wave must pass)

```
npm run verify   =  typecheck (tsc --noEmit)
                 +  round16-gauntlet   (GR lensing math, pure)
                 +  round17-gauntlet   (funnel/photo-lens math + SOURCE-TEXT assertions)
                 +  smoke              (headless: zero console errors + black-hole frame match)
npm run audit:arch   architecture drift report (--snapshot / --check)
```

- **round17 asserts source text** of `engine.ts`, `blackhole.ts`,
  `blackholeRaymarch.ts`, `capability.ts`, `blackholeParams.ts` — refactors
  touching those files must update the gauntlet in the same commit.
- **smoke** boots the app headless (playwright), focuses the Eventide hole,
  pins the camera, pauses, and compares the frame to
  `scripts/verify/reference-hole.png` (16-bin luminance histogram + region
  bands; cross-boot MAE ≈ 0.003). Structural breaks fail loudly.

## 4. Locked paths (changing any of these is a coordinated multi-language edit)

| Lock | Encoded in |
|---|---|
| `src/realities/<folder>/` layout | `import.meta.glob` (realities/index.ts), vite watch-ignore, tsconfig exclude, server cwd joins ×3 files, Rust dev fallback, daemon repair |
| Generated imports `../types` + `../../engine/surface/types` | `server/realityTemplates.ts` (×2), `src-tauri/src/realities.rs` (×2), every disk `surface.ts` |
| `src/platform/native/cosmos_engine.cpp` | `src-tauri/build.rs` (cc compile) |
| `src/platform/native/wasm/` sibling of `cpp_bridge.ts` | `new URL('./wasm/…', import.meta.url)` probe |
| `dist/`, `/fonts/`, `/pyodide/` | tauri.conf `frontendDist`, index.html, pyodide `importScripts(document.baseURI)` |
| Route strings `/api/realities/*` | server routes ⇄ `desktop/adapter.ts` map ⇄ Tauri command names |

## 5. Persistence map

| Store | What |
|---|---|
| `my-universe:v4` (+ `:recovery`) | Universe state (state.ts) |
| `my-universe:quality` (+ `:quality-migrated`) | Render tier |
| `my-universe:blackhole:v1` | Black hole tuning panel |
| `my-universe:muted` | Audio mute |
| `eventide:autolock`, `eventide:comet-burned` | Vault locks, courier one-shot |
| IndexedDB/OPFS | Vault binary payloads |
| Tauri app-data | `universe-state.json` + `payloads/` (desktop) |

## 6. Known debt register (R52 — updated at Phase 4)

1. **`engine.ts` god class** (6.6k lines) — decomposition planned as the last,
   OPTIONAL R52 phase; guarded by the smoke gate. Not yet executed.
2. **`src/state/actions.ts`** (~1,100 lines) — the mutators were kept as one
   file during the state split (behavior-safe); a domain split
   (realities/galaxies/bodies/entries/vault) is follow-up work.
3. **`ui/CoreConsole.tsx`** (1,6k lines) — internal split (CoreBackdrop,
   HolographicRadar, BentoRealityCard, DeepHierarchyExplorer) deferred.
4. **`App.tsx` engine-wiring block** (~250 lines inside the boot effect) —
   extraction needs a 15-callback options object; judged worse than the
   entanglement it removes. Revisit with the engine decomposition.
5. **44 exported-but-unreferenced types** — prune opportunistically; type-only
   deadness needs per-symbol review (structural usage).
6. `docs/ROUND-8`, `docs/ROUND-18` gaps are historical (no docs were written
   for those rounds); `ROUND-20-KEYRING` vs `ROUND-20-BLACKHOLE` were
   disambiguated in R52 Phase 1.

### Delivered by R52 (this branch)
Phases 0–4: verify gate (`npm run verify` = typecheck + gauntlets + headless
smoke), architecture auditor (`npm run audit:arch`), dead-code purge, domain
layer (`src/domain/`), state folder (`src/state/`), platform layer
(`src/platform/` + storage-key registry), engine⇄realities cycle cut
(Generators updated in TS and Rust), `backend/` → `vault/` rename, server
routers (`server/routes/`), UI feature folders (`ui/vault/`, `ui/diary/`).
