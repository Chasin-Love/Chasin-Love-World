# ROUND 103 — THE WALL-CLOCK JUTSU (and the lens's witness)

**Date:** 2026-10-03 · **Branch:** `r103-the-wall-clock-jutsu` (cut from `r102-the-independent-realities` tip)
**Author's report (verbatim intention):** (1) the spacetime bending around the black
hole — the Galaxy lens — is missing on localhost; (2) the reverse Kamui sticks at
its last second instead of returning to idle on one smooth curve ("like the
negative side of a parabola — no interval, no interrupt"), the first summon can
freeze the whole screen mid-beat, and **the audio is always right regardless**;
"I think there is something that holds back everything — find it and solve it."

---

## 0. TL;DR

- **The freeze family — one root, confirmed by instrument, fixed.** The Kamui
  choreography paid its timers in *capped physics* `dt` (≤ 50 ms per frame), so
  under any heavy rendering stretch the 1.9 s eject could only advance 50 ms per
  rendered frame — measured: **19.7 wall seconds for the 1.9 s eject** at ~2 fps.
  The R82 voice is synthesized on the AudioContext **wall clock** and always
  finished on schedule — exactly the author's "the screen is stuck, the audio is
  correct". The jutsu now rides a second, wall-clock channel (`wallDt`) through
  the same tick: the theater tracks real seconds, the physics keeps its cap.
- **The lens is not regressed in source — proven on the author's own GPU
  silicon** (Intel UHD, D3D11, headless-forced): the geodesic quad attaches,
  `uTime` is driven, `uCriticalB = 4.497`, the surface lens roster carries the
  hole at slot 0 with a live measured velocity, and the lensed accretion blaze
  renders. What CAN silently extinguish it — a software-WebGL session (GPU
  process crash → SwiftShader), the Studio tier override, or quality 'low' —
  used to be invisible outside the Studio card. **It now speaks**: a one-time
  console witness names the reason and the way back.
- **Deliberately NOT done:** re-arming the R20/53 55 ms frame-budget breaker on
  wall dt. It has been unreachable since inception (the guard averages the
  capped `dt`, and `0.05 < 0.055` never holds — see §3). Re-arming it on the
  author's iGPU would auto-hide the lens mid-watch — the exact thing they asked
  to see. Decision queued for the author (§7).

---

## 1. The hunt, honestly (the R98 law: negatives proven by observation)

Three hand-run probes in `scripts/probes/` (kept as instruments):

- `round103-bughunt-probe.ts` — boots the real app, drives full Kamui cycles
  (planet diary open/close, vault open/leave), with three page-side instruments
  installed *before* app code: a rAF gap recorder, a tap on
  `eventide-raymarch-status` tier transitions, and a 100 ms timeline sampler
  (`kamuiTimer`, portal phase, ease). Writes `scripts/verify/bughunt/` captures
  + `r103-frame-ledger.json`. `R103_GPU=1` pins the run onto the real GPU.
- `round103-gpu-lens-probe.ts` — answers "is the geodesic tier alive on the
  real adapter": renderer string, `geodesic`/`quadVisible`, live uniforms,
  one settled capture at the R20.2 framing.
- `round103-lens-recheck.ts` — the smoke-exact drive with three sequential
  settled shots (rules out the mid-flight screenshot artifact).

### What the first run measured (pre-fix, headless = SwiftShader ≈ the extreme
slow pipeline)

- Whole session averaged **2.9 fps**; every frame ~350–500 ms (software GL).
- The reverse Kamui's `kamuiTimer` decayed 1.20 → 0.00 across **19.7 wall
  seconds** (design: 1.9 s). `kamuiTimer -= dt` with `dt = min(0.05, Δ)` pays
  at most 50 ms per rendered frame; 1.9 s of timeline needs 38 frames — at 2
  fps that is ~19 s of wall time. The ease tail then lingered visibly long
  after the (wall-clock) voice had finished — *the stuck last second*.
- The forward path stretches identically: the entry hold (5.0 s) needs 100
  frames → the diary overlay opened ~50+ wall seconds after the click
  (pre-fix run: `diary-open:false` within a 20 s poll).
- The pit screenshot (`r103-eventide-lens.png`, black disc) was **the correct
  look of the geodesic tier being OFF under SwiftShader** — the dome's own
  capture shadow and well (`lensCaptured`/`lensWellDarken`) still render; only
  the raymarched blaze is absent. Verified, not guessed: `geodesic:false,
  quadVisible:false`, no tier transitions, no shader errors, `uLensCount=8–9`,
  `uLensBend=1`.

### What the GPU run proves

`ANGLE (Intel, Intel(R) UHD Graphics (0x000046A3) Direct3D11)` — the same
adapter family the author's live Chrome drives: `geodesic:true`, uniforms
driven per frame (`uTime` advancing, `uCamPos`/`uCenter` live), and the capture
`r103-gpu-lens.png` shows the lensed disk in full (orange Doppler disk, shadow,
photon wrap). The dome lens roster is populated in every run
(`uLensCount 8–9`, hole at slot 0 with `uLensVel = measured live velocity`).
**On the current branch, on the author's hardware class, through the dev
server: the bend renders.**

So the author's missing lens at home is a *state*, not a *regression* — one of:
their localhost tab fell to software WebGL (GPU process crash / blocklist — the
probe's pit reproduces that look exactly), `my-universe:blackhole:tier:v1 =
'off'`, `my-universe:quality = 'low'` (note: the one-time migration only ever
clears a stale `'cinematic'`), or `spacetimeLensing:false` in
`my-universe:v4`. Each is now named by the witness (§2.2) the next time it
happens.

## 2. The changes (small diffs, every pinned literal untouched)

### 2.1 THE WALL-CLOCK JUTSU — `src/engine/engine.ts` (tickFrame, ~4 lines + the law comment)

```
const rawDt = this.clock.getDelta();
const wallDt = Math.min(0.5, rawDt);   /* the theater's clock — real seconds */
const dt = Math.min(0.05, rawDt);      /* the physics clock — unchanged law  */
```

The four choreography updates and the per-frame theater application ride the
wall channel, in their exact R97 order:

```
this.kamuiPortal.updateKamuiBeats(wallDt);
this.kamuiPortal.updatePortalHold(wallDt);
this.kamuiPortal.updateStageWarp(wallDt);
this.kamuiPortal.updatePortalPhases(wallDt);
…
this.applyKamuiFrame(wallDt);
```

Everything else — the session driver, Living Gravity, the rig, the Kepler
solve, meteors, hover, the renderer — keeps the 50 ms-capped `dt`.

Why this is the right shape, and not "raise the cap" or "substep":
- The clamp exists for the *integrators* (RK4 sessions, exponential damping):
  a 400 ms step tears physics. The Kamui is **choreography scored against an
  audio file** — R82's voice is literally synthesized at 5.0 s / 1.0 s / 1.9 s
  on the AudioContext clock. Two clocks, two consumers; the bug was paying the
  theater from the physics purse.
- Substepping (rendering 38 compressed increments) cannot help the *eye* — the
  eye watches presented frames. Under stall the honest behavior is the curve
  *evaluated at the true t* on the next frame: the author's "smooth curve, no
  interval" — the motion resumes where the voice already is.
- The 0.5 s sanity cap keeps a hidden-tab resume from teleporting whole
  choreographies; γ-jitter beyond that is out of scope by construction.

Consequences that get *better* on slow machines, per the R77 watch item: the
"dead click while a reverse unwinds" refusal window now lasts 1.9 real seconds,
never 20.

### 2.2 THE WITNESS — `src/engine/blackhole/BlackHoleSystem.ts`

The non-geodesic attach (`override-off` / `tier-low`) now prints **once per
session**:

```
[universe] the geodesic black-hole tier is NOT live (…) — the lensed Eventide
look is off this session. The Black Hole Studio tier switch can force it ('on');
the dome's sky-bend is unaffected.
```

R98's law applied to symptom 1: degradation is a value, never a shrug. The
Studio card already renders `getRaymarchStatus()`; the console sentence is for
the traveler who never opens the Studio.

## 3. Discovery recorded (not changed): the dead breaker

`BlackHoleSystem.guardRaymarch(dt)` receives tickFrame's **capped** dt
(`min(0.05, …)`) and trips at `avg > 0.055` — unreachable since the clamp
predates the breaker (`Math.min(0.05)` is initial-commit; the breaker is
R20-era). The round17 pins keep both literals, so the form is gauntlet-locked
while the effect is void. **Left as-is this round, on purpose:** on the
author's iGPU an honestly re-armed breaker would stand the geodesic tier down
after ~18 s × 3 of slow hole-watching — i.e., it would periodically delete the
very lens the author asked to see, which is the opposite of this round's
purpose. §7 queues the author's call (re-arm on wall dt / retire with honors).

## 4. Receipts

- `npm run typecheck` — clean.
- Gauntlet head (the pinned surfaces nearest to the change): round18 (Kamui),
  round17 (breaker pins + lens slot law), round72 (stage warp), round63 (void)
  — **ALL GREEN**, no reconciliation needed: the pinned bodies
  (`kamuiTimer - dt`, the eject sine, the relax line, the spin integrator) are
  byte-untouched; only the call-site arguments changed.
- **Probe, pre-fix** (SwiftShader — the extreme slow pipeline): eject
  **19.7 s wall** for the 1.9 s design; summon hold > 20 s; the red vortex
  still painted 3.5 s after the voice ended (`r103-post-reverse.png` —
  photographic proof of the stuck tail).
- **Probe, post-fix, author's GPU silicon** (Intel UHD / D3D11): reverse
  (diary) **1.64 s wall**, reverse (vault) **3.06 s**, forward summon
  **5.02 s** — the choreography now keeps real time; zero console/page errors;
  geodesic tier LIVE, lens roster populated (`r103-after-gpu.log`,
  `r103-gpu-lens.png`).
- **Probe, post-fix, SwiftShader** (same pipeline as the pre-fix repro):
  eject 19.7 s → **4.94 s** wall (the residual is the instrument's own
  sampling slop at 1.6 fps — the law asserted is "real seconds, not
  frame-counted seconds", and it holds), forward 7.21 s; the tier witness
  prints exactly once with reason `tier-low`; zero console/page errors.
- **Harness repairs discovered en route:**
  (a) the smoke's 40 s camera-settle window is below the rig's wall-clock
  asymptote under software GL (measured worst 51 s on the author's laptop; the
  rig's per-frame easing is unchanged since the initial commit) —
  `SETTLE_TIMEOUT_MS` 40 s → 150 s with the measurement recorded;
  (b) THE BOOT-RETRY GUARD — the §9-recommended tiny round, done: a smoke red
  carrying the documented cold-boot signature (`ERR_CONNECTION_REFUSED` /
  `Execution context was destroyed` / HMR websocket / never-settled) now earns
  ONE fresh retry on a rebooted server; a red without the signature fails in
  one attempt as before. Post-repair standalone smoke: **GREEN first attempt,
  histL1 0.0707** vs the 0.12 pin (shadow 0.289/0.290, bright 0.086/0.086,
  zero console errors).
- Full `npm run verify` on the final tree: **exit 0 — 21 gauntlets, SMOKE
  GREEN on the first attempt (histL1 within pin), PROD SMOKE GREEN.** Same-day
  mid-session re-runs hit the documented cold-boot race at the smoke step with
  the gauntlets all green (§9 rule-of-thumb signature; the retry guard fired
  honestly and preserved red when the race repeated): the protocol was
  followed and the standalone re-runs are green (histL1 0.0681 / 0.0707).
- `audit:arch --snapshot` refreshed in-commit (three new probe files absorb
  the same `window.__ENGINE__` seam the R101/R102 probes carry); `--check`
  **clean**.

## 5. For the author — your localhost checklist

If the lens ever looks absent again, F12 console answers it in one line now.
If nothing prints and the pit persists, two switches to sanity-check in
DevTools → Application → Local Storage:

- `my-universe:blackhole:tier:v1` — should be absent or `auto`/`on`
  (`off` = plain pit by request; the Core Console's Black Hole Studio card
  shows the live tier with its reason).
- `my-universe:quality` — `low` disables the raymarch tier; absence = auto.
  (Browser loadouts that once probed as software can leave this behind.)
- In `my-universe:v4`, `"spacetimeLensing": false` would damp the *sky* bend
  (Core Console → Einstein lensing toggle defaults ON).

## 6. Files

- `src/engine/engine.ts` — the two-clock tick (`wallDt`), the four choreography
  calls + `applyKamuiFrame` on the wall channel, the law comment.
- `src/engine/blackhole/BlackHoleSystem.ts` — the one-time witness.
- `scripts/smoke.ts` — the measured settle window (40 s → 150 s) + the
  boot-retry guard (§9's recommended tiny round, taken).
- `scripts/probes/round103-bughunt-probe.ts` — the instrumented cycle probe
  (wall-clock law asserts; gap ledger informational).
- `scripts/probes/round103-gpu-lens-probe.ts`, `scripts/probes/round103-lens-recheck.ts`
  — the environment truth instruments (kept for the next "it's dark" report).
- `scripts/verify/bughunt/` — captures + ledgers (regenerated each run).

## 7. Queued for the author's word

- The dead 55 ms breaker (§3): re-arm on wall dt (protects weak machines at the
  cost of sometimes hiding the lens), or formally retire it (the adaptive
  resolution damp + shader disarm remain).
- §9's known one-time hitch: the first summon of a session compiles the vortex
  pass on its first frame — a shader warm-up round would remove the last
  bootstrapping stutter (now strictly more visible, since the timeline no
  longer stretches to hide it).

*R103 — the jutsu keeps its own time, and the pit speaks when it is only a pit.*
