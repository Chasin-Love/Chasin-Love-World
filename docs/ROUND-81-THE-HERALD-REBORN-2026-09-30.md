# ROUND 81 — THE HERALD REBORN (2026-09-30)

> The updater card finally fired on the author's machine (15.0.5's clean boot
> let it live past the 8-second check for the first time) — and the author's
> verdict on its design was instant: "the design is not good, change and
> upgrade it." So the card became an artifact.

## What changed

`src/ui/UpdaterCard.tsx` redesigned — **zero new dependencies** (the brain's
law: use what's vendored). framer-motion (springs, orchestration) and
lucide-react (glyphs) were already in the stack; the redesign is built
entirely on them, in the app's own design tokens (solar offer, teal journey,
abyss glass).

The new card, phase by phase:

- **Entrance** — a framer-motion spring (stiffness 260, damping 22) instead
  of the CSS `rise-in`: the card arrives with weight, not a fade.
- **The update star** — a lucide `Sparkles` glyph in a gradient disc,
  wrapped in two halo rings that breathe while an update waits, spin in
  opposite directions while the update travels.
- **Downloading** — an orbital progress ring around the star (SVG
  stroke-dashoffset on a teal→solar gradient) plus a thin linear ghost under
  the copy; the glyph wobbles gently; the star's rings go busy.
- **Installing / relaunching** — `Check` then `Rocket` glyphs, copy beats
  ("The stars realign…", "see you on the other side"), quiet.
- **The offer** — a solid solar gradient CTA (`update now`, with a nudge
  arrow) beside a quiet `later` ghost button; the offer can now be dismissed
  (the old card trapped the user).
- **The chrome** — aurora wash breathing behind glass, hairline solar seam
  on top, layered shadows over the abyss.

Structure: the presentational body is a named export (`UpdaterCardBody`) so
previews and future tests can stage every phase without a Tauri shell; the
default export keeps the desktop wiring (8s check, downloadAndInstall,
relaunch) unchanged — the R81 round touches only how the offer *looks*, not
when it fires (that law was settled in R53 and proven in 15.0.5).

Verification: `tsc --noEmit` green; Playwright smoke green (clean boot, zero
console errors, reference frame match); live preview staged all four phases
in a browser before shipping.

## Release ritual (third proof)

v15.0.6 = R81. Bump the three version files (tauri.conf.json, Cargo.toml,
Cargo.lock — in lockstep since R80), commit, tag, push. The pipeline builds
both platforms, the updater manifest regenerates, and the card this round
rebuilt delivers its own release.
