/* R97 — THE WORLD BUILDERS SUBSYSTEM. Extracted verbatim from the
   UniverseEngine monolith: the Anchor Star, the per-body builder (the 41-field
   physics solve made visible — planet/atmo/clouds/rings/moons/lens halos/vault
   geodesics), the asteroid belt + rock geometry, the diary-moon sync (entry →
   moon, streak rings), the body roster sync, the exoplanet plates, and the
   R95 osculating-orbit ring rebuilders. The engine composes this class;
   shared state (collider registry, star uniforms, the anchor group, the belt
   fields, moon geometry) stays ENGINE-owned and is reached through
   name-preserving getter/setter pairs, so the moved bodies read exactly as
   they did inside engine.ts. */
import * as THREE from 'three';
import {
  starVert, starFrag, coronaVert, coronaFrag, planetVert, planetFrag, cloudFrag, atmoFrag,
  ringVert, ringFrag, nebulaVert, nebulaFrag, pointsVert, pointsFrag,
  exoplanetPlateVert, exoplanetPlateFrag, asteroidVert, asteroidFrag,
} from '../shaders';
import { makeGlowTexture, hash, smoothstep, cpuFbm } from '../math';
import { calculatePhysics, calculateKeplerPosition, tiltInPlaneVector, CONSTANTS } from '../../physics/physicsEngine';
import { lensHaloFor, dynamicMassKg } from '../../physics/nbody';
import type { CosmicBody, DiaryEntry } from '../../domain/universe';
import type { RealityConfig } from '../../realities';
import { CameraRig } from '../cameraRig';
import { getBlackHoleParams } from '../blackholeParams';
import { getQualityTier } from '../capability';
import type { BeltRock, RuntimeBody, UniverseEngine } from '../engine';

export class BodyBuildersSeed { /* placeholder to keep sed anchors stable */ }

export class BodyBuilders {
  constructor(private eng: UniverseEngine) {}

  /* ---- the shared runtime (engine-owned; name-preserving access) ---- */
  private get scene(): THREE.Scene { return this.eng.scene; }
  private get bodies(): RuntimeBody[] { return this.eng.bodies; }
  private get colliderList(): THREE.Mesh[] { return this.eng.colliderList; }
  private get starUniforms(): Record<string, THREE.IUniform> { return this.eng.starUniforms; }
  private set starUniforms(v: Record<string, THREE.IUniform>) { this.eng.starUniforms = v; }
  private get anchorGroup(): THREE.Group { return this.eng.anchorGroup; }
  private set anchorGroup(v: THREE.Group) { this.eng.anchorGroup = v; }
  private get exoPlates(): THREE.Mesh[] { return this.eng.exoPlates; }
  private get belt(): THREE.Group { return this.eng.belt; }
  private set belt(v: THREE.Group) { this.eng.belt = v; }
  private get asteroidInst(): { mesh: THREE.InstancedMesh; tumbles: BeltRock[] }[] { return this.eng.asteroidInst; }
  private set asteroidInst(v: { mesh: THREE.InstancedMesh; tumbles: BeltRock[] }[]) { this.eng.asteroidInst = v; }
  private get moonGeo(): THREE.SphereGeometry | undefined { return this.eng.moonGeo; }
  private set moonGeo(v: THREE.SphereGeometry | undefined) { this.eng.moonGeo = v; }
  private get moonMat(): THREE.MeshStandardMaterial | undefined { return this.eng.moonMat; }
  private get coronaMat(): THREE.ShaderMaterial { return this.eng.coronaMat; }
  private set coronaMat(v: THREE.ShaderMaterial) { this.eng.coronaMat = v; }
  private get focusId(): string | null { return this.eng.focusId; }
  private set focusId(v: string | null) { this.eng.focusId = v; }
  private get galaxyStageNodes(): UniverseEngine['galaxyStageNodes'] { return this.eng.galaxyStageNodes; }
  private get livingField(): UniverseEngine['livingField'] { return this.eng.livingField; }
  private get gWeb(): THREE.Group { return this.eng.gWeb; }
  private disposeObject3D(root: THREE.Object3D, preserve: Parameters<UniverseEngine["disposeObject3D"]>[1]): void { this.eng.disposeObject3D(root, preserve); }
  private set moonMat(v: THREE.MeshStandardMaterial | undefined) { this.eng.moonMat = v; }
  private get lastEntries(): { planetId: string; createdAt: number; updatedAt: number }[] | undefined { return this.eng.lastEntries; }
  private set lastEntries(v: { planetId: string; createdAt: number; updatedAt: number }[] | undefined) { this.eng.lastEntries = v; }
  private get bhSys(): UniverseEngine['bhSys'] { return this.eng.bhSys; }
  private get kamuiTimer(): number { return this.eng.kamuiTimer; }
  private makePoints(count: number, posFn: (i: number, arr: Float32Array) => void, sizeFn: (i: number) => number, colFn: (i: number) => [number, number, number], alphaFn: (i: number) => number, px: number, twinkle: boolean, lens?: boolean): THREE.Points {
    return this.eng.makePoints(count, posFn, sizeFn, colFn, alphaFn, px, twinkle, lens === true);
  }
  private applyKamuiFieldUniforms(material: THREE.ShaderMaterial) { this.eng.applyKamuiFieldUniforms(material); }
  private setKamuiLocalCenter(material: THREE.ShaderMaterial, mesh: THREE.Object3D | null | undefined) { this.eng.setKamuiLocalCenter(material, mesh); }

  buildAnchor() {
    const g = new THREE.Group();
    this.starUniforms = { uTime: { value: 0 }, uBoost: { value: 1 } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.starUniforms, vertexShader: starVert, fragmentShader: starFrag });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(6, 96, 64), mat);
    g.add(mesh);

    /* organic shader corona — rays breathe, no layered sprite rings */
    this.coronaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uBoost: { value: 1 },
        uAuroraA: { value: new THREE.Color('#f2c178') }, uAuroraB: { value: new THREE.Color('#7fc4e8') },
        uAuroraMaskA: { value: 0 }, uAuroraMaskB: { value: 0 },
        uAuroraIntensity: { value: 0 }, uAuroraStorm: { value: 0 },
        uEchoBloom: { value: 0 },
      },
      vertexShader: coronaVert, fragmentShader: coronaFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), this.coronaMat);
    corona.renderOrder = 5;
    corona.frustumCulled = false;
    g.add(corona);

    /* the extraordinary quality: two counter-rotating rings of captured starlight */
    const ringPts = (radius: number, count: number, color: [number, number, number], tilt: number, size: number) => {
      const R = Math.random;
      const pts = this.makePoints(
        count,
        (i, a) => { const ang = (i / count) * Math.PI * 2 + R() * 0.06; const rr = radius + (R() - 0.5) * 0.7; a[i * 3] = Math.cos(ang) * rr; a[i * 3 + 1] = (R() - 0.5) * 0.35; a[i * 3 + 2] = Math.sin(ang) * rr; },
        () => 0.5 + R() * 0.9, () => color, () => 0.3 + R() * 0.55, size, true,
      );
      const pivot = new THREE.Group();
      pivot.rotation.x = tilt;
      pivot.add(pts);
      g.add(pivot);
      return pts;
    };
    const haloA = ringPts(9.6, 700, [1, 0.82, 0.55], 0.28, 1.6);
    const haloB = ringPts(11.4, 420, [0.55, 0.85, 0.8], -0.32, 1.3);
    g.userData.haloA = haloA; g.userData.haloB = haloB;
    g.userData.starMesh = mesh;
    /* Solar Axial Obliquity Tilt (7.25 degrees relative to ecliptic) */
    g.rotation.z = 0.126;
    this.scene.add(g);

    const collider = new THREE.Mesh(new THREE.SphereGeometry(8.4, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
    collider.userData.bodyId = 'anchor';
    g.add(collider);
    this.colliderList.push(collider);
    (g as THREE.Group & { userData: Record<string, unknown> }).userData.anchorGroup = true;
    g.visible = false; /* the cold-open ignites it */
    this.anchorGroup = g;
  }
  buildBody(data: CosmicBody) {
    if (data.id === 'anchor') return;
    const g = new THREE.Group();
    const rb: RuntimeBody = {
      data, group: g, collider: null as unknown as THREE.Mesh, moons: [],
      ghost: 0, ghostTarget: 0, fade: 1, fadeTarget: 1, hoverT: 0, baseScale: 1,
    };
    const p = data.palette;
    const col = (h: string) => new THREE.Color(h);

    if (data.kind === 'planet' || data.kind === 'dwarf') {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uDeep: { value: col(p.deep) }, uBase: { value: col(p.base) }, uHigh: { value: col(p.high) },
          uIce: { value: col(p.ice) }, uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uTime: { value: 0 },
          uSea: { value: data.id === 'aurelia' ? 0.02 : -0.55 }, uGhost: { value: 0 }, uFade: { value: 1 },
          uNight: { value: data.nightside ? 1 : 0 },
          uSeed: { value: new THREE.Vector3(hash(data.id.length, 3) * 40, hash(7, data.id.length) * 40, hash(data.id.length, 11) * 40) },
        },
        vertexShader: planetVert, fragmentShader: planetFrag, transparent: true,
      });
      /* tilted spin axis — REAL OBLIQUITY from the physics engine: BODY_PROFILES
         carries each world's measured axial tilt (Venus 177.4°, Uranus 97.8°,
         Pluto 122.5°…); generated worlds fall back to a seeded spread.
         Order YXZ so the obliquity leans away from the spin pole. */
      const physData = calculatePhysics(data);
      const tilt = new THREE.Group();
      tilt.rotation.order = 'YXZ';
      tilt.rotation.y = hash(data.id.length, 4) * Math.PI * 2;
      tilt.rotation.z = (physData.axialTiltDeg * Math.PI) / 180;
      g.add(tilt);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 64, 48), mat);
      tilt.add(mesh);
      rb.mat = mat;

      /* each world keeps its own day length — DIRECTION IS PHYSICS, NOT RANDOM:
         obliquity past 90° means the world was knocked over and spins
         retrograde (Venus, Uranus, Pluto); below 90° keeps the prograde
         sense the birth cloud spun up. */
      const retrograde = physData.axialTiltDeg > 90 ? -1 : 1;
      rb.spinMesh = mesh;
      rb.spinRate = retrograde * (Math.PI * 2) / (24 + hash(data.id.length, 5) * 52);

      if (data.clouds) {
        const cm = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(1, 0, 0) },
            uSeed: { value: new THREE.Vector3(3.7, 8.1, 1.9) }, uCover: { value: data.id === 'veil' ? 0.95 : 0.5 },
            uFade: { value: 1 },
          },
          vertexShader: planetVert, fragmentShader: cloudFrag, transparent: true, depthWrite: false,
        });
        const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 1.018, 48, 32), cm);
        tilt.add(cloudMesh);
        rb.cloudMat = cm; rb.cloudMesh = cloudMesh;
        rb.cloudSpinRate = rb.spinRate * (0.86 + hash(9, data.id.length) * 0.2);
      }

      const am = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: col(p.atmo) }, uStrength: { value: data.id === 'mirror' ? 1.5 : 0.85 },
          uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        },
        vertexShader: planetVert, fragmentShader: atmoFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
      });
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 1.07, 48, 32), am);
      atmo.renderOrder = 2;
      g.add(atmo);
      rb.atmo = atmo;

      if (data.rings) {
        const inner = data.radius * 1.45, outer = data.radius * 2.5;
        const rm = new THREE.ShaderMaterial({
          uniforms: {
            uInner: { value: inner }, uOuter: { value: outer }, uTint: { value: col(p.high) }, uSunLocal: { value: new THREE.Vector3(1, 0, 0.4) },
          },
          vertexShader: ringVert, fragmentShader: ringFrag,
          transparent: true, depthWrite: false, side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96, 1), rm);
        ringMesh.rotation.x = -Math.PI / 2 + 0.32;
        ringMesh.renderOrder = 3;
        /* rings form in the equatorial plane — parent them to the tilted
           spin group so they obey the same obliquity as their world */
        tilt.add(ringMesh);
        rb.ringMat = rm; rb.ringMesh = ringMesh;
      }
      /* moons are generated dynamically — one per diary page (see syncMoons) */
    } else if (data.kind === 'nebula') {
      const s = data.radius * 3.2;
      const cA = col(p.base), cB = col(p.high);

      // 1. Primary Volumetric Raymarched 3D Density Bounding Geometry
      const nebMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: cA },
          uColorB: { value: cB },
          uOpacity: { value: 0.95 },
          uCamLocalP: { value: new THREE.Vector3() },
        },
        vertexShader: nebulaVert,
        fragmentShader: nebulaFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });

      const nebBox = new THREE.Mesh(new THREE.BoxGeometry(s * 2.5, s * 2.5, s * 2.5), nebMat);
      nebBox.renderOrder = 3;
      g.add(nebBox);
      rb.mat = nebMat;

      // 2. Surrounding 3D Dense Starfield (Independent 3D points in volumetric space)
      const starfield3D = this.makePoints(
        1600,
        (i, a) => {
          const r = Math.pow(Math.random(), 0.55) * s * 1.8;
          const t = Math.random() * Math.PI * 2, pVal = Math.acos(2 * Math.random() - 1);
          a[i * 3] = r * Math.sin(pVal) * Math.cos(t);
          a[i * 3 + 1] = r * Math.cos(pVal);
          a[i * 3 + 2] = r * Math.sin(pVal) * Math.sin(t);
        },
        (i) => (i % 30 === 0 ? 3.5 + Math.random() * 2.8 : 0.6 + Math.random() * 1.2),
        (i) => {
          const w = Math.random();
          if (w > 0.85) return [0.72, 0.88, 1.0]; // Cool White-Blue
          if (w > 0.6) return [1.0, 0.95, 0.88]; // Neutral White
          return [1.0, 0.82, 0.62]; // Warm Yellow
        },
        () => 0.4 + Math.random() * 0.55,
        2.2,
        true
      );
      g.add(starfield3D);

      // 3. Embedded Protostar Seeds & Diffraction Starbursts
      const flareTex = makeGlowTexture(128, [
        [0, 'rgba(255,255,255,1)'],
        [0.15, 'rgba(255,220,130,0.9)'],
        [0.42, 'rgba(255,140,50,0.4)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
      const flareMat = new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });

      // Embedded protostar at Left Pillar Tip
      const ps1 = new THREE.Sprite(flareMat);
      ps1.position.set(-s * 0.42, s * 0.48, s * 0.02);
      ps1.scale.setScalar(s * 0.38);
      g.add(ps1);

      // Embedded protostar at Center Pillar Tip
      const ps2 = new THREE.Sprite(flareMat);
      ps2.position.set(-s * 0.05, s * 0.78, -s * 0.08);
      ps2.scale.setScalar(s * 0.42);
      g.add(ps2);

      // Embedded protostar in Lower Mound
      const ps3 = new THREE.Sprite(flareMat);
      ps3.position.set(s * 0.05, -s * 0.62, s * 0.32);
      ps3.scale.setScalar(s * 0.32);
      g.add(ps3);

      // 4. Fine 3D Dust Filaments Particle Cloud
      const dustCloud3D = this.makePoints(
        850,
        (i, a) => {
          const r = Math.pow(Math.random(), 0.7) * s * 1.1;
          const t = Math.random() * Math.PI * 2, pVal = Math.acos(2 * Math.random() - 1);
          a[i * 3] = r * Math.sin(pVal) * Math.cos(t);
          a[i * 3 + 1] = r * Math.cos(pVal) * 0.8;
          a[i * 3 + 2] = r * Math.sin(pVal) * Math.sin(t);
        },
        () => 2.2 + Math.random() * 4.2,
        () => {
          const w = Math.random();
          return w > 0.75 ? [0.25, 0.85, 1.0] : [0.85, 0.45, 0.15];
        },
        () => 0.3 + Math.random() * 0.45,
        2.6,
        true
      );
      g.add(dustCloud3D);
    } else if (data.kind === 'hole') {
      /* Round 54/55 — ONE renderer, no stand-ins: the geodesic black hole,
         physics-colored (blackbody + Doppler) exactly like the reference,
         with his bent starfield behind it. On GPUs that cannot run it, the
         hole hides itself; the exact Schwarzschild bend rides the universe
         surface too (lensStrong is set for kind 'hole'). */
      const R = data.radius;
      const bh = this.bhSys.attachBlackHole(R, g);
      rb.mat = undefined;
      g.userData.bh = bh;
    } else if (data.kind === 'vault') {
      /* the Universal Vault — Gargantua: the geodesic black hole, nothing
         else (Round 55 erased the old lattice-ring fallback look) */
      const R = data.radius;
      const bh = this.bhSys.attachBlackHole(R, g);
      g.userData.bh = bh;
    }

    const cr = Math.max(data.radius * 1.5, 2.6);
    const collider = new THREE.Mesh(new THREE.SphereGeometry(cr, 10, 10), new THREE.MeshBasicMaterial({ visible: false }));
    collider.userData.bodyId = data.id;
    g.add(collider);
    rb.collider = collider;
    this.colliderList.push(collider);

    if (data.kind === 'planet' || data.kind === 'dwarf' || data.kind === 'vault') {
      const pts: number[] = [];
      const phys = calculatePhysics(data);
      const e = phys.eccentricity;
      const speed = data.orbit.speed || 0.01;
      /* Sample exactly ONE full revolution in fixed angular steps so the line is a
         smooth ellipse for every speed — sampling a fixed day-window made fast
         planets render as stars/hexagons (few scattered samples per lap). */
      const segments = 256;
      const periodDays = (Math.PI * 2) / speed;
      for (let i = 0; i <= segments; i++) {
        const simStep = (i / segments) * periodDays;
        const pos = calculateKeplerPosition(data.orbit.a, e, data.orbit.phase, data.orbit.incl, simStep, speed, data.orbit.node ?? 0, data.orbit.argP ?? 0);
        pts.push(pos.x, pos.y, pos.z);
      }
      const og = new THREE.BufferGeometry();
      og.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const om = new THREE.LineBasicMaterial({ color: 0x8ba1c4, transparent: true, opacity: 0 });
      const line = new THREE.LineLoop(og, om);
      this.scene.add(line);
      rb.orbitLine = line;
    }

    this.scene.add(g);
    this.bodies.push(rb);
  }

  buildBelt() {
    const R = Math.random;
    const g = new THREE.Group();

    /* fine dust — thousands of specks read as a continuous sandy band */
    const dust = this.makePoints(
      4800,
      (i, a) => {
        const ang = R() * Math.PI * 2;
        const r = 78 + R() * 15 + Math.pow(R(), 3) * 4;
        /* R84 — a real toroidal belt: each speck rides its own small
           orbital inclination (gaussian σ≈6°) instead of one flat sheet */
        const inc = (R() + R() + R() - 1.5) / 1.5 * 0.34;
        const band = (R() + R() + R() - 1.5) / 1.5 * 0.9; /* residual local thickness */
        a[i * 3] = Math.cos(ang) * r; a[i * 3 + 1] = Math.sin(inc) * r + band; a[i * 3 + 2] = Math.sin(ang) * r;
      },
      () => 0.22 + R() * 0.6,
      () => { const w = 0.38 + R() * 0.3; const warm = R() * 0.1; return [w + warm, w * 0.86, w * 0.7] as [number, number, number]; },
      () => 0.25 + R() * 0.55, 1.15, false,
    );
    g.add(dust);

    /* lumpy 3D rocks — a handful of CPU-displaced shapes, instanced around
       the band: many small, a few big, every one tumbling on its own axis */
    const shades = ['#8d8781', '#726c65', '#9c948b', '#615c55', '#7f766b', '#91867a'];
    const SHAPES = 6, PER_SHAPE = 56;
    for (let s = 0; s < SHAPES; s++) {
      const geo = this.makeRockGeometry(s * 17.31 + 3.7);
      const mat = new THREE.ShaderMaterial({
        vertexShader: asteroidVert, fragmentShader: asteroidFrag,
        uniforms: { uColor: { value: new THREE.Color(shades[s % shades.length]) } },
      });
      const mesh = new THREE.InstancedMesh(geo, mat, PER_SHAPE);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const tumbles: BeltRock[] = [];
      const m = new THREE.Matrix4();
      for (let k = 0; k < PER_SHAPE; k++) {
        const ang = R() * Math.PI * 2;
        const r = 78 + R() * 15;
        /* R84 — the rocks follow the same per-speck inclination as the dust */
        const inc = (R() + R() + R() - 1.5) / 1.5 * 0.34;
        const y = Math.sin(inc) * r + (R() + R() + R() - 1.5) / 1.5 * 1.1;
        const sc = 0.22 + Math.pow(R(), 2.4) * 1.45; /* many pebbles, few boulders */
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * Math.PI * 2, R() * Math.PI * 2, R() * Math.PI * 2));
        const pos = new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r);
        m.compose(pos, q, new THREE.Vector3(sc, sc, sc));
        mesh.setMatrixAt(k, m);
        tumbles.push({
          pos, q,
          scale: new THREE.Vector3(sc, sc, sc),
          axis: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(),
          speed: 0.12 + R() * 0.55,
        });
      }
      g.add(mesh);
      this.asteroidInst.push({ mesh, tumbles });
    }
    this.scene.add(g);
    this.belt = g;
  }

  /** one lumpy rock silhouette — an icosahedron pushed around by CPU noise,
      slightly flattened like a real potato-shaped minor body */
  makeRockGeometry(seed: number): THREE.BufferGeometry {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const f1 = 1.2 + (seed % 0.9);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      v.y *= 0.82; v.z *= 0.92;
      const lump = cpuFbm(v.x * f1 + seed, v.y * f1 + v.z * 0.7 + seed * 1.3) * 0.4
        + cpuFbm(v.y * 3.6 + seed * 1.7, v.z * 3.6 - seed) * 0.13;
      v.multiplyScalar(1 + lump);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals(); /* non-indexed → crisp facets, like real rock */
    return geo;
  }
  static dayKey(t: number) { return Math.floor(t / 86400000); }
  static streakOf(es: { createdAt: number; updatedAt: number }[]): number {
    if (!es.length) return 0;
    const days = new Set(es.map((e) => BodyBuilders.dayKey(Math.max(e.createdAt, e.updatedAt))));
    let cursor = BodyBuilders.dayKey(Date.now());
    if (!days.has(cursor)) cursor -= 1;
    if (!days.has(cursor)) return 0;
    let n = 0;
    while (days.has(cursor)) { n += 1; cursor -= 1; }
    return n;
  }
  static daysOf(es: { createdAt: number; updatedAt: number }[]): number {
    return new Set(es.map((e) => BodyBuilders.dayKey(Math.max(e.createdAt, e.updatedAt)))).size;
  }

  /** One moon per diary page. Rebuilds moons so they always match the pages.
      Also drives each world's commitment ring — it brightens with your writing streak. */
  syncMoons(entries: { planetId: string; createdAt: number; updatedAt: number }[]) {
    this.lastEntries = entries;
    if (!this.moonGeo) this.moonGeo = new THREE.SphereGeometry(1, 22, 14);
    if (!this.moonMat) this.moonMat = new THREE.MeshStandardMaterial({ color: 0xa8a29a, roughness: 0.95, metalness: 0.02 });
    this.bodies.forEach((b) => {
      if (b.data.kind !== 'planet' && b.data.kind !== 'dwarf') return;
      const planetEntries = entries.filter((e) => e.planetId === b.data.id);

      /* the streak ring — a halo that remembers how regularly you write here.
         Thickness scales with the planet so it's actually visible. */
      if (!b.streakRing) {
        const rm = new THREE.Mesh(
          new THREE.TorusGeometry(b.data.radius * (b.data.rings ? 2.1 : 1.5), Math.max(0.02, b.data.radius * 0.011), 8, 128),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(b.data.palette.atmo), transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }),
        );
        rm.rotation.x = Math.PI / 2 - 0.12;
        b.group.add(rm);
        b.streakRing = rm;
      }
      /* store the streak; the render loop animates brightness + breathing */
      b.streakTarget = BodyBuilders.streakOf(planetEntries);
      b.streakDays = BodyBuilders.daysOf(planetEntries);

      const count = Math.min(12, planetEntries.length);
      if (count === b.moons.length) return;
      b.moons.forEach((m) => b.group.remove(m.mesh));
      b.moons = [];
      for (let i = 0; i < count; i++) {
        const seed = hash(i + 1, b.data.id.length + 3);
        const mr = b.data.radius * (0.1 + 0.09 * seed);
        const mesh = new THREE.Mesh(this.moonGeo!, this.moonMat!);
        mesh.scale.setScalar(Math.max(0.09, mr));
        b.group.add(mesh);
        b.moons.push({
          mesh,
          /* R93 — deterministic id + radius: the session driver's churn keys
             (surviving moons carry their states) and the moon mass law's input */
          id: `${b.data.id}:moon:${i}`,
          radius: mr,
          a: b.data.radius * (1.75 + 0.55 * i) + (b.data.rings ? b.data.radius * 1.5 : 0),
          speed: (Math.PI * 2) / (14 + i * 8),
          phase: seed * 6.28,
          incl: 0.18 + seed * 0.3,
          node: hash(i + 3, b.data.id.length + 5) * Math.PI * 2,
        });
      }
    });

    /* the isolated inner systems' worlds play by the same rules — a moon
       forms per diary page, the streak ring remembers devotion */
    for (const node of this.galaxyStageNodes) {
      const sys = node.innerSys;
      if (!sys) continue;
      for (const p of sys.planets) {
        if (p.data.kind !== 'planet' && p.data.kind !== 'dwarf') continue;
        const planetEntries = entries.filter((e) => e.planetId === p.data.id);
        if (!p.streakRing) {
          const rm = new THREE.Mesh(
            new THREE.TorusGeometry(p.data.radius * (p.data.rings ? 2.1 : 1.5), Math.max(0.02, p.data.radius * 0.011), 8, 128),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(p.data.palette.atmo), transparent: true, opacity: 0,
              blending: THREE.AdditiveBlending, depthWrite: false,
            }),
          );
          rm.rotation.x = Math.PI / 2 - 0.12;
          p.group.add(rm);
          p.streakRing = rm;
        }
        p.streakTarget = BodyBuilders.streakOf(planetEntries);
        p.streakDays = BodyBuilders.daysOf(planetEntries);

        const count = Math.min(12, planetEntries.length);
        /* without pages a giant keeps its small natural court */
        if (count === 0 && p.moons.length > 0 && !p.entryMoons) continue;
        if (count === p.moons.length) continue;
        p.moons.forEach((m) => p.group.remove(m.mesh));
        p.moons = [];
        p.entryMoons = count > 0;
        for (let i = 0; i < count; i++) {
          const seed = hash(i + 1, p.data.id.length + 3);
          const mr = p.data.radius * (0.1 + 0.09 * seed);
          const mesh = new THREE.Mesh(this.moonGeo!, this.moonMat!);
          mesh.scale.setScalar(Math.max(0.09, mr));
          p.group.add(mesh);
          p.moons.push({
            mesh,
            /* R94 — deterministic id + radius: diary moons of the inner
               systems are real bodies in their galaxy's scope */
            id: `${p.data.id}:moon:${i}`,
            radius: mr,
            a: p.data.radius * (1.75 + 0.55 * i) + (p.data.rings ? p.data.radius * 1.5 : 0),
            speed: (Math.PI * 2) / (14 + i * 8),
            phase: seed * 6.28,
            incl: 0.18 + seed * 0.3,
            node: hash(i + 3, p.data.id.length + 5) * Math.PI * 2,
          });
        }
      }
    }
  }

  /** Diff runtime bodies against the state list — form new worlds, dissolve removed ones. */
  syncBodies(list: CosmicBody[]) {
    const incoming = new Set(list.map((b) => b.id));
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const rb = this.bodies[i];
      if (!incoming.has(rb.data.id)) {
        const preservedGeometries = new Set<THREE.BufferGeometry>();
        const preservedMaterials = new Set<THREE.Material>();
        if (this.moonGeo) preservedGeometries.add(this.moonGeo);
        if (this.moonMat) preservedMaterials.add(this.moonMat);
        this.bhSys.releaseBlackHolesUnder(rb.group);
        this.disposeObject3D(rb.group, {
          geometries: preservedGeometries,
          materials: preservedMaterials,
        });
        this.scene.remove(rb.group);
        if (rb.orbitLine) {
          this.scene.remove(rb.orbitLine);
          this.disposeObject3D(rb.orbitLine, {
            geometries: preservedGeometries,
            materials: preservedMaterials,
          });
        }
        const ci = this.colliderList.indexOf(rb.collider);
        if (ci >= 0) this.colliderList.splice(ci, 1);
        this.bodies.splice(i, 1);
        if (this.focusId === rb.data.id) this.focusId = null;
      }
    }
    const existing = new Set(this.bodies.map((b) => b.data.id));
    list.forEach((data) => {
      if (!existing.has(data.id)) this.buildBody(data);
    });

    /* Round 14 — Living Gravity re-syncs: new worlds are born healed on
       their canonical path, removed worlds leave the field. Each body also
       receives its lens-halo multiplier (the bend is always the size of the
       body's own silhouette). */
    for (const rb of this.bodies) {
      rb.lensHalo = lensHaloFor(rb.data.kind);
    }
    this.livingField.sync(list.map((b) => {
      const phys = calculatePhysics(b);
      return {
        id: b.id,
        massKg: dynamicMassKg(phys.massKg, b.kind),
        isStar: b.kind === 'star',
        a: b.orbit?.a ?? 0,
        e0: phys.eccentricity,
        phase: b.orbit?.phase ?? 0,
        incl: b.orbit?.incl ?? 0,
        speed: b.orbit?.speed ?? 0.01,
      };
    }));
  }
  buildExoplanetPlates() {
    if (getQualityTier() !== 'cinematic' || this.exoPlates.length > 0) return;
    const specs = [
      { pos: [135000, -26000, -86000], size: 8200, atm: '#7fd4ff' },
      { pos: [-152000, 34000, 61000], size: 10400, atm: '#ffb98a' },
      { pos: [42000, 68000, -178000], size: 6400, atm: '#c9a6ff' },
    ] as const;
    for (const s of specs) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: exoplanetPlateVert,
        fragmentShader: exoplanetPlateFrag,
        uniforms: {
          uTime: { value: 0 },
          uSunDir: { value: new THREE.Vector3(0.3, 0.3, 1).normalize() },
          uColorAtm: { value: new THREE.Color(s.atm) },
          uOpacity: { value: 0 },
        },
        transparent: true, depthWrite: false,
      });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(s.size, s.size), mat);
      plate.position.set(s.pos[0], s.pos[1], s.pos[2]);
      plate.renderOrder = 2;
      this.exoPlates.push(plate);
      this.gWeb.add(plate);
    }
  }
  rebuildOrbitLineFromState(
    line: THREE.Line,
    posS: [number, number, number],
    velS: [number, number, number],
    focusS: [number, number, number],
  ): boolean {
    const mPerU = CONSTANTS.AU / 52;
    const mu = CONSTANTS.G * CONSTANTS.M_sun; /* the star is 1 M☉ by the physicsEngine law */
    const rx = (posS[0] - focusS[0]) * mPerU;
    const ry = (posS[1] - focusS[1]) * mPerU;
    const rz = (posS[2] - focusS[2]) * mPerU;
    const vx = (velS[0] * mPerU) / 86400;
    const vy = (velS[1] * mPerU) / 86400;
    const vz = (velS[2] * mPerU) / 86400;
    const r = Math.hypot(rx, ry, rz);
    const v2 = vx * vx + vy * vy + vz * vz;
    const energy = v2 / 2 - mu / r;
    if (!(energy < -1e-9) || r < 1) return false; /* unbound — keep the canon ring */
    const hx = ry * vz - rz * vy;
    const hy = rz * vx - rx * vz;
    const hz = rx * vy - ry * vx;
    const hm = Math.hypot(hx, hy, hz);
    if (hm < 1) return false;
    const rv = rx * vx + ry * vy + rz * vz;
    const shrink = v2 - mu / r;
    const ex = (shrink * rx - rv * vx) / mu;
    const ey = (shrink * ry - rv * vy) / mu;
    const ez = (shrink * rz - rv * vz) / mu;
    const e = Math.hypot(ex, ey, ez);
    if (e >= 0.995) return false; /* near-parabolic — the canon ring stays */
    /* the orbital plane basis: periapsis direction + transverse */
    let px = ex, py = ey, pz = ez;
    if (e < 1e-6) { px = rx / r; py = ry / r; pz = rz / r; }
    else { px /= e; py /= e; pz /= e; }
    const wx = hx / hm, wy = hy / hm, wz = hz / hm;
    const qx = wy * pz - wz * py;
    const qy = wz * px - wx * pz;
    const qz = wx * py - wy * px;
    const pSemi = (hm * hm) / mu; /* the semi-latus rectum */
    const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!attr) return false;
    const segs = attr.count - 1; /* LineLoop: the last point repeats the first */
    for (let s = 0; s <= segs; s++) {
      const th = (s / segs) * Math.PI * 2;
      const rr = pSemi / (1 + e * Math.cos(th));
      attr.setXYZ(
        s,
        focusS[0] + (Math.cos(th) * px + Math.sin(th) * qx) * rr / mPerU,
        focusS[1] + (Math.cos(th) * py + Math.sin(th) * qy) * rr / mPerU,
        focusS[2] + (Math.cos(th) * pz + Math.sin(th) * qz) * rr / mPerU,
      );
    }
    attr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    return true;
  }

  /** R95 — restore a world's hover ellipse to its canon clockwork geometry
      (the buildBody sampling, replayed in place; home + inner systems). */
  rebuildOrbitLineToCanon(line: THREE.Line, data: CosmicBody): void {
    if (!(data.kind === 'planet' || data.kind === 'dwarf' || data.kind === 'vault')) return;
    const phys = calculatePhysics(data);
    const e = phys.eccentricity;
    const speed = data.orbit.speed || 0.01;
    const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!attr) return;
    const segs = attr.count - 1;
    const periodDays = (Math.PI * 2) / speed;
    for (let s = 0; s <= segs; s++) {
      const step = (s / segs) * periodDays;
      const pos = calculateKeplerPosition(data.orbit.a, e, data.orbit.phase, data.orbit.incl, step, speed, data.orbit.node ?? 0, data.orbit.argP ?? 0);
      attr.setXYZ(s, pos.x, pos.y, pos.z);
    }
    attr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  }

}
