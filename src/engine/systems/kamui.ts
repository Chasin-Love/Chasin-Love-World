/**
 * KAMUI — Dimensional Traversal Engine · the director
 *
 * One owner for the whole teleportation sequence. A Kamui is the bridge
 * between two places that either lie an impossible distance apart or are
 * fully isolated from each other (no scroll, no flight — only the jutsu
 * connects them). The grammar (see docs/KAMUI-RESEARCH.md):
 *
 *   ARM → PULL → VORTEX → COLLAPSE → THROAT → EJECT → SETTLE
 *
 * - PULL/VORTEX: a highly compressed gravitational field activates at the
 *   source and attracts everything nearby — the reality surface bends
 *   around it (frame dragging), point clouds are swept in nearest-first
 *   (tidal spaghettification), and bodies inside the field region are
 *   drawn toward the center with a tidal shear.
 * - COLLAPSE/THROAT: the swirl compresses to a singularity and the aperture
 *   opens — a Morris–Thorne throat, which physically REQUIRES exotic energy
 *   (null-energy-condition violation), so it wears the signature ramp:
 *   violet → magenta → orange → gold → white-hot.
 * - EJECT: a white hole — the time-reversal of the entrance — expels the
 *   traveler at the destination while it resolves behind the burst.
 *
 * The director is deliberately three.js-light on policy: it owns the phase
 * machine, the driven VALUES (erase, field strength, envelopes), the
 * camera-riding tunnel and the throat quad. The engine applies the values
 * to its materials and keeps all stage/focus/overlay state.
 */
import * as THREE from 'three';
import {
  KAMUI_PHASE_WEIGHTS, KAMUI_RAMP,
  kamuiBeatDurations, type KamuiPhase, type KamuiProfile,
} from './kamuiPhases';

/** Reverse traversal — the jutsu replays backward: re-form → eject → settle. */
const REVERSE_QUEUE: { phase: KamuiPhase; duration: number }[] = [
  { phase: 'vortex', duration: 0.55 },
  { phase: 'eject', duration: 0.7 },
  { phase: 'settle', duration: 0.45 },
];

export interface KamuiFireSpec {
  profile: KamuiProfile;
  /** world-space point the tear opens at (the engine may keep updating this
      for moving targets — the director reads it live each frame) */
  source: THREE.Vector3;
  /** reverse traversal: the swirl unwinds the opposite way and expels */
  reverse?: boolean;
  /** scripted camera ride (warp profiles): dial at fire time → dial on arrival */
  fromDial?: number;
  toDial?: number;
  /** world radius of the target body / galaxy (sizes the field + throat) */
  targetRadius?: number;
  /** called once at mid-throat — the hidden stage/reality swap */
  onSwap?: () => void;
  /** called once as the white-hole eject peaks — the destination reveal */
  onArrive?: () => void;
}

export interface KamuiUpdateCtx {
  dt: number;
  clockT: number;
  camera: THREE.PerspectiveCamera;
  /** the director drives the dial itself during warp profiles */
  setZoomTarget?: (z: number) => void;
  killZoomMomentum?: () => void;
}

const RAMP = KAMUI_RAMP.map((c) => new THREE.Color(c));
const damp = (cur: number, target: number, lambda: number, dt: number) =>
  cur + (target - cur) * (1 - Math.min(1, Math.exp(-lambda * dt)));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Surface-tear target per phase (the damped value that becomes uKamuiErase). */
const ERASE_TARGET: Record<KamuiPhase, number> = {
  idle: 0, arm: 0.12, pull: 0.55, vortex: 0.95, collapse: 1, throat: 1, eject: 0.4, settle: 0,
};
/** Body-field target per phase (planet deformation + attraction strength). */
const FIELD_TARGET: Record<KamuiPhase, number> = {
  idle: 0, arm: 0.25, pull: 0.7, vortex: 1, collapse: 1, throat: 0.65, eject: 0.3, settle: 0,
};
const FIELD_TARGET_REVERSE: Record<KamuiPhase, number> = {
  idle: 0, arm: 0, pull: 0, vortex: 0.92, collapse: 0, throat: 0, eject: 0.2, settle: 0,
};

export class KamuiDirector {
  phase: KamuiPhase = 'idle';
  profile: KamuiProfile = 'portal';

  /* ---- driven values — the engine reads these every frame ---- */
  /** 0..1 surface tear — drives uKamuiErase on the backdrop, sky, photo dome
      and multiverse boundary */
  erase = 0;
  /** 0..1 cinematic FOV envelope */
  warpFx = 0;
  /** 0..1 body-field strength — planet deformation + attraction of nearby
      bodies (additive, visual-only) */
  fieldStrength = 0;
  /** +1 = suction (forward), −1 = reverse traversal (expulsion) */
  reverse = 1;
  /** 0..1 throat-aperture progress (the quad + the ramp mix) */
  throatK = 0;
  /** 0 = the reality's own palette · 1 = the signature ramp (throat/eject) */
  rampMix = 0;
  /** live source point (the engine may re-copy a moving target's position) */
  readonly source = new THREE.Vector3();
  /** the direction spacetime drags around (camera sightline through the tear) */
  readonly vortexDir = new THREE.Vector3(0, 0, -1);
  /** world radius of the body attraction field (0 = no per-body field) */
  fieldRadius = 0;
  /** world radius of the point-cloud suction wave */
  vortexRadius = 0;

  /* ---- palette (hybrid identity) ---- */
  private paletteA = new THREE.Color('#38bdf8');
  private paletteB = new THREE.Color('#8b5cf6');
  /** the two live colors — reality palette pulled toward the ramp as the
      throat opens; the engine feeds these to every kamui material */
  readonly colorA = new THREE.Color();
  readonly colorB = new THREE.Color();

  private spec: KamuiFireSpec | null = null;
  private queue: { phase: KamuiPhase; duration: number }[] = [];
  private beatT = 0;
  private elapsed = 0;
  private total = 1;
  private swapFired = false;
  private arriveFired = false;
  private clockT = 0;
  private disposed = false;

  /* ---- stage objects ---- */
  private tunnel!: THREE.Group;
  private tunnelMats: THREE.ShaderMaterial[] = [];
  private throatQuad!: THREE.Mesh;
  private throatMat!: THREE.ShaderMaterial;

  get active(): boolean {
    return this.phase !== 'idle';
  }

  /** Build the camera-riding tunnel and the throat quad. Call once. */
  attach(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const mkLayer = (radius: number, len: number, phase: number): THREE.Mesh => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uSpin: { value: 0 }, uOpacity: { value: 0 }, uPhase: { value: phase },
          uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() },
        },
        vertexShader: `
          varying vec2 vUv; varying float vW;
          uniform float uTime;
          void main(){
            vUv = uv;
            vec3 p = position;
            /* unstable — the wall radius breathes and shakes */
            float w = sin(uv.x * 18.849 + uTime * 7.0) * 0.5 + sin(uv.y * 40.0 - uTime * 11.0) * 0.5;
            p.xy *= 1.0 + w * 0.09;
            vW = w;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: `
          varying vec2 vUv; varying float vW;
          uniform float uTime; uniform float uSpin; uniform float uOpacity; uniform float uPhase;
          uniform vec3 uColorA; uniform vec3 uColorB;
          void main(){
            /* high-torque swirling bands streaming down the throat */
            float bands = 0.5 + 0.5 * sin((vUv.x * 16.0 + uSpin * 1.4 + uPhase + vW * 1.6) * 6.2831);
            float flow  = 0.5 + 0.5 * sin((vUv.y * 36.0 - uTime * 16.0 + vUv.x * 10.0) * 6.2831);
            vec3 col = mix(uColorA, uColorB, 0.35 + 0.4 * bands);
            col += vec3(1.0, 0.97, 0.9) * pow(bands, 3.0) * 0.9;
            float ends = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
            float a = (0.30 + bands * 0.38 + flow * 0.16) * uOpacity * ends;
            gl_FragColor = vec4(col * (0.75 + flow * 0.7), a);
          }`,
        transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 64, 20, true), mat);
      mesh.rotation.x = Math.PI / 2; /* length runs along the view axis */
      return mesh;
    };

    this.tunnel = new THREE.Group();
    const outer = mkLayer(300000, 3200000, 0);
    const inner = mkLayer(252000, 3200000, 0.5);
    this.tunnelMats.push(outer.material as THREE.ShaderMaterial, inner.material as THREE.ShaderMaterial);
    this.tunnel.add(outer, inner);
    this.tunnel.visible = false;
    camera.add(this.tunnel);

    /* the throat quad — a ragged event horizon with a frame-dragged
       accretion disc that crossovers into the white-hole exit (salvaged
       grammar, worn in the signature ramp) */
    this.throatMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uIntensity: { value: 0 },
        uColorA: { value: new THREE.Color() },
        uColorB: { value: new THREE.Color() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime; uniform float uProgress; uniform float uIntensity;
        uniform vec3 uColorA; uniform vec3 uColorB;
        void main(){
          vec2 q = vUv * 2.0 - 1.0;
          float r = length(q);
          float a = atan(q.y, q.x);
          float p = clamp(uProgress, 0.0, 1.0);
          float spin = uTime * (4.5 + 13.0 * p);
          /* The source tears open first; the destination white hole takes over
             after the camera has crossed the darkest part of the fold. */
          float whiteHole = smoothstep(0.57, 0.78, p);
          float source = 1.0 - whiteHole;
          float turbulence = sin(a * 8.0 - spin * 1.7 + r * 26.0)
            + 0.55 * sin(a * 15.0 + spin * 0.9 - r * 43.0)
            + 0.22 * sin(a * 23.0 + spin * 2.7 + r * 71.0);

          /* A ragged event horizon and a flattened, frame-dragged accretion
             disc make this a gravitational surface rupture rather than a flat
             circular portal. */
          float horizonR = mix(0.12, 0.65, p) + turbulence * 0.022 * (0.35 + p * 0.65);
          float horizonRim = exp(-abs(r - horizonR) * (78.0 + p * 48.0));
          float diskR = 0.13 + p * 0.24 + sin(a * 3.0 - spin * 0.45) * 0.018;
          float disk = exp(-abs(r - diskR) * 52.0) * (0.45 + 0.55 * sin(a * 5.0 - spin + r * 15.0));
          disk = max(disk, 0.0);
          float lensRingA = exp(-abs(r - (0.17 + p * 0.23)) * 48.0);
          float lensRingB = exp(-abs(r - (0.30 + p * 0.27)) * 82.0);

          /* Tidal streams stretch along the rotating gravitational field. */
          float stream = pow(max(0.0, sin(a * 7.0 - spin * 1.8 + r * 21.0)), 8.0);
          stream *= smoothstep(0.06, 0.72, r) * (1.0 - smoothstep(0.48, 0.98, r));
          float tearStrands = pow(max(0.0, sin(a * 13.0 + r * 31.0 - spin * 2.4)), 12.0);
          tearStrands *= smoothstep(0.10, 0.66, r) * (1.0 - smoothstep(0.52, 0.96, r));

          vec3 sourceCol = mix(uColorA, uColorB, 0.5 + 0.5 * sin(a * 2.0 + spin * 0.2));
          sourceCol += vec3(0.76, 0.93, 1.0) * (horizonRim * 1.45 + lensRingA * 0.62);
          sourceCol += vec3(1.0, 0.68, 0.28) * (disk * 1.25 + tearStrands * 0.9);
          sourceCol += vec3(0.5, 0.8, 1.0) * (stream * 0.72 + lensRingB * 0.38);

          /* The exit is a white-hole burst: a hot photon ring, radial jets,
             and matter being expelled instead of consumed. */
          float exitR = mix(0.06, 0.48, whiteHole) + turbulence * 0.014;
          float exitRim = exp(-abs(r - exitR) * 92.0);
          float exitCore = exp(-r * (10.0 + whiteHole * 16.0)) * whiteHole;
          float jet = pow(max(0.0, cos(a * 2.0 + spin * 0.65)), 18.0);
          jet *= smoothstep(0.04, 0.62, r) * (1.0 - smoothstep(0.48, 0.92, r));
          vec3 exitCol = vec3(1.0, 0.96, 0.82) * (exitCore * 2.3 + exitRim * 1.55);
          exitCol += mix(vec3(0.28, 0.82, 1.0), vec3(1.0, 0.55, 0.18), 0.5 + 0.5 * sin(a + spin * 0.35)) * jet * 1.4;
          exitCol += vec3(0.75, 0.9, 1.0) * (lensRingA * 0.5 + lensRingB * 0.35) * whiteHole;

          vec3 col = sourceCol * source + exitCol * whiteHole;
          float alpha = (horizonRim * 1.55 + disk * 0.8 + stream * 0.78 + tearStrands * 0.7
            + lensRingA * 0.5 + lensRingB * 0.32) * source;
          alpha += (exitRim * 1.65 + exitCore * 1.5 + jet * 0.9) * whiteHole;
          alpha *= uIntensity * smoothstep(0.0, 0.10, p) * (1.0 - smoothstep(0.50, 1.02, r));
          if (alpha < 0.002) discard;
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.throatQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.throatMat);
    this.throatQuad.renderOrder = 30;
    this.throatQuad.visible = false;
    this.throatQuad.frustumCulled = false;
    scene.add(this.throatQuad);
    this.throatQuad.userData.isKamuiThroat = true;
  }

  /** The reality's own palette — the pull wears these colors. */
  setPalette(a: THREE.Color, b: THREE.Color): void {
    this.paletteA.copy(a);
    this.paletteB.copy(b);
  }

  /** Fire a traversal. False if one is already running. */
  fire(spec: KamuiFireSpec, reducedMotion: boolean): boolean {
    if (this.disposed || this.phase !== 'idle') return false;
    this.spec = spec;
    this.profile = spec.profile;
    this.source.copy(spec.source);
    this.reverse = spec.reverse ? -1 : 1;
    this.swapFired = false;
    this.arriveFired = false;
    this.beatT = 0;
    this.elapsed = 0;
    this.fieldRadius = spec.reverse
      ? this.fieldRadius
      : spec.profile === 'warp'
        ? 0
        : Math.max(8, (spec.targetRadius ?? 6) * (spec.profile === 'dive' ? 8 : 3.2));
    this.queue = spec.reverse
      ? REVERSE_QUEUE.map((b) => ({ ...b }))
      : this.buildQueue(spec.profile, reducedMotion);
    this.total = this.queue.reduce((a, b) => a + b.duration, 0);
    this.phase = this.queue[0]?.phase ?? 'settle';
    return true;
  }

  private buildQueue(profile: KamuiProfile, reducedMotion: boolean): { phase: KamuiPhase; duration: number }[] {
    const durations = kamuiBeatDurations(profile, reducedMotion);
    const chain: KamuiPhase[] = ['arm', 'pull', 'vortex', 'collapse', 'throat', 'eject', 'settle'];
    /* kamuiBeatDurations covers the six beats arm→eject; settle rides the
       last entry's tail — build the queue phase-by-phase */
    const beatPhases: KamuiPhase[] = ['arm', 'pull', 'vortex', 'collapse', 'throat', 'eject'];
    const queue = beatPhases.map((phase, i) => ({ phase, duration: durations[i] }));
    queue.push({ phase: 'settle', duration: durations[durations.length - 1] });
    return queue;
  }

  /** Abort a running traversal (guards changed, reality switched, …). */
  cancel(): void {
    if (this.phase === 'idle') return;
    this.spec?.onSwap; /* swap callbacks are fire-once; a cancel skips them */
    this.spec = null;
    this.queue = [];
    this.phase = 'idle';
    this.erase = 0;
    this.warpFx = 0;
    this.fieldStrength = 0;
    this.throatK = 0;
    this.rampMix = 0;
    this.reverse = 1;
    if (this.tunnel) this.tunnel.visible = false;
    if (this.throatQuad) this.throatQuad.visible = false;
  }

  update(ctx: KamuiUpdateCtx): void {
    if (this.disposed) return;
    this.clockT = ctx.clockT;
    const dt = Math.max(0.0005, ctx.dt);

    if (this.phase === 'idle' || this.queue.length === 0) {
      /* relax every value to zero — the field breathes out */
      this.erase = damp(this.erase, 0, 6, dt);
      this.warpFx = damp(this.warpFx, 0, 6, dt);
      this.fieldStrength = damp(this.fieldStrength, 0, 6, dt);
      this.throatK = damp(this.throatK, 0, 8, dt);
      this.rampMix = damp(this.rampMix, 0, 8, dt);
      this.updateStageObjects(ctx, 0);
      return;
    }

    const spec = this.spec;
    const beat = this.queue[0];
    this.beatT += dt;
    this.elapsed += dt;
    const p = Math.min(1, this.beatT / beat.duration);
    const overall = Math.min(1, this.elapsed / Math.max(0.001, this.total));

    /* fire-once hooks */
    if (beat.phase === 'throat' && !this.swapFired && p >= 0.5) {
      this.swapFired = true;
      spec?.onSwap?.();
    }
    if (beat.phase === 'eject' && !this.arriveFired && p >= 0.05) {
      this.arriveFired = true;
      spec?.onArrive?.();
    }

    /* beat advance */
    if (this.beatT >= beat.duration) {
      this.beatT = 0;
      this.queue.shift();
      if (this.queue.length === 0) {
        /* the traversal is over */
        this.phase = 'idle';
        this.spec = null;
        this.reverse = 1;
        if (this.tunnel) this.tunnel.visible = false;
        return;
      }
      this.phase = this.queue[0].phase;
    }

    /* driven values — damped toward the phase targets (the field breathes
       instead of popping) */
    const eraseTarget = ERASE_TARGET[this.phase] ?? 0;
    this.erase = damp(this.erase, eraseTarget, 6, dt);
    const fieldTargets = this.reverse < 0 ? FIELD_TARGET_REVERSE : FIELD_TARGET;
    this.fieldStrength = damp(this.fieldStrength, fieldTargets[this.phase] ?? 0, 6, dt);
    this.warpFx = Math.sin(Math.min(overall, 0.95) / 0.95 * Math.PI);
    this.throatK = this.phase === 'collapse'
      ? Math.max(this.throatK, this.beatT / Math.max(0.001, this.queue[0].duration))
      : this.phase === 'throat'
        ? 1
        : this.phase === 'eject'
          ? Math.max(0, 1 - this.beatT / Math.max(0.001, this.queue[0].duration))
          : damp(this.throatK, 0, 8, dt);
    this.rampMix = Math.min(1, this.throatK * 1.25);

    /* the two live colors — reality palette pulled into the ramp as the
       throat opens (hybrid identity) */
    const rampMid = RAMP[Math.min(3, Math.floor(this.rampMix * 3.999))];
    const rampHot = RAMP[4];
    this.colorA.copy(this.paletteA).lerp(rampMid, this.rampMix);
    this.colorB.copy(this.paletteB).lerp(rampHot, this.rampMix);

    /* sightline — frame dragging sweeps spacetime around the view axis */
    if (this.source.lengthSq() > 1) {
      this.vortexDir.copy(this.source).sub(ctx.camera.position).normalize();
    } else {
      ctx.camera.getWorldDirection(this.vortexDir);
    }

    /* suction radius — nearest-first tidal wave */
    if (this.profile === 'warp') {
      this.vortexRadius = 22000 + overall * 70000;
      this.fieldRadius = 0;
    } else if (this.fieldRadius > 0) {
      this.vortexRadius = this.fieldRadius * (2 + overall * 16);
    } else {
      this.vortexRadius = 0;
    }

    /* scripted camera ride (forward warp profiles own the dial) */
    if (spec && spec.toDial !== undefined && this.reverse > 0 && ctx.setZoomTarget) {
      ctx.killZoomMomentum?.();
      const from = spec.fromDial ?? 0.15;
      const to = spec.toDial;
      /* every warp folds through the same deep beat before ejecting */
      const throatDial = Math.max(0.72, Math.min(from, to));
      if (this.phase === 'arm' || this.phase === 'pull') {
        ctx.setZoomTarget(THREE.MathUtils.lerp(from, throatDial, easeOutCubic(Math.min(1, overall * 2.2))));
      } else if (this.phase === 'vortex' || this.phase === 'collapse' || this.phase === 'throat') {
        ctx.setZoomTarget(THREE.MathUtils.lerp(throatDial, to, easeOutCubic(Math.max(0, (overall - 0.62) / 0.38))));
      } else {
        ctx.setZoomTarget(to);
      }
    }

    this.updateStageObjects(ctx, p);
  }

  /** tunnel + throat quad — camera-facing, driven by the current beat */
  private updateStageObjects(ctx: KamuiUpdateCtx, _p: number): void {
    const t = this.clockT;

    /* THE THROAT — the tunnel rides the camera through the deepest part */
    const inThroatWindow = this.phase === 'collapse' || this.phase === 'throat';
    if (inThroatWindow && this.tunnel) {
      const k = this.phase === 'collapse' ? this.beatT / Math.max(0.001, this.queue[0]?.duration ?? 1) * 0.25 : 0.25 + (this.phase === 'throat' ? this.beatT / Math.max(0.001, this.queue[0]?.duration ?? 1) * 0.4 : 0);
      this.tunnel.visible = true;
      this.tunnel.position.z = THREE.MathUtils.lerp(-1600000, 1600000, Math.min(0.99, k));
      this.tunnel.rotation.z += ctx.dt * (3.5 + k * 6);
      this.tunnelMats.forEach((m) => {
        m.uniforms.uTime.value = t;
        m.uniforms.uSpin.value = this.tunnel.rotation.z;
        m.uniforms.uOpacity.value = Math.sin(Math.min(0.99, k) * Math.PI) * 0.9;
        (m.uniforms.uColorA.value as THREE.Color).copy(this.colorA);
        (m.uniforms.uColorB.value as THREE.Color).copy(this.colorB);
      });
    } else if (this.tunnel && this.tunnel.visible) {
      this.tunnel.visible = false;
    }

    /* THE APERTURE — the ragged tear / white-hole crossover quad */
    if (this.throatQuad && this.throatMat) {
      const show = this.throatK > 0.001 && this.profile !== 'warp';
      this.throatQuad.visible = show;
      if (show) {
        const radius = Math.max(this.fieldRadius, (this.spec?.targetRadius ?? 6) * 2);
        const size = radius * (0.045 + this.throatK * 1.55);
        this.throatQuad.position.copy(this.source);
        this.throatQuad.quaternion.copy(ctx.camera.quaternion);
        this.throatQuad.rotateZ(ctx.dt * (2.0 + this.throatK * 9.0));
        this.throatQuad.scale.set(size * ctx.camera.aspect, size, 1);
        this.throatMat.uniforms.uTime.value = t;
        this.throatMat.uniforms.uProgress.value = this.throatK;
        this.throatMat.uniforms.uIntensity.value = 0.55 + this.throatK * 1.35;
        (this.throatMat.uniforms.uColorA.value as THREE.Color).copy(this.colorA);
        (this.throatMat.uniforms.uColorB.value as THREE.Color).copy(this.colorB);
      }
    }
  }

  dispose(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.disposed = true;
    this.cancel();
    if (this.tunnel) {
      camera.remove(this.tunnel);
      this.tunnel.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (m.material as THREE.Material).dispose();
      });
    }
    if (this.throatQuad) {
      scene.remove(this.throatQuad);
      this.throatQuad.geometry.dispose();
      this.throatMat.dispose();
    }
  }
}

/* the weights import is part of the public contract — re-exported so the
   engine and the gauntlet share one source of truth */
export { KAMUI_PHASE_WEIGHTS };
