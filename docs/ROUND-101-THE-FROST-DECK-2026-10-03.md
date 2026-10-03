# ROUND 101 — THE FROST DECK (2026-10-03)

> The author's decree: *"time to upgrade our core console to these style & manner"* — with a
> screenshot of a visionOS-manner frosted-glass smart-home dashboard. The Core Console trades
> its deliberate "solid smoked glass, no blur anywhere" look (the R8-era law recorded in the
> CSS header) for **true frosted glassmorphism** — heavy backdrop blur over the living Crimson
> Watch night, layered light-and-dark panes, generous radii, a bottom pill dock, a left tool
> rail, hero stat tiles, and one real-data bar chart. **The reversal is the author's explicit
> call, made in this round's plan approval** (they chose *Mixed frost* over *Dark frost* and
> *Light frost*, and *Bottom pill tabs + left rail* over restyle-only).

## What shipped

**The CSS foundation (`src/index.css`, console section rewritten).** The section header now
records the new law: the deck wears frosted glass; **only top-level panes carry
`backdrop-filter`** — one blur layer per floating surface; tiles nested inside a frosted pane
use translucent fills only (a blur inside a blur is wasted GPU and can shimmer). Primitives:

- `.cc-panel` / `.cc-glass-card` — frosted panes: white gradient wash over a low-opacity ink
  base, `blur(24–26px) saturate(1.3–1.35)`, hairline `white/13–14`, radius 22px, deep soft
  shadow + inset top highlight, plus a `::before` diagonal sheen (the glassmaker's polish).
- `.cc-vital` — THE HERO STAT (the screenshot's "1,5 kWh" card): the **lighter frost** against
  the dark panes (the mixed-luminance rhythm the author picked), radius 18px, no own blur.
- `.cc-pillbar` / `.cc-pill` — the floating bottom view dock; the active pill reads the tab
  accent via `[data-active]` through the existing `--cc` variable system.
- `.cc-rail` (+ `.cc-rail-sep`) — the slim left tool sliver, same frost recipe.
- `.cc-clockchip` — the light-frost clock for the top bar's far right.
- `.cc-cloud-card` — hover chips get a light frost + blur, opacity tuned to 0.78 after the
  visual pass (over card text, 0.55 let the text beneath collide with the chip's own).
- `.cc-btn-glass`, `.cc-radar-frame` — translucent nested fills, no blur.
- Reduced-motion blocks extended (`.cc-pillbar`/`.cc-rail` entrances, `.cc-pill` transitions).

**The `.cc-root` rule body is byte-verbatim** — the R90 load-bearing `position: fixed; inset: 0`
block (comment included) was not touched; the round90 gauntlet passes unchanged.

**The layout (`CoreConsole.tsx`).**

- **Top bar**: identity left (sigil + wordmark + stat seals + disk dot) · search + filter
  chips right · **ClockChip** far right — the traveler's wall clock (15 s tick) over the
  live Universe Epoch (both real; the chip subscribes to the same `simClock` store).
- **The left rail**: Twin Jump (`cc-twin-jump-btn` id preserved), Backdrop Studio, Forge
  Reality, Close — as seals with right-positioned thought clouds; hairline separators.
- **The bottom pill bar**: Command Matrix / Realities / Hierarchy / Bin as icon+label pills
  (`cc-tab-*` ids preserved; the Bin wears its live badge); the deck scroll body keeps its
  pinned class string byte-verbatim.
- **Vitals**: hero VitalTiles (26–30px Unbounded numerals), the epoch as a slim strip, and
  **WorldsPerRealityBars** — one bar per reality, height = its live body count, the anchored
  reality burning in the tab accent, hover cloud naming the reality. Real data only (the
  rosters themselves); the "never invent" law holds.
- **Nested-blur purge**: every `backdrop-blur` that now sits INSIDE a frosted pane was removed
  (card footers, workbench, disk tile, rename input, receipt rows, daemon stream, the seven
  RealityAdvancedPanel controls) — the GPU law is enforced in the markup, not just the docs.

**The bug the rail surfaced.** The studio popover's `fixed inset-0` click-catcher silently
stopped covering the viewport: the rail's `backdrop-filter` makes the rail the containing
block for fixed descendants, so the catcher only covered the rail and the popover could no
longer be dismissed by clicking elsewhere. Replaced with a document-level `mousedown`
outside-close (`[data-studio-root]` excluded) — the catcher is gone.

**CoreSigil's silent accent failure, fixed.** The sigil read its tab accent from
`closest('.core-plate')` — an ancestor that exists only on the Command Palette surface, never
inside the console, so the instrument sat on its teal fallback forever. It now reads
`.cc-root`, whose `data-accent` the MutationObserver already watches; the sigil tints per tab.

**Cards reskinned in place** (small diffs): SimulatorTwinCard, CppNativeEngineCard,
BlackHoleTuningCard, QuantumBinTab — the frost arrives through their `.cc-panel` root;
nested blur rows became `bg-black/25`; hairlines `white/8 → white/12`. Every gauntlet-pinned
literal survived untouched (imports, `disabled={busy || twinOn || driverOn}`, the driver
comment, the R94 badge strings, the R87 receipt expression, R63's slider labels). The Forge
Reality modal was already glassmorphic (it predates the smoke era) — untouched.

## The receipt

- `npm run typecheck` — clean.
- `npm run verify` — **ALL GREEN, twice** (before and after the studio fix): 21 gauntlets,
  `SMOKE TIER — wasm`, frame unmoved (histL1 0.0699–0.0720 vs the 0.12 pin), zero console
  errors, prod smoke green.
- `npm run audit:arch -- --check` — one drift (the new probe's `window.__ENGINE__` reference,
  the same boot-contract seam smoke.ts consumes) absorbed by an in-commit snapshot refresh;
  check clean.
- **Visual receipt**: `scripts/probes/round101-frost-visual.ts` (NEW probe, hand-run) drives a
  real headless Chromium through the author's keyboard door (Ctrl+K → "Open Core Console" →
  Enter — the MultiverseBar CORE badge only exists after a demon-core interaction, so the
  palette is the deterministic door), rides the pill bar through all four views, the Twin
  Jump, the Studio popover and the Forge modal, and writes seven PNGs to
  `scripts/verify/frost/`. All seven reviewed against the reference manner: frost reads,
  accents live, pill dock + rail + clock chip in place, twin card flashed with real driver
  telemetry (steps 12, clock 25d, max drift 0.2393 AU — the session was DRIVING during the
  capture). Two legibility fixes came out of the pass (cloud chip 0.55→0.78, studio popover
  0.60→0.85) and were re-captured green.

## Scope lines

- The console only: HUD (MultiverseBar, PhysicsHUD, hover cards) and the Command Palette keep
  their own aesthetics; HoloCard CSS is gauntlet-pinned and was not touched.
- ScenicBackdrop (the Crimson Watch) is untouched — it is what the frost blurs; the glass
  needs the living night.
- No new dependencies, no new source files (the probe is a script), no engine/physics/state
  changes — `src/` UI-only plus `index.css`.

## Watch items

- The frost re-filters every frame the rain shader animates; on a weak GPU the blur radius
  (26px) and the Night veil dim slider are the tuning knobs. If a round ever needs headroom,
  pausing the shader to a low fps while the deck is open is the designed escape hatch.
- The single-reality "Worlds per reality" row shows one centered bar (honest for a 1-reality
  multiverse); it composes into a chart as realities multiply.

---

## R101.1 — THE RAIL ABSORBS THE DOCK (same day, the author's follow-on)

The author's verdict on the first frost build, with a crop of the bottom dock: *"change in
style make all these in left side along with others so it can look great."* The four view
tabs left the bottom pill bar and joined the tool seals on the left rail — one unified frost
column: the four view seals on top (symbols only, full names in the thought clouds, the
active seal burning in the tab accent via the existing `active` prop, the Bin's badge dot
riding its seal), a separator, then Twin Jump / Backdrop Studio / Forge, a separator, Close.

- The bottom dock is gone; the deck reclaims its bottom edge (`pb-4`). The `.cc-pillbar`/
  `.cc-pill` CSS died with their last consumer and was deleted (deadCss law — deleted from
  both sides in the same commit). The rail's entrance keyframe was renamed `ccRailIn` and
  re-scoped to an X-slide only: the rail centers through Tailwind v4's `translate` property
  (`-translate-y-1/2`), which composes with `transform` — animating the old translateY form
  would have doubled the centering.
- **The probe was caught lying and was fixed.** After the merge, two captures (realities in
  one run, bin in another) came out visually empty while the dashboard was full — yet an
  instrumented run proved the DOM always held the content at opacity 1 with zero console
  errors. The lie: the probe's readiness check (`deck innerHTML.length > 3000`) is satisfied
  by the EXITING view's content the instant the click lands, so the screenshot raced the
  `AnimatePresence mode="wait"` swap. The fix makes the wait honest — each view waits for a
  marker string only IT renders (`Multiverse Radar Scan` / `All Parallel Realities` /
  `Reality Branches` / `QUANTUM RECYCLE BIN`) AND for the deck's first child to read
  computed `opacity: 1`, then settles 600 ms. All seven captures re-taken green under the
  honest wait; the app itself never had the bug.
- Receipts: typecheck clean; full verify ALL GREEN (21 gauntlets, `SMOKE TIER — wasm`,
  histL1 0.0725 vs the 0.12 pin, zero console errors, prod smoke green);
  `audit:arch --check` clean (the pill-class deletion absorbed with no snapshot refresh —
  classes left both sides together).
