# ROUND 67 — THE THROAT HANDS OFF (2026-09-29)

The user's law: **the moment the vortex is fully formed, the contents come
out.** After the throat completed, the screen went quiet — the vortex died,
the swallowed world was gone, and the diary/vault was still ~2 s away. That
silent gap read as a processing freeze (a bug, to the traveler). We obey the
user.

## The old timeline (forward portal — click a planet / black hole)

| t | what played |
|---|---|
| 0 → 4.0 s | the vortex forms (tear → wind → flicker → deepen) |
| 4.0 → 5.5 s | the throat: vacuum surge, size drain, rumble — the swallow |
| 5.5 s | **everything stops** — the vortex decays out in ~1.1 s while the camera dive has only just begun |
| ~7.5 s | the dive lands → the overlay opens |

The dead zone was not one bug but three stacked waits: the hold expired at
5.5 s and only then started a **full-length dive** whose arrival *was* the
overlay trigger; the vortex was already gone; and on a first-ever open the
diary/vault code chunk fetched during that window.

## The chosen fix — THE HANDOFF (better than "rotate the vortex" or "skip")

The user offered two paths (spin the vortex frame / skip the frame). The
root cause sits one level deeper: the overlay's trigger was chained to the
*camera's arrival*, not to the *tunnel's completion*. So the tunnel now
hands the contents over at the exact frame it finishes — the eject happens
**through the still-spinning, still-collapsing vortex**, which is precisely
the jutsu's own grammar (the tunnel closes behind what it delivered). The
dive becomes a settle behind the live overlay; the vortex's own decay is
the transition. No beat is skipped, no freeze survives, and the vortex
remains visibly alive through the handoff — both of the user's proposed
outcomes, obtained without inventing a new animation.

## The commit map (each step its own commit — `git log` maps them)

| Commit | What it does |
|---|---|
| `ab162dfd` | **THE THROAT HANDS OFF** — when the summon's hold expires (the frame the last beat completes), the portal fires `onPortalPeak` on that frame: the diary/vault materializes through the dying vortex. The zoom-arrival branch stays as the safety net (phase is already `open`, so it no-ops). |
| `db9fa03d` | **THE ARRIVAL SETTLE** — the post-swallow dive eases 60% of the way; the overlay's entrance owns the last mile. Kills the ~2 s of empty, unseen zoom behind the overlay. |
| `1d3f3de6` | **THE THROAT UNWINDS** — `uVac` no longer snaps 1 → 0 in one frame at timer expiry (a hard stutter at the exact eject instant). It holds through the last frame, then unwinds on the same decay the vortex glow already rides; the swallow factor restores with its existing hygiene. |
| `021c1c65` | **THE SUMMON PREHEATS ITS DESTINATION** — the 5.5 s tunnel build warms the diary/vault code chunks (`import()` in `onKamuiTrigger`), so the first-ever open is as instant as every later one. |
| `2a86d945` | Hygiene: the unwind releases the swallow group once the drain converges. |

## What was NOT changed (deliberately)

- `KAMUI_TRIGGER_DURATION`, the beat choreography, `KAMUI_VACUUM_WINDOW`,
  the swallow law, the eject (`KAMUI_REVERSE_DURATION`) — untouched. The
  summon the user called "at its best shape" is preserved beat for beat.
- Stage warps, galaxy dives, and Kamui jumps keep their existing flow —
  they had no dead gap (the stage folds *while* the tear plays).
- The `?` key list, HUD, and CSS vortex animations — untouched.

## Verification

- `npm run typecheck` — clean (after every commit).
- round16 (lens law) · round17 (port pins) · **round18 (Kamui — the entry
  hold, the pinned dial, the choreography, the swallow, the eject: ALL
  GREEN)** · round63 (void seals) — ALL GREEN.
- `npm run smoke` — **GREEN**: clean boot, zero console errors, reference
  frame matches (histL1 0.0556 ≤ 0.12; shadow/mean/bright bands within
  limits).

## The new timeline

| t | what plays |
|---|---|
| 0 → 4.0 s | the vortex forms |
| 4.0 → 5.5 s | the throat — the swallow |
| **5.5 s** | **the contents eject through the still-spinning, collapsing vortex** — diary windows / the vault gate rise while the tear closes behind them |
| 5.5 → ~7 s | the vortex's own decay IS the transition; the camera settles behind the live overlay |

One continuous act: tear → swallow → eject, with zero silence between the
throat and the contents.

## Runtime escape hatch

Every step is an isolated commit — `git revert <sha>` removes exactly one
behavior (handoff, settle, unwind, preheat) without touching the others.
