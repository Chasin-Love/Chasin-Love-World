# ROUND 82 — THE VOICE (2026-09-30) · branch `r82-the-voice`

> The Kamui finally speaks. The jutsu sounds like its name.

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
- No reverse-Kamui voice (the eject keeps its existing grammar) — noted as a
  possible R82.5 if the author wants the return trip to speak too.
- No subtle/cinematic user setting — the cinematic mix is the default voice;
  the setting is a natural follow-up if repeat exposure ever tires.
