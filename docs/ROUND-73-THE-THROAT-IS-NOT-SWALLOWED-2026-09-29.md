# ROUND 73 — THE THROAT IS NOT SWALLOWED (2026-09-29)

The user's law: **the vault Kamui must read as the Kamui.** They watched the
black hole itself — the door to the Universal Vault — do a *"weird reaction"*
and then *"totally go out... totally vanished"* right before the vault opened.
A door that eats itself before opening is not the jutsu; it is a very bad
signal. Planets were fine; only the hole was wrong.

## The live telemetry (deterministic, frame-by-frame, no GPU guessing)

The dev app was driven through a real vault Kamui with a 250 ms engine probe
(`kamuiSwallowFactor`, the vault body's group scale, the geodesic quad's
world scale, the raymarcher's breaker flags):

| t (summon) | what the telemetry caught |
|---|---|
| 0 → 4.0 s | the hole whole (scale ≈ 1.0) while the tear builds |
| 4.05 s | the vacuum gulp begins — the hole starts draining |
| 4.85 / 5.05 / 5.25 s | scale 0.894 → 0.746 → 0.529 |
| 5.45 s | **scale 0.237** — a quarter of the door, as the timer expires |
| 5.65 s | `onPortalPeak('vault')` — the vault opens; `setRendering(false)` freezes the universe on that vanished last image |

The raymarcher breaker never tripped (`geodesic: true, stoodDown: false`
throughout) — this was not performance; it was deterministic. Every vault
Kamui drains the door.

## The root cause

The vacuum gulp (the tear's final stage) drains "the swallowed subject's
own size" by scaling its scene-graph group toward 0.06 — canon for a PLANET
being swallowed into the tear. `resolveKamuiGroup()` resolved the subject
purely by the tear's body id, and for a vault portal that subject **is the
black hole itself**. The geodesic hole's image lives on a quad inside the
body's group, so the door visually collapsed into its own tear.

## The fix — one law, one guard

`resolveKamuiGroup()` now refuses hole/vault bodies as swallow subjects:

```
if (home.data.kind === 'hole' || home.data.kind === 'vault') return null;
```

- The throat completes around a WHOLE door: the uVac surge, the rumble and
  the entire vortex still play — only the group drain is refused.
- Planets, inner worlds and diving galaxies keep the canon drain (the
  swallow the traveler called good stays exactly as it was).
- The reverse (leaving the vault) never armed the gulp — untouched.

## Verification (honest)

- Live re-drive on the fixed code through the same full summon: the swallow
  factor never left 1.000; the hole's group scale never dropped below
  **0.992** (the selection pulse's own wiggle); zero tick errors.
- `npm run verify` — **ALL GREEN**: typecheck; round16/17/18/63/72/**73**
  gauntlets; smoke + prod-smoke, zero console errors. round18's vacuum pins
  (`uVac`, `kamuiSwallowFactorFor`, the scale writers) all held.
- New `scripts/round73-throat-gauntlet.ts` (5 invariants) wired into the
  verify chain after round72.

## Watch items

- The first summon of a session compiles the vortex pass on its first
  frame — a one-time shader-compile hitch the traveler can feel. The R67
  preheat warms the CODE chunks; a shader warm-up would be its own round.
- In a hidden tab the browser pauses rAF and the engine halts entirely
  (`if (!this.rendering) return`) — by design, and invisible to a live
  traveler; noted here only because the round's own telemetry was gathered
  frame-by-frame in exactly that state.
