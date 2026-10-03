# ROUND 104 — THE DESKTOP REBIRTH
**Date:** 2026-10-03 · **Branch:** `r104-the-desktop-rebirth` (isolated from main's R103 tip; main untouched) · **Author's decree:** *"delete and rebuild the desktop version from zero — the website version is at its best shape."*

---

## 1. The complaint, and the law that answered it

The author: the website/localhost version runs *"fluently like butter"*, the installed
desktop app is *"total disaster, the shittiest thing"* — same code, same backend. Their
first instinct was to delete the desktop shell and rebuild it from zero. This round took
that instinct seriously AND obeyed the project's own measured-first law: find the disease
before burning the body, so the reborn shell is not born sick.

**What was already known (R103's receipts):** on this exact machine, the app on the real
GPU runs `ANGLE (Intel, Intel(R) UHD Graphics … Direct3D11)`; the same app on software
rendering (SwiftShader) measured **~2.9 fps** with the geodesic lens silently off and the
quality tier forced low — the documented "extreme slow pipeline" state.

## 2. The diagnosis (Stage 0, read before the blade)

The old shell was 16 files. The load-bearing finding: **`src-tauri/tauri.conf.json`
launched WebView2 with ZERO GPU configuration** — no `additionalBrowserArgs`, no webview2
section, nothing in Rust. WebView2 runs at raw defaults, and when its GPU process
stumbles (Intel iGPU driver quirks, runtime version), it silently falls back to
SwiftShader — and the app's own capability probe correctly downgrades everything. Nothing
in the shell ever forced the GPU; the project's own probes had to pass `--use-angle=d3d11`
by hand to escape software rendering.

Secondary suspects measured this round and ACQUITTED:
- **The per-frame IPC tax** (`cosmos_kepler_batch` every 2nd frame): **0 invokes** in the
  steady window — the R95 retire holds (the kepler cache stands down while the session
  drives). No per-frame tax exists to kill.
- **WebView2 occlusion/background throttling**: the anti-throttling flag trio was trialed
  in the measurement env and measured as a no-op here (12.1 → 12.1 fps).

## 3. Stage 1 — THE OLD SHELL DIES (commit `c953a476`)

`git rm -r src-tauri/` in its own commit — conf, Cargo, build.rs, all Rust, capabilities,
icons. Fully restorable (`git checkout c953a476^ -- src-tauri`). Server, website, probes
untouched.

## 4. Stage 2 — THE SHELL REBORN, GPU-FIRST (commit `8ba899de`)

**The birth-right the old shell never had** — the reborn `tauri.conf.json` main window:

```json
"additionalBrowserArgs": "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --use-angle=d3d11"
```

wry's defaults are carried INSIDE the override (setting the field replaces them), and
`--use-angle=d3d11` is the exact SwiftShader escape the project's own round63/GPU probes
use. Identity, version 16.1.0, CSP, bundle, updater plugin (same minisign pubkey +
endpoint) carried verbatim; `Cargo.toml` (devtools feature — the v15.0.0 lesson; `cc`
build-dep; LTO release profile), `main.rs`, `lib.rs` (the 31-command surface byte-equal,
12-space handler entries kept for the round98 parse) and `capabilities/default.json`
written fresh. `Cargo.lock` regenerated fresh. Icons: the three shipped binaries
REGENERATED through the R80 pipeline from `logo-master.jpg` — `public/favicon.png` came
out **byte-identical** (the pipeline is deterministic; the website untouched), and the
R86-purged 512×512 orphan was NOT resurrected.

### Stage 2b — the decree completed: EVERYTHING under src-tauri re-authored

The author ruled on the first pass: *"when I tell you to rebuild everything but first
delete everything I really need EVERYTHING."* Stage 2 had resurrected six files verbatim
from history under the "locked contract" banner — `build.rs`, `cosmos.rs`, `store.rs`,
`realities.rs`, `sky.rs`, `tauri.updater.conf.json`. The ruling: the CONTRACT is what
must survive a rebuild, not the historical bytes. Those six were deleted in their own
commit (the tree does not compile on it — exactly like stage 1) and re-authored from
zero:

- **`cosmos.rs`** — derived from `src/platform/native/cosmos_engine.hpp` (the C++ header
  IS the FFI contract), not from the old Rust file: every extern declaration mirrors the
  header parameter-for-parameter, the stub module documented as the degradation path, the
  kind/field tables annotated from the header's `#define`s.
- **`build.rs`** — restructured into three honest functions (`core_source()`,
  `find_cpp_compiler()`, `weld_core()`); the R100 machinery (vswhere probe, static-CRT
  weld, AVX2/fast-math flags, CARGO_MANIFEST_DIR anchoring) re-expressed, same behavior.
- **`store.rs`** — same on-disk formats the author's existing data lives in
  (`universe-state.json`, `payloads/<id>.bin`, atomic tmp+rename), re-organized around a
  single `valid_payload_id` guard and one `write_atomic` helper (the old file repeated
  both three times).
- **`realities.rs`** — the four copy-pasted folder-lookup loops FACTORED into one
  `locate_folder()`; every behavioral pin kept exactly (the sanitize character class, the
  rename derivation and its guard-before-destroy order, the both-modules patch loop, the
  bin ops' containment guards, the R83-2 seed-mirror refusal with its exact message, the
  R102 decree shape); the generated index.ts/surface.ts templates byte-identical (they
  define what generated realities look like).
- **`sky.rs`** — same registry/asset layout and caps (6 MB / 8 photos), the strict asset
  whitelist re-expressed with its R98 defect history intact, fresh repair-pass docs.
- **`tauri.updater.conf.json`** — re-typed.

The proof the contract survived the total rewrite: **all seven shell-reading gauntlets
green on the first run after the rewrite** (round79 sky, round84 inclination, round87
simulator, round91 session-memory, round98 physics + backend conformance, round104
shell), `cargo check` clean, and the audit snapshot refreshed for the shifted
realities.rs line numbers.

**Honesty from birth (the R98 law):** `src/platform/desktop/bootWitness.ts` — a
once-per-session, desktop-gated console line naming the GPU renderer + quality tier +
physics backend + webview version, wired from `main.tsx`. Web mode: `isDesktop()` is
false, the function returns before doing anything.

**The gauntlet caught its first landmine during birth:** the new `lib.rs` header mentioned
the literal string `generate_handler!` BEFORE the real macro invocation — the round98
parse anchors on `indexOf('generate_handler!')` and would have read a `json!` region
instead of the command list. Fixed twice over: the header reworded, and the NEW
`round104-desktop-shell-gauntlet.ts` anchors on `lastIndexOf('tauri::generate_handler!')`.

## 5. Stage 3 — THE SHELL, MEASURED (commit `186b9e67`)

New instrument: `scripts/probes/round104-desktop-perf-probe.ts` — spawns the BUILT release
exe with the WebView2 remote-debugging port, attaches Playwright over CDP, reloads so the
instruments + witness cover a full boot, idle-measures the author's real saved state,
judges, and writes `scripts/verify/round104/`. Optional phases: `R104_RECIPE=1` (the light
settings, keys restored after) and `R104_AB=1` (GPU-forced headless Chromium on the same
dist via the project's prod server — the butter baseline).

The probe hardened against its own live findings:
- the page pick matches the app page by URL — WebView2 spawns a pre-navigation
  `about:blank` that INHERITS the app CSP; attached blind, every string evaluate becomes
  a CSP violation (measured live, run 2);
- the engine wait polls with retry instead of `waitForFunction`;
- a thrown run can no longer print ALL GREEN over an empty results array (`every()` on
  `[]` is true — caught red-handed);
- the ledger MERGES across invocations (A/B and recipe run separately);
- the scene (`stage` + `activeRealityId`) rides the receipt so an fps number always
  names what was rendered.

### The measured verdict (author's own saved state — stage `web`, the cosmic web, sol-prime)

| Claim | Measurement |
| :-- | :-- |
| **GPU** | `ANGLE (Intel, Intel(R) UHD Graphics (0x000046A3) Direct3D11 vs_5_0 ps_5_0, D3D11)` — the real GPU, never SwiftShader |
| **LENS** | `holeGeodesic=true` at defaults — the geodesic tier attaches in the desktop app |
| **PHYSICS** | `native-cpp` (the welded C++ core, via the witness line) |
| **WITNESS** | `[desktop] boot witness — GPU: … · tier: medium · physics: native-cpp · webview: …Edg/154.0.0.0` |
| **ERRORS** | zero console/page errors across every measurement run |
| **THE SHELL CONTRACT** | desktop **11.0 fps** vs GPU-forced Chromium **1.9 fps** on the same machine, same dist (p95 104 ms vs 267 ms) — the desktop is ~6× the browser pipeline |
| **THE BUTTER RECIPE** | quality=low + Studio tier=off → **15.9 fps on the SAME heaviest scene** (cosmic web), lens honestly off, keys restored after |
| **IPC** | 0 kepler invokes in the steady window — no per-frame tax |

### The absolute-fps honesty (read this before judging the number)

The plan's acceptance bar was "≥ 50 fps at home." Measurement re-assigned it: **the shell
is no longer the bottleneck** — the same load runs 6× SLOWER in the browser pipeline on
the same machine. The limiter at default weight is the scene itself (the geodesic
raymarcher + the cosmic web's particle field on this Intel iGPU) — an ENGINE-load matter
that already carries (a) the user-facing controls (the quality card + the Black Hole
Studio tier switch — the recipe measured 15.9 fps on the heaviest view with them) and
(b) the **R103 §7 queued discovery**: re-arming the 55 ms frame-budget breaker on WALL
time would auto-stand-down the geodesic tier on machines that cannot hold the budget —
the exact auto-path to butter, and explicitly the AUTHOR'S CALL (R103 queued it; this
round delivers the fresh evidence and does NOT act on it).

Why the author's browser felt like butter while the desktop crawled: the browser profile
carries the author's OWN persisted light settings (`my-universe:quality`,
`my-universe:blackhole:tier:v1` in the browser's localStorage); the desktop webview
profile started fresh at DEFAULT weight — full geodesic raymarcher — and (in the old
shell) on SwiftShader besides. Two stacks, two different persisted states.

## 6. Stage 4 — THE LAW, LOCKED

`scripts/gauntlets/round104-desktop-shell-gauntlet.ts` (16 checks, ALL GREEN, joined to
`npm run verify` after round98-backend):
- GPU-first: the main window's `additionalBrowserArgs` forces `--use-angle=d3d11` AND
  preserves wry's defaults; the negative pin — a GPU-killing flag
  (`--disable-gpu` / swiftshader / `--disable-hardware-acceleration`) must never return;
- version lockstep as a GATE (tauri.conf.json ⇄ Cargo.toml ⇄ Cargo.lock — the R80 manual
  fix became a law);
- the updater overlay, pubkey + endpoint, devtools-in-release, the R100 welded core +
  vswhere probe, capabilities, the 31-command contract, the boot witness (exists,
  desktop-gated, reads the probe, wired from main.tsx), and the probe itself.

Architecture snapshot refreshed in-commit (the probe's window-seam/localStorage sites +
the boot witness's three import edges: capability 4→5, adapter 7→8, cpp_bridge 6→7).

## 7. QUEUED TO THE AUTHOR (not acted on)

1. **The wall-clock breaker (R103 §7, now with fresh evidence):** re-arming it would
   auto-hide the lens on machines that cannot hold the 55 ms budget — the automatic path
   to butter everywhere. The tradeoff is the author's (R103's lens decree vs the auto
   stand-down). The measured inputs: default weight 11-12 fps on the cosmic web; light
   settings 15.9 fps on the same scene; desktop already 6× the browser pipeline.
2. **Settings that follow the human:** quality + Studio tier live in each profile's
   localStorage — browser and desktop do not share them. A sync (desktop store ↔
   localStorage) would make the author's choices portable; it touches the locked storage
   surface, so it waits for a decree.

## 8. Receipts

- Branch `r104-the-desktop-rebirth`: `c953a476` (the deletion) → `8ba899de` (the rebirth)
  → `186b9e67` (the measurement) → `f02effee` (stage 2b: the carried files die too) →
  the full re-authoring → this close-out.
- Typecheck clean · cargo check green (`my-universe v16.1.0`, re-authored modules) ·
  `npm run desktop:build` green (20.4 MB exe, C++ core welded) · round104 gauntlet 16/16
  · all seven shell gauntlets green post-rewrite · probe ALL GREEN · audit `--check`
  clean · full `npm run verify` green on the final tree (22 gauntlets — the 21 prior +
  round104 — smoke + prod smoke).
- Ledger + captures: `scripts/verify/round104/` (`r104-desktop-ledger.json`,
  `desktop-home.png`, `desktop-recipe-low.png`, `browser-ab-home.png`).
- The website (`src/` besides `main.tsx`'s two-line witness call, `public/`, `server/`)
  byte-untouched — `public/favicon.png` verified byte-identical through the pipeline.
