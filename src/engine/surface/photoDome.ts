import * as THREE from 'three';
import { LENS_UNIFORMS_GLSL, LENS_WARP_GLSL } from './surfaceShaders';

/** Uniform-object shape shared by every lens-bending material (assigned by
 *  UniverseSurfaceManager, which owns the one true set). */
export interface SharedLensUniforms {
  [key: string]: { value: unknown };
}

/**
 * PhotoDome — the Sky Studio's canvas inside the 3D universe.
 *
 * Renders the active reality's uploaded photo on an inverted sphere that sits
 * BELOW the far star shell but ABOVE the procedural shader cosmos, so the
 * real 3D stars keep twinkling over the picture while the procedural nebulae
 * softly blend underneath it. Every reality owns its own texture; switching
 * realities crossfades the two skies over ~1.2s.
 *
 * The shader mixes: photo ← dim (exposure) ← procedural cosmos color glow,
 * plus radial blur and vignette, all driven by the reality's sky.json
 * settings through the Sky Studio sliders.
 */
export class PhotoDome {
  private group: THREE.Group | null = null;
  private mat: THREE.ShaderMaterial | null = null;
  private textures = new Map<string, THREE.Texture>();
  private realityId: string | null = null;
  private visible = true;

  /* live settings from sky.json */
  private blend = 0.85;
  private dim = 0.45;
  private blur = 0.12;
  private vignette = 0.55;
  private drift = 0.3;

  /* crossfade: fades OUT the previous reality's sky while the new one enters */
  private fadeK = 0;         /* 0..1 — 1 = fully entered a photo sky */
  private prevTexture: THREE.Texture | null = null;
  /* apply sequencing — a superseded texture load (two reality switches in a
     row) must never win: last-CHOSEN sky renders, not last-finished load */
  private applySeq = 0;
  /* Round 18.2 — REALITY-ISOLATION FIX: an in-flight texture load holds the
     crossfade (the old sky keeps the view while the new one loads), but a
     slow, failed, or ABSENT photo must never freeze the old sky on screen
     forever — that was the stuck-background-after-reality-switch bug. The
     hold clears the moment the load lands or fails, and expires after ~4s
     no matter what. */
  private pendingLoad = false;
  private pendingSince = 0;

  /* Round 17.1 — the photo sky bends with the universe, and it bends ONCE:
     the vertex stage passes the RAW dome direction (a bent direction per
     coarse vertex then interpolated again per pixel double-bends the image
     — the angular facet artifact the user caught). The fragment stage runs
     the shared Schwarzschild law per-pixel: crisp capture shadow, perfectly
     circular distortion, zero facets, on every GPU. One lens, one bend. */
  private vert = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vDir;
    void main() {
      vUv = uv;
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private frag = /* glsl */ `
    uniform sampler2D uMap;
    uniform sampler2D uPrevMap;
    uniform float uHasMap;
    uniform float uHasPrev;
    uniform float uFade;
    uniform float uBlend;
    uniform float uDim;
    uniform float uBlur;
    uniform float uVignette;
    uniform float uDrift;
    uniform float uTime;
    uniform vec3 uGlowColor;
    ${LENS_UNIFORMS_GLSL}
    ${LENS_WARP_GLSL}
    varying vec2 vUv;
    varying vec3 vDir;

    /* 9-tap radial blur — cheap softness for the nebula mood */
    vec3 sampleSoft(sampler2D map, vec2 uv, float radius) {
      if (radius <= 0.001) return texture2D(map, uv).rgb;
      vec3 sum = texture2D(map, uv).rgb * 0.28;
      sum += texture2D(map, uv + vec2(radius, 0.0)).rgb * 0.09;
      sum += texture2D(map, uv - vec2(radius, 0.0)).rgb * 0.09;
      sum += texture2D(map, uv + vec2(0.0, radius)).rgb * 0.09;
      sum += texture2D(map, uv - vec2(0.0, radius)).rgb * 0.09;
      sum += texture2D(map, uv + vec2(radius, radius) * 0.7).rgb * 0.09;
      sum += texture2D(map, uv - vec2(radius, radius) * 0.7).rgb * 0.09;
      sum += texture2D(map, uv + vec2(radius, -radius) * 0.7).rgb * 0.09;
      sum += texture2D(map, uv - vec2(radius, -radius) * 0.7).rgb * 0.09;
      return sum;
    }

    void main() {
      /* Round 17 — the lens bends the sampled direction BEFORE it drives the
         UV mapping: the photo itself stretches and pours around the hole
         exactly like the procedural sky underneath it. Inside b_c the
         capture sentinel means NO image exists — the photo is painted as a
         true hole in the sky, matching the procedural dome's shadow. */
      vec3 d = applyLensBend(normalize(vDir));
      if (lensCaptured(d)) {
        gl_FragColor = vec4(vec3(0.0), 0.0);
        return;
      }
      /* EXACT SphereGeometry inverse (three.js: x = −cosφ·sinθ, z = sinφ·sinθ,
         uv = (φ/2π, 1 − θ/π) — note NO +0.5 offset; a hand-rolled convention
         here would rotate and mirror every photo sky under the lens) */
      vec2 lensUv = vec2(
        atan(d.z, -d.x) / 6.2831853,
        1.0 - acos(clamp(d.y, -1.0, 1.0)) / 3.14159265
      );

      /* slow parallax breathing — the sky is alive but never seasick */
      float drift = uDrift * 0.006;
      vec2 uv = lensUv + vec2(
        sin(uTime * 0.05) * drift,
        cos(uTime * 0.037) * drift * 0.6
      );

      vec3 photo = sampleSoft(uMap, uv, uBlur * 0.02);
      vec3 photoDark = photo * (1.0 - uDim * 0.75);

      /* the reality's light breathes through from below — keeps the photo
         native to its reality even when the picture is from elsewhere */
      vec3 cosmos = uGlowColor * (0.16 + 0.05 * sin(uTime * 0.21));
      float cosmosMask = uBlend * 0.35 + 0.65 * (1.0 - uBlend);
      vec3 color = mix(photoDark, photoDark + cosmos * 0.5, cosmosMask * 0.45);

      /* vignette — the edges fall into real space so the dome never shows
         a hard seam at the horizon (lens-space coords keep the vignette
         centered where the lens actually samples) */
      float r = length(lensUv - 0.5) * 1.414;
      float vig = 1.0 - uVignette * smoothstep(0.42, 1.05, r);
      color *= vig;

      /* crossfade from the previous reality's sky while entering */
      float alpha = uHasMap * uBlend * uFade;
      if (uHasPrev > 0.5 && uFade < 0.999) {
        vec3 prev = sampleSoft(uPrevMap, lensUv, uBlur * 0.02) * (1.0 - uDim * 0.75) * vig;
        float prevAlpha = uFade < 0.35 ? (0.35 - uFade) / 0.35 : 0.0;
        color = mix(color, prev, clamp(prevAlpha * 1.6, 0.0, 1.0));
        alpha = max(alpha, prevAlpha * 0.9);
      }

      /* floor: even at blend 0 keep a 6% ghost so the fade never pops */
      alpha = max(alpha, uHasMap * 0.06 * uFade);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  /** Build once — hidden until a reality with a sky becomes active.
   *  `sharedLens` (Round 17) is UniverseSurfaceManager's one true lens uniform
   *  set: referencing its objects (not copies) keeps the photo sky bent in
   *  perfect sync with the procedural cosmos at zero per-frame cost. */
  build(scene: THREE.Scene, sharedLens?: SharedLensUniforms): void {
    if (this.group) return;
    const group = new THREE.Group();
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null as THREE.Texture | null },
        uPrevMap: { value: null as THREE.Texture | null },
        uHasMap: { value: 0 },
        uHasPrev: { value: 0 },
        uFade: { value: 1 },
        uBlend: { value: this.blend },
        uDim: { value: this.dim },
        uBlur: { value: this.blur },
        uVignette: { value: this.vignette },
        uDrift: { value: this.drift },
        uTime: { value: 0 },
        uGlowColor: { value: new THREE.Color('#38bdf8') },
        ...(sharedLens ?? {}),
      },
      vertexShader: this.vert,
      fragmentShader: this.frag,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(300000, 48, 32), this.mat);
    mesh.renderOrder = -99; /* just above the procedural dome (-100), below the stars */
    mesh.frustumCulled = false;
    group.add(mesh);
    group.visible = false;
    scene.add(group);
    this.group = group;
  }

  /** Which reality's sky is active. Changing reality triggers the crossfade. */
  setReality(realityId: string | null): void {
    if (this.realityId === realityId) return;
    const prevTex = this.fadeK > 0.05 ? ((this.mat?.uniforms.uMap.value as THREE.Texture | null) ?? null) : null;
    if (prevTex && this.mat) {
      this.prevTexture = prevTex;
      this.mat.uniforms.uHasPrev.value = 1;
      this.mat.uniforms.uPrevMap.value = prevTex;
    }
    this.realityId = realityId;
    this.fadeK = 0; /* fade the new sky in */
  }

  /** Load a photo texture (cached by url). */
  private async loadTexture(url: string): Promise<THREE.Texture | null> {
    const cached = this.textures.get(url);
    if (cached) return cached;
    try {
      const tex = await new THREE.TextureLoader().loadAsync(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping; /* the drift may push u past 1 */
      this.textures.set(url, tex);
      /* keep the cache human-scale — the oldest skies evict first */
      if (this.textures.size > 12) {
        const oldest = this.textures.keys().next().value as string | undefined;
        if (oldest && oldest !== url) {
          this.textures.get(oldest)?.dispose();
          this.textures.delete(oldest);
        }
      }
      return tex;
    } catch {
      return null;
    }
  }

  /** Push the reality's active photo + settings into the dome. */
  async apply(
    spec: { url: string; blend: number; dim: number; blur: number; vignette: number; drift: number } | null,
    glowColor: string,
  ): Promise<void> {
    if (!this.mat) return;
    const seq = ++this.applySeq;
    this.blend = spec?.blend ?? this.blend;
    this.dim = spec?.dim ?? this.dim;
    this.blur = spec?.blur ?? this.blur;
    this.vignette = spec?.vignette ?? this.vignette;
    this.drift = spec?.drift ?? this.drift;
    (this.mat.uniforms.uGlowColor.value as THREE.Color).set(glowColor);

    let tex: THREE.Texture | null = null;
    if (spec) {
      this.pendingLoad = true;
      this.pendingSince = performance.now();
      tex = await this.loadTexture(spec.url);
    }
    /* a newer apply superseded this one while the texture was loading —
       abandon silently; the newer apply owns the dome (and its pending flag) */
    if (seq !== this.applySeq) return;
    this.pendingLoad = false; /* landed or failed — the fade may proceed */
    const u = this.mat.uniforms;
    u.uMap.value = tex;
    u.uHasMap.value = tex ? 1 : 0;
    u.uBlend.value = this.blend;
    u.uDim.value = this.dim;
    u.uBlur.value = this.blur;
    u.uVignette.value = this.vignette;
    u.uDrift.value = this.drift;
  }

  update(params: { clockT: number; kamuiErase: number; skyVisible: boolean }): void {
    if (!this.group || !this.mat) return;
    const hasMap = this.mat.uniforms.uHasMap.value > 0.5;
    this.group.visible = this.visible && params.skyVisible && (hasMap || this.fadeK < 0.999);
    if (!this.group.visible) return;

    /* Kamui tear swallows the sky too — the photo dome obeys the same field */
    const erase = Math.max(0, 1 - params.kamuiErase * 2.2);
    this.mat.uniforms.uTime.value = params.clockT;
    this.mat.uniforms.uFade.value = this.fadeK * erase;

    /* advance the crossfade — full blend in ~1.2s at 60fps. While a previous
       sky is on screen and the new texture is still loading, hold the fade
       so the old sky keeps the view instead of flashing the raw cosmos —
       but only while the load is genuinely alive (≤4s): a slow, failed, or
       absent photo must always release the old sky. */
    const holdForLoad = this.pendingLoad && performance.now() - this.pendingSince < 4000;
    if (this.fadeK < 1 && (hasMap || !holdForLoad || this.mat.uniforms.uHasPrev.value < 0.5)) {
      this.fadeK = Math.min(1, this.fadeK + 0.022);
      if (this.fadeK >= 1 && this.prevTexture) {
        this.prevTexture = null;
        this.mat.uniforms.uHasPrev.value = 0;
      }
    }
  }

  setVisible(v: boolean): void {
    this.visible = v;
  }

  dispose(scene: THREE.Scene): void {
    if (!this.group) return;
    scene.remove(this.group);
    this.mat?.dispose();
    this.textures.forEach((t) => t.dispose());
    this.textures.clear();
    this.mat = null;
    this.group = null;
  }
}
