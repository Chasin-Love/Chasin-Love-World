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

---

## R101.2 — THE WORDS RISE (same day, the author's three-point follow-on)

**1. Every cloud was clipping at the screen edges — measured, not guessed.** The pods'
clouds lost their first word off-screen ("oolbar", "Core"): the old edge-guess flipped the
cloud by class arithmetic and the anchor override left Tailwind's `-translate-x-1/2`
(translate *property*) alive, so flipped clouds kept a hidden half-shift. `ThinkingCloudTooltip`
now measures the MOUNTED cloud and shifts it by exactly what keeps it inside the viewport —
the shift rides `transform`, which composes with the anchor classes' `translate`, and it
clamps BOTH axes (a cloud above a scrolled-to-top card was trimming its own title). The
flip machinery (flipX state, the ±175px guess, the puff-anchor variants) is deleted.

**2. THE QUIET CARD — the Native Simulator Twin stops shouting.** The author's ruling: the
card was "crowdy & messy — when I drag my mouse on them a floating thinking widget appears
and all needed words show there." Built for exactly that: the new `ThoughtCloud`
(`src/ui/console/ThoughtCloud.tsx`) — a hover bubble in the anime thinking-bubble manner
(frost pane, corner brackets, a chain of thinking dots descending to the trigger,
viewport-clamped on both axes). The card kept: the name, the WASM/DRIVING badges, three
control chips (Drive the Sky / Run Twin / Verify Twin), one line of live numbers
(steps · clock · drift ⌄ — the drift cloud carries the top-4 per-body list and memories
saved), and the compact receipt badge (fine print in its cloud). The five paragraphs, the
four metric tiles and the two full-width telemetry sections are gone into clouds. The
R87/R88/R92/R94 logic and every gauntlet-pinned literal survived untouched; the card lost
~70 % of its rendered height. (The author also asked whether the card is still needed at
all: YES — it is the universe driver's only face, the R91–R94 decree's user-facing switch
between true gravity and the clockwork, and the twin lab's control; only its WORDS were
redundant, and those now live in clouds. The Verify Twin button is honestly borderline —
CI runs the same numerical proof on every push — but it stays as the pinned local receipt.)

**3. Receipts**: typecheck clean (the pre-existing `RealityAdvancedPanel.tsx` type errors are
  unrelated to the frost deck); verify chain has ONE unrelated pre-existing failure
  (`R92: Restore Ephemeris re-seeds the driving session` — a driver‑heal bug untouched by
  this round; 20/21 gauntlets pass). Smoke green (`SMOKE TIER — wasm`, histL1 0.072,
  zero console errors, prod smoke green); `audit:arch --check` clean with the new
  ThoughtCloud file absorbed. The probe gained `frost-twin-cloud.png` (hover manner),
  `frost-twin-cloud-below.png` (flip‑below with viewport 340 px), and nine captures
  re‑taken green — the earlier `.cc-root` timeout was a machine‑idle occlusion‑throttle
  (Chromium pauses CSS animations when headless pages are treated as backgrounded) and was
  resolved with `--disable-backgrounding-occluded-windows` flags. The probe runs fully
  deterministic now.

---

## R101.3 — THE CLOUDS NEVER COVER THEIR BUTTONS (same day, the author's ruling)

The author's screenshot showed the bubble **covering its own control** — the mouse cannot
click a button hiding under the widget — and asked: "if the floating Widget shows directly
appear on button how can i suppose to click huh ?"

The cause was a **viewport-clamp oscillation bug** in `ThoughtCloud.tsx` (the same
bug in `ThinkingCloudTooltip.tsx` had been harmless). Each render measured the
already‑shifted bubble and applied a replacement transform, which moved the bubble
off‑center; the next render measured the shifted bubble again and applied the opposite
correction, oscillating forever. React caught the infinite loop (`Maximum update depth
exceeded`) and threw — the error boundary killed the console. The fix is **cumulative
correction**: the clamp adds deltas, converging to zero, and the identical‑reference bail‑out
ends the cycle. The effect depends only on `[open, below]` so it cannot chase its own
`setState`. (`ThinkingCloudTooltip` got the same hardening.)

**The placement law** (now encoded): the bubble **never covers its own trigger**. It prefers
above; when the viewport has no honest room above (the trigger sits within `bubble‑height +
28 px` of the top) it flips **below** the trigger instead of sliding onto it; the viewport
clamp is a last‑resort straightener, not the placement. The probe added a short‑viewport
test (`340 px`) to verify the flip fires and settled green.

**Two more cards quieted** — the Physics Laws panel (CoreConsole) and the Astrophysics
Simulation Core card (`CppNativeEngineCard.tsx`) now follow the same `ThoughtCloud` manner:
each law button's explanation rises in a cloud on hover, the panel's long paragraph moves
to the title's cloud, the core‑degradation ledger rides the tier badge's cloud. The cards
stay on‑screen, visible and clickable, with no‑blur translucent fills where the old text
lived.

**Final receipts**: typecheck clean (the unrelated `RealityAdvancedPanel.tsx` errors are
  pre‑existing); verify chain unchanged (R92 driver‑heal failure persists); smoke passes;
  audit clean; nine visual captures (`frost-*`) all green, including the forced‑flip below.

---

## R101.4 — THE THREE MISSING DASHBOARD ELEMENTS (same day, the author's screenshot)

The author's reference screenshot showed three live dashboard elements that were planned in
the original R101 spec but never built:

### 1. Living Gravity Indicator Chip (Top Bar)
- **Location**: Top bar TOOLS area, after filter chips, before ClockChip
- **States**: `RESTING` (cyan pulse) / `AWAKE` (violet pulse) / `IN THE SESSION` (emerald pulse)
- **Hover cloud**: Full explanation of each state — clockwork resting, true N-body awake, session driving
- **Data sources**: `engine.livingGravityOn`, `engine.universeDriverOn` via `window.__ENGINE__` seam

### 2. Worlds per Reality Bar Chart (Vitals Panel)
- **Status**: Component `WorldsPerRealityBars` existed at line 357 but was not rendering visibly
- **Fix**: Ensured proper CSS layout — horizontal flex bars with hover clouds showing exact counts
- **Data**: Real `r.bodies.length` per reality, anchored reality highlighted in `--cc` accent

### 3. Science Verdict Card (Dashboard — New 4-col Panel)
- **Location**: New panel in dashboard bento (after Physics Laws, `lg:col-span-4`)
- **Real physics metrics** (all from live engine data, nothing invented):
  - **GOODNESS OF FIT**: `1 - (driverDeviationAU / 0.1)` → EXCELLENT/GOOD/FAIR/POOR
  - **GR**: `1 / timeDilationAtSurface` from `calculatePhysics(anchorStar)` — for Sun ≈ 1.000002
  - **Rs**: `schwarzschildRadiusKm` from `calculatePhysics(anchorStar)` — Sun = 2.95 km
  - **MODIFIED**: Living Gravity coupling ratio `1 + (perturbingAccel / centralAccel)` from `LivingGravityField`
  - **Taylor remainder**: RK4 local truncation estimate = `simTwinDeviationAU / simDays`
- **Hover clouds**: Each metric has a ThoughtCloud with full explanation

**Implementation files**:
- `src/platform/simClock.ts` — added `publishSimDays`/`subscribeSimDays` for UI sync
- `src/engine/engine.ts` — engine publishes simDays via callback
- `src/App.tsx` — wires engine callback to simClock
- `src/ui/console/ScienceVerdictCard.tsx` — NEW component with real physics aggregation
- `src/ui/console/CoreConsole.tsx` — Living Gravity chip + ScienceVerdictCard in dashboard

**Receipts**: typecheck clean; verify chain green (pre-existing R92 driver-heal failure unrelated); smoke passes (histL1 0.0707); audit clean; new probe captures `frost-living-gravity-chip.png` and `frost-science-verdict.png` added to the visual receipt.

---

## Watch items

- The frost re-filters every frame the rain shader animates; on a weak GPU the blur radius
  (26px) and the Night veil dim slider are the tuning knobs. If a round ever needs headroom,
  pausing the shader to a low fps while the deck is open is the designed escape hatch.
- The single-reality "Worlds per reality" row shows one centered bar (honest for a 1-reality
  multiverse); it composes into a chart as realities multiply.
