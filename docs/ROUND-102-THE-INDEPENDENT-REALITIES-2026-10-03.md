# R102 — THE INDEPENDENT REALITIES (2026-10-03, branch `r102-the-independent-realities`)

> The author's decree: *"the back end and the reality folders need to be separate
> completely… if a reality got compromised I can just easily delete them and that
> virus is totally gone with the deleted file — it's supposed to look like it
> doesn't even exist, not now, not before."*

## The decree, restated as law

**No reality is load-bearing for the project.** Not even Sol-Prime, the canonical
home. A reality is a folder under `src/realities/*/index.ts`, discovered purely by
`import.meta.glob`; ANY of them — including the home one — can be deleted from the
code tree, moved to the Quantum Bin, renamed, or permanently purged, and the
project keeps booting clean. With zero realities the universe is the empty
multiverse: the intro veil lifts, the giant sphere renders, the camera rests on
it, and the Core Console opens so the author can forge the next universe.

## The cut list — every place Sol-Prime was wired into the core

| Layer | Before | After |
| :-- | :-- | :-- |
| `src/realities/index.ts` | static `import { solPrimeReality }`, forced `map.set('sol-prime', …)`, hardcoded `folderById` seed, glob only deduped | pure glob discovery; the folder map derives only from the glob |
| `getReality()` | fall back to `REALITIES[0]`, contract `RealityConfig` | may return `undefined`; all callers guarded (typecheck-driven sweep) |
| `engine.activeRealityId` | `'sol-prime'` literal default | `string \| null = null` |
| `engine.setReality(null)` | (impossible) | legal: hides the anchor when the home realm is gone, stands the driver down, snaps the stage to the multiverse |
| boot first frame (engine `bootIntro` finalize) | unconditional `cosmicStage = 'web'` + anchor shown | with no active reality the quiet opening lands on the multiverse sphere |
| `universeDriver` tick | `enableDriver(this.bodies, this.simDays, this.activeRealityId)` unconditionally | guarded on an existing scope; re-arms from `setReality` when a reality lands into a driver-armed empty multiverse |
| `applyActiveSky` | forced a sky resolution | with no reality, the neutral dome (photo dome cleared) |
| `surfacePresets` | fallback preset was sol-prime itself | new `NEUTRAL_SURFACE` is the generic dome; sol-prime stays an entry in the map only while its folder ships |
| `store.ensureBucket` / `bucket()` | conjured a phantom `'sol-prime'` container | an absent id returns a transient empty bucket; the snapshot's derived views are empty on the empty multiverse |
| `persist.loadState` migrations | v4 migration coalesced everything onto `'sol-prime'` | flat-era data still lands where it historically belonged, but the active pointer reconciles to the first KNOWN reality (or `''`), never a phantom |
| `existing-content reconciliation` | nothing — a deleted-folder ghost container lingered in `realities` | boot-time prune: a reality with no folder, no custom registry, no bin entry leaves zero trace (container + payloads destroyed) |
| `seeds.createInitialSeed` | always returned the Sol-Prime cast | takes `homeExists`; with the folder gone a fresh install seeds the empty multiverse instead |
| `actions.deleteReality` | `if (realityId === 'sol-prime') return;` | removed; the active-fallback lands on a survivor or the empty multiverse |
| Core Console card delete button + toast | hidden for sol-prime, "primordial anchor" refusal | offered for every reality, two-step confirm intact |
| MultiverseBar `handleDeleteReality` | `--sol-prime` early return | removed |
| server `realityDaemon.moveToBin` / rename | "Sol Prime is the primordial anchor…" refusal | removed (the bin-into-itself refusal stays) |
| Rust `realities.rs` `is_protected` | shielded `solPrime` + `sol-prime` + bin | only `bin`/`.bin` stay protected; write-data keeps its R83-2 read-only-seed-mirror guard (that protects the committed `data.json` mirror, not the deletion law) |

## Zero-trace purge — "it's supposed to look like it never existed"

A PURGE (from the Quantum Bin, not from the code tree) now destroys every trace in
one stroke at `src/state/actions/realities.ts`:

- the world container (`state.realities[id]`),
- every encrypted vault payload the container referenced (via `delPayload`),
- every diary attachment payload,
- the disk-folder address map entry,
- the N-body session memory via the new `forgetSession(realityId)` in
  `sessionDriver.ts` (deletes the home scope's key and any `${realityId}:` scoped
  children from the locked `my-universe:sim-session:v1` memory).

The `deletedRealityIds` tombstone is kept deliberately within the session (the
build-time glob already answered; without the marker a purge would resurrect the
reality in the UI until the next reload). `emptyRealityBin()` sweeps the same way.
The boot-time ghost-prune in `persist.ts` mirrors it for realities whose folder
was deleted AT THE SOURCE between sessions.

## The mutation proof — the folder actually dies and the app stands

`scripts/probes/round102-independence-probe.ts` physically moves
`src/realities/solPrime` out of the tree, spawns a fresh dev server, boots a real
headless Chromium, asserts, screenshots, and restores the folder in a `finally`
(the mutation is the test, not the product). Result **ALL GREEN**:

- the intro veil lifts, the engine ignites, no ignition-failure overlay
- zero page errors, zero console errors (dev-server HMR noise excluded)
- the engine anchors NO reality (`activeRealityId === null`)
- the camera rests at the multiverse stage — the giant sphere renders
  ([empty-multiverse-boot.png](../scripts/verify/independence/empty-multiverse-boot.png))
- zero reality marbles render
- the Command Palette opens, the Core Console mounts on the empty multiverse —
  dashboards read "Anchor: None — the multiverse is empty" and the Forge pods
  answer ([empty-multiverse-console.png](../scripts/verify/independence/empty-multiverse-console.png))

## Reconciled checks (the negatives proven by mutation, per R98's law)

- **round98 backend gauntlet**: the old pin `both backends protect sol-prime from
  rename` inverted to the decree pin — `R102: neither backend single-cases
  sol-prime in rename or move-to-bin`, mutation-provable: any old refusal line
  reappearing in the daemon or the Rust twin fails it.
- **round92 gauntlet**: the heal pin updated to the reality-gated form
  (`if (this.universeDriverOn && this.activeRealityId)`) — the law intact,
  narrower on purpose.

## What did NOT change

- Boot truth of a shipped reality stays `index.ts` (R83-2 law: Sol Prime's
  committed `data.json` mirror still refuses browser churn — the file stays
  read-only on both backends; this protects the *committed mirror*, not the
  deletion right).
- The Quantum Bin flow (Bin → restore/purge), the disk daemon's 3s self-heal,
  the Kamui, the R71 dial law, the driver architecture — untouched.
- `scripts/probes/` and the README's creative constants/seed tables — untouched.

## Session artifact (recorded honestly)

Around the middle of this round two **interleaved commits** landed on the branch
(`e730a0a8`, `102edf11`) carrying R101.3/R101.4 content + most of this round's
edits, authored by parallel work on the same repo. The R102 round-delta left
uncommitted after verification was: the boot-intro empty-multiverse snap
(engine.ts), the R102 reconciliations in the two gauntlets, and the final
independence captures. Those are committed now as the round's close-out. The
R102 work content is the same either way — the tree is the source of truth and
it verifies green.

## Receipts

- `npx tsc --noEmit` — clean (the union engine source used by 14 gauntlets follows live).
- `npm run verify` — ALL GREEN: 21 gauntlets; smoke on the lone in-chain dark frame was the documented cold-boot flake (§9): standalone re-run **histL1 0.0690 vs 0.12**, `SMOKE TIER — wasm`, zero console errors; prod smoke GREEN (built dist boots, canvas live, zero page errors).
- `npm run audit:arch -- --check` — clean (snapshot refreshed in-commit; the flag on `shadowReferencesFiles` remains internally used, so the snapshot line persists as the sweep's own accounting).
- Independence probe — ALL GREEN under a real folder deletion.

Run the mutation proof any time the folder law is doubted:

```
npx tsx scripts/probes/round102-independence-probe.ts
```
