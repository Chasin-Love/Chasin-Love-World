# ROUND 85 — THE SIX SEAMS (2026-10-01)

> The author's decree: "OK create a new isolated branch from the main branch and solve all
> these six bugs and make our project at the best shape possible."
>
> R83 was the census — report only, "I will decide what to do." This is the decision,
> executed: the six real findings from the deep audit are fixed on the isolated branch
> `r85-the-six-seams` (main untouched — branch work is experimental until the author
> merges), and the census's mechanical remainder is swept to the audit's fixed point.

## The author's rulings (pre-plan)

1. **The six bugs + the mechanical sweep** — when offered the census's fate (sweep now /
   six bugs only / full purge), the author ruled: "Six bugs + sweep," the order-of-battle's
   own item (5).
2. **The small extras** were left to the round: both taken — the MIT notice restore
   (order-of-battle item 3) and the `BUILD` banner refresh.

## What changed

**R85.1 — the sky seam closes (R83-4).** `mapRealityEndpoint`
(`src/platform/desktop/adapter.ts:122`) switched on the **exact** path while its only
query-bearing caller sends `?folder=…` — the `sky/status` case could never match, so the
desktop app booted into an empty sky, hidden since Version 14.3. The switch now reads
`path.split('?')[0]`; the case body already parsed the query off the untouched `path`, so
`sky_status` receives its `folder` exactly as the comment at 139–140 always claimed, and
the web fetch branch keeps the full URL. One line.

**R85.2 — the mirror lands (R83-5).** `/api/realities/write-data` had no desktop twin:
every reality-mirror write on desktop deterministically burned the 5-retry queue and
dead-lettered. The 1:1 mapping the router's own header promises now exists:
the adapter case (`reality_write_data`, the data object JSON-stringified across the
bridge), `realities::write_data` (reusing `resolve_folder`, the server's containment
check, the `realityId`+`mirroredAt` merge and the skip-identical data.json dedupe —
`server/routes/realities.ts:264–312` transliterated), and the registered Tauri command.
The Node daemon's in-memory `markRecentlyWritten` has no desktop twin — the Tauri daemon
status carries no operations log; noted in-source.

**R85.3 — the dead routes rest (R83-6).** `GET /api/realities/folders` (caller-dead; its
Rust helper `list_folders` STAYS — `reality_daemon_status` computes the folder list
internally) and `POST /api/realities/delete-folder` (dead at all three layers; deletion
lives in `/bin/move-to-bin` + `/bin/purge`, both alive) are deleted from the server
router, the adapter switch and the `generate_handler!` registry. Architecture snapshot
consciously refreshed in the same commit.

**R85.4 — the holes are released (R83-7).** `BlackHoleVisual` is a factory, and its
well-formed `dispose()` (window listener, quad geometry, blackbody LUT, shader material)
had no caller anywhere: every hole/vault body ever torn down leaked its
`BLACKHOLE_CHANGE_EVENT` listener and kept "marching" dead —
`criticalImpactParam`'s 40-step per-frame bisection included — through every later reality
switch. `engine.ts` gains `releaseBlackHolesUnder(root)` (traverse for `userData.bh`,
dispose, splice the registry — idempotent), wired into all three teardown paths:
`syncBodies`' removal branch, the galaxy-stage rebuild and `Engine.dispose()`. It runs
BEFORE the generic Object3D teardown so the visual disposes its own live resources.
`blackholeRaymarch.ts` itself is untouched — the round17 gauntlet pins its listener lines,
and `setGeodesic`/the no-fallback hiding are R55 law.

**R85.5 — the void echoes nothing (R83-8).** Two events fired into the void, removed —
not re-wired, because re-wiring is exactly what the laws forbid:
`eventide-vault-pulse`'s listener was **deliberately erased by Round 55's full-erase**
(the round17 gauntlet affirmatively asserts the engine never listens) — `pulseVault`, its
9 call sites and 10 import lines are gone, with a tombstone where the engine bridge
documented the law; `eventide-camera-memory` was announced by `cameraMemory.ts` since R61
but nothing ever listened — the two dispatches and the dead
`CAMERA_MEMORY_CHANGE_EVENT` export died; persistence (localStorage + boot restore) was
always the real contract and is untouched.

**R85.6 — the facade tells the truth (R83-9/10).** The vault barrel's stranded tail —
unused `hasOpfs/hasIdb` imports, an orphaned `import type { BackendStatus }`, and a doc
comment promising a `getBackendStatus()` the R52 purge deleted and nobody ever called —
is deleted, and "backend status" leaves the header claim. Resurrecting the function was
considered and rejected: a zero-caller function would feed the very census it came from.
`isNova` stops being a ghost: `novaScan` now calls the real corpus check instead of its
inline duplicate, `isNova` goes module-private, and the keyring's shadowing local is
renamed `isBreached` (the old name made every usage scan read the function as alive).

**R85.7 — the mechanical sweep (order-of-battle item 5).** De-export, never deletion,
iterated to the audit's fixed point:

- Pass 1: the standing census — 10 dead value exports (de-exported; the audit's four
  `[delete]` constants were de-exported instead, keeping the retired R71 machinery and
  the Kamui ramp documented in source) + 49 dead type exports (all param/return types of
  live functions).
- The unused-import sweep (a one-off TypeScript-compiler script, deleted after use):
  **1147 imported names removed across 26 files** — nearly four× the census's ~299
  estimate (the census counted differently, and R84's test-reality deletions orphaned
  more). tsc green after the sweep is the proof every removal was genuinely
  unreferenced; the scan itself erred on keeping (comments and property names count as
  usage).
- Pass 2: the sweep exposed 63 **second-order** dead exports — the vault preamble's own
  symbols whose last consumers were the unused imports — de-exported too.
- Fixed point: **zero dead value exports, zero dead type exports.**
- Keep-list untouched: `PortalPhase`/`KAMUI_PHASE_WEIGHTS` (round18 pins their source
  text), `realities/*/index.ts` (glob-discovered), the WASM fallback artifact,
  `monaco-esm.d.ts`, `surface.ts` (the daemon auto-repairs it), the `cosmos_sim_*`
  scaffolding (documented deliberate), the audio no-cache branch (safety net).
- The 3 dead CSS classes (`cc-tab`, `cc-tab-active`, `kamui-disappear`) are recorded here
  and untouched — outside this round's ruling.

**R85.8 — the notice returns; the banner tells the truth (R83-3).**
`THIRD-PARTY-NOTICES.md` is restored verbatim from git history
(`git show 5b7812b2^`) — the dgreenheck/webgpu-black-hole MIT attribution the "Version 18"
commits overwrote with "hello" and then deleted, plus the Mitchell Charity blackbody
chain. The MIT license requires the notice to accompany the software, and the geodesic
renderer is a substantial portion of this app. And the banner constant wakes up:
`BUILD = 'R52-v15'` → `'R85'` (App.tsx:39, 33 rounds stale).

## Census ledger (what remains, deliberately)

| Item | Verdict |
| :-- | :-- |
| Dead value / type exports | **0 / 0** (fixed point reached) |
| Unused named imports | **0** (1147 removed; tsc-proven) |
| Dead CSS classes (3) | Recorded, untouched — needs its own small ruling |
| `store_payload_list` / `store_payload_stats` Rust pair | Recorded, untouched — outside the sweep's TS scope |
| Write-only fields, `window.__ACTIONS__`, orphan PNGs, `note.txt` | Recorded in R83, untouched — per-item author rulings still owed |
| `realityDaemon.stop()` graceful-shutdown seam | Unwired seam, untouched — adopt-or-cut is an author's call |

## Verification of this round

- `npm run verify` — **exit 0, ALL GREEN**: typecheck; round16/17/18/63/72/73/74/75/76/
  79/84 gauntlets (all six text-pinning gauntlets re-run individually after the sweep);
  smoke (reference frame matched, histL1 0.0664 ≤ 0.12, zero console errors);
  prod:smoke (the built dist boots, canvas live, zero page errors).
- `npm run audit:arch -- --check` — clean after three conscious `--snapshot` refreshes
  (R85.3, R85.5, R85.7), in the same commits as the changes that moved the census.
- `npm run desktop:check` — **cannot run on this machine** (exit 101: no MSVC toolchain;
  the `link.exe` resolved is Git's coreutils `link`). Same environmental limit R84
  recorded. The Rust twin (`realities.rs` / `lib.rs`) follows the file's existing
  patterns and was reviewed line-by-line; the `cargo check` proof remains queued for a
  toolchained host — now for both R84's FFI extension and R85's `reality_write_data`.
- `npx tsc --noEmit` was run after every step; the round's per-step commits each carry a
  green tree.
