# ROUND 86 — THE FULL PURGE (2026-10-01)

> The author's verdict on R83 Part III: "Delete the bucket A … bucket B keep the bucket C"
> — the three-bucket ruling executed on the same branch (`r85-the-six-seams`, still not in
> main). R85 retired the census's exports and imports; R86 settles the rows the census
> could not classify for itself: the provably dead, the unwired, and the pinned.

## The round's lesson (the trap that almost fired)

`.kamui-disappear` and `@keyframes kamuiVortexOut` were deleted as audit-dead CSS — and
**round18's gauntlet immediately failed**: it pins the v1 vortex CSS (appear / disappear /
demon pulse / eye warp) in source text. Both were restored verbatim with an in-source
warning, and the census ledger gains a new category: **"looks dead but is gauntlet-pinned."**
`audit:arch` is a drift detector, not a law arbiter — the gauntlets outrank it. (Trap §10
#10 honored: the check was reconciled, never deleted.)

## Bucket A — the dead weight rests (R86.1)

- **Never-called code:** `zoomToDemonCore()` (engine — the Demon Core visuals live, only
  the helper was orphaned), `portalBodyRadiusForReverse()` (hand-inlined at two sites,
  method left behind), `scripts/test-upload.ts` (dead AND broken — its import could never
  resolve).
- **Write-only engine fields:** `arrivalZoom`, `_camMemStable`, `echoShowerClock`,
  `skyApplying` (the try/finally "re-entrancy guard" nothing consulted — now a plain
  await), `timeScale` (no setter ever existed; its one read constant-folded to 1).
- **`window.__ACTIONS__`** — set, never read, and the comment claiming parity with
  `__ENGINE__` was false (that one IS consumed by smoke.ts).
- **Dead prop** `subjectBadge` on CosmicLineageModal (accepted, fallback-rendered, never
  passed — the fallback expression remains as the only behavior).
- **Dead CSS:** the console-tab family (`.cc-tab`, `:hover`, `.cc-tab-active`, the
  `ccTabUnderline` keyframes — their only consumer) and the `--color-danger` token.
- **Orphan assets:** `src-tauri/icons/512x512.png` (not in `bundle.icon`; make-icons
  regenerates it) and the 11 historical verify PNGs r54–r60. `reference-hole.png` (the
  live smoke gate) and `r63-probe.png` (the probe's own output) stay.
- **Dead Rust pair:** `store_payload_list`/`store_payload_stats` — Tauri commands,
  registration entries, the `store.rs` implementations and the `PayloadStats` struct.
  One `git show` away if a storage browser is ever built.

## Bucket B — the seams get wired (R86.2)

1. **`STORAGE_KEYS.universeStateRecovery`** — persist.ts now uses the constant instead of
   its `${STORAGE_KEY}:recovery` template twin. The key is byte-identical
   (`my-universe:v4:recovery`); the change is that the locked localStorage surface has ONE
   source of truth again, so a careless edit to either side can no longer silently break
   every user's universe-state recovery.
2. **`realityDaemon.stop()`** — finally called: SIGINT/SIGTERM handlers in server/index.ts
   stop the scan interval and close the listener (2 s force-exit backstop). The
   graceful-shutdown seam the daemon always offered is no longer dead code.
3. **THE SEED GUARD (R83-2, three layers):** Sol Prime's `data.json` mirror can never be
   churned by a stale browser generation again (the Version 17.1 incident):
   - the client (`actions.ts exportRealityData`) skips `sol-prime` entirely — no write,
     no queue burn, no toast;
   - the server route 400s (`Sol Prime is the read-only seed`), matching the refusal
     every other mutating route already had;
   - the desktop twin (`realities::write_data`) errs after `resolve_folder`, mirroring
     `move_to_bin`'s guard.

## Bucket C — kept, with reasons (the §10 trap avoided)

- `engine.reducedMotion` — unread, but it is the engine's ONLY `prefers-reduced-motion`
  hook, and reduced-motion variants for every portal beat are LAW. Wiring the portal
  beats to honor it is its own small round if wanted; deleting it would amputate the
  fix-point.
  **Addendum, same day — the author's ruling:** after reading this ledger, the author
  REJECTED engine-side reduced motion outright: "I make the Kamui violent — that makes
  the Kamui the Kamui." The probe was deleted with the decree and the portal beats will
  never honor `prefers-reduced-motion` (§6 carries the law note; do not resurrect
  unasked). The CSS-level handling for console UI stays as shipped.
- `window.__MY_UNIVERSE_PERF__` — opt-in (`?perf`) console diagnostic. Tooling, not
  weight.
- The four write-only state timestamps (`visitedAt`, `lastSyncTime`, `lastScrubAt`,
  `startedAt`) — serialized diagnostics; removing them churns persisted shapes for zero
  gain.
- `note.txt` — the author's own folder map, accurate; not ours to delete.
- `cosmos_sim_*` + `KIND_*` — documented deliberate scaffolding (lib.rs:306–311).
- The eternal keep-list: audio no-cache branch (safety net), `surface.ts` (daemon
  auto-repairs it), `realities/*/index.ts` (glob), `PortalPhase`/`KAMUI_PHASE_WEIGHTS`
  (round18 pins), WASM fallback artifact, `monaco-esm.d.ts`, and now
  `.kamui-disappear`/`kamuiVortexOut` (round18 pins — see the lesson above).

## Verification of this round

- `npx tsc --noEmit` green after every step; `npm run audit:arch -- --check` clean at the
  consciously refreshed snapshot (deadCss and fileCount moved in the same commit as the
  deletions).
- All six text-pinning gauntlets green — including round18, after the restoration above.
- `npm run verify` full chain re-run at round end (see the brain's verification bullet).
- `desktop:check` still unrunnable on this laptop (no MSVC toolchain — the R85.2 caveat
  now also covers the seed guard in `realities.rs`, which mirrors `move_to_bin`'s exact
  pattern).
