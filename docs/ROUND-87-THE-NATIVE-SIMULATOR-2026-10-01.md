# ROUND 87 — THE NATIVE SIMULATOR (2026-10-01)

> The author's decree, after reading what the `cosmos_sim_*` scaffolding actually was:
> *"your recommendation is good you can go with it (R87 — 'the native simulator')"* — the
> hybrid ruling accepted (Kepler stays the clockwork of the sky; the stateful simulator is
> the verified interactive layer), executed on its own branch `r87-native-simulator`,
> branched from `r85-the-six-seams`, to be merged back only when the author likes it.
>
> The safety constraint that shaped the round: **the simulator runs only behind a button
> in the Core Console.** The frame loop never touches it; nothing in this round can move
> the rendered sky.

## What was already there (the foundation, verified during the round)

The C++ core has hosted a complete, real **stateful N-body simulator** since its first
build: `NBodySimulator` with mutual Newtonian gravity over all pairs (1e4 m² softening),
classic 4-stage **RK4** integration, SI units — wrapped by a Rust session (`SIM` static,
destroy-and-recreate on configure, 4096-body cap, iteration clamp) and exposed as
`cosmos_sim_configure` / `cosmos_sim_step` / `cosmos_sim_body`. The Rust FFI declares it
in **both** compile modes (real `cosmos_cpp` and the type-check `cosmos_stub`). What was
missing was everything above the Rust layer — the commands had zero frontend callers.

## What changed

**R87.1 — the bridge speaks the simulator (all three tiers).** `cpp_bridge.ts` gains
`simConfigure` / `simStep` / `simBody`, each on the exact `keplerBatch` tier ladder:

- **native-cpp:** direct `invoke` — with the signature trap documented in-source
  (`cosmos_sim_configure` takes the `bodies` array with NO `args` envelope, and a wrong
  field name silently becomes 0.0 via `as_f64().unwrap_or(0.0)`).
- **wasm:** the session handle stored on the bridge; create/destroy on configure (the
  Rust contract), scalar `cosmos_add_body` per body, per-index state reads with fresh
  `HEAPF64` views (never cached across calls — memory growth detaches buffers).
- **typescript:** `TsNBodySim` — a **line-faithful port** of the C++
  `computeAccelerations` + `stepRK4` (same G, same 1e4 m² softening, same pairwise
  i<j pass, same 4-stage composition weights). Deliberately NOT Living Gravity —
  different units, different job; parity is only meaningful against a port this literal.
- **`verifyTwinParity()`** — the receipt: a deterministic seeded system (1 M☉ star, five
  planets on circular AU-scale orbits, xorshift-seeded so every tier sees identical
  bodies), stepped 120 days on the active tier and by the TS twin, compared with
  relative-scaled max Δ (the `-ffast-math` contract: agreement to tolerance, never
  bit-exactness).

**R87.2 — the exports were never exported (hidden bug found).** `build-wasm.sh`
declared **no `EXPORTED_FUNCTIONS`** — the `-O3` linker dead-stripped every `cosmos_*`
symbol (none has an internal caller), so the entire WASM tier, the existing batch tier
included, has been silently degrading to TypeScript since the artifact first existed.
The script now pins the full bridge surface (batches + simulator session + malloc/free)
with a comment explaining why the list is load-bearing. *Limit:* emsdk is absent on this
laptop — the rebuilt artifact is CI/toolchained-host work; the script fix itself is
gauntlet-pinned.

**R87.3 — the twin gets a face.** The **Native Simulator Twin** card joins the Core
Console grid beside the Astrophysics Core card: one button runs
`verifyTwinParity()` and prints the receipt (session tier, bodies, steps, max relative
Δ) with the same `BadgeCheck`/`<1e-9` verified convention as the core card's parity
receipt.

**R87.4 — the gauntlet stands guard.** `scripts/round87-simulator-gauntlet.ts` (14
checks) joins the verify chain: the C++ core + hpp API, the Rust FFI real+stub in
lockstep, the Tauri session contracts, the bridge's three-tier skeleton (including the
no-args-envelope trap), the TS twin's constants and stage composition, the build-wasm
export list (now machine-enforced), the card, and the verify-chain membership.
Architecture snapshot consciously refreshed in the same commit.

## What this round deliberately did NOT do

No renderer changes. No per-frame sim coupling. No change to Kepler, Living Gravity, or
the physics model. The sky is still the Kepler clockwork; the simulator session is
reached only from the console button. The per-frame twin and any interactive-layer
driving are R88+ decisions, gated on the parity receipts this round produces — and the
Kepler-vs-N-body tension stays a creative ruling for the author (the recommended shape
stands: clockwork sky, simulated response layer).

## Verification of this round

- `npx tsc --noEmit` green after every step; round87 gauntlet ALL GREEN (14 checks);
  full `npm run verify` green at round end; `audit:arch --check` clean at the consciously
  refreshed snapshot.
- **Honest limits:** `desktop:check` remains unrunnable on this laptop (no MSVC
  toolchain — though R87 touches **no Rust at all**, so the cargo caveat is unchanged
  from R84–R86); the WASM artifact rebuild needs emsdk (absent here — CI); the native
  tier's numeric receipt is provable only on a toolchained host until then. On this
  machine the twin card self-checks on the TS tier (trivial 0) by design.
