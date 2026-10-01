# THE LEFTOVER CODES — why everything that stayed, stayed (2026-10-01)

> Written for the author after R85/R86 settled the R83 deep audit. If you ever open the
> code, see something and think "why the hell is this still here — what does this even
> do?" — this document is the first place to look. Every leftover that survived the purge
> is listed here, in plain language, with the reason it earned its place.
>
> Companion documents: `docs/ROUND-85-THE-SIX-SEAMS-2026-10-01.md` and
> `docs/ROUND-86-THE-FULL-PURGE-2026-10-01.md` (what was deleted and wired, and why).

---

## The one-minute version

The R83 audit's census was sorted into three buckets and executed in R86:

- **Bucket A — deleted.** Provably dead weight: orphaned functions, write-only fields,
  dead CSS, orphan assets, a never-invoked Rust pair. Gone.
- **Bucket B — wired.** Things that looked dead but were actually *unwired risks*: the
  recovery-key constant, the daemon's shutdown, the Sol-Prime seed guard. Now alive.
- **Bucket C — kept.** Everything listed below. Nothing here is garbage; each item is
  your data, a law, a safety net, a paid-for foundation, or a hook for a promised feature.

The method that decided this, so you can trust it in the future: the architecture auditor
*suspects*, but the gauntlets *arbitrate*. In R86 the auditor called `.kamui-disappear`
dead CSS and the round18 gauntlet instantly failed — the gauntlet outranks the auditor
(that lesson is now written into the CSS itself as a warning comment). When this document
and the auditor ever disagree with a gauntlet, the gauntlet wins.

---

## The reduced-motion story (the author's question, answered — and then RULED)

**The analogy, confirmed with one word fixed:** imagine you enable your system's
"reduce animations" setting — then yes, the Kamui would become **less violent**: the
screen bend, the vortex spin, the shakes all calm down. But **not less powerful** — the
one word to fix in the analogy. Reduced motion is an accessibility promise: **the
function stays, the violence of the presentation calms.** The jutsu still completes.

**And yes — "reduced-motion variants for every portal beat" was talking about the
Kamui.** The "portal beats" are the beats of the portal choreography: the summon hold,
the tear, the vortex, the throat handoff, the eject.

**THE AUTHOR'S RULING (same day):** after reading this explanation, the author rejected
the feature outright: *"I make the Kamui violent — that makes the Kamui the Kamui. I do
not need it."* That is a creative decree, and it is final:

- The `engine.reducedMotion` probe was **deleted** (it existed only as the hook for this
  feature — with the feature rejected it was pure waste, as the census originally said).
- The portal beats will **never** honor `prefers-reduced-motion`. This is recorded as a
  law note in PROJECT-BRAIN §6, in the same standing as the R66b revert: **do not
  resurrect it unasked.**
- What stays: the CSS-level `prefers-reduced-motion` handling for the *console UI*
  (some settings animations) — that shipped long ago, calms no Kamui beat, and was never
  part of this question.

So the verdict on this row flipped from "kept as a hook" to "deleted by decree" — and
that is the correct end for it: the author built the violence on purpose.

---

## The glossary — every kept leftover, in plain language

| Leftover | What it actually is | Why it stays |
| :-- | :-- | :-- |
| `prefers-reduced-motion` (in CSS + two console components) | The law's *living implementation* for the console UI — it calms settings animations | It is not leftover code at all; it is active code. Listed here only so nobody "cleans it up" by mistake. (The Kamui itself will never honor it — author's decree, see the story above) |
| `window.__MY_UNIVERSE_PERF__` | A hidden diagnostic port: launch with `?perf` in the URL, read performance numbers in the browser console (F12) | Costs nothing unless asked for; a mechanic's flashlight, not an engine part |
| `visitedAt`, `lastSyncTime`, `lastScrubAt`, `startedAt` | Maintenance stickers written into saved data: when you last visited, when the disk mirror last synced, when the encrypted storage last had its integrity scrub, when that scrub started | Written into everyone's save files; removing them reshapes every user's saved data for zero visible gain |
| `note.txt` | The author's own hand-written folder map of the repo | It's yours; accurate; not an AI's file to delete |
| `cosmos_sim_*` + `KIND_*` (Rust) | Pre-built bridge functions for a native physics-simulation feature — foundation already poured for a room not yet built | A comment in `lib.rs` (306–311) declares them deliberate scaffolding. **UPDATE (R87):** the room is under construction — the bridge now speaks the session on all three tiers, the Native Simulator Twin card verifies it, and round87-simulator-gauntlet pins it. See `docs/ROUND-87-THE-NATIVE-SIMULATOR-2026-10-01.md` |
| `realities/*/index.ts` | **These ARE the realities.** They look unused to tools because the app discovers them by scanning the folder at boot, not by imports | Deleting one deletes a universe. The most dangerous "dead code" in the repo — never touch |
| `PortalPhase` / `KAMUI_PHASE_WEIGHTS` | The type backbone of the Kamui's phase machine | round18's gauntlet asserts their source text exists — the verification system stands guard over them |
| `.kamui-disappear` / `@keyframes kamuiVortexOut` (CSS) | The v1 vortex "disappear" animation | Gauntlet-pinned (the R86 lesson — tried as dead, the gauntlet failed, restored with a warning comment above it) |
| `monaco-esm.d.ts` | Type glue so TypeScript accepts the vault's Monaco code editor loading its modules in an unusual way | Pure compiler plumbing; removing it breaks the editor's typing |
| audio no-cache branch (`audio.ts`) | If the sound system ever fails to pre-warm silently, this branch rebuilds sounds on the fly so the app is never mute | A safety net — "never remove a safety net" is law |
| the WASM fallback artifact | The compiled C++ physics engine file, built on demand by `build-wasm.sh` | Looks like a stray binary; it's the fast path of your physics |
| `surface.ts` (in created reality folders) | Each reality's visual skin config | The server daemon auto-repairs it if missing — it looks "managed by magic" because it is |
| `BUILD = 'R85'` (App.tsx) | The banner/footer version stamp | Refreshed in R85 (was 31 rounds stale); bump it every shipped build |

---

## The Sol-Prime mirror guard — what it protects, what it doesn't

Since R86, `write-data` refuses Sol Prime at all three layers (client, server, desktop
twin). What that means in practice:

- **Protected:** exactly one file — `src/realities/solPrime/data.json`, the on-disk
  *shadow* of the blessed seed. A stale browser snapshot can never silently rewrite it
  again (that's what the "Version 17.1" commit was: 110 timestamps shifted by a stale
  browser generation).
- **Not affected:** your gameplay, your saves, your Sol-Prime edits. The live universe
  still saves to localStorage (web) and the desktop state file (app) exactly as always.
  Boot truth was always `index.ts`; the mirror is only a shadow of it.
- **New realities: completely unaffected.** The guard is one check for the id
  `sol-prime` only. Every created world mirrors to its own `data.json` normally — on web
  AND desktop — because created worlds are the mirror system's real audience. They can't
  suffer the Sol-Prime problem: there is no blessed committed generation of their data to
  protect.
- **If you ever WANT to update Sol Prime's mirror deliberately:** edit it in one commit
  on your side (like your own "Version" commits did), or lift the guard for a round.
  Deliberate author action, never silent browser churn.

---

## When to revisit this list

- **You build a storage browser** — the deleted `store_payload_list/stats` Rust pair is
  one `git show` away from history; resurrection is trivial.
- **You fold `note.txt` into `docs/`** — your call someday; the map is accurate.
- **A future audit flags any of these items again** — this document is the standing
  verdict; update it rather than re-litigating each item from scratch.
- **One closed door, permanently:** engine-side reduced motion for the Kamui is rejected
  by decree ("the violence IS the Kamui") — it is not a revisit candidate.
