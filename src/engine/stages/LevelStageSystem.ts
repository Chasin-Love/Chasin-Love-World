/* R97 — THE STAGE SUBSYSTEM. Extracted verbatim from the UniverseEngine
   monolith: the multiverse builder (reality marbles, the giant boundary, the
   demon core's tesseract), the cosmic level stages (galaxy/cluster/supercluster/
   web content, the galaxy stage nodes with their isolated inner systems), the
   intro marble, the per-frame stage arbiter (updateLevels — scale labels, the
   R95 dive hysteresis, realm windows, membrane shimmer) and the level opacity
   writer. This is a BEHAVIOR extraction: the stage fields stay ENGINE-owned
   (the shell's tick, updateBodies, the picker and every other subsystem read
   them), and the moved bodies reach all of them through generated
   name-preserving getter/setter pairs over the eng handle — every moved line
   reads exactly as it did inside engine.ts. */
import * as THREE from 'three';
import {
  starVert, starFrag, planetVert, planetFrag, cloudFrag, atmoFrag,
  ringVert, ringFrag, nebulaVert, nebulaFrag, pointsVert, pointsFrag,
  demonCoreVert, demonCoreFrag, multiverseBoundaryVert, multiverseBoundaryFrag,
  coronaVert, coronaFrag,
} from '../shaders';
import { makeGlowTexture, hash, smoothstep, windowFn } from '../math';
import { CameraRig } from '../cameraRig';
import { HIERARCHY_DIALS } from '../../realities/hierarchyStages';
import { generateStellarSystemForGalaxy } from '../../realities/galaxyGenerator';
import { calculateKeplerPosition } from '../../physics/physicsEngine';
import type { CosmicBody } from '../../domain/universe';
import { REALITIES, type GalaxyClusterData, type GalaxyData, type RealityConfig } from '../../realities';
import {
  WEB_CEILING,
  MULTIVERSE_FLOOR_CLAMP, MULTIVERSE_FLOOR_RETURN, REALITY_FLOOR,
} from '../systems/stageThresholds';
import { SCALE_BANDS, highScaleLabel } from '../systems/levelSystem';
import type { InnerSystem, RuntimeBody, UniverseEngine } from '../engine';
import { perfMark, perfMeasure } from '../../platform/performance';

export class LevelStageSystem {
  constructor(private eng: UniverseEngine) {}

  private get _vDirScratch(): UniverseEngine['_vDirScratch'] { return this.eng._vDirScratch; }
  private get _vScratch2(): UniverseEngine['_vScratch2'] { return this.eng._vScratch2; }
  private get activeGalaxyName(): UniverseEngine['activeGalaxyName'] { return this.eng.activeGalaxyName; }
  private get activeRealityId(): UniverseEngine['activeRealityId'] { return this.eng.activeRealityId; }
  private get activeRealityShieldMesh(): UniverseEngine['activeRealityShieldMesh'] { return this.eng.activeRealityShieldMesh; }
  private set activeRealityShieldMesh(v: UniverseEngine['activeRealityShieldMesh']) { this.eng.activeRealityShieldMesh = v; }
  private get astralCoreGroup(): UniverseEngine['astralCoreGroup'] { return this.eng.astralCoreGroup; }
  private set astralCoreGroup(v: UniverseEngine['astralCoreGroup']) { this.eng.astralCoreGroup = v; }
  private get astralCoreHalo(): UniverseEngine['astralCoreHalo'] { return this.eng.astralCoreHalo; }
  private set astralCoreHalo(v: UniverseEngine['astralCoreHalo']) { this.eng.astralCoreHalo = v; }
  private get astralCoreMats(): UniverseEngine['astralCoreMats'] { return this.eng.astralCoreMats; }
  private set astralCoreMats(v: UniverseEngine['astralCoreMats']) { this.eng.astralCoreMats = v; }
  private get astralCoreRings(): UniverseEngine['astralCoreRings'] { return this.eng.astralCoreRings; }
  private set astralCoreRings(v: UniverseEngine['astralCoreRings']) { this.eng.astralCoreRings = v; }
  private get beacon(): UniverseEngine['beacon'] { return this.eng.beacon; }
  private set beacon(v: UniverseEngine['beacon']) { this.eng.beacon = v; }
  private get bhSys(): UniverseEngine['bhSys'] { return this.eng.bhSys; }
  private get bootIntro(): UniverseEngine['bootIntro'] { return this.eng.bootIntro; }
  private buildExoplanetPlates(...args: Parameters<UniverseEngine['buildExoplanetPlates']>): ReturnType<UniverseEngine['buildExoplanetPlates']> { return this.eng.buildExoplanetPlates(...args); }
  private buildInnerStellarSystem(...args: Parameters<UniverseEngine['buildInnerStellarSystem']>): ReturnType<UniverseEngine['buildInnerStellarSystem']> { return this.eng.buildInnerStellarSystem(...args); }
  private get camera(): UniverseEngine['camera'] { return this.eng.camera; }
  private get cb(): UniverseEngine['cb'] { return this.eng.cb; }
  private get clockT(): UniverseEngine['clockT'] { return this.eng.clockT; }
  private get clouds(): UniverseEngine['clouds'] { return this.eng.clouds; }
  private get clusterGasMats(): UniverseEngine['clusterGasMats'] { return this.eng.clusterGasMats; }
  private set clusterGasMats(v: UniverseEngine['clusterGasMats']) { this.eng.clusterGasMats = v; }
  private collectPointsMaterials(...args: Parameters<UniverseEngine['collectPointsMaterials']>): ReturnType<UniverseEngine['collectPointsMaterials']> { return this.eng.collectPointsMaterials(...args); }
  private get coreHoverT(): UniverseEngine['coreHoverT'] { return this.eng.coreHoverT; }
  private set coreHoverT(v: UniverseEngine['coreHoverT']) { this.eng.coreHoverT = v; }
  private get corePulseOrbs(): UniverseEngine['corePulseOrbs'] { return this.eng.corePulseOrbs; }
  private set corePulseOrbs(v: UniverseEngine['corePulseOrbs']) { this.eng.corePulseOrbs = v; }
  private get coreStabilizerBeamMat(): UniverseEngine['coreStabilizerBeamMat'] { return this.eng.coreStabilizerBeamMat; }
  private set coreStabilizerBeamMat(v: UniverseEngine['coreStabilizerBeamMat']) { this.eng.coreStabilizerBeamMat = v; }
  private get coreStabilizerBeams(): UniverseEngine['coreStabilizerBeams'] { return this.eng.coreStabilizerBeams; }
  private set coreStabilizerBeams(v: UniverseEngine['coreStabilizerBeams']) { this.eng.coreStabilizerBeams = v; }
  private get cosmicStage(): UniverseEngine['cosmicStage'] { return this.eng.cosmicStage; }
  private currentDist(...args: Parameters<UniverseEngine['currentDist']>): ReturnType<UniverseEngine['currentDist']> { return this.eng.currentDist(...args); }
  private get demonCoreCollider(): UniverseEngine['demonCoreCollider'] { return this.eng.demonCoreCollider; }
  private set demonCoreCollider(v: UniverseEngine['demonCoreCollider']) { this.eng.demonCoreCollider = v; }
  private get demonCoreGroup(): UniverseEngine['demonCoreGroup'] { return this.eng.demonCoreGroup; }
  private set demonCoreGroup(v: UniverseEngine['demonCoreGroup']) { this.eng.demonCoreGroup = v; }
  private get demonCoreInnerGeom(): UniverseEngine['demonCoreInnerGeom'] { return this.eng.demonCoreInnerGeom; }
  private set demonCoreInnerGeom(v: UniverseEngine['demonCoreInnerGeom']) { this.eng.demonCoreInnerGeom = v; }
  private get demonCoreJets(): UniverseEngine['demonCoreJets'] { return this.eng.demonCoreJets; }
  private set demonCoreJets(v: UniverseEngine['demonCoreJets']) { this.eng.demonCoreJets = v; }
  private get demonCoreLight(): UniverseEngine['demonCoreLight'] { return this.eng.demonCoreLight; }
  private set demonCoreLight(v: UniverseEngine['demonCoreLight']) { this.eng.demonCoreLight = v; }
  private get demonCoreMat(): UniverseEngine['demonCoreMat'] { return this.eng.demonCoreMat; }
  private set demonCoreMat(v: UniverseEngine['demonCoreMat']) { this.eng.demonCoreMat = v; }
  private get demonCorePulseRings(): UniverseEngine['demonCorePulseRings'] { return this.eng.demonCorePulseRings; }
  private set demonCorePulseRings(v: UniverseEngine['demonCorePulseRings']) { this.eng.demonCorePulseRings = v; }
  private get demonCoreRings(): UniverseEngine['demonCoreRings'] { return this.eng.demonCoreRings; }
  private set demonCoreRings(v: UniverseEngine['demonCoreRings']) { this.eng.demonCoreRings = v; }
  private get demonCoreSpires(): UniverseEngine['demonCoreSpires'] { return this.eng.demonCoreSpires; }
  private set demonCoreSpires(v: UniverseEngine['demonCoreSpires']) { this.eng.demonCoreSpires = v; }
  private get demonCoreTachyonNodes(): UniverseEngine['demonCoreTachyonNodes'] { return this.eng.demonCoreTachyonNodes; }
  private set demonCoreTachyonNodes(v: UniverseEngine['demonCoreTachyonNodes']) { this.eng.demonCoreTachyonNodes = v; }
  private get demonCoreTesseract(): UniverseEngine['demonCoreTesseract'] { return this.eng.demonCoreTesseract; }
  private set demonCoreTesseract(v: UniverseEngine['demonCoreTesseract']) { this.eng.demonCoreTesseract = v; }
  private disposeObject3D(...args: Parameters<UniverseEngine['disposeObject3D']>): ReturnType<UniverseEngine['disposeObject3D']> { return this.eng.disposeObject3D(...args); }
  private dropOwnedPointsMaterials(...args: Parameters<UniverseEngine['dropOwnedPointsMaterials']>): ReturnType<UniverseEngine['dropOwnedPointsMaterials']> { return this.eng.dropOwnedPointsMaterials(...args); }
  private get exoPlates(): UniverseEngine['exoPlates'] { return this.eng.exoPlates; }
  private focusBody(...args: Parameters<UniverseEngine['focusBody']>): ReturnType<UniverseEngine['focusBody']> { return this.eng.focusBody(...args); }
  private get gCluster(): UniverseEngine['gCluster'] { return this.eng.gCluster; }
  private get gGalaxy(): UniverseEngine['gGalaxy'] { return this.eng.gGalaxy; }
  private get gGalaxyContents(): UniverseEngine['gGalaxyContents'] { return this.eng.gGalaxyContents; }
  private get gMultiverse(): UniverseEngine['gMultiverse'] { return this.eng.gMultiverse; }
  private get gNeighborhood(): UniverseEngine['gNeighborhood'] { return this.eng.gNeighborhood; }
  private get gSupercluster(): UniverseEngine['gSupercluster'] { return this.eng.gSupercluster; }
  private get gWeb(): UniverseEngine['gWeb'] { return this.eng.gWeb; }
  private get galaxyDiveId(): UniverseEngine['galaxyDiveId'] { return this.eng.galaxyDiveId; }
  private set galaxyDiveId(v: UniverseEngine['galaxyDiveId']) { this.eng.galaxyDiveId = v; }
  private get galaxyFocusId(): UniverseEngine['galaxyFocusId'] { return this.eng.galaxyFocusId; }
  private set galaxyFocusId(v: UniverseEngine['galaxyFocusId']) { this.eng.galaxyFocusId = v; }
  private get galaxyInnerFocus(): UniverseEngine['galaxyInnerFocus'] { return this.eng.galaxyInnerFocus; }
  private set galaxyInnerFocus(v: UniverseEngine['galaxyInnerFocus']) { this.eng.galaxyInnerFocus = v; }
  private get galaxyNodes(): UniverseEngine['galaxyNodes'] { return this.eng.galaxyNodes; }
  private set galaxyNodes(v: UniverseEngine['galaxyNodes']) { this.eng.galaxyNodes = v; }
  private get galaxyStageColliders(): UniverseEngine['galaxyStageColliders'] { return this.eng.galaxyStageColliders; }
  private set galaxyStageColliders(v: UniverseEngine['galaxyStageColliders']) { this.eng.galaxyStageColliders = v; }
  private get galaxyStageNodes(): UniverseEngine['galaxyStageNodes'] { return this.eng.galaxyStageNodes; }
  private set galaxyStageNodes(v: UniverseEngine['galaxyStageNodes']) { this.eng.galaxyStageNodes = v; }
  private get galaxyStagePointMats(): UniverseEngine['galaxyStagePointMats'] { return this.eng.galaxyStagePointMats; }
  private set galaxyStagePointMats(v: UniverseEngine['galaxyStagePointMats']) { this.eng.galaxyStagePointMats = v; }
  private get giantMultiverseBoundaryMat(): UniverseEngine['giantMultiverseBoundaryMat'] { return this.eng.giantMultiverseBoundaryMat; }
  private set giantMultiverseBoundaryMat(v: UniverseEngine['giantMultiverseBoundaryMat']) { this.eng.giantMultiverseBoundaryMat = v; }
  private get giantMultiverseSphereGroup(): UniverseEngine['giantMultiverseSphereGroup'] { return this.eng.giantMultiverseSphereGroup; }
  private set giantMultiverseSphereGroup(v: UniverseEngine['giantMultiverseSphereGroup']) { this.eng.giantMultiverseSphereGroup = v; }
  private get hoveredId(): UniverseEngine['hoveredId'] { return this.eng.hoveredId; }
  private get innerColliderList(): UniverseEngine['innerColliderList'] { return this.eng.innerColliderList; }
  private set innerColliderList(v: UniverseEngine['innerColliderList']) { this.eng.innerColliderList = v; }
  private get innerFocusBodyId(): UniverseEngine['innerFocusBodyId'] { return this.eng.innerFocusBodyId; }
  private set innerFocusBodyId(v: UniverseEngine['innerFocusBodyId']) { this.eng.innerFocusBodyId = v; }
  private get introMarble(): UniverseEngine['introMarble'] { return this.eng.introMarble; }
  private set introMarble(v: UniverseEngine['introMarble']) { this.eng.introMarble = v; }
  private get introMarbleMats(): UniverseEngine['introMarbleMats'] { return this.eng.introMarbleMats; }
  private get introMarbleSprites(): UniverseEngine['introMarbleSprites'] { return this.eng.introMarbleSprites; }
  private get kamuiEase(): UniverseEngine['kamuiEase'] { return this.eng.kamuiEase; }
  private kamuiSwallowFactorFor(...args: Parameters<UniverseEngine['kamuiSwallowFactorFor']>): ReturnType<UniverseEngine['kamuiSwallowFactorFor']> { return this.eng.kamuiSwallowFactorFor(...args); }
  private get kamuiVortexDir(): UniverseEngine['kamuiVortexDir'] { return this.eng.kamuiVortexDir; }
  private get lastEntries(): UniverseEngine['lastEntries'] { return this.eng.lastEntries; }
  private get lastLabel(): UniverseEngine['lastLabel'] { return this.eng.lastLabel; }
  private set lastLabel(v: UniverseEngine['lastLabel']) { this.eng.lastLabel = v; }
  private get levelPointMats(): UniverseEngine['levelPointMats'] { return this.eng.levelPointMats; }
  private get levelSprites(): UniverseEngine['levelSprites'] { return this.eng.levelSprites; }
  private makePoints(...args: Parameters<UniverseEngine['makePoints']>): ReturnType<UniverseEngine['makePoints']> { return this.eng.makePoints(...args); }
  private get marbleRingTex(): UniverseEngine['marbleRingTex'] { return this.eng.marbleRingTex; }
  private set marbleRingTex(v: UniverseEngine['marbleRingTex']) { this.eng.marbleRingTex = v; }
  private get membraneShimmer(): UniverseEngine['membraneShimmer'] { return this.eng.membraneShimmer; }
  private get moonGeo(): UniverseEngine['moonGeo'] { return this.eng.moonGeo; }
  private get moonMat(): UniverseEngine['moonMat'] { return this.eng.moonMat; }
  private get multiverseColliders(): UniverseEngine['multiverseColliders'] { return this.eng.multiverseColliders; }
  private set multiverseColliders(v: UniverseEngine['multiverseColliders']) { this.eng.multiverseColliders = v; }
  private get multiverseMats(): UniverseEngine['multiverseMats'] { return this.eng.multiverseMats; }
  private set multiverseMats(v: UniverseEngine['multiverseMats']) { this.eng.multiverseMats = v; }
  private get realityFocused(): UniverseEngine['realityFocused'] { return this.eng.realityFocused; }
  private get realityGroups(): UniverseEngine['realityGroups'] { return this.eng.realityGroups; }
  private set realityGroups(v: UniverseEngine['realityGroups']) { this.eng.realityGroups = v; }
  private get realityMarbles(): UniverseEngine['realityMarbles'] { return this.eng.realityMarbles; }
  private set realityMarbles(v: UniverseEngine['realityMarbles']) { this.eng.realityMarbles = v; }
  private get rig(): UniverseEngine['rig'] { return this.eng.rig; }
  private get scene(): UniverseEngine['scene'] { return this.eng.scene; }
  private get skyFx(): UniverseEngine['skyFx'] { return this.eng.skyFx; }
  private get surfaceManager(): UniverseEngine['surfaceManager'] { return this.eng.surfaceManager; }
  private syncMoons(...args: Parameters<UniverseEngine['syncMoons']>): ReturnType<UniverseEngine['syncMoons']> { return this.eng.syncMoons(...args); }
  private updateInnerSystem(...args: Parameters<UniverseEngine['updateInnerSystem']>): ReturnType<UniverseEngine['updateInnerSystem']> { return this.eng.updateInnerSystem(...args); }
  private get webLineMat(): UniverseEngine['webLineMat'] { return this.eng.webLineMat; }
  private set webLineMat(v: UniverseEngine['webLineMat']) { this.eng.webLineMat = v; }

  /* ---- the moved bodies (verbatim) ---- */

  buildMultiverse(customRealitiesList?: RealityConfig[]) {
    const R = Math.random;
    const realitiesToBuild = customRealitiesList || REALITIES;
    this.multiverseColliders = [];
    this.galaxyNodes = [];
    this.multiverseMats = [];
    this.realityMarbles = []; /* reset — rebuildMultiverse() must not stack duplicates */
    this.realityGroups = {};
    this.astralCoreGroup = null;
    this.astralCoreMats = [];
    this.astralCoreRings = [];
    this.astralCoreHalo = [];
    this.demonCorePulseRings = [];
    this.demonCoreRings = [];
    this.demonCoreSpires = [];
    this.demonCoreJets = [];
    this.demonCoreTachyonNodes = [];
    this.corePulseOrbs = [];

    /* 0. Giant Sovereign Multiverse Hypersphere Boundary (Enclosing ALL parallel realities & clusters inside) */
    const giantSphereGroup = new THREE.Group();
    const giantRadius = 960000;
    this.giantMultiverseBoundaryMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uKamuiErase: { value: 0 },
        uBreachCrack: { value: 0 },
        uVortexDir: { value: new THREE.Vector3(0, 0, -1) },
        uColorA: { value: new THREE.Color('#06b6d4') },
        uColorB: { value: new THREE.Color('#8b5cf6') },
      },
      vertexShader: multiverseBoundaryVert,
      fragmentShader: multiverseBoundaryFrag,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const giantSphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(giantRadius, 64, 48),
      this.giantMultiverseBoundaryMat
    );
    giantSphereGroup.add(giantSphereMesh);

    // Geodesic Coordinate Latitude / Longitude Latticework Rings
    const giantRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    // Equator Ring
    const equatorRing = new THREE.Mesh(new THREE.TorusGeometry(giantRadius, 1800, 8, 160), giantRingMat);
    giantSphereGroup.add(equatorRing);
    // Polar Meridians
    const meridian1 = new THREE.Mesh(new THREE.TorusGeometry(giantRadius, 1400, 8, 160), giantRingMat.clone());
    meridian1.rotation.x = Math.PI / 2;
    giantSphereGroup.add(meridian1);
    const meridian2 = new THREE.Mesh(new THREE.TorusGeometry(giantRadius, 1400, 8, 160), giantRingMat.clone());
    meridian2.rotation.y = Math.PI / 2;
    giantSphereGroup.add(meridian2);

    // Outer Multiverse Boundary Horizon Marker Points
    const boundaryHalo = this.makePoints(
      480,
      (idx, arr) => {
        const bp = Math.acos(2 * R() - 1);
        const bt = R() * Math.PI * 2;
        arr[idx * 3] = giantRadius * Math.sin(bp) * Math.cos(bt);
        arr[idx * 3 + 1] = giantRadius * Math.cos(bp);
        arr[idx * 3 + 2] = giantRadius * Math.sin(bp) * Math.sin(bt);
      },
      () => 2.5 + R() * 3.5,
      (idx) => (idx % 2 === 0 ? [0.0, 0.96, 0.85] : [0.55, 0.35, 0.95]),
      () => 0.45 + R() * 0.45,
      2.8,
      true
    );
    giantSphereGroup.add(boundaryHalo);
    this.giantMultiverseSphereGroup = giantSphereGroup;
    this.gMultiverse.add(giantSphereGroup);

    /* 1. Parallel Illuminated Bubble Universes corresponding to REALITIES & their Galaxy Clusters */
    const marbleGlassVert = `varying vec3 vN; varying vec3 vV; varying vec3 vWN; void main(){ vN = normalize(normalMatrix * normal); vWN = normalize(normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
    const marbleGlassFrag = `uniform vec3 uColorA; uniform vec3 uColorB; uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vWN;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(vV);
  /* chromatic dispersion — each channel refracts at its own edge width */
  float fr = pow(1.0 - abs(dot(N, V)), 1.7);
  float fg = pow(1.0 - abs(dot(N, V)), 1.45);
  float fb = pow(1.0 - abs(dot(N, V)), 1.2);
  vec3 chroma = vec3(fr, fg, fb);
  float band = 0.5 + 0.5 * sin(vWN.y * 5.0 - uTime * 0.5) * sin(vWN.x * 3.0 + uTime * 0.35);
  vec3 base = mix(uColorA, uColorB, 0.35 + 0.3 * band);
  /* key-light specular glint — the sun catching the glass */
  vec3 L = normalize(vec3(0.35, 0.8, 0.42));
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 100.0);
  float sheen = pow(max(dot(N, H), 0.0), 12.0) * 0.22;
  vec3 col = base * (chroma * 4.2 + 0.07) + vec3(1.0, 0.98, 0.94) * (spec * 1.6 + sheen);
  float a = min(1.0, (chroma.r + chroma.g + chroma.b) * 0.9 + 0.07 + spec);
  gl_FragColor = vec4(col, a);
}`;
    const marbleTex = makeGlowTexture(128, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
    for (let i = 0; i < realitiesToBuild.length; i++) {
      const real = realitiesToBuild[i];
      const pos = new THREE.Vector3(...real.bubblePos);
      const size = real.bubbleSize;
      
      const realityGroup = new THREE.Group();
      realityGroup.userData = { realityId: real.id };
      
      const bubbleCollider = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      bubbleCollider.position.copy(pos);
      /* R74 — the herald anchors OUTSIDE the glass: the marble's fresnel
         shell spans 2.6× the bubble core, so the card must clear the whole
         marble, not just the collider. */
      bubbleCollider.userData = { realityId: real.id, isRealityBubble: true, anchorScale: 2.6 };
      realityGroup.add(bubbleCollider);
      this.multiverseColliders.push(bubbleCollider);
      
      /* Soft chromatic star nucleus inside universe bubble */
      const bubbleCoreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(real.colorA).lerp(new THREE.Color(real.colorB), 0.5),
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const bubbleCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(size * 0.16, 24, 18), bubbleCoreMat);
      bubbleCoreMesh.position.copy(pos);
      realityGroup.add(bubbleCoreMesh);

      /* Pocket Cosmos — the reality itself is a grand glass marble: a wide
         fresnel shell with a faint glass body (visible from any angle) that
         encloses the nucleus, the cluster orbit rings and their swirling
         galaxies, with a blazing core and its own spiral galaxy turning
         slowly inside */
      const colA = new THREE.Color(real.colorA), colB = new THREE.Color(real.colorB);
      const glassMat = new THREE.ShaderMaterial({
        uniforms: { uColorA: { value: colA.clone() }, uColorB: { value: colB.clone() }, uTime: { value: 0 } },
        vertexShader: marbleGlassVert, fragmentShader: marbleGlassFrag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      realityGroup.add(new THREE.Mesh(new THREE.SphereGeometry(size * 2.6, 48, 32), glassMat));

      /* glass silhouette — a billboard ring that always faces the camera, so
         every marble reads as a crisp glass circle with a galaxy inside even
         from across the multiverse (never mistakable for a web knot) */
      if (!this.marbleRingTex) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 256;
        const g2 = cv.getContext('2d')!;
        g2.strokeStyle = 'rgba(255,255,255,0.95)';
        g2.lineWidth = 10;
        g2.shadowColor = 'rgba(255,255,255,0.8)';
        g2.shadowBlur = 14;
        g2.beginPath();
        g2.arc(128, 128, 108, 0, Math.PI * 2);
        g2.stroke();
        this.marbleRingTex = new THREE.CanvasTexture(cv);
      }
      const rimSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.marbleRingTex, color: colA.clone().lerp(colB, 0.5),
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7,
      }));
      rimSprite.scale.setScalar(size * 5.0);
      rimSprite.position.copy(pos);
      realityGroup.add(rimSprite);

      /* blazing heart of the marble */
      const marbleCore = new THREE.Sprite(new THREE.SpriteMaterial({
        map: marbleTex, color: colA.clone().lerp(colB, 0.4).lerp(new THREE.Color('#ffffff'), 0.55),
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8,
      }));
      marbleCore.scale.setScalar(size * 0.9);
      marbleCore.position.copy(pos);
      realityGroup.add(marbleCore);

      let seed = 0;
      for (let c2 = 0; c2 < real.id.length; c2++) seed = (seed * 31 + real.id.charCodeAt(c2)) >>> 0;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const spiral = this.makePoints(
        700,
        (pi, pa) => {
          const arm = pi % 3;
          const rr = Math.pow(rnd(), 0.6) * size * 0.85;
          const ang = (arm / 3) * Math.PI * 2 + rr * 0.0008 + (rnd() - 0.5) * 0.4;
          const spread = (rnd() + rnd() - 1) * size * 0.08;
          pa[pi * 3] = Math.cos(ang) * rr + Math.cos(ang + 1.57) * spread;
          pa[pi * 3 + 1] = (rnd() + rnd() - 1) * size * 0.12;
          pa[pi * 3 + 2] = Math.sin(ang) * rr + Math.sin(ang + 1.57) * spread;
        },
        () => 1.1 + rnd() * 1.3,
        () => {
          const w = rnd();
          if (w > 0.85) return [1, 1, 1];
          const c = w > 0.5 ? colA : colB;
          return [c.r, c.g, c.b];
        },
        () => 0.45 + rnd() * 0.45,
        1.6, true,
      );
      (spiral.material as THREE.ShaderMaterial).userData.pointMode = 'marble';
      spiral.position.copy(pos); /* spin around the bubble's own center */
      spiral.rotation.x = (rnd() - 0.5) * 1.2;
      spiral.rotation.z = (rnd() - 0.5) * 1.2;
      realityGroup.add(spiral);
      this.realityMarbles.push({ spiral, glassMat, speed: 0.04 + rnd() * 0.06 });

      /* High-lighting circular particle halo */
      const haloPts = this.makePoints(
        140,
        (idx, arr) => {
          const pr = size * (1.08 + R() * 0.4);
          const pt = R() * Math.PI * 2, pp = Math.acos(2 * R() - 1);
          arr[idx * 3] = pos.x + pr * Math.sin(pp) * Math.cos(pt);
          arr[idx * 3 + 1] = pos.y + pr * Math.cos(pp);
          arr[idx * 3 + 2] = pos.z + pr * Math.sin(pp) * Math.sin(pt);
        },
        () => 2.2 + R() * 3.0,
        () => [1, 0.95, 0.85],
        () => 0.55 + R() * 0.35,
        2.6,
        true,
      );
      realityGroup.add(haloPts);

      /* 1.1 MAJOR GALAXIES — one ellipse orbit around the reality bubble per
         galaxy. If the ellipse is there, the galaxy exists; no ellipse, no
         galaxy. The count of ellipses is literally the reality's galaxy list. */
      const galaxies = real.galaxies || [];
      for (let gIdx = 0; gIdx < galaxies.length; gIdx++) {
        const gal = galaxies[gIdx];
        const orbitRadius = size * Math.max(1.05, gal.orbitRadius);
        const orbitSpeed = gal.orbitSpeed || 0.05;
        const orbitIncl = gal.orbitIncl || 0.3;
        const phase = gal.orbitPhase || (gIdx / Math.max(1, galaxies.length)) * Math.PI * 2;

        // The ellipse orbit line itself — one continuous inclined ellipse
        const orbitPts: number[] = [];
        const segments = 96;
        for (let s = 0; s <= segments; s++) {
          const ang = (s / segments) * Math.PI * 2;
          const ox = Math.cos(ang) * orbitRadius;
          const oy = Math.sin(ang) * orbitRadius * Math.sin(orbitIncl);
          const oz = Math.sin(ang) * orbitRadius * Math.cos(orbitIncl);
          orbitPts.push(pos.x + ox, pos.y + oy, pos.z + oz);
        }
        const og = new THREE.BufferGeometry();
        og.setAttribute('position', new THREE.Float32BufferAttribute(orbitPts, 3));
        const om = new THREE.LineBasicMaterial({
          color: new THREE.Color(gal.color || real.colorA),
          transparent: true,
          opacity: gal.isHomeGalaxy ? 0.38 : 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const orbitLine = new THREE.LineLoop(og, om);
        realityGroup.add(orbitLine);

        // Galaxy node — a living mini spiral galaxy riding the ellipse
        const nodeGroup = new THREE.Group();
        const initialA = phase;
        nodeGroup.position.set(
          pos.x + Math.cos(initialA) * orbitRadius,
          pos.y + Math.sin(initialA) * orbitRadius * Math.sin(orbitIncl),
          pos.z + Math.sin(initialA) * orbitRadius * Math.cos(orbitIncl),
        );

        /* the galaxy's own tilted disc of stars (spins inside spiralGroup) */
        const galCol = new THREE.Color(gal.color || real.colorA);
        const spiralGroup = new THREE.Group();
        spiralGroup.rotation.x = 0.5 + ((gIdx * 37) % 11) * 0.06;
        spiralGroup.rotation.z = ((gIdx * 53) % 13) * 0.05;
        const galPts = this.makePoints(
          420,
          (pi, pa) => {
            const arm = pi % 3;
            const rr = Math.pow(rnd(), 0.6) * size * 0.085;
            const ang = (arm / 3) * Math.PI * 2 + rr * 0.0035 + (rnd() - 0.5) * 0.4;
            const spread = (rnd() + rnd() - 1) * size * 0.012;
            pa[pi * 3] = Math.cos(ang) * rr + Math.cos(ang + 1.57) * spread;
            pa[pi * 3 + 1] = (rnd() + rnd() - 1) * size * 0.01;
            pa[pi * 3 + 2] = Math.sin(ang) * rr + Math.sin(ang + 1.57) * spread;
          },
          () => 1.0 + rnd() * 1.2,
          () => {
            const w = rnd();
            if (w > 0.88) return [1, 1, 1];
            const c = w > 0.5 ? galCol : new THREE.Color(real.colorB);
            return [c.r, c.g, c.b];
          },
          () => 0.45 + rnd() * 0.45,
          1.5, true, true,
        );
        (galPts.material as THREE.ShaderMaterial).userData.pointMode = 'marble';
        spiralGroup.add(galPts);
        nodeGroup.add(spiralGroup);

        /* radiant core glow so the node reads as a galaxy from any distance */
        const galGlowTex = makeGlowTexture(128, [
          [0, gal.color || real.colorA],
          [0.35, `${gal.color || real.colorA}88`],
          [0.7, `${gal.color || real.colorA}22`],
          [1, 'rgba(0,0,0,0)'],
        ]);
        const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: galGlowTex,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        }));
        glowSprite.scale.setScalar(size * 0.1);
        nodeGroup.add(glowSprite);

        // Interactive collider — hover / click / double-click target
        // R74 — THE HONEST DISK: 0.12 hugs the visible glow (the old 0.18
        // popped the card while the pointer was still outside the galaxy).
        const collider = new THREE.Mesh(
          new THREE.SphereGeometry(size * 0.12, 10, 10),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        collider.userData = { isGalaxy: true, galaxyData: gal, galaxyId: gal.id, realityId: real.id };
        nodeGroup.add(collider);
        this.multiverseColliders.push(collider);

        realityGroup.add(nodeGroup);

        this.galaxyNodes.push({
          galaxyData: gal,
          realityId: real.id,
          group: nodeGroup,
          collider,
          orbitRadius,
          orbitSpeed,
          orbitIncl,
          phase,
          centerPos: pos,
          spiralGroup,
          glowSprite,
          orbitLine,
        });
      }

      realityGroup.visible = (real.id === this.activeRealityId);
      this.gMultiverse.add(realityGroup);
      this.realityGroups[real.id] = realityGroup;
    }
    /* 2. Colliding Interacting Spiral Galaxies */
    const gPair = new THREE.Group();
    gPair.position.set(65000, 12000, -55000);
    
    // Primary Large Spiral Galaxy
    const gal1 = this.makePoints(
      14000,
      (i, a) => {
        const arm = i % 4;
        const rr = Math.pow(R(), 0.58) * 9500;
        const ang = (arm / 4) * Math.PI * 2 + rr * 0.0006 * 3.4 + (R() - 0.5) * 0.4;
        const spread = (R() + R() - 1) * (400 + rr * 0.08);
        a[i * 3] = Math.cos(ang) * rr + Math.cos(ang + 1.57) * spread;
        a[i * 3 + 1] = (R() - 0.5) * (300 + rr * 0.03);
        a[i * 3 + 2] = Math.sin(ang) * rr + Math.sin(ang + 1.57) * spread;
      },
      () => 1.2 + R() * 2.2,
      () => { const w = R(); return w > 0.85 ? [1, 0.72, 0.85] : w > 0.6 ? [0.45, 0.75, 1] : [0.75, 0.85, 1]; },
      () => 0.35 + R() * 0.55, 2.2, true, true,
    );
    gal1.rotation.x = 0.8; gal1.rotation.z = -0.3;
    gPair.add(gal1);
    
    // Colliding Secondary Satellite Galaxy
    const gal2 = this.makePoints(
      8000,
      (i, a) => {
        const arm = i % 2;
        const rr = Math.pow(R(), 0.52) * 5200;
        const ang = (arm / 2) * Math.PI * 2 + rr * 0.001 * 4.2 + (R() - 0.5) * 0.35;
        a[i * 3] = Math.cos(ang) * rr - 6500;
        a[i * 3 + 1] = Math.sin(ang) * rr * 0.4 + 3200;
        a[i * 3 + 2] = Math.sin(ang) * rr - 4200;
      },
      () => 1.0 + R() * 2.0,
      () => [1, 0.8, 0.6] as [number, number, number],
      () => 0.4 + R() * 0.5, 2.0, true, true,
    );
    gPair.add(gal2);
    
    // Luminous core for colliding pair
    const c1 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(128, [[0, 'rgba(255,220,160,0.6)'], [0.35, 'rgba(255,160,80,0.25)'], [1, 'rgba(0,0,0,0)']]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    c1.scale.setScalar(4500);
    gPair.add(c1);
    
    // Active Reality Dimensional Barrier Anchor (glowing isolation boundary shield in Multiverse view)
    const anchorShield = new THREE.Group();
    const anchorRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const anchorRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.035, 16, 64), anchorRingMat);
    const anchorRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.02, 16, 64), anchorRingMat);
    anchorRing2.rotation.x = Math.PI / 3;
    anchorRing2.rotation.y = Math.PI / 6;
    anchorShield.add(anchorRing1);
    anchorShield.add(anchorRing2);
    const activeRealityObj = realitiesToBuild.find((r) => r.id === this.activeRealityId) || realitiesToBuild[0];
    if (activeRealityObj) {
      anchorShield.position.set(...activeRealityObj.bubblePos);
      anchorShield.scale.setScalar(activeRealityObj.bubbleSize);
    }
    this.activeRealityShieldMesh = anchorShield;
    this.gMultiverse.add(anchorShield);

    /* 3. The Supreme Sovereign Multiverse Core & Universal Stabilizer Matrix (Calibrated, High-Contrast Detailing) */
    const demonCore = new THREE.Group();
    demonCore.position.set(0, 0, 0);

    // Sovereign Singularity Shader Material
    this.demonCoreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorCore: { value: new THREE.Color('#ff0055') },
        uColorAura: { value: new THREE.Color('#8b5cf6') },
        uHover: { value: 0 },
        uTearStrength: { value: 0 },
      },
      vertexShader: demonCoreVert,
      fragmentShader: demonCoreFrag,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Layer 1: Central Sovereign Icosahedron Core (Plasma Shell) - Monumental Presence
    const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(9200, 4), this.demonCoreMat);
    demonCore.add(coreMesh);

    // Layer 2: Inner Golden Quantum Octahedron Singularity
    this.demonCoreInnerGeom = new THREE.Mesh(
      new THREE.OctahedronGeometry(6200, 2),
      new THREE.MeshBasicMaterial({
        color: 0xffb703,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      })
    );
    demonCore.add(this.demonCoreInnerGeom);

    // Layer 2.5: 4D Tesseract Hypercube Matrix (Nested rotating wireframe cubes)
    const tesseractGroup = new THREE.Group();
    const cubeMatOuter = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const cubeMatInner = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.60,
      blending: THREE.AdditiveBlending,
    });
    const cubeOuter = new THREE.Mesh(new THREE.BoxGeometry(4800, 4800, 4800), cubeMatOuter);
    const cubeInner = new THREE.Mesh(new THREE.BoxGeometry(2400, 2400, 2400), cubeMatInner);
    tesseractGroup.add(cubeOuter);
    tesseractGroup.add(cubeInner);
    demonCore.add(tesseractGroup);
    this.demonCoreTesseract = tesseractGroup;

    // Layer 3: Central Nexus Crystal (Dodecahedron)
    const coreNexus = new THREE.Mesh(
      new THREE.DodecahedronGeometry(3200, 1),
      new THREE.MeshBasicMaterial({
        color: 0x00f5d4,
        wireframe: false,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      })
    );
    demonCore.add(coreNexus);

    // Layer 4: Relativistic Polar Plasma Jets (+Y and -Y Energetic Cones - Calibrated Opacity)
    this.demonCoreJets = [];
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.20,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const topJet = new THREE.Mesh(new THREE.ConeGeometry(2400, 95000, 32, 1, true), jetMat);
    topJet.position.set(0, 48000, 0);
    demonCore.add(topJet);
    this.demonCoreJets.push(topJet);

    const bottomJet = new THREE.Mesh(new THREE.ConeGeometry(2400, 95000, 32, 1, true), jetMat);
    bottomJet.position.set(0, -48000, 0);
    bottomJet.rotation.x = Math.PI;
    demonCore.add(bottomJet);
    this.demonCoreJets.push(bottomJet);

    // 4 Gyroscopic Armillary Stabilizer Rings (Managing & Stabilizing Space-Time)
    this.demonCoreRings = [];
    const ringColors = ['#f59e0b', '#06b6d4', '#8b5cf6', '#ff0055'];
    const ringRadii = [14000, 19500, 25000, 31000];
    const ringThickness = [110, 95, 80, 70];
    for (let r = 0; r < 4; r++) {
      const ringGeom = new THREE.TorusGeometry(ringRadii[r], ringThickness[r], 16, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(ringColors[r]),
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = (r * Math.PI) / 4 + 0.3;
      ringMesh.rotation.y = r * 0.65;
      demonCore.add(ringMesh);
      this.demonCoreRings.push(ringMesh);

      // Add 6 Stabilizer Node Crystals per ring
      for (let n = 0; n < 6; n++) {
        const nAngle = (n / 6) * Math.PI * 2;
        const nodeGeom = new THREE.OctahedronGeometry(550, 0);
        const nodeMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(ringColors[r]),
          wireframe: true,
          blending: THREE.AdditiveBlending,
        });
        const node = new THREE.Mesh(nodeGeom, nodeMat);
        node.position.set(Math.cos(nAngle) * ringRadii[r], Math.sin(nAngle) * ringRadii[r], 0);
        ringMesh.add(node);
      }
    }

    // 6 Eccentric Tachyon Satellite Probes Orbiting the Core
    this.demonCoreTachyonNodes = [];
    for (let t = 0; t < 6; t++) {
      const tGeom = new THREE.DodecahedronGeometry(600, 0);
      const tMat = new THREE.MeshBasicMaterial({
        color: t % 2 === 0 ? 0x00f5d4 : 0xf59e0b,
        wireframe: true,
        blending: THREE.AdditiveBlending,
      });
      const tNode = new THREE.Mesh(tGeom, tMat);
      tNode.userData = {
        radius: 36000 + t * 4500,
        speed: 0.015 + t * 0.005,
        incl: (t * Math.PI) / 6,
        phase: t * 1.05,
      };
      demonCore.add(tNode);
      this.demonCoreTachyonNodes.push(tNode);
    }

    // 12 Radiating Sovereign Stabilizer Spires / Energy Monoliths
    this.demonCoreSpires = [];
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x090314,
      emissive: new THREE.Color('#8b5cf6'),
      emissiveIntensity: 1.1,
      metalness: 0.95,
      roughness: 0.15,
    });
    const numSpires = 12;
    for (let h = 0; h < numSpires; h++) {
      const hAngle = (h / numSpires) * Math.PI * 2;
      const pitch = (h % 3 === 0 ? 0 : h % 3 === 1 ? 0.52 : -0.52);
      const spireGeom = new THREE.CylinderGeometry(240, 1100, 11000, 6);
      const spire = new THREE.Mesh(spireGeom, spireMat);
      const dist = 14500;
      spire.position.set(
        Math.cos(hAngle) * Math.cos(pitch) * dist,
        Math.sin(pitch) * dist,
        Math.sin(hAngle) * Math.cos(pitch) * dist
      );
      spire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spire.position.clone().normalize());
      demonCore.add(spire);
      this.demonCoreSpires.push(spire);
    }

    // Dynamic Multidimensional Spacetime Gyroscopic Pulse Waves (Non-concentric spiral orientations)
    this.demonCorePulseRings = [];
    const pulseColors = [0x00f5d4, 0xec4899, 0x8b5cf6, 0xf59e0b];
    for (let p = 0; p < 4; p++) {
      const pulseGeom = new THREE.TorusGeometry(11000, 75, 12, 90);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: pulseColors[p % pulseColors.length],
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pMesh = new THREE.Mesh(pulseGeom, pulseMat);
      pMesh.rotation.x = (p * Math.PI) / 4 + 0.35;
      pMesh.rotation.y = p * 0.78;
      pMesh.rotation.z = (p * Math.PI) / 3;
      pMesh.userData = { phase: p / 4, baseScale: 1.0, rotSpeed: 0.005 + p * 0.003 };
      demonCore.add(pMesh);
      this.demonCorePulseRings.push(pMesh);
    }

    // Swirling Celestial Mana Embers & Accretion Vortex
    const demonEmbers = this.makePoints(
      2200,
      (idx, arr) => {
        const rad = 11000 + Math.pow(R(), 0.6) * 28000;
        const ang = R() * Math.PI * 2;
        const pAng = Math.acos(2 * R() - 1);
        arr[idx * 3] = rad * Math.sin(pAng) * Math.cos(ang);
        arr[idx * 3 + 1] = rad * Math.cos(pAng) * 0.35 + (R() - 0.5) * 1200;
        arr[idx * 3 + 2] = rad * Math.sin(pAng) * Math.sin(ang);
      },
      () => 2.5 + R() * 4.5,
      (idx) => {
        const palette: [number, number, number][] = [
          [0.0, 0.85, 0.75], // Cyan
          [0.85, 0.60, 0.0],  // Amber Gold
          [0.45, 0.28, 0.85], // Violet
          [0.85, 0.0, 0.28],   // Sovereign Crimson
        ];
        return palette[idx % palette.length];
      },
      () => 0.45 + R() * 0.35,
      2.6,
      true
    );
    demonCore.add(demonEmbers);

    // Balanced Sovereign Ambient Point Lights (Dimmed to preserve crisp visual detail)
    this.demonCoreLight = new THREE.PointLight(0x8b5cf6, 0.45, 180000);
    demonCore.add(this.demonCoreLight);

    const cyanSubLight = new THREE.PointLight(0x00f5d4, 0.30, 150000);
    demonCore.add(cyanSubLight);

    // Multiverse Quantum Stabilization Beams (Direct Energy Tethers to all Realities)
    const beamPositions: number[] = [];
    const realityPositions: THREE.Vector3[] = [];
    realitiesToBuild.forEach((r) => {
      const targetPos = new THREE.Vector3(...r.bubblePos);
      realityPositions.push(targetPos);
      beamPositions.push(0, 0, 0);
      beamPositions.push(targetPos.x, targetPos.y, targetPos.z);
    });

    const beamGeom = new THREE.BufferGeometry();
    beamGeom.setAttribute('position', new THREE.Float32BufferAttribute(beamPositions, 3));
    this.coreStabilizerBeamMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreStabilizerBeams = new THREE.LineSegments(beamGeom, this.coreStabilizerBeamMat);
    this.gMultiverse.add(this.coreStabilizerBeams);

    // Quantum Pulse Orbs travelling along the stabilization lines
    this.corePulseOrbs = [];
    realityPositions.forEach((pos, idx) => {
      const orbGeom = new THREE.SphereGeometry(220, 8, 8);
      const orbMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x00f5d4 : 0xf59e0b,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const orb = new THREE.Mesh(orbGeom, orbMat);
      orb.userData = { targetPos: pos, progress: (idx * 0.05) % 1.0 };
      this.gMultiverse.add(orb);
      this.corePulseOrbs.push(orb);
    });

    // Interactive Raycasting Collider for the Core
    this.demonCoreCollider = new THREE.Mesh(
      new THREE.SphereGeometry(32000, 16, 14),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.demonCoreCollider.userData = { isDemonCore: true, id: 'demon-core' };
    demonCore.add(this.demonCoreCollider);
    /* the demon core is retired — the black inner sphere (and everything that
       comes with it) is not part of the multiverse anymore. The assembly stays
       in memory for its uniforms/lights, but never renders, lights, or picks. */
    demonCore.visible = false;
    this.demonCoreLight.intensity = 0;
    this.coreStabilizerBeams.visible = false;
    this.corePulseOrbs.forEach((o) => (o.visible = false));
    this.demonCoreGroup = demonCore;
    this.gMultiverse.add(demonCore);

    /* 3.5 THE ASTRAL CORE — the living heart of the multiverse at (0,0,0).
       A glassy energy singularity every reality is anchored to. Clicking it
       opens the Multiverse Core Console (create / rename / recolor / collapse
       realities, forge galaxies). Visible, hoverable, clickable. */
    const astralCore = new THREE.Group();
    astralCore.position.set(0, 0, 0);

    const coreShellMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHover: { value: 0 },
        uColorA: { value: new THREE.Color('#00f5d4') },
        uColorB: { value: new THREE.Color('#8b5cf6') },
        uColorHeart: { value: new THREE.Color('#ff2d78') },
      },
      vertexShader: `
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = normalize(-mv.xyz);
          vP = position;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform float uHover;
        uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorHeart;
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){
          vec3 N = normalize(vN); vec3 V = normalize(vV);
          float fres = pow(1.0 - abs(dot(N, V)), 2.1);
          /* living energy bands crawling over the glass shell */
          float bands = 0.5 + 0.5 * sin(vP.y * 0.00042 + uTime * 0.9) * sin(vP.x * 0.00037 - uTime * 0.62);
          float swirl = 0.5 + 0.5 * sin(atan(vP.z, vP.x) * 3.0 + uTime * 0.8 + vP.y * 0.00028);
          vec3 col = mix(uColorA, uColorB, swirl);
          col = mix(col, uColorHeart, bands * 0.42);
          col += vec3(1.0) * pow(bands, 5.0) * 0.6;
          float a = fres * (0.85 + uHover * 0.6) + bands * 0.10 + 0.04;
          gl_FragColor = vec4(col * (1.25 + uHover * 0.8), a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    });
    const coreShell = new THREE.Mesh(new THREE.SphereGeometry(20000, 56, 40), coreShellMat);
    astralCore.add(coreShell);
    this.astralCoreMats.push(coreShellMat);

    /* blazing heart visible from across the multiverse */
    const astralHeart = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(256, [
        [0, 'rgba(255,255,255,1)'],
        [0.18, 'rgba(255,170,210,0.9)'],
        [0.42, 'rgba(139,92,246,0.42)'],
        [1, 'rgba(0,0,0,0)'],
      ]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.95,
    }));
    astralHeart.scale.setScalar(96000);
    astralCore.add(astralHeart);

    /* twin counter-rotating star halos */
    for (let h = 0; h < 2; h++) {
      const halo = this.makePoints(
        700,
        (i, a) => {
          const rad = 26000 + h * 14000 + (R() - 0.5) * 5200;
          const ang = R() * Math.PI * 2;
          const band = (R() + R() + R() - 1.5) * 3400;
          a[i * 3] = Math.cos(ang) * rad;
          a[i * 3 + 1] = band;
          a[i * 3 + 2] = Math.sin(ang) * rad;
        },
        () => 1.6 + R() * 2.6,
        () => (h === 0 ? [0.0, 0.96, 0.83] : [0.62, 0.42, 1.0]),
        () => 0.35 + R() * 0.45,
        2.4, true,
      );
      (halo.material as THREE.ShaderMaterial).userData.pointMode = 'multiverse';
      astralCore.add(halo);
      this.astralCoreHalo.push(halo);
    }

    /* three gyroscopic armillary rings — the stabilizer cage */
    const astralRingColors = ['#00f5d4', '#8b5cf6', '#ff2d78'];
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(25000 + r * 6500, 260 - r * 40, 12, 140),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(astralRingColors[r]),
          transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      ring.rotation.x = (r * Math.PI) / 3 + 0.35;
      ring.rotation.y = r * 0.9;
      astralCore.add(ring);
      this.astralCoreRings.push(ring);
    }

    /* interactive collider — the click target for the Multiverse Core Console */
    const astralCollider = new THREE.Mesh(
      new THREE.SphereGeometry(58000, 20, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    astralCollider.userData = { isMultiverseCore: true, id: 'multiverse-core' };
    astralCore.add(astralCollider);
    this.multiverseColliders.push(astralCollider);

    this.astralCoreGroup = astralCore;
    this.gMultiverse.add(astralCore);

    this.gMultiverse.add(gPair);
    this.scene.add(this.gMultiverse);

    this.gMultiverse.traverse((obj) => {
      obj.frustumCulled = false;
    });
  }

  public rebuildMultiverse(customRealitiesList?: RealityConfig[]) {
    perfMark('multiverse-rebuild-start');
    const preservedTextures = new Set<THREE.Texture>();
    if (this.marbleRingTex) preservedTextures.add(this.marbleRingTex);
    this.disposeObject3D(this.gMultiverse, { textures: preservedTextures });
    while (this.gMultiverse.children.length > 0) {
      const obj = this.gMultiverse.children[0];
      this.gMultiverse.remove(obj);
    }
    /* the old build's point materials are gone — drop their uScale entries
       so the fresh ones re-register (without this, rebuilt marbles/nodes
       collapse to the 1.5px shader floor) */
    this.dropOwnedPointsMaterials('multiverse');
    this.buildMultiverse(customRealitiesList);
    this.collectPointsMaterials(this.gMultiverse, 'multiverse', 'multiverse');
    perfMeasure('multiverse-rebuild', 'multiverse-rebuild-start');
  }

  buildLevels() {
    const R = Math.random;
    /* GALAXY stage — contents are rebuilt per reality in
       buildGalaxyStageContents() (one full spiral per major galaxy of the
       active reality's roster; see §setReality). The group itself mounts here. */
    this.gGalaxy.add(this.gGalaxyContents);
    this.scene.add(this.gGalaxy);

    /* GALAXY CLUSTER / GROUP stage — a deep field: hundreds of gravitationally
       bound galaxy smudges, glowing hot intracluster gas and gravitational
       lensing arcs (built once; gas tint follows the active reality) */
    this.buildClusterStage();
    this.scene.add(this.gCluster);

    /* supercluster complex (Laniakea & Virgo) — galaxy streams flowing towards the Great Attractor */
    const superPts = this.makePoints(
      4500,
      (i, a) => {
        const streamIdx = Math.floor(i / 150);
        const t = (streamIdx / 30) * Math.PI * 2;
        const p = Math.acos(2 * (streamIdx / 30) - 1);
        const streamDist = 38000 + (streamIdx % 12) * 4500;
        const attractorBias = (i % 150) / 150;
        const basePos = new THREE.Vector3(
          streamDist * Math.sin(p) * Math.cos(t),
          streamDist * Math.cos(p) * 0.45,
          streamDist * Math.sin(p) * Math.sin(t)
        );
        const attractorPos = new THREE.Vector3(42000, 8000, -35000);
        const interp = basePos.lerp(attractorPos, attractorBias * 0.4);
        const jitter = (R() - 0.5) * (1800 + attractorBias * 800);
        a[i * 3] = interp.x + jitter;
        a[i * 3 + 1] = interp.y + (R() - 0.5) * 1200;
        a[i * 3 + 2] = interp.z + jitter;
      },
      () => 1.4 + R() * 2.5,
      (i) => {
        const w = R();
        return w > 0.7 ? [1, 0.85, 0.6] : w > 0.4 ? [0.4, 0.85, 0.9] : [0.75, 0.8, 1];
      },
      () => 0.35 + R() * 0.45,
      2.0,
      true, true,
    );
    this.gSupercluster.add(superPts);

    const attractorGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(256, [[0, 'rgba(255,220,160,0.9)'], [0.3, 'rgba(255,160,80,0.4)'], [1, 'rgba(0,0,0,0)']]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    attractorGlow.position.set(42000, 8000, -35000);
    attractorGlow.scale.setScalar(11000);
    this.gSupercluster.add(attractorGlow);
    this.levelSprites.push({ mat: attractorGlow.material as THREE.SpriteMaterial, base: 1, level: 'supercluster' });
    this.scene.add(this.gSupercluster);

    /* cosmic web — hyper-detailed cosmological simulation (IllustrisTNG-grade dark matter & baryonic filaments) */
    const NODES = 240, WEB_R = 135000;
    const nodes: THREE.Vector3[] = [];
    const nodeCol: THREE.Color[] = [];
    for (let i = 0; i < NODES; i++) {
      const t = R() * Math.PI * 2, p = Math.acos(2 * R() - 1);
      // Voronoi-like clustering distribution simulating cosmic voids and dense walls
      const r = WEB_R * (0.18 + 0.82 * Math.pow(R(), 0.65));
      nodes.push(new THREE.Vector3(r * Math.sin(p) * Math.cos(t), r * Math.cos(p) * 0.55, r * Math.sin(p) * Math.sin(t)));
      const w = R();
      nodeCol.push(w > 0.82 ? new THREE.Color('#ffc878') : w > 0.5 ? new THREE.Color('#64dfdf') : new THREE.Color('#83c5be'));
    }
    const edges: [number, number][] = [];
    const degree = new Array(NODES).fill(0);
    nodes.forEach((n, i) => {
      const dists = nodes.map((m, j) => [j, n.distanceTo(m)] as [number, number]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]);
      const k = 3 + Math.floor(R() * 3);
      for (let e = 0; e < k; e++) {
        const j = dists[e][0];
        if (n.distanceTo(nodes[j]) < WEB_R * 0.52) { edges.push([i, j]); degree[i]++; degree[j]++; }
      }
    });

    /* multi-strand curved gravitational filaments sprinkled with galaxies */
    const SAMPLES = 220;
    const webPts = this.makePoints(
      edges.length * SAMPLES,
      (idx, a) => {
        const [i, j] = edges[idx % edges.length];
        const t = Math.floor(idx / edges.length) / SAMPLES;
        const pA = nodes[i], pB = nodes[j];
        // Add organic gravitational curvature (sine curve offset along the segment)
        const curveOffset = Math.sin(t * Math.PI * 3 + i * 0.5) * 1200 + Math.cos(t * Math.PI * 2 + j * 0.3) * 900;
        const n = pA.clone().lerp(pB, t).add(new THREE.Vector3(curveOffset, curveOffset * 0.5, -curveOffset));
        const jit = 450 + n.length() * 0.008;
        a[idx * 3] = n.x + (R() - 0.5) * jit;
        a[idx * 3 + 1] = n.y + (R() - 0.5) * jit;
        a[idx * 3 + 2] = n.z + (R() - 0.5) * jit;
      },
      () => 0.5 + R() * 1.8,
      () => { const w = R(); return w > 0.85 ? [1, 0.88, 0.62] : w > 0.55 ? [0.38, 0.82, 0.95] : [0.58, 0.72, 0.95]; },
      () => 0.22 + R() * 0.5, 1.8, true, true,
    );
    this.gWeb.add(webPts);

    /* cluster knots at high-degree intersection nodes */
    const knot = this.makePoints(
      NODES,
      (i, a) => { a[i * 3] = nodes[i].x; a[i * 3 + 1] = nodes[i].y; a[i * 3 + 2] = nodes[i].z; },
      (i) => 2.0 + degree[i] * 0.55,
      (i) => { const c = nodeCol[i]; return [c.r, c.g, c.b] as [number, number, number]; },
      () => 0.6 + R() * 0.4, 2.8, true, true,
    );
    this.gWeb.add(knot);

    /* ultra-detailed filaments with per-vertex color flow */
    const linePos: number[] = []; const lineCol: number[] = [];
    edges.forEach(([i, j]) => {
      linePos.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
      const a = nodeCol[i], b = nodeCol[j];
      lineCol.push(a.r, a.g, a.b, b.r, b.g, b.b);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lineCol, 3));
    /* the web filaments — one plain additive line material, opacity driven
       by the stage weight */
    this.webLineMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec3 vColor;
        void main(){
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float uOpacity; varying vec3 vColor;
        void main(){ gl_FragColor = vec4(vColor, uOpacity); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    });
    this.gWeb.add(new THREE.LineSegments(lg, this.webLineMat));

    /* luminous supercluster cores at major web intersections (e.g. Great Attractor & Perseus-Pisces) */
    const hubs = nodes.map((n, i) => [n, degree[i]] as [THREE.Vector3, number]).sort((a, b) => b[1] - a[1]).slice(0, 35);
    const hubPts = this.makePoints(
      hubs.length * 70,
      (idx, a) => {
        const hubIdx = Math.floor(idx / 70);
        const center = hubs[hubIdx][0];
        const pr = Math.pow(R(), 1.5) * 3200;
        const pa = R() * Math.PI * 2;
        a[idx * 3] = center.x + Math.cos(pa) * pr;
        a[idx * 3 + 1] = center.y + (R() - 0.5) * 1100;
        a[idx * 3 + 2] = center.z + Math.sin(pa) * pr;
      },
      () => 1.6 + R() * 3.0,
      (idx) => { const warm = Math.floor(idx / 70) % 3 === 0; return warm ? [1, 0.9, 0.7] : [0.5, 0.85, 1]; },
      () => 0.55 + R() * 0.45,
      2.4,
      true, true,
    );
    this.gWeb.add(hubPts);

    /* distant exoplanet horizon plates — procedural worlds drifting in the
       deep web, billboarded each frame; uOpacity is band-gated in tick */
    this.buildExoplanetPlates();

    this.scene.add(this.gWeb);

    /* anchor beacon — your star, visible across galactic scales */
    this.beacon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(128, [[0, 'rgba(255,240,210,1)'], [0.3, 'rgba(255,205,130,0.5)'], [1, 'rgba(255,180,100,0)']]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    this.beacon.scale.setScalar(1500);
    this.scene.add(this.beacon);

    [this.gNeighborhood, this.gGalaxy, this.gCluster, this.gSupercluster, this.gWeb].forEach((g) => {
      g.traverse((obj) => { obj.frustumCulled = false; });
    });
    /* big static clouds opt back into frustum culling — drawing the cluster
       field / arcs while off-screen is pure fill-rate waste */
    this.gCluster.children.forEach((c) => {
      if (c instanceof THREE.Points || c instanceof THREE.Line) c.frustumCulled = true;
    });
  }

  /** Deterministic stage position for a major galaxy of the active reality.
      GALAXIES ARE ISOLATED — no two discs can ever touch: the home galaxy
      sits alone at the origin (it hosts the anchor star system), everyone
      else lives on tight-but-safe rings (13k / 22k / 31k …), max four per
      ring at golden-angle spacing, with a per-galaxy elevation. Rings are
      sized to the stage framing (~26k viewing distance) so the WHOLE roster
      stays on screen around the home galaxy — minimum center distance
      between any pair still exceeds the sum of their disc radii. */
  private static galaxyStagePosition(orbitRadius: number, orbitPhase: number, orbitIncl: number, slot: number): THREE.Vector3 {
    if (slot === 0) return new THREE.Vector3(0, 0, 0);
    const k = slot - 1;
    const ring = 13000 + Math.floor(k / 4) * 9000;
    const ang = k * 2.399963 + Math.floor(k / 4) * 0.9;
    const elev = Math.sin(orbitIncl * 2.2 + slot * 0.7) * 2200;
    return new THREE.Vector3(Math.cos(ang) * ring, elev, Math.sin(ang) * ring);
  }

  /** THE GALAXY STAGE — one full spiral galaxy per entry of the reality's
      real roster. Home galaxy centered and largest; every other galaxy is
      hoverable, clickable and focusable in its own right. */
  /* incrementing token — a fresh rebuild supersedes any pending chunked boot
     build so a reality switch mid-boot can never interleave two rosters */
  private galaxyChunkToken = 0;

  buildGalaxyStageContents(reality: RealityConfig, chunked = false) {
    this.dropOwnedPointsMaterials('galaxyStage');
    const preservedGeometries = new Set<THREE.BufferGeometry>();
    const preservedMaterials = new Set<THREE.Material>();
    if (this.moonGeo) preservedGeometries.add(this.moonGeo);
    if (this.moonMat) preservedMaterials.add(this.moonMat);
    this.bhSys.releaseBlackHolesUnder(this.gGalaxyContents);
    this.disposeObject3D(this.gGalaxyContents, {
      geometries: preservedGeometries,
      materials: preservedMaterials,
    });
    while (this.gGalaxyContents.children.length > 0) this.gGalaxyContents.remove(this.gGalaxyContents.children[0]);
    this.galaxyStageNodes = [];
    this.galaxyStageColliders = [];
    this.galaxyStagePointMats = [];
    this.innerColliderList = [];
    this.innerFocusBodyId = null;
    /* the inhabited realm the user may be standing inside was just disposed —
       the focus flags must follow, or a stale galaxyInnerFocus makes the next
       click read as a background click and yank the camera to the galaxy band */
    this.galaxyInnerFocus = false;
    this.galaxyFocusId = null;


    const galaxies = reality.galaxies ?? [];
    let seed = 0;
    for (let c2 = 0; c2 < reality.id.length; c2++) seed = (seed * 31 + reality.id.charCodeAt(c2)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

    if (!chunked) {
      galaxies.forEach((gal, i) => {
        this.buildGalaxyStageNode(reality, gal, i, rnd);
      });
      this.finalizeGalaxyStageContents();
      return;
    }
    /* BOOT PATH — one galaxy per animation frame. The universe the user sees
       at boot zoom is the home system at the origin; the galaxy roster is
       far away and nothing needs it for several seconds, so spreading the
       build hides every millisecond of it behind the intro veil instead of
       freezing startup for seconds. A fresh rebuild (token) supersedes a
       pending one. */
    const token = ++this.galaxyChunkToken;
    let built = 0;
    const step = () => {
      if (token !== this.galaxyChunkToken) return; /* superseded */
      if (built < galaxies.length) {
        this.buildGalaxyStageNode(reality, galaxies[built], built, rnd);
        built += 1;
        requestAnimationFrame(step);
      } else {
        this.finalizeGalaxyStageContents();
      }
    };
    step();
  }

  /** The tail of buildGalaxyStageContents — shared by the sync and chunked paths. */
  private finalizeGalaxyStageContents() {
    this.collectPointsMaterials(this.gGalaxyContents, 'galaxyStage', 'standard');
    if (this.lastEntries) this.syncMoons(this.lastEntries);
  }

  /** One full galaxy node of the stage: disc cloud, core glow, collider and
      its isolated inner stellar system. Extracted so the BOOT call can spread
      the roster across frames instead of stalling startup for seconds. */
  private buildGalaxyStageNode(reality: RealityConfig, gal: GalaxyData, i: number, rnd: () => number) {
    const isHome = gal.isHomeGalaxy || i === 0;
    const slot = isHome ? 0 : i;
      const radius = isHome ? 5600 : 2600 + rnd() * 1600;
      const arms = 3 + Math.floor(rnd() * 3);
      const wind = 2.6 + rnd() * 1.2;
      const pos = LevelStageSystem.galaxyStagePosition(gal.orbitRadius, gal.orbitPhase, gal.orbitIncl, slot);
      const galCol = new THREE.Color(gal.color || reality.colorA);

      const group = new THREE.Group();
      group.position.copy(pos);
      group.rotation.x = 0.32 + rnd() * 0.55;
      group.rotation.z = (rnd() - 0.5) * 0.7;

      /* the disc — same grammar as the classic canned spiral, but tinted by
         this galaxy's own light */
      const pts = this.makePoints(
        isHome ? 13000 : 6500 + Math.floor(rnd() * 2500),
        (pi, pa) => {
          const arm = pi % arms;
          const rr = Math.pow(rnd(), 0.62) * radius;
          const ang = (arm / arms) * Math.PI * 2 + rr * 0.001 * wind * 3.2 + (rnd() - 0.5) * (0.5 - (rr / radius) * 0.32);
          const spread = (rnd() + rnd() + rnd() - 1.5) * (170 + rr * 0.09);
          pa[pi * 3] = Math.cos(ang) * rr + Math.cos(ang + 1.57) * spread;
          pa[pi * 3 + 1] = (rnd() + rnd() - 1) * (90 + rr * 0.012);
          pa[pi * 3 + 2] = Math.sin(ang) * rr + Math.sin(ang + 1.57) * spread;
        },
        () => 0.6 + rnd() * 1.3,
        () => {
          const w = rnd();
          if (w > 0.93) return [1, 1, 1];
          if (w > 0.55) return [galCol.r, galCol.g, galCol.b];
          if (w > 0.3) return [1, 0.88, 0.68];
          const b = 0.55 + rnd() * 0.4;
          return [b * 0.75, b * 0.84, b];
        },
        () => 0.2 + rnd() * 0.55, 1.7, false, true,
      );
      pts.frustumCulled = true; /* big static clouds opt into culling — fill rate */
      group.add(pts);
      this.galaxyStagePointMats.push({ points: pts, mat: pts.material as THREE.ShaderMaterial });

      /* blazing core + soft halo — the core burns in THIS galaxy's own
         light (tinted center, colored mid-halo) so every member reads
         distinct instead of washing out to the same white */
      const coreLight = galCol.clone().lerp(new THREE.Color('#ffffff'), 0.42);
      const glowTex = makeGlowTexture(256, [
        [0, `rgba(${Math.round(coreLight.r * 255)},${Math.round(coreLight.g * 255)},${Math.round(coreLight.b * 255)},1)`],
        [0.28, `rgba(${Math.round(galCol.r * 255)},${Math.round(galCol.g * 255)},${Math.round(galCol.b * 255)},0.85)`],
        [0.58, `rgba(${Math.round(galCol.r * 200)},${Math.round(galCol.g * 200)},${Math.round(galCol.b * 200)},0.3)`],
        [1, 'rgba(0,0,0,0)'],
      ]);
      const core = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.95,
      }));
      core.scale.setScalar(radius * 0.85);
      group.add(core);
      const coreMat = core.material as THREE.SpriteMaterial;


      /* hover / click / focus collider — R74, THE HONEST DISK: the collider
         IS the disc now. The old 1.35× sphere popped the herald card while
         the pointer was still well outside the visible disc. */
      const collider = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 10),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      collider.userData = { isGalaxy: true, galaxyData: gal, galaxyId: gal.id, realityId: reality.id };
      group.add(collider);
      this.galaxyStageColliders.push(collider);

      /* THE ISOLATED INNER SYSTEM — every galaxy owns a REAL one, built with
         the exact same construction grammar as the home anchor system: a
         shader star with a living corona, full Kepler worlds on shader
         surfaces (cloud decks, atmospheres, ring systems, moons) and its
         own asteroid belt — generated from the galaxy's lineage. Hidden
         until the camera dives within ~1,600 units — at that depth the disc
         itself becomes the sky. The home galaxy has no inner copy: its
         realm IS the anchor star system at the origin. */
      let innerSys: InnerSystem | null = null;
      const inner = new THREE.Group();
      if (!isHome) {
        const built = this.buildInnerStellarSystem(gal, galCol, rnd, reality);
        innerSys = built.sys;
        inner.add(built.root);
      }
      inner.visible = false;
      group.add(inner);

      this.gGalaxyContents.add(group);
      this.galaxyStageNodes.push({ data: gal, group, collider, radius, glowMat: coreMat, discMat: pts.material as THREE.ShaderMaterial, inner, innerSys });
  }

  /** THE REAL ISOLATED INNER SYSTEM — one per non-home galaxy. Same
      construction grammar and scale as the home anchor system at the
      origin: a shader star with a living corona at the local origin, full
      shader worlds on Kepler orbits (cloud decks, atmospheres, ring
      systems, moons) and a tumbling asteroid belt between the temperate
      world and the gas giant. Everything is parented to the galaxy node,
      so the system lives INSIDE its isolated realm. */
  private buildClusterStage() {
    const R = Math.random;
    while (this.gCluster.children.length > 0) this.gCluster.remove(this.gCluster.children[0]);
    this.clusterGasMats = [];

    /* 1) the member-galaxy field — each smudge is a tiny oriented elliptical
          haze of a dozen points: warm ellipticals, blue spirals, a few
          luminous giants, clustered in one core + three sub-halos */
    const SMUDGES = 1000, PER = 10;
    const clumps: [number, number, number, number][] = [
      [0, 0, 0, 15000],
      [26000, -7000, 13000, 17000],
      [-24000, 9000, -15000, 15000],
      [9000, 14000, -29000, 13000],
    ];
    const cx = new Float32Array(SMUDGES), cy = new Float32Array(SMUDGES), cz = new Float32Array(SMUDGES);
    const ax = new Float32Array(SMUDGES), bx = new Float32Array(SMUDGES);
    const rot = new Float32Array(SMUDGES), tilt = new Float32Array(SMUDGES), kind = new Uint8Array(SMUDGES);
    for (let s = 0; s < SMUDGES; s++) {
      const cl = clumps[Math.min(clumps.length - 1, Math.floor(Math.pow(R(), 1.55) * clumps.length))];
      cx[s] = cl[0] + (R() + R() - 1) * cl[3];
      cy[s] = cl[1] + (R() + R() - 1) * cl[3] * 0.7;
      cz[s] = cl[2] + (R() + R() - 1) * cl[3];
      const a = 90 + Math.pow(R(), 1.6) * 260;
      ax[s] = a;
      bx[s] = a * (0.35 + R() * 0.4);
      rot[s] = R() * Math.PI;
      tilt[s] = (R() - 0.5) * 1.0;
      const w = R();
      kind[s] = w > 0.94 ? 2 : w > 0.6 ? 1 : 0;
    }
    const field = this.makePoints(
      SMUDGES * PER,
      (i, a) => {
        const s = Math.floor(i / PER), j = i % PER;
        const ang = (j / PER) * Math.PI * 2 + hash(s, 7) * 6.2831;
        const wob = 0.72 + hash(s, 13) * 0.55;
        const ex = Math.cos(ang) * ax[s] * wob;
        const ey = Math.sin(ang) * bx[s] * wob;
        const ux = Math.cos(rot[s]), uz = Math.sin(rot[s]);
        const vx = -Math.sin(rot[s]) * Math.sin(tilt[s]), vy = Math.cos(tilt[s]), vz = Math.cos(rot[s]) * Math.sin(tilt[s]);
        a[i * 3] = cx[s] + ex * ux + ey * vx;
        a[i * 3 + 1] = cy[s] + ey * vy;
        a[i * 3 + 2] = cz[s] + ex * uz + ey * vz;
      },
      (i) => { const s = Math.floor(i / PER); return kind[s] === 2 ? 1.4 + R() * 1.6 : 0.6 + R() * 1.1; },
      (i) => { const s = Math.floor(i / PER); return kind[s] === 2 ? [1, 1, 1] : kind[s] === 1 ? [0.72, 0.82, 1] : [1, 0.88, 0.72]; },
      () => 0.3 + R() * 0.5,
      1.6,
      false,
    );
    this.gCluster.add(field);

    /* foreground star sprinkle */
    const stars = this.makePoints(
      600,
      (i, a) => {
        const r = 26000 + R() * 52000, t = R() * Math.PI * 2, p = Math.acos(2 * R() - 1);
        a[i * 3] = r * Math.sin(p) * Math.cos(t); a[i * 3 + 1] = r * Math.cos(p) * 0.6; a[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
      },
      () => 0.4 + R() * 0.8,
      () => [0.85, 0.9, 1],
      () => 0.2 + R() * 0.4,
      1.2,
      false, true,
    );
    this.gCluster.add(stars);

    /* 2) hot intracluster gas — huge soft X-ray glows; tinted to the active
          reality's secondary color in setReality() */
    const gasTex = makeGlowTexture(256, [
      [0, 'rgba(255,255,255,0.9)'],
      [0.35, 'rgba(255,255,255,0.28)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const gasDefs: [number, number, number, number, string, number][] = [
      [0, 0, 0, 72000, '#ff5e8a', 0.10],
      [20000, -5000, 8000, 46000, '#b46bff', 0.085],
      [-17000, 7000, -13000, 40000, '#ff8ab0', 0.075],
      [0, 0, 0, 15000, '#ffe1ee', 0.32],
    ];
    gasDefs.forEach(([gx, gy, gz, scale, color, opacity]) => {
      const mat = new THREE.SpriteMaterial({
        map: gasTex, color: new THREE.Color(color), transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      mat.userData.baseColor = new THREE.Color(color);
      const sp = new THREE.Sprite(mat);
      sp.position.set(gx, gy, gz);
      sp.scale.setScalar(scale);
      this.gCluster.add(sp);
      this.clusterGasMats.push(mat);
    });

    /* 3) gravitational lensing arcs — thin light-bending curves around the
          core (two brighter hero arcs, ten faint background arcs) */
    for (let k = 0; k < 12; k++) {
      const rr = 5200 + R() * 15000;
      const span = k < 2 ? 1.5 + R() * 0.5 : 0.5 + R() * 1.1;
      const segs = 48;
      const arcPts: number[] = [];
      for (let sgi = 0; sgi <= segs; sgi++) {
        const a2 = (sgi / segs) * span;
        arcPts.push(Math.cos(a2) * rr, Math.sin(a2) * rr * 0.24, 0);
      }
      const ag = new THREE.BufferGeometry();
      ag.setAttribute('position', new THREE.Float32BufferAttribute(arcPts, 3));
      const am = new THREE.LineBasicMaterial({
        color: new THREE.Color('#9fdcff'),
        transparent: true,
        opacity: k < 2 ? 0.42 : 0.16 + R() * 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const arc = new THREE.Line(ag, am);
      arc.position.set((R() - 0.5) * 8000, (R() - 0.5) * 5000, (R() - 0.5) * 8000);
      arc.rotation.set(R() * Math.PI, R() * Math.PI, R() * Math.PI);
      this.gCluster.add(arc);
    }
  }

  /** THE MARBLE — one glowing glass sphere with a universe coiled inside,
      placed on the boot view axis. The camera falls straight through it. */
  buildIntroMarble() {
    const g = new THREE.Group();

    /* glass shell */
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(14, 48, 32),
      new THREE.ShaderMaterial({
        uniforms: {
          uFade: { value: 1 }, uTime: { value: 0 },
          uColorA: { value: new THREE.Color('#38bdf8') }, uColorB: { value: new THREE.Color('#8b5cf6') },
        },
        vertexShader: `
          varying vec3 vN; varying vec3 vV;
          void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `
          uniform float uFade; uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB;
          varying vec3 vN; varying vec3 vV;
          void main(){
            vec3 N = normalize(vN); vec3 V = normalize(vV);
            float fr = pow(1.0 - abs(dot(N, V)), 1.9);
            float shimmer = 0.5 + 0.5 * sin(N.y * 5.0 + uTime * 0.8);
            vec3 rim = mix(uColorA, uColorB, 0.35 + 0.3 * shimmer);
            gl_FragColor = vec4(rim * fr * 2.6, min(1.0, fr * 1.5 + 0.05) * uFade);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    g.add(glass);
    this.introMarbleMats.push(glass.material as THREE.ShaderMaterial);

    /* the universe coiled inside — a miniature spiral */
    const N = 240;
    const pos = new Float32Array(N * 3), siz = new Float32Array(N), col = new Float32Array(N * 3);
    const rr = Math.random;
    for (let i = 0; i < N; i++) {
      const arm = i % 3;
      const rad = Math.pow(rr(), 0.6) * 9.5;
      const ang = (arm / 3) * Math.PI * 2 + rad * 0.09 + (rr() - 0.5) * 0.5;
      pos[i * 3] = Math.cos(ang) * rad + (rr() - 0.5) * 1.6;
      pos[i * 3 + 1] = (rr() - 0.5) * 1.8;
      pos[i * 3 + 2] = Math.sin(ang) * rad + (rr() - 0.5) * 1.6;
      siz[i] = 0.5 + rr() * 0.7;
      const w = rr();
      const c = w > 0.82 ? [1, 1, 1] : w > 0.45 ? [0.55, 0.78, 1] : [0.66, 0.5, 1];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    sg.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const spiralMat = new THREE.ShaderMaterial({
      uniforms: { uFade: { value: 1 }, uTime: { value: 0 }, uOpacity: { value: 1 } },
      vertexShader: `
        attribute float aSize; attribute vec3 aColor;
        uniform float uTime; varying vec3 vC; varying float vA;
        void main(){
          vC = aColor;
          vA = 0.55 + 0.45 * sin(uTime * 2.0 + position.x * 5.0);
          vec3 p = position;
          float a = uTime * 0.12;
          p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz; /* the coil slowly turns */
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(300.0 / max(-mv.z, 0.001), 1.5, 6.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uFade; uniform float uOpacity; varying vec3 vC; varying float vA;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = length(c);
          if (d > 0.49) discard;
          gl_FragColor = vec4(vC, (exp(-d * d * 28.0) * 0.9 + 0.08) * vA * uFade * uOpacity);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    g.add(new THREE.Points(sg, spiralMat));
    this.introMarbleMats.push(spiralMat);

    /* the blazing heart + the glass silhouette */
    const glowTex = makeGlowTexture(128, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: new THREE.Color('#bfe3ff'), blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, opacity: 0.9,
    }));
    core.scale.setScalar(11);
    g.add(core);
    this.introMarbleSprites.push(core.material as THREE.SpriteMaterial);
    if (!this.marbleRingTex) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const g2 = cv.getContext('2d')!;
      g2.strokeStyle = 'rgba(255,255,255,0.95)';
      g2.lineWidth = 10; g2.shadowColor = 'rgba(255,255,255,0.8)'; g2.shadowBlur = 14;
      g2.beginPath(); g2.arc(128, 128, 108, 0, Math.PI * 2); g2.stroke();
      this.marbleRingTex = new THREE.CanvasTexture(cv);
    }
    const ring = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.marbleRingTex, color: new THREE.Color('#8ab6ff'), blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, opacity: 0.5,
    }));
    ring.scale.setScalar(34);
    g.add(ring);
    this.introMarbleSprites.push(ring.material as THREE.SpriteMaterial);

    g.visible = false;
    this.introMarble = g;
    this.scene.add(g);
  }

  updateLevels(dt = 0) {    const d = this.currentDist();
    const camLen = this.camera.position.length() + 1;
    const wins = {
      neighborhood: windowFn(d, 260, 750, 4800, 12000),
      galaxy: windowFn(d, 3500, 7500, 38000, 250000),
      /* the deep cluster field fades in AFTER the galaxy band (38k) — its
         sub-halos surround the galaxy-stage camera position, so an early
         ramp painted giant half-transparent smudge rings across the view */
      cluster: windowFn(d, 42000, 60000, 95000, 350000),
      supercluster: windowFn(d, 70000, 100000, 250000, 600000),
      web: windowFn(d, 180000, 280000, 650000, 1200000),
      multiverse: windowFn(d, 340000, 700000, 1e12, 1e12),
    };
    /* Cosmic Web stage — past dial 0.845 the view resolves to PURE web: the
       inner layers (supercluster, clusters, galaxy) hand their weight over
       to the web so nothing of them bleeds into the cosmic web stage. */
    const pureK = THREE.MathUtils.smoothstep(this.rig.tZoomT, 0.845, 0.865);
    if (pureK > 0) {
      wins.web = Math.max(wins.web, pureK);
      wins.supercluster *= 1 - pureK;
      wins.cluster *= 1 - pureK;
      wins.galaxy *= 1 - pureK;
      wins.neighborhood *= 1 - pureK;
    }

    /* the two stages never share the screen — the dial swaps them wholesale */
    if (this.cosmicStage === 'multiverse') {
      wins.neighborhood = 0; wins.galaxy = 0; wins.cluster = 0;
      wins.supercluster = 0; wins.web = 0; wins.multiverse = 1;
    } else {
      wins.multiverse = 0;
    }
    this.gNeighborhood.visible = wins.neighborhood > 0.01;
    /* inner systems live inside this layer but render at system depth (d ~140),
       far below the galaxy window — keep the layer alive while one is held */
    this.gGalaxy.visible = wins.galaxy > 0.01 || this.galaxyInnerFocus;
    this.gCluster.visible = wins.cluster > 0.01;
    this.gSupercluster.visible = wins.supercluster > 0.01;
    this.gWeb.visible = wins.web > 0.01;
    this.gMultiverse.visible = wins.multiverse > 0.01;
    /* the marble hold — one glass marble alone in the darkness (boot intro):
       the whole multiverse shell stays hidden until the fall begins */
    if (this.bootIntro && this.clockT < 2.2) {
      this.gMultiverse.visible = false;
    }
    const isMultiverseMode = wins.multiverse > 0.01;
    if (this.realityGroups) {
      Object.keys(this.realityGroups).forEach((id) => {
        if (this.realityGroups[id]) {
          this.realityGroups[id].visible = isMultiverseMode || (id === this.activeRealityId);
        }
      });
    }

    this.multiverseMats.forEach((m) => {
      m.uniforms.uTime.value = this.clockT;
    });
    if (this.demonCoreMat) {
      this.demonCoreMat.uniforms.uTime.value = this.clockT;
      this.demonCoreMat.uniforms.uHover.value = (this.hoveredId === 'demon-core' ? 1.0 : 0.0);
      this.demonCoreMat.uniforms.uTearStrength.value = this.kamuiEase * 0.9;
    }
    if (this.demonCoreGroup) {
      this.demonCoreGroup.rotation.y += 0.005;

      // Inner golden hyper-octahedron counter-rotation
      if (this.demonCoreInnerGeom) {
        this.demonCoreInnerGeom.rotation.x -= 0.014;
        this.demonCoreInnerGeom.rotation.y += 0.022;
        this.demonCoreInnerGeom.rotation.z += 0.008;
      }

      // 4D Tesseract hypercube matrix rotation
      if (this.demonCoreTesseract) {
        this.demonCoreTesseract.rotation.x += 0.016;
        this.demonCoreTesseract.rotation.y += 0.024;
        this.demonCoreTesseract.rotation.z -= 0.012;
      }

      // Relativistic polar plasma jets flickering / pulsation
      this.demonCoreJets.forEach((jet, idx) => {
        const jetFlicker = 1.0 + 0.18 * Math.sin(this.clockT * 12.0 + idx * Math.PI);
        const jetLength = 1.0 + 0.12 * Math.sin(this.clockT * 6.0 + idx * 2.0);
        jet.scale.set(jetFlicker, jetLength, jetFlicker);
      });

      // 4 Gyroscopic armillary stabilizer rings
      this.demonCoreRings.forEach((ring, idx) => {
        const dir = idx % 2 === 0 ? 1 : -1;
        ring.rotation.z += dir * (0.008 + idx * 0.004);
        ring.rotation.y += (idx % 3 === 0 ? 1 : -1) * 0.006;
        ring.rotation.x += 0.003;
      });

      // Eccentric Tachyon Satellite Probes Orbiting the Core
      this.demonCoreTachyonNodes.forEach((node) => {
        const u = node.userData;
        const a = u.phase + this.clockT * u.speed;
        const tx = Math.cos(a) * u.radius;
        const ty = Math.sin(a) * u.radius * Math.sin(u.incl);
        const tz = Math.sin(a) * u.radius * Math.cos(u.incl);
        node.position.set(tx, ty, tz);
        node.rotation.x += 0.02;
        node.rotation.y += 0.03;
      });

      // 12 Sovereign Monolith Spires (Stabilizer field breathing)
      this.demonCoreSpires.forEach((spire, idx) => {
        const pulse = 1.0 + 0.12 * Math.sin(this.clockT * 2.4 + idx * 0.52);
        spire.scale.set(pulse, 1.0 + 0.08 * Math.sin(this.clockT * 2.0 + idx * 0.3), pulse);
      });

      // Multidimensional Spacetime Gyroscopic Pulse Waves
      this.demonCorePulseRings.forEach((pMesh) => {
        pMesh.userData.phase = (pMesh.userData.phase + 0.006) % 1.0;
        const ph = pMesh.userData.phase as number;
        const currentScaleCrit = 1.0 + ph * 3.2;
        pMesh.scale.set(currentScaleCrit, currentScaleCrit, currentScaleCrit);
        const pMat = pMesh.material as THREE.MeshBasicMaterial;
        pMat.opacity = Math.sin(ph * Math.PI) * 0.55;
        const rotSpd = (pMesh.userData.rotSpeed as number) || 0.005;
        pMesh.rotation.z += rotSpd;
        pMesh.rotation.x += rotSpd * 0.7;
        pMesh.rotation.y += rotSpd * 0.5;
      });
    }

    // Multiverse Stabilization Beams & Traveling Quantum Flux Orbs
    if (this.coreStabilizerBeamMat && wins.multiverse > 0.01) {
      const isHoverCore = this.hoveredId === 'demon-core';
      this.coreStabilizerBeamMat.opacity = (isHoverCore ? 0.85 : 0.35) + 0.1 * Math.sin(this.clockT * 3.0);
    }

    if (this.corePulseOrbs && wins.multiverse > 0.01) {
      this.corePulseOrbs.forEach((orb) => {
        orb.userData.progress = (orb.userData.progress + 0.0035) % 1.0;
        const prog = orb.userData.progress as number;
        const targetPos = orb.userData.targetPos as THREE.Vector3;
        // Interpolate position from Core (0, 0, 0) to target reality position
        orb.position.set(
          targetPos.x * prog,
          targetPos.y * prog,
          targetPos.z * prog
        );
        const orbMat = orb.material as THREE.MeshBasicMaterial;
        orbMat.opacity = Math.sin(prog * Math.PI) * 0.95;
        const orbScale = 1.0 + 0.4 * Math.sin(this.clockT * 4.0 + prog * 6.28);
        orb.scale.set(orbScale, orbScale, orbScale);
      });
    }
    if (this.exoPlates.length) {
      /* fade the horizon plates in as the deep web opens up and out as the
         multiverse scale takes over; sun points back at the camera so the
         procedural surface stays lit from any viewing angle */
      const t = this.rig.tZoomT;
      const band = THREE.MathUtils.smoothstep(t, 0.62, 0.72) * (1 - THREE.MathUtils.smoothstep(t, 0.9, 0.96));
      for (const p of this.exoPlates) {
        p.quaternion.copy(this.camera.quaternion);
        const m = p.material as THREE.ShaderMaterial;
        m.uniforms.uTime.value = this.clockT;
        (m.uniforms.uSunDir.value as THREE.Vector3).copy(this.camera.position).sub(p.position).normalize();
        m.uniforms.uOpacity.value = band * 0.9;
      }
    }
    (this.webLineMat.uniforms.uOpacity as { value: number }).value = wins.web * 0.17;
    this.gWeb.rotation.y = this.clockT * 0.0017;
    this.gSupercluster.rotation.y = this.clockT * 0.0011;
    this.gMultiverse.rotation.y = this.clockT * 0.0008;

    if (this.activeRealityShieldMesh && wins.multiverse > 0.01) {
      this.activeRealityShieldMesh.rotation.y += 0.012;
      this.activeRealityShieldMesh.rotation.z += 0.006;
    }

    /* Pocket Cosmos Marbles — each reality's galaxy turns inside its glass
       shell, shimmering in the reality's two colors */
    this.realityMarbles.forEach((m) => {
      if (wins.multiverse > 0.01 || wins.web > 0.01) {
        m.spiral.rotation.y += dt * m.speed;
        m.glassMat.uniforms.uTime.value = this.clockT;
      }
    });

    /* Orbiting major galaxies — each node rides its ellipse around its reality
       bubble; hover makes the galaxy and its ellipse flare */
    this.galaxyNodes.forEach((node) => {
      const a = node.phase + this.clockT * node.orbitSpeed;
      const ox = Math.cos(a) * node.orbitRadius;
      const oy = Math.sin(a) * node.orbitRadius * Math.sin(node.orbitIncl);
      const oz = Math.sin(a) * node.orbitRadius * Math.cos(node.orbitIncl);
      node.group.position.set(node.centerPos.x + ox, node.centerPos.y + oy, node.centerPos.z + oz);

      // the mini galaxy slowly turns on its own tilted axis
      node.spiralGroup.rotation.y += 0.005;

      const isHovered = this.hoveredId === `galaxy:${node.galaxyData.id}:${node.realityId}`;
      node.group.scale.setScalar((isHovered ? 1.5 : 1.0) * this.kamuiSwallowFactorFor(node.group));
      const lineMat = node.orbitLine.material as THREE.LineBasicMaterial;
      const targetOp = isHovered ? 0.6 : node.galaxyData.isHomeGalaxy ? 0.36 : 0.2;
      lineMat.opacity += (targetOp - lineMat.opacity) * Math.min(1, dt * 8);
      node.glowSprite.material.opacity = isHovered ? 1 : 0.82;
    });

    /* THE ASTRAL CORE — breathing glass heart of the multiverse */
    if (this.astralCoreGroup) {
      this.astralCoreGroup.rotation.y += dt * 0.02;
      const hoverTarget = this.hoveredId === 'multiverse-core' ? 1 : 0;
      this.coreHoverT += (hoverTarget - this.coreHoverT) * Math.min(1, dt * 6);
      this.astralCoreMats.forEach((m) => {
        m.uniforms.uTime.value = this.clockT;
        m.uniforms.uHover.value = this.coreHoverT;
      });
      this.astralCoreHalo.forEach((halo, i) => {
        halo.rotation.y += dt * (i === 0 ? 0.05 : -0.035);
        halo.rotation.x = Math.sin(this.clockT * 0.11 + i) * 0.22;
      });
      this.astralCoreRings.forEach((ring, i) => {
        ring.rotation.z += dt * (0.1 + i * 0.04) * (i % 2 === 0 ? 1 : -1);
        ring.rotation.y += dt * 0.06 * (i % 2 === 0 ? -1 : 1);
      });
      const heart = this.astralCoreGroup.children.find((c) => c instanceof THREE.Sprite) as THREE.Sprite | undefined;
      if (heart) {
        const beat = 1 + 0.05 * Math.sin(this.clockT * 1.4) + this.coreHoverT * 0.12;
        heart.scale.setScalar(96000 * beat);
      }
    }


    this.camera.getWorldDirection(this._vDirScratch);
    const skyVisible = this.cosmicStage !== 'multiverse';
    this.surfaceManager.update({
      kamuiErase: this.membraneShimmer,
      vortexDir: this.kamuiVortexDir,
      dt,
      clockT: this.clockT,
      camera: this.camera,
      skyVisible,
      neighborhoodVisibility: wins.neighborhood,
    });

    if (this.giantMultiverseBoundaryMat) {
      this.giantMultiverseBoundaryMat.uniforms.uTime.value = this.clockT;
    }

    this.clouds.forEach((c) => {
      c.mat.uniforms.uScale.value = (c.px * camLen) / 240;
      c.mat.uniforms.uTime.value = this.clockT;
    });
    /* distance-compensated sizing for level point clouds — the raw 260/z
       attenuation collapses every point to the 1.5px shader floor beyond the
       home system, erasing the galaxy spiral, cluster fields and cosmic web
       at exactly the stages where they should shine. Scaling uScale with
       altitude keeps them at their designed screen size (~2.9× aSize at the
       cloud's center distance; intra-cloud perspective is preserved).
       Modes: 'standard' = the five inner levels, 'multiverse' = already dense
       at its own scale (kept at natural sizing), 'marble' = pocket-cosmos
       spirals inside the glass marbles (~2× aSize at marble viewing range). */
    const lvlScale = camLen / 90;
    this.levelPointMats.forEach((m) => {
      const mode = m.userData.pointMode as string;
      m.uniforms.uScale.value = mode === 'marble' ? camLen / 130 : mode === 'multiverse' ? 1 : lvlScale;
    });
    if (this.giantMultiverseBoundaryMat) {
      this.giantMultiverseBoundaryMat.uniforms.uTime.value = this.clockT;
    }
    this.setLevelOpacity(this.gNeighborhood, wins.neighborhood);
    this.setLevelOpacity(this.gGalaxy, wins.galaxy);
    if (this.galaxyInnerFocus) this.gGalaxy.visible = true; /* setLevelOpacity re-hides it — the inner system lives at system depth */
    this.setLevelOpacity(this.gCluster, wins.cluster);
    this.setLevelOpacity(this.gSupercluster, wins.supercluster);
    this.setLevelOpacity(this.gWeb, wins.web);
    this.setLevelOpacity(this.gMultiverse, wins.multiverse);

    this.levelSprites.forEach((s) => {
      let w = 1;
      if (s.level === 'neighborhood') w = wins.neighborhood;
      if (s.level === 'cluster') w = Math.max(wins.cluster, wins.galaxy * 0.9);
      if (s.level === 'supercluster') w = wins.supercluster;
      if (s.level === 'web') w = wins.web;
      if (s.level === 'multiverse') w = wins.multiverse;
      s.mat.opacity = s.base * w;
    });

    /* per-galaxy core glows fade with the level weight — and while you hold
       one galaxy's frame, its isolated siblings recede to 40% light */
    this.galaxyStageNodes.forEach((n) => {
      n.group.getWorldPosition(this._vScratch2);
      const nodeDist = this.camera.position.distanceTo(this._vScratch2);
      /* the isolated inner system lives only when you dive within its disc */
      const near = nodeDist < 1600;
      if (n.inner.visible !== near) n.inner.visible = near;
      /* R95 — THE DIVE GATE with hysteresis: enter within 1600, leave only
         beyond 2000 — hovering the boundary must not churn the scope swap
         (save/restore/seed on every crossing) nor flicker the home realm.
         Only real inner systems dive: the home galaxy's realm IS the anchor
         star system at the origin — it can never be a dive. */
      const dive = !!n.innerSys && nodeDist < (this.galaxyDiveId === n.data.id ? 2000 : 1600);
      if (dive) {
        this.galaxyDiveId = n.data.id;
      } else if (this.galaxyDiveId === n.data.id) {
        this.galaxyDiveId = null;
      }
      if (near) this.updateInnerSystem(n, dt, nodeDist);
      /* INNER DISSOLVE — while inside the focused realm its disc and core
         glare fade away (the surface-landing grammar), so the star and its
         worlds read crisply instead of drowning in their own galaxy */
      let dim = this.galaxyFocusId && n.data.id !== this.galaxyFocusId ? 0.4 : 1;
      if (this.galaxyInnerFocus && n.data.id === this.galaxyFocusId) {
        dim *= THREE.MathUtils.smoothstep(nodeDist, 400, 1200);
      }
      n.glowMat.opacity = 0.95 * wins.galaxy * dim;
      if (n.discMat.uniforms.uOpacity) n.discMat.uniforms.uOpacity.value = wins.galaxy * dim;
    });

    const beaconW = windowFn(d, 2600, 7000, 64000, 100000);
    this.beacon.visible = beaconW > 0.01;
    (this.beacon.material as THREE.SpriteMaterial).opacity = beaconW;
    this.beacon.scale.setScalar(camLen * 0.011);
    this.gGalaxy.rotation.y = this.clockT * 0.0022;

    /* Scale label covering exact 11-stage cosmological hierarchy:
       STELLAR SYSTEM → STAR-FORMING REGION → SPIRAL ARM → GALACTIC REGION → GALAXY → GALAXY CLUSTER / GALAXY GROUP → SUPERCLUSTER → SUPERCLUSTER COMPLEX → COSMIC WEB → REALITY / UNIVERSE → MULTIVERSE */
    let label = 'STELLAR SYSTEM';
    const fb = this.focusBody();
    if (fb && this.skyFx.surfaceBlend > 0.5) label = `SURFACE · ${fb.data.name.toUpperCase()}`;
    else if (this.cosmicStage === 'multiverse') label = this.realityFocused ? 'MULTIVERSE' : 'REALITY / UNIVERSE';
    else if (d < 260) {
      if (this.galaxyInnerFocus) {
        const innerNode = this.galaxyStageNodes.find((n) => n.data.id === this.galaxyFocusId);
        label = innerNode ? `STELLAR SYSTEM · ${innerNode.data.lineage.stellarSystem.starName.toUpperCase()}` : 'STELLAR SYSTEM';
      } else {
        label = fb ? `APPROACH · ${fb.data.name.toUpperCase()}` : 'STELLAR SYSTEM';
      }
    }
    else if (d < SCALE_BANDS.starForming) label = 'STAR-FORMING REGION';
    else if (d < SCALE_BANDS.spiralArm) label = 'SPIRAL ARM';
    else if (d < SCALE_BANDS.galacticRegion) label = 'GALACTIC REGION';
    else if (d < SCALE_BANDS.galaxyName) {
      /* the nearest staged major galaxy rides the label — pan between them
         and the name follows, so you always know whose disc you're crossing */
      let nearName: string | null = this.activeGalaxyName;
      let best = Infinity;
      for (const n of this.galaxyStageNodes) {
        n.group.getWorldPosition(this._vScratch2);
        const dd = this.camera.position.distanceTo(this._vScratch2);
        if (dd < best) { best = dd; nearName = n.data.name; }
      }
      label = nearName ? `GALAXY · ${nearName.toUpperCase()}` : 'GALAXY';
    }
    else {
      const high = highScaleLabel(d);
      if (high) label = high;
    }
    if (label !== this.lastLabel) {
      this.lastLabel = label;
      this.cb.onScaleLabel(label);
    }
  }

  private setLevelOpacity(group: THREE.Group, w: number) {
    const isVis = w > 0.001;
    group.visible = isVis;
    if (!isVis) return;
    group.traverse((obj) => {
      if (obj instanceof THREE.Points) {
        const m = obj.material as THREE.ShaderMaterial;
        if (m.uniforms && m.uniforms.uOpacity) m.uniforms.uOpacity.value = w;
      }
    });
  }
}
