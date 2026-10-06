# ROUND 90 — THE REACHABLE TWIN (2026-10-01)

> The author's report: in the Core Console, the **Native Simulator Twin** card — and
> with it the **Verify Twin** button — could not be reached; scrolling would not bring
> it into view, so the twin could never be verified. The report was live-reproduced,
> measured, and the real root cause was not where the eye looked. Rides `main`
> (v15.0.10; the R87→R89 simulator arc's verification surface is the card this round
> makes reachable).

## The bug, measured

The deck's markup is `.cc-root fixed inset-0 z-[130]` — a viewport-locked overlay whose
inner body is `flex-1 min-h-0 overflow-y-auto`. On paper that scrolls. In the running
app (live geometry probe, 1440×800 viewport):

- `.cc-root` computed **`position: relative`**, not fixed — its box was **2023 px tall**
  in document flow, while `html/body` sit at `overflow: hidden`.
- The deck's internal scroller had a client height of **1955 px** (taller than the
  screen) against a scroll height of 1981 px — a scroll range of **26 px**. The scroll
  container itself had slipped past the viewport, so wheel input had almost nothing to
  scroll.
- The twin card's top edge sat at **y = 1059** — 259 px below the fold, permanently.

**Root cause — a Tailwind v4 cascade-layer trap.** `src/index.css` declares
`.cc-root { position: relative; … }` as *unlayered* author CSS. Tailwind v4 emits its
utilities inside `@layer utilities`, and **unlayered CSS outranks any layered CSS
regardless of specificity or source order** — so the stylesheet's `relative` silently
defeated the markup's `fixed`, `inset-0` degenerated into a no-op (relative offsets of
zero), and the "overlay" became a plain in-flow block twice the height of the screen
inside an unscrollable page. Everything below the fold — the C++ engine card's tail,
the Native Simulator Twin card, Black Hole Studio, the Chronicle — was unreachable.
Nobody saw it from the code, because every individual line looks correct.

## What changed

**`.cc-root` is viewport-locked in CSS itself.** `position: fixed; inset: 0` now lives
in the `.cc-root` rule (with the trap documented inline). The Tailwind utilities stay
and now merely agree with the stylesheet. After the fix (same live probe): root height
exactly 800, scroller client 732, scroll range **1249 px** — the deck scrolls again.

**The Twin Jump — a one-click path that cannot be lost.** The console top bar gains an
always-visible **Native Simulator Twin** seal (`#cc-twin-jump-btn`, Orbit glyph, thought
cloud: "Scroll straight to the twin verification card"). One click lands the dashboard
tab if needed (the armed jump waits out the `AnimatePresence mode="wait"` swap), scrolls
`#simulator-twin-card` into view, and flashes the card with a 2.2 s violet ring so the
eye catches it. Reduced motion scrolls instantly, by law.

**The safety net the live test demanded.** In a frame-starved window the deck's smooth
scroll silently does nothing — measured directly: a suspended pane produced **zero
requestAnimationFrame ticks in 2 s**, and a smooth `scrollIntoView` never advanced a
single pixel while instant scrolling worked fine. Occluded and minimized windows and
some embedded webviews live in this state, which is precisely the user's complaint
reborn through a side door. So `revealTwinCard` verifies arrival ~900 ms after the
smooth attempt and, if the card never left (or never arrived), snaps it instantly.
Smooth when frames flow; guaranteed to arrive when they don't.

**`overscroll-contain`** on the deck's scroll body — wheel energy stays inside the
console instead of chaining.

## Verification of this round

- Full `npm run verify` green **twice** — before and after the safety net landed
  (typecheck, all thirteen gauntlets including R87 + R88, smoke, prod smoke);
  `audit:arch --check` clean.
- Live browser drive of the author's exact flow: console opened (Command Palette →
  Open Core Console), bug reproduced by measurement, fix applied, **Twin seal clicked —
  card arrived (scrollTop 0 → 1006, card top 52 px, Verify Twin button in view)**,
  **Verify Twin clicked — receipt rendered: "Simulator twin verified — active tier
  typescript vs TS twin over 120 steps"**. The dev machine ran the TypeScript tier
  (no compiled artifact in this checkout yet); the reachability fix is tier-agnostic.
- Honest limits: the flash was verified by class probe (`twinFlashed` → ring class
  applied on the first jump; the later probe read it after its 2.2 s window expired).
  The suspended-pane screenshot surface could not produce frames, so arrival was proven
  geometrically (bounding rects) rather than visually.
