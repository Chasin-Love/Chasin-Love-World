# ROUND 96 — THE TIDY HOUSE (2026-10-02)

> The author's verdict, looking at the file tree: *"the frontend looks genuinely
> good… but look at the back — there is no scientific structure, no particular
> structure, no defined architecture; the backend is total mess."* This round is
> the honest answer: an audit of what the tree actually is, the one real mess
> fixed, and the architecture made visible. Branch `r96-the-tidy-house`, cut
> from main's v16.0.0 tip. No law, constant, seed, shader, or `src/` line touched.

## 1. THE AUDIT (report-first — what the screenshots actually showed)

- **There is no backend.** Offline-first is a sovereignty law (PROJECT-BRAIN §2.4).
  The "backend" is the Tauri shell: **6 Rust files, 1,715 lines, 31 commands**,
  every file header-documented (lib/cosmos/realities/sky/store/main) — small and
  coherent, plus the 7-file Express dev host that desktop replaces natively.
- **The scary folders are build output, not source.** `src-tauri/target/` is
  3.8 GB of untracked Rust cache; `dist/` 29 MB; `node_modules/` — **0 files
  tracked among all of them** (`.gitignore` acquits itself completely). The
  entire repo is 285 tracked files; the git pack is 155.62 MiB.
- **The architecture exists and is enforced.** `src/state/actions.ts` is the
  single mutation surface (verified: nothing mutates outside it); the engine has
  ZERO imports from state and speaks only through `EngineCallbacks`; the layer
  map (domain → state → engine/physics/platform/realities/vault → ui) is real;
  `audit:arch --check` holds a frozen 150-file/383-edge snapshot.
- **The ONE genuine mess: `scripts/`.** 32 files flat, named chronologically
  (round16 → round95) instead of by purpose — 19 regression gauntlets, 4
  standalone probes, 5 build tools, and the 3 top-level gates all interleaved.
- **The docs were stale, which is why the architecture was invisible.**
  `docs/ARCHITECTURE.md` was a 157-line R52 record (it still listed
  `blackhole.ts` — deleted in the R53–R64 renaissance — and put the WASM
  artifact at `src/platform/native/wasm/` — moved to `public/wasm/` in R89).

## 2. THE MOVE (R96.1 — `scripts/` regrouped by purpose)

```
scripts/  top level: 32 files → 5 files + 5 folders
├── README.md                    ← NEW: the catalog + the laws of this folder
├── audit-architecture.ts        (stays)  ├── architecture-snapshot.json (regenerated)
├── smoke.ts / prod-smoke.ts     (stay)   ├── verify/            (stays — golden frames)
├── gauntlets/                   ← 19 per-round gates (ALL in npm run verify)
├── probes/                      ← round63-void-probe, round92-live-check,
│                                   round95-physics-probe, round95-steady-sky-live
└── tools/                       ← build-wasm.sh, make-icons.mjs, make-latest-json.mjs,
                                   generate-architecture-diagram.ts, setup-windows-toolchain.ps1
```

**Every reference followed the move** (all via `git mv` — history preserved):
- `package.json` — the verify chain's 19 gauntlet paths.
- `audit-architecture.ts` — its two locked path-encode file entries
  (`scripts/gauntlets/round17-gauntlet.ts`, `scripts/tools/build-wasm.sh`).
  Its directory walker was already recursive — no coverage change (verified).
- `AGENTS.md` — the two prescribed commands; `.github/workflows/desktop.yml` —
  the two tool invocations (+ one display name).
- **~132 relative-root rewrites inside the moved files** (`'../src` ×108,
  `'../package.json` ×11, `'../src-tauri` ×7, `'../server` ×2, `'../scripts` ×3,
  `'../README.md` ×1), the three probes' `ROOT` computations, `build-wasm.sh`'s
  own root (`/../..`), round63's self-path assertion inside `package.json`
  (`'scripts/gauntlets/round63-void-gauntlet.ts'`), and two cross-gauntlet reads
  (round87/91 → `tools/build-wasm.sh`; round95-steady-sky → `probes/round95-physics-probe.ts`).
- `architecture-snapshot.json` regenerated **in the same commit** per the
  audit's law (66 lines of path keys absorbed; `--check` clean).

**Canary receipts before the commit:** round16/17/63 gauntlets green from their
new homes (63 proves its own verify-chain wiring), the physics probe ran 30
sim-days clean on the real seed (`worst ratio 0.99`), `audit:arch --check` clean.

## 3. THE VISIBILITY (R96.2 — the architecture, on the surface)

- **`docs/ARCHITECTURE.md` rewritten** from the stale R52 record to post-v16.0.0
  truth: §1 the generated diagram + layer sketch, §2 the physics tier chain
  (C++ → WASM → TS) and the R91–R95 session-driver story (canon seeds / session
  drives / clockwork heals), §3 the per-module map with current numbers
  (engine.ts 6,984 ln, DiaryWindow 1,659, src-tauri 1,715 ln / 31 commands),
  §4 verification incl. the physics probe's role, §5 locked paths (now with
  `public/wasm/` and `my-universe:sim-session:v1`), §6 persistence map, §7 the
  honest debt register (engine.ts decomposition stays its own planned round).
- **Diagram regenerated**: `docs/architecture-diagram.html` + `.mmd`
  (120 files / 379 edges) by the relocated generator.
- **`scripts/README.md`** — every file cataloged in one line each; the folder's
  three laws (never delete/weaken a gauntlet; snapshot in the same commit;
  gauntlets live exactly one level deep).
- **PROJECT-BRAIN §5** repo map refreshed (the regroup, sessionDriver, wasm,
  true counts); **README §3** topology surgically refreshed (the scripts block,
  four stale paths, an honest recount: src 121 · server 7 · src-tauri 16 ·
  scripts 39 · docs 67 · public 22 tracked); **note.txt** folder guide updated.

## 4. THE GATE

- **`npm run verify` — the full chain, green in one run (VERIFY-EXIT=0):**
  typecheck + all 19 relocated gauntlets + smoke (histL1 0.0716, zero console
  errors) + prod:smoke (the built dist boots, canvas live).
- **Honesty note:** the FIRST full-chain run went 19-for-19 on gauntlets, then
  hit **SMOKE RED** — `page.evaluate: Execution context was destroyed… because
  of a navigation`. This is the cold-boot flake first diagnosed in R84 ("never
  reproduced" — it now has a second sighting). The immediate smoke re-run was
  GREEN (histL1 0.0707) and the second full chain was green end-to-end. The
  flake is a boot-timing race in the harness, not a product defect — no `src/`
  line changed in this round.
- **`audit:arch --check` CLEAN** against the refreshed snapshot.

## 5. WHAT DID NOT CHANGE

- No gauntlet deleted, weakened, or edited in its assertions — **moved only**
  (the single string edit inside round63 makes the check assert its NEW chain
  path; its meaning is unchanged).
- No `src/` code, no physics constant, no seed table, no shader, no Rust line,
  no server line. The product is byte-identical; the smoke frame proves it
  (0.0716 vs the green band).
- Historical `docs/ROUND-*.md` still point at the old scripts paths — they are
  records, not rewritten.

## 6. HONEST LIMITS

- The smoke cold-boot flake now has two sightings (R84, R96), green on every
  immediate re-run. If it recurs, a boot-retry guard in `smoke.ts` is its own
  tiny round.
- `desktop:check` remains unrunnable on this laptop (no MSVC) — no Rust touched.
- Old round docs' stale paths are accepted as history; `scripts/README.md` and
  the refreshed maps are the live truth.
