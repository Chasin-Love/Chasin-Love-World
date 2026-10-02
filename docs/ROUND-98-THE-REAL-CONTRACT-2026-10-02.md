# ROUND 98 — THE REAL CONTRACT

**Date:** 2026-10-02
**Branch:** `r98-the-real-contract` (cut from `3b28c37`, the R97 tip)
**Status:** complete — 7 commits, chain green, `main` and `r97-the-engine-divided` untouched
**Commits:** `d685812a` `a8999075` `c9b5d17f` `8167a785` `9fa21442` `16d6a822` `b5be70d5`

---

## The problem, in the author's words

> *the C++ engine is in the boot but not connected to the wheels*
> *two gearboxes have started disagreeing*
> *something that tells us this has gone wrong*

Three diagnoses, one round. The unifying claim is that this project had **three
implementations of contracts it believed were single** — the TypeScript physics
law versus the C++ port, the Node daemon versus the Rust desktop shell, and the
source versus the shipped binary — and **nothing in the verification chain could
see any of the disagreement**. Every one of them was invisible by construction.

That is the real subject of this round. Not the bugs: the bugs were symptoms.

---

## What the investigation found

I verified each claim before acting, including the ones that came from my own
subagents, because a false "all clean" is worse than a false alarm. Three of the
six original problems turned out to be **misdiagnosed**, and the corrections are
recorded below rather than quietly dropped.

### "The C++ is in the boot but not connected to the wheels" — half true

The Kepler path **is** connected. `refreshKeplerCache` calls
`cosmosBridge.keplerBatch` on every tier above TypeScript, and the smoke frame
now prints `SMOKE TIER — wasm` with `keplerCache.valid: true`. The web build is
running compiled C++ for orbital positions today.

What is *not* connected is the **C++ profile table** — the per-body
eccentricity / density / albedo / obliquity law. It has exactly one consumer:

```
bodyProfileOf appears exactly twice in cosmos_engine.cpp:
  line 272  the definition
  line 376  the sole call, inside cosmos_physics_batch
```

And `cosmos_physics_batch` has no production caller at all — its only TS caller
is `verifyParity`, a button in the console card. The Kepler path takes
eccentricity from `calculatePhysics` in TypeScript and passes it in as an array
argument, so it **cannot observe the C++ table**.

That reachability analysis is what made the final decision possible (§ Step 7).

### "The two gearboxes are disagreeing" — three ways, one of them severe

| Drift | Web (Node) | Desktop (Rust) | Severity |
|---|---|---|---|
| Reality rename patch set | `index.ts` + `surface.ts` | `index.ts` only | one world, two names |
| Sky asset extensions | png/jpg/jpeg/webp/gif/avif | png/jpg/**gif** only | `.jpeg` silently failed on desktop |
| Sky asset case sensitivity | `/i` flag | byte-exact | `SKY-x.PNG` served on web only |
| Empty asset id | `[a-z0-9-]+` rejects | `all()` accepts vacuously | contract drift, not an escape |

The `.jpeg` bug had a **root cause nobody had noticed**: the Rust check took the
**last four bytes** and matched patterns that **include the leading dot**
(`b".png"`). `.jpeg`, `.webp` and `.avif` are five characters — their last four
bytes are `jpeg`/`webp`/`avif` with no dot, and matched nothing. Only 4-character
extensions had ever worked on desktop, while `MIME_BY_EXT` in the same file
cheerfully listed all six.

Neither the old nor the new Rust form was a **path escape** — `is_inside` holds
either way. These were contract drift, not a security hole, and the round doc
says so plainly rather than overselling the fix.

### The silent test-net gap

R97 commit 1 moved `windowFn` / `hash` / `vnoise` / `cpuFbm` out of `engine.ts`
into `engine/math.ts`, but `ENGINE_FILES` in `engineSource.ts` was never updated.
Any future gauntlet pin on those four helpers would have matched **nothing and
passed vacuously**. The safety net had a hole exactly where it was most likely to
be used.

### Withdrawn: two claims that did not survive checking

- **"The 41-vs-43 field count is a mismatch."** It is not.
  `physicsBatchTS` deliberately omits the two Einstein-only fields, so 41 is
  internally consistent. The gauntlet now *verifies* 41 against the emitter's own
  indices instead of against a comment.
- **"Untrack `sky.json`."** It is contract seed data consumed by three default
  sites, not author state. The plan step was wrong and was dropped; the R97 round
  doc's false "stays uncommitted" claim was corrected.

---

## What was built

### Step 1 — repair the test net (`d685812a`)

`engine/math.ts` added to `ENGINE_FILES`. Dead code removed: the
`BodyBuildersSeed` placeholder, a dead `scene`/`bodies`/`_vScratch4` accessor
trio, and a dead `coreHoverT` setter — which I **restored** after TS2540.
Compound assignment through a getter is true at runtime and false at compile
time; the compiler was right and I was not.

### Step 2 — make degradation visible (`a8999075`)

The user's question: *"something that tells us this has gone wrong."* Five bare
`return null` paths in `loadWasm` became **named rejection reasons**
(`no-artifact`, `wrong-content-type`, `import-failed`, `no-factory`,
`instantiate-failed`, plus the native equivalents). Degradation became a value:

- one-time `console.warn` naming the reason and the tier actually used;
- `CosmosStatus.degraded[]` + `fellBack` carried up to `CppNativeEngineCard`;
- a **hard assertion** in `round95-steady-sky-live.ts` and in `smoke.ts`.

That assertion is the receipt that proves the whole thing. It fires when a tier
is silently lost, when the TypeScript tier reports an empty ledger, or when the
native tier reports lost tiers. It was **negative-tested**: with the WASM artifact
moved aside, it fired correctly — without that artifact the TS branch is never
reached and the test proves nothing.

### Steps 3–4 — physics conformance (`c9b5d17f`, `8167a785`)

A new gauntlet pins the C++ port against the TypeScript law **value for value**.
It went red on today's drift, which is the point: it names the bug rather than
documenting it. Closed:

- goliath eccentricity `0.0489` → `0.0453` (C++ disagreed with the law table);
- `BodyProfile` gained `tiltDeg`, so Venus / Uranus / Pluto keep their retrograde
  tilts instead of being flattened to Earth's 23.44° by a `kind ==` ternary;
- the false *"identical ids, values and defaults"* comment rewritten to state
  what is actually guaranteed.

Proven at runtime with **real MSVC-compiled C++**: **8 mismatches → 0**.

**New divergence found while pinning:** for a body with *no* profile row, TS
derives a *seeded* tilt (`8 + tiltSeed * 55`) while C++ — which receives only an
id string — can only emit a constant. Recorded as an explicit pin, not "fixed"
without the author.

### Steps 5–6 — backend conformance (`9fa21442`, `16d6a822`)

89 checks pinning the dual-backend contract: every route string has a matching
Tauri command **and** adapter arm, sanitisation parity, rename derivation,
containment-before-destructive **per bin operation**, Sky Studio caps and MIME,
and the asset whitelist. Then the three real drifts above were closed.

Proven with a **standalone `rustc` harness** comparing old and new Rust forms
against Node's regex across 17 cases: **8 divergences → 0**, every traversal
attempt rejected by both backends.

### Step 7 — the wheels, and why they stayed unwired (`b5be70d5`)

The plan was to wire `cosmos_physics_batch` into production. **I did not**, because
the investigation proved the wiring would ship a bug.

The committed `public/wasm/cosmos_engine.wasm` is **stale** — confirmed by
*content*, not mtime: searching the binary for the little-endian f64 of `0.0489`
**hits**, and the fixed `0.0453` does not. There is no `emsdk`, `clang`, or
`wasm-ld` on this machine (all four probed MISSING), so it cannot be rebuilt here.

So wiring it now would make **web and desktop return different per-body physics** —
the precise tier-divergence bug this round was commissioned to kill, reintroduced
by the very step meant to close it.

The fix is a **severity that follows reachability**, computed rather than asserted:

- stale artifact + no production caller → **WARN**, with the explanation printed;
- stale artifact + any production caller → **hard FAIL**, rebuild required first.

**Negative-tested both ways**: appending a `physicsBatch` call to `engine.ts`
flipped all three checks red and restored clean on revert.

The ordering is now documented on the method itself: *rebuild the artifact FIRST,
then wire it — not the other way round.*

---

## The lesson worth keeping

Three separate times this round, a check I wrote passed **green while proving
nothing**:

1. The artifact-freshness check read the **source** (which was fixed) instead of
   the **shipped binary** (which was not).
2. The caller scanner's allowlist entry carried a leading slash while normalised
   paths did not, so `every()` was passing **vacuously over an empty array**.
3. The scanner found **zero** callers, because the button calls `verifyParity()`
   and `verifyParity` calls `physicsBatch` — an indirect caller that literal
   call-syntax scanning cannot see.

None of these were visible by reading the code. All three were caught by asking
*"what would make this check unable to fail?"* and then testing the answer. There
is now an explicit assertion that the scanner still **finds** the button it
blesses, so a future rename that silently empties it goes red instead of looking
clean.

> A guardlet that cannot fail is worse than no guardlet, because it converts an
> unknown into a false certainty. Every negative in this round is now proven by a
> mutation, not by inspection.

---

## Standing debt, recorded not hidden

1. **`public/wasm/cosmos_engine.wasm` is stale** and cannot be rebuilt without
   emsdk. Dormant — no production path reaches the drifted table — and the
   gauntlet escalates it to a hard failure the moment one appears.
   Fix: `npm run wasm:build` (new script, added this round).
2. **Unknown-body tilt** differs by design: TS is seeded, C++ is constant. Pinned.
3. **`verifyParity` is still UI-button-only.** The gauntlet now does its job in
   CI, but the button itself is unretired.

## Out of scope, deliberately

The UI giants stay queued (`DiaryWindow` 1,659, `App` 1,550, `shaders` 1,542,
`keyring` 1,521, `CoreConsole` 1,469) — each its own round, as already recorded in
PROJECT-BRAIN §9. Splitting Website/Application into two folders is declined on
the arithmetic: **42,700 shared lines vs 3,100 platform lines.**
