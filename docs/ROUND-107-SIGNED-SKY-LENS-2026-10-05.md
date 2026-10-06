# Round 107 — The Signed Sky Lens

**Date:** 2026-10-05
**Branch:** `codex/r106-project-audit`
**Base:** `main` Version 20; this round is merged into `main` by the user-authorized fast-forward.

## Mandate

Repair the visible background lensing around black holes. R106's GPU probe established that the accretion-disk raymarch and its controls were active, but it did not establish that stars or galaxies behind the hole were visibly refracted. Keep the distinction between the disk renderer and sky renderer explicit.

## Research basis

NASA's black-hole visualization shows background stars forming an Einstein ring and a reversed view inside it; NASA notes that its visualization uses a simplified optical model rather than a full GR ray trace. NASA's black-hole lensing material also describes distorted and brightened background-star images. Bozza's strong-field analysis describes the logarithmic deflection near capture and the relativistic image series, which this project's weak-field sky shader does not model.

The event horizon itself is opaque to escaping light: an observer cannot see through it. Light from the far side of the accretion disk and background sky can reach the observer after bending around the exterior shadow, making arcs or rings above, below, or around the dark center. The supplied screenshot's dark center with a bright wrapped disk is consistent with that effect; it should not be made transparent. ISRO describes black holes' effects on light and the X-rays from accreting matter. SpaceX's official mission material covers space transportation, not black-hole optics, so NASA, ISRO, ESO, and the Event Horizon Telescope are the relevant sources here.

- [NASA SVS — Black Hole with Accretion Disk Visualization](https://svs.gsfc.nasa.gov/14619/)
- [NASA APOD — Circling the Black Hole](https://science.nasa.gov/apod/circling-the-black-hole/)
- [ISRO — AstroSat FAQ](https://www.isro.gov.in/FAQ_AstroSat.html)
- [ESO — Imaging Sagittarius A* and M87*](https://www.eso.org/public/blog/spot-the-difference-sagittarius-a-m87/)
- [SpaceX — Mission](https://www.spacex.com/mission/)
- [Bozza (2002) — Gravitational lensing in the strong field limit](https://arxiv.org/abs/gr-qc/0208075)

The background shader now uses the Schwarzschild weak-field expansion through second order,

`α(θ) ≈ 2 rₛ/θ + (15π/16)(rₛ/θ)²`,

and preserves the signed lens equation `β = θ − α(θ)`. For an aligned source this produces the Einstein scale `θ_E ≈ √(2 rₛ)` in the distant-source approximation. It is a point-lens sky approximation, not a null-geodesic solution in the strong field. The accretion disk continues to use the existing raymarcher.

## Findings and repairs

1. **The inverse sky map clipped negative source angles.** `max(ang - disp, 0)` erased the opposite-parity solution. The map now keeps signed `β`; the texture-sampled sky can show both image branches, including the Einstein-ring limit.
2. **An artificial radial fade cut off gravity.** The old 4–6 shadow-radius confinement removed bending around the Einstein scale. Black-hole deflection now follows its inverse-angle falloff without a finite-radius cutoff. The separate local photometric well-darkening remains bounded to 4 capture radii.
3. **Point stars received the wrong transform.** A vertex stores a source position, so applying the image-to-source texture map moved it the wrong way. Point-star vertices now solve the forward equation by bisection, use the measured capture boundary, and preserve camera distance. This path currently solves the primary point image; texture-sampled sky layers carry both signed branches.
4. **The disk and sky used mismatched shadow/mass scales.** When the raymarcher exposes its measured critical impact parameter, the sky derives its effective Schwarzschild angular scale from `b_c/(3√3/2)`. The analytic slider-based scale remains the fallback. Both deflection and capture radius now shrink together during the lens-toggle fade.
5. **A disk-spin swirl implied unsupported Kerr frame dragging.** The sky no longer uses the accretion disk's orbital velocity as black-hole spin. Disk rotation and black-hole spin are distinct physical quantities.
6. **The 55 ms frame breaker was unreachable.** It averaged physics `dt`, which is capped at 50 ms. The engine now supplies capped wall-frame time to the same breaker and resets its sample while the document is hidden, avoiding false trips after tab suspension. The 55 ms threshold, 180-frame window, two recoverable stand-downs, and permanent third strike remain intact.

R71 camera-slice laws, the black-hole reference parameters, shader disarm, composite fallback, the frame-budget breaker, reduced-motion behavior, and rigid foreground bodies remain intact.

## Evidence and limits

The live R63 `--gate` ran on Intel UHD / ANGLE D3D11 and passed: the shadow was centered (75.4 px radius, 0.071 viewport-height offset), the interior stayed dark and neutral, and the ring/disk stayed bright. A new hardware visual probe then compiled the exact production `applyLensBend()` GLSL in WebGL2 and rendered one synthetic background source on both predicted branches. For `β=0.100 rad` and the measured capture angle `0.04824 rad`, the predicted primary/secondary image angles were `+0.2587/−0.1641 rad`; Intel UHD rendered peaks at `+0.25840/−0.16465 rad`. The captured two-image fixture is `scripts/verify/r107-sky-lens-fixture.png`. This tests actual GPU pixels from the production sky mapping code; it is a controlled shader fixture, not a capture of the authored universe scene. Earlier Playwright launch attempts were blocked in the default sandbox, but the live GPU probes succeeded with the required process access.

The R106 GPU probe's `uLensing=2.4` and sky-bend value `1` report control state, not image displacement. The R63 void ratio reports the central shadow composition, not background-galaxy distortion. Those results must not be cited as proof of sky lensing. The controlled R107 GPU fixture closes the shader-level visual receipt. A separate full-scene capture could still help tune artistic density and framing, but it is not required to show that the background lens map renders both images.

## Verification

- R16 lens equation gauntlet — green: second-order coefficient, signed image pair, Einstein scale, capture boundary, and measured-capture coupling.
- R17 lens wiring gauntlet — green: source-to-image point mapping, shared capture uniform, no arbitrary field cutoff, and no invented disk-spin term.
- Full `npm run verify` — green: typecheck, all 25 gauntlets, software-tier dev smoke (`histL1=0.0009`, renderer reported SwiftShader and correctly kept geodesic raymarch off), and production smoke.
- `npm run audit:arch -- --check` — green after refreshing the generated snapshot: 186 code files, zero dead value exports, zero dead type exports; `.kamui-disappear` is intentionally pinned by round18.
- R63 live `--gate` — green on Intel UHD / ANGLE D3D11 after the R107 wiring changes; this is a shadow/disk check, not a background-lensing image test.
- `npx tsx scripts/probes/round107-sky-lens-visual-probe.ts` — green on Intel UHD / ANGLE D3D11: one source becomes the predicted primary and secondary images, both within 0.012 rad of the analytic solution.
- R107 frame-budget gauntlet — green: visible wall-time seam, hidden-tab reset, original threshold/window/strike contract.

## Deliberately unchanged

The sky shader does not claim the strong-field relativistic image series, Kerr frame dragging, or a full GR geodesic integration. Those require a separate renderer design and visual/performance evidence. No physics constants, seeds, localStorage keys, route strings, Tauri commands, or pending Sol-Prime data were edited for this round. The signed weak-field correction is implemented, its source/mathematical gauntlets pass, and the production mapping has a passing hardware pixel receipt. The controlled fixture does not certify full-scene artistic tuning or exact GR behavior. The previously deferred frame-breaker fix preserves the existing safety policy and now samples actual visible frame time.
