# ROUND 82 — THE VOICE (2026-09-30) · branch `r82-the-voice`

> The Kamui finally speaks. The jutsu sounds like its name.
> And the return speaks too — the zip-close that seals what was opened.

## Status: ON A BRANCH, NOT MAIN

The author's law for this round: **do not touch main**. The voice is built on
the isolated branch `r82-the-voice` and stays there until the author decides.
No release, no tag, no merge — the branch is the audition room.

## The decision that shaped it

From the Desktop dossier (`KAMUI VOICE - discussion`), after listening to all
candidates and the real NASA recordings, the author chose:

> **THE FULL KAMUI — cinematic** — "Identical timeline, full mix: blooming
> riser, present drone, weighted drop. The jutsu sounds like its name.
> feels POWERFUL."

with eyes open about the one risk (repeat-exposure fatigue) — which the
mute toggle already answers, and a future round could soften with a
subtle/cinematic setting.

## What was built

`src/platform/audio.ts` — THE KAMUI VOICE (R82): the chosen sequence
synthesized in-house with this file's own building blocks (noise buffers,
oscillators, filters — zero audio files, zero new dependencies):

| Beat | Sound | Timing (from kamuiPhases.ts constants) |
| :-- | :-- | :-- |
| The summon | Blooming riser: band-passed noise sweeping 180→2600 Hz + a low 46→184 Hz climb, gain riding the vortex's eased-strength curve | 0 → 5.0 s |
| The tear | A rip: short downward band-pass snap (3200→420 Hz) | 2.25 s (mid-summon) |
| The heart | The B♭ drone (58.27 Hz + pure overtone stack, each partial orbiting the head on its own slow LFO) — the Perseus homage | 2.25 → 5.9 s |
| The gulp | Sub-drop 82→24 Hz while a noise bed's stereo sides collapse to center — sound being swallowed | 5.0 → 6.0 s |
| The arrival | The app's own chimes (880/760) re-voiced with a soft air wash | ~6.25 s |

`src/App.tsx` — the voice is triggered in `onKamuiTrigger` (the same seam the
DOM swallow uses), forward summons only; the reverse (eject) keeps its quiet
grammar. The handle is stored in a ref and stopped on unmount — no orphaned
graphs.

## The laws honored

- **Mute law:** everything routes through the master gain — the toggle kills
  it instantly, and the App side additionally refuses to schedule while muted.
- **Engine ⇄ React law:** the engine reports via the existing
  `onKamuiTrigger` callback; `audio.ts` never imports engine code and the
  engine never imports audio. The timeline constants come from
  `kamuiPhases.ts`, so sound and pixels cannot drift.
- **No new dependencies:** pure Web Audio, same as every other sound in the
  app. The dossier's NASA files stay on the Desktop as research — nothing
  vendored, nothing licensed, the whole voice is math.
- **Zero-fail rendering:** the voice is built inside try-safe graph calls,
  guarded by `ensure()`; any AudioContext failure is a silent no-op exactly
  like every other SFX in the file. The watchdog disconnects the graph after
  the sequence ends.

## Verification

- `tsc --noEmit` green
- `scripts/round18-kamui-gauntlet.ts` GREEN (all portal laws intact — the
  voice changed nothing about timing, beats, or the HUD re-entry)
- `scripts/smoke.ts` GREEN (clean boot, zero console errors, reference frame
  match)
- The candidate the implementation mirrors was the author's own audition pick
  (`sequence-cinematic.wav` in the Desktop dossier).

## What this round deliberately does NOT do

- No merge to main, no tag, no release — the author merges when ready.
- No subtle/cinematic user setting — the cinematic mix is the default voice;
  the setting is a natural follow-up if repeat exposure ever tires.

## R82.1 — THE LATENESS FIX (same day)

The author's first live report: "the audio starts 2–3 seconds late." The mix
was at fault, not the ears — the riser's gain rode the vortex's cubic ease-in
from zero (17% at 1.25s), so the first genuinely audible moment was the rip at
2.25s. The portal now announces itself on frame one: an 80ms attack to a
presence floor, the swell riding on top, the low lift starting at 65 Hz
(laptop-reproducible) instead of 46.

## R82.2 — THE EXHALE REMOVED (same day)

Live inside the app, the arrival exhale stacked on the app's OWN arrival
chimes (`chime(880/760)` fire on every landing in App.tsx) — two arrival
voices read as misplaced. The exhale was removed (it had sounded right in the
standalone candidate because nothing else was playing there). The voice now
ends with the gulp's swallow handing off to the existing arrival grammar.
Lesson pinned: a candidate is only proven inside the app's own soundscape.

## R82.3 — THE RETURN VOICE, THE KNIT (same day)

The author ran the same research drill for the reverse Kamui (dossier:
`Desktop/KAMUI RETURN - discussion/`, real LIGO GW150914 chirps from GWOSC +
synthesized candidates) and chose **THE KNIT — the zip-close**: the tear's
edges pulling shut, noise descending and tightening (the forward riser
mirrored), a faint gather rising into the seal.

`playKamuiReturnVoice(1.9)` fills the real reverse timeline:
- **the knit** — noise 1800→220 Hz while the Q tightens 1.4→4.5, gain riding
  the mirror envelope (full at the burst, decaying to rest)
- **the gather** — a tone rising G3→C4 into the seal moment
- **the whisper-seal** — one soft consonant dyad (C4+G4) landing where the
  gather arrives, decaying in 0.65s — a period, NOT a bell (the R82.2
  lesson: never stack on the app's own voice)

Wired in the same `onKamuiTrigger` seam: `reverse ? playKamuiReturnVoice(1.9)
: playKamuiVoice(5.0, 1.0)` — both directions speak, both obey the mute law.
Typecheck green; round18 gauntlet green.
