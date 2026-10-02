/* R97 — THE SKY SUBSYSTEM. Extracted verbatim from the UniverseEngine monolith:
   the shooting meteors, the Cosmic Echo shower (one golden streak per on-this-day
   memory), the sentiment aurora, and the planet-surface dressing (terrain + sky
   dome + ground particles). The engine composes this class and feeds it the
   shared runtime through the `eng` handle; every engine-owned member it touches
   is reached by a name-preserving getter below, so the moved bodies read exactly
   as they did inside engine.ts. Owns: meteors, echo, aurora, surface meshes. */
import * as THREE from 'three';
import { makeGlowTexture, smoothstep, cpuFbm } from '../math';
import { terrainVert, terrainFrag, skyFrag } from '../shaders';
import { MOOD_HEX, type AuroraSignal } from '../../platform/sentiment/sentiment';
import type { RuntimeBody, UniverseEngine } from '../engine';

export interface ShootingMeteor {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  len: number;
  life: number;
  maxLife: number;
  headSprite: THREE.Sprite;
  line: THREE.Line;
  lineGeom: THREE.BufferGeometry;
  size: number;
}

export class SkyFxSystem {
  constructor(private eng: UniverseEngine) {}

  /* ---- the shared runtime (engine-owned; name-preserving access) ---- */
  private get scene(): THREE.Scene { return this.eng.scene; }
  private get camera(): THREE.Camera { return this.eng.camera; }
  private get pointer(): THREE.Vector2 { return this.eng.pointer; }
  private get raycaster(): THREE.Raycaster { return this.eng.raycaster; }
  private get bootIntro(): boolean { return this.eng.bootIntro; }
  private get clockT(): number { return this.eng.clockT; }
  private get echoHoverId(): string | null { return this.eng.echoHoverId; }
  private get _vScratch1(): THREE.Vector3 { return this.eng._vScratch1; }
  private get _vScratch2(): THREE.Vector3 { return this.eng._vScratch2; }
  private get coronaMat(): THREE.ShaderMaterial { return this.eng.coronaMat; }
  private currentDist(): number { return this.eng.currentDist(); }
  private focusBody(): RuntimeBody | null { return this.eng.focusBody(); }
  /* NOTE: no `lens = false` default here on purpose — round17 pins the count of
     rigid defaults at exactly 2 (the engine's makePoints + pointsMaterial), and
     this pass-through must not read as a third lens-able cloud factory. */
  private makePoints(count: number, posFn: (i: number, arr: Float32Array) => void, sizeFn: (i: number) => number, colFn: (i: number) => [number, number, number], alphaFn: (i: number) => number, px: number, twinkle: boolean, lens?: boolean): THREE.Points {
    return this.eng.makePoints(count, posFn, sizeFn, colFn, alphaFn, px, twinkle, lens === true);
  }

  /* ---- owned state (moved verbatim) ---- */
  private meteors: ShootingMeteor[] = [];
  echoMeteors: (ShootingMeteor & { entryId: string; planetId: string; title: string })[] = [];
  private echoArmedDay = '';
  private echoGroup: THREE.Group | null = null;
  private echoColliders: THREE.Sprite[] = [];
  private auroraTarget: AuroraSignal | null = null;
  private auroraCur = { maskA: 0, maskB: 0, intensity: 0, storm: 0, echo: 0 };
  private auroraColA = new THREE.Color('#f2c178');
  private auroraColB = new THREE.Color('#7fc4e8');
  private surface = new THREE.Group();
  private surfaceQuat = new THREE.Quaternion();
  private surfaceLocked = false;
  private surfaceMat!: THREE.ShaderMaterial;
  private skyMat!: THREE.ShaderMaterial;
  private surfaceParticlesMat!: THREE.ShaderMaterial;
  /** the planet-surface blend — updateLevels reads it for the surface label */
  surfaceBlend = 0;

  buildMeteors() {
    const headTex = makeGlowTexture(128, [
      [0, 'rgba(255,255,255,1)'],
      [0.2, 'rgba(180,240,255,0.9)'],
      [0.5, 'rgba(100,200,255,0.4)'],
      [1, 'rgba(60,140,255,0)'],
    ]);
    const R = Math.random;
    for (let i = 0; i < 40; i++) {
      const headMat = new THREE.SpriteMaterial({ map: headTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
      const headSprite = new THREE.Sprite(headMat);

      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      lineGeom.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 0.2, 0.5, 1], 3));
      const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      const line = new THREE.Line(lineGeom, lineMat);

      const g = new THREE.Group();
      g.add(headSprite); g.add(line);
      this.scene.add(g);

      const m: ShootingMeteor = {
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), len: 1, life: 0, maxLife: 1,
        headSprite, line, lineGeom, size: 1,
      };
      this.resetMeteor(m);
      m.life = R() * m.maxLife; // stagger initial life times
      this.meteors.push(m);
    }

    /* THE COSMIC ECHO POOL — eight head-glow sprites waiting for today's
       on-this-day memories. Inert until armEchoShower() fills them. */
    const echoGroup = new THREE.Group();
    echoGroup.visible = false;
    for (let i = 0; i < 8; i++) {
      const echoTex = makeGlowTexture(128, [
        [0, 'rgba(255,250,235,1)'],
        [0.2, 'rgba(255,236,180,0.95)'],
        [0.5, 'rgba(242,193,120,0.5)'],
        [1, 'rgba(242,193,120,0)'],
      ]);
      const headSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: echoTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      lineGeom.setAttribute('color', new THREE.Float32BufferAttribute([1, 0.92, 0.7, 0.9, 0.6, 0.3], 3));
      const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      const g = new THREE.Group();
      g.add(headSprite); g.add(line);
      echoGroup.add(g);
      const echo = {
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), len: 1, life: 0, maxLife: 1,
        headSprite, line, lineGeom, size: 1,
        entryId: '', planetId: '', title: '',
      };
      this.echoMeteors.push(echo);
      this.echoColliders.push(headSprite);
      (headSprite as THREE.Sprite & { echoEntryId?: string }).echoEntryId = '';
    }
    this.scene.add(echoGroup);
    this.echoGroup = echoGroup;
  }

  private resetEchoMeteor(m: (ShootingMeteor & { entryId: string; planetId: string; title: string }), far: boolean) {
    const R = Math.random;
    /* echo meteors live in the intimate shell — 220..520 units — so they
       read at system scale and are actually clickable */
    const r = 240 + R() * 280;
    const theta = R() * Math.PI * 2, phi = Math.acos(2 * R() - 1);
    m.pos.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.6, r * Math.sin(phi) * Math.sin(theta));
    const speed = 14 + R() * 30;
    const dir = new THREE.Vector3((R() - 0.5) * 2, (R() - 0.5) * 0.5, (R() - 0.5) * 2).normalize();
    m.vel.copy(dir).multiplyScalar(speed);
    m.len = 10 + R() * 26;
    m.life = far ? -R() * 26 : 0;
    m.maxLife = 14 + R() * 10;
    m.size = 2.2 + R() * 2.2;
    m.headSprite.scale.setScalar(m.size);
  }

  private resetMeteor(m: ShootingMeteor) {
    const R = Math.random;
    const r = 180 + R() * 220000;
    const theta = R() * Math.PI * 2, phi = Math.acos(2 * R() - 1);
    m.pos.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.5, r * Math.sin(phi) * Math.sin(theta));
    const speed = 400 + R() * 3200;
    const dir = new THREE.Vector3((R() - 0.5) * 2, (R() - 0.5) * 0.8, (R() - 0.5) * 2).normalize();
    m.vel.copy(dir).multiplyScalar(speed);
    m.len = 120 + R() * 1100;
    m.life = 0;
    m.maxLife = 1.2 + R() * 3.5;
    m.size = Math.max(6, r * 0.007);
    m.headSprite.scale.setScalar(m.size);
  }

  updateMeteors(dt: number) {
    /* the meteors sleep through the birth — absolute darkness comes first */
    if (this.bootIntro && this.clockT < 2.4) {
      this.meteors.forEach((m) => { m.headSprite.visible = false; m.line.visible = false; });
      this.updateEchoMeteors(dt);
      return;
    }
    this.meteors.forEach((m) => {
      m.headSprite.visible = true; m.line.visible = true;
      m.life += dt;
      if (m.life >= m.maxLife) {
        this.resetMeteor(m);
        return;
      }
      m.pos.addScaledVector(m.vel, dt);
      m.headSprite.position.copy(m.pos);

      const tail = m.pos.clone().sub(m.vel.clone().normalize().multiplyScalar(m.len));
      const attr = m.lineGeom.getAttribute('position') as THREE.BufferAttribute;
      attr.setXYZ(0, m.pos.x, m.pos.y, m.pos.z);
      attr.setXYZ(1, tail.x, tail.y, tail.z);
      attr.needsUpdate = true;

      const fade = Math.sin((m.life / m.maxLife) * Math.PI);
      m.headSprite.material.opacity = fade * 0.95;
      (m.line.material as THREE.LineBasicMaterial).opacity = fade * 0.8;
    });
    this.updateEchoMeteors(dt);
  }

  /* THE COSMIC ECHO — each armed meteor is one memory from this calendar day
     in an earlier year. Slow, golden, close to home. Click one to reopen the
     page it remembers. The shower runs all day; meteors respawn. */
  private updateEchoMeteors(dt: number) {
    if (!this.echoGroup) return;
    const active = this.echoMeteors.some((m) => m.entryId !== '');
    this.echoGroup.visible = active;
    if (!active) return;
    let anyVisible = false;
    for (const m of this.echoMeteors) {
      if (m.entryId === '') { m.headSprite.visible = false; m.line.visible = false; continue; }
      m.life += dt;
      if (m.life >= m.maxLife) { this.resetEchoMeteor(m, true); continue; }
      if (m.life < 0) { m.headSprite.visible = false; m.line.visible = false; continue; }
      anyVisible = true;
      m.headSprite.visible = true; m.line.visible = true;
      m.pos.addScaledVector(m.vel, dt);
      m.headSprite.position.copy(m.pos);
      const tail = m.pos.clone().sub(m.vel.clone().normalize().multiplyScalar(m.len));
      const attr = m.lineGeom.getAttribute('position') as THREE.BufferAttribute;
      attr.setXYZ(0, m.pos.x, m.pos.y, m.pos.z);
      attr.setXYZ(1, tail.x, tail.y, tail.z);
      attr.needsUpdate = true;
      const fade = Math.min(1, Math.sin((m.life / m.maxLife) * Math.PI) * 1.4);
      const hoverGlow = this.echoHoverId === m.entryId ? 1 : 0;
      m.headSprite.material.opacity = fade * (0.8 + hoverGlow * 0.2);
      m.headSprite.scale.setScalar(m.size * (1 + hoverGlow * 0.5));
      (m.line.material as THREE.LineBasicMaterial).opacity = fade * 0.85;
    }
    this.echoGroup.visible = anyVisible;
  }

  /** Arm today's shower — one entry per meteor, up to 8 (App computes the echoes).
      Idempotent: re-arming with the same memory set on the same day is a no-op,
      so diary edits never restart the shower. */
  armEchoShower(echoes: { entryId: string; planetId: string; title: string }[]): void {
    const dayKey = new Date().toDateString();
    const sig = `${dayKey}::${echoes.map((e) => e.entryId).join(',')}`;
    if (sig === this.echoArmedDay) return;
    this.echoArmedDay = sig;
    this.echoMeteors.forEach((m, i) => {
      const e = echoes[i];
      if (!e) { m.entryId = ''; (m.headSprite as THREE.Sprite & { echoEntryId?: string }).echoEntryId = ''; return; }
      m.entryId = e.entryId;
      m.planetId = e.planetId;
      m.title = e.title;
      (m.headSprite as THREE.Sprite & { echoEntryId?: string }).echoEntryId = e.entryId;
      this.resetEchoMeteor(m, i > 0); /* the first streaks immediately */
    });
  }

  /** Which echo meteor is under the pointer, if any. */
  pickEcho(): string | null {
    if (!this.echoGroup || !this.echoGroup.visible) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.raycaster.far = this.currentDist() * 3 + 120;
    const visible = this.echoColliders.filter((s) => s.visible && s.parent?.visible);
    if (!visible.length) return null;
    const hits = this.raycaster.intersectObjects(visible, false);
    for (const h of hits) {
      const id = (h.object as THREE.Sprite & { echoEntryId?: string }).echoEntryId;
      if (id) return id;
    }
    return null;
  }

  /* ------------------------- the sentiment aurora ------------------------- */

  /** Feed the latest recency-weighted mood spectrum (from src/sentiment). */
  setSentimentAurora(signal: AuroraSignal): void {
    this.auroraTarget = signal;
  }

  updateAurora(dt: number): void {
    if (!this.coronaMat) return;
    const t = this.auroraTarget;
    const cur = this.auroraCur;
    if (t) {
      /* two strongest mood colors drive the band */
      let iA = 0, iB = 1;
      const w = t.weights;
      for (let i = 1; i < w.length; i++) if (w[i] > w[iA]) iA = i;
      for (let i = 0; i < w.length; i++) if (i !== iA && w[i] > w[iB]) iB = i;
      this.auroraColA.set(MOOD_HEX[iA]);
      this.auroraColB.set(MOOD_HEX[iB]);
      const k = Math.min(1, dt * 1.6);
      cur.maskA += (w[iA] - cur.maskA) * k;
      cur.maskB += (w[iB] - cur.maskB) * k;
      cur.intensity += (t.intensity - cur.intensity) * k;
      cur.storm += (t.storm - cur.storm) * k;
    }
    cur.echo += ((this.echoMeteors.some((m) => m.entryId !== '' && m.life > 0) ? 0.55 : 0) - cur.echo) * Math.min(1, dt * 2);
    const u = this.coronaMat.uniforms;
    (u.uAuroraA.value as THREE.Color).copy(this.auroraColA);
    (u.uAuroraB.value as THREE.Color).copy(this.auroraColB);
    u.uAuroraMaskA.value = cur.maskA;
    u.uAuroraMaskB.value = cur.maskB;
    u.uAuroraIntensity.value = cur.intensity;
    u.uAuroraStorm.value = cur.storm;
    u.uEchoBloom.value = cur.echo;
  }

  buildSurface() {
    const geo = new THREE.PlaneGeometry(90, 90, 140, 140);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = cpuFbm(x * 0.055 + 3.1, z * 0.055 + 7.7) * 2.4 + cpuFbm(x * 0.19, z * 0.19) * 0.55;
      const curv = (x * x + z * z) / 2.05;
      pos.setY(i, 1 + h * 0.32 - curv * 0.011);
    }
    geo.computeVertexNormals();
    this.surfaceMat = new THREE.ShaderMaterial({
      uniforms: {
        uDeep: { value: new THREE.Color('#0b2d4d') }, uBase: { value: new THREE.Color('#1f6e52') },
        uHigh: { value: new THREE.Color('#9db88a') }, uIce: { value: new THREE.Color('#eef6ff') },
        uSunDir: { value: new THREE.Vector3(1, 0.2, 0) }, uFog: { value: new THREE.Color('#7fc4e8') },
        uFogDensity: { value: 0.02 },
      },
      vertexShader: terrainVert, fragmentShader: terrainFrag,
    });
    const terrain = new THREE.Mesh(geo, this.surfaceMat);
    this.surface.add(terrain);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color('#0a1e38') }, uHorizon: { value: new THREE.Color('#7fc4e8') },
        uSunDir: { value: new THREE.Vector3(1, 0.2, 0) },
      },
      vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.0); }`,
      fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 20), this.skyMat);
    this.surface.add(sky);

    const R = Math.random;
    const parts = this.makePoints(
      320,
      (i, a) => { a[i * 3] = (R() - 0.5) * 60; a[i * 3 + 1] = 1 + R() * 7; a[i * 3 + 2] = (R() - 0.5) * 60; },
      () => 0.35 + R() * 0.6, () => [0.85, 0.92, 1] as [number, number, number], () => 0.25 + R() * 0.4, 1.1, true,
    );
    this.surfaceParticlesMat = parts.material as THREE.ShaderMaterial;
    this.surface.add(parts);

    this.surface.visible = false;
    this.scene.add(this.surface);
  }

  updateSurface(dt: number) {
    const fb = this.focusBody();
    let s = 0;
    if (fb && (fb.data.kind === 'planet' || fb.data.kind === 'dwarf')) {
      const dist = this.currentDist();
      const r = fb.data.radius;
      s = 1 - smoothstep(r * 1.9, r * 2.7, dist);
    }
    this.surfaceBlend += (s - this.surfaceBlend) * Math.min(1, dt * 4);
    const active = this.surfaceBlend > 0.02;
    this.surface.visible = active;
    if (!active) { this.surfaceLocked = false; return; }
    if (fb) {
      if (!this.surfaceLocked && this.surfaceBlend > 0.06) {
        this._vScratch1.copy(this.camera.position).sub(fb.group.position).normalize();
        this.surfaceQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this._vScratch1);
        this.surfaceLocked = true;
      }
      this.surface.position.copy(fb.group.position);
      this.surface.quaternion.slerp(this.surfaceQuat, Math.min(1, dt * 6));
      this.surface.scale.setScalar(fb.data.radius);
      const p = fb.data.palette;
      (this.surfaceMat.uniforms.uDeep.value as THREE.Color).set(p.deep);
      (this.surfaceMat.uniforms.uBase.value as THREE.Color).set(p.base);
      (this.surfaceMat.uniforms.uHigh.value as THREE.Color).set(p.high);
      (this.surfaceMat.uniforms.uIce.value as THREE.Color).set(p.ice);
      (this.skyMat.uniforms.uHorizon.value as THREE.Color).set(p.atmo);
      (this.skyMat.uniforms.uZenith.value as THREE.Color).set(p.deep);
      /* world-space sun direction (terrain normals are world-space) */
      this._vScratch2.copy(fb.group.position).multiplyScalar(-1).normalize();
      (this.surfaceMat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch2);
      (this.skyMat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch2);
      this.surfaceMat.uniforms.uFogDensity.value = 0.03 / fb.data.radius;
      (this.surfaceMat.uniforms.uFog.value as THREE.Color).set(p.atmo).multiplyScalar(0.75);
      this.surfaceParticlesMat.uniforms.uOpacity.value = this.surfaceBlend;
    }
    /* hide planet mesh under surface — but NEVER fade it transparent: the
       sphere stays fully solid through the entire approach, and only swaps
       off at the very end when the surface sky has completely taken over.
       When landed, the planet's SHELL furniture (atmosphere, clouds, rings,
       moons) vanishes too — a translucent atmosphere floating where the
       solid horizon used to be reads as an X-ray planet. */
    const landed = this.surfaceBlend > 0.92;
    if (fb) {
      if (fb.mat && fb.mat.uniforms.uFade) {
        fb.mat.uniforms.uFade.value = landed ? 0 : fb.mat.uniforms.uFade.value;
      }
      if (fb.atmo) fb.atmo.visible = fb.atmo.visible && !landed;
      if (fb.cloudMesh) fb.cloudMesh.visible = fb.cloudMesh.visible && !landed;
      if (fb.ringMesh) fb.ringMesh.visible = fb.ringMesh.visible && !landed;
      fb.moons.forEach((m) => { m.mesh.visible = m.mesh.visible && !landed; });
    }
  }

  /** The engine's dispose sequence calls this at the exact position the echo
      teardown occupied inside engine.dispose(). */
  dispose(): void {
    if (this.echoGroup) {
      this.scene.remove(this.echoGroup);
      this.echoGroup.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | undefined;
        if (mat) mat.dispose();
      });
      this.echoGroup = null;
    }
    this.echoMeteors = [];
    this.echoColliders = [];
  }
}
