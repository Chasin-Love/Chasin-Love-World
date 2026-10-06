# ROUND 74 — THE HOLOGRAPHIC HERALD (2026-09-30)

The user's laws, verbatim in spirit: **the hover card pops only when the
pointer is actually on the object's visible disk** ("if the disk ends at X,
taking the mouse to X/2 outward should NOT pop it"), **the card must stand
OUTSIDE the disk so the object stays visible and clickable** ("it appeared
above the galaxy and hid my ability to click it"), the same discipline on
the multiverse giant sphere, and the whole thing should look like **a cool
3D-animated dashboard**.

## What was wrong (measured, then fixed)

| Offender | Old behavior | Now |
|---|---|---|
| Web-side galaxy collider | sphere `radius × 1.35` — hover fired 35% beyond the visible disc | `radius` — the collider IS the disc |
| Multiverse galaxy collider | sphere `size × 0.18` — 1.8× the visible glow | `size × 0.12` — hugs the glow |
| Reality bubble herald | anchored on the cursor, inside the glass | anchors outside the whole 2.6× glass (`userData.anchorScale`) |
| Card anchor | `cursor + 24px` — ON the object | outside the object's **projected screen disk** |
| Cluster card root | `pointer-events-auto` — stole every click over it | shell is pointer-events-none; only real buttons take clicks |

## The herald's mechanics

- **THE HERALD'S DISK** — `pick()` stashes the hit collider; `hoverDiskOf()`
  projects its center and rim to CSS pixels and reports
  `{ cx, cy, r }` through the extended `onHover` contract. While a hover
  lives, the disk re-emits at ~8 Hz — an orbiting object keeps moving under
  a still pointer, and the card rides its edge instead of freezing at the
  pointer's last position.
- **THE PLACEMENT** — `placeHoloCard()` scores all four sides of the disk
  (clamped penetration into the circle, then viewport fit, then the side
  the traveler approached from) and the cleanest wins. On a cramped
  viewport where no side fits, the least-penetrating placement wins and the
  card stays click-transparent, so the object is never un-clickable.
- **THE STEM** — a dashed, flowing line plugs the card into the disk's true
  rim with a pulsing dot — the dashboard callout feel, honest even when the
  clamp pulls the card back.
- **THE SHELL** — one shared `HoloCardShell`: 3D perspective entrance per
  subject, a spinning conic holo border in the object's own palette, a slow
  sheen across the glass. CSS only — no new dependencies, reduced-motion
  inherits the project's global guard.

## Verified live (the user's own galaxy, in the running app)

Hovering "Aurora Test Grand Spiral" (the exact card from the user's
screenshot) with a screen probe:

- pointer ON the disk → card mounts, nearest card edge **174.6 px** from the
  disk center against a **148 px** disk — fully outside, stem plugged in.
- pointer at 175 px (between the rim and the old 1.35× reach, where the old
  code popped the card) → `hoveredId` stays null, no card.
- `elementFromPoint` inside the card hits only its intentional buttons; the
  shell itself is click-transparent end to end.

## Verification (honest)

- `npm run verify` — **ALL GREEN**: typecheck; round16/17/18/63/72/73/**74**
  gauntlets; smoke + prod-smoke, zero console errors.
- New `scripts/round74-herald-gauntlet.ts` (13 invariants) wired into the
  verify chain after round73.

## Watch items

- The multiverse reality-bubble hover TRIGGER still lives inside the glass
  (only the anchor moved outside it) — enlarging the trigger to the glass
  would fire the card even earlier, the opposite of the user's ask.
- The cards' nominal placement heights are hand-set (310/300/300); a card
  that grows taller than its nominal height could re-introduce a small rim
  overlap on tiny viewports — the scorer's penetration term still picks the
  cleanest side, and the shell stays click-transparent regardless.
