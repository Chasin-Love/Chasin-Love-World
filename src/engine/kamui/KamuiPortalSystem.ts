/* R97 — THE KAMUI/PORTAL SUBSYSTEM. Extracted verbatim from the UniverseEngine
   monolith: the v1 vortex (trigger, per-frame application, vacuum gulp, living
   spin, rumble), the plain-zoom portal machine, the R67 summon hold, the R72
   staged stage-warp, and the resolution helpers. They are ONE machine — the
   beats, the hold and the throat all time against the same clock and the same
   full-screen pass — so they live together. The portalPass ITSELF stays in the
   engine shell (round63 pins the composer chain around its creation); this
   subsystem reaches it through the eng handle. Every engine-owned member is
   reached by name-preserving getters/setters, so the moved bodies read exactly
   as they did inside engine.ts, and the engine shell reads back through its
   own name-preserving getters — no pin moved meaning, no call site re-learned. */
import * as THREE from 'three';
import type { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CameraRig } from '../cameraRig';
import { KAMUI_ENTRY_HOLD, KAMUI_ENTRY_FRAMING, KAMUI_TRIGGER_DURATION, KAMUI_REVERSE_DURATION, KAMUI_VACUUM_WINDOW, KAMUI_BEATS, kamuiBeatEase } from '../systems/kamuiPhases';
import type { CosmicBody } from '../../domain/universe';
import type { RuntimeBody, UniverseEngine } from '../engine';

export class KamuiPortalSystem {
  constructor(private eng: UniverseEngine) {}

  /* ---- the shared runtime (engine-owned; name-preserving access) ---- */
  private get portalPass(): ShaderPass { return this.eng.portalPass; }
  private get clockT(): number { return this.eng.clockT; }
  private get _vScratch4(): THREE.Vector3 { return this.eng._vScratch4; }
  private get camera(): THREE.PerspectiveCamera { return this.eng.camera; }
  private get bodies(): RuntimeBody[] { return this.eng.bodies; }
  private get galaxyStageNodes(): UniverseEngine['galaxyStageNodes'] { return this.eng.galaxyStageNodes; }
  private get demonCoreMat(): THREE.ShaderMaterial | undefined { return this.eng.demonCoreMat; }
  private get rig(): CameraRig { return this.eng.rig; }
  private get cb(): UniverseEngine['cb'] { return this.eng.cb; }
  private get bootIntro(): boolean { return this.eng.bootIntro; }
  private get galaxyDive(): { galaxyId: string; endInner: boolean } | null { return this.eng.galaxyDive; }
  /* written by the moved bodies — getter/setter pairs over the engine fields */
  private get cosmicStage(): 'web' | 'multiverse' { return this.eng.cosmicStage; }
  private set cosmicStage(v: 'web' | 'multiverse') { this.eng.cosmicStage = v; }
  private get focusId(): string | null { return this.eng.focusId; }
  private set focusId(v: string | null) { this.eng.focusId = v; }
  private get realityFocused(): boolean { return this.eng.realityFocused; }
  private set realityFocused(v: boolean) { this.eng.realityFocused = v; }
  private get galaxyFocusId(): string | null { return this.eng.galaxyFocusId; }
  private set galaxyFocusId(v: string | null) { this.eng.galaxyFocusId = v; }
  private get galaxyInnerFocus(): boolean { return this.eng.galaxyInnerFocus; }
  private set galaxyInnerFocus(v: boolean) { this.eng.galaxyInnerFocus = v; }
  private get innerFocusBodyId(): string | null { return this.eng.innerFocusBodyId; }
  private set innerFocusBodyId(v: string | null) { this.eng.innerFocusBodyId = v; }
  private get grabCooldown(): number { return this.eng.grabCooldown; }
  private set grabCooldown(v: number) { this.eng.grabCooldown = v; }
  private get selectedId(): string | null { return this.eng.selectedId; }
  private set selectedId(v: string | null) { this.eng.selectedId = v; }
  private cancelGalaxyDive(): void { return this.eng.cancelGalaxyDive(); }
  private findInnerBody(bodyId: string): { data: CosmicBody; galaxyId: string; galaxyName: string; starName: string } | null {
    return this.eng.findInnerBody(bodyId);
  }

  /* ---- owned state (moved verbatim; the shell reads the first five
          through its own name-preserving getters) ---- */
  kamuiTimer = 0;
  /* the eased vortex envelope (sin peak ×1.15, relaxed each frame) */
  kamuiEase = 0;
  /* the direction spacetime drags — a fixed reference now that the v2
     sightline chase is retired (the surface manager still consumes it) */
  readonly kamuiVortexDir = new THREE.Vector3(0, 1, 0);
  /* THE VACUUM GULP — the tear's final stage: the throat swallows its
     subject (uVac surge + size drain) and the frame rumbles. The swallow
     factor always eases back to exactly 1, so no world stays deformed. */
  private kamuiVacuumActive = false;
  private kamuiSwallowGroup: THREE.Object3D | null = null;
  private kamuiSwallowFactor = 1;
  private kamuiShakeT = 0;
  /* THE THROAT UNWIND (R67) — when the summon's timer expires, uVac no
     longer snaps 1 → 0 in one frame (a hard stutter at the exact instant
     the contents eject). It holds at 1 through the decay window and then
     unwinds with the vortex's own fade, so the swallow relaxes instead of
     cutting. A negative value means "expired, unwinding" and tracks the
     remaining ease — the same clock the glow decays on. */
  private kamuiVacuumTail = -1;
  /* THE SPIN DRIVER — the running maximum of the beat envelopes. It only
     ever grows during a summon, so the swirl never relaxes backward at a
     beat seam (the user's forward-backward-forward jank). */
  private kamuiTwist = 0;
  /* THE LIVING SPIN (R78) — the twist above is a STATIC bend (a running max
     that saturates in the first half-second), so the mature vortex used to
     sit frozen between the tear and the throat. This integrates the vortex's
     own rotation (rad/s, differential in the shader via its falloff), so the
     stabilized vortex keeps visibly swirling inward for the whole summon and
     coasts to a stop with the fading glow. Reset on every trigger. */
  private kamuiSpinPhase = 0;
  portal = {
    phase: 'idle' as 'idle' | 'entering' | 'open' | 'leaving',
    t: 0, fired: false, kind: 'diary' as 'diary' | 'vault', bodyId: '',
  };
  /* Inner-galaxy worlds are synthetic runtime bodies, so their portal target
     must be resolved from the isolated system rather than the home body list. */
  private portalTargetInnerId: string | null = null;
  /* R86 authorial decree: the engine-side reduced-motion probe is DELETED and
     the portal beats will never honor prefers-reduced-motion — the violence
     IS the Kamui. Do not resurrect this field unasked (see §6's law note). */
  private portalWasInner = false;
  /* The dial value the entry zoom lands at / eases back to. */
  private portalEnterDial = 0;
  private portalReturnDial = 0;
  /* The traveler's exact camera + framing at the moment a portal opened.
     leavePortal() cuts straight back to this — closing a diary or the vault
     must never slam the camera to the anchor or sweep it sideways. */
  private portalSavedCam: {
    rig: ReturnType<CameraRig['snapshot']>;
    focusId: string | null;
    galaxyFocusId: string | null;
    galaxyInnerFocus: boolean;
    innerFocusBodyId: string | null;
    realityFocused: boolean;
  } | null = null;
  /* CAMERA STABILITY — the summon hold. Clicking a world fires the vortex and
     the frame then stays ROCK STILL while it breathes; only after
     KAMUI_ENTRY_HOLD does the camera take the body and glide in. Without it
     the dive and the tear raced each other (the camera had already slammed
     into the body by the time the vortex crested) and the instant focus
     yanked the whole sky sideways. */
  private portalHold = 0;
  private portalFocusPending = false;
  private portalPendingFocusId: string | null = null;

  /* KAMUI (v1) — the vortex does not own navigation; the plain-zoom portal
     and the stage thresholds keep doing the travel. The jutsu is pure
     theater: the red space-time tear that accompanies the summon. */
  private kamuiTearBodyId: string | null = null;

  /* THE STAGED STAGE-WARP (R72) — a membrane crossing into the multiverse is
     no longer a same-frame swap. The summon holds the traveler's stage and
     dial while the tear builds, and the throat hands the other stage over
     exactly as the summon expires: the destination materializes through the
     dying vortex, the dial's own glide and the R67 unwind land the stop
     gradually. The eject face keeps its instant burst — its decay IS the
     arrival, so it never stages. Null = no warp in flight. */
  stageWarp: {
    arrivalDial: number;
    flipTo: 'multiverse' | 'web';
    hold: number;
    pinnedDial: number;
    after?: () => void;
  } | null = null;

  /* ---- the tickFrame segments, moved whole (the shell calls these in the
          exact order the monolith ran them) ---- */

  /* KAMUI (v1) — the summon plays as CHOREOGRAPHED BEATS: the rip (the
     original start), then the new middle frames (wind-up, flicker,
     deepening), then the throat (the vacuum gulp). Each beat is its own
     full-speed envelope — the length comes from the sequence, never from
     slowing one motion down. The eject keeps its instant full burst. */
  updateKamuiBeats(dt: number) {
    if (this.kamuiTimer > 0) {
      this.kamuiTimer = Math.max(0, this.kamuiTimer - dt);
      if (this.kamuiTimer === 0 && this.kamuiVacuumActive) {
        this.kamuiVacuumTail = 1; /* R67: the throat UNWINDS with the glow — never a one-frame cut */
      }
      if (this.portalPass.uniforms.uDir.value < 0) {
        /* THE EJECT — a short burst that unwinds. Strength AND spin decay
           together over KAMUI_REVERSE_DURATION, so the warped screen relaxes
           smoothly back to the idle image and the shader's passthrough cut
           at s < 0.001 is never visible (no frozen twist, no sudden drop). */
        const kEase = Math.sin((this.kamuiTimer / KAMUI_REVERSE_DURATION) * Math.PI * 0.5);
        this.kamuiEase = Math.max(this.kamuiEase, kEase * 1.15);
        this.kamuiTwist = kEase; /* the spin unwinds WITH the glow — no frozen tail */
      } else {
        const elapsed = KAMUI_TRIGGER_DURATION - this.kamuiTimer;
        let kEase = 0;
        for (const beat of KAMUI_BEATS) kEase = Math.max(kEase, kamuiBeatEase(elapsed, beat));
        this.kamuiTwist = Math.max(this.kamuiTwist, kEase); /* the spin NEVER unwinds */
        /* the brightness breathes with the beats, but the floor (the twist
           drive) keeps the vortex alive through every seam — no blinking */
        this.kamuiEase = Math.max(this.kamuiEase, kEase * 1.15, this.kamuiTwist * 0.6);
      }
    }
  }

  /* CAMERA STABILITY — the summon hold. For KAMUI_ENTRY_HOLD after the
     click the camera is pinned exactly where the traveler left it and all
     zoom momentum is killed: the red vortex plays against a still frame.
     The moment it expires we hand the body and the arrival dial to the
     rig, so the approach begins as the tear fades — the traveler falls
     through the vortex instead of being dragged past it. */
  updatePortalHold(dt: number) {
    if (this.portalHold > 0) {
      this.portalHold = Math.max(0, this.portalHold - dt);
      this.rig.setZoomTarget(this.portalReturnDial);
      this.rig.killZoomMomentum();
      if (this.portalHold === 0) {
        if (this.portalFocusPending) {
          this.focusId = this.portalPendingFocusId;
          this.portalFocusPending = false;
          this.portalPendingFocusId = null;
        }
        this.rig.setZoomTarget(this.portalEnterDial);
        /* THE THROAT HANDS OFF (R67) — the hold expires EXACTLY as the
           summon's last beat completes: the tunnel is finished, so what
           lives inside the subject ejects NOW, through the dying vortex —
           the diary/vault materializes while the tear is still spinning
           and collapsing, never after a silent dive. The dive becomes the
           arrival settle behind the overlay; the zoom-arrival branch below
           stays as the safety net (phase is already 'open', so it no-ops). */
        if (this.portal.phase === 'entering' && !this.portal.fired) {
          this.portal.fired = true;
          this.portal.phase = 'open';
          this.cb.onPortalPeak(this.portal.kind, this.portal.bodyId);
        }
      }
    }
  }

  /* THE STAGED STAGE-WARP (R72) — the summon's hold. The traveler's stage
     and dial stay exactly where they were while the tear builds (the rig
     is re-pinned every frame, all zoom momentum killed). The moment the
     hold expires — the same frame the summon's throat completes — the
     stage hands over: the multiverse materializes through the dying
     vortex, the dial is released to the arrival framing, and the R67
     unwind riding the glow + the rig's own exponential damp land the stop
     gradually instead of in one frame. */
  updateStageWarp(dt: number) {
    if (this.stageWarp) {
      const warp = this.stageWarp;
      if (warp.hold > 0) {
        warp.hold = Math.max(0, warp.hold - dt);
        this.rig.setZoomTarget(warp.pinnedDial);
        this.rig.killZoomMomentum();
      }
      if (warp.hold === 0) {
        /* THE THROAT HANDS THE STAGE OVER (R72) — the mirror of the portal's
           own handoff: the destination arrives THROUGH the vortex, never
           behind a finished one. */
        this.cosmicStage = warp.flipTo;
        this.rig.setZoomTarget(warp.arrivalDial);
        this.stageWarp = null;
        if (warp.after) warp.after();
      }
    }
  }

  /* The portal — a plain camera zoom. Clicking a world dives the camera
     in toward it; when the zoom lands the destination overlay opens.
     Closing eases the camera back out to the pre-open framing. */
  updatePortalPhases(dt: number) {
    if (this.portal.phase === 'entering' || this.portal.phase === 'leaving') {
      this.portal.t += dt;
    }
    if (this.portal.phase === 'entering') {
      const arrived = Math.abs(this.rig.tZoomT - this.portalEnterDial) < 0.004
        && Math.abs(this.rig.zoomT - this.portalEnterDial) < 0.004;
      if (!this.portal.fired && (arrived || this.portal.t > 6)) {
        this.portal.fired = true;
        this.portal.phase = 'open';
        this.cb.onPortalPeak(this.portal.kind, this.portal.bodyId);
      }
    } else if (this.portal.phase === 'leaving') {
      const settled = Math.abs(this.rig.tZoomT - this.portalReturnDial) < 0.004
        && Math.abs(this.rig.zoomT - this.portalReturnDial) < 0.004;
      if (settled || this.portal.t > 6) {
        const returningInner = this.portalWasInner || Boolean(this.portalTargetInnerId);
        this.portal.phase = 'idle';
        this.portalTargetInnerId = null;
        this.portalWasInner = false;
        this.portalSavedCam = null;
        if (returningInner) this.cb.onSelectInnerWorld?.(null);
        this.kamuiTearBodyId = null;
        this.cb.onPortalDone();
      }
    }
  }

  /* ---- the stage warp trigger ---- */

  /* THE STAGED STAGE-WARP (R72) — a membrane crossing into the multiverse
     holds the traveler's own stage on screen and pins the dial for the whole
     choreography; the handoff lives in tick, the frame the summon's throat
     completes. An eject (back to the web) bursts at full strength and hands
     over instantly — its own 1.9s decay already IS the gradual stop, so it is
     left untouched. A warp that is already playing (or any live vortex /
     portal) refuses a new one — the old same-frame path would re-fire the
     tear mid-tear. */
  beginStageWarp(dir: 'toMultiverse' | 'toWeb', arrivalDial: number, _after?: () => void): void {
    if (this.stageWarp || this.kamuiTimer > 0 || this.portal.phase !== 'idle' || this.bootIntro) return;
    this.grabCooldown = 1.4;
    this.rig.killZoomMomentum();
    this.triggerKamui(undefined, dir === 'toWeb'); /* out = summon, back = eject */
    if (dir === 'toWeb') {
      /* THE EJECT — the full burst on frame one masks the swap; the decay
         carries the traveler the rest of the way in. */
      this.cosmicStage = 'web';
      this.realityFocused = false;
      this.rig.setZoomTarget(arrivalDial);
      if (_after) _after();
      return;
    }
    /* THE SUMMON — the web stays on stage, the dial stays exactly where the
       traveler left it, and the tear builds against a still frame. */
    const pinnedDial = this.rig.tZoomT;
    this.stageWarp = { arrivalDial, flipTo: 'multiverse', hold: KAMUI_ENTRY_HOLD, pinnedDial, after: _after };
    this.rig.setZoomTarget(pinnedDial);
  }

  /* ---- the portal machine ---- */

  beginPortal(b: { data: CosmicBody }) {
    if (this.portal.phase !== 'idle' || this.kamuiTimer > 0) return;

    const innerTarget = this.findInnerBody(b.data.id);
    this.portalTargetInnerId = innerTarget ? b.data.id : null;
    /* Snapshot the traveler's exact camera and framing BEFORE the zoom-in.
       On close, leavePortal() eases the dial straight back to this framing. */
    this.portalSavedCam = {
      rig: this.rig.snapshot(),
      focusId: this.focusId,
      galaxyFocusId: this.galaxyFocusId,
      galaxyInnerFocus: this.galaxyInnerFocus,
      innerFocusBodyId: this.innerFocusBodyId,
      realityFocused: this.realityFocused,
    };
    this.cosmicStage = 'web';
    this.portalWasInner = Boolean(innerTarget);
    this.portal = {
      phase: 'entering', t: 0, fired: false,
      kind: b.data.kind === 'vault' ? 'vault' : 'diary', bodyId: b.data.id,
    };
    /* any galaxy dive still driving the dial would keep steering the camera
       underneath the traversal — cancel it here. The inner-focus flag is
       view state the traveler already earned — the cancel must not strip it
       (an inner-world portal keeps orbiting that world). */
    const keepInnerFocus = this.galaxyInnerFocus;
    this.cancelGalaxyDive();
    this.galaxyInnerFocus = keepInnerFocus;
    this.rig.killZoomMomentum();
    this.grabCooldown = 0.8;
    /* THE PLAIN ZOOM — the camera dives in toward the world (the focus keeps
       it centered); the diary or vault opens when the zoom lands.

       CAMERA STABILITY — the focus change and the dive are WITHHELD for the
       length of the summon (portalHold, resolved in tick): the vortex plays
       against a frame that has not moved a pixel, and only once it has
       crested does the rig take the body and start the approach. The dial is
       pinned back at the pre-open framing so nothing can drift meanwhile. */
    this.portalFocusPending = true;
    this.portalPendingFocusId = innerTarget ? null : b.data.id;
    this.portalHold = KAMUI_ENTRY_HOLD;
    /* THE ARRIVAL SETTLE (R67) — the overlay fires at the throat now, so
       the dive runs BEHIND the live diary/vault: the rig eases 60% of the
       way and the overlay's entrance owns the last mile. The old full dial
       flew ~2s of empty unseen space after the swallow — the beat the
       traveler read as a processing freeze. */
    const settleDial = CameraRig.zoomTOf(Math.max(0.4, b.data.radius) * KAMUI_ENTRY_FRAMING);
    this.portalEnterDial = settleDial + (this.portalReturnDial - settleDial) * 0.4;
    this.portalReturnDial = this.portalSavedCam.rig.tZoomT;
    this.rig.setZoomTarget(this.portalReturnDial);
    /* KAMUI — fire the v1 vortex: the red tear plays around the Demon Core
       while the frame holds still (portalHold above); the dive then carries
       the traveler in and the overlay contract fires from onPortalPeak. */
    this.kamuiTearBodyId = b.data.id;
    this.triggerKamui();
  }
  leavePortal() {
    if (this.portal.phase === 'idle') return;
    this.portal.phase = 'leaving';
    this.portal.t = 0;
    this.portal.fired = false;
    /* THE RETURN TEAR — closing the diary/vault replays the jutsu mirrored:
       the vortex spins the other way and ejects the traveler back out while
       the camera eases to the pre-open framing (kamuiTearBodyId is still
       live, so the tear stays glued to the world being left). */
    this.triggerKamui(undefined, true);
    /* a close before the hold expired must not leave a dive armed */
    this.portalHold = 0;
    this.portalFocusPending = false;
    this.portalPendingFocusId = null;
    /* ease the camera back out to the traveler's pre-open framing */
    const saved = this.portalSavedCam;
    if (saved) {
      this.focusId = saved.focusId;
      this.galaxyFocusId = saved.galaxyFocusId;
      this.galaxyInnerFocus = saved.galaxyInnerFocus;
      this.innerFocusBodyId = saved.innerFocusBodyId;
      this.realityFocused = saved.realityFocused;
      this.rig.setZoomTarget(saved.rig.tZoomT);
      this.grabCooldown = Math.max(this.grabCooldown, 0.6);
    }
  }
  /* called once the destination overlay appears */
  finishEntry() {
    if (this.portal.phase === 'entering') this.portal.phase = 'open';
  }
  /* public entry used by Core Mode "open world" */
  portalTo(id: string) {
    const b = this.bodies.find((x) => x.data.id === id);
    if (b) {
      this.selectedId = id;
      this.beginPortal(b);
    }
  }

  /* ---- the vortex ---- */

  private resolveKamuiSource(out: THREE.Vector3): boolean {
    if (this.kamuiTearBodyId) {
      const home = this.bodies.find((b) => b.data.id === this.kamuiTearBodyId);
      if (home) { home.group.getWorldPosition(out); return true; }
      for (const node of this.galaxyStageNodes) {
        const inner = node.innerSys?.planets.find((pl) => pl.data.id === this.kamuiTearBodyId);
        if (inner) { inner.group.getWorldPosition(out); return true; }
      }
    }
    if (this.galaxyDive) {
      const diveId = this.galaxyDive.galaxyId;
      const node = this.galaxyStageNodes.find((n) => n.data.id === diveId);
      if (node) { node.group.getWorldPosition(out); return true; }
    }
    return false;
  }

  /** The scene-graph group of the current kamui source (home body, inner
      world, or diving galaxy) — the subject the vacuum gulp drains.
      THE THROAT IS NOT SWALLOWED (R73): the black hole is the door itself —
      draining a hole/vault body's group let the traveler watch Eventide
      shrink to a quarter of itself and vanish whole in the last second
      before the vault opened. Planets and galaxies keep the canon drain. */
  private resolveKamuiGroup(): THREE.Object3D | null {
    if (this.kamuiTearBodyId) {
      const home = this.bodies.find((b) => b.data.id === this.kamuiTearBodyId);
      if (home) {
        if (home.data.kind === 'hole' || home.data.kind === 'vault') return null;
        return home.group;
      }
      for (const node of this.galaxyStageNodes) {
        const inner = node.innerSys?.planets.find((pl) => pl.data.id === this.kamuiTearBodyId);
        if (inner) return inner.group;
      }
    }
    if (this.galaxyDive) {
      const diveId = this.galaxyDive.galaxyId;
      const node = this.galaxyStageNodes.find((n) => n.data.id === diveId);
      if (node) return node.group;
    }
    return null;
  }


  /** The v1 Kamui bends only the SCREEN (portalFrag) — the per-material
      geometry field is retired, but the uniform plumbing stays alive at zero
      so every existing shader keeps compiling. */
  applyKamuiFieldUniforms(material: THREE.ShaderMaterial) {
    const u = material.uniforms;
    if (!u.uGravityCenter) return;
    (u.uGravityCenter.value as THREE.Vector3).set(0, 0, 0);
    u.uGravityRadius.value = 0;
    u.uGravityStrength.value = 0;
    u.uGravityTime.value = this.clockT;
    if (u.uReverse) u.uReverse.value = 1;
  }

  setKamuiLocalCenter(material: THREE.ShaderMaterial, mesh: THREE.Object3D | null | undefined) {
    if (!mesh || !material.uniforms.uGravityLocalCenter) return;
    (material.uniforms.uGravityLocalCenter.value as THREE.Vector3).set(0, 0, 0);
  }

  /** The vacuum gulp's size factor for a group — 1 unless it is the swallow
      target, then the accelerating drain (or its eased restore). Composed
      into every per-frame scale writer, so the drain can never fight them. */
  kamuiSwallowFactorFor(g: THREE.Object3D): number {
    return g === this.kamuiSwallowGroup ? this.kamuiSwallowFactor : 1;
  }

  /** Per-frame application of the v1 vortex: the full-screen pass gets
      the eased strength, the clock, and the reality's own hue; while the
      pulse is live the center re-projects the live kamui source (the clicked
      body or the diving galaxy), so the tear stays glued to its subject —
      when nothing resolves it keeps the center the trigger chose. */
  applyKamuiFrame(dt: number) {
    const pu = this.portalPass?.uniforms;
    if (!pu) return;
    this.kamuiEase *= Math.max(0, 1 - dt * 6); /* relax toward the envelope */
    pu.uTime.value = this.clockT;
    pu.uStrength.value = this.kamuiEase;
    /* the middle beats' channels — the wind-up and the flicker belong to the
       forward summon only; the eject and idle stay clean */
    const forwardSummon = pu.uDir.value > 0 && this.kamuiTimer > 0;
    const beatElapsed = KAMUI_TRIGGER_DURATION - this.kamuiTimer;
    pu.uTwist.value = this.kamuiTwist;
    pu.uWind.value = forwardSummon
      ? THREE.MathUtils.smoothstep(beatElapsed, 0.35, 2.55) /* winds up once and STAYS — no unwind */
      : 0;
    pu.uPulse.value = forwardSummon && beatElapsed >= 1.75 && beatElapsed <= 2.75
      ? Math.abs(Math.sin(((beatElapsed - 1.75) / 1.0) * Math.PI * 2))
      : 0;
    if (this.kamuiTimer > 0 && this.resolveKamuiSource(this._vScratch4)) {
      this._vScratch4.project(this.camera);
      if (this._vScratch4.z < 1) pu.uCenter.value.set(this._vScratch4.x * 0.5 + 0.5, this._vScratch4.y * 0.5 + 0.5);
      else pu.uCenter.value.set(0.5, 0.5);
    }
    /* uColor belongs to the trigger (the demonic #ff1744) — it is NOT driven
       per frame, so the red owns the whole pulse (v1 behavior). */
    if (this.demonCoreMat?.uniforms?.uTearStrength) {
      this.demonCoreMat.uniforms.uTearStrength.value = this.kamuiEase * 0.9;
    }

    /* THE VACUUM GULP — the tear's final stage: in the last
       KAMUI_VACUUM_WINDOW of a forward summon the throat completes. The
       shader's pull, spin and void surge with rising acceleration (uVac),
       the subject's own size drains, and the frame rumbles — the universe
       briefly unstable at the instant the tunnel finishes. The swallow
       factor then eases back to exactly 1, so nothing stays deformed. */
    const inVacuum = this.kamuiTimer > 0 && this.kamuiTimer <= KAMUI_VACUUM_WINDOW
      && pu.uDir.value > 0 && this.portal.phase !== 'leaving';
    if (inVacuum && !this.kamuiVacuumActive) {
      this.kamuiVacuumActive = true;
      this.kamuiShakeT = 1;
      this.kamuiSwallowGroup = this.resolveKamuiGroup();
      this.kamuiSwallowFactor = 1;
    }
    if (!inVacuum) this.kamuiVacuumActive = false;
    if (this.kamuiVacuumActive) {
      const t = 1 - Math.min(1, Math.max(0, this.kamuiTimer / KAMUI_VACUUM_WINDOW));
      pu.uVac.value = t;
      this.kamuiSwallowFactor = 1 - 0.94 * t * t * t; /* accelerating drain */
      this.kamuiVacuumTail = -1; /* the live swallow owns the uniform */
    } else if (pu.uDir.value > 0 && this.kamuiVacuumTail >= 0) {
      /* the timer just expired at full throat — unwind uVac with the same
         decay the glow is already riding (no single-frame cut) */
      this.kamuiVacuumTail = Math.max(0, this.kamuiVacuumTail - dt);
      pu.uVac.value = this.kamuiVacuumTail;
      this.kamuiSwallowFactor += (1 - this.kamuiSwallowFactor) * Math.min(1, dt * 9);
      if (Math.abs(1 - this.kamuiSwallowFactor) < 0.002) {
        this.kamuiSwallowFactor = 1;
        this.kamuiSwallowGroup = null;
      }
    } else {
      pu.uVac.value = 0;
      if (this.kamuiSwallowGroup) {
        this.kamuiSwallowFactor += (1 - this.kamuiSwallowFactor) * Math.min(1, dt * 9);
        if (Math.abs(1 - this.kamuiSwallowFactor) < 0.002) {
          this.kamuiSwallowFactor = 1;
          this.kamuiSwallowGroup = null;
        }
      }
    }
    /* THE LIVING SPIN (R78) — the vortex rotates for as long as it is
       visible: the rate rides the eased strength (the beats breathe it) and
       surges with the gulp, the shader's falloff makes it differential (the
       inner band winds visibly faster), and the fade coasts the swirl to a
       stop — never a frozen still, never a cut. The shader signs it with
       uDir, so the eject spins the other way. */
    if (this.kamuiEase > 0.002) {
      this.kamuiSpinPhase += dt * (1.5 * Math.min(1, this.kamuiEase / 1.15) + 1.6 * pu.uVac.value);
    }
    pu.uSpin.value = this.kamuiSpinPhase;
    /* the instability — a decaying rumble on the camera itself (applied
       after the rig's own write, so the shake rides the final transform) */
    if (this.kamuiShakeT > 0) {
      this.kamuiShakeT = Math.max(0, this.kamuiShakeT - dt / 0.8);
      const amp = this.rig.dist() * 0.006 * this.kamuiShakeT * this.kamuiShakeT;
      this.camera.position.x += (Math.random() - 0.5) * 2 * amp;
      this.camera.position.y += (Math.random() - 0.5) * 2 * amp;
      this.camera.position.z += (Math.random() - 0.5) * 2 * amp;
    }
  }

  /** KAMUI (v1) — Space-Time Vortex Distortion: the red demonic vortex tears
      the screen around the current kamui source — the clicked body's center,
      the diving galaxy's disc, or the view center for stage warps and jumps.
      `reverse` spins the same vortex the other way and ejects space outward
      instead of imploding — the close/return face of the jutsu. */
  triggerKamui(targetUv?: THREE.Vector2, reverse = false) {
    this.portalPass.uniforms.uDir.value = reverse ? -1 : 1;
    this.kamuiTwist = reverse ? 1 : 0; /* the eject bursts at full twist */
    this.kamuiSpinPhase = 0; /* a fresh tear spins up from rest */
    this.kamuiVacuumTail = -1; /* a fresh tear owns the throat — no stale unwind */
    if (reverse) this.kamuiShakeT = 1; /* the eject burst shocks the frame */
    if (targetUv) {
      (this.portalPass.uniforms.uCenter.value as THREE.Vector2).copy(targetUv);
    } else if (this.resolveKamuiSource(this._vScratch4)) {
      this._vScratch4.project(this.camera);
      if (this._vScratch4.z < 1) {
        (this.portalPass.uniforms.uCenter.value as THREE.Vector2).set(this._vScratch4.x * 0.5 + 0.5, this._vScratch4.y * 0.5 + 0.5);
      } else {
        (this.portalPass.uniforms.uCenter.value as THREE.Vector2).set(0.5, 0.5);
      }
    } else {
      (this.portalPass.uniforms.uCenter.value as THREE.Vector2).set(0.5, 0.5);
    }
    (this.portalPass.uniforms.uColor.value as THREE.Color).set('#ff1744');
    this.kamuiTimer = reverse ? KAMUI_REVERSE_DURATION : KAMUI_TRIGGER_DURATION;
    /* the DOM swallow needs the tear's screen position — the CSS kamui-suck
       collapses toward this exact point (GL y-up flipped to CSS y-down) */
    const uv = this.portalPass.uniforms.uCenter.value as THREE.Vector2;
    this.cb.onKamuiTrigger?.(reverse, { x: uv.x, y: 1 - uv.y });
  }
}
