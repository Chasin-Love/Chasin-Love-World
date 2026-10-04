# ROUND 105 — THE VANISHED MARBLE (2026-10-04)

> The author's report, after test-driving the R102 independence decree on the
> R104 desktop rebirth: *"I can delete all the folders but I can't delete
> Sol-Prime — not because it is the home reality, but because it is the first
> reality made while the logic was building, so it is deeply integrated into
> the logic… even after I delete them I can see the reflection, or the image,
> in the multiverse giants view. Solve the problem — and don't mess up this
> time."* The decree stands from R102: a deleted reality must look like it
> never existed — **not now, not before.**

Branch: `r105-the-vanished-marble`, cut from main's R104 tip. Three commits,
each independently verified.

---

## 1. THE DIAGNOSIS — three findings, each verified against the code before a line was written

### Finding 1 — THE GHOST MARBLE (the screenshot)

The multiverse stage builds one glass marble per reality at engine
construction (`engine.ts:700`, from the `REALITIES` registry). The **only**
runtime rebuild of that scene is the App's "EXISTENCE SYNC" effect
(`src/App.tsx`, the `galSig/metaSig/customIdsSig/deletedSig` effect). Its
`skipFirstRebuild` ref exists to skip one redundant rebuild — *"constructor
already built it"* — but the engine ignites **asynchronously** (dynamic
import), so at mount the effect bailed at `if (!eng) return` **without
consuming the guard**. The guard was therefore still armed when the first
real change of the session arrived — and the first real change of a session
is typically the first `deleteReality`. That effect run consumed the guard
and **returned without rebuilding**: the deleted reality's glass sphere,
spiral galaxy disc, orbit-ring ellipses and click collider stayed in
`gMultiverse`, `realityGroups`, `multiverseColliders` — rendering at full
strength on the multiverse stage, forever. Hovering the ghost even resolved
through `getReality`'s survivor fallback to the FIRST SURVIVING reality, so
the app narrated the wrong universe over the dead one's body. Any later
signature change (a second delete, a galaxy edit) fired a real rebuild and
cleaned the scene — which is exactly why the ghost looked intermittent.

### Finding 2 — THE LYING DISK LEG (the "can't delete Sol-Prime" feeling)

In the compiled desktop app, committed packs like Sol-Prime exist only inside
the bundle: `realities_dir()` resolves to the app-data tree, which never
contained them. So every bin verb errored — the Node daemon's and the Rust
shell's `move_to_bin` both returned *"Directory … does not exist."* — the
client toasted *"⚠ … collapsed in the multiverse, but its disk folder could
not reach the bin — will retry"*, and the op burned the 5-retry disk queue
before being dropped. All of that for a deletion whose state side had fully
landed. The bin UI (state-side `binRealities`) held the reality; the toast
was a lie; the queue churn was waste.

### Finding 3 — THE RESURRECTION WINDOW (the decree's last gap)

On the desktop, the **only** thing keeping a deleted pack dead across boots
was the persisted `deletedRealityIds` tombstone in saved state. A wiped /
fresh-installed / corrupt saved state re-seeds from the bundle
(`createInitialSeed(newId, homeExists=true)` — `homeExists` read from the
baked glob, which always matches in production) — and the deleted reality
walked back out of its grave. R102's own tombstone comment states the premise:
*"the marker is a dead id once the disk folder is wiped — on every later boot
the glob no longer matches anything"* — **true only in dev**. In production
the glob always matches, forever.

---

## 2. THE FIX — two stages, four commits

### Stage 1 — the ghost dies; the disk leg stops lying (commit `41f0146c`)

**The one-line heart:** the EXISTENCE SYNC effect now carries `engineReady`
in its deps — the exact law the physics-toggles effect one block above has
obeyed since Round 14 (*"engineReady re-fires this after the async boot"*).
The engineReady re-fire consumes the skip guard for its intended purpose, so
the FIRST delete/edit/rename/create of every session performs its rebuild.
Both orders of the async boot are safe: a sig change that lands before
engineReady consumes the guard, and the engineReady re-run then rebuilds
anyway.

**The disk leg, on BOTH backend twins in the same commit (R98 lockstep):** a
bin verb that resolves to **nothing on disk is a success no-op**, not an
error. `realityDaemon.moveToBin/restoreFromBin/purgeFromBin` gained explicit
nothing-on-disk success branches; `realities.rs`'s
`move_to_bin/restore_from_bin/purge_from_bin` now return a `BinOutcome
{ target, noop }` which `lib.rs` shapes as `{ "success": true, "noop": true }`.
The state-side operation is the whole truth: no toast, no queue burn.
Bin-into-itself refusals and every containment guard untouched.

### Stage 2 — THE TOMBSTONE LEDGER: deletion is permanent (commit `44ecf303`)

Both backend twins now record every deliberate deletion as an empty file,
**`bin/.tombstones/<realityId>.tombstone`**:

- **move-to-bin writes** it (the moment of death),
- **purge writes AND KEEPS** it (permanent death — the record is what keeps
  the pack dead),
- **restore clears** it (the reality may live again),
- **empty-bin keeps all of them** (emptying the bin is the last word).

The bin-list responses (server `GET /api/realities/bin` + Tauri
`reality_bin_list`) carry an additive `tombstoned: string[]` field;
dot-directories (`.tombstones`) are filtered from every bin listing. The
client adopts the ledger through a new `adoptDiskTombstones(ids)` action on
the single mutation surface — merging unknown ids into `deletedRealityIds`
(skipping re-created ids: **creation outranks a tombstone**), pruning any
freshly-seeded phantom container payload-and-all, `forgetSession`,
recompute, and surfacing the traveler if the resurrected pack was booted
into. Fired alongside the engine import in App.tsx's boot effect and adopted
on every realitySync poll as the safety net. The ledger is gitignored —
runtime disk state, never source.

**THE LIVE CHECK'S CATCH — empty-bin ate the ledger.** The first scratch run
against the real daemon measured `emptyBin → count: 1`: the new `.tombstones`
directory was itself being erased as if it were a binned reality, destroying
the permanent-death records. Fixed on BOTH twins (dot-directories are never
emptied), and re-measured: `count 1 → 0`, ledger survives.

---

## 3. THE RECEIPTS (commit `c30e4408`) — every negative proven by mutation

### The gauntlet — `scripts/gauntlets/round105-vanished-marble-gauntlet.ts` (17 checks, in the verify chain)

Pins the engineReady dep; the boot + poll adoption; the adapter reader; the
Node twins' noop branches; the tombstone lifecycle **scoped inside each
verb's body** (a whole-file count proved placement-blind and caught itself —
see below); the Rust mirror of all of it; the bin lists' tombstoned field.
**Three mutations** (engineReady removed; Rust tombstone writes removed;
empty-bin filter removed) each drove it red; the restored tree is green.
The gauntlet caught its own vacuous check during construction: the empty-bin
pin originally used a lazy whole-file regex that the `getStatus` filter
elsewhere in the file satisfied — the R98 disease, found by the R98 medicine
(ask "what would make this check unable to fail?", break the code, watch).
Every lifecycle pin is now scoped by a `bodyBetween` slice.

### The probe — `scripts/probes/round105-vanished-marble-probe.ts` (13 assertions)

A fresh dev server + real headless Chromium, deleting **Sol-Prime through the
real UI** (Core Console → Realities Grid → Collapse → Confirm Erase). It
plants a document token before the click — any Vite full-reload (the dev
folder move triggers one) creates a fresh document without it — so **THE
RECEIPT** is only ever granted on the SAME engine instance that rendered the
marble: zero reality groups, zero marbles, zero colliders for the deleted
id, the traveler surfaced at the multiverse stage, the folder in the Quantum
Bin, the tombstone written, the persisted state carrying the bin entry +
tombstone, zero page/console errors. **ALL GREEN twice back-to-back.**
Mutation-proven in the truest sense: with `engineReady` removed from the
deps, the probe fails at exactly THE RECEIPT with the diagnosis *"the marble
never vanished on the boot document — the skip guard stole the rebuild
again."* Captures in `scripts/verify/vanished-marble/`.

**What the probe's construction taught (recorded for the next hand that runs
it):** Playwright's actioned clicks measurably lose races with the card's
hover/layout animations (the arming click can lose its own onClick), and
`getByText`'s visibility wait missed a button that was provably in the DOM —
so the probe drives both buttons through their DOM `click()` and hunts the
Confirm button in-page. And the tsx transform wraps name-inferred inner
functions in a `__name()` helper the page does not carry (a measured
`ReferenceError`) — page-evaluated functions stay nameless.

### Chain receipts

`tsc --noEmit` clean; `cargo check` green (the BinOutcome + tombstone shell
compiles); round98 backend conformance ALL GREEN; round104 desktop shell ALL
GREEN; round92/round95 gauntlets green; live daemon scratch checks 9/9 PASS
across both runs (noop move/purge/restore semantics, the tombstone
write/keep/clear lifecycle, the ledger surviving empty-bin); audit
`--check` clean after the in-commit `--snapshot` refresh; **full `npm run
verify` exit 0 on the final tree** (23 gauntlets — the 22 + this round's —
`SMOKE TIER — wasm`, histL1 0.0742 vs the 0.12 pin, zero console errors,
`PROD SMOKE GREEN — the built dist boots: canvas live, zero page errors`).
`desktop:check` compiles the real C++ core (the R100 vswhere gate) — the
Rust edits are compile-verified on the author's machine.

---

## 4. WHAT WAS DELIBERATELY NOT TOUCHED

- **`getReality`'s survivor fallback** (`REALITIES[0]`) — load-bearing R102
  contract for ~40 callers. With ghosts dead, it has nothing to mis-resolve;
  the deleted id simply no longer exists anywhere.
- **The Quantum Bin restore flow** — a restored reality returns exactly as
  R102 designed; the tombstone ledger clears on restore, so restore outranks
  the ledger by construction.
- **The R83-2 seed guard** — protects the committed `data.json` FILE, never
  the deletion right.
- Engine, physics, Kamui, the dial, every law constant, every gauntlet pin
  outside the consciously reconciled ones.

## 5. HONEST LIMITS

- The probe runs the **dev-server / web tier**. The desktop app runs the
  same `App.tsx` + the same bundle; the desktop-specific legs (the noop bin
  verbs, `reality_bin_list`'s tombstoned field) are pinned by the round98
  conformance gauntlet and compile-verified by `desktop:check` — but the
  built-exe path was not re-probed this round (the round104 perf-probe
  pattern exists if the author wants that receipt).
- The tombstone ledger lives in the realities tree (dev: the source tree;
  desktop: the app-data dir). It survives updates and restarts; it dies only
  when the machine's app data itself is wiped — at that boundary the record
  and the bundle die together, which is the honest floor of "permanent" on
  one machine.
- The adoption runs alongside the engine import; on the rare state-wiped
  boot the HUD list can render the resurrected pack for the few hundred
  milliseconds before adoption lands — the 3D scene cannot (adoption beats
  the engine's constructor in practice, and if it ever doesn't, the
  existence-sync rebuild corrects it one tick later).
- **The first full-verify run of this round went red on a NEW member of the
  documented smoke-flake family — and the culprit was this round's own
  debris:** both smoke runs rendered healthy frames (histL1 0.0734 / 0.0681
  vs the 0.12 pin) but carried Vite HMR socket errors — a **400 Unexpected
  response** instead of the familiar connection-refused. Root cause, found
  by instrument: a ZOMBIE `node.exe` (an orphaned child of a shell-spawned
  `npm run dev` from this round's probe runs — `server.kill()` kills the
  shell, not the child, on Windows) squatting on :24678 and rejecting the
  fresh server's HMR token. Killed the orphan, re-ran the chain clean. The
  lesson is recorded in PROJECT-BRAIN §7's smoke watch item; the proper fix
  (a tree-kill in the probes'/smoke's server cleanup, so the orphans stop
  being born) is queued as its own tiny round.

## 6. FOR THE AUTHOR

- Deleting a reality now behaves like the decree: the marble leaves the
  multiverse **that instant** (first delete of a session included), the
  toast no longer claims failure on the desktop, and the deletion survives
  restarts, reinstalls, and wiped app state.
- Restore still works from the Quantum Bin — restoring clears that
  reality's tombstone.
- The ghost you saw is explained in §1.1: it was never the reality
  "surviving" — it was the scene never being told. That telling is now
  machine-pinned so it can never be lost again.
