/* R97 — THE INNER GALAXY SUBSYSTEM. Extracted verbatim from the UniverseEngine
   monolith: the isolated inner stellar system a galaxy dive lands in — its
   builder (the anchor star copy-pasted, real obliquity, vault grammar, moon
   courts, its own belt), its per-frame life (Kepler positions, the R94 scope
   declaration + driver seam, terminators, spins, moon circuits, tumbling
   rocks), and the dive lifecycle (begin/enter/cancel, inner selection, the
   release). The dive STATE (galaxyDive, galaxyDiveId, pendingGalaxyEntry) and
   the view-state fields stay ENGINE-owned — the shell's tick watcher, the
   kamui subsystem and updateBodies all read them — so the moved bodies reach
   them through name-preserving getter/setter pairs and read exactly as they
   did inside engine.ts. */
import * as THREE from 'three';
import {
  starVert, starFrag, coronaVert, coronaFrag, planetVert, planetFrag,
  cloudFrag, atmoFrag, ringVert, ringFrag, nebulaVert, nebulaFrag,
  asteroidVert, asteroidFrag,
} from '../shaders';
import { makeGlowTexture, hash, smoothstep } from '../math';
import { calculatePhysics, calculateKeplerPosition, tiltInPlaneVector } from '../../physics/physicsEngine';
import { generateStellarSystemForGalaxy } from '../../realities/galaxyGenerator';
import { driverState, driverReadback, driverVelReadback } from '../../physics/sessionDriver';
import { CameraRig } from '../cameraRig';
import type { CosmicBody } from '../../domain/universe';
import type { GalaxyData, RealityConfig } from '../../realities';
import type { BeltRock, InnerPlanet, InnerSystem, RuntimeBody, UniverseEngine } from '../engine';

export class InnerGalaxySystem {
  constructor(private eng: UniverseEngine) {}

  /* ---- the shared runtime (engine-owned; name-preserving access) ---- */
  private get camera(): THREE.PerspectiveCamera { return this.eng.camera; }
  private get rig(): CameraRig { return this.eng.rig; }
  private get cb(): UniverseEngine['cb'] { return this.eng.cb; }
  private get clockT(): number { return this.eng.clockT; }
  private get simDays(): number { return this.eng.simDays; }
  private get bhSys(): UniverseEngine['bhSys'] { return this.eng.bhSys; }
  private get portal(): UniverseEngine['portal'] { return this.eng.portal; }
  private get kamuiTimer(): number { return this.eng.kamuiTimer; }
  private get bootIntro(): boolean { return this.eng.bootIntro; }
  private get universeDriverOn(): boolean { return this.eng.universeDriverActive; }
  private get driverGalaxyScope(): UniverseEngine['driverGalaxyScope'] { return this.eng.driverGalaxyScope; }
  private set driverGalaxyScope(v: UniverseEngine['driverGalaxyScope']) { this.eng.driverGalaxyScope = v; }
  private get activeRealityId(): string | null { return this.eng.activeRealityId; }
  private get galaxyStageNodes(): UniverseEngine['galaxyStageNodes'] { return this.eng.galaxyStageNodes; }
  private get galaxyNodes(): UniverseEngine['galaxyNodes'] { return this.eng.galaxyNodes; }
  private get innerColliderList(): THREE.Mesh[] { return this.eng.innerColliderList; }
  private get _vScratch1(): THREE.Vector3 { return this.eng._vScratch1; }
  private get _vScratch2(): THREE.Vector3 { return this.eng._vScratch2; }
  private get _vDirScratch(): THREE.Vector3 { return this.eng._vDirScratch; }
  private get _qScratch(): THREE.Quaternion { return this.eng._qScratch; }
  private get _qScratch2(): THREE.Quaternion { return this.eng._qScratch2; }
  private get _vScratch3(): THREE.Vector3 { return this.eng._vScratch3; }
  private get _rockM(): THREE.Matrix4 { return this.eng._rockM; }
  private get _rockQ(): THREE.Quaternion { return this.eng._rockQ; }
  private makePoints(count: number, posFn: (i: number, arr: Float32Array) => void, sizeFn: (i: number) => number, colFn: (i: number) => [number, number, number], alphaFn: (i: number) => number, px: number, twinkle: boolean, lens?: boolean): THREE.Points {
    return this.eng.makePoints(count, posFn, sizeFn, colFn, alphaFn, px, twinkle, lens === true);
  }
  private makeRockGeometry(seed: number): THREE.BufferGeometry { return this.eng.makeRockGeometry(seed); }
  private applyKamuiFieldUniforms(material: THREE.ShaderMaterial) { this.eng.applyKamuiFieldUniforms(material); }
  private setKamuiLocalCenter(material: THREE.ShaderMaterial, mesh: THREE.Object3D | null | undefined) { this.eng.setKamuiLocalCenter(material, mesh); }
  private kamuiSwallowFactorFor(g: THREE.Object3D): number { return this.eng.kamuiSwallowFactorFor(g); }
  private rebuildOrbitLineFromState(line: THREE.Line, posS: [number, number, number], velS: [number, number, number], focusS: [number, number, number]): boolean {
    return this.eng.rebuildOrbitLineFromState(line, posS, velS, focusS);
  }
  private rebuildOrbitLineToCanon(line: THREE.Line, data: CosmicBody): void { this.eng.rebuildOrbitLineToCanon(line, data); }
  private beginPortal(b: { data: CosmicBody }) { this.eng.beginPortal(b); }
  private beginStageWarp(dir: 'toMultiverse' | 'toWeb', arrivalDial: number, _after?: () => void): void { this.eng.beginStageWarp(dir, arrivalDial, _after); }
  private triggerKamui(targetUv?: THREE.Vector2, reverse = false) { this.eng.triggerKamui(targetUv, reverse); }
  /* written by the moved bodies — getter/setter pairs over the engine fields */
  private get hoveredId(): string | null { return this.eng.hoveredId; }
  private set hoveredId(v: string | null) { this.eng.hoveredId = v; }
  private get focusId(): string | null { return this.eng.focusId; }
  private set focusId(v: string | null) { this.eng.focusId = v; }
  private get selectedId(): string | null { return this.eng.selectedId; }
  private set selectedId(v: string | null) { this.eng.selectedId = v; }
  private get cosmicStage(): 'web' | 'multiverse' { return this.eng.cosmicStage; }
  private set cosmicStage(v: 'web' | 'multiverse') { this.eng.cosmicStage = v; }
  private get grabCooldown(): number { return this.eng.grabCooldown; }
  private set grabCooldown(v: number) { this.eng.grabCooldown = v; }
  private get realityFocused(): boolean { return this.eng.realityFocused; }
  private set realityFocused(v: boolean) { this.eng.realityFocused = v; }
  private get galaxyFocusId(): string | null { return this.eng.galaxyFocusId; }
  private set galaxyFocusId(v: string | null) { this.eng.galaxyFocusId = v; }
  private get galaxyInnerFocus(): boolean { return this.eng.galaxyInnerFocus; }
  private set galaxyInnerFocus(v: boolean) { this.eng.galaxyInnerFocus = v; }
  private get innerFocusBodyId(): string | null { return this.eng.innerFocusBodyId; }
  private set innerFocusBodyId(v: string | null) { this.eng.innerFocusBodyId = v; }
  private get activeGalaxyName(): string | null { return this.eng.activeGalaxyName; }
  private set activeGalaxyName(v: string | null) { this.eng.activeGalaxyName = v; }
  private get moonGeo(): THREE.SphereGeometry | undefined { return this.eng.moonGeo; }
  private set moonGeo(v: THREE.SphereGeometry | undefined) { this.eng.moonGeo = v; }
  private get moonMat(): THREE.MeshStandardMaterial | undefined { return this.eng.moonMat; }
  private set moonMat(v: THREE.MeshStandardMaterial | undefined) { this.eng.moonMat = v; }
  private get pendingGalaxyEntry(): { realityId: string; galaxyId: string } | null { return this.eng.pendingGalaxyEntry; }
  private set pendingGalaxyEntry(v: { realityId: string; galaxyId: string } | null) { this.eng.pendingGalaxyEntry = v; }
  private get galaxyDive(): { galaxyId: string; endInner: boolean } | null { return this.eng.galaxyDive; }
  private set galaxyDive(v: { galaxyId: string; endInner: boolean } | null) { this.eng.galaxyDive = v; }

  buildInnerStellarSystem(gal: GalaxyData, galCol: THREE.Color, rnd: () => number, reality: RealityConfig): { root: THREE.Group; sys: InnerSystem } {
    const root = new THREE.Group();
    const bodies = generateStellarSystemForGalaxy(gal);
    const starData = bodies.find((b) => b.kind === 'star') ?? bodies[0];
    const sys: InnerSystem = {
      starData,
      starUniforms: {}, starMesh: null as unknown as THREE.Mesh,
      corona: null as unknown as THREE.Mesh, coronaMat: null as unknown as THREE.ShaderMaterial,
      haloA: null as unknown as THREE.Points, haloB: null as unknown as THREE.Points,
      planets: [], belt: new THREE.Group(), beltInst: [], beltDustMat: null as unknown as THREE.ShaderMaterial,
    };
    root.add(sys.belt);

    /* ---- the star — THE ANCHOR STAR, COPY-PASTED: same shader surface,
            same corona fed by the reality's own palette, same two
            counter-rotating rings of captured starlight as the home system.
            The galaxy tint survives only in the soft outer glow. ---- */
    const col = (h: string) => new THREE.Color(h);
    const starColA = col(reality.colorA);
    const starColB = col(reality.colorB);
    const starCore = col(reality.starColor || reality.colorA);
    sys.starUniforms = {
      uTime: { value: 0 }, uBoost: { value: 1 },
      uColorA: { value: starColA.clone() },
      uColorB: { value: starColB.clone() },
      uCoreColor: { value: starCore.clone() },
    };
    const starMat = new THREE.ShaderMaterial({ uniforms: sys.starUniforms, vertexShader: starVert, fragmentShader: starFrag });
    sys.starMesh = new THREE.Mesh(new THREE.SphereGeometry(starData.radius, 96, 64), starMat);
    root.add(sys.starMesh);

    /* the star is REAL and interactive — click to select, double-click to
       open the control panel, exactly like the home anchor */
    const starCollider = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(starData.radius * 1.4, 8.4), 12, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    starCollider.userData = { isInner: true, isInnerStar: true, bodyId: `inner:${starData.id}` };
    root.add(starCollider);
    this.innerColliderList.push(starCollider);

    sys.coronaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uBoost: { value: 1 },
        uColorA: { value: starColA.clone() },
        uColorB: { value: starColB.clone() },
      },
      vertexShader: coronaVert, fragmentShader: coronaFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(starData.radius * 10.6, starData.radius * 10.6), sys.coronaMat);
    corona.renderOrder = 5;
    corona.frustumCulled = false;
    root.add(corona);
    sys.corona = corona;

    /* the extraordinary quality: two counter-rotating rings of captured
       starlight — same grammar as buildAnchor */
    const ringPts = (radius: number, count: number, color: [number, number, number], tilt: number, size: number) => {
      const pts = this.makePoints(
        count,
        (i, a) => { const ang = (i / count) * Math.PI * 2 + rnd() * 0.06; const rr = radius + (rnd() - 0.5) * 0.7; a[i * 3] = Math.cos(ang) * rr; a[i * 3 + 1] = (rnd() - 0.5) * 0.35; a[i * 3 + 2] = Math.sin(ang) * rr; },
        () => 0.5 + rnd() * 0.9, () => color, () => 0.3 + rnd() * 0.55, size, true,
      );
      const pivot = new THREE.Group();
      pivot.rotation.x = tilt;
      pivot.add(pts);
      root.add(pivot);
      return pts;
    };
    sys.haloA = ringPts(starData.radius * 1.6, 700, [1, 0.82, 0.55], 0.28, 1.6);
    sys.haloB = ringPts(starData.radius * 1.9, 420, [0.55, 0.85, 0.8], -0.32, 1.3);

    /* soft outer glow so the star also reads at mid-dive depth — kept subtle
       so the living corona arcs dominate, exactly like the home anchor */
    const glowTex = makeGlowTexture(128, [
      [0, 'rgba(255,252,244,1)'],
      [0.25, `rgba(${Math.round(galCol.r * 255)},${Math.round(galCol.g * 255)},${Math.round(galCol.b * 255)},0.55)`],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.45 }));
    glow.scale.setScalar(starData.radius * 8.5);
    root.add(glow);

    /* ---- the worlds — exact buildBody grammar ---- */
    const terran = bodies.find((b) => /-w2$/.test(b.id));
    const giant = bodies.find((b) => b.rings);
    const beltR = terran && giant && giant !== terran ? (terran.orbit.a + giant.orbit.a) / 2 : 80;
    if (!this.moonGeo) this.moonGeo = new THREE.SphereGeometry(1, 22, 14);
    if (!this.moonMat) this.moonMat = new THREE.MeshStandardMaterial({ color: 0xa8a29a, roughness: 0.95, metalness: 0.02 });

    for (const data of bodies) {
      if (data.kind === 'star') continue;
      const p = data.palette;
      const col = (h: string) => new THREE.Color(h);
      const g = new THREE.Group();

      /* ---- an isolated Eventide Vault keeps the black-hole grammar of the
             home galaxy: the geodesic renderer, nothing else. It must not
             fall through the ordinary planet builder just because it lives
             in another galaxy. ---- */
      if (data.kind === 'vault') {
        const bh = this.bhSys.attachBlackHole(data.radius, g);
        g.userData.bh = bh;
        const ip: InnerPlanet = { data, group: g, hole: bh, moons: [], hoverT: 0 };
        this.addInnerColliderAndOrbit(ip, root, rnd);
        root.add(g);
        sys.planets.push(ip);
        continue;
      }

      /* ---- the edge nebula — the Wisp Nebula grammar, copied from buildBody ---- */
      if (data.kind === 'nebula') {
        const s = data.radius * 3.2;
        const cA = col(p.base), cB = col(p.high);
        const nebMat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 }, uColorA: { value: cA }, uColorB: { value: cB },
            uOpacity: { value: 0.95 }, uCamLocalP: { value: new THREE.Vector3() },
          },
          vertexShader: nebulaVert, fragmentShader: nebulaFrag,
          transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending,
        });
        const nebBox = new THREE.Mesh(new THREE.BoxGeometry(s * 2.5, s * 2.5, s * 2.5), nebMat);
        nebBox.renderOrder = 3;
        g.add(nebBox);

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
            if (w > 0.85) return [0.72, 0.88, 1.0];
            if (w > 0.6) return [1.0, 0.95, 0.88];
            return [1.0, 0.82, 0.62];
          },
          () => 0.4 + Math.random() * 0.55, 2.2, true,
        );
        g.add(starfield3D);

        const flareTex = makeGlowTexture(128, [
          [0, 'rgba(255,255,255,1)'],
          [0.15, 'rgba(255,220,130,0.9)'],
          [0.42, 'rgba(255,140,50,0.4)'],
          [1, 'rgba(0,0,0,0)'],
        ]);
        const flareMat = new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
        const protos: [number, number, number, number][] = [
          [-s * 0.42, s * 0.48, s * 0.02, s * 0.38],
          [-s * 0.05, s * 0.78, -s * 0.08, s * 0.42],
          [s * 0.05, -s * 0.62, s * 0.32, s * 0.32],
        ];
        protos.forEach(([px, py, pz, sc]) => {
          const ps = new THREE.Sprite(flareMat);
          ps.position.set(px, py, pz);
          ps.scale.setScalar(sc);
          g.add(ps);
        });

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
          () => { const w = Math.random(); return w > 0.75 ? [0.25, 0.85, 1.0] : [0.85, 0.45, 0.15]; },
          () => 0.3 + Math.random() * 0.45, 2.6, true,
        );
        g.add(dustCloud3D);

        const ip: InnerPlanet = { data, group: g, mat: nebMat, moons: [], hoverT: 0 };
        this.addInnerColliderAndOrbit(ip, root, rnd);
        root.add(g);
        sys.planets.push(ip);
        continue;
      }

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uDeep: { value: col(p.deep) }, uBase: { value: col(p.base) }, uHigh: { value: col(p.high) },
          uIce: { value: col(p.ice) }, uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uTime: { value: 0 },
          uSea: { value: data.nightside ? 0.02 : -0.55 }, uGhost: { value: 0 }, uFade: { value: 1 },
          uNight: { value: data.nightside ? 1 : 0 },
          uSeed: { value: new THREE.Vector3(hash(data.id.length, 3) * 40, hash(7, data.id.length) * 40, hash(data.id.length, 11) * 40) },
        },
        vertexShader: planetVert, fragmentShader: planetFrag, transparent: true,
      });
      /* tilted spin axis — REAL OBLIQUITY, same law as the home system */
      const physData = calculatePhysics(data);
      const tilt = new THREE.Group();
      tilt.rotation.order = 'YXZ';
      tilt.rotation.y = hash(data.id.length, 4) * Math.PI * 2;
      tilt.rotation.z = (physData.axialTiltDeg * Math.PI) / 180;
      g.add(tilt);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 40, 28), mat);
      tilt.add(mesh);
      const ip: InnerPlanet = { data, group: g, mat, moons: [], hoverT: 0 };
      /* spin direction follows obliquity: >90° = retrograde world */
      const retrograde = physData.axialTiltDeg > 90 ? -1 : 1;
      ip.spinMesh = mesh;
      ip.spinRate = retrograde * (Math.PI * 2) / (24 + hash(data.id.length, 5) * 52);

      if (data.clouds) {
        const cm = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(1, 0, 0) },
            uSeed: { value: new THREE.Vector3(3.7, 8.1, 1.9) }, uCover: { value: 0.5 },
            uFade: { value: 1 },
          },
          vertexShader: planetVert, fragmentShader: cloudFrag, transparent: true, depthWrite: false,
        });
        const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 1.018, 32, 20), cm);
        tilt.add(cloudMesh);
        ip.cloudMat = cm;
        ip.cloudMesh = cloudMesh;
        ip.cloudSpinRate = ip.spinRate! * (0.86 + hash(9, data.id.length) * 0.2);
      }

      const am = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: col(p.atmo) }, uStrength: { value: 0.85 }, uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        },
        vertexShader: planetVert, fragmentShader: atmoFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
      });
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 1.07, 32, 20), am);
      atmo.renderOrder = 2;
      g.add(atmo);
      ip.atmo = atmo;

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
        tilt.add(ringMesh);
        ip.ringMat = rm;
        ip.ringMesh = ringMesh;
        /* the giant carries a small court of moons */
        const moonCount = 2 + Math.floor(rnd() * 2);
        for (let mi = 0; mi < moonCount; mi++) {
          const seed = hash(mi + 1, data.id.length + 3);
          const moon = new THREE.Mesh(this.moonGeo!, this.moonMat!);
          moon.scale.setScalar(Math.max(0.09, data.radius * (0.1 + 0.09 * seed)));
          g.add(moon);
          ip.moons.push({
            mesh: moon,
            /* R94 — deterministic id + radius: inner moons join the session
               when their galaxy's scope is the living one */
            id: `${data.id}:moon:${mi}`,
            radius: Math.max(0.09, data.radius * (0.1 + 0.09 * seed)),
            a: data.radius * (1.75 + 0.55 * mi) + data.radius * 1.5,
            speed: (Math.PI * 2) / (14 + mi * 8),
            phase: seed * 6.28,
            incl: 0.18 + seed * 0.3,
          });
        }
      }

      this.addInnerColliderAndOrbit(ip, root, rnd);
      root.add(g);
      sys.planets.push(ip);
    }

    /* ---- its own asteroid belt, between the temperate world and the giant ---- */
    const R = rnd;
    const beltDust = this.makePoints(
      3200,
      (i, a) => {
        const ang = R() * Math.PI * 2;
        const r = beltR - 8 + R() * 16 + Math.pow(R(), 3) * 4;
        /* R84 — same toroidal grammar as the home belt */
        const inc = (R() + R() + R() - 1.5) / 1.5 * 0.34;
        const band = (R() + R() + R() - 1.5) / 1.5 * 0.9;
        a[i * 3] = Math.cos(ang) * r; a[i * 3 + 1] = Math.sin(inc) * r + band; a[i * 3 + 2] = Math.sin(ang) * r;
      },
      () => 0.22 + R() * 0.6,
      () => { const w = 0.38 + R() * 0.3; const warm = R() * 0.1; return [w + warm, w * 0.86, w * 0.7] as [number, number, number]; },
      () => 0.25 + R() * 0.55, 1.15, false,
    );
    sys.beltDustMat = beltDust.material as THREE.ShaderMaterial;
    sys.belt.add(beltDust);

    const shades = ['#8d8781', '#726c65', '#9c948b', '#615c55', '#7f766b', '#91867a'];
    const SHAPES = 4, PER_SHAPE = 44;
    for (let s = 0; s < SHAPES; s++) {
      const geo = this.makeRockGeometry(s * 17.31 + 3.7);
      const mat = new THREE.ShaderMaterial({
        vertexShader: asteroidVert, fragmentShader: asteroidFrag,
        uniforms: { uColor: { value: new THREE.Color(shades[s % shades.length]) } },
      });
      const inst = new THREE.InstancedMesh(geo, mat, PER_SHAPE);
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const tumbles: BeltRock[] = [];
      const m = new THREE.Matrix4();
      for (let k = 0; k < PER_SHAPE; k++) {
        const ang = R() * Math.PI * 2;
        const r = beltR - 8 + R() * 16;
        /* R84 — rocks follow the same per-speck inclination as the dust */
        const inc = (R() + R() + R() - 1.5) / 1.5 * 0.34;
        const y = Math.sin(inc) * r + (R() + R() + R() - 1.5) / 1.5 * 1.1;
        const sc = 0.22 + Math.pow(R(), 2.4) * 1.45; /* many pebbles, few boulders */
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * Math.PI * 2, R() * Math.PI * 2, R() * Math.PI * 2));
        const pos = new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r);
        m.compose(pos, q, new THREE.Vector3(sc, sc, sc));
        inst.setMatrixAt(k, m);
        tumbles.push({
          pos, q,
          scale: new THREE.Vector3(sc, sc, sc),
          axis: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(),
          speed: 0.12 + R() * 0.55,
        });
      }
      sys.belt.add(inst);
      sys.beltInst.push({ mesh: inst, tumbles });
    }

    return { root, sys };
  }

  /** Collider + orbit ellipse for one inner world. The ellipse is HIDDEN
      until hover — exactly the home system's grammar (the ring is driven
      only by the pointer, never pinned on). */
  private addInnerColliderAndOrbit(ip: InnerPlanet, root: THREE.Group, rnd: () => number) {
    void rnd;
    const data = ip.data;
    /* hover / click collider — this world is REAL and interactive */
    const pcol = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(data.radius * 1.5, 2.6), 10, 10),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    pcol.userData = { isInner: true, bodyId: `inner:${data.id}` };
    ip.group.add(pcol);
    this.innerColliderList.push(pcol);

    /* orbit ellipse — one full Kepler revolution sampled in fixed angular
       steps (see buildBody), drawn in the system's own frame */
    const pts: number[] = [];
    const phys = calculatePhysics(data);
    const e = phys.eccentricity;
    const speed = data.orbit.speed || 0.01;
    const segments = 256;
    const periodDays = (Math.PI * 2) / speed;
    for (let i = 0; i <= segments; i++) {
      const simStep = (i / segments) * periodDays;
      const pos = calculateKeplerPosition(data.orbit.a, e, data.orbit.phase, data.orbit.incl, simStep, speed, data.orbit.node ?? 0, data.orbit.argP ?? 0);
      pts.push(pos.x, pos.y, pos.z);
    }
    const og = new THREE.BufferGeometry();
    og.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const line = new THREE.LineLoop(og, new THREE.LineBasicMaterial({ color: 0x8ba1c4, transparent: true, opacity: 0, depthWrite: false }));
    line.visible = false;
    root.add(line);
    ip.orbitLine = line;
  }

  /** Per-frame life for one galaxy's isolated inner system — Kepler
      positions, day/night terminators, axial spins, moon circuits and
      tumbling belt rocks. Only runs while the camera is inside the realm
      (the group is invisible otherwise). */
  updateInnerSystem(node: { data: GalaxyData; group: THREE.Group; inner: THREE.Group; innerSys: InnerSystem | null }, dt: number, nodeDist: number) {
    const sys = node.innerSys;
    if (!sys) return;

    /* R94 — THE SCOPE: while the camera is inside this realm, its inner
       system is the universe the driver lives in (one session per tier —
       the swap happens in the tick block; this only declares the want).
       The STAR leads the roster (the dominant mass — its barycenter wobble
       is real physics too); drvPos indexes shift by one accordingly. */
    const scopeId = `galaxy:${node.data.id}`;
    if (this.universeDriverOn) {
      this.driverGalaxyScope = { id: scopeId, bodies: [{ data: sys.starData }, ...sys.planets] };
    }
    /* the session's frame IS the galaxy-local frame (the canon for these
       worlds is seeded in it too) — no rotation conversion, ever */
    const drvPos = this.universeDriverOn && driverState.scopeId === scopeId
      ? driverReadback(this.simDays)
      : null;
    const drvVel = this.universeDriverOn && driverState.scopeId === scopeId
      ? driverVelReadback(this.simDays)
      : null;

    /* the star breathes */
    sys.starUniforms.uTime.value = this.clockT;
    sys.starMesh.rotation.y += dt * 0.15;
    sys.coronaMat.uniforms.uTime.value = this.clockT;
    sys.coronaMat.uniforms.uBoost.value = 0.92 + 0.08 * Math.sin(this.clockT * 0.8);
    /* the corona always faces the camera — the home anchor's plane lives in
       the unrotated scene root, but this one inherits the galaxy node's
       tilt, which used to thin it out and dull the whole aura */
    node.inner.getWorldQuaternion(this._qScratch2).invert();
    sys.corona.quaternion.copy(this._qScratch2).multiply(this.camera.quaternion);

    /* the starlight halo rings live exactly like the anchor's — and keep
       their designed screen size by keying uScale on the star distance
       (the camLen-based driver would blow the points up from this far out) */
    sys.haloA.rotation.y += dt * 0.05;
    sys.haloB.rotation.y -= dt * 0.038;
    const haloScale = Math.max(1, nodeDist) / 90;
    for (const halo of [sys.haloA, sys.haloB]) {
      const hm = halo.material as THREE.ShaderMaterial;
      hm.uniforms.uTime.value = this.clockT;
      hm.uniforms.uOpacity.value = 1;
      hm.uniforms.uScale.value = haloScale;
    }

    node.group.getWorldPosition(this._vScratch3); /* the star's world position */
    /* surface lighting lives in the system's own frame — counter-rotate
       the galaxy node's tilt so the terminators face the local star */
    node.inner.getWorldQuaternion(this._qScratch).invert();
    for (let pi = 0; pi < sys.planets.length; pi++) {
      const p = sys.planets[pi];
      const o = p.data.orbit;
      let pos: { x: number; y: number; z: number };
      /* R94 — THE INNER SEAM: when this galaxy's scope is the active one
         and its readback is fresh, the session drives these worlds (the
         session's frame IS the galaxy-local frame — the canon was seeded
         in it, so no conversion). Stale → the Kepler solve, as at home.
         +1: the star leads the roster. */
      if (drvPos && drvPos.length > pi + 1) {
        pos = { x: drvPos[pi + 1][0], y: drvPos[pi + 1][1], z: drvPos[pi + 1][2] };
        if (pi === 0) {
          /* the star rides its real barycenter wobble — and everything
             anchored to it follows (a 10 M☉ companion makes this BIG) */
          sys.starMesh.position.set(drvPos[0][0], drvPos[0][1], drvPos[0][2]);
          sys.corona.position.copy(sys.starMesh.position);
          sys.haloA.position.copy(sys.starMesh.position);
          sys.haloB.position.copy(sys.starMesh.position);
          sys.belt.position.copy(sys.starMesh.position);
        }
      } else {
        const phys = calculatePhysics(p.data, this.simDays);
        pos = calculateKeplerPosition(o.a, phys.eccentricity, o.phase, o.incl, this.simDays, o.speed || 0.01, o.node ?? 0, o.argP ?? 0);
      }
      p.group.position.set(pos.x, pos.y, pos.z);

      /* hover pulse — the pointer's world swells gently, like home */
      const hoverTarget = this.hoveredId === `inner:${p.data.id}` ? 1 : 0;
      p.hoverT += (hoverTarget - p.hoverT) * Math.min(1, dt * 8);
      p.group.scale.setScalar((1 + p.hoverT * 0.045) * this.kamuiSwallowFactorFor(p.group));

      /* sun direction — world vector from the planet back to its star */
      p.group.getWorldPosition(this._vScratch2);
      this._vScratch1.copy(this._vScratch2).sub(this._vScratch3).normalize().multiplyScalar(-1);
      this._vDirScratch.copy(this._vScratch1).applyQuaternion(this._qScratch);
      /* Round 54/55 — geodesic uniforms ride the late-tick pass (see tick);
         the old lattice-ring spin is erased with the rings themselves */
      if (p.mat) {
        if (p.mat.uniforms.uSunDir) (p.mat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vDirScratch);
        if (p.mat.uniforms.uTear) p.mat.uniforms.uTear.value = 0;
        if (p.mat.uniforms.uTearTime) p.mat.uniforms.uTearTime.value = this.clockT;
        this.applyKamuiFieldUniforms(p.mat);
        this.setKamuiLocalCenter(p.mat, p.spinMesh);
        p.mat.uniforms.uTime.value = this.clockT;
        /* the edge nebula's raymarch needs the camera in its own local space */
        if (p.mat.uniforms.uCamLocalP) {
          this._vScratch1.copy(this.camera.position);
          p.group.worldToLocal(this._vScratch1);
          (p.mat.uniforms.uCamLocalP.value as THREE.Vector3).copy(this._vScratch1);
        }
      }
      if (p.spinMesh && p.spinRate) p.spinMesh.rotation.y += dt * p.spinRate;
      if (p.cloudMat) {
        p.cloudMat.uniforms.uTime.value = this.clockT;
        (p.cloudMat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vDirScratch);
        if (p.cloudMat.uniforms.uTear) p.cloudMat.uniforms.uTear.value = 0;
        this.applyKamuiFieldUniforms(p.cloudMat);
      }
      if (p.cloudMesh && p.cloudSpinRate) p.cloudMesh.rotation.y += dt * p.cloudSpinRate;
      if (p.atmo) {
        const atmoMat = p.atmo.material as THREE.ShaderMaterial;
        (atmoMat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vDirScratch);
        if (atmoMat.uniforms.uTear) atmoMat.uniforms.uTear.value = 0;
        this.applyKamuiFieldUniforms(atmoMat);
      }
      if (p.ringMat) {
        p.ringMesh!.getWorldQuaternion(this._qScratch2).invert();
        (p.ringMat.uniforms.uSunLocal.value as THREE.Vector3).copy(this._vScratch1).applyQuaternion(this._qScratch2);
        this.applyKamuiFieldUniforms(p.ringMat);
        this.setKamuiLocalCenter(p.ringMat, p.ringMesh);
      }
      p.moons.forEach((m) => {
        /* R95 — MOONS RIDE PARENTS (the R93 amendment, galaxy frame): the
           closed-form ornament is the permanent moon law — each moon rides
           its planet's session position with its own inclined plane. */
        const ma = m.phase + this.simDays * m.speed;
        /* same R84 moon planes in the isolated systems — own tilt, own node */
        const mp = tiltInPlaneVector(Math.cos(ma) * m.a, Math.sin(ma) * m.a, m.incl ?? 0, m.node ?? 0);
        m.mesh.position.set(
          mp.x,
          mp.y + Math.sin(ma * 0.7) * m.a * 0.12 * Math.cos(m.incl ?? 0),
          mp.z,
        );
      });

      /* orbit ring — driven ONLY by hover, exactly like the home system */
      if (p.orbitLine) {
        const op = p.hoverT * 0.22;
        (p.orbitLine.material as THREE.LineBasicMaterial).opacity = op;
        p.orbitLine.visible = op > 0.01;
      }

      /* the streak ring — alive whenever this world has been written on */
      if (p.streakRing) {
        const mat = p.streakRing.material as THREE.MeshBasicMaterial;
        const st = p.streakTarget ?? 0;
        const days = p.streakDays ?? 0;
        const target = days > 0 ? Math.min(0.95, 0.22 + 0.16 * st + 0.02 * days) : 0;
        mat.opacity += (target - mat.opacity) * Math.min(1, dt * 3.5);
        const breath = 1 + 0.022 * Math.sin(this.clockT * 1.8 + p.data.id.length);
        p.streakRing.scale.setScalar(breath);
        p.streakRing.visible = mat.opacity > 0.02;
      }
    }

    /* R95 — the living rings, inner edition: 1 Hz osculating rebuild while
       this scope drives fresh (rings follow the session); canon restore
       once when the scope rests on the clockwork. */
    if (drvPos) {
      if (drvVel && this.clockT - (sys.oscAt ?? 0) > 1) {
        sys.oscAt = this.clockT;
        sys.oscCanonDirty = true;
        for (let pi = 0; pi < sys.planets.length; pi++) {
          const p = sys.planets[pi];
          if (!p.orbitLine || !p.orbitLine.visible) continue;
          if (drvPos.length <= pi + 1 || drvVel.length <= pi + 1) continue;
          this.rebuildOrbitLineFromState(p.orbitLine, drvPos[pi + 1], drvVel[pi + 1], drvPos[0]);
        }
      }
    } else if (sys.oscCanonDirty) {
      sys.oscCanonDirty = false;
      for (const p of sys.planets) {
        if (p.orbitLine) this.rebuildOrbitLineToCanon(p.orbitLine, p.data);
      }
    }

    /* the belt — slow revolution + tumbling rocks; the dust keeps the home
       belt's designed screen size by keying uScale on the star distance
       (the camLen-based driver would blow the points up from this far out) */
    sys.belt.rotation.y = this.simDays * 0.0016;
    sys.beltInst.forEach(({ mesh, tumbles }) => {
      for (let k = 0; k < tumbles.length; k++) {
        const t = tumbles[k];
        t.q.multiply(this._rockQ.setFromAxisAngle(t.axis, t.speed * dt));
        this._rockM.compose(t.pos, t.q, t.scale);
        mesh.setMatrixAt(k, this._rockM);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
    sys.beltDustMat.uniforms.uScale.value = Math.max(1, nodeDist) / 90;
    sys.beltDustMat.uniforms.uOpacity.value = 1 - smoothstep(500, 1400, nodeDist);
  }

  /** THE GALAXY CLUSTER / GROUP STAGE — hundreds to thousands of galaxies
      bound by gravity: ~1,000 oriented galaxy smudges in clumped sub-halos,
      glowing hot intracluster gas (tinted by the active reality) and thin
      gravitational lensing arcs bending around the core. */
  cancelGalaxyDive() {
    this.galaxyDive = null;
    this.galaxyInnerFocus = false;
  }

  /** Enter a galaxy with a plain camera zoom: the dial eases from the web
      frame down into the clicked galaxy. For galaxies other than home, the
      camera lands inside that galaxy's own isolated stellar system. */
  beginGalaxyEntry(gal: GalaxyData): boolean {
    if (this.galaxyDive !== null || this.portal.phase !== 'idle' || this.bootIntro || this.kamuiTimer > 0) return false;

    if (this.cosmicStage !== 'web') return false;
    const node = this.galaxyStageNodes.find((n) => n.data.id === gal.id);
    if (!node && !gal.isHomeGalaxy) return false;
    const endInner = !gal.isHomeGalaxy;
    this.galaxyFocusId = endInner ? gal.id : null;
    this.galaxyInnerFocus = false;
    if (endInner) {
      this.galaxyDive = { galaxyId: gal.id, endInner: true };
    }
    this.grabCooldown = 1.25;
    this.rig.clearPan();
    this.rig.setOrbit(null, 1.08);
    this.rig.setZoomTarget(gal.isHomeGalaxy ? 0.15 : CameraRig.zoomTOf(140));
    this.triggerKamui();
    return true;
  }

  /** Dive into a specific major galaxy. EVERY galaxy is a real, isolated
      realm with its own stellar system — so clicking one zooms the camera
      INTO its realm: the disc becomes the sky and the galaxy's own star +
      worlds appear. The home galaxy's realm is the anchor star system with
      all your memory worlds. The galaxy is resolved from the engine's own
      stage (the runtime roster) — the static defaults may not know about
      user-created galaxies. */
  enterGalaxy(realityId: string, galaxyId: string) {
    /* a dive into ANOTHER reality arrives before that reality's roster is
       on the stage (the App switches reality then calls this synchronously).
       Queue the dive — setReality executes it the moment the roster lands. */
    if (this.activeRealityId !== realityId) {
      this.pendingGalaxyEntry = { realityId, galaxyId };
      return;
    }
    const gal =
      this.galaxyStageNodes.find((n) => n.data.id === galaxyId)?.data
      ?? (this.cosmicStage === 'multiverse'
        ? this.galaxyNodes.find((n) => n.galaxyData.id === galaxyId)?.galaxyData
        : undefined);
    if (!gal) return;
    this.focusId = null;
    this.realityFocused = false;
    this.activeGalaxyName = gal.name;
    if (this.cosmicStage === 'multiverse') {
    if (this.cosmicStage === 'multiverse') { this.beginStageWarp('toWeb', CameraRig.zoomTOf(26000), () => { this.galaxyFocusId = gal.id; }); return; }
      this.galaxyFocusId = gal.id;
      this.rig.setZoomTarget(CameraRig.zoomTOf(26000));
      return;
    }
    if (gal.isHomeGalaxy) {
      /* the home realm tears open into the anchor star system */
      this.releaseInnerWorld();
      this.beginGalaxyEntry(gal);
      return;
    }
    /* isolated realm — the focused surface tear dives all the way in. The
       inner-system state is applied only when the flight actually lands. */
    if (this.beginGalaxyEntry(gal)) {
      if (this.innerFocusBodyId) { this.innerFocusBodyId = null; this.cb.onSelectInnerWorld?.(null); }
      this.rig.clearPan();
      this.rig.setOrbit(null, 1.08);
    }
  }

  /** A world inside an isolated inner stellar system was clicked — the
      camera leaves the system center and orbits THIS world, and the App
      gets its full identity for the selection card. */
  selectInnerWorld(id: string) {
    const body = this.findInnerBody(id.slice('inner:'.length));
    if (!body) return;
    this.innerFocusBodyId = body.data.id;
    this.selectedId = id;
    this.cb.onSelectInnerWorld?.({
      galaxyId: body.galaxyId,
      galaxyName: body.galaxyName,
      starName: body.starName,
      body: body.data,
    });
  }

  /** Double-click on an inner body — the home grammar:
      world / nebula → the portal tears open and the DIARY arrives;
      the system's star → the control panel (core mode). */
  activateInner(id: string) {
    const bodyId = id.slice('inner:'.length);
    const body = this.findInnerBody(bodyId);
    if (!body) return;
    if (body.data.kind === 'star') {
      this.selectedId = id;
      this.innerFocusBodyId = null;
      this.cb.onActivate('anchor'); /* the realm's control panel */
      return;
    }
    this.selectedId = id;
    /* swing the orbit onto this world so the portal dive lands on it */
    this.innerFocusBodyId = body.data.id;
    this.beginPortal({ data: body.data });
  }

  /** Resolve a synthetic inner body (star, world or nebula) by its raw id —
      the `inner:` pick prefix is tolerated so the App's body lookups can
      pass hover/selection ids straight through. */
  getInnerBody(bodyId: string): CosmicBody | null {
    const raw = bodyId.startsWith('inner:') ? bodyId.slice('inner:'.length) : bodyId;
    return this.findInnerBody(raw)?.data ?? null;
  }
  findInnerBody(bodyId: string): { data: CosmicBody; galaxyId: string; galaxyName: string; starName: string } | null {
    for (const node of this.galaxyStageNodes) {
      const sys = node.innerSys;
      if (!sys) continue;
      if (sys.starData.id === bodyId) {
        return { data: sys.starData, galaxyId: node.data.id, galaxyName: node.data.name, starName: sys.starData.name };
      }
      const planet = sys.planets.find((p) => p.data.id === bodyId);
      if (planet) {
        return { data: planet.data, galaxyId: node.data.id, galaxyName: node.data.name, starName: sys.starData.name };
      }
    }
    return null;
  }

  /** Leave a clicked inner world — back to orbiting the system's star. */
  releaseInnerWorld() {
    if (!this.innerFocusBodyId) return;
    this.innerFocusBodyId = null;
    this.selectedId = null;
    /* zoom back out to the system frame (the depth the dive landed at) */
    this.rig.setZoomTarget(CameraRig.zoomTOf(150));
    this.cb.onSelectInnerWorld?.(null);
  }
}
