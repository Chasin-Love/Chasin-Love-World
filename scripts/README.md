# scripts/ — the housekeepers

Nothing here ships to the user; everything here guards or builds the app.
Three kinds of resident, one folder each, plus the top-level gates.
Regrouped in R96 (chronological flatness → purpose).

| Resident | Count | What it is |
| :-- | :-- | :-- |
| `gauntlets/` | 19 | Per-round regression gates (R16 → R95). Each asserts source-level invariants of one round — mostly `readFileSync` + assertions on `src/` text, some pure math. **All 19 run inside `npm run verify`.** |
| `probes/` | 4 | Standalone diagnostics, run by hand when hunting. **NOT in the verify chain.** |
| `tools/` | 5 | Build & release machinery: the WASM core, icons, updater manifest, architecture diagram, Windows toolchain. |
| top level | 4 + 1 | `audit-architecture.ts` (+ its frozen `architecture-snapshot.json`), `smoke.ts`, `prod-smoke.ts`, and `verify/` (the golden frames those gates compare against). |

## The verify chain (`npm run verify`)

```
typecheck (tsc --noEmit)
  → 19 gauntlets  round16 → round95-steady-sky     (source invariants + math)
  → smoke         (headless boot, zero console errors,
                   frame match vs verify/reference-hole.png)
  → prod:smoke    (serves the built dist/, asserts the boot again)
```

`npm run audit:arch` is the structural twin: report / `--snapshot` / `--check`
against `architecture-snapshot.json` (exit 1 on drift).

## The laws of this folder

1. **A gauntlet is never deleted or weakened.** If one disagrees with your
   change, your change is wrong until reconciled (fix the code, or consciously
   reconcile the check in the same commit — never delete the check to pass).
2. **Any structural change regenerates the snapshot in the same commit:**
   `npx tsx scripts/audit-architecture.ts --snapshot`.
3. Gauntlets and probes read the tree via `new URL('../../…', import.meta.url)`
   — they assume they live exactly one level under this folder. Keep them there.

## Catalog

**Top level (the gates)**
- `audit-architecture.ts` — R52 structural auditor: dead exports/types/CSS, import graph (incl. `import.meta.glob` edges), path-encode inventory (the locks), localStorage keys, window seams, LOC leaders. `--snapshot` regenerates, `--check` exits 1 on drift.
- `architecture-snapshot.json` — the auditor's frozen output; committed; regenerated only by `--snapshot`.
- `smoke.ts` — headless Playwright boot: zero console errors + Eventide frame matched against `verify/reference-hole.png` (16-bin luminance histogram + region bands).
- `prod-smoke.ts` — serves the built `dist/` and asserts the boot again (the v15.0.0 black-screen gate).

**gauntlets/ (R-numbered, all in `npm run verify`)**
- `round16-gauntlet.ts` — GR lensing math, pure.
- `round17-gauntlet.ts` — funnel/photo-lens math + SOURCE-TEXT assertions across engine/black-hole/capability files; the auditor's special file.
- `round18-kamui-gauntlet.ts` — the Kamui portal machine (vortex, timings, per-pixel DOM bend, living spin).
- `round63-void-gauntlet.ts` — absolute void around the hole; also proves its own verify-chain wiring.
- `round72-stage-arrival-gauntlet.ts` — the staged membrane arrival.
- `round73-throat-gauntlet.ts` — the throat is not swallowed (hole/vault bodies refuse the gulp drain).
- `round74-herald-gauntlet.ts` — honest hover colliders + the holographic shell.
- `round75-bridge-gauntlet.ts` — the unbroken bridge (card survives the journey to its own buttons).
- `round76-gauntlet.ts` — the steady herald + the web door (reality click = explicit Kamui to the cosmic web).
- `round79-sky-gauntlet.ts` — the one sky (photo sky owns the view; contract tiers across registry/server/Rust).
- `round84-inclination-gauntlet.ts` — ascending nodes end-to-end (TS/C++/Rust/bridge parity).
- `round87-simulator-gauntlet.ts` — native simulator bridge (three tiers + `verifyTwinParity`); pins the WASM export surface in `tools/build-wasm.sh`.
- `round88-per-frame-twin-gauntlet.ts` — the twin lab stays read-only (never writes rendered state).
- `round90-reachable-twin-gauntlet.ts` — the console deck is scrollable; the Twin Jump seal.
- `round91-session-memory-gauntlet.ts` — session memory: batched read, save/restore over the locked key, freshness law.
- `round92-driver-shadow-gauntlet.ts` — the driver seam + ownership (twin rests while the session drives).
- `round93-real-moons-gauntlet.ts` — deterministic moon identity, mass law, world→local seam.
- `round94-the-flip-gauntlet.ts` — the universe boots DRIVING (flag law, scope swaps, star-led rosters).
- `round95-steady-sky-gauntlet.ts` — the substep law, orbit-true seed, vault temper, crossfade seam, softening lockstep; reads `probes/round95-physics-probe.ts`.

**probes/ (standalone, hand-run)**
- `round63-void-probe.ts` — runtime GPU void diagnostic (`--gate` writes `verify/r63-probe.png`).
- `round92-live-check.ts` — Playwright live receipt (nine PASSes incl. the session stepping under a live sky); writes `verify/r92-*.png` (cwd-relative — run from the repo root).
- `round95-physics-probe.ts` — THE honest probe: drives the real `driverTick` headlessly (argv[2] = sim-days, default 400). Regexes can't tell you an integrator is stable; this can.
- `round95-steady-sky-live.ts` — three real minutes in headless Chromium over `window.__ENGINE__`.

**tools/ (build & release)**
- `build-wasm.sh` — emscripten build of `src/platform/native/cosmos_engine.cpp` → `public/wasm/`; pins the full bridge export surface + HEAPF64 (their absence once silently degraded the whole WASM tier to TypeScript).
- `make-icons.mjs` — the author's sigil → Tauri icons + favicon (DIB-correct ICO; cwd-relative).
- `make-latest-json.mjs` — the Tauri updater manifest for GitHub releases (CI-only; cwd-relative).
- `generate-architecture-diagram.ts` — snapshot → `docs/architecture-diagram.html` + `.mmd` (generated, never hand-edited).
- `setup-windows-toolchain.ps1` — one-shot Windows toolchain setup.

**verify/ (golden assets)**
- `reference-hole.png` + `reference-metrics.json` — the smoke gate's reference frame.
- `r63-probe.png`, `r92-1/2/3-*.png` — probe receipts, re-captured by hand.
