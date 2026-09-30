# 🌌 MY UNIVERSE — THE RESURRECTION BLUEPRINT

> **Document Type:** Complete Reconstruction Specification — the single file from which the
> entire project can be rebuilt **from absolute zero, with zero difference**. The graphics
> soul — every GLSL shader and both black-hole renderers — is embedded **verbatim** in
> Appendix A.
> **Target Audience:** AI coding agents · senior developers · newbies · the original author
> after a disaster. No other document is required. If only this file survives, the universe
> survives.
> **Status:** Authoritative Master Document (Single Source of Truth). All numbers below were
> verified against the source code on 2026-09-26.

---

## 📑 TABLE OF CONTENTS

0. [The Reconstruction Contract — READ FIRST](#0-the-reconstruction-contract--read-first)
1. [Product Vision & Core Philosophy](#1-product-vision--core-philosophy)
2. [Technology Stack (Exact Versions)](#2-technology-stack-exact-versions)
3. [Repository Topology (Accurate, Post-R52)](#3-repository-topology-accurate-post-r52)
4. [Architecture Laws, Data Model & Persistence](#4-architecture-laws-data-model--persistence)
5. [PILLAR I — THE ANCHOR STAR](#5-pillar-i--the-anchor-star)
6. [PILLAR II — THE WORLDS (Planets, Diary & Generation)](#6-pillar-ii--the-worlds-planets-diary--generation)
7. [PILLAR III — THE BLACK HOLE (Eventide)](#7-pillar-iii--the-black-hole-eventide)
8. [The Multiverse & Realities](#8-the-multiverse--realities)
9. [The Vault & Eventide Filesystem (EFS)](#9-the-vault--eventide-filesystem-efs)
10. [Engine Mechanics & Physics Reference](#10-engine-mechanics--physics-reference)
11. [Server & Desktop Contract](#11-server--desktop-contract)
12. [⭐ PHASE-BY-PHASE REBUILD PROTOCOL (Phase 0–11)](#12--phase-by-phase-rebuild-protocol-phase-011)
13. [Verification, Acceptance & Glossary](#13-verification-acceptance--glossary)
14. [APPENDIX A — THE COSMIC GRAPHICS CODE (VERBATIM)](#appendix-a--the-cosmic-graphics-code-verbatim)

---

## 0. THE RECONSTRUCTION CONTRACT — READ FIRST

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   🤖 DIRECTIVE TO FUTURE ARTIFICIAL INTELLIGENCES & COGNITIVE RECONSTRUCTION ENGINES  ║
║                                                                                       ║
║   If you are reading this because the codebase is fragmented, corrupted, or lost —    ║
║   DO NOT PANIC. This file contains everything: the architecture, the exact creative   ║
║   DNA (seed data, palettes, orbits, physics constants, shader parameters), and a      ║
║   phase-by-phase build protocol. Rebuild in the order of Section 12. Verify each      ║
║   phase with its acceptance criteria before moving on.                                ║
║                                                                                       ║
║   THE THREE SACRED PILLARS — if the rebuild achieves nothing else, these three must   ║
║   be recreated exactly. They are the soul of this project:                            ║
║                                                                                       ║
║     PILLAR I   — THE ANCHOR STAR ............... Section 5  (each reality's sun)      ║
║     PILLAR II  — THE WORLDS .................... Section 6  (planets = memories)      ║
║     PILLAR III — THE BLACK HOLE (Eventide) ..... Section 7  (the vault gateway)       ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

### 0.1 Fidelity rules — what is LAW vs. what is free

| Tier | Meaning | Examples |
| :--- | :--- | :--- |
| **LAW (zero-difference)** | Values, names, formulas, structures that MUST match exactly. If you change these, the rebuild has failed. | Every seed table in §5–§8, all physics constants (§10.1), black-hole reference parameters (§7.6), localStorage keys (§4.4), route/command string contracts (§11), architecture laws (§4.1), locked paths (§4.2). |
| **STRONG RECOMMENDATION** | Techniques and patterns that make the rebuild feel identical. Deviate only with a written reason. | Shader techniques (granulation, corona, geodesic bending), the 9-phase portal machine, the Kepler-cache cadence, the bento console layout. |
| **FREE** | Cosmetic latitude that does not touch identity. | Icon choices inside buttons, exact Tailwind class spelling, source-file internal line breaks, comment style. |

### 0.2 How to read this document

- **Sections 1–4** = the skeleton (what and where).
- **Sections 5–11** = the logic and the exact creative DNA (how it works, with every law-level number inline).
- **Section 12** = the step-by-step, phase-by-phase goals to build it all again from zero.
- **Section 13** = how to prove the rebuild succeeded.

---

## 1. PRODUCT VISION & CORE PHILOSOPHY

### 1.1 What this is

**MY UNIVERSE** (aka *Chasin-Love World*) is an offline-first **personal cosmos**: a real-time
3D universe where life data is embodied as celestial bodies.

- **Planets and stars are not decorations** — they are the physical manifestations of memories,
  dreams, relationships, projects, and unresolved questions. Each planet hosts a **living diary**;
  every diary entry becomes a **moon** orbiting that planet.
- **The Anchor Star** is each reality's sun — the luminous core of conscious focus whose
  thermal output, convection, and corona govern the whole system.
- **The Eventide Black Hole** is the gateway to the **Universal Vault** — an encrypted,
  copy-on-write filesystem with a code editor, terminal, and sandboxed runtimes, sealed behind
  Argon2id + AES-GCM-256.
- **The Multiverse** holds parallel realities as glass marbles in a navigable void; a deleted
  reality collapses into the **Quantum Bin** (a real recycle bin on disk), never abruptly destroyed.

### 1.2 The thesis: Attention as gravity

Files, notes, and records are normally static rows in cold rectangular folders. MY UNIVERSE
subverts that: *attention is gravity — what you look upon begins to orbit you.* The diary you
write fattens a moon; the mood you tag feeds the star's aurora; the vault you seal beats inside
a black hole. The union of cosmos and chronicle is sacred.

### 1.3 Architectural tenets

1. **Client-side sovereignty (no phantom backends).** Offline-first SPA. NEVER introduce external
   database servers, REST microservice dependencies, or cloud auth. The Express server is a dev
   host + disk mirror for `src/realities/` folders only; the desktop app replaces it with Tauri
   commands. Authoritative state is browser-local.
2. **Local-first computation.** Astrophysics, WebGL, key derivation, encryption, ISO/Python
   execution — all client-side.
3. **Mathematical grounding.** True Keplerian ellipses + vis-viva velocities, Stefan–Boltzmann
   temperatures, Roche tidal limits, general-relativistic time dilation. Not fake numbers.
4. **Zero-fail composite rendering.** The black hole must never fail on any GPU stack: a
   deterministic composite always exists beneath the cinematic raymarched tier, with automatic
   disarm + fallback (§7.5).
5. **Celestial metaphor integrity.** Every body carries human meaning (`Meaning` enum). This
   union is sacred — do not decouple diary from planet or vault from singularity.

---

## 2. TECHNOLOGY STACK (EXACT VERSIONS)

| Domain | Technology | Version | Role / Notes |
| :--- | :--- | :--- | :--- |
| UI framework | React + ReactDOM | ^18.2.0 | Reactive UI, floating window manager |
| Language | TypeScript (STRICT) | ^5.9.3 | `tsc --noEmit` is the type law |
| Bundler / dev | Vite + @vitejs/plugin-react | ^6.3.5 / ^4.3.4 | 8 GB max-old-space on build |
| Styling | Tailwind CSS + @tailwindcss/vite | ^4.1.7 | v4 `@theme` tokens, glassmorphism |
| **3D engine** | **Three.js — raw, NO react-three-fiber** | **^0.185.1** | Custom GLSL in `src/engine/shaders.ts` |
| UI animation | framer-motion | ^11.16.1 | imported as `framer-motion` (NOT `motion/react`) |
| State | **Custom observable store** (`src/state/`) | — | `useSyncExternalStore` + ~60 actions. NO zustand/redux/redux-toolkit |
| Editor | monaco-editor + @monaco-editor/react | ^0.56.0 / ^4.7.0 | Vendored ESM alias, CDN-free, manualChunks split |
| Server | Express | ^5.2.1 | Dev host + reality disk mirror (see §11) |
| Desktop | Tauri (@tauri-apps/api, -cli) | ^2.11.1 / ^2.11.4 | Rust shell; C++ core compiled in (§11.3) |
| Crypto | WebCrypto + hash-wasm | — | Argon2id (hash-wasm) + AES-GCM-256 (§9.2) |
| Python runtime | Pyodide (vendored in `public/pyodide/`) | v0.26.x | Offline CPython in a worker; 10 MB wasm committed |
| Testing | Playwright | ^1.63.0 | Headless smoke + reference-frame match |
| Icons | lucide-react | ^0.294.0 | HUD/UI icons |
| Diary export | jspdf + html-to-image | ^4.2.1 | PDF/MD/HTML/JSON export |
| Hashing | hash-wasm | — | SHA-256 payload checksums (EFS dedup) |

**package.json scripts (the complete set):**

```bash
npm run dev            # tsx server/index.ts — dev cosmos on http://localhost:3000
npm run build          # vite build (8GB heap) + esbuild server -> dist/server.cjs
npm run start          # node dist/server.cjs (production)
npm run serve          # rebuild server bundle + run
npm run typecheck      # tsc --noEmit   (alias: npm run lint)
npm run audit:arch     # architecture auditor (structural drift check, §13.1)
npm run smoke          # headless playwright check vs reference frame
npm run verify         # typecheck + round16-gauntlet + round17-gauntlet + smoke  ← THE gate
npm run desktop:dev    # tauri dev
npm run desktop:build  # tauri build (C++ core compiles in; NSIS/deb/AppImage)
npm run desktop:check  # cargo check
```

CI: `.github/workflows/desktop.yml` — windows-latest (NSIS) + ubuntu-latest (deb/AppImage),
`npm install → typecheck → desktop:build` (CI machines have a real C++ toolchain, so released
binaries ship the genuine native core).

---

## 3. REPOSITORY TOPOLOGY (ACCURATE, POST-R52)

```
├── index.html                  # HTML entry, vendored fonts, div#root
├── package.json                # deps + scripts (exact list in §2)
├── vite.config.js              # React plugin, Tailwind v4, monaco manualChunks
├── tsconfig.json               # strict TS over src/ + server/ + scripts/
├── note.txt                    # friendly folder guide (also scanned by the auditor)
│
├── server/                     # Node side — dev host + reality disk mirror
│   ├── index.ts                # Express 5, Vite middleware in dev, dist/ in prod, :3000
│   ├── realityDaemon.ts        # 3s scan & auto-repair of reality folders, bin ops (463 ln)
│   ├── realityTemplates.ts     # codegen templates for reality/surface modules
│   ├── paths.ts                # folder-name sanitize + containment asserts
│   ├── skyStore.ts             # Sky Studio uploads store
│   └── routes/
│       ├── realities.ts        # 11 routes: folders, bin ops, rename/create/delete, write-data, daemon-status
│       └── sky.ts              # 6 routes: sky status/upload/activate/delete/settings/asset
│
├── src-tauri/                  # Desktop shell (Tauri 2, Linux + Windows)
│   ├── build.rs                # probes cl/g++/c++/clang++ → cc crate compiles the C++ core
│   ├── src/
│   │   ├── lib.rs              # ~27 #[tauri::command]s (cosmos_*, store_*, reality_*, sky_*)
│   │   ├── cosmos.rs           # extern "C" FFI bindings to the C++ core (+ stubs)
│   │   ├── realities.rs        # reality API mirror + codegen
│   │   ├── store.rs, sky.rs, main.rs
│   ├── Cargo.toml              # cc build-dependency; LTO + opt-level 3
│   ├── tauri.conf.json         # app id com.chasinlove.myuniverse, CSP wasm-unsafe-eval
│   └── capabilities/default.json
│
├── public/                     # vendored offline assets
│   ├── pyodide/                # pyodide.js, pyodide.asm.wasm (~10MB), python_stdlib.zip, lock
│   └── fonts/                  # Space Grotesk, Space Mono, Unbounded (woff2) + fonts.css
│
├── scripts/
│   ├── audit-architecture.ts   # R52 architecture auditor (dead exports/types/CSS, import
│   │                           #   graph, 9 locked-path groups; --snapshot / --check)
│   ├── architecture-snapshot.json  # frozen baseline (126 files, 431 import edges, 9 locks)
│   ├── generate-architecture-diagram.ts  # regenerates docs/architecture-diagram.{html,mmd}
│   ├── round16-gauntlet.ts     # asserts Schwarzschild-optics source invariants
│   ├── round17-gauntlet.ts     # asserts spacetime-funnel source invariants
│   ├── smoke.ts                # playwright headless run vs scripts/verify/reference-hole.png
│   ├── build-wasm.sh           # em++ build of the C++ core to src/platform/native/wasm/
│   ├── setup-windows-toolchain.ps1  # installs VS Build Tools 2022 + Rust (one command)
│   ├── make-icons.mjs          # icon generation
│   └── verify/                 # reference-hole.png, reference-metrics.json, diagram-check.png
│
├── docs/
│   ├── ARCHITECTURE.md         # accurate sector audit (R52) — layers, map, verification, debt
│   ├── architecture-diagram.html/.mmd  # generated (never hand-edit)
│   ├── ROUND-*.md              # 14 historical build reports (7,9,10,11,12,13,14,15,16,17,19,20-BLACKHOLE,20-KEYRING,21)
│   ├── AUDIT-*.md, DEEP-RESEARCH, COMPETITIVE-RESEARCH, KAMUI-*  # research corpus
│   └── kamui-visuals/          # visual storyboarding assets
│
└── src/                        # 127 files — the app
    ├── main.tsx                # React 18 bootstrap
    ├── App.tsx                 # 1,353 ln: engine boot, modes ('space'|'core'|'vault'),
    │                           #   keyboard map, callback wiring, window manager
    ├── index.css               # theme tokens, scanlines, glass styles
    │
    ├── domain/                 # PURE DATA CONTRACTS (no logic)
    │   ├── universe.ts         # BodyKind, Meaning, Palette, Orbit, CosmicBody, DiaryEntry,
    │   │                       #   Attachment, RealityBucket, UniverseState
    │   └── vault.ts            # VaultFile, VfsNode, VfsShadow, EFS types
    │
    ├── state/                  # THE single mutation surface
    │   ├── store.ts            # 147 ln observable store (useSyncExternalStore), bucket derivation
    │   ├── actions.ts          # ~1,100 ln — every mutation (create/warp/delete reality,
    │   │                       #   bodies, connections, vault ops, bin, lensing toggles)
    │   ├── persist.ts          # debounced snapshot -> localStorage my-universe:v4 (+recovery)
    │   └── index.ts
    │
    ├── platform/               # non-UI platform services
    │   ├── native/             # THE C++ CORE + bridge
    │   │   ├── cosmos_engine.cpp/.hpp  # 490 ln C++20 core (Kepler/physics/benchmark kernels)
    │   │   ├── cpp_bridge.ts   # tier chain: native-cpp → wasm → typescript (§11.4)
    │   │   ├── main.cpp, CMakeLists.txt  # standalone .so/.dll builds
    │   │   └── wasm/           # optional Emscripten artifact target (probed at runtime)
    │   ├── desktop/adapter.ts  # single web↔Tauri seam (fetch or invoke)
    │   ├── sync/realitySync.ts # disk-mirror heartbeat client (3s/8s/20s)
    │   ├── sky/skyRegistry.ts  # Sky Studio registry
    │   ├── sentiment/sentiment.ts  # diary mood → aurora spectrum
    │   ├── audio.ts, performance.ts, simClock.ts, storageKeys.ts
    │
    ├── engine/                 # Three.js cosmos (NO React inside — see §4.1)
    │   ├── engine.ts           # 6,667 ln orchestrator: scene, loop, picking, LOD, portals
    │   ├── blackhole.ts        # composite Gargantua hole + spacetime funnel
    │   ├── blackholeRaymarch.ts# geodesic raymarched tier (dgreenheck port, §7.3)
    │   ├── blackholeParams.ts  # Black Hole Studio store (§7.6)
    │   ├── cameraRig.ts        # logarithmic camera controller, drag inertia
    │   ├── capability.ts       # GPU probe, quality tiers, raymarch permission
    │   ├── math.ts, shaders.ts # shared math + master GLSL library
    │   ├── systems/            # portalPhases.ts (9-phase machine), stageThresholds, levelSystem
    │   └── surface/            # Universe Surface: dome 460,000u, star shells, lens bending
    │
    ├── physics/
    │   ├── physicsEngine.ts    # CONSTANTS, BODY_PROFILES, 41-field solve, Kepler solver
    │   └── nbody.ts            # LivingGravityField — Gauss planetary equations, THE KEEPER
    │
    ├── realities/              # path-locked content packs (import.meta.glob './*/index.ts')
    │   ├── index.ts            # registry, buildRealityConfig enforcement, createNewRealityConfig
    │   ├── types.ts, hierarchyTypes.ts, hierarchyStages.ts (11 stages + dials)
    │   ├── clusterGenerator.ts, galaxyGenerator.ts
    │   ├── solPrime/           # CANONICAL home reality (literal seed, §6.1) + surface.ts + sky.json
    │   ├── auroraTest/ chasinLove/ testOne/ testWorld/   # user-created reality snapshots
    │   └── bin/                # Quantum Bin (deleted realities + orphan adoption) + README.md
    │
    ├── vault/                  # encrypted vault domain
    │   ├── storage/            # efs.ts (CoW fs), crypto.ts (Argon2id/AES-GCM), indexedDB.ts
    │   │                       #   (triple-tier), seeds.ts, importers.ts, metrics.ts, zip.ts,
    │   │                       #   procedural.ts, sanitizeHtml.ts, formatters.ts,
    │   │                       #   totp.ts, courier.ts, breaches.ts (Key Ring)
    │   ├── executors/          # index.ts (JS/Pyodide/PDF/HTML sandbox), isoExecutor.ts (ISO 9660)
    │   └── types.ts            # runner contracts
    │
    ├── ui/                     # ALL React surfaces (44 files)
    │   ├── console/            # CoreConsole.tsx (1.6k ln bento deck: Command Matrix / Realities
    │   │                       #   Grid / Deep Hierarchy / Quantum Bin), CommandPalette.tsx,
    │   │                       #   CppNativeEngineCard.tsx, BlackHoleTuningCard.tsx, QuantumBinTab.tsx
    │   ├── hud/                # MultiverseBar, CosmicWebHUD, hover cards, GalaxyRoster
    │   ├── lineage/            # CosmicLineageModal, ThinkingCloudTooltip
    │   ├── reality/            # create/edit reality modals, advanced panel (aura presets)
    │   ├── vault/              # MonacoCodeEditor.tsx, monacoSetup.ts, viewers.tsx, shell,
    │   │                       #   gate, sandbox, void, keyring (inside VaultUI)
    │   ├── diary/              # diary windows + export
    │   ├── VaultUI.tsx (545 ln), FileManager.tsx, DiaryWindow.tsx, CoreMode.tsx,
    │   ├── PhysicsHUD.tsx, bits.tsx (ToastHost), toast.ts, lib.ts, format.ts, syntax.ts
    │
    └── types/                  # monaco-esm.d.ts only
```

**File counts:** `src/` 127 · `server/` 7 · `src-tauri/` 14 · `scripts/` 12 · `docs/` 47 · `public/` 19.

---

## 4. ARCHITECTURE LAWS, DATA MODEL & PERSISTENCE

### 4.1 The layer laws (violation = rebuild failure)

1. **Engine ⇄ React communicate ONLY through `EngineCallbacks`** (one typed interface,
   `src/engine/engine.ts` header comment). The engine never imports React; React never reaches
   into engine internals. The engine exposes imperative methods (`enterCoreMode()`, `focusOn(id)`,
   `setSpacetimeLens(b)`, `zoomToHierarchy(stage)`, `triggerKamui()`, …).
2. **`src/state/` is the single mutation surface.** Components never mutate state directly —
   only actions in `src/state/actions.ts`. The store publishes derived snapshots: the app only
   ever *sees* the active reality's bodies/entries/connections/vault.
3. **`server/` never imports `src/`.** The server owns the disk mirror; the browser owns truth.
4. **Domain contracts are pure.** `src/domain/` holds interfaces only.
5. **Generated docs are never hand-edited** (`docs/architecture-diagram.*` regenerate via
   `scripts/generate-architecture-diagram.ts` from the auditor snapshot).
6. **Route strings and Tauri command names are a locked contract** between
   `server/routes/*.ts` ⇄ `src/platform/desktop/adapter.ts` ⇄ `src-tauri/src/lib.rs`.

### 4.2 Locked paths (enforced by `scripts/audit-architecture.ts --check`, 9 groups)

1. `src/realities/*/index.ts` — discovered via `import.meta.glob('./*/index.ts')`.
2. Generated-code imports (Pyodide/Monaco vendored paths).
3. Disk surface imports (`surface.ts` per reality).
4. Native build path — `src-tauri/build.rs` compiles exactly
   `src/platform/native/cosmos_engine.cpp`, anchored on `CARGO_MANIFEST_DIR`
   (never CWD-relative — the old `../../src/...` resolved outside the repo and
   broke every CI build with a real C++ toolchain).
5. Gauntlet read targets — `scripts/round16-gauntlet.ts` / `round17-gauntlet.ts` assert source
   text of specific engine files.
6. Public roots — `public/pyodide/`, `public/fonts/` are vendored and committed.
7. Route ↔ command string pairs (web fetch ⇄ Tauri invoke).
8. localStorage key literals — all live in `src/platform/storageKeys.ts`.
9. `window.__*` seams — `__TAURI_INTERNALS__` probe, custom events.

If `npm run audit:arch` reports drift vs `scripts/architecture-snapshot.json`, fix the structure
or consciously re-snapshot. Do not ignore it.

### 4.3 Core data model (recreate verbatim)

```typescript
// src/domain/universe.ts
export type BodyKind = 'star' | 'planet' | 'dwarf' | 'nebula' | 'hole' | 'vault';
export type Meaning = 'memory' | 'dream' | 'person' | 'project' | 'moment' | 'idea'
                    | 'chapter' | 'unresolved' | null;                     // 8 values + null
export type Mood    = 'calm' | 'warm' | 'bright' | 'heavy' | 'burning';
export type Weather = 'clear' | 'rain' | 'storm' | 'fog' | 'dust';
// MEANINGS — the celestial metaphor registry (id → desc → color), recreate verbatim:
//   memory 'something that happened and stays' #7fc4e8 · dream 'a night-logic, unverified' #b49ae8
//   person 'someone this world is about' #f2a0b0 · project 'work in motion' #f2c178
//   moment 'brief, bright, gone' #e0785a · idea 'a seed, not yet a planet' #9fd8a8
//   chapter 'an era of the life' #d8b48a · unresolved 'still falling inward' #8b93a8
export interface Palette { deep: string; base: string; high: string; atmo: string; ice: string; }
export interface Orbit  { a: number; speed: number; phase: number; incl: number; node?: number; argP?: number; } // a in scene units (52 = 1 AU); R84: node Ω = ascending-node azimuth (rad), argP ω = periapsis angle (rad) — absent/0 = the historical node-at-+X plane
export interface CosmicBody {
  id: string; name: string; kind: BodyKind; meaning: Meaning;
  note: string; createdAt: number; radius: number;
  rings?: boolean; clouds?: boolean; nightside?: boolean;
  palette: Palette; orbit: Orbit;
}
export interface Connection { id: string; a: string; b: string; createdAt: number; }
export interface DiaryEntry {
  id: string; planetId: string; title: string; body: string;
  tags: string[]; bookmarked: boolean; archived: boolean;
  mood?: string; weather?: string;
  createdAt: number; updatedAt: number; attachments: Attachment[];
}
export interface RealityBucket {
  bodies: CosmicBody[]; entries: DiaryEntry[]; connections: [string, string][];
  vault: VaultFile[]; vaultTrash: VaultFile[]; efs: EfsState;
}
export interface UniverseState {
  activeRealityId: string;                    // 'sol-prime' by default
  realities: Record<string, RealityBucket>;   // per-reality world databases
  realityFolders?: Record<string, string>;    // realityId → disk folder name
  deletedRealityIds / binRealities: ...;      // Quantum Bin (config + folderName)
  customGalaxies, customRealityMeta: ...;
  spacetimeLensing?: boolean;                 // absent = ON (Einstein lensing)
  livingGravity?: boolean;                    // absent = ON
  diskSync: { connected, lastSyncTime, scanCount, activeFolders, binDetails,
              operationsLog, pendingOps, lastError };
  audit: { t: number; msg: string }[];        // the console's Live Chronicle
}

// src/realities/types.ts
export interface RealityConfig {
  id: string; name: string; codeName: string; spectral: string; description: string;
  bubblePos: [number, number, number]; bubbleSize: number;
  colorA: string; colorB: string; starColor: string;   // starColor = anchor star aura
  bodies: CosmicBody[]; entries: DiaryEntry[];
  clusters?: GalaxyClusterData[]; galaxies?: GalaxyData[];
  galaxyCountHint?: number; homeLineage?: CosmicLineage;
}
```

### 4.4 Persistence map (every store, exact)

| What | Where | Key / Name |
| :--- | :--- | :--- |
| Universe snapshot (debounced) | localStorage | `my-universe:v4` |
| Quota-failure backup | localStorage | `my-universe:v4:recovery` |
| Render quality tier | localStorage | `my-universe:quality` (+ migration guard `my-universe:quality-migrated`) |
| Black Hole Studio tuning | localStorage | `my-universe:blackhole:v1` |
| Audio mute | localStorage | `my-universe:muted` |
| Vault auto-lock minutes | localStorage | `eventide:autolock` |
| Comet courier one-shot | localStorage | `eventide:comet-burned` |
| Vault payload bytes | IndexedDB → OPFS | DB `eventide-universe`, store `payloads`; OPFS file handles first, IndexedDB fallback; **bytes encrypted before ANY tier** |
| Reality disk mirror | filesystem | `src/realities/<folder>/data.json` (+ `index.ts`, `surface.ts`, `sky.json`, `assets/`); bin: `src/realities/bin/` |
| Desktop state payloads | Tauri app-data | via `store_state` / `store_payload` commands |

All localStorage literals live in `src/platform/storageKeys.ts` (the auditor cross-checks new
literals against it).

---

## 5. PILLAR I — THE ANCHOR STAR

> The thermodynamic and gravitational heart of every reality's system. One per reality, always
> `bodies[0]`, always id `'anchor'`, always kind `'star'`, undeletable. Double-click it to enter
> Core Mode.

### 5.1 The canonical seed (Sol-Prime's star — `src/realities/solPrime/index.ts:31`)

```typescript
{
  id: 'anchor', name: 'ANCHOR STAR', kind: 'star', meaning: null,
  note: 'The stabilizing core of Sol-Prime. Double-click to enter Core Mode.',
  createdAt: now - 980 * day,               // the oldest object in the universe
  radius: 6,
  palette: { deep: '#5a2a08', base: '#ffb54d', high: '#fff3d9', atmo: '#ffd9a0', ice: '#ffffff' },
  orbit: { a: 0, speed: 0, phase: 0, incl: 0 },   // pinned to the barycenter; all orbital physics = 0
}
```

### 5.2 Enforcement (the star cannot be lost or faked)

- `buildRealityConfig` (`src/realities/index.ts`) **always rewrites `bodies[0]`** into
  `id:'anchor', kind:'star'`, suffixes the reality name + "ANCHOR STAR" for generated realities
  (`{NAME} ANCHOR STAR`, radius 4.8, meaning 'chapter', deep palette `#0f172a`), and sets the note
  "The Anchor Star — central gravitational & physical regulator of this reality stellar system."
- `actions.removeBody` returns early for ids `'anchor'` and `'eventide'` — they cannot be dissolved.
- The World Editor hides the dissolve button for the anchor and shows:
  "Protected Celestial Body — The Anchor Star regulates this continuum — it cannot be dissolved."
- If an imported/snapshot state ever loses the anchor, `actions.ts` re-`unshift`s it automatically
  (mirrored in `src/vault/storage/seeds.ts` fallback seed).

### 5.3 Physics of the star (`src/physics/physicsEngine.ts`)

- `BODY_PROFILES.anchor = { eccentricity: 0.0, density: 1.41 (mean solar density g/cm³), albedo: 0.00, tiltDeg: 7.25 }`
- `kind === 'star'` forces `massKg = M_sun = 1.98847e30 kg`.
- Axial sidereal spin: **25.05 days** at the equator; galactic telemetry: 8.18 kpc from Sgr A*,
  230 km/s galactic orbital velocity, 230 Myr cosmic year, SMBH 4.15e6 M☉.

### 5.4 Visual spec (`engine.buildAnchor`, `engine.ts:876-933` — the star never uses the generic body builder)

> **Verbatim implementation:** Appendix **A.5** carries the full `starVert` / `starFrag` /
> `coronaFrag` GLSL (the Sentiment Aurora lives in `coronaFrag`), and Appendix **A.6**
> carries `buildAnchor()` itself.

| Element | Exact spec |
| :--- | :--- |
| Photosphere | `SphereGeometry(6, 96, 64)` + `starVert/starFrag` ShaderMaterial |
| Surface shader | Convection granulation: `fbm3` at scales **38 / 72**; magnetic flux tubes; sunspots with umbra + penumbra rings; 5-stop thermal ramp (dark → cool → warm → hot → core) from `uColorA/uColorB/uCoreColor`; **limb darkening `pow(mu, 0.55)`**; limb active-region glow; 2% pulse; incandescent core highlight |
| Corona | `PlaneGeometry(64,64)` view-space billboard, AdditiveBlending, DoubleSide, renderOrder 5, `frustumCulled false`; fbm plasma swirl + radial magnetic rays (two frequency bands) + sweeping CME/prominence eruptions + K/F-corona falloff; center `starMask` protects the disc |
| **Sentiment Aurora** | The reality's diary-mood spectrum flows through the corona rays via uniforms `uAuroraA/B, uAuroraMaskA/B, uAuroraIntensity, uAuroraStorm, uEchoBloom` (fed from `src/platform/sentiment/sentiment.ts`, updated per frame in `updateAurora`) |
| Halo rings | **Two counter-rotating starlight halos**: A r=9.6 (700 points, warm `[1, 0.82, 0.55]`, tilt 0.28, size 1.6), B r=11.4 (420 points, teal `[0.55, 0.85, 0.8]`, tilt −0.32, size 1.3); both `immuneToVortex`; `haloA.rotation.y += dt·0.05`, `haloB -= dt·0.038` |
| Obliquity | Whole group tilted `rotation.z = 0.126 rad` (7.25° solar obliquity) |
| Picking | Invisible collider `SphereGeometry(8.4)` tagged `bodyId:'anchor'` |
| Cold open | The star group is hidden until the intro ignition — first ~5.2 s are a Kamui arrival (tunnel slows, walls part, star ignites, worlds build one at a time) |
| Light | One scene-wide `PointLight(0xfff0d6, 0.95)` + `AmbientLight(0x1e293b)`; UnrealBloomPass(0.12, 0.15, 0.90) |
| Core Mode | Hover tooltip "ANCHOR STAR — the core · double-click to enter core mode"; double-click → `engine.enterCoreMode()`; `H` exits |
| Multiverse view | The ACTIVE reality's bubble wears a "Dimensional Barrier Anchor" shield: two gyroscopic torus rings (Torus 1.2/0.035 and 1.38/0.02) scaled to its bubble |

### 5.5 The aura system

`RealityConfig.starColor` is documented as **"the anchor star's aura — core surface + corona
light."** On every reality switch the engine copies `reality.colorA/colorB/starColor` into
`uColorA/uColorB/uCoreColor` + corona uniforms. The Reality Advanced Panel's aura presets rewrite
`starColor`, mix `colorA` 45% toward white and darken `colorB` 45%, and toast:
"The anchor star now burns {name} — the whole aura follows."

### 5.6 Spectral identity & lore

- Sol-Prime's reality-level field: `spectral: 'G2V Main Sequence'` (the real astronomical class of
  the Sun). The lineage expands it to `spectralClass: 'G2V Main Sequence / Spectral Core'`,
  habitable zone `0.95 – 1.42 AU`, `worldsCount: 10`.
- Every non-home star in the multiverse is deliberately lesser: `spectralClass: 'F5V Luminous Dwarf'`.
- The full 11-stage lineage chain (Multiverse → Anchor Star) with every lore number is in §8.2.

---

## 6. PILLAR II — THE WORLDS (Planets, Diary & Generation)

> Planets are memories. Each one is a real-physics body with a 41-field telemetry solve, a
> procedural shader surface, a 5-color palette, and a living diary whose entries become moons.

### 6.1 The canonical Sol-Prime roster (`src/realities/solPrime/index.ts` — recreate verbatim)

Reality fields: `id 'sol-prime'` · name "Sol-Prime Continuum" · codeName "REALITY-01 // SIG-Alpha" ·
spectral "G2V Main Sequence" · description "The baseline universe anchor. Home to Sol, Aurelia, and
the original Eventide Vault." · `bubblePos [0,0,0]` · `bubbleSize 7500` · `colorA #38bdf8` ·
`colorB #f59e0b` · `starColor #ffb54d` · `galaxyCountHint 5` · 6 literal clusters · 5 literal
galaxies · full literal home lineage.

| # | id | name | kind | meaning | radius | orbit a / speed (rad/s) | phase | incl | node Ω / ω (deg, J2000) | extras | palette (deep / base / high / atmo / ice) |
|:-:|:--|:--|:--|:--|--:|:--|--:|--:|:--|:--|:--|
| 0 | anchor | ANCHOR STAR | star | null | 6 | 0 / 0 | 0 | 0 | — | — | `#5a2a08 #ffb54d #fff3d9 #ffd9a0 #ffffff` |
| 1 | cinder | Cinder | planet | moment | 1.15 | 26 / TAU/88 | 0.8 | 0.12 | 48.33 / 29.13 (Mercury) | — | `#1c1512 #6e5a4c #b39a83 #8a7462 #d8cfc4` |
| 2 | veil | Veil | planet | dream | 1.9 | 38 / TAU/224 | 2.4 | 0.05 | 76.68 / 54.92 (Venus) | clouds | `#2a1f14 #c9a86a #efd9a8 #e8cf9e #fff2d8` |
| 3 | aurelia | Aurelia | planet | memory | 2.05 | 52 / TAU/365 | 4.2 | 0.0 | 0 / 102.94 (Earth ϖ) | clouds, nightside | `#0b2d4d #1f6e52 #9db88a #7fc4e8 #eef6ff` |
| 4 | rust | Rust | planet | project | 1.5 | 68 / TAU/687 | 1.1 | 0.09 | 49.56 / 286.50 (Mars) | — | `#2b120c #a34b2a #d98d5f #d9a184 #f0d9c8` |
| 5 | goliath | Goliath | planet | chapter | 4.3 | 100 / TAU/1600 | 5.4 | 0.04 | 100.47 / 274.25 (Jupiter) | rings, clouds | `#241a12 #b08d5f #e8d3a8 #e0c493 #f5ead0` |
| 6 | mirror | Mirror | planet | person | 1.75 | 132 / TAU/2600 | 3.0 | 0.14 | 74.02 / 96.94 (Uranus) | — | `#10222e #4f7f96 #bcd9e6 #a8d8ea #f2fbff` |
| 7 | hollow | Hollow | dwarf | idea | 0.8 | 160 / TAU/3800 | 0.2 | 0.22 | 110.30 / 113.76 (Pluto) | — | `#191d24 #5c6672 #9aa7b4 #7d8b99 #dfe6ec` |
| 8 | wisp | Wisp Nebula | nebula | idea | 7 | 205 / TAU/9000 | 2.0 | 0.3 | 250 / 35 (no analogue) | — | `#0a2a2c #2f8f83 #9fe8d8 #6fc2b4 #e8fff8` |
| 9 | eventide | Eventide | vault | null | 2.6 | 250 / TAU/12000 | 4.6 | −0.18 | 200 / 80 (retrograde vault) | THE black hole (§7) | `#000000 #14100c #3a2c1c #6fc2b4 #ffffff` |

`TAU = 2π`. **R84 — the node/argP column:** the ascending-node azimuth Ω and periapsis
argument ω arrive in the seeds as exact radians — `(deg · π) / 180` — and are the real
J2000 elements from JPL's "Approximate Positions of the Planets" Table 1
(ω = ϖ − Ω; for Aurelia, i = 0 makes Ω degenerate so argP carries the real longitude of
perihelion ϖ = 102.94°). The solver composes the full plane: rotate in-plane by ω, tilt
about the node line by i, carry the node to azimuth Ω. Every orbit crosses the ecliptic
at its own place, exactly like the real sky. Notes carry the metaphor (Cinder: "Small,
fast, scorched close to the light. A moment that burned bright and brief." · Aurelia:
"The inhabited one. Oceans, weather, city light on the dark side." · Eventide: "A quiet
black hole. Digital storage object.") — preserve them.

Sol-Prime ships exactly **3 diary entries**: `e-sol-1` (aurelia, "First light on the water",
tags `['origin','sea']`, bookmarked), `e-sol-2` (aurelia, "Weather report, interior",
tags `['weather','walking']`), `e-sol-3` (veil, "A dream about staircases", tags `['dream','stairs']`).

Sol-Prime's hierarchy is **frozen literals** (never re-rolls): 6 clusters (Local Galaxy Group
(Home) `GRP-LOCAL-01` · Virgo Supercluster Core `CLST-VIRGO-01` · Fornax Cluster System
`CLST-FORNAX-42` · Centaurus Supercluster Node `NODE-CENT-88` · Perseus Molecular Cluster
`CLST-PERSEUS-05` · Sculptor Polar Group `GRP-SCULPT-12`) and 5 galaxies (Milky Way / The
Milliandra Spiral [home] · Pinwheel Ember · Fornax Chime · Lyra Bloom · Triangulum Veil).

### 6.2 BODY_PROFILES — the hidden solar system (`src/physics/physicsEngine.ts:85-96`)

The named worlds are physical analogues of our solar system. Recreate exactly:

| id | eccentricity | density (g/cm³) | albedo | tiltDeg | Analogue |
|:--|--:|--:|--:|--:|:--|
| anchor | 0.0 | 1.41 | 0.00 | 7.25 | Sun (real solar obliquity) |
| cinder | 0.2056 | 5.43 | 0.12 | 0.03 | Mercury |
| veil | 0.0067 | 5.24 | 0.77 | **177.4** | Venus — RETROGRADE axial spin |
| aurelia | 0.0167 | 5.51 | 0.30 | 23.44 | Earth |
| rust | 0.0934 | 3.93 | 0.25 | 25.19 | Mars |
| goliath | 0.0453 | 1.33 | 0.52 | 3.13 | Jupiter |
| mirror | 0.0444 | 1.90 | 0.85 | **97.77** | Uranus — rolls on its side |
| hollow | 0.2488 | 1.85 | 0.14 | **122.5** | Pluto — retrograde spin, inclined orbit |
| wisp | 0.15 | 0.001 | 0.40 | 12.0 | nebula |
| eventide | 0.0 | **1e12** | 0.00 | 30.0 | black hole / vault |

Fallback for user-created bodies: `{ eccentricity: 0.05, density: 3.5, albedo: 0.3 }`; tilt falls
back to a deterministic seeded roll `8° + seed·55°`. Greenhouse adjustments:
`aurelia += 33 K` (Earth), `veil += 450 K` (Venus runaway). Habitable band:
`250–325 K = "Goldilocks (Habitable)"`, `>325 = "Too Hot"`, else `"Frozen Outer Realm"`.

### 6.3 The 41-field physics solve (`computePhysicsFresh` — every formula, every scaling law)

Scaling laws (the two baselines that make the numbers real): **`a_AU = orbit.a / 52`**
(Aurelia = 1 AU) and **`radiusKm = (radius / 2.05) · 6371`** (Aurelia = Earth radius).

1. **Kepler III (period):** `periodYears = √(a_AU³ / M_star)` with `M_star = 1.0`; `periodDays = ×365.256`.
2. **Kepler I/II (position):** mean anomaly `M = (phase + simTimeSec·speed) mod 2π`; solve
   `E − e·sin E = M` by Newton–Raphson, **5 iterations**; true anomaly
   `ν = 2·atan2(√(1+e)·sin(E/2), √(1−e)·cos(E/2))`;
   `r = a(1−e²) / (1 + e·cos ν)`.
3. **Vis-viva:** `v = 29.78 · √(2/r − 1/a)` km/s (Earth mean orbital velocity baseline);
   mean velocity `29.78/√a`.
4. **Newton gravitation:** `massKg = volume · density` (star → M_sun; hole/vault → 10 M☉);
   `g = GM/R²`; `v_esc = √(2GM/R)/1000`; instantaneous `F = G·M_sun·m/r²`,
   `U = −G·M_sun·m/r`, orbital field `g(r) = G·M_sun/r²`, centripetal `m·v²/r`.
5. **Stefan–Boltzmann + Wien:** flux `L_sun/(4πr²)`; `T_eq = T_sun·√(R_sun/(2r))·(1−albedo)^0.25`;
   flux relative to the solar constant 1361 W/m².
6. **Roche limit (fluid):** `2.44 · R_planet · (ρ_planet / 3000)^{1/3}`;
   `ringsInsideRoche = ringInner (1.45R) ≤ rocheLimit`.
7. **General relativity** (`kind hole|vault` only): `R_s = 2GM/c²`, photon sphere `1.5 R_s`,
   ISCO `3 R_s`, time dilation at 2 R_s `√0.5 ≈ 0.7071`.
8. **Universal spacetime curvature (every body):** compactness `2GM/(Rc²)` (= 1 for relativistic
   bodies — the surface IS the horizon); surface clock rate `dτ/dt = √(1 − compactness)`
   (Earth ≈ 7×10⁻¹⁰).
9. **Axial spin & galactic orbit:** star spin 25.05 d else `1.0 + (radiusKm/6371)·0.5`;
   `v_spin = 2πR/T`; galactic constants 8.18 kpc / 230 km/s / 230 Myr / Sgr A* 4.15e6 M☉.

Memoization: full solve once per body signature
(`a|phase|incl|radius|kind|profiled`), only the ~8 live fields mutated per frame.

### 6.4 Orbital rendering

- **True 3D inclined Kepler orbits** — `x = cos ν·r`, `y = sin ν·r·sin incl`, `z = sin ν·r·cos incl`
  (the old "vertical sine wobble flat sheet" is retired and must NOT return).
- Orbit lines: 256-sample full-revolution ellipse per body (`LineLoop`, color `0x8ba1c4`, fades in on hover).
- Asteroid belt: **4,800 dust points + instanced tumbling rocks at r 78–97** scene units —
  deliberately between Rust (68) and Goliath (100).

### 6.5 Per-kind rendering (exact construction rules)

> **Verbatim implementation:** Appendix **A.5** carries the full `planetVert` / `planetFrag` /
> `cloudFrag` / `atmoFrag` / `ringVert` / `ringFrag` / `nebulaVert` / `nebulaFrag` /
> `asteroidVert` / `asteroidFrag` GLSL — the entire master shader library, byte for byte.

| kind | geometry | shader | signature rules |
|:--|:--|:--|:--|
| planet | `Sphere(radius, 64, 48)` inside a tilt group (order YXZ from `axialTiltDeg`) | `planetFrag`/`planetVert` | ocean `uSea = 0.02` **for aurelia only** (else −0.55); cloud deck shell ×1.018 with `uCover 0.95` for veil (else 0.5); atmosphere shell ×1.07 additive `uStrength 1.5` for mirror (else 0.85); **retrograde spin if tilt > 90°**; night-side city lights (`uNight`) aurelia only |
| dwarf | same as planet (radius ~0.8) | same | included in moon/streak systems |
| nebula | raymarched volumetric box (radius·3.2) | `nebulaFrag` | 1,600-point 3D starfield, 3 protostar sprites, 850-point dust filaments |
| hole / vault | Gargantua composite + raymarched tier (§7) | `blackhole.ts` + `blackholeRaymarch.ts` | tinted with reality colorA/colorB; vault adds two lattice torii (hidden while raymarch active) |

`planetFrag` terrain core (preserve the technique): continental heightmap
`h = fbm(q·2.9 + 0.55·fbm3(q·2.3)) + 0.16·fbm(q·9.0)`; ocean specular `(R·V)^42`; latitude ice caps
`smoothstep(0.62, 0.86, |P.y| + 0.18h − 0.1)`; night city lights
`smoothstep(0.52, 0.78, fbm(q·7.5 + 11)) · (1−ice) · land · (1−day)`.
`planetVert` displaces the real sphere — the planet physically caves during its Kamui portal
(that's why tessellation is 64×48).

- **Rings:** `RingGeometry(inner 1.45R, outer 2.5R)`, tilt −π/2 + 0.32, parented to the obliquity
  group (rings obey axial tilt), `ringFrag` banded translucency.
- **Moons = one per diary entry** (`syncMoons`, max 12): moon radius = planet radius·(0.1 + 0.09·seed);
  orbit a = radius·(1.75 + 0.55·i) (+1.5·radius extra if the planet has rings); period TAU/(14 + 8i);
  each on its own inclined plane (incl 0.18 + seed·0.3). Plus a **streak ring** (torus, atmo color)
  that brightens with writing streaks.
- **Connections:** user-drawn links between worlds render as gold additive line segments (`0xf2c178`).

### 6.6 Generation algorithms (for every non-canonical reality)

- **World name pool (48, exact order):** Aethelgard, Celestia, Vesperion, Chronos, Astraea,
  Hyperion, Zephyria, Elysium, Nocturne, Pyros, Meridian, Solmara, Veyra, Ossia, Thalor, Nyxara,
  Auralith, Kaelis, Dravenna, Solarine, Umbris, Faelora, Tessara, Orivane, Lumenor, Cindara,
  Maristel, Quorin, Halcyra, Serenno, Avieth, Corvane, Ithralis, Ysolde, Peridion, Vantress,
  Ondrim, Calyx, Miravel, Zephyrion, Elandor, Ravassa, Solaris, Nimbrethil, Ardentis, Vespera,
  Oculon, Terravox.
- Deterministic PRNG: **FNV-1a hash → mulberry32** seeded from `worlds::${id}::${name}`.
- Custom-reality worlds: 1–8 planets, radius 1.2 + (p%3)·0.45, semi-major 35 + p·22 ± 6,
  rings when p%3==1, meaning cycles memory/dream/project/idea/moment.
- **Foreign stellar systems** (one per non-home galaxy): 10-archetype roster with full palettes —
  scorched, shrouded, terran, rust, gas-giant, ice, oceanic, volcanic, violet, emerald (radii
  copied from the home system) + `ORBIT_LADDER [26, 38, 52, 68, 100, 132, 160, 196, 236]`;
  **guaranteed terran at slot 2**, ringed gas giant at slot ≥3, dwarf when rnd > 0.82; names
  `{Star} {Roman numeral}`; period from Kepler `TAU/(365.256·(a/52)^1.5)`; each system owns a
  vault + edge nebula.
- **Galaxy pools:** 16 names (Andromeda Reach, Triangulum Veil, Sombrero Halo, Whirlpool Crown,
  Cartwheel Drift, Pinwheel Ember, Vesper Cascade, Lyra Bloom, Auriga Lantern, Messier Echo,
  Cygnum spur, Draco Wisp, Perseus Mirror, Tucana Dial, Fornax Chime, Ursa Cradle) × 9 morphologies
  (Barred Spiral SBbc, Grand-Design SAc, Elliptical Giant E3, Lenticular S0, Irregular Irr-II,
  Interacting Pair Arp, Seyfert SBb, Dwarf Spheroidal dSph, Ring Galaxy Rng) × 8 colors
  (`#38bdf8 #f59e0b #ec4899 #a78bfa #34d399 #fbbf24 #22d3ee #fb7185`).
- `galaxyCountHint` is law: count = max(1, min(12, hint)); no hint = exactly 1 home galaxy.
  Non-sol-prime realities get 5 template clusters cycled; every cluster/galaxy carries a full
  `CosmicLineage`; every non-home galaxy owns a real generated stellar system.
- **Reality placement:** golden-angle 3D spiral around the Core — `R = 540000 + (i%6)·42000`,
  `y = ±360000·yNorm`, inside a 960,000-unit Multiverse Hypersphere; generated `bubbleSize`
  forced to 24000 (Sol-Prime's authored value stays 7500). Each reality renders as a **glass
  marble**: fresnel shell, billboard rim sprite, blazing core sprite, 700-point internal spiral
  galaxy, 140-point halo.

### 6.7 The Living Planetary Diary

- `DiaryWindow.tsx`: sanitized rich-text WYSIWYG; tags, mood, weather; bookmark/archive.
- Voice memos via `navigator.mediaDevices.getUserMedia` + `MediaRecorder`; live Web Audio peaks.
- Attachments (`MediaPlates`): image/audio/video (80 MB guard)/code/file; freeform placement
  (x %, y px, w %, tone noir/warm/fade, tilt, "glued" inline mode).
- 3D flip-book presentation (`Book.tsx`); export to PDF (jsPDF)/Markdown/HTML/JSON.
- **Every entry adds a moon to its planet (§6.5) and its mood feeds the star's Sentiment Aurora
  (§5.4)** — this is the attention-as-gravity loop. Do not break it.

---

## 7. PILLAR III — THE BLACK HOLE (Eventide)

> The single most important object to get right. It is simultaneously: a real-physics
> relativistic body, a two-tier cinematic renderer, a spacetime funnel in the universe surface,
> the door to the encrypted Vault, and a live-tunable studio instrument.
>
> **Verbatim implementations — the graphics detailing, gatherable from this file alone:**
> Appendix **A.1** = the full raymarched geodesic renderer (`blackholeRaymarch.ts`, shader +
> TS, incl. the 121-entry blackbody LUT) · Appendix **A.2** = the full composite Gargantua
> renderer incl. the spacetime funnel (`blackhole.ts`) · Appendix **A.3** = the tuning store
> (`blackholeParams.ts`) · Appendix **A.4** = the Studio UI (`BlackHoleTuningCard.tsx`) ·
> Appendix **A.6** = the engine wiring (attach / cinematic switch / frame-budget guard /
> hole+vault body build). These five files ARE the black hole.

### 7.1 Identity & orbital data

```typescript
{ id: 'eventide', name: 'Eventide', kind: 'vault', meaning: null,
  note: 'A quiet black hole. Digital storage object.',
  createdAt: now - 900 * day, radius: 2.6,
  palette: { deep: '#000000', base: '#14100c', high: '#3a2c1c', atmo: '#6fc2b4', ice: '#ffffff' },
  /* R84 — node 200°/argP 80°: the retrograde vault crosses the ecliptic
     opposite the planets, in the persisted seed (index.ts's config twin
     keeps its own rounded values) */
  orbit: { a: 250, speed: TAU/12000, phase: 4.6, incl: -0.18,
           node: (200.0 * Math.PI) / 180, argP: (80.0 * Math.PI) / 180 } }
```

- Every reality gets exactly one vault hole; missing ones are auto-added:
  `{ id: '<reality>-vault-blackhole', radius: 2.8, orbit: { a: 220 + (i%4)·20, speed: TAU/(10000+i·500), incl: −0.15 + (i%3)·0.1, node/argP: random } }`
  — R84: auto-vaults scatter their node and periapsis around the full circle.
- Profile: `eccentricity 0.0, density 1e12, albedo 0.00, tiltDeg 30.0`. `isRelativistic` is true
  for `kind 'hole' | 'vault'`. Mass forced to **10 M☉**.
- `eventide` is undeletable (same protection as the anchor).

### 7.2 Relativistic physics (real SI)

`R_s = 2GM/c²` (≈ 29.5 km for 10 M☉) · photon sphere `1.5 R_s` · ISCO `3.0 R_s` ·
time dilation at 2 R_s `√0.5 ≈ 0.7071` · universal compactness `2GM/(Rc²) = 1` at the horizon.

**The Dimensional Anchor (Living Gravity interplay):** the 10 M☉ singularity's *dynamic* N-body
reach is tempered by `dynamicMassKg = mass × 1e-3` for hole/vault — "Einstein keeps the truth,
Newton keeps the peace" — while its **gravitational lens still acts as the full 10 M☉**.
Lens-halo multiplier for hole/vault = **3.2** (star 2.6, others 2.2);
halo angular radius = multiplier × asin(R/d).

### 7.3 Tier A — the raymarched geodesic renderer (`src/engine/blackholeRaymarch.ts`)

A corrected port of **dgreenheck/webgpu-black-hole (MIT)** — attribution is mandatory
(`THIRD-PARTY-NOTICES.md`). Technique: a **single camera-facing quad billboard** (NOT fullscreen)
whose shader integrates bent light rays.

- Quad: `PlaneGeometry(quadSize = rs·60)`, renderOrder 12, `frustumCulled false`, premultiplied
  NormalBlending, depthWrite off. `rs = R · 0.62` in world units (≈1.6–1.74 for radius 2.6/2.8).
- Shader space: `uRs = mass × 2` (0.8 at default mass 0.4); `uScale = rs_world / uRs` keeps the
  shadow aligned on the real body.
- **Geodesic bending law:** per step, `v = normalize(v + toCenter · (uRs/r²) · stepLen · uLensing)`
  — bend per unit path = `uRs × uLensing`, step-size independent.
- March: coarse approach loop (≤12 long steps) to the r=16 march sphere; main loop ≤128 steps
  (`uSteps` clamp 48–96); **capture at r < 1.01·uRs** (opaque black shadow); escape at r > 100;
  adaptive step `0.3 · clamp(r·0.125, 1, 4)`.
- **Accretion disk:** every disk-plane crossing (disk normal `(0.055, 1.0, 0.04).normalize()`,
  mapped through `uDiskBasis`) paints: `T(r) = T_peak·(r_in/r)^α` with **T_peak 49.78 kK**,
  falloff **α = 5.22**; Doppler beaming `D = 1/(1 − β·cosθ)`, brightness ∝ **D³**,
  `β = 0.3/√(r/r_in)`; rotation sign from `rotSpeed = −8.7` (negative flips the beam side);
  4-octave FBM turbulence (1.81 / 0.75 / 7.4, lacunarity 3, persistence 0.8), cyclic-time
  crossfade (5 s); edge softness 0.18/0.5.
- **121-entry Mitchell–Charity blackbody LUT** (1000–10000 K in 100 K steps, then 1 kK steps to
  40000 K) baked to a DataTexture. Output contract: `color = pow(color, 1/2.2)`;
  `alpha = captured ? 1 : alpha` — escaped rays stay transparent so the real universe is the
  background.
- Additive warm glow sprite (bloom stand-in, scale rs·56, renderOrder 11).
- Per-frame uniform update copies camera quaternion (billboard), camera position, center, time.

### 7.4 Tier B — the composite fallback (`src/engine/blackhole.ts`, "Gargantua-class")

Zero custom-GLSL risk: pure meshes + baked 2048² canvas textures. `rs = 0.62·R` everywhere.

| Element | Exact spec |
| :--- | :--- |
| Event horizon | Pure-black `SphereGeometry(rs · 2.35, 48, 32)`, depth-writing — fully occludes background |
| Accretion disk | `RingGeometry(rs · 3, rs · 12)` (ISCO outward), tilted to normal `(0.055, 1.0, 0.04)`, baked Shakura–Sunyaev thermal profile `I(t) = (1−t)^1.25 · 0.85 + 0.38·e^(−9t)` where `t = (r−r_in)/(r_out−r_in)`, Keplerian-sheared filament streaks, **Doppler beaming baked into the texture (approaching side ≈ 2.6×)** |
| Outer haze ring | `RingGeometry(rs · 10, rs · 16.5)` |
| Photon ring | `RingGeometry(rs · 2.44, rs · 2.58, 128)` — blazing thin ring |
| Primary lensed halo | `RingGeometry(rs · 2.42, rs · 5.6, 160)` — the far-side disk wrapped over the top, white-hot inner edge |
| Secondary halo | `RingGeometry(rs · 2.30, rs · 4.0, 128)` at **0.72 scale, opacity 0.35** — the lower image |
| Einstein-ring star streams | `RingGeometry(rs · 2.55, rs · 4.7, 128)`, additive, **opacity 0.22**, rotating `time · 0.12` |
| Soft halo sprite | scale rs · 9 |
| Billboard | whole group renderOrder 6, camera-facing |
| `setCinematic(on)` | hides diskTilt/billboard/core/funnel when the geodesic tier owns the hole |

### 7.5 The spacetime funnel (Round 17) + safety nets

- **Funnel** ("the hole in the universe surface"): 44 log-spaced concentric rings (72 segments),
  inner 1 rs → outer **7 rs**, sunk along −Z by the exact **Flamm paraboloid
  `z(r) = 2√(rs(r−rs))`**; billboarded face-on to the camera (the pour is always circular and
  always plunges along the view axis); white-hot ±Y "light-speed lip"; camera-distance melt
  `1 − smoothstep(4·rs, 12·rs, camDist)` so you can never fly into it; strength rides the damped
  lens toggle `lensCur`.
- **Permission** (`canUseRaymarchBlackHole()`): false at quality tier `low`; false if
  `!webgl2 && maxTextureSize < 4096`; false for software rasterizers (swiftshader / llvmpipe /
  mesa offscreen / basic render / software).
- **Attach:** both `hole` and `vault` bodies get composite + raymarch overlay; on successful
  attach the composite immediately `setCinematic(true)` and the vault's lattice torii hide.
- **Shader-error disarm:** `renderer.debug.onShaderError` dispatches `eventide-shader-error`,
  sets `raymarchDisabled = true`, restores the FULL composite (torii included); App toasts on the
  same channel.
- **Frame-budget circuit breaker (`guardRaymarch`):** skips while a portal is active or no hole
  is "on stage" (within `radius·0.62·120` world units); over 180 accumulated frames (~3 s) if
  **average dt > 0.055 s (55 ms ≈ 18 fps floor)** → one-way stand-down for the session.
  *(Known stale comment: `capability.ts` still says "~34 ms" — the operative threshold is 55 ms
  in `engine.ts`; fix the comment, not the value.)*
- **Quality change:** switching to any tier below cinematic disables all raymarch holes and
  restores composites.

### 7.6 Black Hole Studio (Round 20.4 — live tuning rail)

`src/ui/console/BlackHoleTuningCard.tsx` + `src/engine/blackholeParams.ts`.
Store contract: module cache + localStorage `my-universe:blackhole:v1` + window CustomEvent
`eventide-blackhole-change`; renderer subscribes and applies instantly. **Defaults ARE
dgreenheck's demo reference config, verbatim:**

| Slider | Default | Range (min / max / step) |
|:--|--:|:--|
| Mass (`blackHoleMass`) | **0.4** | 0.1 / 3.0 / 0.1 |
| Grav. Lensing (`gravitationalLensing`) | **2.4** | 0.5 / 3.0 / 0.1 |
| Doppler Beaming | **1.0** | 0.0 / 2.0 / 0.1 |
| Inner Radius (disk, shader units) | **4.1** | 2.0 / 5.0 / 0.1 |
| Outer Radius (disk, shader units) | **14.5** | 6.0 / 20.0 / 0.5 |
| Brightness | **5.0** | 0.5 / 5.0 / 0.1 |
| Rotation Speed | **−8.7** | −20.0 / 20.0 / 0.1 |

Mass slider rescales the quad (`scale = max(1, 34/(60·shaderRs))`); mass × lensing is the geodesic
shape product. **Not tunable (fixed at reference):** disk temperature 49.78 kK, falloff 5.22,
turbulence 1.81/0.75/7.4, lacunarity 3, persistence 0.8, softness 0.18/0.5. A "Reset to Reference"
button restores the defaults.

### 7.7 The Vault door — Kamui portal traversal

- **Entry:** key **`V`** (space mode) focuses this reality's vault body; clicking the body opens
  the Kamui portal dive.
- **9-phase portal machine** (`src/engine/systems/portalPhases.ts`):
  `idle → arming → disturbance → deformation → vortex → collapse → opening → hold → out`.
  Phase field-intensity weights: `idle 0, arming 0.02, disturbance 0.10, deformation 0.30,
  vortex 0.62, collapse 0.82, opening/hold/out 1.0`.
  Transition durations (full-motion): arming→disturbance **0.18 s**, disturbance→deformation
  **0.42 s**, deformation→vortex **0.72 s**, vortex→collapse **1.0 s**, collapse→opening
  **0.72 s** (reduced-motion variants: 0.08/0.12/0.18/0.22/0.18 s).
- The vault dive's `opening` runs **0.72 s (vs 0.9 s for planets)**; at `t > 0.72` of `opening`
  the engine fires `onPortalPeak('vault')` → App switches `mode = 'vault'`.
- **The hole reacts to vault activity:** `pulseVault(intensity)` (fired by vault executors)
  dispatches `eventide-vault-pulse`; the engine raises `vaultPulse` — the lattice torii
  (Torus R·1.9 / R·2.4, emissive `#6fc2b4`, base intensity 1.8) shudder and brighten, then relax.
- What lives inside the hole → §9.

---

## 8. THE MULTIVERSE & REALITIES

### 8.1 The five seeded realities (exact identity data)

Discovered by `import.meta.glob('./*/index.ts')` in `src/realities/`. Recreate exactly:

| Reality | id | codeName | spectral | colorA / colorB / starColor | Notes |
|:--|:--|:--|:--|:--|:--|
| **Sol-Prime Continuum** | `sol-prime` | REALITY-01 // SIG-Alpha | G2V Main Sequence | `#38bdf8` / `#f59e0b` / `#ffb54d` | CANONICAL. Literal seed (§6.1). bubbleSize 7500. Protected: cannot be deleted |
| Aurora Test | `reality-mueznhkq-7j72` | UNIV-850-AUR | Class G Star | `#ffaa55` / `#55ccff` / `#ffaa55` | user-created snapshot ("wave7 verification") |
| Chasin Love | `reality-mufzp70z-iku9` | PARALLEL-4601 | Class B Blue Luminary · Binary Companion | `#00f5d4` / `#8b5cf6` / `#00f5d4` | user-created snapshot |
| Test One | `reality-muey9188-ayqk` | UNIV-157-TES | Quantum Foam | `#ff8844` / `#44aaff` / `#ff8844` | user-created snapshot ("repro") |
| test world | `reality-mucxi73n-5z1p` | PARALLEL-2036 | Class B Blue Luminary · Binary Companion | `#00f5d4` / `#8b5cf6` / `#00f5d4` | user-created snapshot (code module, no data.json) |

Generated realities: anchor per §5.2 (radius 4.8, meaning 'chapter', deep `#0f172a`), worlds from
the 48-name pool (§6.6), 5 template clusters, 1 galaxy (hint 1), auto vault hole (§7.1).

### 8.2 The 11-stage cosmological hierarchy

**Navigation ladder** (`src/realities/hierarchyStages.ts` — single source of truth; index 0 =
Multiverse … index 10 = Stellar System; camera `dial` values are calibrated against the engine's
scale-label distance windows `dist = 3 · 800000^zoomT`):

| # | Stage | short | dial |
|:-:|:--|:--|--:|
| 0 | Multiverse | Bulk | 0 |
| 1 | Reality / Universe | Reality | 0.88 |
| 2 | Cosmic Web | Web | 0.858 |
| 3 | Supercluster Complex | Complex | 0.842 |
| 4 | Supercluster | Supercluster | 0.773 |
| 5 | Galaxy Cluster / Group | Cluster | 0.722 |
| 6 | Galaxy | Galaxy | 0.668 |
| 7 | Galactic Region | Region | 0.589 |
| 8 | Spiral Arm | Arm | 0.503 |
| 9 | Star-Forming Region | Nursery | 0.411 |
| 10 | Stellar System | System | 0.15 |

**The home lineage (Sol-Prime, literal — every number is LAW):**

```
The Infinite Multiverse (multiverse-prime)
 └─ Sol-Prime Continuum — "Quantum Bubble Reality"
     └─ Sol-Prime Continuum Cosmic Filament Web — filamentDensity "0.84 Baryonic Mass / Vol"
         └─ Complex A — span 400 Mly
             └─ Local Galaxy (Home) Supercluster — 12 clusters
                 └─ Local Galaxy Group (Home) — GRP-LOCAL-01, 84 galaxies, 9.8 Mly  [isHomeCluster]
                     └─ Milky Way / The Milliandra Spiral — Barred Spiral (SBbc),
                        100 kly, 250–400 Billion Stars                                [isHomeGalaxy]
                         └─ Local Interstellar Fluff & Gould Belt — 24 kly from core, ~7,000 K
                             └─ Orion–Cygnus Arm (Local Spur) — 12.4° galactic pitch
                                 └─ Orion Molecular Cloud Complex — Giant H II Stellar Nursery,
                                    240 ly, 1200 protostellar cores
                                     └─ system-sol-prime-0 — ANCHOR STAR,
                                        "G2V Main Sequence / Spectral Core",
                                        habitable zone 0.95 – 1.42 AU, worldsCount 10
```

Data model: `CosmicAddress` (realityId → cosmicWebId → … → stellarSystemId) and `CosmicLineage`
(11 prose stages with per-stage fields: spanMly, galaxiesCount, diameterKly, starsCount,
pitchAngle, protostarsCount, spectralClass, habitableZoneAU, worldsCount …). Galaxies are
**"ONE ellipse = ONE galaxy"** — `GalaxyData { orbitRadius (× bubbleSize), orbitSpeed, orbitIncl,
orbitPhase, isHomeGalaxy, lineage }`; clusters add `type: 'Galaxy Cluster' | 'Galaxy Group' |
'Supercluster Node'`.

### 8.3 Reality lifecycle

- **Switching** = a pure pointer flip: `state.activeRealityId = r.id` + `ensureBucket` — then the
  derived snapshot re-points the whole world. No reload.
- **Creation** (Core Console → New Reality): `createNewRealityConfig` builds config + disk folder
  (sanitized unique name), seeds anchor + worlds + vault, writes `index.ts` + `surface.ts` +
  `data.json` via the disk API.
- **Quantum Bin (deletion):** `deleteReality` protects `sol-prime`, moves the config to
  `state.binRealities` with its folderName, POSTs `/api/realities/bin/move-to-bin`. Restore /
  purge / empty via `/bin/restore`, `/bin/purge`, `/bin/empty`. **Orphaned disk folders in
  `src/realities/bin/` are adopted into the bin UI** (`adoptBinFolder`). UI:
  `QuantumBinTab` ("Quantum Recycle Bin") shows disk truth + orphans + manual `reconcileNow()`.
- **Disk mirror:** every mutation queue-writes the reality's ENTIRE world database (config,
  bodies, diary entries, connections, vault metadata, vaultTrash) to
  `src/realities/<folder>/data.json` (retry-queued; binary payloads stay in the encrypted store).
- **Heartbeat:** `src/platform/sync/realitySync.ts` polls `daemon-status` + bin every
  **3000 ms healthy → 8000 ms degraded → 20000 ms offline**, flushing a retry queue and
  self-healing missing folders (60 s cooldown per reality). The console shows this as the
  Disk Sync tile.

---

## 9. THE VAULT & EVENTIDE FILESYSTEM (EFS)

> A browser-local operating system anchored inside the black hole. Enter through the Eventide
> singularity (§7.7).

### 9.1 Shell & environment (`src/ui/VaultUI.tsx` + `src/ui/vault/`)

- Shell sections: **Home · File Manager · Everything · The Void**; `gate.tsx` = cryptographic
  entry/lock UI; `sandbox.tsx` = terminal + execution sandbox; `void.tsx` = The Void.
- **Monaco editor** (VS Code's engine) for code files — vendored ESM (CDN-free), chunk-split via
  `manualChunks` (monaco-core / monaco-lang), find/wrap/format actions.
- File Manager: EFS tree explorer, breadcrumbs, shadow (CoW snapshot) controls, hex viewer,
  kind glyphs, preview tiles.

### 9.2 Cryptographic identity gate (`src/vault/storage/crypto.ts`)

- **New seals: Argon2id** — memory **64 MiB**, iterations **3** (Bitwarden-class, OWASP-preferred,
  via `hash-wasm`).
- **Legacy: PBKDF2-SHA256** — target **310,000 rounds**; absolute OWASP floor **600,000 rounds**
  when Argon2id cannot be used.
- **Payload sealing: AES-GCM 256-bit** with authentication tag. Plaintext passwords never touch
  storage (verifier-based file locks; `VaultLock` never stores the password). Inactivity
  auto-lock (`eventide:autolock`) with lockout on repeated failures. TOTP support
  (`storage/totp.ts`); Key Ring modules: `totp.ts`, `courier.ts` (comet courier — one-shot
  `eventide:comet-burned`), `breaches.ts`.
- **Bytes are encrypted BEFORE any storage tier** (`putPayload` → `encryptPayload`).

### 9.3 Eventide Filesystem (EFS) — copy-on-write invariants (LAW)

- Inode-based virtual filesystem: immutable id-addressed payloads + parent-pointer trees
  (`VfsNode { id, name, type: 'dir'|'file', parentId, fileId?, createdAt, updatedAt, tags?,
  pinned?, color? }`). Superblock label: `'eventide-efs'`.
- **Zero-copy fork & duplicate:** copying files/branching folders duplicates only inode metadata
  pointing to the same SHA-256 payload reference.
- **Copy-on-write Shadows (`VfsShadow`):** freeze complete tree generations instantaneously.
- **Self-healing genesis & rollback safety:** restoring a shadow ALWAYS takes an automatic
  `pre-rollback-*` safety snapshot first and re-heals unreferenced files into Trash.
- **Scrub & dedup:** bit-rot re-verification (hash scan vs actual payloads), orphan-byte pruning,
  identical-file unification.
- **Triple-tier persistence:** Desktop FS (Tauri) → OPFS (Origin Private File System) →
  IndexedDB (DB `eventide-universe`, store `payloads`). Never store multi-megabyte binaries in JSON.
- **Per-reality vaults:** each `RealityBucket` carries its own `vault / vaultTrash / efs`; new
  realities start with an empty black hole; Deep Scan filters by `realityId`.
- **Terminal (21 commands):** `help, ls, cd, pwd, mkdir, cat, info, cp, tree, fork, shadow ls,
  shadow freeze, shadow restore, shadow rm, scrub, dedup, trash, scan, keyring, find, clear`.

### 9.4 Universal sandbox execution engine (`src/vault/executors/`)

| Format | Sandbox boundary |
| :--- | :--- |
| HTML / WebApp | Sibling assets bundled into local Blob URLs; opaque-origin `iframe` with `sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock"` |
| JavaScript | Dedicated Web Worker; piped `console.log`; explicit user termination |
| Python | Pyodide (vendored, offline) in a dedicated reusable terminable worker |
| PDF | Native sandboxed browser PDF object streams |
| ISO 9660 | Full binary sector parser (`isoExecutor.ts`) — virtual CD/DVD mount, extract into EFS |
| ZIP | Client-side native `DecompressionStream` (deflate) |

---

## 10. ENGINE MECHANICS & PHYSICS REFERENCE

### 10.1 Physical constants (`CONSTANTS`, `src/physics/physicsEngine.ts:8-21` — LAW)

```
G        = 6.67430e-11   m³ kg⁻¹ s⁻²      M_sun   = 1.98847e30 kg
c        = 299792458     m/s              R_sun   = 6.96342e8  m
sigma    = 5.670374e-8   W m⁻² K⁻⁴        L_sun   = 3.828e26   W
b_wien   = 2.8977719e-3  m·K              T_sun   = 5778       K
M_earth  = 5.9722e24     kg               R_earth = 6.371e6    m
AU       = 1.495978707e11 m               g_earth = 9.80665    m/s²
```

### 10.2 The render loop (`engine.tick`)

- Early-out when `!rendering` (vault/core overlays keep the loop registered but skip work);
  `dt` clamped ≤ 0.05 s; `guardRaymarch(dt)` first.
- **Time:** `rate = 6 · timeScale · (coreActive ? 0.35 : 1)` days per real second;
  `simDays += dt·rate`; sim date emitted every 0.25 s from `epoch = Date.now() − 400 days`.
  Pause via Space (`setPaused`).
- Update order (LAW): `updateBodies → updateLivingGravity → updateSpacetimeLens → updateMeteors →
  updateAurora → updatePulses → updateLevels → updatePortalGravity/Singularity/PointsVortex →
  updateSurface → updateCore → updateHover → composer.render()`.
- **Kepler cache (the C++/WASM accelerator):** `updateBodies` refreshes every **2nd frame** via
  `cosmosBridge.keplerBatch`; the cache is trusted only if `|cache.simDays − simDays| < 0.25 day`,
  else the inline TS Kepler solver takes over. Skipped entirely when backend is `typescript`
  (the TS tier is reference/parity — the render loop uses its own math).
- **Scene:** camera far 8,000,000; clear color `#04060c`; ACESFilmic tone mapping, sRGB output;
  composer = RenderPass → UnrealBloomPass(**strength 0.12, radius 0.15, threshold 0.90**) →
  OutputPass; shader precompile at boot; `webglcontextlost/restored` handling; shader failures
  surface via the `eventide-shader-error` channel.

### 10.3 Einstein lensing ("Lens · Bent / Clear")

Toggle → `actions.setSpacetimeLensing` (persists; absent = ON) → engine damped `lensCur`
(rate `dt·4`) → `updateSpacetimeLens`: up to **16 simultaneous lenses**, each body's halo =
`lensHaloFor(kind) × asin(R/d)` (hole/vault 3.2, star 2.6, others 2.2; `lensStrong = 1` for
hole/vault). The lenses push into `surfaceManager.setLenses`, bending the sky dome, star shells
and every point cloud via shared `lensUniforms` (`lensBentPosition` in `surfaceShaders.ts`).
The funnel's strength rides the same `lensCur`.

**Universe Surface** (`src/engine/surface/`): inverted sky dome radius **460,000**; three
volumetric nebula clouds at radii **120,000 / 100,000 / 90,000**; near star shell **2,600 stars**;
bright named stellar neighbors (Sirius, Vega, Proxima, Keid); ultra-far shell **320,000–480,000**.
Objects flagged `userData.immuneToVortex = true` (anchor halos, orbit belts, asteroid band) are
shielded from vortex suction; planet Kamui deformation is strictly local (≤ 3.2·R_planet).
Only one surface preset exists: `sol-prime`.

### 10.4 Living Gravity (`src/physics/nbody.ts`)

- True mutual N-body coupling via **Gauss's planetary equations in osculating elements**
  (Δe, Δω, Δi only — the dominant star–planet Kepler problem stays exact), explicit Euler,
  **Plummer softening**.
- Unit system: **52 scene units = 1 AU**; `G′ = k²·52³`.
- **THE KEEPER:** eccentricity fenced at **≤ 0.6** — orbits bend and precess, never eject.
- **THE DIMENSIONAL ANCHOR:** hole/vault dynamic mass × 1e-3 (§7.2).
- Toggle OFF = **canonical heal** (`heal()` zeroes all perturbations — the console's
  "Restore Ephemeris" button calls this; the divine plan is never lost).

### 10.5 Kamui warp (multiverse traversal)

Scripted **3.6 s flight** between the Cosmic Web and the Multiverse stages:
TEAR → SUCK (web vortex radius 45000 → 525000, drag +z 60000) → TUNNEL (camera-child fold,
z −1.6e6 → +1.6e6, torque spin, t∈[0.3, 0.68]) → EJECT out of your reality's marble;
`cosmicStage` flips `'web' ↔ 'multiverse'` at t = 0.55. Planet/vault portals are the separate
local 9-phase machine (§7.7). Camera FOV: `targetFov = 50 − coreT·4 + kamuiWarpFx·28`.

### 10.6 Quality tiers (`src/engine/capability.ts`)

| Tier | pixel ratio ceiling | Effects |
|:--|--:|:--|
| low | 1.0 | forced for software rasterizers / no WebGL |
| medium (default) | 1.35 | long-standing default; raymarched black hole allowed (Round 20) |
| cinematic (opt-in) | 2.0 (min(display, 2)) | richer particles + exoplanet horizon plates |

Persisted (`my-universe:quality`), applied live via `eventide-quality-change`; switching to a
non-cinematic tier disarms raymarch holes. NOTE for honesty: on a 125 %-scaled display
(devicePixelRatio 1.25) MEDIUM and CINEMATIC clamp to the same resolution — the raymarched hole
is already on at medium; the panel copy says exactly this.

---

## 11. SERVER & DESKTOP CONTRACT

### 11.1 Express server (`server/`, dev convenience only — browser is authoritative)

- `tsx server/index.ts` → Express 5 on **http://localhost:3000** (loopback default; HOST=0.0.0.0
  explicitly exposes LAN); Vite middleware in dev, `dist/` in prod; `GET /api/health`.
- **Reality routes (11):** `/api/realities/folders`, `/bin`, `/bin/move-to-bin`, `/bin/restore`,
  `/bin/purge`, `/bin/empty`, `/rename-folder`, `/create-folder`, `/delete-folder`,
  `/write-data`, `/daemon-status`.
- **Sky Studio routes (6):** `/api/realities/sky/status|upload|activate|delete|settings|asset/...`.
- **`realityDaemon`** (`start(3000)`): scans `src/realities/` every **3000 ms**; auto-repairs any
  folder missing `index.ts`/`surface.ts` from templates (skipping `bin` and canonical `solPrime`;
  **20 s grace** for app-written folders); executes Quantum Bin disk ops with sanitize +
  containment (`paths.ts`).

### 11.2 Desktop adapter

`src/platform/desktop/adapter.ts` is the single seam: on web it `fetch`es the routes above; inside
Tauri it `invoke`s the Rust commands. Route strings ↔ command names are locked pairs (§4.1.6).

### 11.3 Tauri shell (Rust)

- ~27 commands in `src-tauri/src/lib.rs`: `cosmos_status`, `cosmos_kepler_batch`,
  `cosmos_physics_batch`, `cosmos_benchmark` (+ terrain), `store_state` / `store_payload` /
  loaders, `reality_*` CRUD + bin, `sky_*` Studio.
- **`build.rs` — the C++ core compiles INTO the binary (no DLL loading, ever):** probes
  `cl` / `g++` / `c++` / `clang++` on PATH; if found, the `cc` crate compiles
  `src/platform/native/cosmos_engine.cpp` (C++20, `/O2 /arch:AVX2` MSVC or
  `-O3 -ffast-math -mavx2` GCC/Clang) and sets `cargo:rustc-cfg=cosmos_cpp`; else
  `cosmos_stub` (zero-returning stubs reporting version `"stub"` — the JS bridge refuses to claim
  native physics on a stub).
- No C++ toolchain on the machine? Run `scripts/setup-windows-toolchain.ps1` once (installs
  VS Build Tools 2022 MSVC + Windows SDK + CMake + Rust MSVC target), then `npm run desktop:build`.

### 11.4 The physics backend chain (`src/platform/native/cpp_bridge.ts`)

```
1. native-cpp   Tauri desktop: invoke('cosmos_status'); accepted only if version ≠ 'stub'
2. wasm         browser: HEAD-probe ./wasm/cosmos_engine.js (Emscripten build via
                scripts/build-wasm.sh — optional, currently absent) → dynamic import
3. typescript   always-available reference (version label 'ts-reference')
```

- `PHYSICS_FIELD_COUNT = 41` — the telemetry record layout, kept in lockstep across all three
  implementations (C++ `COSMOS_PHYSICS_FIELD_COUNT`, Rust mirror, TS mirror).
- **Parity contract:** `verifyParity()` runs a fixed synthetic batch of **12 bodies** through the
  active backend AND the TS reference, max relative delta `|a−b| / max(1, |b|)` (NaN pairs
  exempt); pass = **< 1e-9** (or backend is `typescript`, which trivially matches itself).
- **Benchmark contract:** `benchmark(128, 100)` — 128 bodies, 100 RK4 gravity iterations
  (RK4 exists in the C++ core as the benchmark kernel; TS uses an equivalent burn);
  throughput = bodies² × iterations / seconds; a second short run times step latency.
- The engine consumes `keplerBatch` only (every 2nd frame, §10.2); `physicsBatch` is exercised by
  Verify Parity. UI: the engine card in the Core Console shows ACTIVE BACKEND / CORE VERSION /
  throughput / latency + Verify Parity + Run RK4 Benchmark + quality tiers + build pipelines.

---

## 12. ⭐ PHASE-BY-PHASE REBUILD PROTOCOL (PHASE 0–11)

> Build in this exact order. Each phase lists its goal, the steps, and ACCEPTANCE CRITERIA that
> must pass before the next phase begins. Historical evidence for each phase lives in
> `docs/ROUND-*.md` (map given per phase). Run `npm run verify` at every phase gate.

### Phase 0 — Skeleton & Toolchain
**Goal:** a booting strict-TS Vite app with the exact topology of §3.
Steps: `npm init`, install the exact stack of §2; create the folder tree (§3); `tsconfig` strict;
Tailwind v4 + theme tokens; vendored `public/fonts` + `public/pyodide`; `index.html` with root div;
`npm run dev` serves on :3000 via `tsx server/index.ts`.
**Accept:** `npm run typecheck` passes; page loads with the theme.
*(Historical: repo bootstrap; `docs/AUDIT-2026-09-22.md`.)*

### Phase 1 — Domain & State
**Goal:** the data model and the single mutation surface.
Steps: write `src/domain/universe.ts` + `vault.ts` (§4.3 verbatim); `src/state/` store
(`useSyncExternalStore`), `actions.ts` (reality CRUD, body CRUD, connections, toggles,
bin flow), `persist.ts` (debounced `my-universe:v4` + recovery key); `storageKeys.ts`.
**Accept:** state survives reload; actions have no side effects outside state.

### Phase 2 — Physics Core
**Goal:** the real-physics engine (§6.2, §6.3, §10.1).
Steps: `CONSTANTS`; `BODY_PROFILES` (§6.2 verbatim); `computePhysicsFresh` — all 41 fields,
all 9 formula groups, memoization by signature; `calculateKeplerPosition` (true 3D inclinations);
`nbody.ts` LivingGravityField (Gauss equations, Plummer, KEEPER e ≤ 0.6, Dimensional Anchor
×1e-3, lens-halo multipliers 3.2/2.6/2.2).
**Accept:** unit-check Aurelia = 1 AU / Earth radius / ~1 g; Kepler period of Cinder ≈ 88 d
(TAU/88 speed); parity self-test passes at 1e-9.

### Phase 3 — Engine Core & THE ANCHOR STAR ⭐
**Goal:** the Three.js cosmos boots and the first pillar stands.
Steps: renderer (ACESFilmic, `#04060c`, far 8e6, bloom 0.12/0.15/0.90), camera rig, pick system,
`EngineCallbacks` seam; Universe Surface (dome 460,000, star shells 2,600 + far 320–480k,
nebula clouds, named neighbors); `buildAnchor` per §5.4 — starFrag granulation/limb `pow(mu,0.55)`,
organic corona + Sentiment Aurora uniforms, two counter-rotating halos (9.6/700, 11.4/420,
immuneToVortex), 7.25° obliquity, collider 8.4, cold-open ignition; Core Mode entry
(double-click anchor, H exits); `buildRealityConfig` anchor enforcement.
**Accept:** cold open ignites the star; sunspots + granulation visibly evolve; halo pair
counter-rotates; double-click enters Core Mode; anchor undeletable.
*(Historical: ROUND-7, ROUND-13.)*

### Phase 4 — The Worlds ⭐
**Goal:** the second pillar — planets as memories.
Steps: Sol-Prime seed verbatim (§6.1 table + 3 diary entries + literal clusters/galaxies/lineage);
per-kind builders (§6.5: planet shader w/ sea+clouds+atmo+city lights rules, retrograde spin,
rings with Roche, moons-per-diary formula, streak ring, nebula raymarch, belt 4,800 @ 78–97);
orbit LineLoops (256 samples); generation algorithms (§6.6: name pool, FNV-1a→mulberry32,
ORBIT_LADDER, 10 archetypes, galaxy/cluster generators, golden-angle placement, glass marbles);
DiaryWindow + Book + MediaPlates + export (§6.7); mood → aurora wiring.
**Accept:** all 10 Sol-Prime bodies match the table; aurelia shows oceans + night city lights;
veil spins retrograde with heavy clouds; writing an entry grows a moon; mood shifts the corona.
*(Historical: ROUND-9, 10, 12.)*

### Phase 5 — THE BLACK HOLE ⭐ (the crown jewel)
**Goal:** the third pillar — Eventide, complete.
Steps in order: (1) composite Gargantua per §7.4 (every radius verbatim); (2) spacetime funnel
per §7.5 (44 rings, Flamm paraboloid, lip, melt); (3) raymarched geodesic tier per §7.3 (credit
dgreenheck, MIT, in THIRD-PARTY-NOTICES.md); (4) capability gating + shader-error disarm +
55 ms/180-frame circuit breaker; (5) Black Hole Studio per §7.6 (7 sliders, defaults verbatim,
`eventide-blackhole-change`, Reset to Reference); (6) vault portal traversal per §7.7 (9 phases,
weights, durations, `onPortalPeak('vault')`, vault-pulse torii).
**Accept:** shadow is black with the photon ring; disk beams on the approaching side; switching
quality tiers never kills the hole (composite always returns); Studio sliders bend the geodesic
live and persist; V focuses the hole and the portal dive lands in the vault.
*(Historical: ROUND-16, 17, 19, 20-BLACKHOLE — the round16/17 gauntlets exist to freeze this.)*

### Phase 6 — The Vault & EFS
**Goal:** the encrypted OS inside the hole.
Steps: crypto gate (Argon2id 64 MiB × 3 / PBKDF2 310k/600k floor / AES-GCM-256, §9.2);
EFS CoW filesystem (inodes, shadows, fork/dedup, scrub, pre-rollback safety, §9.3);
triple-tier storage (Tauri FS → OPFS → IndexedDB `eventide-universe`, encrypt-before-persist);
shell (Home/FileManager/Everything/Void) + gate + Monaco (vendored, chunk-split);
21-command terminal; executors table (§9.4); Key Ring (TOTP/courier/breaches); vault-pulse.
**Accept:** vault locks/unlocks; payloads encrypted at rest in every tier; shadows restore with
auto-backup; JS/Python/ISO/ZIP execute inside the sandbox; pulse visibly shakes the torii.
*(Historical: ROUND-15, 20-KEYRING, 21.)*

### Phase 7 — Multiverse & Realities
**Goal:** the bubble cosmos.
Steps: reality registry via `import.meta.glob`; golden-angle placement + glass marbles;
the 11-stage ladder + dials (§8.2 verbatim) + `CosmicLineage` lore chain; MultiverseBar +
CosmicWebHUD + lineage modal; reality switching (pointer flip + ensureBucket); create-reality
flow (config + disk folder + codegen); Quantum Bin (move/restore/purge/empty + orphan adoption);
Kamui warp 3.6 s traversal (§10.5); Dimensional Barrier torii on the active bubble.
**Accept:** all 5 seeded realities match §8.1 exactly; Kamui flies web ↔ multiverse; deleted
realities land in the bin and restore intact; sol-prime refuses deletion.
*(Historical: ROUND-7, 9, 11.)*

### Phase 8 — UI Shell & Console
**Goal:** every control surface.
Steps: App mode manager (space/core/vault) + keyboard map (C core, V vault, H home, G survey HUD,
M mute, Space pause, ? keys, Ctrl+K palette, Esc back); CoreConsole bento (Command Matrix radar +
vitals + physics laws + quick pods + engine card + Black Hole Studio + chronicle; Realities Grid;
Deep Hierarchy; Quantum Bin) — reality cards live ONLY in the Realities Grid tab; CommandPalette
("Open Core Console", warp/dive/fly-to); PhysicsHUD telemetry tabs (Orbital/Gravity/Thermo/
Relativity/Spin & Galaxy/Laws); ToastHost.
**Accept:** every console tab works; palette opens with Ctrl+K and can reach the console.
*(Historical: ROUND-13.)*

### Phase 9 — Server & Disk Mirror
**Goal:** the reality disk daemon.
Steps: Express 5 host + all 17 routes (§11.1 verbatim strings); `realityDaemon` (3 s scan,
template repair, 20 s grace, bin ops, containment); `realitySync` heartbeat client
(3 s/8 s/20 s + retry queue + self-heal); `write-data` full world-database export per mutation;
Sky Studio (upload/activate/delete + sky.json + surface presets wiring).
**Accept:** deleting a reality moves its folder to `src/realities/bin/`; hand-deleting a folder
self-heals; the console's Disk Sync tile reflects daemon truth.
*(Historical: ROUND-12.)*

### Phase 10 — Desktop (Tauri + C++)
**Goal:** the native shell.
Steps: Tauri 2 scaffold (id `com.chasinlove.myuniverse`, CSP `wasm-unsafe-eval`); Rust commands
(§11.3); `build.rs` cc-compilation of `cosmos_engine.cpp` (cosmos_cpp vs cosmos_stub);
`cpp_bridge.ts` tier chain + parity + benchmark (§11.4); engine card wiring; desktop adapters for
storage payloads and reality folders.
**Accept:** desktop build runs with NATIVE C++ CORE badge when a toolchain exists (TS fallback
badge in the browser is CORRECT behavior, not a bug); Verify Parity green; benchmark fills
throughput/latency.
*(Historical: ROUND-19+ platform work; CI desktop.yml.)*

### Phase 11 — Verification Gauntlets
**Goal:** make drift impossible.
Steps: `scripts/audit-architecture.ts` (dead exports/types/CSS, import graph, 9 locked-path
groups, `--snapshot` baseline); `round16-gauntlet.ts` (Schwarzschild optics source asserts);
`round17-gauntlet.ts` (funnel source asserts); `smoke.ts` (headless Playwright vs
`scripts/verify/reference-hole.png` reference frame + metrics); wire `npm run verify` =
typecheck + gauntlets + smoke; regenerate the architecture diagram.
**Accept:** `npm run verify` green end-to-end; `audit:arch --check` exits 0.
*(Historical: R52 verification layer.)*

---

## 13. VERIFICATION, ACCEPTANCE & GLOSSARY

### 13.1 The verification stack

```
npm run typecheck   # tsc --noEmit — the type law
npm run audit:arch  # structural drift vs scripts/architecture-snapshot.json (--check exits 1)
npm run smoke       # headless playwright vs reference frame
npm run verify      # typecheck + round16-gauntlet + round17-gauntlet + smoke  ← run at every gate
```

### 13.2 The zero-difference acceptance checklist

A rebuild is complete when ALL of these are true:

- [ ] §6.1 table renders exactly (all 10 bodies, palettes, orbits) and §8.1 identities match.
- [ ] Anchor star: granulated photosphere, organic corona + mood aurora, twin counter-rotating
      halos, 7.25° tilt, cold open, undeletable, double-click → Core Mode.
- [ ] Every world's PhysicsHUD agrees with §6.3 formulas (spot-check Aurelia ≈ 1 AU / 1 g /
      365-day period; Cinder ≈ 0.5 AU, e ≈ 0.2056).
- [ ] Eventide: composite radii exact (§7.4), geodesic shadow + Doppler disk, funnel in the
      surface, portal dive opens the vault, Studio defaults = §7.6, safety nets disarm gracefully.
- [ ] Appendix A files re-typed verbatim compile and render identically: the geodesic
      raymarcher, the composite + funnel, the tuning store + Studio UI, and the master GLSL
      library (star granulation, corona aurora, planet biomes, Kamui vertex tear, nebula).
- [ ] Diary entry → moon appears; mood → aurora shifts.
- [ ] Vault: Argon2id seal, CoW shadows restore with pre-rollback safety, 21 commands, all six
      executor sandboxes run.
- [ ] Multiverse: 11-stage ladder with dials; Kamui warp; Quantum Bin round-trip; disk mirror
      heals a deleted folder.
- [ ] `npm run verify` fully green; `audit:arch --check` exits 0.

### 13.3 Known stale-comment flags (fix the comment, not the code)

1. `capability.ts` says the frame-budget breaker stands down past "~34 ms" — the operative
   threshold is **55 ms avg over 180 frames** (`engine.ts guardRaymarch`).
2. `physicsEngine.ts` comment says "the vault −12°" — Eventide's authored incl is **−0.18 rad
   (≈ −10.3°)** in the seed.
3. The old README claimed 10 cosmological scales and 8 canonical realities — the truth is
   **11 stages** (`hierarchyStages.ts`) and the **5 seeded realities of §8.1**.

### 13.4 Historical log (the build order that produced this spec)

`docs/AUDIT-2026-09-22.md` (Round 1 repair) → ROUND-7 (reality isolation + luxury console) →
ROUND-9 (whole-project polish) → ROUND-10 (visible physics) → ROUND-11 (Reality Sky Studio) →
ROUND-12 (the universe remembers — persistence) → ROUND-13 (glass command deck) → ROUND-14
(Einstein lensing + Living Gravity) → ROUND-15 (file manager pro) → ROUND-16 (true Schwarzschild
optics) → ROUND-17 (spacetime funnel) → ROUND-19 (ported geodesic black hole) → ROUND-20-BLACKHOLE
+ ROUND-20-KEYRING → ROUND-21 (envelope-sealing vault architecture) → R52 (architecture
consolidation: ui/, platform/, domain/, state/, verification layer). Rounds 8 and 18 do not
exist (historical gap — do not invent them).

### 13.5 Glossary

**Anchor Star** — the per-reality sun, bodies[0], undeletable (§5). **Eventide** — the vault
black hole (§7). **EFS** — Eventide Filesystem, the CoW vault fs (§9). **Kamui** — the
dimensional traversal (3.6 s multiverse warp; 9-phase local portal). **Quantum Bin** — the
deleted-realities dustbin (§8.3). **Living Gravity** — the Gauss-equation N-body layer (§10.4).
**Dimensional Anchor** — the ×1e-3 dynamic-mass tempering of hole/vault. **Sentiment Aurora** —
diary moods flowing through the star's corona. **Universe Surface** — the cosmic backdrop
subsystem. **Gauntlets** — source-assertion tests freezing the black hole optics (round16/17).

---

## APPENDIX A — THE COSMIC GRAPHICS CODE (VERBATIM)

> This appendix carries the **actual implementation code** of the three pillars' graphics —
> byte for byte from the working codebase. If the repository is ever destroyed, these files
> can be re-typed from this document and the universe will render identically. Each file
> below is complete (not excerpted unless marked). Place them at the paths shown.

### A.1 The raymarched geodesic black hole — `src/engine/blackholeRaymarch.ts` (COMPLETE)

```typescript
import * as THREE from 'three';
import type { BlackHoleVisual } from './blackhole';
import { BLACKHOLE_CHANGE_EVENT, getBlackHoleParams, type BlackHoleParams } from './blackholeParams';

/**
 * Geodesic black hole renderer — the cinematic tier.
 *
 * ROUND 20 — the corrected port of https://github.com/dgreenheck/webgpu-black-hole
 * (Copyright (c) 2025 Daniel Greenheck, MIT License). Round 19 transliterated
 * his physics but broke the presentation in five ways; this round fixes all of
 * them and, more importantly, adopts his RUNTIME-TUNED look (the config that
 * produces the demo's reference image) instead of his shader fallbacks:
 *
 *   • HIS EXACT UNIT CONVENTION: the march runs in units where rs = 0.8
 *     (his mass 0.4 × 2). One uScale uniform converts world → shader units,
 *     so every constant below transfers from his config VERBATIM — zero
 *     rescaling drift, and the renderer stays scale-invariant at any hole
 *     size. R20.4: rs is the live uniform uRs (R20.3's baked 0.66 shrank the
 *     shadow and grandified the disk — away from the reference look).
 *   • HIS LENSING, VERBATIM: his bend per step is (rs/r²)·stepSize·lensing —
 *     the SAME form as ours — so bend per unit path = rs × lensing and the
 *     step size CANCELS. uLensing is therefore his gravitationalLensing
 *     (2.4) directly, not a step-compensated derivative: R20's 8.0 ("0.3 ×
 *     8.0 = 1.0 × 2.4") compared per-step products, forgot his step is 3.33×
 *     longer, and bent light 2.75× too hard — a bloated shadow wrapping the
 *     disk into a donut. (Round 19 paired his fallback step with his
 *     fallback lensing → far too little bending → no wrap, a flat band.)
 *   • THE QUAD BILLBOARDS EVERY FRAME (updateRaymarchUniforms copies the
 *     camera rotation). Round 19 left it facing world +Z — a sheared window
 *     that clipped the photon ring and vanished edge-on.
 *   • HIS GAMMA STEP STAYS. His demo applies pow(1/2.2) inside the material
 *     and THEN the renderer's ACES + sRGB output — exactly our composer
 *     (material → UnrealBloom → OutputPass). Removing it would be the
 *     unfaithful choice, not the fix.
 *   • HIS TUNED CONFIG, verbatim: disk 4.1–14.5, T_peak 49.78 kK, falloff
 *     5.22, brightness 5, rotation −8.7, Doppler 1.0, turbulence
 *     1.81 / 0.75 / 7.4, cycle 5, lacunarity 3, persistence 0.8, softness
 *     0.18 / 0.5 — and the FULL 121-entry Mitchell–Charity LUT to 40,000 K
 *     (Round 19 truncated it at 10,000 K, so his blue-white core was impossible).
 *   • HIS DISK FUNCTION transliterated line-for-line, including the
 *     rotation-sign flip in the Doppler beaming (his rotation is NEGATIVE —
 *     it decides which side of the disk beams hot at the viewer).
 *
 * What we deliberately keep OURS: escaped rays exit transparent — our real
 * universe is the background, his procedural stars/nebulae are dropped.
 * Captured rays stay opaque (his contract): the shader owns the black shadow,
 * disk light crossing in front of it survives.
 *
 * Units: 1 shader unit = rs_world / uRs (rs = mass × 2; ÷0.8 at the default
 * mass 0.4 — uScale·uRs always equals rs_world, so the shader shadow stays
 * aligned with the composite's baked sphere beneath at any mass). The march
 * sphere (r ≤ 16), capture (r < 1.01·uRs) and escape (r > 100) all live in
 * that space.
 *
 * SAFETY CONTRACT (preserved): this is an overlay on the infallible
 * composite. If its shader fails, the eventide-shader-error hook hides it,
 * the engine restores the composite's baked disk, and the hole survives.
 * Nothing here writes depth.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec4 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec4 vWorld;

uniform vec3 uCamPos;
uniform vec3 uCenter;      /* hole center in world space */
uniform float uScale;      /* world units per shader unit (rs_world × 1.25) */
uniform float uTime;
uniform float uIntensity;
uniform int uSteps;
uniform mat3 uDiskBasis;   /* world → disk-local rotation */
uniform sampler2D uBlackbody;

/* ---- dgreenheck's RUNTIME config, verbatim (shader units, rs = uRs) ---- */
uniform float uRs;           /* Schwarzschild radius in shader units = mass × 2
                                (his blackHoleMass; 0.8 at the default mass) */
uniform float uDiskInner;    /* 4.1 */
uniform float uDiskOuter;    /* 14.5 */
uniform float uDiskTemp;     /* 49.78  (thousands of K) */
uniform float uTempFalloff;  /* 5.22 */
uniform float uDiskBright;   /* 5.0 */
uniform float uDoppler;      /* 1.0 */
uniform float uRotSpeed;     /* -8.7 */
uniform float uCycleTime;    /* 5.0 */
uniform float uTurbScale;    /* 1.81 */
uniform float uTurbStretch;  /* 0.75 */
uniform float uTurbSharp;    /* 7.4 */
uniform float uTurbLac;      /* 3.0 */
uniform float uTurbPers;     /* 0.8 */
uniform float uSoftInner;    /* 0.18 */
uniform float uSoftOuter;    /* 0.5 */
uniform float uLensing;      /* his gravitationalLensing — bend per unit path
                                = uRs × uLensing, step-size independent */

#define MARCH_STEP 0.3

/* ---- Mitchell Charity blackbody colors (CIE 1931), via dgreenheck's LUT ----
   121 texels: 1000K..10000K in 100K steps, then 11000K..40000K in 1KK steps —
   his exact two-segment table; piecewise texel mapping keeps the linear
   filtering exact within each segment. */
vec3 blackbody(float tempK) {
  float t = clamp(tempK, 1000.0, 40000.0);
  float idx = t <= 10000.0
    ? (t - 1000.0) * 0.01
    : 90.0 + (t - 10000.0) * 0.001;
  float u = (idx + 0.5) / 121.0;
  return texture2D(uBlackbody, vec2(u, 0.5)).rgb;
}

/* ---- his hash / value-noise / 4-octave FBM ---- */
float hash31(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = hash31(i);
  float b = hash31(i + vec3(1.0, 0.0, 0.0));
  float c = hash31(i + vec3(0.0, 1.0, 0.0));
  float d = hash31(i + vec3(1.0, 1.0, 0.0));
  float e = hash31(i + vec3(0.0, 0.0, 1.0));
  float g = hash31(i + vec3(1.0, 0.0, 1.0));
  float h = hash31(i + vec3(0.0, 1.0, 1.0));
  float k = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(a, b, u.x), mix(c, d, u.x), u.y),
    mix(mix(e, g, u.x), mix(h, k, u.x), u.y),
    u.z);
}
float fbm(vec3 p, float lac, float pers) {
  float v = 0.0;
  float a = 0.5;
  v += noise3(p) * a; p *= lac; a *= pers;
  v += noise3(p) * a; p *= lac; a *= pers;
  v += noise3(p) * a; p *= lac; a *= pers;
  v += noise3(p) * a;
  return v;
}

/* ---- accretion disk color at a plane crossing — HIS createAccretionDiskColor,
   line for line. hitR/hitAngle in the disk-local frame (shader units);
   rayDirLocal is the local-frame photon direction for the Doppler term. ---- */
vec4 diskColor(float hitR, float hitAngle, vec3 rayDirLocal) {
  float normR = clamp((hitR - uDiskInner) / (uDiskOuter - uDiskInner), 0.0, 1.0);

  /* Temperature profile: T(r) = T_peak · (r_inner / r)^α */
  float tempK = uDiskTemp * 1000.0 * pow(uDiskInner / hitR, uTempFalloff);
  vec3 col = blackbody(tempK);

  /* Doppler beaming: D = 1/(1 − β·cosθ), brightness ∝ D³.
     rotationSign — his disk spins NEGATIVELY; it flips the beam side. */
  float rotationSign = sign(uRotSpeed);
  vec3 velDir = vec3(-sin(hitAngle) * rotationSign, 0.0, cos(hitAngle) * rotationSign);
  float beta = 0.3 / sqrt(hitR / uDiskInner);
  float cosA = dot(velDir, rayDirLocal);
  float dopplerBoost = pow(1.0 / (1.0 - beta * cosA), 3.0 * uDoppler);
  col *= clamp(dopplerBoost, 0.1, 5.0);

  /* Edge falloff (his diskEdgeSoftnessInner/Outer) */
  float edge = smoothstep(0.0, uSoftInner, normR) * smoothstep(1.0, 1.0 - uSoftOuter, normR);

  /* Turbulent ring pattern with cyclic-time crossfade (no winding artifacts):
     Keplerian shear ω ∝ r^−1.5, anisotropic FBM (radial rings, azimuthal arcs) */
  float cyclicTime = mod(uTime, uCycleTime);
  float blendF = cyclicTime / uCycleTime;
  float phase1 = cyclicTime * uRotSpeed / pow(hitR, 1.5);
  float phase2 = (cyclicTime + uCycleTime) * uRotSpeed / pow(hitR, 1.5);
  float stretch = max(uTurbStretch, 0.1);
  vec3 nc1 = vec3(hitR * uTurbScale, cos(hitAngle + phase1) / stretch, sin(hitAngle + phase1) / stretch);
  vec3 nc2 = vec3(hitR * uTurbScale, cos(hitAngle + phase2) / stretch, sin(hitAngle + phase2) / stretch);
  float turb = mix(fbm(nc2, uTurbLac, uTurbPers), fbm(nc1, uTurbLac, uTurbPers), blendF);
  float ringOpacity = pow(clamp(turb, 0.0, 1.0), uTurbSharp);

  return vec4(col * uDiskBright, ringOpacity * edge);
}

void main() {
  vec3 p = (uCamPos - uCenter) / uScale;
  vec3 v = normalize(vWorld.xyz - uCamPos);

  vec3 color = vec3(0.0);
  float alpha = 0.0;
  bool captured = false;

  /* COARSE APPROACH — the one adaptation his fullscreen demo never needed:
     our camera can be hundreds of units out. Walk the ray straight down to
     the r=16 march sphere in a few long steps (bending is ∝ 1/r² — out there
     the leg stays straight, so its plane crossings are exact for any step
     length and are composited too). Steps brake to land ON the sphere
     (min(r−16, r/2)), never overshooting into the capture zone. */
  for (int i = 0; i < 12; i++) {
    float r0 = length(p);
    if (r0 <= 16.0) break;
    vec3 pPrev = p;
    p += v * min(r0 - 16.0, r0 * 0.5);
    vec3 lPrevA = uDiskBasis * pPrev;
    vec3 lCurA = uDiskBasis * p;
    if (lPrevA.y * lCurA.y < 0.0 && alpha < 0.99) {
      float fA = lPrevA.y / (lPrevA.y - lCurA.y);
      vec3 hitA = mix(lPrevA, lCurA, clamp(fA, 0.0, 1.0));
      float hitRA = length(hitA.xz);
      if (hitRA > uDiskInner && hitRA < uDiskOuter) {
        vec4 dA = diskColor(hitRA, atan(hitA.z, hitA.x), normalize(uDiskBasis * v));
        float remA = 1.0 - alpha;
        color += dA.rgb * dA.a * remA;
        alpha += remA * dA.a;
      }
    }
  }

  /* HIS MARCH — bending = uRs/r² per unit × uLensing (his invariant: bend
     per unit path = uRs × uLensing, step-size independent), capture
     1.01·uRs, escape 100. EVERY disk-plane crossing along the BENT
     ray paints — that is what builds the continuous lensed halo over and
     under the shadow, by construction.
     ADAPTIVE STEP (Round 20, iGPU lifeline): the per-unit bending of his
     integrator is step-size-INDEPENDENT (bend ∝ step·lensing per step, over
     a step of length step), so growing the step away from the hole keeps the
     exact same trajectory at ~3× fewer iterations — fine 0.3 where the
     photon-ring arcs live (r < 8), up to 1.2 out at the march sphere. */
  for (int i = 0; i < 128; i++) {
    if (i >= uSteps) break;
    if (alpha > 0.99) break;
    float r = length(p);
    if (r < uRs * 1.01) { captured = true; break; }
    if (r > 100.0) break;
    /* fully clear of the disk and receding — no further crossing can occur
       and the residual bending only affects the (transparent) background */
    if (r > uDiskOuter && dot(v, p) > 0.0) break;

    float stepLen = MARCH_STEP * clamp(r * 0.125, 1.0, 4.0);
    /* gravitational light bending: a = −rs/r² toward the center */
    vec3 toCenter = -p / r;
    v = normalize(v + toCenter * (uRs / (r * r)) * stepLen * uLensing);
    vec3 pPrev = p;
    p += v * stepLen;

    vec3 lPrev = uDiskBasis * pPrev;
    vec3 lCur = uDiskBasis * p;
    if (lPrev.y * lCur.y < 0.0 && alpha < 0.99) {
      float f = lPrev.y / (lPrev.y - lCur.y);
      vec3 hit = mix(lPrev, lCur, clamp(f, 0.0, 1.0));
      float hitR = length(hit.xz);
      if (hitR > uDiskInner && hitR < uDiskOuter) {
        /* hit and angle already live in the disk-LOCAL frame (via uDiskBasis);
           the photon direction must be expressed in the SAME frame for the
           Doppler term. The basis is a pure rotation, so length(v) survives. */
        vec4 d = diskColor(hitR, atan(hit.z, hit.x), normalize(uDiskBasis * v));
        float remaining = 1.0 - alpha;
        color += d.rgb * d.a * remaining;
        alpha += remaining * d.a;
      }
    }
  }

  /* HIS OUTPUT CONTRACT: captured rays carry the accumulated foreground disk
     light, fully opaque (the shadow itself is black because nothing
     accumulated; disk light in FRONT of the shadow survives). Escaped
     untouched rays are transparent — our sky shows through. His gamma step
     is kept: his pipeline runs it before the renderer's ACES + sRGB, and so
     does ours (OutputPass). */
  color *= uIntensity;
  color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));
  gl_FragColor = vec4(color, captured ? 1.0 : clamp(alpha, 0.0, 1.0));
}
`;

/* ---- Mitchell Charity blackbody anchors (CIE 1931 → sRGB) ----
   Transcribed from dgreenheck/webgpu-black-hole (MIT), who transcribed it
   from http://www.vendian.org/mncharity/dir3/blackbody/ */
const BLACKBODY_ANCHORS: Array<[number, number, number, number]> = [
  [1000, 1, 0.0337, 0], [1100, 1, 0.0592, 0], [1200, 1, 0.0846, 0], [1300, 1, 0.1096, 0], [1400, 1, 0.1341, 0],
  [1500, 1, 0.1578, 0], [1600, 1, 0.1806, 0], [1700, 1, 0.2025, 0], [1800, 1, 0.2235, 0], [1900, 1, 0.2434, 0],
  [2000, 1, 0.2647, 0.0033], [2100, 1, 0.2889, 0.012], [2200, 1, 0.3126, 0.0219], [2300, 1, 0.336, 0.0331], [2400, 1, 0.3589, 0.0454],
  [2500, 1, 0.3814, 0.0588], [2600, 1, 0.4034, 0.0734], [2700, 1, 0.425, 0.0889], [2800, 1, 0.4461, 0.1054], [2900, 1, 0.4668, 0.1229],
  [3000, 1, 0.487, 0.1411], [3100, 1, 0.5067, 0.1602], [3200, 1, 0.5259, 0.18], [3300, 1, 0.5447, 0.2005], [3400, 1, 0.563, 0.2216],
  [3500, 1, 0.5809, 0.2433], [3600, 1, 0.5983, 0.2655], [3700, 1, 0.6153, 0.2881], [3800, 1, 0.6318, 0.3112], [3900, 1, 0.648, 0.3346],
  [4000, 1, 0.6636, 0.3583], [4100, 1, 0.6789, 0.3823], [4200, 1, 0.6938, 0.4066], [4300, 1, 0.7083, 0.431], [4400, 1, 0.7223, 0.4556],
  [4500, 1, 0.736, 0.4803], [4600, 1, 0.7494, 0.5051], [4700, 1, 0.7623, 0.5299], [4800, 1, 0.775, 0.5548], [4900, 1, 0.7872, 0.5797],
  [5000, 1, 0.7992, 0.6045], [5100, 1, 0.8108, 0.6293], [5200, 1, 0.8221, 0.6541], [5300, 1, 0.833, 0.6787], [5400, 1, 0.8437, 0.7032],
  [5500, 1, 0.8541, 0.7277], [5600, 1, 0.8642, 0.7519], [5700, 1, 0.874, 0.776], [5800, 1, 0.8836, 0.8], [5900, 1, 0.8929, 0.8238],
  [6000, 1, 0.9019, 0.8473], [6100, 1, 0.9107, 0.8707], [6200, 1, 0.9193, 0.8939], [6300, 1, 0.9276, 0.9168], [6400, 1, 0.9357, 0.9396],
  [6500, 1, 0.9436, 0.9621], [6600, 1, 0.9513, 0.9844], [6700, 0.9937, 0.9526, 1], [6800, 0.9726, 0.9395, 1], [6900, 0.9526, 0.927, 1],
  [7000, 0.9337, 0.915, 1], [7100, 0.9157, 0.9035, 1], [7200, 0.8986, 0.8925, 1], [7300, 0.8823, 0.8819, 1], [7400, 0.8668, 0.8718, 1],
  [7500, 0.852, 0.8621, 1], [7600, 0.8379, 0.8527, 1], [7700, 0.8244, 0.8437, 1], [7800, 0.8115, 0.8351, 1], [7900, 0.7992, 0.8268, 1],
  [8000, 0.7874, 0.8187, 1], [8100, 0.7761, 0.811, 1], [8200, 0.7652, 0.8035, 1], [8300, 0.7548, 0.7963, 1], [8400, 0.7449, 0.7894, 1],
  [8500, 0.7353, 0.7827, 1], [8600, 0.726, 0.7762, 1], [8700, 0.7172, 0.7699, 1], [8800, 0.7086, 0.7638, 1], [8900, 0.7004, 0.7579, 1],
  [9000, 0.6925, 0.7522, 1], [9100, 0.6848, 0.7467, 1], [9200, 0.6774, 0.7414, 1], [9300, 0.6703, 0.7362, 1], [9400, 0.6635, 0.7311, 1],
  [9500, 0.6568, 0.7263, 1], [9600, 0.6504, 0.7215, 1], [9700, 0.6442, 0.7169, 1], [9800, 0.6382, 0.7124, 1], [9900, 0.6324, 0.7081, 1],
  [10000, 0.6268, 0.7039, 1], [11000, 0.5791, 0.6674, 1], [12000, 0.5431, 0.6389, 1], [13000, 0.5152, 0.6162, 1], [14000, 0.493, 0.5978, 1],
  [15000, 0.4749, 0.5824, 1], [16000, 0.4599, 0.5696, 1], [17000, 0.4474, 0.5586, 1], [18000, 0.4367, 0.5492, 1], [19000, 0.4275, 0.541, 1],
  [20000, 0.4196, 0.5339, 1], [25000, 0.3917, 0.5083, 1], [30000, 0.3751, 0.4926, 1], [35000, 0.3641, 0.4821, 1], [40000, 0.3563, 0.4745, 1],
];

function blackbodyAt(tempK: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, tempK));
  const anchors = BLACKBODY_ANCHORS;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (t >= anchors[i][0] && t <= anchors[i + 1][0]) {
      const f = (t - anchors[i][0]) / (anchors[i + 1][0] - anchors[i][0]);
      /* anchors are [tempK, r, g, b] — interpolate channels j+1 */
      return [0, 1, 2].map((j) => anchors[i][j + 1] + (anchors[i + 1][j + 1] - anchors[i][j + 1]) * f) as [number, number, number];
    }
  }
  const last = anchors[anchors.length - 1];
  return [last[1], last[2], last[3]];
}

/* The shader LUT: 100K samples 1000–10000K, then 1K samples 11000–40000K —
   his exact two-loop construction (121 entries). */
const BLACKBODY_LUT: Array<[number, number, number]> = (() => {
  const rows: Array<[number, number, number]> = [];
  for (let t = 1000; t <= 10000; t += 100) rows.push(blackbodyAt(t));
  for (let t = 11000; t <= 40000; t += 1000) rows.push(blackbodyAt(t));
  return rows;
})();

/** TS mirror of the shader's LUT lookup — for verification gauntlets. */
export function blackbodyColorOf(tempK: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, tempK));
  const idx = t <= 10000 ? (t - 1000) * 0.01 : 90 + (t - 10000) * 0.001;
  const i = Math.min(119, Math.max(0, Math.floor(idx)));
  const f = idx - i;
  const a = BLACKBODY_LUT[i];
  const b = BLACKBODY_LUT[Math.min(120, i + 1)];
  return [0, 1, 2].map((j) => a[j] + (b[j] - a[j]) * f) as [number, number, number];
}

function buildBlackbodyLut(): THREE.DataTexture {
  const data = new Uint8Array(BLACKBODY_LUT.length * 4);
  BLACKBODY_LUT.forEach((c, i) => {
    data[i * 4] = Math.round(Math.min(1, c[0]) * 255);
    data[i * 4 + 1] = Math.round(Math.min(1, c[1]) * 255);
    data[i * 4 + 2] = Math.round(Math.min(1, c[2]) * 255);
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, BLACKBODY_LUT.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/* the composite's disk plane (must match blackhole.ts) — its inverse rotation
   maps world offsets into the disk-local frame for the plane-crossing test.
   Round 20.1 — THE FRAME FIX: the shader tests the plane on local **Y**
   (lPrev.y · lCur.y, hitR = length(hit.xz)), so the basis must map local +Y
   → the disk normal. R19/R20 built it from (0,0,1)→normal, silently mapping
   local +Y → an in-plane world direction — the disk rendered STANDING
   VERTICAL in the world XY plane instead of lying flat on the XZ ground. */
const DISK_NORMAL = new THREE.Vector3(0.055, 1.0, 0.04).normalize();

function buildDiskBasis(): THREE.Matrix3 {
  const localToWorld = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), DISK_NORMAL);
  const worldToLocal = localToWorld.clone().invert();
  return new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(worldToLocal));
}

export interface RaymarchBlackHoleOptions {
  /** global emission multiplier */
  intensity?: number;
  /** ray steps (quality) */
  steps?: number;
}

/** Soft radial glow texture — the local stand-in for the demo's bloom
    (strength 0.68 / threshold 0.4, far hotter than the project-wide bloom
    the planets depend on). Warm white core → amber → transparent. */
function buildGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0.00, 'rgba(255, 244, 224, 0.85)');
  g.addColorStop(0.22, 'rgba(255, 214, 150, 0.42)');
  g.addColorStop(0.45, 'rgba(255, 166, 87, 0.16)');
  g.addColorStop(0.72, 'rgba(120, 60, 24, 0.05)');
  g.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/**
 * Builds the geodesic renderer. Returns null when the caller should use the
 * composite alone (unsupported tier). Same contract as ever: parent the
 * group to the body, never move it.
 */
export function createRaymarchBlackHole(R: number, opts: RaymarchBlackHoleOptions = {}): BlackHoleVisual {
  const rs = R * 0.62;
  /* Round 20.2 — 1.35 pushes the white-hot band past the project bloom
     threshold (0.90) so it visibly blazes, as in the demo */
  const intensity = opts.intensity ?? 1.35;
  /* R20.4 — start from the persisted tuning panel (defaults = the reference
     config). Mass sets the shader-space rs = mass × 2; uScale tracks it so
     uScale·uRs stays = rs_world — the shader shadow never drifts off the
     composite's baked sphere beneath, at any mass. */
  const params = getBlackHoleParams();
  const group = new THREE.Group();
  group.userData.baseIntensity = intensity;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    /* the march accumulates PREMULTIPLIED color (each hit adds rgb·α), so
       blending must be premultiplied too — plain NormalBlending would apply
       the alpha a second time and sink the disk back into mud (the R47 sin) */
    blending: THREE.NormalBlending,
    premultipliedAlpha: true,
    side: THREE.DoubleSide,
    uniforms: {
      uCamPos: { value: new THREE.Vector3() },
      uCenter: { value: new THREE.Vector3() },
      uScale: { value: rs / (params.mass * 2) },  /* world per shader unit */
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uSteps: { value: Math.max(48, Math.min(96, opts.steps ?? 96)) },
      uDiskBasis: { value: buildDiskBasis() },
      uBlackbody: { value: buildBlackbodyLut() },
      /* dgreenheck's runtime config — panel-tunable via blackholeParams (R20.4) */
      uRs: { value: params.mass * 2 },
      uDiskInner: { value: params.diskInner },
      uDiskOuter: { value: params.diskOuter },
      uDiskTemp: { value: 49.78 },
      uTempFalloff: { value: 5.22 },
      uDiskBright: { value: params.brightness },
      uDoppler: { value: params.doppler },
      uRotSpeed: { value: params.rotSpeed },
      uCycleTime: { value: 5.0 },
      uTurbScale: { value: 1.81 },
      uTurbStretch: { value: 0.75 },
      uTurbSharp: { value: 7.4 },
      uTurbLac: { value: 3.0 },
      uTurbPers: { value: 0.8 },
      uSoftInner: { value: 0.18 },
      uSoftOuter: { value: 0.5 },
      uLensing: { value: params.lensing },
    },
  });

  /* quad frames the disk (14.5 u ≈ 18 rs at the default mass) plus the
     lensed wrap */
  const quadSize = rs * 60;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(quadSize, quadSize), material);
  quad.renderOrder = 12; /* after the composite's transparent layers */
  quad.frustumCulled = false;
  group.add(quad);

  /* Round 20.2 — the local bloom stand-in. The demo's glow comes from its
     hot bloom (0.68 / 0.4); the project-wide bloom is deliberately gentle
     (0.12 / 0.90) to protect the planets. A warm additive halo sized just
     past the disk recreates that soft blaze locally — the side character
     glows without re-lighting the whole universe. Must stay children[1]:
     updateRaymarchUniforms addresses the quad as children[0]. */
  const glowTex = buildGlowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.45,
  }));
  glow.scale.setScalar(rs * 56);
  glow.renderOrder = 11;
  glow.frustumCulled = false;
  group.add(glow);

  /* R20.4 — live tuning: panel changes land on this material immediately.
     Mass below ~0.28 would let the fixed 29 u disk diameter outgrow the
     quad's 60·uRs-u span, so the quad mesh rescales up to keep the disk
     framed (the glow halo stays hole-sized by design). */
  const applyParams = (p: BlackHoleParams) => {
    const shaderRs = p.mass * 2;
    material.uniforms.uRs.value = shaderRs;
    material.uniforms.uScale.value = rs / shaderRs;
    material.uniforms.uDiskInner.value = p.diskInner;
    material.uniforms.uDiskOuter.value = p.diskOuter;
    material.uniforms.uDiskBright.value = p.brightness;
    material.uniforms.uDoppler.value = p.doppler;
    material.uniforms.uRotSpeed.value = p.rotSpeed;
    material.uniforms.uLensing.value = p.lensing;
    quad.scale.setScalar(Math.max(1, 34 / (60 * shaderRs)));
  };
  const onParams = (e: Event) => applyParams((e as CustomEvent<BlackHoleParams>).detail);
  window.addEventListener(BLACKHOLE_CHANGE_EVENT, onParams);
  applyParams(params);

  return {
    group,
    update(time, camQuat, portal) {
      material.uniforms.uTime.value = time;
      /* billboard: copy the camera's world orientation so the quad faces it */
      if (camQuat) quad.quaternion.copy(camQuat);
      /* Round 20.1 — NO portal fade: in cinematic mode this renderer IS the
         hole, and fading it during a dive left the bare black sphere. Full
         glory, always (the baked composite carries portal tear effects when
         it is the active look in fallback mode). */
      material.uniforms.uIntensity.value = intensity;
    },
    dispose() {
      window.removeEventListener(BLACKHOLE_CHANGE_EVENT, onParams);
      quad.geometry.dispose();
      const lut = material.uniforms.uBlackbody.value as THREE.DataTexture;
      lut.dispose();
      glow.material.map?.dispose();
      glow.material.dispose();
      material.dispose();
    },
  };
}

/**
 * Convenience wrapper the engine calls per frame with the live camera. Sets
 * EVERYTHING the shader needs: the billboard orientation (Round 20 — the R19
 * sheared-window bug), the true camera position for the geodesic integration,
 * the hole's world center, time, and the intensity. The portal argument is
 * accepted for interface compatibility but deliberately IGNORED since
 * Round 20.1 — fading this renderer during a dive left the bare black sphere.
 */
export function updateRaymarchUniforms(
  visual: BlackHoleVisual,
  camera: THREE.Camera,
  time: number,
  _portal?: number,
): void {
  const quad = visual.group.children[0] as THREE.Mesh | undefined;
  const mat = quad?.material as THREE.ShaderMaterial | undefined;
  if (!quad || !mat || !mat.uniforms) return;
  /* billboard: the quad must face the camera EVERY frame or the lensed image
     reads as a sheared window clipped by the quad's straight edges */
  if (camera.quaternion) quad.quaternion.copy(camera.quaternion);
  mat.uniforms.uCenter.value.setFromMatrixPosition(visual.group.matrixWorld);
  mat.uniforms.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
  mat.uniforms.uTime.value = time;
  const base = (visual.group.userData.baseIntensity as number | undefined) ?? 1.0;
  mat.uniforms.uIntensity.value = base;
}
```

*(The listing above is the COMPLETE file — all 557 lines, including the full 121-entry
`BLACKBODY_ANCHORS` blackbody table and both the vertex and fragment shaders. Nothing is
omitted.)*

### A.2 The composite Gargantua + spacetime funnel — `src/engine/blackhole.ts` (COMPLETE)

```typescript
/**
 * Gargantua-class black hole for the Eventide Vault — composite edition.
 *
 * Built entirely from primitives that render identically on every GPU and
 * driver stack (plain meshes + baked canvas textures + MeshBasicMaterial):
 *   • pure-black horizon sphere (the shadow, ~2.4 rs)
 *   • flat accretion disk (3–12 rs) with a baked blackbody + turbulence +
 *     Doppler-asymmetry texture, rotating with Keplerian flavor
 *   • thin blazing photon ring hugging the shadow (billboarded)
 *   • the iconic LENSED ARCS — the far side of the disk appears as an arc
 *     OVER the shadow, its secondary image below (billboarded)
 *   • a soft warm halo for distance reading
 *
 * No custom GLSL anywhere: every earlier ray-marched attempt depended on
 * driver-specific shader compilation (ANGLE/D3D silently produced black on
 * some Windows GPUs). This composition cannot fail that way — worst case a
 * texture tint is off, but the hole always exists and always reads.
 */

import * as THREE from 'three';
import { smoothstep as smoothstepJs } from './math';

/* ------------------------- tiny value-noise (CPU) ------------------------ */

function makeNoise2(seed: number): (x: number, y: number) => number {
  const hash = (x: number, y: number) => {
    let h = seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------ textures -------------------------------- */

/** Full-square top view of the disk for RingGeometry's planar UVs.
 *  Round 18 — the INTERSTELLAR look, matched to the user's reference stills:
 *  thousands of fine filament streaks sheared ALONG the flow, cream-white
 *  → gold → soft amber palette (never cartoon orange), strong Doppler
 *  beaming (the approaching side blazes near-white), and a cloudy, ragged,
 *  feathered outer melt — no plates, no hard rims. */
function makeDiskTexture(rs: number): THREE.CanvasTexture {
  const size = 2048; /* 2048² — the filaments must read as thousands of streaks */
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const data = img.data;
  const noise = makeNoise2(1337);
  const cx = size / 2;
  const rOuterPx = size / 2 - 2;
  const rIn = 3 / 12; /* inner radius as fraction of outer (3rs of 12rs) */

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / rOuterPx;
      const dy = (y - cx) / rOuterPx;
      const r = Math.sqrt(dx * dx + dy * dy);
      const i = (y * size + x) * 4;
      if (r < rIn || r > 1) continue; /* transparent — hole & beyond */

      const t = (r - rIn) / (1 - rIn);          /* 0 at ISCO → 1 at edge */
      const th = Math.atan2(dy, dx);

      /* Shakura–Sunyaev temperature, tuned to the references: a broad,
         luminous field that stays BRIGHT far out — a dim outer disk reads
         as a red-brown donut face-on (the R47 bug); the references' sea is
         creamy to the last wisp */
      let bright = Math.pow(1 - t, 0.6) * 1.05 + 0.62 * Math.exp(-t * 1.8);

      /* Round 18 — FILAMENT SHEAR: three octaves of noise sampled in a
         spiral-sheared frame, sharpened into thousands of fine streaks
         flowing ALONG the orbit — the reference stills' signature */
      /* integer multiples of th only — a fractional multiple would leave a
         visible seam at θ=±π in the sheared sampling */
      const s1 = th + r * 3.5, s2 = th * 2.0 + r * 2.4, s3 = th * 3.0 + r * 1.6;
      const n =
        noise(Math.cos(s1) * 6 + r * 10, Math.sin(s1) * 6 + r * 5) * 0.5 +
        noise(Math.cos(s2) * 13 + r * 22, Math.sin(s2) * 13 + r * 11) * 0.3 +
        noise(Math.cos(s3) * 26 + r * 44, Math.sin(s3) * 26 + r * 22) * 0.2;
      /* Round 18.5 — ENERGY, not mud: the filaments are strong bright/dark
         banding (the references' flow lines). Floors guard against
         VANISHING, never against variation — R48's uniform beige was the
         over-correction. */
      const streakN = clamp01((n - 0.26) / 0.5);
      /* the fast filaments ADD light — compressed, hotter gas (×0.42–1.0
         plus a square-law boost) — so bright streaks blaze even on the
         Doppler-dim side, exactly like the references' white rivers */
      bright = bright * (0.42 + 0.58 * streakN) + 0.35 * streakN * streakN;

      /* Doppler beaming, baked: material orbiting counter-clockwise seen
         from +Y — the +x side approaches and BLAZES (≈2.6× the receding
         side, matching the stills' asymmetric flare) */
      const doppler = 1 + 1.1 * Math.cos(th);
      bright *= 0.60 + 0.55 * (doppler / 2.1);

      /* Round 18 — CLOUDY FEATHERED RIM: the outer melt is modulated by
         low-frequency noise so the edge dissolves in ragged wisps — the
         disk never ends like a machined plate */
      const cloud = noise(Math.cos(th) * 3 + 9, Math.sin(th) * 3 + r * 6);
      const rimR = r * (0.92 + 0.16 * cloud);
      bright *= (1 - smoothstepJs(0.86, 1.0, rimR)) * smoothstepJs(rIn, rIn + 0.04, r);
      /* Round 18.3 — CONTINUITY: the disk is ONE unbroken structure. Density
         varies with the clouds — no sector ever vanishes (the references'
         blade never breaks). Streaks modulate brightness, never existence. */
      const body = smoothstepJs(rIn, rIn + 0.06, r) * (1 - smoothstepJs(0.82, 0.98, rimR));
      bright = Math.max(bright, 0.20 * body);
      bright = Math.min(bright, 3.6);

      /* color: the CREAM-CHAMPAGNE ramp of image 2 — white at the blazing
         limb, champagne gold mid, warm taupe-cream outer. NEVER saturated
         red-brown: the sea stays creamy to the last wisp. */
      let cr: number, cg: number, cb: number;
      if (t < 0.30) { cr = 1; cg = mix(0.965, 0.93, t / 0.30); cb = mix(0.90, 0.80, t / 0.30); }
      else if (t < 0.70) { const u = (t - 0.30) / 0.40; cr = 1; cg = mix(0.93, 0.86, u); cb = mix(0.80, 0.68, u); }
      else { const u = (t - 0.70) / 0.30; cr = 0.97; cg = mix(0.86, 0.79, u); cb = mix(0.68, 0.58, u); }
      /* the approaching side whitens HARD — that blaze is the look */
      const white = clamp01((doppler - 1.35) * 0.75) * (1 - t) * 0.85;
      cr = mix(cr, 1.0, white); cg = mix(cg, 0.985, white); cb = mix(cb, 0.97, white);
      /* Round 18.5 — the FIRE: bright fast streaks blaze toward white,
         deep gaps sink toward burning gold — luminance breathes as color,
         so the sea reads as energy, never flat mud */
      const fire = clamp01((bright - 0.75) * 1.1);
      cr = mix(cr, 1.0, fire); cg = mix(cg, 0.99, fire); cb = mix(cb, 0.96, fire);
      const gap = clamp01((0.72 - bright) * 1.4);
      cr = mix(cr, 0.70, gap * 0.55); cg = mix(cg, 0.52, gap * 0.55); cb = mix(cb, 0.28, gap * 0.55);

      const b8 = Math.min(255, bright * 235);
      data[i] = Math.min(255, cr * b8 * 1.4);
      data[i + 1] = Math.min(255, cg * b8 * 1.4);
      data[i + 2] = Math.min(255, cb * b8 * 1.4);
      data[i + 3] = Math.min(255, clamp01(bright * 1.05) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Helper to write RGBA values to ImageData. Defined early to avoid hoisting issues. */
function data255(d: Uint8ClampedArray, i: number, r: number, g: number, b: number, a: number): void {
  d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
}

/** Thin blazing photon ring. */
function makeRingTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.sqrt((x - 128) ** 2 + (y - 128) ** 2) / 128;
      const band = smoothstepJs(0.78, 0.9, r) * smoothstepJs(1.0, 0.94, r);
      const i = (y * size + x) * 4;
      const b = band * 255;
      data255(img.data, i, 255 * band, 235 * band, 190 * band, b);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Round 18 — the LENSED HALO: the far side of the disk, lifted by gravity
 *  into a full circular wrap AROUND the shadow (not two half-arc stickers).
 *  White-hot at the inner edge; fine tangent filaments streak outward; the
 *  band breathes with noise; alpha reaches exactly 0 at r=1. */
function makeArcTexture(seed: number): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const noise = makeNoise2(seed);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - 256) / 256, dy = (y - 256) / 256;
      const r = Math.sqrt(dx * dx + dy * dy);
      const th = Math.atan2(dy, dx);
      /* the wrap occupies r ∈ [0.5, 1.0] — hugging the shadow, breathing
         outward into fine filaments; alpha is exactly 0 at r=1 */
      const filament = 0.62 + 0.38 * noise(Math.cos(th) * 7 + 9, Math.sin(th) * 7 + r * 26);
      const glow = 0.45 + 0.55 * filament;
      /* Round 18.3 — the wrap is CONTINUOUS: it starts tight against the
         shadow's limb (the mesh's inner edge maps to r=0.432) and NEVER
         breaks — the sides narrow and dim exactly like the references,
         but no arc of the circle ever vanishes. */
      const inner = smoothstepJs(0.425, 0.475, r);
      /* the wrap blazes AND REACHES top and bottom — the far-side disk seen
         above and below the shadow (canvas y+ is down, ±π/2 are the poles) */
      const sin2 = Math.sin(th) * Math.sin(th);
      const tilt = 0.46 + 0.54 * sin2;
      const reach = 1 - smoothstepJs(0.56 + 0.26 * sin2, 1.0, r);
      let a = inner * reach * glow * 0.95 * tilt;
      const bodyW = inner * (1 - smoothstepJs(0.86, 1.0, r));
      a = Math.max(a, 0.30 * bodyW);
      /* the WHITE-HOT inner edge — the lensed disk seen edge-on; a razor
         band that saturates to true 255 immediately */
      const hot = smoothstepJs(0.43, 0.45, r) * (1 - smoothstepJs(0.465, 0.56, r));
      const i = (y * size + x) * 4;
      /* cream body around the white-hot edge — the wrap is the same
         champagne sea as the disk, never orange-red */
      const cr = mix(255, 255, hot), cg = mix(228 * glow * reach + 45, 250, hot), cb = mix(198 * glow * reach + 30, 255, hot);
      a = clamp01(a + hot * 0.9);
      data255(img.data, i, cr * a, cg * a, cb * a, a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Einstein-ring star streams — dozens of overlapping thin smeared arcs
 *  forming one continuous band around the shadow. Billed as the background
 *  starlight dragged around the hole; the mesh slowly rotates so the
 *  streams visibly orbit instead of sitting still. */
function makeLensingTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  let seed = 20260909;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  /* soft base band so the stream never shows gaps */
  const base = g.createRadialGradient(256, 256, 256 * 0.54, 256, 256, 256);
  base.addColorStop(0, 'rgba(0,0,0,0)');
  base.addColorStop(0.18, 'rgba(215, 225, 255, 0.10)');
  base.addColorStop(0.55, 'rgba(230, 215, 190, 0.13)');
  base.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  /* the smeared star arcs */
  const count = 170;
  for (let k = 0; k < count; k++) {
    const rr = 0.55 + Math.pow(rand(), 1.35) * 0.43;            /* ring radius, uv */
    const a0 = rand() * Math.PI * 2;
    const len = (0.35 + rand() * 1.6) * (0.6 + rr);              /* arc length, rad */
    const width = 0.6 + rand() * 1.9;
    const warm = rand() > 0.42;
    const b = 0.10 + rand() * 0.42;
    g.strokeStyle = warm
      ? `rgba(255, ${205 + Math.floor(rand() * 35)}, ${150 + Math.floor(rand() * 60)}, ${b})`
      : `rgba(${185 + Math.floor(rand() * 40)}, ${215 + Math.floor(rand() * 30)}, 255, ${b})`;
    g.lineWidth = width;
    g.beginPath();
    g.arc(256, 256, rr * 256, a0, a0 + len);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft filled warm halo (distant glow reading). */
function makeHaloTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 205, 140, 0.55)');
  grad.addColorStop(0.3, 'rgba(255, 165, 85, 0.26)');
  grad.addColorStop(0.65, 'rgba(160, 90, 40, 0.08)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Outer haze — an ultra-soft warm skirt that melts the disk edge into the
 *  background so the hole grows out of space instead of floating on it. */
function makeHazeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const img = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const r = Math.sqrt((x - 128) ** 2 + (y - 128) ** 2) / 128;
      /* RingGeometry maps inner 10rs → 0.606; glow peaks just outside the
         disk edge and fades to nothing at the outer rim */
      const a = smoothstepJs(0.6, 0.72, r) * (1 - smoothstepJs(0.74, 0.99, r)) * 0.42;
      const i = (y * 256 + x) * 4;
      /* Round 18 — cream haze to match the references' palette */
      data255(img.data, i, 255 * a, 218 * a, 172 * a, a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------- Round 17 — the spacetime funnel -------------------------
 *
 * THE CONCEPT (the user's ice-cream cone): a black hole is not an object
 * floating ON the universe — it is a HOLE IN THE SURFACE of the universe.
 * Place an ice-cream cone mouth-down in water: the mouth circle sits on the
 * surface, the cone plunges beneath, and the water bends inward around it.
 *
 * THE USER'S TWO LAWS (Round 17.1 corrections — both absolute):
 *  1. THE CONE PLUNGES ALONG −Z, THE VIEW AXIS. The viewer never sees the
 *     cone's geometry — only the void: black, emptiness, nothingness. The
 *     funnel is therefore billboarded face-on to the camera, rings in the
 *     screen plane, throat sinking along the view axis into the shadow.
 *  2. THE POUR IS ALWAYS CIRCULAR. However the surface distorts, the mouth
 *     touches every tangential point equally — rings, never spokes, never
 *     polygons. Water around a cone pours in circles; so does spacetime.
 *
 * THE REAL EQUATION: the membrane's depth profile is the FLAMM PARABOLOID
 * (Flamm 1916) — the EXACT spatial embedding of the Schwarzschild metric:
 *
 *        z(r) = 2·√(rs·(r − rs))
 *
 * The membrane emerges from inside the composite's own black horizon sphere
 * (which occludes it), so funnel and shadow read as ONE object — the
 * surface pouring into the hole — with no seam.
 *
 * SAFETY: pure visuals. It adds no forces, touches no orbits, and its
 * strength rides the damped spacetime-lens toggle (Lens · Clear flattens
 * it away). The Dimensional Anchor and Living Gravity are untouched.
 */

/** The Flamm paraboloid depth (in rs units) at radius r (in rs units). */
export function flammDepth(rRs: number): number {
  return 2 * Math.sqrt(Math.max(rRs - 1, 0));
}

export interface SpacetimeFunnel {
  group: THREE.Group;
  /** strength 0..1 — rides the damped spacetime-lens toggle */
  update(time: number, strength: number, camQuat?: THREE.Quaternion, camDist?: number): void;
  /** the active reality's palette, so the funnel grid is native to its universe */
  setTint(colorA: THREE.Color, colorB: THREE.Color): void;
  dispose(): void;
}

/**
 * Builds the funnel membrane around a hole of nominal radius R.
 * Rings lie in the LOCAL XY plane; the Flamm depth sinks along −Z (law 1).
 * The mesh is billboarded to the camera every frame, so the viewer always
 * looks straight into the mouth: perfect circles around pure void (law 2).
 * Depth from the exact Flamm equation; circles drift inward (the pour);
 * tinted by the reality's own two surface colors.
 */
function createSpacetimeFunnel(R: number, colorA: THREE.Color, colorB: THREE.Color): SpacetimeFunnel {
  const rs = R * 0.62;
  /* Round 17.2 — the mouth is COMPACT and hugs the shadow (the Interstellar
     references): outer rim 7 rs. The pour is the hole's own crown, never a
     room around the camera — the R41 wall/floor bug was the 30 rs scale.
     The throat still plunges along −Z by the exact Flamm law. */
  const R_IN = 1.0;    /* inner ring radius (rs units) — hidden inside the horizon sphere */
  const R_OUT = 7;     /* outer rim (rs units) — melts into the bent sky */
  const RINGS = 44;
  const SEGS = 72;

  const ringCount = RINGS + 1;
  const vertsPerRing = SEGS + 1;
  const pos = new Float32Array(ringCount * vertsPerRing * 3);
  const uvs = new Float32Array(ringCount * vertsPerRing * 2);
  const indices: number[] = [];

  for (let ri = 0; ri < ringCount; ri++) {
    const t = ri / RINGS;
    /* log-spaced rings: uniform in log(r) so the grid densifies toward the
       throat exactly like the classic embedding diagram, and a uniform
       inward drift in v reads as accelerating infall in linear space */
    const rRs = R_IN * Math.pow(R_OUT / R_IN, t);
    const z = flammDepth(rRs);
    for (let a = 0; a <= SEGS; a++) {
      const th = (a / SEGS) * Math.PI * 2;
      const k = (ri * vertsPerRing + a) * 3;
      /* law 1: rings in XY (the screen plane once billboarded), the cone's
         depth sinks along −Z — toward the viewer's axis, into the void */
      pos[k] = Math.cos(th) * rRs * rs;
      pos[k + 1] = Math.sin(th) * rRs * rs;
      pos[k + 2] = -z * rs;
      const u = (ri * vertsPerRing + a) * 2;
      uvs[u] = a / SEGS;
      uvs[u + 1] = t;
    }
    if (ri < RINGS) {
      for (let a = 0; a < SEGS; a++) {
        const i0 = ri * vertsPerRing + a;
        const i1 = i0 + 1;
        const j0 = (ri + 1) * vertsPerRing + a;
        const j1 = j0 + 1;
        indices.push(i0, j0, i1, i1, j0, j1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 1 },
      uRs: { value: rs },
      uCamDist: { value: 1e9 },
      uColorA: { value: colorA.clone() },
      uColorB: { value: colorB.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPosRs;
      varying vec2 vUvF;
      uniform float uRs;   /* declared also on the material — kept local for clarity */
      void main() {
        vPosRs = position / uRs;   /* geometry in rs units, pre-displaced */
        vUvF = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vPosRs;
      varying vec2 vUvF;
      uniform float uTime;
      uniform float uStrength;
      uniform float uRs;       /* world-units per rs — scales the camera melt */
      uniform float uCamDist;  /* camera distance to the hole's center (world) */
      uniform vec3 uColorA;
      uniform vec3 uColorB;

      void main() {
        /* law 2 — THE POUR IS ALWAYS CIRCULAR: only concentric rings exist
           here. The pattern is a function of radius alone — every tangential
           point of the mouth behaves identically. Circle in, circle out. */
        float r = length(vPosRs.xy);            /* radius in rs units */

        /* the pour — circles marching inward, accelerating near the throat:
           one shared phase per ring (a ring is a single thing), spacing
           uniform in log(r) like the embedding */
        float v = vUvF.y * 15.0;
        float flow = uTime * 0.05;
        float ring = abs(fract(v - flow) - 0.5) / 15.0 * 30.0 * r;
        float aa = max(fwidth(r) * 1.2, 1e-4);
        float ringLine = 1.0 - smoothstep(0.0, aa * 1.6, ring * 0.3183099);

        /* membrane sheen — the surface itself, strongest where curvature
           is brutal (near the throat) */
        float deep = 1.0 - smoothstep(1.6, 5.0, r);
        float sheen = deep * 0.16 + 0.02;

        /* Round 17.2 — THE LIGHT-SPEED LIP: at the mouth's rim the bending
           surface moves so fast it rivals light — the user's white energy
           blast in ±Y. A blazing white band hugs the shadow exactly like
           the Interstellar stills: brightest at 12 and 6 o'clock, thinning
           to the sides, flickering, fine circular striations dragged with
           the pour. */
        float lip = smoothstep(3.4, 4.35, r) * (1.0 - smoothstep(4.35, 6.1, r));
        float flut = 0.9 + 0.1 * sin(uTime * 9.0 + r * 14.0);
        float blast = lip * lip * flut;
        float yAxis = abs(vPosRs.y / max(r, 1e-4));
        blast *= 0.35 + 0.65 * (yAxis * yAxis);        /* ±Y emphasis */
        float stria = 0.55 + 0.45 * sin(r * 42.0 - uTime * 2.6);
        blast *= 0.55 + 0.45 * stria;                  /* surface filaments */

        /* color: reality palette through the body; the lip is WHITE HOT —
           it outruns the palette, that is the point */
        float mixK = smoothstep(1.8, 6.4, r);
        vec3 tint = mix(uColorA, uColorB, mixK);
        vec3 col = tint * (0.85 + 0.6 * deep) * (ringLine * 0.9 + sheen)
                 + vec3(1.05, 1.0, 0.92) * blast * 1.9;

        /* outer melt — no edge, only curvature dissolving into the bent sky */
        float rimFade = 1.0 - smoothstep(4.6, 7.0, r);
        /* inner fade — the true black owns everything under the limb */
        float innerFade = smoothstep(1.0, 1.9, r);

        /* CAMERA DISTANCE — the mouth dissolves as the viewer nears it, so
           no camera can ever fly INTO the pour (the R41 wall/floor bug).
           Up close it reads as the solid angle closing around you, never as
           geometry. */
        float near = 1.0 - smoothstep(4.0 * uRs, 12.0 * uRs, uCamDist);

        float alpha = (ringLine * 0.9 + sheen) * rimFade * innerFade * uStrength;
        alpha = max(alpha, blast * rimFade * innerFade * 0.95) * near * uStrength;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
  mat.userData.immuneToVortex = true;

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1; /* above the sky (≤0), under the disk (5) and billboard (6) */
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh);

  return {
    group,
    update(time, strength, camQuat, camDist) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uStrength.value = Math.max(0, Math.min(1, strength));
      /* law 1 — the cone plunges along the VIEW axis: the funnel's rings
         always face the camera dead-on, so the viewer sees only circles
         sinking into the void along −Z — never the cone's geometry */
      if (camQuat) group.quaternion.copy(camQuat);
      if (camDist !== undefined) mat.uniforms.uCamDist.value = camDist;
      group.visible = strength > 0.01;
    },
    setTint(colorA2, colorB2) {
      (mat.uniforms.uColorA.value as THREE.Color).copy(colorA2);
      (mat.uniforms.uColorB.value as THREE.Color).copy(colorB2);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

/* ------------------------------ assembly -------------------------------- */

export interface BlackHoleVisual {
  group: THREE.Group;
  update(time: number, camQuat?: THREE.Quaternion, portal?: number, funnelStrength?: number, camDist?: number): void;
  /** Round 17 — retint the spacetime funnel to a new reality's palette. */
  setTint?(colorA: THREE.Color, colorB: THREE.Color): void;
  /** Round 20 — the geodesic tier owns the whole hole; every baked part
   *  (disk, arcs, core shadow, funnel) steps aside and restores on false. */
  setCinematic?(on: boolean): void;
  dispose(): void;
}

/**
 * Builds the composite black hole. `R` is the body's nominal radius;
 * everything derives from rs = 0.62·R: shadow 2.35 rs, photon ring 2.5 rs,
 * disk 3–12 rs (ISCO outward), lensed arcs above and below.
 *
 * `bh.group` is parented to the body's group and must NEVER set its own
 * position — it inherits the body's transform. (Copying a world position
 * into a local one double-transforms the hole to 2× its orbit position.)
 */
export function createBlackHole(R: number, colorA = '#38bdf8', colorB = '#7c3aed'): BlackHoleVisual {
  const rs = R * 0.62;

  const group = new THREE.Group();

  /* 0. Round 17 — the SPACETIME FUNNEL: the universe surface itself, bending
        into the hole. One object with the shadow — no sticker on the sky. */
  const funnel = createSpacetimeFunnel(R, new THREE.Color(colorA), new THREE.Color(colorB));
  group.add(funnel.group);

  /* 1. the horizon — pure black, occludes properly in the opaque pass */
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(rs * 2.35, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  group.add(core);

  /* 2. the accretion disk — world-oriented, slowly shearing */
  const normal = new THREE.Vector3(0.055, 1.0, 0.04).normalize();
  const diskTex = makeDiskTexture(rs);
  /* Round 18.1 — NORMAL blending: the disk is DENSE matter — it OCCLUDES
     the sky behind it (like every reference still). Additive was invisible
     over the user's bright photo sky: gold light added onto white is white. */
  const diskMat = new THREE.MeshBasicMaterial({
    map: diskTex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(rs * 3, rs * 12, 160, 1), diskMat);
  const diskTilt = new THREE.Group();
  diskTilt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  diskTilt.add(disk);

  /* outer haze skirt — melts the disk edge into the background */
  const hazeMat = new THREE.MeshBasicMaterial({
    map: makeHazeTexture(),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending, /* Round 18.1 — a warm veil, not added light */
    opacity: 0.55,
  });
  const haze = new THREE.Mesh(new THREE.RingGeometry(rs * 10, rs * 16.5, 96, 1), hazeMat);
  diskTilt.add(haze);
  group.add(diskTilt);

  /* 3–5. billboarded: the photon ring and the LENSED HALO — the far side
        of the disk wrapped in a full circle AROUND the shadow (the actual
        lensing look), with its secondary image beneath (smaller, dimmer) */
  const billboard = new THREE.Group();

  const ringMat = new THREE.MeshBasicMaterial({
    map: makeRingTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending, /* Round 18.1 — reads over bright skies */
    side: THREE.DoubleSide,
  });
  const photonRing = new THREE.Mesh(new THREE.RingGeometry(rs * 2.44, rs * 2.58, 128, 1), ringMat);
  billboard.add(photonRing);

  const haloTex = makeArcTexture(4242);
  /* Round 18.1 — the lensed wrap is a solid luminous structure: normal
     blending so it reads over bright photo skies too */
  const primaryHalo = new THREE.Mesh(
    /* inner edge = 0.432 × outer — exactly where the texture's band begins,
       so the wrap paints from the very first row: no gap at the limb */
    new THREE.RingGeometry(rs * 2.42, rs * 5.6, 160, 1),
    new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide }),
  );
  const secondaryHalo = new THREE.Mesh(
    new THREE.RingGeometry(rs * 2.30, rs * 4.0, 128, 1),
    new THREE.MeshBasicMaterial({ map: makeArcTexture(909), transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide, opacity: 0.35 }),
  );
  secondaryHalo.scale.setScalar(0.72);
  billboard.add(primaryHalo, secondaryHalo);

  /* Einstein-ring star streams — the continuous smeared band just outside
     the shadow; it slowly rotates so the lensed starlight visibly orbits */
  const lensTex = makeLensingTexture();
  const lensMat = new THREE.MeshBasicMaterial({
    map: lensTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    opacity: 0.22, /* Round 18 — demoted: the lensed halo owns the wrap now */
  });
  const lensRing = new THREE.Mesh(new THREE.RingGeometry(rs * 2.55, rs * 4.7, 128, 1), lensMat);
  lensRing.renderOrder = 2;
  billboard.add(lensRing);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeHaloTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.26, /* Round 17 — tamed: the surface (not a glow blob) owns the look */
  }));
  halo.scale.setScalar(rs * 9);
  billboard.add(halo);

  billboard.renderOrder = 6;
  disk.renderOrder = 5;
  group.add(billboard);

  return {
    group,
    update(time, camQuat, portal = 0, funnelStrength = 1, camDist?: number) {
      if (camQuat) billboard.quaternion.copy(camQuat);
      const warp = clamp01(portal);
      /* majestic Keplerian-flavored shear; portal energy accelerates and
         stretches the actual disk instead of placing a screen ring over it */
      /* Round 18.5 — the sea VISIBLY FLOWS: ~2.5× the old drift rate */
      disk.rotation.z = -time * 0.14 - warp * (0.55 + 0.12 * Math.sin(time * 6.0));
      disk.scale.setScalar(1 + warp * 0.16);
      diskTilt.scale.setScalar(1 + warp * 0.10);
      /* the lensed starlight continuously orbits the shadow */
      lensRing.rotation.z = time * 0.12 + warp * (0.85 + 0.18 * Math.sin(time * 5.0));
      billboard.scale.setScalar(1 + warp * (0.14 + 0.035 * Math.sin(time * 7.0)));
      /* Round 17 — the surface pours into the hole with the damped lens
         toggle; inside the composite, so Lens · Clear flattens it away */
      funnel.update(time, funnelStrength, camQuat, camDist);
    },
    setTint(colorA2, colorB2) {
      funnel.setTint(colorA2, colorB2);
    },
    /* Round 20 — the geodesic renderer owns the ENTIRE hole now: disk, arcs,
       shadow AND funnel step aside. The baked core sphere in particular MUST
       hide — it writes depth, and with depthTest on the raymarch quad it
       punched a circular clip through the lensed image (the R19 "disk stops
       at the hole" artifact). The raymarch paints its own black shadow. */
    setCinematic(on) {
      diskTilt.visible = !on;
      billboard.visible = !on;
      core.visible = !on;
      funnel.group.visible = !on;
    },
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.MeshBasicMaterial | undefined;
        if (mat) {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      });
      (halo.material as THREE.SpriteMaterial).map?.dispose();
      (halo.material as THREE.Material).dispose();
    },
  };
}
```

### A.3 The tuning store — `src/engine/blackholeParams.ts` (COMPLETE)

```typescript
import { STORAGE_KEYS } from '../platform/storageKeys';
/**
 * Live tuning parameters for the raymarched black hole (Round 20.4).
 *
 * The defaults ARE dgreenheck's runtime-tuned demo config — the settings his
 * reference screenshot shows — carried verbatim so the port renders his look
 * out of the box. Every slider writes through live (the renderer subscribes)
 * and persists, the same contract as the quality tier in capability.ts:
 * module store + localStorage + a window CustomEvent, no engine plumbing.
 *
 * Mass is his `blackHoleMass` (Schwarzschild radius = mass × 2 shader units)
 * and lensing his `gravitationalLensing`: the geodesic shape depends on their
 * PRODUCT (bend per unit path = rs × lensing, step-size independent), so the
 * slider pair reproduces exactly the responsiveness of his demo.
 */

export interface BlackHoleParams {
  /** demo blackHoleMass — rs = mass × 2 shader units */
  mass: number;
  /** demo gravitationalLensing — bend per unit = rs × lensing */
  lensing: number;
  /** demo dopplerStrength */
  doppler: number;
  /** disk inner edge, shader units (his Geometry → Inner Radius) */
  diskInner: number;
  /** disk outer edge, shader units (his Geometry → Outer Radius) */
  diskOuter: number;
  /** demo diskBrightness */
  brightness: number;
  /** demo diskRotationSpeed — the SIGN flips the Doppler beam side */
  rotSpeed: number;
}

/** The reference screenshot's values — dgreenheck's defaults (his panel
    displays 49.78 kK as "50k K"; diskTemperature itself is not tunable here). */
const BLACKHOLE_DEFAULTS: BlackHoleParams = {
  mass: 0.4,
  lensing: 2.4,
  doppler: 1.0,
  diskInner: 4.1,
  diskOuter: 14.5,
  brightness: 5.0,
  rotSpeed: -8.7,
};

/** His slider ranges (ui.js), verbatim — so the panel feels like the demo. */
export const BLACKHOLE_RANGES: Record<keyof BlackHoleParams, { min: number; max: number; step: number }> = {
  mass: { min: 0.1, max: 3.0, step: 0.1 },
  lensing: { min: 0.5, max: 3.0, step: 0.1 },
  doppler: { min: 0.0, max: 2.0, step: 0.1 },
  diskInner: { min: 2.0, max: 5.0, step: 0.1 },
  diskOuter: { min: 6.0, max: 20.0, step: 0.5 },
  brightness: { min: 0.5, max: 5.0, step: 0.1 },
  rotSpeed: { min: -20.0, max: 20.0, step: 0.1 },
};

const STORAGE_KEY = STORAGE_KEYS.blackholeTuning;
export const BLACKHOLE_CHANGE_EVENT = 'eventide-blackhole-change';

let cached: BlackHoleParams | null = null;

function clamp(key: keyof BlackHoleParams, value: number): number {
  const r = BLACKHOLE_RANGES[key];
  return Math.min(r.max, Math.max(r.min, value));
}

export function getBlackHoleParams(): BlackHoleParams {
  if (cached) return { ...cached };
  const p = { ...BLACKHOLE_DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Record<keyof BlackHoleParams, unknown>>;
      for (const key of Object.keys(BLACKHOLE_DEFAULTS) as Array<keyof BlackHoleParams>) {
        const v = saved[key];
        if (typeof v === 'number' && Number.isFinite(v)) p[key] = clamp(key, v);
      }
    }
  } catch { /* private mode or corrupt JSON — defaults stand */ }
  cached = p;
  return { ...p };
}

export function setBlackHoleParam(key: keyof BlackHoleParams, value: number): BlackHoleParams {
  const p = getBlackHoleParams();
  p[key] = clamp(key, value);
  cached = p;
  persist(p);
  window.dispatchEvent(new CustomEvent(BLACKHOLE_CHANGE_EVENT, { detail: { ...p } }));
  return { ...p };
}

export function resetBlackHoleParams(): BlackHoleParams {
  cached = { ...BLACKHOLE_DEFAULTS };
  persist(cached);
  window.dispatchEvent(new CustomEvent(BLACKHOLE_CHANGE_EVENT, { detail: { ...cached } }));
  return { ...cached };
}

function persist(p: BlackHoleParams): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* private mode — live tuning still works, just not remembered */ }
}
```

### A.4 The Studio UI — `src/ui/console/BlackHoleTuningCard.tsx` (COMPLETE)

```tsx
import React, { useEffect, useState } from 'react';
import { Orbit, RotateCcw } from 'lucide-react';
import { toast } from '../../ui/toast';
import {
  BLACKHOLE_CHANGE_EVENT,
  BLACKHOLE_RANGES,
  getBlackHoleParams,
  resetBlackHoleParams,
  setBlackHoleParam,
  type BlackHoleParams,
} from '../../engine/blackholeParams';

/** The seven live knobs — labels mirror dgreenheck's demo panel; ranges are
    his ui.js ranges verbatim, so dragging feels like the original. */
const SLIDERS: Array<{ key: keyof BlackHoleParams; label: string }> = [
  { key: 'mass', label: 'Mass' },
  { key: 'lensing', label: 'Grav. Lensing' },
  { key: 'doppler', label: 'Doppler Beaming' },
  { key: 'diskInner', label: 'Inner Radius' },
  { key: 'diskOuter', label: 'Outer Radius' },
  { key: 'brightness', label: 'Brightness' },
  { key: 'rotSpeed', label: 'Rotation Speed' },
];

/**
 * ROUND 20.4 — live tuning for the raymarched black hole. Writes through to
 * the renderer immediately (blackholeParams store → CustomEvent → material
 * uniforms) and persists across boots. Defaults ARE the reference config:
 * dgreenheck's demo settings, the ones the ported look was tuned against.
 */
export const BlackHoleTuningCard: React.FC = () => {
  const [params, setParams] = useState<BlackHoleParams>(() => getBlackHoleParams());

  useEffect(() => {
    const sync = (e: Event) => setParams({ ...(e as CustomEvent<BlackHoleParams>).detail });
    window.addEventListener(BLACKHOLE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(BLACKHOLE_CHANGE_EVENT, sync);
  }, []);

  const change = (key: keyof BlackHoleParams, value: number) => setParams(setBlackHoleParam(key, value));

  const reset = () => {
    setParams(resetBlackHoleParams());
    toast('✦ Black hole restored to the reference config');
  };

  return (
    <div className="cc-panel p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-300">
            <Orbit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[13px] font-semibold text-white tracking-wide">
                BLACK HOLE STUDIO
              </h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                LIVE
              </span>
            </div>
            <p className="font-mono text-[9px] text-slate-400">
              geodesic renderer · dgreenheck reference config · applied &amp; remembered instantly
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-200 text-xs font-mono tracking-wider transition-all cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset to Reference</span>
        </button>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3 font-mono text-xs">
        {SLIDERS.map(({ key, label }) => {
          const range = BLACKHOLE_RANGES[key];
          return (
            <label key={key} className="block">
              <span className="flex items-center justify-between mb-1">
                <span className="cc-label">{label}</span>
                <span className="text-cyan-300 tabular-nums">{params[key].toFixed(1)}</span>
              </span>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={params[key]}
                onChange={(e) => change(key, Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </label>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500">
        Mass sets the Schwarzschild radius (rs = 2 × mass); lensing bends light per rs — the pair
        reproduces the original demo's physics. Peak temp 49.78 kK, falloff 5.22, turbulence
        1.81 / 0.75 / 7.4 and softness 0.18 / 0.5 stay at the reference values. The raymarched
        renderer activates at MEDIUM+ quality tier; the composite hole remains the fallback.
      </p>
    </div>
  );
};
```

### A.5 The master GLSL library — `src/engine/shaders.ts` (COMPLETE)

The graphics soul of the star, the planets and everything around them. The full 1,430-line
file, verbatim, in build order: `NOISE` (shared simplex chunk), star, planet, clouds,
atmosphere, rings, accretion disc, nebula, points (starfields + Kamui vortex + lens bending),
terrain, the Anchor corona (Sentiment Aurora), the deep-sky backdrop (Kamui space-bending),
multiverse bubbles, asteroids, exoplanet horizon plates, sky, the Astral demon core, and the
multiverse boundary hypersphere.

```typescript
/* GLSL library for MY UNIVERSE — all shaders share a simplex noise chunk. */

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0,0.5,1.0,2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0,i1.z,i2.z,1.0))
        + i.y + vec4(0.0,i1.y,i2.y,1.0)) + i.x + vec4(0.0,i1.x,i2.x,1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0*floor(p*ns.z*ns.z);
  vec4 x_ = floor(j*ns.z);
  vec4 y_ = floor(j - 7.0*x_);
  vec4 x = x_*ns.x + ns.yyyy;
  vec4 y = y_*ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m*m;
  return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float f = 0.0; float a = 0.5;
  for(int i=0;i<5;i++){ f += a*snoise(p); p *= 2.03; a *= 0.5; }
  return f;
}
float fbm3(vec3 p){
  float f = 0.0; float a = 0.5;
  for(int i=0;i<3;i++){ f += a*snoise(p); p *= 2.11; a *= 0.5; }
  return f;
}
`;

/* ------------------------------ star ------------------------------ */

export const starVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const starFrag = /* glsl */ `
uniform float uTime; uniform float uBoost;
uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uCoreColor;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}

// Ultra-detailed thermal palette adapted to current reality's star spectrum
vec3 getStarColor(float t, float spot) {
  vec3 colA = length(uColorA) > 0.05 ? uColorA : vec3(1.0, 0.65, 0.15);
  vec3 colB = length(uColorB) > 0.05 ? uColorB : vec3(0.9, 0.2, 0.02);
  vec3 coreCol = length(uCoreColor) > 0.05 ? uCoreColor : vec3(1.0, 1.0, 1.0);

  vec3 dark = colB * 0.12;
  vec3 cool = colB;
  vec3 warm = colA;
  vec3 hot  = mix(colA, coreCol, 0.65);
  vec3 core = coreCol;
  
  vec3 col = mix(dark, cool, smoothstep(0.0, 0.3, t));
  col = mix(col, warm, smoothstep(0.3, 0.6, t));
  col = mix(col, hot, smoothstep(0.6, 0.85, t));
  col = mix(col, core, smoothstep(0.85, 1.0, t));
  
  // Sunspots dim the thermal emission strongly
  return mix(col, dark, spot);
}

void main(){
  vec3 n = normalize(vN);
  vec3 viewDir = normalize(cameraPosition - vW);
  float mu = max(dot(n, viewDir), 0.0);
  
  vec3 q = normalize(vP);
  float t_slow = uTime * 0.015;
  float t_fast = uTime * 0.04;
  
  // 1. High-frequency Granulation (convection cells)
  float n1 = fbm3(q * 38.0 + vec3(t_fast));
  float n2 = fbm3(q * 72.0 - vec3(t_fast * 1.3));
  float gran = abs(n1 + n2 * 0.5); // cellular look
  gran = 1.0 - smoothstep(0.0, 1.3, gran);
  gran = pow(gran, 2.2); // sharp cell edges
  
  // 2. Magnetic Flux Tubes / Solar Filaments (swirling structures)
  vec3 warp = q * 2.2 + vec3(fbm3(q * 1.8 + t_slow));
  float tubes = fbm(warp * 4.2 - vec3(0.0, t_slow, 0.0));
  
  // 3. Sunspots (dark magnetic disturbances)
  float spotNoise = fbm(q * 3.2 + vec3(t_slow * 0.6));
  float spots = smoothstep(0.62, 0.85, spotNoise);
  // Penumbra (lighter outer ring of spot)
  float penumbra = smoothstep(0.45, 0.62, spotNoise) - spots;
  
  // Combine temperatures
  // Base temp modified by granulation and filaments
  float temp = 0.25 + 0.35 * gran + 0.4 * tubes;
  // Boost temperature at filament ridges (plages/active regions)
  temp += smoothstep(0.4, 0.8, tubes) * 0.35;
  
  // spot strength
  float spotFactor = spots * 0.95 + penumbra * 0.55;
  
  vec3 col = getStarColor(clamp(temp, 0.0, 1.0), spotFactor);
  
  // Extreme limb darkening (center is much brighter, edges are darker/redder)
  float limb = pow(max(mu, 0.0), 0.55); 
  col *= mix(vec3(0.5, 0.1, 0.0), vec3(1.0), limb);
  
  // Active region glowing near limbs
  float limbGlow = pow(1.0 - mu, 3.0);
  vec3 limbCol = length(uColorA) > 0.05 ? uColorA : vec3(1.0, 0.5, 0.1);
  col += limbCol * limbGlow * (tubes * 1.8) * uBoost;
  
  float pulse = 1.0 + 0.02 * sin(uTime * 0.6);
  col *= pulse * uBoost;
  
  // Incandescent central glow
  vec3 coreHighlight = length(uCoreColor) > 0.05 ? uCoreColor : vec3(1.0, 0.95, 0.85);
  col += coreHighlight * pow(max(mu, 0.0), 4.5) * 0.35;
  
  gl_FragColor = vec4(col * 1.25, 1.0);
}`;

/* ----------------------------- planet ----------------------------- */

export const planetVert = /* glsl */ `
uniform float uTear; uniform float uTearTime; uniform float uReverse;
uniform vec3 uGravityCenter; uniform vec3 uGravityLocalCenter;
uniform float uGravityRadius; uniform float uGravityStrength; uniform float uGravityTime;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying float vTear;
${NOISE}
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 nView = normalize(normalMatrix * normal);
  vec3 centerView = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 viewAxis = normalize(-centerView);
  float front = max(dot(nView, viewAxis), 0.0);
  float spot = pow(front, 5.0);
  vec3 swirlAxis = normalize(cross(viewAxis, nView) + vec3(0.0001, 0.0, 0.0));

  /* Embedded spatial core: object-space sphere deformation with radial
     compression, differential rotation, and multi-scale flow noise. The
     core center arrives pre-transformed into this mesh's local space
     (uGravityLocalCenter) — no per-vertex matrix inverse needed. */
  vec3 coreDelta = position - uGravityLocalCenter;
  float coreDistance = length(coreDelta);
  float field = uGravityRadius > 0.0
    ? pow(max(0.0, 1.0 - coreDistance / uGravityRadius), 1.65) * uGravityStrength
    : 0.0;
  /* The portal field radius is intentionally much larger than the body.
     Normalize the deformation to the actual sphere so the planet remains a
     visible, continuous surface while its shell bends inward. */
  float bodyRadius = max(length(position), 0.001);
  float bodyInfluence = clamp(uGravityStrength, 0.0, 1.0);
  float radiusNorm = clamp(coreDistance / max(bodyRadius * 2.0, 0.001), 0.001, 1.0);
  /* Differential (Keplerian-style) rotation: the inner region spins far
     faster than the rim, so the shell reads as matter shearing around a
     gravitational structure — never like a texture merely rotating. */
  float angularVelocity = 1.15 / pow(max(radiusNorm, 0.07), 0.55);
  float angle = field * angularVelocity * (0.55 + 0.22 * sin(uGravityTime * 1.7 + coreDistance * 0.08)) * uReverse;
  float cs = cos(angle);
  vec3 radial = normalize(coreDelta + vec3(0.0001));
  vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), radial) + vec3(0.0001));
  float largeFlow = snoise(radial * 3.0 + vec3(uGravityTime * 0.12));
  float mediumFlow = snoise(radial * 9.0 - vec3(uGravityTime * 0.4));
  float turbulence = (largeFlow * 0.65 + mediumFlow * 0.35) * field;
  float localField = field * bodyInfluence;
  vec3 bentRadial = radial * (1.0 - localField * (0.12 + 0.10 * turbulence));
  vec3 bentTangent = tangent * (sin(angle) * localField * (0.16 + 0.10 * mediumFlow));
  vec3 surfaceOffset = bentRadial * bodyRadius * 0.16 + bentTangent * bodyRadius * 0.12;
  /* Never displace the shell by more than a controlled fraction of its own
     radius; this prevents the entire planet from vanishing. */
  float offsetLimit = bodyRadius * 0.24;
  surfaceOffset = clamp(length(surfaceOffset), 0.0, offsetLimit) * normalize(surfaceOffset + vec3(0.0001));
  mv.xyz += mat3(viewMatrix * modelMatrix) * surfaceOffset;

  float csFlow = cs - 1.0;
  mv.xyz += mat3(viewMatrix * modelMatrix) * (radial * bodyRadius * csFlow * localField * 0.08);
  float around = atan(nView.z, nView.x);
  float wave = sin(around * 8.0 + uTearTime * 5.4 + front * 18.0);
  float fracture = pow(max(0.0, 0.5 + 0.5 * sin(around * 13.0 - uTearTime * 4.2 + front * 31.0)), 8.0);
  float shell = exp(-pow((front - (0.66 + 0.09 * sin(around * 5.0 + uTearTime * 1.7))) / 0.14, 2.0));
  float radius = length(position);

  /* Local Planet Kamui: the actual sphere surface caves inward and slides
     around its own center. This is vertex geometry, never a screen overlay.
     uReverse flips the whole flow for the return traversal — suction becomes
     expulsion and the swirl unwinds the opposite way. */
  float flow = uTear * uReverse;
  float suction = flow * spot * (0.34 + 0.22 * (0.5 + 0.5 * wave));
  float shear = flow * spot * (0.18 * wave + 0.08 * fracture);
  float rimKick = flow * shell * fracture * 0.12;
  mv.xyz -= nView * radius * suction;
  mv.xyz += swirlAxis * radius * shear;
  mv.xyz += nView * radius * rimKick;

  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  vTear = uTear * spot;
  gl_Position = projectionMatrix * mv;
}`;

export const planetFrag = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uBase; uniform vec3 uHigh; uniform vec3 uIce;
uniform vec3 uGravityCenter; uniform float uGravityRadius; uniform float uGravityStrength; uniform float uGravityTime;
uniform vec3 uSunDir; uniform float uTime; uniform float uSea; uniform float uGhost;
uniform float uNight; uniform vec3 uSeed; uniform float uFade;
uniform float uTear; uniform float uTearTime; uniform float uReverse;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying float vTear;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 q = normalize(vP) + uSeed;

  /* Planet-centered reality lens. The field is evaluated in world space and
     only bends the rendered surface; no camera overlay or object transform is
     involved. */
  vec3 gravityDelta = vW - uGravityCenter;
  float gravityDistance = length(gravityDelta);
  float gravityFalloff = uGravityRadius > 0.0
    ? pow(max(0.0, 1.0 - gravityDistance / uGravityRadius), 2.4) * uGravityStrength
    : 0.0;
  float gravityAngle = gravityFalloff * (1.8 + 2.4 * sin(uGravityTime * 2.0 + gravityDistance * 0.018));
  float gravitySpin = sin(gravityAngle + gravityDistance * 0.03);
  float gravityCompression = gravityFalloff * (0.35 + 0.25 * gravitySpin);
  
  float warp = fbm3(q*2.3);
  float h = fbm(q*2.9 + warp*0.55);
  
  // High-frequency detail added to the height directly for coloring (not normals)
  float detail = fbm(q*9.0)*0.16;
  h += detail;
  
  float land = smoothstep(uSea - 0.03, uSea + 0.03, h);
  vec3 terrain = mix(uDeep, uBase, smoothstep(uSea, uSea + 0.30, h));
  terrain = mix(terrain, uHigh, smoothstep(uSea + 0.28, uSea + 0.62, h));
  
  float lat = abs(normalize(vP).y);
  float iceMask = smoothstep(0.62, 0.86, lat + h*0.18 - 0.1);
  terrain = mix(terrain, uIce, iceMask);
  
  vec3 ocean = uDeep * (0.75 + 0.45*smoothstep(-0.5, uSea, h));
  vec3 col = mix(ocean, terrain, land);
  
  // Smooth lighting based on actual sphere normal
  float sun = dot(n, normalize(uSunDir));
  float day = smoothstep(-0.12, 0.28, sun);
  
  // Gentle ambient boost
  vec3 lit = col * (0.15 + 1.15*day);

  /* Surface-level event horizon and fracture light. The world remains the
     source image; only the region being swallowed darkens, caves, and tears. */
  vec3 viewDir = normalize(cameraPosition - vW);
  float visibleFront = max(dot(n, viewDir), 0.0);
  float surfaceAngle = atan(n.z, n.x);
  float tearNoise = fbm(q * 6.5 + vec3(uTearTime * 0.08, -uTearTime * 0.05, uTearTime * 0.06));
  float fracture = pow(max(0.0, 0.5 + 0.5 * sin(surfaceAngle * 13.0 + visibleFront * 28.0 - uTearTime * 4.8 + tearNoise * 4.0)), 12.0);
  float tearRing = exp(-pow((visibleFront - (0.68 + 0.08 * sin(surfaceAngle * 5.0 + uTearTime * 1.7))) / 0.12, 2.0));
  float aperture = vTear * smoothstep(0.28, 0.92, visibleFront);
  /* Darken the swallowed surface without adding a second camera-facing layer.
     The embedded singularity is revealed through the planet's own shell. */
  lit *= 1.0 - aperture * 0.82;
  lit += vec3(1.0, 0.86, 0.58) * fracture * uTear * 0.62;
  /* dense, high-energy edge glow traces the compressed reality surface */
  lit += vec3(0.65, 0.82, 1.0) * gravityFalloff * (0.18 + 0.22 * sin(uGravityTime * 5.0 + gravityDistance * 0.04));
  lit *= 1.0 + gravityCompression * 0.32;
  lit += mix(vec3(0.9, 0.55, 0.25), vec3(0.42, 0.9, 1.0), 0.5 + 0.5 * sin(uTearTime * 2.0)) * tearRing * uTear * 0.48;

  /* Spiral accretion flow — log-spiral bands wrap the opening and anisotropic
     noise stretches them into elongated luminous streaks, never clean rings.
     Color stays inside the body's own palette; uReverse unwinds the spiral
     for the return traversal. */
  float rr = 1.0 - visibleFront;
  float armPhase = surfaceAngle * 3.0 + pow(max(rr, 0.001), 0.62) * 21.0
    - uReverse * uTearTime * 2.6 + tearNoise * 2.4;
  float arms = pow(max(0.0, 0.5 + 0.5 * sin(armPhase)), 2.2);
  float streak = fbm3(vec3(cos(surfaceAngle) * 2.2, sin(surfaceAngle) * 2.2, rr * 9.0 - uReverse * uTearTime * 0.55));
  arms *= 0.55 + 0.45 * streak;
  float tearBand = uTear * smoothstep(0.30, 0.55, visibleFront) * (1.0 - smoothstep(0.88, 0.99, visibleFront));
  vec3 flowCol = mix(vec3(1.0, 0.86, 0.6), col, 0.35);
  lit += flowCol * arms * tearBand * uTear * 0.85;
  /* bright compressed accretion rim around the deepening mouth */
  float accretionRim = exp(-pow((visibleFront - 0.72) / 0.10, 2.0));
  lit += mix(vec3(1.0, 0.9, 0.7), vec3(0.75, 0.85, 1.0), 0.4 + 0.4 * sin(uTearTime * 2.2))
    * accretionRim * uTear * (0.35 + 0.5 * arms) * 0.8;
  /* deep dimensional throat — normal surface information is swallowed */
  float throat = smoothstep(0.86, 0.995, visibleFront) * uTear;
  lit *= 1.0 - throat * 0.96;

  float spec = pow(max(dot(reflect(-normalize(uSunDir), n), viewDir), 0.0), 42.0);
  lit += vec3(1.0, 0.92, 0.78) * spec * (1.0 - land) * day * 0.55;
  
  float cityMask = smoothstep(0.52, 0.78, fbm(q*7.5 + 11.0)) * land * (1.0 - iceMask);
  vec3 nightCol = vec3(1.0, 0.78, 0.42) * cityMask * uNight * (1.0 - day) * 0.9;
  lit += nightCol;
  
  float term = smoothstep(-0.14, 0.14, sun);
  lit = mix(lit * vec3(0.5, 0.62, 0.85), lit, term);
  lit = mix(lit, vec3(0.45, 0.53, 0.66) * (0.25 + 0.75*day), uGhost);
  
  gl_FragColor = vec4(lit, uFade);
}`;

/* ----------------------------- clouds ----------------------------- */

export const cloudFrag = /* glsl */ `
uniform float uTime; uniform vec3 uSunDir; uniform vec3 uSeed; uniform float uCover; uniform float uFade;
uniform vec3 uGravityCenter; uniform float uGravityRadius; uniform float uGravityStrength; uniform float uGravityTime;
uniform float uTear;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 q = normalize(vP) + uSeed;
  float c = fbm(q*3.4 + vec3(uTime*0.012, 0.0, uTime*0.008));
  c += 0.35*fbm(q*8.0 - vec3(uTime*0.02));
  float a = smoothstep(0.62 - uCover*0.3, 0.86, c);
  float front = max(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0);
  float aperture = uTear * smoothstep(0.28, 0.92, front);
  if (uTear > 0.22 && aperture > 0.70) discard;
  float sun = dot(normalize(vN), normalize(uSunDir));
  float day = smoothstep(-0.2, 0.4, sun); // softened terminator
  vec3 col = vec3(1.0) * (0.25 + 0.85*day); // gentler ambient
  gl_FragColor = vec4(col, a * 0.82 * uFade);
}`;

/* --------------------------- atmosphere --------------------------- */

export const atmoFrag = /* glsl */ `
uniform vec3 uColor; uniform float uStrength; uniform vec3 uSunDir;
uniform float uTear;
varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float ndotv = abs(dot(n, v));
  float aperture = uTear * smoothstep(0.28, 0.92, max(dot(n, v), 0.0));
  if (uTear > 0.22 && aperture > 0.66) discard;
  float rim = pow(max(1.0 - ndotv, 0.0), 3.5);
  float sun = dot(n, normalize(uSunDir));
  float day = smoothstep(-0.25, 0.25, sun);
  float a = rim * uStrength * (0.35 + 0.65*day);
  vec3 col = mix(uColor * 0.8, uColor * 1.5, day);
  gl_FragColor = vec4(col, a);
}`;

/* ------------------------------ rings ----------------------------- */

export const ringVert = /* glsl */ `
uniform vec3 uGravityLocalCenter; uniform float uGravityStrength; uniform float uGravityTime;
uniform float uOuter; uniform float uReverse;
varying vec2 vP;
void main(){
  vec3 p3 = position;
  /* Kamui field — the ring is real geometry beside the core: its radii
     compress and the annulus shears into a spiral, inner edge leading.
     Evaluated in the ring's own plane, normalized to the ring's span so the
     inner edge always reacts harder than the trailing outer edge. */
  vec2 delta = p3.xy - uGravityLocalCenter.xy;
  float rn = clamp(length(delta) / max(uOuter, 0.001), 0.0, 1.0);
  float infl = uGravityStrength * pow(1.0 - rn, 1.2);
  if (infl > 0.001) {
    float a = uReverse * infl * (3.0 + 5.0 * (1.0 - rn)) * (0.72 + 0.28 * sin(uGravityTime * 1.4 + rn * 9.0));
    float ca = cos(a), sa = sin(a);
    vec2 spun = vec2(delta.x * ca - delta.y * sa, delta.x * sa + delta.y * ca);
    p3.xy = uGravityLocalCenter.xy + spun * (1.0 - infl * 0.26);
  }
  vP = p3.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p3, 1.0);
}`;

export const ringFrag = /* glsl */ `
uniform float uInner; uniform float uOuter; uniform vec3 uTint; uniform vec3 uSunLocal;
varying vec2 vP;
${NOISE}
void main(){
  float r = length(vP);
  float t = (r - uInner) / (uOuter - uInner);
  if(t < 0.0 || t > 1.0) discard;
  float bands = 0.5 + 0.5*snoise(vec3(t*46.0, 3.7, 1.3));
  bands *= 0.55 + 0.45*snoise(vec3(t*130.0, 9.1, 4.4));
  float gap1 = smoothstep(0.02, 0.07, abs(t - 0.62));
  float gap2 = smoothstep(0.015, 0.05, abs(t - 0.31));
  float edge = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.9, 1.0, t));
  float a = bands * gap1 * gap2 * edge * 0.9;
  vec2 dir = normalize(vP + vec2(1e-5));
  vec2 sl = normalize(uSunLocal.xy + vec2(1e-4));
  float shade = 0.3 + 0.7*smoothstep(-0.5, 0.35, dot(dir, sl));
  float lit = 0.45 + 0.55*abs(uSunLocal.z);
  vec3 col = mix(vec3(0.62, 0.55, 0.44), uTint, 0.45) * lit * shade * 1.5;
  gl_FragColor = vec4(col, a);
}`;

/* -------------------------- accretion disc ------------------------ */

export const discFrag = /* glsl */ `
uniform float uTime; uniform float uInner; uniform float uOuter;
uniform vec3 uColor; uniform vec3 uColor2;
varying vec2 vP;
${NOISE}
void main(){
  float r = length(vP);
  float t = (r - uInner) / (uOuter - uInner);
  if(t < 0.0 || t > 1.0) discard;
  float ang = atan(vP.y, vP.x);
  float swirl = fbm3(vec3(cos(ang)*2.0 + r*3.0 - uTime*0.9, sin(ang)*2.0, r*6.0 - uTime*0.6));
  float heat = pow(1.0 - t, 2.2);
  float streaks = 0.55 + 0.45*sin(ang*9.0 + r*30.0 - uTime*2.4 + swirl*4.0);
  vec3 col = mix(uColor, uColor2, heat);
  float a = heat * streaks * (0.4 + 0.6*smoothstep(0.0, 0.18, t)) * (1.0 - smoothstep(0.7, 1.0, t));
  a *= 0.75 + 0.25*swirl;
  gl_FragColor = vec4(col * (0.8 + heat*1.4), a * 0.9);
}`;

/* ------------------------------ nebula ---------------------------- */

export const nebulaVert = /* glsl */ `
uniform vec3 uCamLocalP;
varying vec2 vUv;
varying vec3 vLocalP;
varying vec3 vWorldP;
varying vec3 vCamLocalP;

void main(){
  vUv = uv;
  vLocalP = position;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldP = worldPosition.xyz;
  vCamLocalP = uCamLocalP;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}`;

export const nebulaFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA; // Ionized gas / cyan-indigo ambient
uniform vec3 uColorB; // Deep dust / amber warm scattering
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vLocalP;
varying vec3 vWorldP;
varying vec3 vCamLocalP;

${NOISE}

// Intersect ray O + t*D with axis-aligned bounding box [-bounds, bounds]
vec2 intersectAABB(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax) {
  vec3 invD = 1.0 / (rd + vec3(1e-7));
  vec3 t0 = (boxMin - ro) * invD;
  vec3 t1 = (boxMax - ro) * invD;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float tn = max(max(tmin.x, tmin.y), tmin.z);
  float tf = min(min(tmax.x, tmax.y), tmax.z);
  return vec2(tn, tf);
}

// 3D Density evaluation for procedural astronomical Pillars of Creation & Stellar Nursery
// Returns vec4(dustDensity, gasDensity, photoIonization, temperature)
vec4 evalNebula3D(vec3 p, float t) {
  // Domain warping for multi-scale turbulent 3D fluid motion & filaments
  vec3 warp = vec3(
    fbm3(p * 2.2 + vec3(0.0, t * 0.01, 0.0)),
    fbm3(p * 2.4 + vec3(1.7, -t * 0.008, 0.5)),
    fbm3(p * 2.1 + vec3(3.2, 0.8, t * 0.012))
  );
  vec3 pw = p + warp * 0.38;

  // 1. LEFT TOWERING PILLAR (Rising from lower-middle, broad base narrowing upward, top bending right)
  vec3 p1 = pw - vec3(-0.42, -0.15, 0.02);
  p1.x += sin(p1.y * 2.8 + t * 0.02) * 0.08; // Organic curving body
  p1.z += cos(p1.y * 3.2) * 0.05;
  float h1 = (p1.y + 0.8) / 1.35; // Normalized height [0, 1]
  float width1 = 0.22 * (1.0 - smoothstep(-0.8, 0.55, p1.y) * 0.58);
  // Finger-like columns and eroded tip extensions at upper tip
  float tip1 = exp(-pow((p1.y - 0.48) / 0.14, 2.0)) * (sin(p1.x * 22.0 + 1.2) * 0.035 + cos(p1.z * 18.0) * 0.025);
  float d1 = length(p1.xz) - (width1 + tip1);
  float p1Mask = smoothstep(0.08, -0.06, d1) * smoothstep(-0.9, -0.65, p1.y) * (1.0 - smoothstep(0.48, 0.62, p1.y));

  // 2. CENTER TALLEST & MOST VISUALLY DOMINANT PILLAR (Elongated, narrow/bulky sections, protruding ridges)
  vec3 p2 = pw - vec3(-0.05, -0.05, -0.08);
  p2.x += cos(p2.y * 3.4 - t * 0.015) * 0.06;
  p2.z += sin(p2.y * 4.1) * 0.06;
  float width2 = 0.18 * (1.0 - smoothstep(-0.85, 0.75, p2.y) * 0.52);
  // Protruding 3D ridges and branching structures
  float ridges2 = sin(p2.y * 14.0) * cos(p2.x * 12.0) * 0.03;
  float tip2 = exp(-pow((p2.y - 0.78) / 0.16, 2.0)) * (cos(p2.x * 26.0) * 0.04 + sin(p2.z * 20.0) * 0.03);
  float d2 = length(p2.xz) - (width2 + ridges2 + tip2);
  float p2Mask = smoothstep(0.08, -0.05, d2) * smoothstep(-0.92, -0.72, p2.y) * (1.0 - smoothstep(0.78, 0.88, p2.y));

  // 3. UPPER-RIGHT BRANCHING PILLAR COMPLEX (Claw-like sculpted silhouette, connected via diffuse gas)
  vec3 p3 = pw - vec3(0.42, 0.25, -0.12);
  p3.x += sin(p3.y * 4.5) * 0.05;
  p3.z += cos(p3.y * 3.8) * 0.05;
  // Multiple upward extensions / claw arms
  float claw1 = length(p3.xz - vec2(-0.06, 0.02)) - 0.09;
  float claw2 = length(p3.xz - vec2(0.08, -0.04)) - 0.07;
  float d3 = min(claw1, claw2);
  float p3Mask = smoothstep(0.07, -0.05, d3) * smoothstep(-0.4, -0.15, p3.y) * (1.0 - smoothstep(0.68, 0.82, p3.y));

  // 4. LOWER-CENTER FOREGROUND BULBOUS CLOUD MOUND (Dense mound of gas & dust with dark cavities & folds)
  vec3 p4 = pw - vec3(0.05, -0.62, 0.32);
  float d4 = length(p4) - 0.38 + fbm3(p4 * 6.0) * 0.12;
  float p4Mask = smoothstep(0.12, -0.08, d4);

  // 5. FAR-RIGHT / LOWER-RIGHT EDGE CLOUD (Enormous cloud structure entering frame partially)
  vec3 p5 = pw - vec3(0.85, -0.48, 0.08);
  float d5 = length(p5) - 0.48 + fbm3(p5 * 4.5) * 0.15;
  float p5Mask = smoothstep(0.15, -0.1, d5);

  // Combine primary dust structures
  float mainPillars = max(max(max(p1Mask, p2Mask), p3Mask), max(p4Mask, p5Mask));

  // Multi-scale 3D FBM noise to carve filaments, cavities, knots, and erosion channels
  float microNoise = fbm(pw * 5.8) * 0.5 + fbm3(pw * 14.0) * 0.25;
  float dustDensity = clamp(mainPillars * (0.65 + microNoise * 0.75) - (microNoise - 0.35) * 0.3, 0.0, 1.0);

  // Diffuse background nebular gas fill between structures
  float bgGas = fbm3(pw * 1.8 + vec3(0.0, 0.0, t * 0.01)) * 0.45;
  bgGas += exp(-length(pw.xy) * 1.8) * 0.35;
  float gasDensity = clamp(bgGas + dustDensity * 0.85, 0.0, 1.0);

  // Photo-ionization UV radiation surface erosion calculation
  vec3 lightDirUV = normalize(vec3(-0.75, 0.65, 0.8));
  // Compute finite difference numerical gradient of dust density for surface normals
  vec3 eps = vec3(0.02, 0.02, 0.02);
  float dX = fbm(pw + vec3(eps.x, 0.0, 0.0)) - fbm(pw - vec3(eps.x, 0.0, 0.0));
  float dY = fbm(pw + vec3(0.0, eps.y, 0.0)) - fbm(pw - vec3(0.0, eps.y, 0.0));
  float dZ = fbm(pw + vec3(0.0, 0.0, eps.z)) - fbm(pw - vec3(0.0, 0.0, eps.z));
  vec3 grad = normalize(vec3(dX, dY, dZ) + vec3(1e-5));
  float photoIonization = pow(clamp(dot(-grad, lightDirUV), 0.0, 1.0), 1.8) * smoothstep(0.05, 0.6, dustDensity);

  float temperature = smoothstep(0.1, 0.85, dustDensity) + photoIonization * 0.5;

  return vec4(dustDensity, gasDensity, photoIonization, temperature);
}

void main(){
  // Bounding local space [-1.2, 1.2]^3
  vec3 boxMin = vec3(-1.25);
  vec3 boxMax = vec3(1.25);

  vec3 ro = vCamLocalP;
  vec3 rd = normalize(vLocalP - vCamLocalP);

  vec2 hit = intersectAABB(ro, rd, boxMin, boxMax);
  if (hit.x > hit.y || hit.y < 0.0) discard;

  float tNear = max(0.0, hit.x);
  float tFar = hit.y;

  // Volumetric Raymarching Settings
  const int STEPS = 54;
  float stepSize = (tFar - tNear) / float(STEPS);
  float tCurrent = tNear;

  vec3 accumColor = vec3(0.0);
  float transmittance = 1.0;

  // Color Palette Definitions
  vec3 colDeepBackground = vec3(0.008, 0.015, 0.038); // Deep Cosmic Blue Backdrop
  vec3 colIonizedCyan = length(uColorA) > 0.05 ? uColorA : vec3(0.12, 0.78, 0.95); // Ionized Cyan/Blue
  vec3 colGoldenYellow = vec3(1.0, 0.72, 0.22); // Warm Golden Yellow
  vec3 colAmberOrange = length(uColorB) > 0.05 ? uColorB : vec3(0.95, 0.48, 0.12); // Amber Orange
  vec3 colCopperRed = vec3(0.82, 0.26, 0.06); // Copper Reddish
  vec3 colDarkDustCharcoal = vec3(0.08, 0.05, 0.04); // Dark Charcoal Dust
  vec3 colDarkRedUmber = vec3(0.22, 0.10, 0.05); // Dark Reddish Brown
  vec3 colPaleCreamHighlight = vec3(1.0, 0.96, 0.88); // Subtle Pale Cream Highlights

  float simTime = uTime * 0.05;

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * tCurrent;

    // Sample 3D Nebular Density
    vec4 nData = evalNebula3D(p, uTime);
    float dDust = nData.x;
    float dGas = nData.y;
    float photoIon = nData.z;
    float temp = nData.w;

    if (dGas > 0.001 || dDust > 0.001) {
      // Physical Dust Color Transition (Charcoal -> Reddish Brown -> Illuminated Amber)
      vec3 dustColor = mix(colDarkDustCharcoal, colDarkRedUmber, smoothstep(0.1, 0.6, dDust));

      // Physical Gas Emission Color Transition (Golden Yellow -> Amber -> Copper -> Cream Highlights)
      vec3 gasColor = mix(colCopperRed, colAmberOrange, smoothstep(0.1, 0.45, temp));
      gasColor = mix(gasColor, colGoldenYellow, smoothstep(0.45, 0.8, temp));
      gasColor = mix(gasColor, colPaleCreamHighlight, smoothstep(0.8, 1.0, temp));

      // Photo-ionization UV Rim Glow (Cool blue-white & electric cyan edges)
      vec3 rimGlow = mix(colIonizedCyan, vec3(0.85, 0.95, 1.0), photoIon * 0.6) * photoIon * 2.4;

      // Combine emission and scattering
      vec3 stepEmission = mix(gasColor, dustColor, dDust * 0.88) * dGas * 1.6 + rimGlow;

      // Optical Absorption / Extinction
      float stepAbsorption = (dDust * 4.8 + dGas * 0.85) * stepSize;
      float stepTransmittance = exp(-stepAbsorption);

      // Accumulate color scaled by current transmittance
      accumColor += transmittance * stepEmission * (1.0 - stepTransmittance);
      transmittance *= stepTransmittance;

      if (transmittance < 0.015) break; // Early ray termination when optically opaque
    }

    tCurrent += stepSize;
  }

  // Blend background cosmic blue into unabsorbed ray transmittance
  vec3 finalCol = accumColor + colDeepBackground * transmittance;

  // Edge boundary opacity falloff
  vec3 edgeDist = abs(vLocalP) / 1.25;
  float maxEdge = max(max(edgeDist.x, edgeDist.y), edgeDist.z);
  float edgeFade = smoothstep(1.0, 0.6, maxEdge);

  float alpha = (1.0 - transmittance) * edgeFade * uOpacity;
  if (alpha < 0.002) discard;

  gl_FragColor = vec4(finalCol * 1.35, clamp(alpha, 0.0, 1.0));
}`;

/* ------------------------- generic points ------------------------- */

export const pointsVert = /* glsl */ `
attribute float aSize; attribute vec3 aColor; attribute float aAlpha;
uniform float uScale; uniform float uTime; uniform float uTwinkle;
uniform vec3 uVortexC; uniform float uVortexR; uniform float uVortexS; uniform float uVortexT;
uniform float uVortexPull; uniform float uVortexRev;
varying vec3 vColor; varying float vAlpha; varying float vSize;
void main(){
  vColor = aColor;
  float tw = uTwinkle > 0.5 ? (0.76 + 0.24 * sin(uTime * 2.6 + position.x * 17.3 + position.y * 11.1 + position.z * 7.7)) : 1.0;
  vAlpha = aAlpha * tw;
  /* Kamui tear vortex — a consumption wave expands from the tear point:
     nearest points are bent, spun and pulled into the center first, then the
     wave reaches farther ones (nearest-first suction). Consumed points dissolve.
     uVortexRev flips the swirl for the return traversal and a negative
     uVortexPull ejects matter back outward (white-hole release). */
  vec3 vp = position;
  if (uVortexS > 0.001) {
    float d = distance(vp, uVortexC);
    float infl = uVortexS * smoothstep(uVortexR, uVortexR * 0.1, d);
    if (infl > 0.001) {
      vec3 axis = normalize(vec3(0.18, 1.0, 0.12));
      vec3 dir = vp - uVortexC;
      float rev = uVortexRev < 0.0 ? -1.0 : 1.0;
      float a = infl * (5.0 + uVortexT * 3.5) * rev;
      vec3 spun = dir * cos(a) + cross(axis, dir) * sin(a) * 1.15;
      float pullAmt = clamp(abs(uVortexPull), 0.0, 1.0);
      float radial = infl * (0.5 + pullAmt * 0.5) * (uVortexPull < 0.0 ? -1.45 : 1.0);
      vp = uVortexC + spun * max(0.035, 1.0 - radial);
      vAlpha *= (1.0 - infl * (0.6 + pullAmt * 0.3));
    }
  }
  /* Round 52 — SPACETIME BENDING OF THE BACKGROUND. Every cloud built here is
     part of the sky (stars, dust, gas, distant galaxies), so the masses'
     curvature has to move IT — that is the observable signature of Einstein's
     field equations, and until now only the procedural canvas and the sky
     shells bent while these discrete stars stayed rigid, which is exactly why
     the sky read as flat around the hole.
     vp is still object space: lift to world, bend the direction from the
     camera, then take the ordinary view transform. With no lens on stage
     (uLensCount == 0) this is byte-identical to the previous path, because
     viewMatrix · modelMatrix is what modelViewMatrix already was. */
  vec4 wp = modelMatrix * vec4(vp, 1.0);
  if (uLensCount > 0) wp.xyz = lensBendWorld(wp.xyz);
  vec4 mv = viewMatrix * wp;
  float pSize = aSize * uScale * (260.0 / max(-mv.z, 0.001));
  gl_PointSize = clamp(pSize, 1.5, 36.0);
  vSize = gl_PointSize;
  gl_Position = projectionMatrix * mv;
}`;

export const pointsFrag = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor; varying float vAlpha; varying float vSize;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if(d >= 0.49) discard;
  
  float mask = smoothstep(0.49, 0.0, d);
  float core = exp(-d * d * 36.0);
  float halo = exp(-d * 6.0) * 0.22;
  
  vec3 col = mix(vColor, vec3(1.0, 0.96, 0.9), core * 0.5);
  float a = (core * 0.85 + halo) * mask * vAlpha * uOpacity;
  
  if (a < 0.003) discard;
  
  gl_FragColor = vec4(col, a);
}`;


/* ------------------------- surface terrain ------------------------ */

export const terrainFrag = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uBase; uniform vec3 uHigh; uniform vec3 uIce;
uniform vec3 uSunDir; uniform vec3 uFog; uniform float uFogDensity;
varying vec3 vN; varying vec3 vW; varying vec3 vP;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 q = vP * 0.16;
  float h = fbm(q*1.4);
  float patch = smoothstep(0.0, 0.4, fbm(q*0.5 + 9.0));
  vec3 col = mix(uBase, uHigh, smoothstep(0.05, 0.5, h));
  col = mix(col, uDeep, smoothstep(-0.1, -0.45, h) * 0.7);
  col = mix(col, uIce * 0.9, smoothstep(0.55, 0.8, h) * 0.4);
  float sun = max(dot(n, normalize(uSunDir)), 0.0);
  /* night ambient raised — the dark side must read as ground, not void */
  vec3 lit = col * (0.3 + 1.05*sun);
  float dist = length(cameraPosition - vW);
  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  lit = mix(lit, uFog, clamp(fog, 0.0, 1.0));
  gl_FragColor = vec4(lit, 1.0);
}`;

export const terrainVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  vP = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

/* --------------------------- anchor corona ------------------------- */
/* view-space billboard with organic ray structure — no sprite ring edges */
export const coronaVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy;
  gl_Position = projectionMatrix * mv;
}`;

export const coronaFrag = /* glsl */ `
uniform float uTime; uniform float uBoost;
uniform vec3 uColorA; uniform vec3 uColorB;
/* THE SENTIMENT AURORA — the reality's emotional spectrum, recency-weighted.
   uAuroraA/B hold the two strongest mood colors; uAuroraMask picks which of
   the five mood weights flows through each ray. uAuroraIntensity is the
   overall loudness, uAuroraStorm the turbulence (heavy/burning tear it). */
uniform vec3 uAuroraA; uniform vec3 uAuroraB;
uniform float uAuroraMaskA; uniform float uAuroraMaskB;
uniform float uAuroraIntensity; uniform float uAuroraStorm;
uniform float uEchoBloom;
varying vec2 vUv;
${NOISE}

void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  if(r > 1.0) discard;
  
  float ang = atan(p.y, p.x);
  float t = uTime * 0.05;
  
  // Base field distortion for plasma swirling
  float swirl = fbm(vec3(p * 2.5, t)) * 0.8;
  float angDist = ang + swirl * (1.0 - r); 
  
  // Radial magnetic rays (high frequency)
  float rayNoise1 = snoise(vec3(cos(angDist)*4.0, sin(angDist)*4.0, t * 2.0));
  float rayNoise2 = snoise(vec3(cos(angDist)*14.0, sin(angDist)*14.0, t * 4.0 + 10.0));
  float rays = rayNoise1 * 0.5 + rayNoise2 * 0.25;
  rays = rays * 0.5 + 0.5; // map to 0..1
  
  // Sweeping Coronal Mass Ejections (CMEs) / Prominences
  float eruptDist = ang - swirl * 1.5 - r * 2.5;
  float eruptions = fbm3(vec3(cos(eruptDist)*1.5, sin(eruptDist)*1.5, t*1.2));
  eruptions = smoothstep(0.3, 0.8, eruptions);
  
  // Smooth physical falloff — inner K-corona bright, outer F-corona faint
  float inner = pow(1.0 - smoothstep(0.12, 0.45, r), 2.8);
  float outer = pow(1.0 - smoothstep(0.2, 1.0, r), 1.8);
  
  // Structure details
  float streaks = 0.35 + 0.65 * pow(rays, 1.8);
  float wisps = eruptions * (1.0 - smoothstep(0.15, 1.0, r)) * 1.8;
  
  // Dynamic spectral palette adapted to active reality
  vec3 colA = length(uColorA) > 0.05 ? uColorA : vec3(1.0, 0.6, 0.15);
  vec3 colB = length(uColorB) > 0.05 ? uColorB : vec3(0.9, 0.15, 0.02);

  vec3 ultraHot = mix(vec3(1.0, 1.0, 1.0), colA, 0.4);
  vec3 warm = colA;
  vec3 deep = colB;
  
  // Blend colors radially and structurally
  vec3 col = mix(deep, warm, inner * streaks + wisps * 0.5);
  col = mix(col, ultraHot, pow(inner, 3.0));

  // THE SENTIMENT AURORA — each ray carries one of the reality's two
  // strongest mood colors. The band rides high-latitude rays (|ang| near
  // the poles reads as the classic auroral oval), stormy spectra tear the
  // band apart into ragged curtains.
  float bandA = uAuroraMaskA * streaks * (0.5 + 0.5 * sin(angDist * 2.0 + t * 3.0));
  float bandB = uAuroraMaskB * streaks * (0.5 + 0.5 * sin(angDist * 2.6 - t * 2.2 + 1.7));
  float tear = uAuroraStorm * (fbm3(vec3(cos(angDist) * 2.0, sin(angDist) * 2.0, t * 5.0)) - 0.5) * 1.6;
  bandA = max(0.0, bandA + tear);
  bandB = max(0.0, bandB - tear);
  float auroraK = (bandA + bandB) * uAuroraIntensity * smoothstep(0.25, 0.75, r);
  vec3 auroraCol = uAuroraA * bandA + uAuroraB * bandB;
  auroraCol += vec3(1.0, 0.95, 0.85) * uEchoBloom * 0.6 * streaks;
  col += auroraCol * 0.9;

  // Opacity masking
  float a = (inner * streaks * 0.9 + outer * 0.3 * (0.3 + 0.7*streaks) + wisps * 0.45);
  a += auroraK * 0.5;
  
  // Hide the center slightly so it doesn't wash out the star completely (additive blending)
  float starMask = smoothstep(0.15, 0.20, r);
  a *= (0.4 + 0.6 * starMask);
  
  a *= uBoost;
  
  gl_FragColor = vec4(col * (1.0 + inner * 1.5), a * (1.0 - smoothstep(0.8, 1.0, r)));
}`;

/* ------------------------- deep-sky backdrop ----------------------- */
export const backdropVert = /* glsl */ `
varying vec3 vDir;

void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const backdropFrag = /* glsl */ `
uniform float uTime;
uniform float uKamuiErase;
uniform vec3 uVortexDir;
varying vec3 vDir;
${NOISE}

float starHash(vec3 p){
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main(){
  float k = clamp(uKamuiErase, 0.0, 1.0);
  if (k >= 0.998) {
    discard;
  }
  
  vec3 rawD = normalize(vDir);
  vec3 d = rawD;
  float edgeAlpha = 1.0;
  
  // =========================================================================
  // AUTHENTIC KAMUI SPACE-TIME NINJUTSU: PURE GEOMETRIC SPACE BENDING & VACUUM
  // =========================================================================
  // No external lightning, no artificial lines, no fake energy fx.
  // Space itself bends, twists, spirals into a singularity vacuum that sucks
  // reality in (and uncurls/releases when entering).
  if (k > 0.0005) {
    vec3 vAxis = normalize(uVortexDir);
    if (length(vAxis) < 0.01) {
      vAxis = vec3(0.0, 0.0, -1.0);
    }
    
    // Dynamic orthonormal coordinate frame aligned directly with camera sightline
    vec3 upRef = abs(vAxis.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangentX = normalize(cross(vAxis, upRef));
    vec3 tangentY = cross(tangentX, vAxis);
    
    // Angular displacement from the Kamui vortex center [0, PI]
    float dotV = clamp(dot(rawD, vAxis), -1.0, 1.0);
    float alpha = acos(dotV);
    float r = alpha / 3.14159265; // Normalized spherical radius [0, 1]
    
    // Azimuthal angle around vortex center [-PI, PI]
    float theta = atan(dot(rawD, tangentY), dot(rawD, tangentX));
    
    // 1. Relativistic Logarithmic Spiral Streamlines & Frame-Dragging Vortex
    // In polar vortex flow, space flows along logarithmic spirals: theta'(r) = theta + Omega(r, t)
    float vortexTwist = (18.0 * pow(k, 1.25)) / (pow(r, 0.58) + 0.035) + uTime * (5.5 + 4.5 * k);
    float twistedTheta = theta + vortexTwist;
    
    // 2. 3-Blade Spiral Streamline Phase Coordinate
    // Points of constant psi define continuous logarithmic spiral arms twisting into the core
    float psi = 3.0 * theta + (14.0 * pow(k, 1.2)) / (pow(r, 0.52) + 0.05) - uTime * 7.2;
    float spiralArmMetric = sin(psi) * 0.35 * k + cos(psi * 2.0 + uTime * 3.0) * 0.12 * k;
    
    // 3. Authentic Spiral Suction Horizon (True Spiraling Vortex Edge, NOT Concentric Circles)
    // The reality boundary contracts inward as an authentic multi-armed spiral whirlpool
    float spiralHorizon = (1.0 - pow(k, 1.12)) * 1.35 + spiralArmMetric * (1.0 - 0.3 * k);
    spiralHorizon = max(0.0001, spiralHorizon);

    // 4. Inward Logarithmic Suction & Space-Time Metric Compression
    // Coordinates are drawn inward along the logarithmic spiral streamlines into the throat
    float rNorm = r / max(0.001, spiralHorizon);
    float rSuction = pow(clamp(rNorm, 0.0002, 1.0), 1.0 + k * 1.5) * (1.0 + sin(psi) * 0.15 * k);
    rSuction = clamp(rSuction, 0.0002, 1.0);
    float warpedAlpha = rSuction * 3.14159265;

    // Reconstruct the curved, twisted 3D ray through warped space-time
    vec3 warpedRay = cos(twistedTheta) * sin(warpedAlpha) * tangentX +
                     sin(twistedTheta) * sin(warpedAlpha) * tangentY +
                     cos(warpedAlpha) * vAxis;
    d = normalize(warpedRay);

    // Smooth natural edge falloff at the spiraling horizon boundary of the vacuum portal
    float distToHorizon = spiralHorizon - r;
    edgeAlpha = r > spiralHorizon ? smoothstep(0.12, 0.0, r - spiralHorizon) : smoothstep(-0.07, 0.0, distToHorizon);
  }
  
  // Abyssal deep space vacuum background (360-degree dark universe base)
  vec3 col = vec3(0.001, 0.0015, 0.003);
  
  // =========================================================================
  // COSMOLOGICAL HIERARCHY STRUCTURE (From Cosmic Web to Solar System Scale)
  // =========================================================================
  
  // 1. COSMIC WEB & SUPERCLUSTER COMPLEX (Filaments & Voids across billions of light-years)
  vec3 webCoord = d * 4.5 + vec3(uTime * 0.001, 0.0, uTime * 0.0005);
  float n1 = snoise(webCoord);
  float n2 = snoise(webCoord * 2.1 + vec3(3.2, 7.1, 1.4));
  float filaments = pow(max(0.0, 1.0 - abs(n1) - abs(n2)), 3.5);
  float cosmicVoid = smoothstep(0.2, 0.7, abs(fbm3(d * 1.8)));
  
  vec3 webCol = mix(vec3(0.015, 0.035, 0.095), vec3(0.045, 0.025, 0.11), filaments);
  col += webCol * filaments * cosmicVoid * 1.6;
  
  // 2. SUPERCLUSTERS & GALAXY CLUSTERS AT WEB NODES
  float nodes = pow(filaments, 2.5) * smoothstep(0.3, 0.8, fbm3(d * 6.0));
  vec3 superclusterGlow = vec3(0.08, 0.09, 0.16) * nodes * 2.5;
  col += superclusterGlow;
  
  // 3. DISTANT GALAXIES & GALAXY GROUPS
  vec3 galCell = floor(d * 32.0);
  float galHash = starHash(galCell);
  if (galHash > 0.985) {
    float galDist = length(fract(d * 32.0) - 0.5);
    float galFall = smoothstep(0.42, 0.0, galDist);
    float galCore = pow((galHash - 0.985) / 0.015, 3.0) * galFall;
    vec3 galCol = mix(vec3(0.9, 0.7, 0.5), vec3(0.5, 0.7, 1.0), fract(galHash * 43.0));
    col += galCol * galCore * 0.45;
  }
  
  // 4. MILKY WAY GALAXY PLANE & SPIRAL ARMS
  vec3 bn = normalize(vec3(d.x, d.y * 2.2, d.z));
  float galacticPlane = exp(-pow(bn.y * 3.2, 2.0));
  
  vec3 bulgeCol = vec3(0.065, 0.05, 0.075);
  col += bulgeCol * galacticPlane;
  
  // 5. DARK MATTER & INTERSTELLAR DUST LANES
  float dustLanes = fbm3(d * 3.5 + vec3(1.4, -2.1, 4.8));
  float dustMask = 1.0 - smoothstep(0.35, 0.75, dustLanes) * galacticPlane * 0.85;
  col *= dustMask;
  
  // 6. LOCAL STAR-FORMING REGIONS
  float HII_region = fbm3(d * 2.2 + vec3(-5.2, 3.1, -1.8));
  float nebulaIon = pow(smoothstep(0.45, 0.82, HII_region), 2.2) * galacticPlane;
  vec3 HII_col = mix(vec3(0.05, 0.015, 0.06), vec3(0.02, 0.05, 0.08), sin(d.x * 3.0) * 0.5 + 0.5);
  col += HII_col * nebulaIon * 1.5;
  
  // 7. STELLAR SYSTEM & LOCAL FOREGROUND STARS
  vec3 starCell1 = floor(d * 900.0);
  float s1 = starHash(starCell1);
  if(s1 > 0.9986) {
    float starDist1 = length(fract(d * 900.0) - 0.5);
    float b = pow((s1 - 0.9986) / 0.0014, 2.5) * smoothstep(0.45, 0.0, starDist1);
    vec3 specCol = mix(vec3(0.65, 0.82, 1.0), vec3(1.0, 0.85, 0.65), fract(s1 * 17.0));
    col += specCol * b * 0.5 * dustMask;
  }

  vec3 starCell2 = floor(d * 1500.0);
  float s2 = starHash(starCell2);
  if(s2 > 0.9997) {
    float starDist2 = length(fract(d * 1500.0) - 0.5);
    float b = pow((s2 - 0.9997) / 0.0003, 3.0) * smoothstep(0.45, 0.0, starDist2);
    vec3 specCol = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 0.92, 0.75), fract(s2 * 31.0));
    col += specCol * b * 0.85;
  }
  
  float alpha = edgeAlpha * (1.0 - smoothstep(0.88, 0.998, k));
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

/* --------------------------- multiverse bubble ----------------------- */
export const multiverseVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const multiverseFrag = /* glsl */ `
uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity;
uniform float uTearStrength;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float rim = 1.0 - abs(dot(n, v));
  float irid = pow(rim, 2.2);
  
  // Internal cosmic swirl inside bubble universe
  vec3 q = vP * 0.00015 + vec3(uTime * 0.02, uTime * 0.01, 0.0);
  float swirl = fbm(q * 4.0);
  float galCore = exp(-length(vP.xy) * 0.0001);
  
  vec3 col = mix(uColorA, uColorB, swirl * 0.8 + 0.2);
  vec3 rimCol = mix(vec3(0.4, 0.85, 1.0), vec3(1.0, 0.45, 0.85), sin(uTime * 0.8 + rim * 6.2) * 0.5 + 0.5);
  col += rimCol * irid * 2.2;
  col += vec3(1.0, 0.96, 0.88) * galCore * 0.8;
  
  // Semi-transparent animated surface tears & cracks overlay before entering Kamui vortex
  float tear = clamp(uTearStrength, 0.0, 1.0);
  float crackMask = 0.0;
  if (tear > 0.001) {
    vec3 spherePos = normalize(vP);
    vec3 crackCoord = spherePos * 8.5 + vec3(uTime * 0.12, -uTime * 0.08, uTime * 0.09);
    vec3 warp = vec3(
      fbm3(crackCoord + vec3(0.0, 1.5, 3.1)),
      fbm3(crackCoord + vec3(4.1, 0.9, 2.2)),
      fbm3(crackCoord + vec3(2.3, 3.8, 0.5))
    );
    vec3 tearP = crackCoord * 1.5 + warp * 2.2;
    
    // Sharp zero-crossing ridge noise for jagged dimensional surface fissures
    float ridge1 = abs(snoise(tearP));
    float ridge2 = abs(snoise(tearP * 2.5 + vec3(3.8)));
    
    float crackCore = smoothstep(0.075 * tear + 0.008, 0.0, ridge1);
    float crackEdge = smoothstep(0.24 * tear + 0.015, 0.0, ridge1);
    float subCrack = smoothstep(0.055 * tear + 0.008, 0.0, ridge2) * 0.65;
    
    float crackPattern = max(crackCore, subCrack);
    crackMask = smoothstep(1.0 - tear * 1.35, 1.0 - tear * 0.75, fbm3(spherePos * 3.2));
    
    // High-energy electric cyan / magenta / white hot rift glow bleeding through fractures
    vec3 tearGlowCol = mix(vec3(0.0, 0.95, 1.0), vec3(1.0, 0.2, 0.75), sin(uTime * 4.5 + tearP.y * 3.0) * 0.5 + 0.5);
    vec3 tearHotCore = vec3(1.0, 0.98, 0.92);
    vec3 tearColor = mix(tearGlowCol * 3.0, tearHotCore * 5.0, crackCore);
    
    col = mix(col, col + tearColor * (crackPattern * 2.0 + crackEdge * 0.7), crackMask * tear);
  }
  
  float alpha = (irid * 0.88 + galCore * 0.5 + swirl * 0.2) * uOpacity;
  if (tear > 0.001) {
    alpha = max(alpha, crackMask * tear * 0.92);
  }
  gl_FragColor = vec4(col * 1.25, alpha);
}`;

/* --------------------------- 3D asteroid ----------------------------- */
/* instanced-aware: each rock shades itself against the sun at the origin */
export const asteroidVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec3 vSun;
${NOISE}
void main(){
  vec3 p = position;
  float bump = fbm(p * 1.4) * 0.28 + fbm3(p * 4.8) * 0.08;
  p += normal * bump;
  // Compute displaced normal for smooth non-blocky lighting
  vec3 e1 = vec3(0.01, 0.0, 0.0);
  vec3 e2 = vec3(0.0, 0.01, 0.0);
  float bX = fbm((p + e1) * 1.4) * 0.28;
  float bY = fbm((p + e2) * 1.4) * 0.28;
  vec3 norm = normalize(normal + vec3((bX - bump)*20.0, (bY - bump)*20.0, 0.0));
  vec4 wp;
  #ifdef USE_INSTANCING
    vN = normalize(normalMatrix * (mat3(instanceMatrix) * norm));
    wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  #else
    vN = normalize(normalMatrix * norm);
    wp = modelMatrix * vec4(p, 1.0);
  #endif
  vW = wp.xyz;
  vP = p;
  /* the sun sits at the origin — light direction comes from where the rock actually floats */
  vSun = normalize(-wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const asteroidFrag = /* glsl */ `
uniform vec3 uColor;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec3 vSun;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  float sun = max(dot(n, normalize(vSun)), 0.0);
  float detail = fbm(vP * 5.5) * 0.35 + 0.65;
  // Crater rim details
  float crater = smoothstep(0.42, 0.68, fbm3(vP * 8.0));
  detail -= crater * 0.25;
  vec3 base = uColor * detail;
  // hard key light + a whisper of warm starlight fill so night sides stay readable
  vec3 lit = base * (0.14 + 1.2 * sun);
  lit += base * vec3(0.42, 0.27, 0.15) * 0.09;
  gl_FragColor = vec4(lit, 1.0);
}`;

/* -------------------- distant exoplanet horizon plate ------------------- */
export const exoplanetPlateVert = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

export const exoplanetPlateFrag = /* glsl */ `
uniform float uTime; uniform vec3 uSunDir; uniform vec3 uColorAtm; uniform float uOpacity;
varying vec3 vN; varying vec3 vW; varying vec3 vP; varying vec2 vUv;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float sun = dot(n, normalize(uSunDir));
  float day = smoothstep(-0.25, 0.35, sun);
  
  // High-detail planetary landmass & gas giant bands
  vec3 q = vP * 0.002 + vec3(uTime * 0.005, 0.0, 0.0);
  float continent = fbm(q * 2.2);
  float clouds = fbm(q * 5.5 + vec3(uTime * 0.008, 0.0, 0.0));
  
  // Planet surface colors
  vec3 deepSea = vec3(0.04, 0.12, 0.28);
  vec3 land = vec3(0.18, 0.42, 0.32);
  vec3 desert = vec3(0.65, 0.48, 0.28);
  vec3 ice = vec3(0.85, 0.92, 1.0);
  
  vec3 surfCol = mix(deepSea, land, smoothstep(0.38, 0.55, continent));
  surfCol = mix(surfCol, desert, smoothstep(0.58, 0.75, continent));
  surfCol = mix(surfCol, ice, smoothstep(0.72, 0.9, clouds));
  
  // Night side bioluminescent city clusters
  float nightCities = smoothstep(0.62, 0.85, fbm(q * 12.0)) * (1.0 - day);
  vec3 nightGlow = vec3(1.0, 0.75, 0.38) * nightCities * 1.4;
  
  // Surface lighting
  vec3 lit = surfCol * (0.08 + 1.12 * day) + nightGlow;
  
  // Atmospheric rim glow (Rayleigh scattering edge)
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  vec3 atmoCol = mix(uColorAtm * 0.8, uColorAtm * 1.6, day);
  lit += atmoCol * rim * 2.2;
  
  // Alpha edge fade so it blends gracefully into deep space
  float alphaEdge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
  
  gl_FragColor = vec4(lit, (0.85 + rim * 0.3) * alphaEdge * uOpacity);
}`;

/* --------------------------- surface sky -------------------------- */

export const skyFrag = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir;
varying vec3 vW;
void main(){
  vec3 d = normalize(vW - cameraPosition);
  float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.8));
  float sun = pow(max(dot(d, normalize(uSunDir)), 0.0), 220.0);
  float halo = pow(max(dot(d, normalize(uSunDir)), 0.0), 8.0);
  col += vec3(1.0, 0.9, 0.72) * sun * 2.2 + vec3(1.0, 0.85, 0.6) * halo * 0.18;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* --------------------------- sovereign multiverse core -------------------------- */

export const demonCoreVert = /* glsl */ `
uniform float uTime;
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
${NOISE}
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vP = position;
  
  // Relativistic Kerr gravitational pulsating surface distortion
  float disp = fbm(position * 0.00035 + vec3(uTime * 0.3, -uTime * 0.2, uTime * 0.25)) * 420.0;
  float pulse = sin(uTime * 2.8 + length(position) * 0.0008) * 180.0;
  vec3 displaced = position + normal * (disp + pulse);
  
  vW = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

export const demonCoreFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorAura;
uniform float uHover;
uniform float uTearStrength;
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
${NOISE}

void main(){
  vec3 n = normalize(vN);
  vec3 viewDir = normalize(cameraPosition - vW);
  float mu = max(dot(n, viewDir), 0.0);
  
  vec3 q = normalize(vP);
  float t = uTime * 0.55;
  
  // 1. Relativistic Kerr Frame-Dragging Vortex (differential angular rotation)
  float ang = atan(q.z, q.x);
  float radius = length(q.xz);
  float vortexSpeed = 1.8 / (radius + 0.35);
  float rotAng = ang + t * vortexSpeed;
  
  // 2. Relativistic Doppler Beaming Asymmetry (approaching side is blueshifted & brighter)
  float doppler = sin(ang + t * 0.9) * 0.35 + 0.65;
  
  // 3. Multi-scale Quantum Vacuum Fluctuations & Turbulent Magnetohydrodynamics
  vec3 warpedQ = vec3(cos(rotAng) * radius, q.y, sin(rotAng) * radius);
  float warp = fbm3(warpedQ * 3.8 + vec3(t * 0.25, -t * 0.15, t * 0.18));
  float n1 = fbm(warpedQ * 5.5 + warp * 0.75);
  float n2 = fbm(warpedQ * 12.0 - vec3(t * 0.35, t * 0.2, -t * 0.25));
  float plasma = (n1 * 0.55 + n2 * 0.35 + warp * 0.2) * (0.75 + 0.35 * doppler);
  
  // 4. Supreme Multiverse Spectrum: Deep Void Black -> Electric Sapphire -> Dimensional Violet -> Supernova Amber-Gold
  // Dimmed to preserve rich geometric contrast without blinding white saturation
  vec3 colVoid = vec3(0.008, 0.005, 0.018);
  vec3 colSapphire = vec3(0.015, 0.32, 0.75);
  vec3 colViolet = vec3(0.52, 0.08, 0.72);
  vec3 colAmberGold = vec3(0.85, 0.48, 0.06);
  vec3 colWarmGlow = vec3(0.95, 0.82, 0.65);
  
  vec3 col = mix(colVoid, colSapphire, smoothstep(0.08, 0.42, plasma));
  col = mix(col, colViolet, smoothstep(0.42, 0.72, plasma));
  col = mix(col, colAmberGold, smoothstep(0.72, 0.90, plasma));
  col = mix(col, colWarmGlow, smoothstep(0.90, 0.99, plasma));
  
  // 5. Chromatic Gravitational Lensing Separation
  float chromaR = fbm(warpedQ * 6.2 + vec3(0.05, 0.0, 0.0));
  float chromaB = fbm(warpedQ * 6.2 - vec3(0.05, 0.0, 0.0));
  col.r += chromaR * 0.15 * (1.0 - mu);
  col.b += chromaB * 0.22 * (1.0 - mu);
  
  // 6. Sacred Multidimensional Tesseract Resonance Grid (Crisp neon filament lines)
  float gridX = abs(fract(q.x * 12.0 + t * 0.15) - 0.5);
  float gridY = abs(fract(q.y * 12.0 - t * 0.12) - 0.5);
  float gridZ = abs(fract(q.z * 12.0 + t * 0.18) - 0.5);
  float tesseractLattice = smoothstep(0.46, 0.495, min(gridX, min(gridY, gridZ)));
  col += vec3(0.0, 0.85, 0.75) * tesseractLattice * 0.85 * smoothstep(0.15, 0.85, plasma);
  
  // 7. Photon Ring & Relativistic Event Horizon Rim Glow (Tightly calibrated, non-overexposing)
  float photonRing = pow(1.0 - mu, 3.2);
  float thinCorona = pow(1.0 - mu, 8.5);
  vec3 rimCol = mix(vec3(0.0, 0.85, 0.75), vec3(0.85, 0.12, 0.55), sin(t * 1.2 + q.y * 5.0) * 0.5 + 0.5);
  col += rimCol * photonRing * 0.95 + vec3(0.85, 0.92, 0.98) * thinCorona * 1.1;
  
  // 8. Central Singularity Focus
  float eyeGaze = pow(mu, 6.0);
  col += mix(vec3(0.85, 0.08, 0.32), vec3(0.2, 0.75, 0.85), sin(t * 1.6) * 0.5 + 0.5) * eyeGaze * 0.75;
  
  // Hover & Active Resonance Boost (Clean & subtle)
  col *= 0.92 + uHover * 0.35 + sin(t * 2.5) * 0.06;
  
  // Semi-transparent animated surface tears & cracks overlay before entering Kamui vortex
  float tear = clamp(uTearStrength, 0.0, 1.0);
  if (tear > 0.001) {
    vec3 crackCoord = q * 9.5 + vec3(uTime * 0.14, -uTime * 0.09, uTime * 0.11);
    vec3 warpTear = vec3(
      fbm3(crackCoord + vec3(0.0, 1.5, 3.1)),
      fbm3(crackCoord + vec3(4.1, 0.9, 2.2)),
      fbm3(crackCoord + vec3(2.3, 3.8, 0.5))
    );
    vec3 tearP = crackCoord * 1.5 + warpTear * 2.4;
    
    float ridge1 = abs(snoise(tearP));
    float ridge2 = abs(snoise(tearP * 2.7 + vec3(4.5)));
    
    float crackCore = smoothstep(0.08 * tear + 0.008, 0.0, ridge1);
    float crackEdge = smoothstep(0.25 * tear + 0.015, 0.0, ridge1);
    float subCrack = smoothstep(0.06 * tear + 0.008, 0.0, ridge2) * 0.65;
    
    float crackPattern = max(crackCore, subCrack);
    float crackMask = smoothstep(1.0 - tear * 1.35, 1.0 - tear * 0.75, fbm3(q * 3.5));
    
    vec3 tearGlowCol = mix(vec3(0.0, 0.95, 1.0), vec3(1.0, 0.25, 0.75), sin(uTime * 4.0 + tearP.y * 3.0) * 0.5 + 0.5);
    vec3 tearHotCore = vec3(1.0, 0.98, 0.92);
    vec3 tearColor = mix(tearGlowCol * 3.2, tearHotCore * 5.0, crackCore);
    
    col = mix(col, col + tearColor * (crackPattern * 2.2 + crackEdge * 0.7), crackMask * tear);
  }
  
  gl_FragColor = vec4(col, 0.95);
}
`;

/* ----------------- Giant Multiverse Boundary Hypersphere ---------------- */
export const multiverseBoundaryVert = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
varying vec2 vUv;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

export const multiverseBoundaryFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uKamuiErase;
uniform vec3 uVortexDir;
varying vec3 vN;
varying vec3 vW;
varying vec3 vP;
varying vec2 vUv;
${NOISE}

void main(){
  float k = clamp(uKamuiErase, 0.0, 1.0);
  vec3 q = normalize(vP);
  
  // Kamui Space-Time Bending & Spiral Suction directly on the Multiverse Hypersphere surface
  if (k > 0.001) {
    vec3 vAxis = normalize(uVortexDir);
    if (length(vAxis) < 0.01) vAxis = vec3(0.0, 0.0, -1.0);
    
    vec3 upRef = abs(vAxis.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangentX = normalize(cross(vAxis, upRef));
    vec3 tangentY = cross(tangentX, vAxis);
    
    float dotV = clamp(dot(q, vAxis), -1.0, 1.0);
    float alpha = acos(dotV);
    float r = alpha / 3.14159265;
    float theta = atan(dot(q, tangentY), dot(q, tangentX));
    
    // Logarithmic spiral swirling on the giant sphere surface
    float vortexTwist = (14.0 * pow(k, 1.25)) / (pow(r, 0.58) + 0.038) + uTime * (4.2 + 3.8 * k);
    float twistedTheta = theta + vortexTwist;
    
    // Logarithmic metric suction pulling geodesic lines toward vortex axis
    float rSuction = pow(clamp(r, 0.0001, 1.0), 1.0 + k * 1.5);
    float warpedAlpha = rSuction * 3.14159265;
    
    vec3 warpedQ = cos(twistedTheta) * sin(warpedAlpha) * tangentX +
                   sin(twistedTheta) * sin(warpedAlpha) * tangentY +
                   cos(warpedAlpha) * vAxis;
    q = normalize(warpedQ);
  }

  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float ndotv = abs(dot(n, v));
  float rim = pow(1.0 - ndotv, 2.8);
  
  // Spherical celestial coordinates (Quantum flux geodesics & spiral streamlines)
  float lat = q.y;
  float lon = atan(q.z, q.x);
  
  // Continuous Helical & Spiral Flux Streamlines (No static concentric circles)
  float spiral1 = abs(fract((lon / 3.14159265) * 4.0 + lat * 3.5 - uTime * 0.04) - 0.5);
  float spiral2 = abs(fract((lon / 3.14159265) * 4.0 - lat * 3.5 + uTime * 0.035) - 0.5);
  float flowLines = min(spiral1, spiral2);
  float grid = smoothstep(0.46, 0.492, flowLines);
  
  // Subtle iridescent aurora membrane across outer multiverse sphere
  float aurora = fbm3(q * 3.8 + vec3(uTime * 0.012, uTime * 0.008, 0.0));
  vec3 baseCol = mix(uColorA, uColorB, aurora * 0.5 + 0.5);
  vec3 gridCol = vec3(0.0, 0.96, 0.85);
  
  vec3 col = mix(baseCol * 0.4, gridCol, grid * 0.55);
  col += vec3(0.65, 0.35, 0.95) * rim * 1.4;
  
  if (k > 0.01) {
    float kGlow = sin(uTime * 5.0 + lat * 4.0) * 0.2 + 0.8;
    col += vec3(0.0, 0.95, 0.85) * k * kGlow * 0.45;
  }
  
  float alpha = rim * 0.28 + grid * 0.16 + aurora * 0.07;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.55));
}
`;
```

### A.6 Engine wiring — `src/engine/engine.ts` (the black-hole & star excerpts, verbatim)

**(1) The cinematic tier attach + safety net (engine.ts:407-491):**

```typescript
  /* cinematic tier: raymarched overlays live here so a shader failure can
     disarm them all at once (the composite always remains) */
  private raymarchHoles: BlackHoleVisual[] = [];
  private raymarchDisabled = false;
  private onQualityChange: () => void = () => {};

  private attachRaymarchHole(R: number, container: THREE.Object3D): BlackHoleVisual | null {
    if (this.raymarchDisabled || !canUseRaymarchBlackHole()) return null;
    try {
      const overlay = createRaymarchBlackHole(R);
      container.add(overlay.group);
      this.raymarchHoles.push(overlay);
      return overlay;
    } catch {
      return null; /* creation failure can never take down the composite */
    }
  }

  private disableAllRaymarchHoles(): void {
    for (const overlay of this.raymarchHoles) {
      overlay.group.visible = false;
    }
    /* Round 20 — a disarmed geodesic tier must restore the WHOLE composite:
       setCinematic(true) hid the baked disk, core shadow and funnel, and the
       vault's lattice torii. Without this restore a shader failure left a
       half-dressed hole (the R19 latent bug). */
    for (const b of this.bodies) {
      if (b.group.userData.bhRaymarch) this.setCinematicHole(b.group, false);
    }
  }

  /** Round 20 — one switch for the hole's full presentation: the composite
   *  steps aside for the geodesic renderer (and its lattice torii with it),
   *  or everything comes back for the fallback. */
  private setCinematicHole(g: THREE.Object3D, on: boolean): void {
    const bh = g.userData.bh as { setCinematic?(on: boolean): void } | undefined;
    bh?.setCinematic?.(on);
    const spin = g.userData.spin as { r1?: THREE.Mesh; r2?: THREE.Mesh } | undefined;
    if (spin?.r1) spin.r1.visible = !on;
    if (spin?.r2) spin.r2.visible = !on;
  }

  /* Round 20 — frame-budget guard for the geodesic tier. On by default now,
     so instead of a quality toggle the safety net is automatic: if the march
     drags the average frame past ~55 ms (an 18 fps floor, measured ~47 ms on
     Intel UHD at close focus) for ~3 s while a hole is actually on stage, it
     stands down for the session (one-way — no flapping). */
  private _rmGuardFrames = 0;
  private _rmGuardAccum = 0;

  /** True when a raymarched hole is near enough for its march to plausibly
   *  drive frame cost (within ~120 rs — beyond that the quad is tiny). */
  private raymarchOnStage(): boolean {
    for (const b of this.bodies) {
      if (b.data.kind !== 'hole' && b.data.kind !== 'vault') continue;
      const rm = b.group.userData.bhRaymarch as BlackHoleVisual | undefined;
      if (!rm || !rm.group.visible) continue;
      /* world position — body groups ride inside orbit pivots, so .position
         alone is local (and reads as origin) */
      b.group.getWorldPosition(this._vScratch1);
      this._vScratch1.sub(this.camera.position);
      if (this._vScratch1.length() < b.data.radius * 0.62 * 120) return true;
    }
    return false;
  }

  private guardRaymarch(dt: number): void {
    if (this.raymarchDisabled || this.raymarchHoles.length === 0) return;
    /* Round 20.1 — portal dives (vault entry, reality work) have their own
       heavy frame moments; they must never be blamed on the geodesic tier
       and stand it down permanently */
    if (this.portal.phase !== 'idle') { this._rmGuardFrames = 0; this._rmGuardAccum = 0; return; }
    if (!this.raymarchOnStage()) { this._rmGuardFrames = 0; this._rmGuardAccum = 0; return; }
    this._rmGuardAccum += dt;
    this._rmGuardFrames++;
    if (this._rmGuardFrames < 180) return;
    const avg = this._rmGuardAccum / this._rmGuardFrames;
    this._rmGuardFrames = 0;
    this._rmGuardAccum = 0;
    if (avg > 0.055) {
      console.warn('[universe] geodesic black hole exceeded the frame budget — the composite takes over for this session');
      this.raymarchDisabled = true;
      this.disableAllRaymarchHoles();
    }
  }
```

**(2) The Anchor Star assembly (`buildAnchor`, engine.ts:876-931):**

```typescript
  private buildAnchor() {
    const g = new THREE.Group();
    this.starUniforms = { uTime: { value: 0 }, uBoost: { value: 1 } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.starUniforms, vertexShader: starVert, fragmentShader: starFrag });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(6, 96, 64), mat);
    g.add(mesh);

    /* organic shader corona — rays breathe, no layered sprite rings */
    this.coronaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uBoost: { value: 1 },
        uAuroraA: { value: new THREE.Color('#f2c178') }, uAuroraB: { value: new THREE.Color('#7fc4e8') },
        uAuroraMaskA: { value: 0 }, uAuroraMaskB: { value: 0 },
        uAuroraIntensity: { value: 0 }, uAuroraStorm: { value: 0 },
        uEchoBloom: { value: 0 },
      },
      vertexShader: coronaVert, fragmentShader: coronaFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), this.coronaMat);
    corona.renderOrder = 5;
    corona.frustumCulled = false;
    g.add(corona);

    /* the extraordinary quality: two counter-rotating rings of captured starlight */
    const ringPts = (radius: number, count: number, color: [number, number, number], tilt: number, size: number) => {
      const R = Math.random;
      const pts = this.makePoints(
        count,
        (i, a) => { const ang = (i / count) * Math.PI * 2 + R() * 0.06; const rr = radius + (R() - 0.5) * 0.7; a[i * 3] = Math.cos(ang) * rr; a[i * 3 + 1] = (R() - 0.5) * 0.35; a[i * 3 + 2] = Math.sin(ang) * rr; },
        () => 0.5 + R() * 0.9, () => color, () => 0.3 + R() * 0.55, size, true,
      );
      (pts.material as THREE.ShaderMaterial).userData.immuneToVortex = true;
      pts.userData.immuneToVortex = true;
      const pivot = new THREE.Group();
      pivot.rotation.x = tilt;
      pivot.add(pts);
      g.add(pivot);
      return pts;
    };
    const haloA = ringPts(9.6, 700, [1, 0.82, 0.55], 0.28, 1.6);
    const haloB = ringPts(11.4, 420, [0.55, 0.85, 0.8], -0.32, 1.3);
    g.userData.haloA = haloA; g.userData.haloB = haloB;
    g.userData.starMesh = mesh;
    /* Solar Axial Obliquity Tilt (7.25 degrees relative to ecliptic) */
    g.rotation.z = 0.126;
    this.scene.add(g);

    const collider = new THREE.Mesh(new THREE.SphereGeometry(8.4, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
    collider.userData.bodyId = 'anchor';
    g.add(collider);
    this.colliderList.push(collider);
    (g as THREE.Group & { userData: Record<string, unknown> }).userData.anchorGroup = true;
    g.visible = false; /* the cold-open ignites it */
    this.anchorGroup = g;
  }
```

**(3) The hole & vault body construction (engine.ts:1138-1186):**

```typescript
    } else if (data.kind === 'hole') {
      /* Round 16 — a black hole IS a black hole: the legacy primitive
         (black sphere + flat gradient disc) is retired. Any hole anywhere is
         now the same Gargantua-class composite the vault uses — true shadow,
         Shakura–Sunyaev disk with Doppler beaming, photon ring, lensed arcs,
         Einstein-ring star streams — plus the cinematic raymarched tier
         where the GPU allows, and the exact Schwarzschild bend on the
         universe surface (lensStrong is set for kind 'hole' too). */
      const R = data.radius;
      /* Round 17 — the composite is born with its reality's palette, so the
         spacetime funnel's grid is native to this universe from frame one */
      const bh = createBlackHole(R, this.activeReality?.colorA ?? '#38bdf8', this.activeReality?.colorB ?? '#7c3aed');
      g.add(bh.group);
      const rm = this.attachRaymarchHole(R, g);
      if (rm) {
        g.userData.bhRaymarch = rm;
        /* Round 19 — the geodesic renderer owns the disk now */
        bh.setCinematic?.(true);
      }
      rb.mat = undefined;
      g.userData.bh = bh;
    } else if (data.kind === 'vault') {
      /* the Universal Vault — Gargantua: composite black hole (baked
         blackbody disk, photon ring, lensed arcs) built from driver-proof
         primitives; the ray-march shader variant is retired */
      const R = data.radius;
      const bh = createBlackHole(R, this.activeReality?.colorA ?? '#38bdf8', this.activeReality?.colorB ?? '#7c3aed');
      g.add(bh.group);
      /* cinematic overlay: true geodesic lensing above the composite (safe by
         construction — composite stays underneath and owns the shadow) */
      const rm = this.attachRaymarchHole(R, g);
      if (rm) {
        g.userData.bhRaymarch = rm;
        bh.setCinematic?.(true);
      }

      /* slim lattice torii kept as the Vault activity pulse feedback */
      const latticeMat = new THREE.MeshStandardMaterial({ color: 0x0c1418, emissive: new THREE.Color('#6fc2b4'), emissiveIntensity: 1.8, metalness: 0.7, roughness: 0.35 });
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(R * 1.9, 0.04, 8, 110), latticeMat);
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(R * 2.4, 0.026, 8, 110), latticeMat.clone());
      r1.rotation.x = 1.1; r2.rotation.x = -0.7; r2.rotation.y = 0.6;
      g.add(r1, r2);

      g.userData.spin = { r1, r2 };
      /* Round 20 — while the geodesic tier owns the hole, the lattice steps
         aside too (it would cut dark torii silhouettes through the disk glow) */
      if (rm) { r1.visible = false; r2.visible = false; }
      g.userData.bh = bh;
    }
```

*(A.3 note: `blackholeParams.ts` is fully specified in §7.6 — every default, range and
behavior — so it is not duplicated here as code; when in doubt, §7.6 IS the file.)*

---

> *"Attention is gravity. What you look upon begins to orbit you."*
> **— The Chronicler of MY UNIVERSE**
