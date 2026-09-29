# MY UNIVERSE — Deep Experience Report & Upgrade Readiness (2026-09-29)

> Method: full repo walkthrough (136 code files, ~43k lines), git history R52→R66 review,
> live verification (typecheck, round16/17/18/63 gauntlets, architecture audit, npm audit),
> then persona-based experience analysis of every surface: intro, space HUD, diary, vault,
> console, multiverse, desktop.

---

## PART 1 — WHAT CHANGED SINCE THE LAST DEEP LOOK

The project moved from R52 (the architecture consolidation) through a dense
black-hole renaissance to a full Kamui overhaul:

| Wave | Rounds | What happened |
|---|---|---|
| Black hole rebuild | R53–R64 | Single-renderer decision; absolute-void law; the **verbatim port** of the `webgpu-black-hole` source (fixed 64-step march, his disk math, 121-entry blackbody LUT, bloom calibrated 0.68/0.2/0.90); void measured at 0.265 vs the reference's own 0.33 |
| The Living Lens | R65–R66 | Sky dragged along the hole's measured velocity (engine tracker → `uLensVel` → shader); local lens melts to zero at 6·b_c; time-vortex variant built and **reverted by user decision** (commit `0c2d67e8` remains restorable) |
| Kamui | R57–R66 tail | 9-phase portal machine rebuilt through 10 fix commits; new `src/ui/kamuiBend.ts` per-pixel DOM bend for the reverse swallow; round18 gauntlet covers it |

**Verification at report time:** `tsc --noEmit` clean · round16/17/18/63 gauntlets ALL GREEN ·
`npm audit` (prod deps): 0 vulnerabilities · architecture audit runs and reports
expected R52-snapshot drift (see Part 4).

---

## PART 2 — THE EXPERIENCE, PERSONA BY PERSONA

### Persona A — "The Memory Keeper" (writes diary entries, wants her life orbiting)

**Journey:** intro veil (4.4 s title, veil lifts only when a frame actually rendered — excellent)
→ Sol-Prime with 10 worlds → double-click Aurelia → diary → write → moon appears → mood feeds the star's aurora.

**Delight:** the core loop is unmatched anywhere — an entry literally fattens a moon, moods tint
the corona, streaks brighten a ring. Attachments are art-directed plates (tilt, tone, glue) in a
3D flip-book. Export to PDF/MD/HTML/JSON. This persona's loop is *complete and magical*.

**Friction:**
1. **No first-run guidance.** The tutorial exists only as a hidden `?` overlay behind `H`/`?`
   keys. A non-technical user has no idea double-clicking enters a planet, that `?` exists, or
   that entries make moons. The single biggest missed delight: nobody discovers the moon effect
   unless told.
2. **Web-mode storage ceiling.** Everything (universe snapshot + diary attachments' references)
   rides `my-universe:v4` in localStorage with a ~5 MB practical ceiling; big audio attachments
   are externalized to IndexedDB payloads (good), but a heavy diarist in the *browser* will
   eventually meet the quota toast. Desktop (Tauri file store) is the real answer — the report's
   upgrade plan leans on that.
3. **No search across entries** — Ctrl+K palette is command-oriented; a "find the entry where I
   wrote about the sea" query has no home (tags help, but only if used).

**Satisfaction: 8.5/10.** The loop is sacred and works; onboarding is the gap.

### Persona B — "The Engineer" (lives in the Vault, code editor, terminal, sandboxes)

**Journey:** `V` or click Eventide → Argon2id gate → EFS file manager → Monaco editor →
JS/Pyodide/PDF/HTML executors → Key Ring (TOTP, breach checks, WebAuthn PRF unlock).

**Delight:** this is a *real* product inside the universe: copy-on-write filesystem, shadows
(snapshots), dedup, scrubbing, versioning, ISO 9660 executor, per-user vaults. Key Ring with
Argon2id + AES-GCM-256 + platform authenticators is genuinely ahead of most hobby vaults.

**Friction:**
1. **Discoverability of depth.** Nothing in the gate hints that ISO mounts, void scrubbing, or
   PRF attunement exist. Power without a map.
2. **Monaco chunk cost** is paid on first vault entry even for a glance (`MonacoCodeEditor-*.js`
   is a top-3 lazy chunk) — minor, lazy-loaded, acceptable.
3. **No terminal persistence story across realities** beyond the disk mirror (by design —
   reality isolation is a feature, but the engineer persona will ask).

**Satisfaction: 8/10.** Depth of a real OS, signage of a speakeasy.

### Persona C — "The Wanderer" (explorer; wants to fly and see)

**Journey:** endless zoom log-camera → asteroid belt → planets → universe surface dome →
galaxies → clusters → multiverse marbles → Core Console → Quantum Bin.

**Delight:** the scale ladder is breathtaking and now *legal* — the black hole bends the live sky
itself (no layers, no cutouts), the lens is local and melts at 6·b_c, void is absolute, the blaze
matches the reference. Cosmic survey HUD (`G`) with matter density/filaments/redshift is a lovely
science layer. Hover cards, lineage modals, glass marbles — the wanderer never runs out.

**Friction:**
1. **Menu archaeology.** The richest tools (Core Console, Multiverse Bar, bin, warp) live behind
   un-marked clicks (click the Astral Core; open the bar). `?` lists 8 keys, but the click-gestures
   are undocumented anywhere in-app.
2. **Kamui is un-labeled.** Ten commits stabilized it; a first-timer triggering it gets a
   spectacular sequence with zero narrative framing (a one-line toast/label would anchor it).
3. **Low-end GPUs get a real experience drop** — tiers + breaker + Auto cinematic switch exist
   (good), but there is no in-app "quality: what am I losing" explanation.

**Satisfaction: 9/10.** The best persona journey in the project; signage again the gap.

### Persona D — "The Archivist / Restorer" (care about data, backups, the R-blueprint)

**Journey:** `?` → Reset Universe (confirm) · corrupt-state recovery snapshot · disk mirror
`src/realities/<folder>/data.json` · Quantum Bin · vault trash/shadows/versioning.

**Delight:** three independent recovery layers (recovery localStorage key, disk mirror with
self-heal daemon, vault CoW + shadows). The universe is *very* hard to lose by accident.

**Friction:**
1. **No whole-universe export/import button visible in web UI flow** (CoreMode hides an
   import; a "back up my universe" one-click file export would make this persona breathe).
2. **The Bin is deep** (Core Console → tab) for something holding deleted *realities*.

**Satisfaction: 7.5/10.** The machinery is excellent; the buttons are shy.

### Persona E — "The New Smartphone-Only Visitor" (opens the desktop/web app on a tablet)

**Friction is real:** pinch-zoom exists on the canvas (good), `touch-action: none` everywhere,
but: no touch targets for hover-cards (hover is the primary discovery verb), no long-press menu
equivalent, window drag works via pointer events (fine), yet the whole HUD assumes a mouse.
Keyboard shortcuts are the only route to `G`/`C`/`V`.

**Satisfaction: 5.5/10 on touch, 8/10 once a mouse is attached.** A "pointer-first" product;
fine for v1 desktop, but tablets/trackpads will feel second-class.

---

## PART 3 — OVERALL VERDICT

**Experience score: 8.3 / 10** — a genuinely unique artifact with production-grade physics,
crypto, and data machinery, held back from 9+ by *signage* (onboarding, discoverability, labeling)
rather than by capability.

**Top 5 experience debts (ranked):**
1. First-run guided onboarding (3–4 steps: double-click a world → write an entry → see the moon → `?`).
2. In-app legend for click-gestures (what opens what) next to the `?` key list.
3. One-click whole-universe backup/restore file (web mode especially).
4. Kamui narrative framing (one line of cosmic copy during the sequence).
5. Cross-reality entry search in the command palette.

---

## PART 4 — TECHNICAL HEALTH (the upgrade runway)

**Green:** typecheck · 4 gauntlets · npm audit 0 vulns · prod deps healthy (React 18.2, three
0.185, Tailwind 4.1, TS 5.9 strict) · persistence + recovery hardened (R-audit fixes shipped) ·
engine disposal verified leak-free · CI desktop builds + updater in place.

**Amber (watch list):**
1. **`engine.ts` is 6,392 lines** (the R52 register said "decompose into systems" — still open;
   Kamui work added more). Highest structural risk in the codebase.
2. **Architecture snapshot drift** — `audit:arch --check` reports importer-count changes and new
   storage-key/window-seam literals (expected after R53–R66, but the frozen R52 baseline no
   longer matches; re-snapshot consciously to restore the drift tripwire).
3. **8 dead value exports + 46 dead type exports** listed by the auditor — cheap cleanup, keeps
   the auditor signal clean.
4. **React 18.2** — React 19 exists; upgrade is *optional* (no current pain; `useSyncExternalStore`
   pattern is future-proof either way). three.js 0.185 is current-line. Vite 6 → 7 exists but is
   not urgent. **Recommendation: don't chase versions mid-project; pin and continue.**
5. **`solPrime/data.json` churn** in the last commits — the disk mirror is working, but any
   rename-sensitive tooling should be checked after reality renames.

**Red:** none. No failing gate, no vulnerability, no data-loss path found.

---

## PART 5 — UPGRADE PREPARATION (the runway is clear)

Status: **READY.** Concretely, before the next feature wave:

1. **Baseline commit** — working tree is clean at `214ab3ea`; all gates green. Safe point.
2. **Re-snapshot the architecture audit** (one command, conscious acceptance of R53–R66 shape)
   so future drift is caught from the *current* shape, not R52's.
3. **Cheap hygiene sweep** (≤30 min): delete the 8 dead value exports; review the 46 dead type
   exports; refresh `BUILD` constant (`R52-v15` is stale vs the R66 reality).
4. **Recommended upgrade theme — "The Signage Wave":** onboarding constellation, gesture legend,
   universe backup button, Kamui caption, entry search. Small surface area, no engine surgery,
   directly converts the 8.3 into a 9+.
5. **Deferred/optional:** engine.ts decomposition (big, valuable, do as its own multi-commit
   round with the gauntlets as guardrails), React 19 / Vite 7 evals (no urgency), touch-first HUD
   pass (only if tablet users matter).

*The universe is stable, verified, and beautifully weird. The runway for the next wave is clear.*
