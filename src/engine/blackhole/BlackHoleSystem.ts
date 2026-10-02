/* R97 — THE BLACK HOLE SUBSYSTEM. Extracted verbatim from the UniverseEngine
   monolith: the one attach path, the release path, the geodesic switch, the
   camera checkpoint, adaptive resolution, the on-stage probe, the glow
   proximity, and the frame-budget circuit breaker. The engine composes this
   class and feeds it the shared runtime through the `eng` handle; every
   engine-owned member is reached by a name-preserving getter, so the moved
   bodies read exactly as they did inside engine.ts. Owns: the hole visuals,
   the breaker, the pixel-ratio damp, and the camera-memory checkpoint state. */
import * as THREE from 'three';
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { createBlackHole, type BlackHoleVisual } from '../blackholeRaymarch';
import { canUseRaymarchBlackHole, isSoftwareRasterizer } from '../capability';
import { getRaymarchOverride, setRaymarchStatus } from '../blackholeTier';
import { setCameraMemory, type CameraMemory } from '../cameraMemory';
import type { CameraRig } from '../cameraRig';
import type { RuntimeBody, UniverseEngine } from '../engine';

export class BlackHoleSystem {
  constructor(private eng: UniverseEngine) {}

  /* ---- the shared runtime (engine-owned; name-preserving access) ---- */
  private get renderer(): THREE.WebGLRenderer { return this.eng.renderer; }
  private get composer(): EffectComposer { return this.eng.composer; }
  private get camera(): THREE.PerspectiveCamera { return this.eng.camera; }
  private get bodies(): RuntimeBody[] { return this.eng.bodies; }
  private get bootIntro(): boolean { return this.eng.bootIntro; }
  private get kamuiTimer(): number { return this.eng.kamuiTimer; }
  private get portal(): UniverseEngine['portal'] { return this.eng.portal; }
  private get galaxyDive(): { galaxyId: string; endInner: boolean } | null { return this.eng.galaxyDive; }
  private get cosmicStage(): 'web' | 'multiverse' { return this.eng.cosmicStage; }
  private get rig(): CameraRig { return this.eng.rig; }
  private get focusId(): string | null { return this.eng.focusId; }
  private get _vScratch1(): THREE.Vector3 { return this.eng._vScratch1; }

  /* ---- owned state (moved verbatim) ---- */
  blackHoles: BlackHoleVisual[] = [];
  raymarchDisabled = false;
  private _rmGuardFrames = 0;
  private _rmGuardAccum = 0;
  raymarchStoodDown = false;
  raymarchFlaps = 0;
  private _rmAwayFrames = 0;
  private _camMemTimer = 0;
  _camMemLast: Omit<CameraMemory, 'savedAt'> | null = null;
  pixelRatioBase = 1;
  pixelRatioApplied = -1;
  holePixelRatioDamp = 1;
  /* R97: bloomHoleBoost stayed with the shell — it is the composer's bloom
     memory, not hole state; the shell feeds it from holeGlowProximity(). */

  /* Round 54/55 — ONE attach path. Every hole gets the geodesic renderer when
     the GPU allows it; when it cannot, the hole hides itself — nothing painted
     ever stands in. The 'on' override forces past the tier gate (a saved 'low'
     quality setting must not silently win over the user's explicit switch) but
     never past a software rasterizer, and never past a shader-failure disarm.
     ROUND 59 — no background captures of any kind: the sky layers bend
     themselves (the surface manager's 1/θ lens), so there is no second image
     of the sky anywhere in the pipeline — no square, no layers. */
  attachBlackHole(R: number, container: THREE.Object3D): BlackHoleVisual {
    const override = getRaymarchOverride();
    const capable = !this.raymarchDisabled
      && (canUseRaymarchBlackHole() || (override === 'on' && !isSoftwareRasterizer()));
    const geodesic = override !== 'off' && capable;
    const visual = createBlackHole(R, { geodesic });
    container.add(visual.group);
    this.blackHoles.push(visual);
    if (geodesic) setRaymarchStatus(override === 'on' ? 'forced' : 'active', 'attached');
    else setRaymarchStatus('off', override === 'off' ? 'override-off' : 'tier-low');
    return visual;
  }

  /* R85 — the release path. attachBlackHole registers every hole visual, and
     until now nothing ever un-registered one: the visual's window listener
     (BLACKHOLE_CHANGE_EVENT), its LUT texture and its shader material outlived
     the body, and the dead visual kept marching (criticalImpactParam's
     per-frame bisection) through every later reality switch. Call BEFORE the
     generic Object3D teardown — dispose() removes the window listener and
     frees the GPU resources; disposeObject3D still owns the group's meshes.
     Idempotent: a visual already released is neither disposed twice into the
     registry nor spliced twice. */
  releaseBlackHolesUnder(root: THREE.Object3D): void {
    const released: BlackHoleVisual[] = [];
    root.traverse((o) => {
      const bh = o.userData?.bh as BlackHoleVisual | undefined;
      if (bh) released.push(bh);
    });
    for (const visual of released) {
      visual.dispose();
      const i = this.blackHoles.indexOf(visual);
      if (i >= 0) this.blackHoles.splice(i, 1);
    }
  }

  /* One switch for every hole: the geodesic marcher renders it, or the hole
     hides itself (frame-budget breaker, shader failure, quality tier,
     Studio switch). Round 55 — nothing stands in for it anymore. */
  private setAllGeodesic(on: boolean): void {
    for (const visual of this.blackHoles) visual.setGeodesic(on);
  }

  /** R97 — the shell's wiring (quality tier, tier override, shader errors)
      reaches the switch through this public verb; the pinned breaker verb
      above stays module-private exactly as round17 found it. */
  setGeodesicAll(on: boolean): void {
    this.setAllGeodesic(on);
  }

  /* Round 20 — frame-budget guard for the geodesic tier. On by default now,
     so instead of a quality toggle the safety net is automatic. ROUND 53 —
     the breaker is RECOVERABLE: exceeding the budget stands the tier down
     for the current visit (the hole hides itself), and flying away from
     the hole re-arms it for the next approach — up to three stand-downs per
     session, then permanent, exactly like the old one-way breaker. The old
     design blamed one slow stretch forever: on the reference iGPU a single
     heavy minute at close focus cost the lensed look for the rest of the
     session, with no signal and no way back. The 'on' override in
     blackholeTier skips the breaker entirely. */
  guardRaymarch(dt: number): void {
    if (this.raymarchDisabled || this.blackHoles.length === 0) return;
    const override = getRaymarchOverride();
    if (override === 'off') return;
    if (override === 'on') return; /* forced: the breaker never stands it down */
    /* Round 20.1 — portal dives (vault entry, reality work) have their own
       heavy frame moments; they must never be blamed on the geodesic tier
       and stand it down permanently */
    if (this.portal.phase !== 'idle') { this._rmGuardFrames = 0; this._rmGuardAccum = 0; return; }

    /* ROUND 61 — the boot grace. The breaker's 3 s sampling window used to
       include the app's very first seconds, when shader compilation and
       desktop start-up stall frames for reasons that have nothing to do
       with the hole — a cold boot could silently stand the geodesic tier
       down before the user ever saw it (with Round 55's fallbacks deleted,
       a stood-down hole renders NOTHING: the "the black hole vanished
       overnight" report). The meter now starts on the first frame after
       the boot finalize, and portal-style reset happens during the intro. */
    if (this.bootIntro) { this._rmGuardFrames = 0; this._rmGuardAccum = 0; return; }

    if (!this.raymarchStoodDown) {
      if (!this.raymarchOnStage()) { this._rmGuardFrames = 0; this._rmGuardAccum = 0; return; }
      this._rmGuardAccum += dt;
      this._rmGuardFrames++;
      if (this._rmGuardFrames < 180) return;
      const avg = this._rmGuardAccum / this._rmGuardFrames;
      this._rmGuardFrames = 0;
      this._rmGuardAccum = 0;
      if (avg > 0.055) {
        this.raymarchFlaps++;
        if (this.raymarchFlaps >= 3) {
          console.warn('[universe] geodesic black hole exceeded the frame budget three times — the hole hides itself for this session');
          this.raymarchDisabled = true;
          this.setAllGeodesic(false);
          setRaymarchStatus('fallback', 'frame-budget-3-strikes');
        } else {
          console.warn(`[universe] geodesic black hole exceeded the frame budget — standing down for this visit (fly away and return to retry; ${3 - this.raymarchFlaps} retries left)`);
          this.raymarchStoodDown = true;
          this.setAllGeodesic(false);
          setRaymarchStatus('fallback', 'frame-budget');
        }
      }
      return;
    }

    /* stood down: wait until the camera is well clear of the hole (~5 s),
       then give the tier a fresh chance on the next approach */
    if (!this.raymarchOnStage(true)) {
      this._rmAwayFrames++;
      if (this._rmAwayFrames > 300) {
        this._rmAwayFrames = 0;
        this.raymarchStoodDown = false;
        this.setAllGeodesic(true);
        setRaymarchStatus(getRaymarchOverride() === 'on' ? 'forced' : 'active', 're-armed');
      }
    } else {
      this._rmAwayFrames = 0;
    }
  }

  /** Worth remembering? A view is checkpointed only when the traveler is
      resting in the web stage — never mid-traversal, never mid-boot, never
      while a portal owns the camera. */
  checkpointCameraView(dt: number): void {
    const quiescent = !this.bootIntro && this.kamuiTimer <= 0 && this.portal.phase === 'idle'
      && this.galaxyDive === null && this.cosmicStage === 'web';
    if (!quiescent) {
      this._camMemTimer = 0;
      return;
    }
    this._camMemTimer += dt;
    if (this._camMemTimer < 5) return;
    this._camMemTimer = 0;
    const snap = this.rig.snapshot();
    /* ROUND 62 — the memory carries the FULL placement (current + target
       channels) and WHAT the view orbits: a target-only record eases in
       from the rig's constructor default (a huge distance) and the focus
       auto-release (dist > 1200) drops the subject before the camera
       arrives — the "the hole is nowhere" bug. */
    const next: Omit<CameraMemory, 'savedAt'> = {
      zoomT: snap.zoomT, tZoomT: snap.tZoomT,
      theta: snap.theta, tTheta: snap.tTheta,
      phi: snap.phi, tPhi: snap.tPhi,
      pan: snap.pan,
      focusId: this.focusId,
    };
    const last = this._camMemLast;
    if (last && Math.abs(last.zoomT - next.zoomT) < 1e-5 && Math.abs(last.theta - next.theta) < 1e-5 && Math.abs(last.phi - next.phi) < 1e-5) {
      return; /* unchanged since the last write — skip the localStorage churn */
    }
    this._camMemLast = next;
    setCameraMemory(next);
  }

  /* ROUND 56b — adaptive resolution: while a hole is on stage the composer
     may drop its pixel ratio and restore when you fly away. Applied in 0.1
     steps — every apply reallocates the render targets, so we never churn
     per frame.
     ROUND 64 — THE TIGHTENING: at base ratio ≤ 1 (every standard display)
     there is NO drop at all — the blocky 0.5×/0.8× disk was the leak that
     helped force the old renderer's deletion, and the source itself renders
     full res. Only HiDPI (base > 1) eases, and never below 0.7 of base. The
     55 ms frame-budget breaker (180-frame window) remains the safety net. */
  applyAdaptiveResolution(holeOnStage: boolean, dt: number): void {
    const target = holeOnStage && this.pixelRatioBase > 1
      ? Math.max(this.pixelRatioBase * 0.7, 1)
      : this.pixelRatioBase;
    this.holePixelRatioDamp += (target - this.holePixelRatioDamp) * Math.min(1, dt * 4);
    if (Math.abs(this.holePixelRatioDamp - this.pixelRatioApplied) >= 0.1) {
      this.pixelRatioApplied = this.holePixelRatioDamp;
      const r = Math.max(0.5, Math.round(this.pixelRatioApplied * 10) / 10);
      this.renderer.setPixelRatio(r);
      this.composer.setPixelRatio(r);
    }
  }

  /** True when a geodesic hole is near enough for its march to plausibly
   *  drive frame cost (within ~120 rs — beyond that the quad is tiny).
   *  ignoreVisibility: while stood down the marcher is swapped out but the
   *  camera may still be sitting at the hole — the re-arm watcher needs to
   *  see that position regardless. */
  raymarchOnStage(ignoreVisibility = false): boolean {
    for (const b of this.bodies) {
      if (b.data.kind !== 'hole' && b.data.kind !== 'vault') continue;
      const rm = b.group.userData.bh as BlackHoleVisual | undefined;
      if (!rm || (!ignoreVisibility && !rm.geodesic)) continue;
      /* world position — body groups ride inside orbit pivots, so .position
         alone is local (and reads as origin) */
      b.group.getWorldPosition(this._vScratch1);
      this._vScratch1.sub(this.camera.position);
      if (this._vScratch1.length() < b.data.radius * 0.62 * 120) return true;
    }
    return false;
  }

  /* ROUND 65 — THE BLAZE LEARNS DISTANCE: the on-stage bloom boost was a
     boolean (the full 0.68 the moment any hole was within 120 rs), so wide
     views of the system drowned in the hole's blaze — too much light for
     the user's eyes. The glow now scales continuously with the encounter:
     full reference glory inside ~40 rs of the nearest hole, easing to the
     project's calm baseline by 120 rs. The hole stays a quiet side
     character in the sky until you actually walk up to it — then it
     blazes. */
  holeGlowProximity(): number {
    let proximity = 0;
    for (const b of this.bodies) {
      if (b.data.kind !== 'hole' && b.data.kind !== 'vault') continue;
      const rm = b.group.userData.bh as BlackHoleVisual | undefined;
      if (!rm || !rm.geodesic) continue;
      /* world position — body groups ride inside orbit pivots, so .position
         alone is local (and reads as origin) */
      b.group.getWorldPosition(this._vScratch1);
      this._vScratch1.sub(this.camera.position);
      const rs = this._vScratch1.length() / (b.data.radius * 0.62);
      proximity = Math.max(proximity, 1 - Math.min(1, Math.max(0, (rs - 40) / 80)));
      if (proximity >= 1) break;
    }
    return proximity;
  }
}
