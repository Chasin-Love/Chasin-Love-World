/// <reference types="vite/client" />
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  starVert, starFrag, planetVert, planetFrag, cloudFrag, atmoFrag,
  ringVert, ringFrag, nebulaVert, nebulaFrag, pointsVert, pointsFrag,
  terrainVert, terrainFrag, skyFrag,
  coronaVert, coronaFrag, 
  asteroidVert, asteroidFrag,
  exoplanetPlateVert, exoplanetPlateFrag,
  demonCoreVert, demonCoreFrag,
  multiverseBoundaryVert, multiverseBoundaryFrag,
  portalFrag,
} from './shaders';
import { smoothstep, makeGlowTexture, windowFn, hash, cpuFbm } from './math';
import { SkyFxSystem } from './sky/SkyFxSystem';
import { UniverseSurfaceManager } from './surface';
import { LENS_UNIFORMS_GLSL, LENS_WARP_GLSL, LENS_POINT_GLSL } from './surface/surfaceShaders';
import { updateRaymarchUniforms, type BlackHoleVisual } from './blackholeRaymarch';
import { BlackHoleSystem } from './blackhole/BlackHoleSystem';
import { KamuiPortalSystem } from './kamui/KamuiPortalSystem';
import { InnerGalaxySystem } from './worlds/InnerGalaxySystem';
import { BodyBuilders } from './worlds/BodyBuilders';
import { LevelStageSystem } from './stages/LevelStageSystem';
import { getBlackHoleParams } from './blackholeParams';
import { canUseRaymarchBlackHole, probeCapability, pixelRatioFor, getQualityTier, QUALITY_CHANGE_EVENT } from './capability';
import { getRaymarchOverride, setRaymarchStatus, RAYMARCH_OVERRIDE_EVENT } from './blackholeTier';
import { CameraRig } from './cameraRig';
import { getCameraMemory, setCameraMemory, clearCameraMemory, type CameraMemory } from './cameraMemory';
import type { CosmicBody, DiaryEntry } from '../domain/universe';
import { REALITIES, RealityConfig, GalaxyClusterData, GalaxyData } from '../realities';
import { HIERARCHY_DIALS } from '../realities/hierarchyStages';
import { generateStellarSystemForGalaxy } from '../realities/galaxyGenerator';
import { calculateKeplerPosition, calculatePhysics, tiltInPlaneVector, CONSTANTS } from '../physics/physicsEngine';
import { LivingGravityField, lensHaloFor, dynamicMassKg, gravityTelemetry, SCENE_UNITS_PER_AU } from '../physics/nbody';
import { simTwinTick, enableSimTwin, disableSimTwin } from '../physics/simTwin';
/* R91 decree — the session driver: the N-body session becomes the sky's
   engine (the canon seeds, the clockwork falls back, Restore heals). The
   driver module itself never writes rendered state — the updateBodies seam
   below is the only writer, exactly as the round92 gauntlet pins. */
import { driverTick, driverReadback, driverVelReadback, driverState, activateScope, enableDriver, disableDriver, healDriver, setScopeStar, type DriverBody } from '../physics/sessionDriver';
import { cosmosBridge } from '../platform/native/cpp_bridge';
import { isPerformanceEnabled, perfMark, perfMeasure, recordFrame } from '../platform/performance';
import { isDesktop } from '../platform/desktop/adapter';
import { ensureSkyFor, getActiveSkySpec, type ActiveSkySpec } from '../platform/sky/skyRegistry';
import { type AuroraSignal } from '../platform/sentiment/sentiment';
import {
  WEB_CEILING,
  MULTIVERSE_FLOOR_CLAMP, MULTIVERSE_FLOOR_RETURN, RETURN_ZOOM_VEL, REALITY_FLOOR,
} from './systems/stageThresholds';
import { SCALE_BANDS, highScaleLabel } from './systems/levelSystem';
import { KAMUI_ENTRY_HOLD, KAMUI_ENTRY_FRAMING, KAMUI_TRIGGER_DURATION, KAMUI_REVERSE_DURATION, KAMUI_VACUUM_WINDOW, KAMUI_BEATS, kamuiBeatEase } from './systems/kamuiPhases';

/* Round 52 — SPACETIME BENDING OF THE BACKGROUND, composed once.

   The universe-surface canvas and the sky shells have been lensed since
   Round 14/16, but every DISCRETE star in the sky is a point cloud built by
   makePoints()/pointsMaterial() — and those materials carried no lens uniforms
   at all, so the bright stars the eye actually tracks stayed rigid while the
   faint procedural canvas bent underneath them. The sky therefore read as
   flat around a black hole, which is the one thing Einstein's field equations
   make impossible.

   pointsVert now lifts each vertex to world space and bends its direction
   from the camera (lensBendWorld), so stars arc, pile up at the shadow edge
   and vanish into the capture region exactly as the surface does. It needs
   the lens header ahead of it, so the three chunks are composed here once and
   every point material reuses the identical string (one program, not N). */
const POINTS_VERT_LENSED = `#define LENS_WORLD\n${LENS_UNIFORMS_GLSL}\n${LENS_WARP_GLSL}\n${LENS_POINT_GLSL}\n${pointsVert}`;

interface EngineCallbacks {
  /** R74 — `disk` is THE HERALD'S DISK: the hovered object's projected screen
      circle (center + radius, in CSS px), so the hover card can anchor
      OUTSIDE the object instead of standing on it. Re-emitted ~8 Hz while
      the hover lives — the orbit keeps moving the object under a still
      pointer, and the card rides the disk's edge with it. */
  onHover: (id: string | null, x?: number, y?: number, disk?: { cx: number; cy: number; r: number } | null) => void;
  onSelect: (id: string | null) => void;
  onActivate: (id: string) => void;
  onPortalPeak: (kind: 'diary' | 'vault', id: string) => void;
  onPortalDone: () => void;
  onContext: (id: string, x: number, y: number) => void;
  onScaleLabel: (label: string) => void;
  onSimDate: (iso: string) => void;
  onSelectReality?: (realityId: string) => void;
  onDoubleClickReality?: (realityId: string) => void;
  onSelectCluster?: (cluster: GalaxyClusterData) => void;
  onSelectDemonCore?: () => void;
  /* the Astral Core at (0,0,0) — single click opens the Multiverse Core Console */
  onSelectCore?: () => void;
  /* major galaxies orbiting a reality bubble — one ellipse per galaxy.
     EVERY click dives into the galaxy (single or double). */
  onSelectGalaxy?: (galaxyId: string, realityId: string) => void;
  /* a world inside a galaxy's isolated stellar system was clicked (or the
     selection was released with null) — carries the synthetic CosmicBody
     so the App can show the same selection card + physics telemetry */
  onSelectInnerWorld?: (info: InnerWorldInfo | null) => void;
  /* fired once after the first fully rendered frame — the App holds its
     intro veil until then, so shader compilation and scene building never
     surface as a frozen universe */
  onFirstFrame?: () => void;
  /** KAMUI v2 — the energy pool readout (throttled ~5 Hz) and the rejection
      of an unaffordable/invalid traversal (the bounce-back pulse already
      played in-world; this is for the toast). */
  /** fired whenever the red vortex tears (v1 summon and eject alike) —
      `reverse` is the close/return face; `vortexUv` is the tear's screen
      position in CSS terms (0..1, y down) so the DOM swallow can aim at it */
  onKamuiTrigger?: (reverse: boolean, vortexUv: { x: number; y: number }) => void;
  /* THE COSMIC ECHO — a memory meteor was clicked: reopen its diary page */
  onEchoOpen?: (entryId: string, planetId: string, title: string) => void;
  /* echo meteor hover — App shows a small memory card near the pointer */
  onHoverEcho?: (echo: { entryId: string; planetId: string; title: string } | null, x?: number, y?: number) => void;
}

/** Everything the App needs to present a clicked inner world. */
export interface InnerWorldInfo {
  galaxyId: string;
  galaxyName: string;
  starName: string;
  body: CosmicBody;
}

interface RuntimeGalaxyNode {
  galaxyData: GalaxyData;
  realityId: string;
  group: THREE.Group;
  collider: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  orbitIncl: number;
  phase: number;
  centerPos: THREE.Vector3;
  spiralGroup: THREE.Group;
  glowSprite: THREE.Sprite;
  orbitLine: THREE.LineLoop;
}

/* the runtime twin of a CosmicBody — exported since R97: the subsystems'
   getters return it and the engine's focus query is their shared entry */
export interface RuntimeBody {
  data: CosmicBody;
  group: THREE.Group;
  collider: THREE.Mesh;
  mat?: THREE.ShaderMaterial;
  cloudMat?: THREE.ShaderMaterial;
  ringMat?: THREE.ShaderMaterial;
  atmo?: THREE.Mesh;
  cloudMesh?: THREE.Mesh;
  ringMesh?: THREE.Mesh;
  spinMesh?: THREE.Mesh;
  spinRate?: number;
  cloudSpinRate?: number;
  streakRing?: THREE.Mesh;
  streakTarget?: number;
  streakDays?: number;
  moons: { mesh: THREE.Mesh; a: number; speed: number; phase: number; incl?: number; node?: number; id?: string; radius?: number }[];
  extras?: THREE.ShaderMaterial[];
  orbitLine?: THREE.LineLoop;
  ghost: number;
  ghostTarget: number;
  fade: number;
  fadeTarget: number;
  hoverT: number;
  baseScale: number;
  /* Round 14 — this body's lens-halo multiplier on the universe surface
     (halo radius = multiplier × the body's own apparent silhouette angle) */
  lensHalo?: number;
}

/* one Kepler world of a galaxy's REAL isolated inner system — the same
   shader construction as the home anchor system's planets. Nebulae ride the
   same record (their shader carries uCamLocalP instead of uSunDir). */
export interface InnerPlanet {
  data: CosmicBody;
  group: THREE.Group;
  mat?: THREE.ShaderMaterial;
  hole?: BlackHoleVisual;
  cloudMat?: THREE.ShaderMaterial;
  cloudMesh?: THREE.Mesh;
  atmo?: THREE.Mesh;
  ringMat?: THREE.ShaderMaterial;
  ringMesh?: THREE.Mesh;
  spinMesh?: THREE.Mesh;
  spinRate?: number;
  cloudSpinRate?: number;
  moons: { mesh: THREE.Mesh; a: number; speed: number; phase: number; incl?: number; node?: number; id?: string; radius?: number }[];
  orbitLine?: THREE.LineLoop;
  streakRing?: THREE.Mesh;
  streakTarget?: number;
  streakDays?: number;
  entryMoons?: boolean;
  hoverT: number;
}

/* the full isolated stellar system living inside one galaxy node — a real
   star (shader surface + corona), real worlds and its own asteroid belt */
export interface InnerSystem {
  starData: CosmicBody;
  starUniforms: Record<string, THREE.IUniform>;
  starMesh: THREE.Mesh;
  corona: THREE.Mesh;
  coronaMat: THREE.ShaderMaterial;
  haloA: THREE.Points;
  haloB: THREE.Points;
  planets: InnerPlanet[];
  belt: THREE.Group;
  beltInst: { mesh: THREE.InstancedMesh; tumbles: BeltRock[] }[];
  beltDustMat: THREE.ShaderMaterial;
  /* R95 — the living rings' pacing + canon-restore flag (inner edition) */
  oscAt?: number;
  oscCanonDirty?: boolean;
}

const DAY = 86400000;

/* one tumbling belt rock — fixed place and size, free spin on its own axis */
export interface BeltRock {
  pos: THREE.Vector3; scale: THREE.Vector3;
  q: THREE.Quaternion; axis: THREE.Vector3; speed: number;
}

function makeGalaxySprite(warm: boolean): THREE.Texture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, s, s);
  const half = s / 2;
  const radius = half - 1;
  const core = warm ? 'rgba(255,236,200,0.35)' : 'rgba(214,230,255,0.35)';
  const mid = warm ? 'rgba(240,190,130,0.08)' : 'rgba(150,180,235,0.08)';
  const grad = g.createRadialGradient(half, half, 0, half, half, radius);
  grad.addColorStop(0, core);
  grad.addColorStop(0.3, mid);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(half, half, radius, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function makeRingGlowTexture(): THREE.Texture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, s, s);
  g.strokeStyle = 'rgba(240,248,255,0.95)';
  g.lineWidth = s * 0.028;
  g.shadowColor = 'rgba(180,235,225,0.9)';
  g.shadowBlur = s * 0.055;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.40, 0, Math.PI * 2);
  g.stroke();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = s * 0.008;
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

export class UniverseEngine {
  renderer: THREE.WebGLRenderer;
  /* R97 — the shared runtime below is deliberately public: the subsystem
     modules (sky/SkyFxSystem, blackhole/BlackHoleSystem, kamui/…, worlds/…,
     stages/…) reach it through the `eng` handle. The APP-facing API is the
     constructor + callbacks + methods and is unchanged. */
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  /* KAMUI (v1) — the red demonic space-time vortex: a full-screen post-process
     driven by triggerKamui() (the shader lives in shaders.ts portalFrag). */
  portalPass!: ShaderPass;
  /* R97 — the Kamui/portal machine (kamui/KamuiPortalSystem): the vortex, the
     plain-zoom portal, the summon hold and the staged stage-warp. The
     portalPass itself stays here (round63 pins the composer chain around it). */
  kamuiPortal!: KamuiPortalSystem;
  /* R97 — the inner-galaxy machine (worlds/InnerGalaxySystem): the isolated
     stellar system a galaxy dive lands in, its per-frame life and the dive
     lifecycle. Dive state (galaxyDive, galaxyDiveId, pendingGalaxyEntry) and
     view-state stay engine-owned; the machine reaches them through pairs. */
  innerGalaxy!: InnerGalaxySystem;
  /* R97 — the world builders (worlds/BodyBuilders): the Anchor Star, the
     per-body builder, the belt, the diary-moon sync, the roster sync, the
     exoplanet plates and the orbit-ring rebuilders. */
  worlds!: BodyBuilders;
  /* R97 — the stage subsystem (stages/LevelStageSystem): the multiverse
     builder, the cosmic level stages, the intro marble and the per-frame
     stage arbiter. Behavior only — the stage fields stay engine-owned. */
  private stages!: LevelStageSystem;
  cb: EngineCallbacks;
  bodies: RuntimeBody[] = [];
  colliderList: THREE.Mesh[] = [];
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2(-2, -2);
  private pointerMoved = false;
  hoveredId: string | null = null;
  /* THE HERALD'S DISK (R74) — the collider mesh behind the current hover
     (its projected circle anchors the hover card outside the object) and
     the ~8 Hz re-emit clock that lets the card ride an orbiting object. */
  private hoverHit: THREE.Mesh | null = null;
  private hoverAnchorT = 0;
  selectedId: string | null = null;
  focusId: string | null = null;
  simDays = 0;
  private paused = false;
  private rendering = true;
  private coreActive = false; private coreT = 0;
  private epoch = Date.now() - 400 * DAY;

  /* the web's edge membrane — pushing at the wall makes it shimmer */
  membraneShimmer = 0;

  /* -------------- Round 14 — gravitational lensing + living gravity -------------- */
  /* The masses bend ONLY the universe surface (celestial dome + background
     star shells) — the observable signature of Einstein's curvature. The
     bodies themselves never bend (the first post-pass attempt was removed
     after owner review: it warped the planets' own edges). */
  private lensCur = 1;                /* damped toggle — lensing is born ON */
  private lensTarget = 1;
  private lensVecs: THREE.Vector4[] = Array.from({ length: 16 }, () => new THREE.Vector4());
  private lensRims: number[] = new Array(16).fill(0);
  /* Round 16 — 1.0 = black hole (exact Schwarzschild optics + capture shadow) */
  private lensStrong: number[] = new Array(16).fill(0);
  /* ROUND 66 — THE LIVING LENS: per-hole world velocity for the sky's
     drag-and-swirl (the water-around-the-cone law). Velocities are MEASURED
     from the real per-frame displacement and smoothed (orbital motion is
     steady) — no hardcoded speed anywhere. w carries the disk's spin sign. */
  private lensVels: THREE.Vector4[] = Array.from({ length: 16 }, () => new THREE.Vector4());
  private lensVelPrev = new Map<string, { p: THREE.Vector3; v: THREE.Vector3 }>();
  private _lensVelInst = new THREE.Vector3();
  private _lensDir = new THREE.Vector3();
  private _lensFwd = new THREE.Vector3();
  private _lensPos = new THREE.Vector3();  /* ROUND 61 — world pos of inner-system holes */
  /* Living Gravity: first-order N-body coupling in osculating elements (nbody.ts). */
  livingField = new LivingGravityField();
  private livingGravityOn = true;     /* real mutual gravity — ON by default */
  private lastSimDelta = 0;           /* sim-days advanced last frame (element-rate dt) */
  /* R88 — the per-frame twin gate. OFF by law: the twin runs only when the
     author flips it from the twin card. simTwin.ts is read-only against the
     rendered sky (the hybrid ruling holds in every round). */
  private simTwinOn = false;
  /* R92 — the universe driver gate (the R91 decree, in shadow). OFF by law
     this round: the N-body session drives the rendered sky only when the
     author flips it from the twin card. The flip owns the session (the
     twin lab and Verify Twin rest while the driver runs) and the seam in
     updateBodies consumes the extrapolated readback — stale frames fall
     back to the Kepler solve by the freshness law, silently. */
  private universeDriverOn = false;
  /* R94 — the galaxy scope the camera is visiting this frame (set by
     updateInnerSystem, consumed by the driver block, cleared each frame).
     One session per tier: the visible realm is the living one; the resting
     scope's memory persists and resumes with a catch-up burst on return. */
  driverGalaxyScope: { id: string; bodies: DriverBody[] } | null = null;
  /* R95 — THE STEADY SEAM state. The crossfade keeps the session⇄clockwork
     source switch invisible (a snap here was the visible flicker); the
     frozen array is what the fade eases away from when a readback goes
     stale. */
  private drvBlend = 0;
  private drvLastPos: Array<[number, number, number]> | null = null;
  /* R95 — the living rings: last clockT an osculating orbit-line rebuild ran. */
  private oscRebuildAt = 0;
  private oscCanonDirty = false;
  /* R95 — the galaxy inner system the camera is diving (hysteresis gate:
     enter <1600, leave >2000). While set, the home realm eases out of view
     — the home vault's geodesic quad used to render beside the visited
     galaxy's own hole (the "three black holes" bug). */
  galaxyDiveId: string | null = null;
  private homeRealmW = 1;
  /* fired once after the first rendered frame (drives the App's intro veil) */
  private firstFrameFired = false;
  /* the constructor precompiles the whole scene; the first setReality call
     runs against that same fresh scene and must not compile everything again */
  private skipNextCompile = true;
  _vScratch4 = new THREE.Vector3();
  private dragging = false; private lastPX = 0; private lastPY = 0; private downX = 0; private downY = 0; private downT = 0;
  private lastClickT = 0; private lastClickId: string | null = null; private clickTimer: ReturnType<typeof setTimeout> | null = null;
  starUniforms: Record<string, THREE.IUniform> = {};
  private connectionLines!: THREE.LineSegments;
  private connectionMat!: THREE.LineBasicMaterial;
  surfaceManager!: UniverseSurfaceManager;
  gNeighborhood = new THREE.Group();
  gGalaxy = new THREE.Group();
  gCluster = new THREE.Group();
  gSupercluster = new THREE.Group();
  gWeb = new THREE.Group();
  gMultiverse = new THREE.Group();
  skyFx!: SkyFxSystem;
  multiverseColliders: THREE.Mesh[] = [];
  /* major galaxies orbiting each reality bubble — ONE ellipse per galaxy */
  galaxyNodes: RuntimeGalaxyNode[] = [];
  multiverseMats: THREE.ShaderMaterial[] = [];
  /* distant exoplanet horizon plates in the deep web (high/cinematic tiers) */
  exoPlates: THREE.Mesh[] = [];
  clouds: { mat: THREE.ShaderMaterial; px: number }[] = [];
  levelSprites: { mat: THREE.SpriteMaterial; base: number; level: 'neighborhood' | 'cluster' | 'supercluster' | 'beacon' | 'web' | 'multiverse' }[] = [];
  /* every Points material inside the six level groups — uScale is
     distance-compensated each frame (see updateLevels) so the galaxy spiral,
     cluster fields and cosmic web keep their designed screen size at their
     own scales instead of collapsing to the 1.5px shader floor. */
  levelPointMats: THREE.ShaderMaterial[] = [];
  /* C++ Kepler accelerator — the native core (desktop binary or WASM) batches
     the per-frame orbit positions; the tick loop reads this cache and falls
     back to the inline TS solver whenever the cache is stale or absent. */
  private keplerCache: {
    simDays: number;
    xyz: Float64Array;
    valid: boolean;
    inflight: boolean;
  } = { simDays: NaN, xyz: new Float64Array(0), valid: false, inflight: false };
  private keplerFrame = 0;
  /* ROUND 63 — the reference's blaze, whole: his demo runs bloom strength
     0.68 / radius 0.2 / threshold 0.4 (main.js config verbatim). While a
     geodesic hole is on stage the composer eases to exactly those values —
     strength via this boost (0.18 + 0.50), threshold and radius below in the
     tick — and relaxes to the project baseline when you fly away.
     R97: this stays ENGINE-owned — it is the composer's bloom memory, fed by
     the subsystem's holeGlowProximity() through the delegate above. */
  private bloomHoleBoost = 0;

  private keplerEcc = new Map<string, number>();
  /* R97 — the black hole subsystem owns the visuals, the frame-budget
     breaker, the pixel-ratio damp and the camera-checkpoint state
     (blackhole/BlackHoleSystem); the shell keeps only the tier listeners. */
  bhSys!: BlackHoleSystem;
  private onQualityChange: () => void = () => {};
  private onTierOverride: () => void = () => {};
  /* ROUND 61 — the same checkpoint on window dismissal: closing the app can
     beat the 5 s idle cadence, and the last drag often ends < 5 s before the
     close. The idle requirement is applied by giving the checkpoint its
     full sampling interval as a pseudo-dt (a mid-flight camera fails the
     quiescence guard above and writes nothing). */
  private onPageHide = () => {
    if (this.disposed) return;
    this.bhSys.checkpointCameraView(5);
  }
  /* R97 — the pinned bloom line calls the proximity through this delegate;
     the implementation lives in the black hole subsystem. */
  private holeGlowProximity(): number {
    return this.bhSys.holeGlowProximity();
  }
  /* Pocket Cosmos Marbles — every reality bubble is a glass universe */
  realityMarbles: { spiral: THREE.Points; glassMat: THREE.ShaderMaterial; speed: number }[] = [];
  marbleRingTex: THREE.CanvasTexture | null = null;
  /* Stage system — the Cosmic Web and the Multiverse are two SEPARATE places.
     They are never visible at the same time; the zoom dial carries you
     between them and the stage swaps when you cross its edge. */
  cosmicStage: 'web' | 'multiverse' = 'web';
  /* the quiet boot — the scene sits fully formed behind the App's intro veil;
     this finalize runs once on the first frame */
  bootIntro = true;
  /* THE BIRTH — birthK drives the ejection: everything erupts outward from
     the single center point in a swirling bend (applied in updateBodies) */
  private birthK = 0;
  /* THE MARBLE — one glowing glass sphere with a universe coiled inside */
  introMarble!: THREE.Group;
  introMarbleMats: THREE.ShaderMaterial[] = [];
  introMarbleSprites: THREE.SpriteMaterial[] = [];
  realityFocused = false;
  webLineMat!: THREE.ShaderMaterial;
  /* plain zoom dive into a clicked galaxy — the dial eases on its own; this
     watcher only flips into the isolated inner system once the camera is
     actually inside the disc */
  galaxyDive: { galaxyId: string; endInner: boolean } | null = null;
  beacon!: THREE.Sprite;
  activeRealityId = 'sol-prime';
  /* a galaxy dive requested before the target reality's roster landed —
     executed by setReality once the stage is built */
  pendingGalaxyEntry: { realityId: string; galaxyId: string } | null = null;
  private activeReality: RealityConfig | null = null;
  realityGroups: Record<string, THREE.Group> = {};
  activeRealityShieldMesh: THREE.Group | null = null;
  /* the galaxy the traveler last dove into — pinned to the GALAXY scale label */
  activeGalaxyName: string | null = null;
  /* THE GALAXY STAGE — rebuilt from the active reality's real roster: one
     full spiral per major galaxy (the home galaxy centered & brightest) */
  gGalaxyContents = new THREE.Group();
  galaxyStageNodes: { data: GalaxyData; group: THREE.Group; collider: THREE.Mesh; radius: number; glowMat: THREE.SpriteMaterial; discMat: THREE.ShaderMaterial; inner: THREE.Group; innerSys: InnerSystem | null }[] = [];
  galaxyStageColliders: THREE.Mesh[] = [];
  galaxyStagePointMats: { points: THREE.Points; mat: THREE.ShaderMaterial }[] = [];
  /* hover/click colliders for worlds inside the isolated inner systems —
     `inner:<bodyId>` namespaces them away from the home reality's bodies */
  innerColliderList: THREE.Mesh[] = [];
  /* the inner world the camera is currently orbiting (clicked), if any */
  innerFocusBodyId: string | null = null;

  galaxyFocusId: string | null = null;
  /* true while the camera is INSIDE a galaxy's own isolated stellar system */
  galaxyInnerFocus = false;
  /* THE CLUSTER STAGE — hot intracluster gas glow (tinted per reality) */
  clusterGasMats: THREE.SpriteMaterial[] = [];
  /* THE ASTRAL CORE — the interactive multiverse core at (0,0,0); clicking it
     opens the Multiverse Core Console (the reality management plate) */
  astralCoreGroup: THREE.Group | null = null;
  astralCoreMats: THREE.ShaderMaterial[] = [];
  astralCoreRings: THREE.Mesh[] = [];
  astralCoreHalo: THREE.Points[] = [];
  coreHoverT = 0;
  giantMultiverseBoundaryMat!: THREE.ShaderMaterial;
  giantMultiverseSphereGroup!: THREE.Group;
  demonCoreGroup!: THREE.Group;
  demonCoreMat!: THREE.ShaderMaterial;
  demonCoreRings: THREE.Mesh[] = [];
  demonCoreSpires: THREE.Mesh[] = [];
  demonCoreInnerGeom!: THREE.Mesh;
  demonCorePulseRings: THREE.Mesh[] = [];
  demonCoreJets: THREE.Mesh[] = [];
  demonCoreTesseract: THREE.Group | null = null;
  demonCoreTachyonNodes: THREE.Mesh[] = [];
  coreStabilizerBeams!: THREE.LineSegments;
  coreStabilizerBeamMat!: THREE.LineBasicMaterial;
  corePulseOrbs: THREE.Mesh[] = [];
  demonCoreLight!: THREE.PointLight;
  demonCoreCollider!: THREE.Mesh;

  lastLabel = '';
  private lastDateSent = 0;
  clockT = 0;
  private disposed = false;
  private canvas: HTMLCanvasElement;
  private originalTouchAction = '';

  /* THE SKY STUDIO — the active reality's photo sky (from its own assets
     folder). Desktop fetches the registry itself so a device that never ran
     the web server still gets its skies. */
  private activeSkySpec: ActiveSkySpec | null = null;

  /* THE COSMIC ECHO — the hover id of the echo streak under the pointer lives
     here (the interaction half); the shower itself lives in SkyFxSystem */
  echoHoverId: string | null = null;
  private lastEchoHover = false;
  /* constellation pulse registry — atmosphere strength envelopes */
  private pulses: { mat: THREE.ShaderMaterial; base: number; until: number }[] = [];

  private onContextLost = (event: Event) => {
    event.preventDefault();
  };

  private onContextRestored = () => {
    /* AUDIT 2026-09-28 — the test was INVERTED: `if (!this.disposed)` compiled
       the scene only while the engine was ALIVE, which is exactly when the
       browser re-delivers a restored GL context — and did nothing after
       dispose, which is the only time it could ever be harmful. A real
       restore also invalidates the EffectComposer's render targets (they
       belonged to the lost context), so they must be re-created too, or the
       first frame after a GPU driver reset renders into dead buffers — the
       "universe went permanently black after a driver hiccup" class of bug. */
    if (this.disposed) return;
    this.composer.dispose();
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.bhSys.pixelRatioApplied);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.buildComposerPasses();
    this.renderer.compile(this.scene, this.camera);
  };

  /** The composer pass chain, in its one canonical order — shared by the
      constructor and the context-restored rebuild (they must never drift). */
  private buildComposerPasses(): void {
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.12, 0.15, 0.90);
    this.composer.addPass(this.bloomPass);
    this.portalPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 },
        uColor: { value: new THREE.Color('#f2c178') }, uDir: { value: 1 },
        uVac: { value: 0 }, uWind: { value: 0 }, uPulse: { value: 0 }, uTwist: { value: 0 }, uSpin: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: portalFrag,
    });
    this.composer.addPass(this.portalPass);
    this.composer.addPass(new OutputPass());
  }

  /* Reusable scratchpad instances for zero-GC render frame updates */
  _vScratch1 = new THREE.Vector3();
  _vScratch2 = new THREE.Vector3();
  _vScratch3 = new THREE.Vector3();
  _vDirScratch = new THREE.Vector3();
  private _vFocusScratch = new THREE.Vector3();
  _qScratch = new THREE.Quaternion();
  _qScratch2 = new THREE.Quaternion();
  private _corePosBuffer = new Float32Array(1000 * 3);

  constructor(canvas: HTMLCanvasElement, bodies: CosmicBody[], cb: EngineCallbacks) {
    this.cb = cb;
    /* R97 — the subsystems are built first; their getters reach the shared
       runtime lazily, so construction order is never a hazard */
    this.kamuiPortal = new KamuiPortalSystem(this);
    this.innerGalaxy = new InnerGalaxySystem(this);
    this.worlds = new BodyBuilders(this);
    this.stages = new LevelStageSystem(this);
    this.canvas = canvas;
    this.originalTouchAction = canvas.style.touchAction;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const lowPowerDevice = navigator.hardwareConcurrency <= 4 || (deviceMemory !== undefined && deviceMemory <= 4);
    /* capability probe: cinematic tier (desktop-class GPUs) unlocks pixelRatio
       up to 2 and the raymarched hole; user override can force any tier */
    const cap = probeCapability();
    const maxPixelRatio = lowPowerDevice || cap.tier === 'low' ? 1 : pixelRatioFor(cap.tier, 99);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPowerDevice, powerPreference: lowPowerDevice ? 'default' : 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    this.bhSys = new BlackHoleSystem(this);
    this.bhSys.pixelRatioBase = this.renderer.getPixelRatio();
    this.bhSys.pixelRatioApplied = this.bhSys.pixelRatioBase;
    this.bhSys.holePixelRatioDamp = this.bhSys.pixelRatioBase;
    /* tier changes (settings UI) re-apply the pixel ratio live */
    this.onQualityChange = () => {
      const next = pixelRatioFor(getQualityTier(), 99);
      this.bhSys.pixelRatioBase = Math.min(window.devicePixelRatio, next);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, next));
      this.composer?.setPixelRatio(Math.min(window.devicePixelRatio, next));
      /* Round 53 — stand the geodesic tier down only when the NEW tier
         genuinely cannot run it (low / software GL). The old
         `!== 'cinematic'` test was a Version-3 leftover: at medium — the
         DEFAULT tier — merely touching the quality dial tore the lensed
         renderer down for the session, contradicting the documented
         on-at-medium+ policy. A round-trip back to a capable tier re-arms
         it (unless the shader failed or the breaker holds it down). */
      if (!canUseRaymarchBlackHole()) {
        this.bhSys.setGeodesicAll(false);
        setRaymarchStatus('off', 'tier-low');
      } else if (!this.bhSys.raymarchDisabled && !this.bhSys.raymarchStoodDown && this.bhSys.blackHoles.length > 0) {
        this.bhSys.setGeodesicAll(true);
        setRaymarchStatus(getRaymarchOverride() === 'on' ? 'forced' : 'active', 'quality-restore');
      }
      if (getQualityTier() === 'cinematic' && this.exoPlates.length === 0) this.buildExoplanetPlates();
    };
    window.addEventListener(QUALITY_CHANGE_EVENT, this.onQualityChange);
    /* Round 53 — the Studio card's tier switch lands here (blackholeTier) */
    this.onTierOverride = () => {
      const v = getRaymarchOverride();
      if (v === 'off') {
        this.bhSys.setGeodesicAll(false);
        setRaymarchStatus('off', 'override-off');
      } else if (v === 'on') {
        if (this.bhSys.raymarchDisabled) { setRaymarchStatus('fallback', 'shader-error'); return; }
        this.bhSys.raymarchStoodDown = false;
        this.bhSys.setGeodesicAll(true);
        setRaymarchStatus('forced', 'override-on');
      } else if (!this.bhSys.raymarchDisabled && !this.bhSys.raymarchStoodDown) {
        this.bhSys.setGeodesicAll(true);
        setRaymarchStatus('active', 'auto');
      } else {
        setRaymarchStatus('fallback', this.bhSys.raymarchDisabled ? 'shader-error' : 'frame-budget');
      }
    };
    window.addEventListener(RAYMARCH_OVERRIDE_EVENT, this.onTierOverride);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor('#04060c', 1);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 8000000);
    this.rig = new CameraRig(this.camera, canvas);
    /* ROUND 61 — the last resting view is checkpointed when the app closes
       (web/app window dismissal can beat the 5 s idle cadence). Same guard
       as the frame path: only a resting view is worth remembering, and the
       5 s pseudo-dt stands in for the frame-path idle requirement. */
    window.addEventListener('pagehide', this.onPageHide);
    this.scene.add(new THREE.AmbientLight(0x1e293b, 0.3));
    const sun = new THREE.PointLight(0xfff0d6, 0.95, 0, 0);
    this.scene.add(sun);

    this.surfaceManager = new UniverseSurfaceManager(this.scene, this.activeReality);
    this.gNeighborhood = this.surfaceManager.getNeighborhoodGroup();
    this.buildBackdrop();
    this.buildAnchor();
    bodies.forEach((b) => this.buildBody(b));
    this.buildBelt();
    this.buildLevels();
    this.buildMultiverse();
    /* R97 — the sky subsystem: meteors, the Cosmic Echo shower, the aurora,
       the planet-surface dressing. Built after the backdrop/anchor/bodies so
       the aurora's corona material already exists. */
    this.skyFx = new SkyFxSystem(this);
    this.skyFx.buildMeteors();
    this.skyFx.buildSurface();
    this.buildIntroMarble();
    this.scene.add(this.camera); /* camera lives in the scene graph */


    /* collect level point-cloud materials for per-frame size compensation */
    [this.gNeighborhood, this.gGalaxy, this.gCluster, this.gSupercluster, this.gWeb, this.gMultiverse].forEach((g) => {
      const defaultMode = g === this.gMultiverse ? 'multiverse' : 'standard';
      g.traverse((obj) => {
        if (obj instanceof THREE.Points) {
          const m = obj.material as THREE.ShaderMaterial;
          if (m.uniforms && m.uniforms.uScale && !this.levelPointMats.includes(m)) {
            m.userData.pointMode = (m.userData.pointMode as string | undefined) ?? defaultMode;
            this.levelPointMats.push(m);
          }
        }
      });
    });

    this.connectionMat = new THREE.LineBasicMaterial({ color: 0xf2c178, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const initGeom = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this._corePosBuffer, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    initGeom.setAttribute('position', posAttr);
    this.connectionLines = new THREE.LineSegments(initGeom, this.connectionMat);
    this.connectionLines.frustumCulled = false;
    this.scene.add(this.connectionLines);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    /* THE KAMUI pass (v1) — the red demonic vortex (shaders.ts portalFrag).
       At uStrength 0 it is a single texture fetch; triggerKamui() pulses it.
       Pass order lives in buildComposerPasses so the context-restored
       rebuild can never drift from the boot chain. */
    this.buildComposerPasses();

    this.bindEvents();
    this.resize();
    window.addEventListener('resize', this.resize);

    /* surface GPU shader-compile failures loudly — the Vault black hole's
       fallback halo listens for this and reveals itself only on real failure */
    this.renderer.debug.onShaderError = (gl, program, vs, fs) => {
      const vsLog = vs ? (gl.getShaderInfoLog(vs) || '') : '';
      const fsLog = fs ? (gl.getShaderInfoLog(fs) || '') : '';
      const progLog = program ? (gl.getProgramInfoLog(program) || '') : '';
      const vsSource = vs ? (gl.getShaderSource(vs) ?? '') : '';
      const fsSource = fs ? (gl.getShaderSource(fs) ?? '') : '';
      const log = (vsLog ? `[Vertex Error]: ${vsLog}\n` : '') +
                  (fsLog ? `[Fragment Error]: ${fsLog}\n` : '') +
                  (progLog ? `[Program Link Error]: ${progLog}` : '');
      const source = (vsLog ? `--- VERTEX SHADER ---\n${vsSource}\n` : '') +
                     (fsLog ? `--- FRAGMENT SHADER ---\n${fsSource}` : '');
      console.error('[universe] shader compile failure:', log || 'unknown shader error', '\nSource:\n', source.slice(0, 4000));
      window.dispatchEvent(new CustomEvent('eventide-shader-error', { detail: { source: source.slice(0, 4000), log: log || 'unknown shader error' } }));
      /* any shader failure permanently disarms the geodesic tier this
         session — the hole hides itself (Round 55: no stand-in exists) */
      this.bhSys.raymarchDisabled = true;
      this.bhSys.raymarchStoodDown = false;
      this.bhSys.setGeodesicAll(false);
      setRaymarchStatus('fallback', 'shader-error');
    };

    /* Precompile EVERY shader program now, during the boot fade — without
       this, WebGL compiles lazily on first visibility and each new stage
       (multiverse, tunnel, portal…) froze the frame for seconds mid-action.
       Also survive a GPU context reset instead of staying black forever. */
    this.renderer.compile(this.scene, this.camera);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
    /* Dev builds keep shader-error checking ON — a failed compile (like a
       missing noise chunk) must never again silently blank a whole material.
       Production keeps it off for frame-time smoothness. */
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;

    this.renderer.setAnimationLoop(this.tick);
  }

  /* ----------------------------- construction ----------------------------- */

  /** ROUND 62 — `lens` opts a cloud INTO the spacetime bend. Default is
      RIGID: belts, star halos, nebula dust and every other system-local
      cloud belong to a body, and a body's contents are never bent (the
      belt-tear bug). Only cosmic sky clouds pass true — see the opt-ins at
      the makePoints call sites (milky band, galaxy spirals, web, cluster
      fields). */
  private pointsMaterial(px: number, twinkle: boolean, lens = false): THREE.ShaderMaterial {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: 1 }, uTime: { value: 0 }, uTwinkle: { value: twinkle ? 1 : 0 }, uOpacity: { value: 1 },
        uVortexC: { value: new THREE.Vector3() }, uVortexR: { value: 0 }, uVortexS: { value: 0 }, uVortexT: { value: 0 }, uVortexPull: { value: 0 },
        uVortexRev: { value: 1 },
        /* Round 52 — the SAME uniform objects the sky dome and the star shells
           use, so one setLenses() per frame bends the canvas, the shells and
           every lenized star cloud together. Nothing else has to be synced. */
        ...this.surfaceManager.lensUniforms,
      },
      vertexShader: lens ? POINTS_VERT_LENSED : pointsVert, fragmentShader: pointsFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.clouds.push({ mat, px });
    return mat;
  }

  /* level point-cloud bookkeeping — materials created AFTER the constructor
     traverse (reality rebuilds, galaxy-stage rebuilds) must re-register or
     their uScale stays 1 and the clouds collapse to the 1.5px shader floor */
  collectPointsMaterials(root: THREE.Object3D, tag: string, defaultMode = 'standard') {
    root.traverse((obj) => {
      if (obj instanceof THREE.Points) {
        const m = obj.material as THREE.ShaderMaterial;
        if (m.uniforms && m.uniforms.uScale && !this.levelPointMats.includes(m)) {
          m.userData.pointMode = (m.userData.pointMode as string | undefined) ?? defaultMode;
          m.userData.rebuildTag = tag;
          this.levelPointMats.push(m);
        }
      }
    });
  }
  dropOwnedPointsMaterials(tag: string) {
    this.levelPointMats = this.levelPointMats.filter((m) => m.userData.rebuildTag !== tag);
  }

  makePoints(count: number, posFn: (i: number, arr: Float32Array) => void, sizeFn: (i: number) => number, colFn: (i: number) => [number, number, number], alphaFn: (i: number) => number, px: number, twinkle: boolean, lens = false): THREE.Points {
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const alp = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      posFn(i, pos); size[i] = sizeFn(i);
      const c = colFn(i); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      alp[i] = alphaFn(i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
    return new THREE.Points(g, this.pointsMaterial(px, twinkle, lens));
  }

  private buildBackdrop() {
    const R = () => Math.random();
    /* milky way band */
    const band = this.makePoints(
      5200,
      (i, a) => {
        const ang = R() * Math.PI * 2, r = 14000 + R() * 42000;
        const off = (R() + R() + R() - 1.5) * 3400;
        a[i * 3] = Math.cos(ang) * r; a[i * 3 + 1] = off * 0.32; a[i * 3 + 2] = Math.sin(ang) * r;
      },
      () => 0.4 + R() * 0.9,
      () => { const w = R(); return w > 0.75 ? [1, 0.82, 0.6] : [0.62, 0.7, 0.88]; },
      () => 0.16 + R() * 0.3,
      1.5, true, true,
    );
    band.rotation.z = 0.42; band.rotation.x = 0.22;
    this.gGalaxy.add(band);

    this.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });
  }

  anchorGroup!: THREE.Group;
  coronaMat!: THREE.ShaderMaterial;
  rig!: CameraRig;
  grabCooldown = 0;

  belt!: THREE.Group;
  asteroidInst: { mesh: THREE.InstancedMesh; tumbles: BeltRock[] }[] = [];
  _rockM = new THREE.Matrix4();
  _rockQ = new THREE.Quaternion();

  /* ---- R97 delegations — the sky subsystem owns these implementations ---- */

  /** Arm today's shower (App-facing; implementation in sky/SkyFxSystem). */
  armEchoShower(echoes: { entryId: string; planetId: string; title: string }[]): void {
    this.skyFx.armEchoShower(echoes);
  }

  /** Feed the latest mood spectrum (App-facing; implementation in sky/SkyFxSystem). */
  setSentimentAurora(signal: AuroraSignal): void {
    this.skyFx.setSentimentAurora(signal);
  }

  /* --------------- Round 14 — Gravitational Lensing & Living Gravity --------------- */

  /** Spacetime lensing visibility — whether light visibly bends around the
      masses (Einstein's observable curvature). */
  setSpacetimeLens(on: boolean): void {
    this.lensTarget = on ? 1 : 0;
  }

  /** Living Gravity — first-order N-body coupling in osculating elements.
      Turning it off performs a canonical heal: the divine ephemeris is
      restored exactly, because the orbital elements were never touched. */
  setLivingGravity(on: boolean): void {
    this.livingGravityOn = on;
    if (!on) this.livingField.heal();
  }

  /* R88 — the per-frame twin gate. The stateful native simulator runs on its
     own clock alongside the universe, measuring N-body drift from the Kepler
     canon. Read-only by construction (simTwin.ts never touches rendered
     state); inert unless the author flips it from the twin card. */
  setSimTwin(on: boolean): void {
    /* R95 — one session per tier, engine-side: the card refuses too, but the
       seam must never be stealable by a stray call while the session drives. */
    if (on && this.universeDriverOn) {
      console.info('[universe] the driving session owns the simulator — the twin lab rests (one session per tier)');
      return;
    }
    this.simTwinOn = on;
    if (on) enableSimTwin(this.bodies, this.simDays);
    else disableSimTwin();
  }

  /* R92 — THE UNIVERSE DRIVER GATE (the R91 decree, in shadow). When it
     turns on, the driver owns the simulator session: the twin lab is
     stopped first (one session per tier — last writer wins, so the driver
     must be it). When it turns off, the session memory is saved one last
     time (disableDriver) and the clockwork takes the sky back. */
  setUniverseDriver(on: boolean): void {
    this.universeDriverOn = on;
    if (on) {
      if (this.simTwinOn) {
        this.simTwinOn = false;
        disableSimTwin();
      }
      void enableDriver(this.bodies, this.simDays, this.activeRealityId);
    } else {
      disableDriver();
    }
  }

  /** CANONICAL HEAL — restore the exact canonical paths in one stroke.
      R91 decree: when the driver owns the sky, the heal also re-seeds the
      driving session from the canon and wipes its saved memory — chaos
      resets to the divine plan, exactly as the clockwork heal does. */
  healLivingGravity(): void {
    this.livingField.heal();
    if (this.universeDriverOn) {
      void healDriver(this.bodies, this.simDays, this.activeRealityId);
    }
  }

  /** Per-frame lensing driver — each massive body's direction from the
      camera becomes a lens ON THE UNIVERSE SURFACE: the celestial dome and
      the background star shells bend around it. The halo is always THE SIZE
      OF THE BODY'S OWN SILHOUETTE (θ_f = halo multiplier × asin(R/d)) — a
      black hole's disc is a hollow in the surface of reality, and only the
      surface in contact with it bends — so nothing can ever dwarf the
      universe at one distance and vanish at another. The bodies themselves
      are never touched.

      ROUND 61 — THE WHOLE UNIVERSE BENDS, not just the home system. The
      lens roster is the home anchor's bodies AND every real hole living in
      another galaxy's isolated inner system (kind 'vault' carries the same
      geodesic renderer there — it only vanished from the sky because it
      was never in this.bodies). Gates and geometry follow the renderer
      exactly: an inner-system hole lenses the sky only while its system is
      visible (node.inner.visible — the same <1,600-unit dive gate the
      marcher obeys), and its direction is measured in WORLD space through
      the rotated galaxy node. Holes claim the 16 slots FIRST; ordinary
      masses fill what remains. */
  private updateSpacetimeLens(dt: number) {
    this.lensCur += (this.lensTarget - this.lensCur) * Math.min(1, dt * 4);
    this.camera.getWorldDirection(this._lensFwd);
    const cap = this.lensVecs.length;
    /* ROUND 66 — the living lens: the swirl follows the disk's own spin */
    const swirlSign = Math.sign(getBlackHoleParams().rotSpeed) || 1;
    let n = 0;
    /* 1 — every hole and vault, anywhere in the scene, first — measured with
       its real velocity so the sky can be dragged by the motion. */
    for (const b of this.bodies) {
      if (b.data.kind !== 'hole' && b.data.kind !== 'vault') continue;
      if (n >= cap) break;
      this.trackLensVelocity(b.data.id, b.group.position, dt, n, swirlSign);
      n = this.pushSurfaceLens(n, b.group.position, b.data.radius, b.lensHalo ?? lensHaloFor(b.data.kind), 1);
    }
    if (n < cap) {
      for (const node of this.galaxyStageNodes) {
        const sys = node.innerSys;
        if (!sys || !node.inner.visible) continue; /* hidden system → its hole holds no hollow yet */
        for (const p of sys.planets) {
          if (p.data.kind !== 'hole' && p.data.kind !== 'vault') continue;
          if (n >= cap) break;
          p.group.getWorldPosition(this._lensPos);
          this.trackLensVelocity(p.data.id, this._lensPos, dt, n, swirlSign);
          n = this.pushSurfaceLens(n, this._lensPos, p.data.radius, lensHaloFor(p.data.kind), 1);
        }
        if (n >= cap) break;
      }
    }
    /* 2 — the ordinary masses: stars and worlds bending gently around
       their own silhouettes, exactly as before (no drag — near-field motion
       is a hole thing). */
    for (const b of this.bodies) {
      if (b.data.kind === 'hole' || b.data.kind === 'vault') continue;
      if (n >= cap) break;
      const halo = b.lensHalo ?? 0;
      if (halo <= 0) continue;
      this.lensVels[n].set(0, 0, 0, 0);
      n = this.pushSurfaceLens(n, b.group.position, b.data.radius, halo, 0);
    }
    this.surfaceManager.setLenses(this.lensVecs, this.lensRims, this.lensStrong, this.lensVels, n, this.lensCur);
  }

  /* ROUND 66 — measure one hole's real world velocity (smoothed; orbital
     motion is steady, so the measurement eases instead of jitering) and
     stage its vec4 slot: xyz = velocity in world units/s, w = the disk's
     spin sign. Called even when the lens is culled behind the view, so the
     measurement stays alive while the hole is out of sight. */
  private trackLensVelocity(key: string, worldPos: THREE.Vector3, dt: number, slot: number, swirlSign: number): void {
    let rec = this.lensVelPrev.get(key);
    if (!rec) {
      rec = { p: worldPos.clone(), v: new THREE.Vector3() };
      this.lensVelPrev.set(key, rec);
      this.lensVels[slot].set(0, 0, 0, swirlSign);
      return;
    }
    if (dt > 1e-4) {
      this._lensVelInst.copy(worldPos).sub(rec.p).divideScalar(dt);
      rec.v.lerp(this._lensVelInst, 0.12);
    }
    rec.p.copy(worldPos);
    this.lensVels[slot].set(rec.v.x, rec.v.y, rec.v.z, swirlSign);
  }

  /** ONE surface-lens slot writer — the single law every lens obeys,
      home roster and inner systems alike: direction from the camera,
      apparent silhouette half-angle rim = asin(R/d) from the body's real
      radius, halo multiplier scaled on it. Returns the new slot count, or
      n unchanged when the lens lies behind the view. `worldPos` must be
      the lens's position in WORLD space (inner-system holes pass through
      their rotated galaxy node, so a local position would bend the wrong
      patch of sky). */
  private pushSurfaceLens(n: number, worldPos: THREE.Vector3, radius: number, halo: number, strong: number): number {
    this._lensDir.copy(worldPos).sub(this.camera.position);
    const dist = this._lensDir.length();
    /* AUDIT 2026-09-28 — NaN firewall: one bad body position (a physics
       overflow, an uninitialized group) must poison one slot at most — a NaN
       rim would smear not-a-number across every sky pixel that lens touches.
       Guarded here, at the ONE writer every lens passes through. */
    if (!Number.isFinite(dist) || dist < 1e-3) return n;
    if (!Number.isFinite(radius) || !Number.isFinite(halo)) return n;
    this._lensDir.divideScalar(dist);
    if (this._lensDir.dot(this._lensFwd) < 0.05) return n; /* behind the view */
    /* apparent silhouette half-angle from the body's real radius */
    const rim = Math.asin(Math.min(1, radius / dist));
    if (!Number.isFinite(rim)) return n;
    this.lensRims[n] = rim;
    this.lensStrong[n] = strong;
    this.lensVecs[n].set(this._lensDir.x, this._lensDir.y, this._lensDir.z, halo * rim);
    return n + 1;
  }

  /** Living Gravity — first-order N-body coupling in osculating elements
      (Gauss's planetary equations, see nbody.ts). Runs AFTER updateBodies:
      the exact Kepler state feeds the field, the element perturbations
      advance, and every world is re-positioned from the exact Kepler solver
      run on its osculating elements. The canonical elements are never
      written — a heal is always one zeroing pass away. */
  private updateLivingGravity() {
    const field = this.livingField;
    if (field.nodes.length === 0) return;
    if (this.bootIntro && this.birthK < 1) return; /* the Birth is pure ejection — gravity joins after */
    const active = this.livingGravityOn && this.lastSimDelta > 0;

    for (const b of this.bodies) {
      const node = field.nodes.find((nd) => nd.id === b.data.id);
      if (!node || node.isStar) continue;
      const phys = calculatePhysics(b.data);
      const o = b.data.orbit;
      node.a = o.a;
      node.e0 = phys.eccentricity;
      node.phase = o.phase;
      node.incl = o.incl;
      node.node = o.node ?? 0;
      node.argP = o.argP ?? 0;
      node.speed = o.speed || 0.01;
      const kp = calculateKeplerPosition(o.a, phys.eccentricity, o.phase, o.incl, this.simDays, o.speed || 0.01, o.node ?? 0, o.argP ?? 0);
      node.cx = kp.x; node.cy = kp.y; node.cz = kp.z;
      node.trueAnomaly = kp.trueAnomaly;
    }
    if (active) field.step(this.lastSimDelta, this.simDays);

    for (const b of this.bodies) {
      const node = field.nodes.find((nd) => nd.id === b.data.id);
      if (!node || node.isStar) continue;
      const pert = field.perturbedPosition(node, this.simDays);
      b.group.position.set(pert.x, pert.y, pert.z);
      node.deviationAU = pert.deviation / SCENE_UNITS_PER_AU;
      const tel = gravityTelemetry.get(node.id);
      if (tel) tel.deviationAU = node.deviationAU;
    }
  }

  /** Memory Constellation Search: pulse the given worlds' atmospheres gold
      for ~4s so the search results visibly answer from the sky. */
  pulseConstellation(bodyIds: string[]): number {
    let n = 0;
    for (const b of this.bodies) {
      if (!bodyIds.includes(b.data.id)) continue;
      const atmoMat = b.atmo?.material as THREE.ShaderMaterial | undefined;
      if (atmoMat?.uniforms?.uStrength) {
        this.pulses.push({ mat: atmoMat, base: (atmoMat.uniforms.uStrength.value as number) ?? 0.85, until: performance.now() + 4000 });
        n++;
      }
    }
    return n;
  }

  /* the pulse envelopes live in the frame loop so they decay cleanly */
  private updatePulses(now: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      const remain = p.until - now;
      if (remain <= 0 || !p.mat.uniforms.uStrength) {
        if (p.mat.uniforms.uStrength) p.mat.uniforms.uStrength.value = p.base;
        this.pulses.splice(i, 1);
        continue;
      }
      const k = Math.min(1, remain / 4000);
      p.mat.uniforms.uStrength.value = p.base + (Math.sin(now * 0.012) * 0.5 + 0.5) * 1.5 * k;
    }
  }

  /* ------------------------------ interaction ----------------------------- */

  private bindEvents() {
    /* the canvas owns its own pointer stream — immune to overlays & touch scrolling.
       Orbit / pan / zoom physics live in the CameraRig; this file only keeps
       pointer bookkeeping for picking & click detection. */
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  private onPointerDown = (e: PointerEvent) => {
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    this.pointerMoved = true;
    const pan = e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey);
    if (e.button === 0 || pan) {
      try { this.canvas.setPointerCapture(e.pointerId); } catch { /* capture unsupported */ }
      this.dragging = true;
      this.rig.beginDrag(pan);
      this.lastPX = e.clientX; this.lastPY = e.clientY;
      this.downX = e.clientX; this.downY = e.clientY; this.downT = performance.now();
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    this.mouseScreenX = e.clientX;
    this.mouseScreenY = e.clientY;
    if (this.dragging) {
      const dx = e.clientX - this.lastPX, dy = e.clientY - this.lastPY;
      this.rig.dragMove(dx, dy);
      this.lastPX = e.clientX; this.lastPY = e.clientY;
    }
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    this.pointerMoved = true;
  };

  private finishPointerDrag(e: PointerEvent, allowClick: boolean) {
    if (!this.dragging) return;
    this.dragging = false;
    this.rig.endDrag();
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
    if (allowClick && moved < 7 && performance.now() - this.downT < 600 && e.button === 0) this.handleClick();
  }

  private onPointerUp = (e: PointerEvent) => {
    this.finishPointerDrag(e, true);
  };

  private onPointerCancel = (e: PointerEvent) => {
    this.finishPointerDrag(e, false);
  };

  private onDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    // Double clicks are handled with precise single/double click discrimination in handleClick()
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    /* a right-drag is a pan, not a menu request */
    if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 8) return;
    const id = this.pick();
    if (id) this.cb.onContext(id, e.clientX, e.clientY);
  };
  private mouseScreenX = 0;
  private mouseScreenY = 0;

  private pick(): string | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.hoverHit = null; /* THE HERALD'S DISK (R74) — re-stashed below for card-bearing hits */
    const d = this.currentDist();

    // Multiverse stage ONLY — the Astral Core, reality bubbles and their
    // orbiting major galaxies are interactive in the multiverse stage
    if (this.cosmicStage === 'multiverse' && this.gMultiverse && this.gMultiverse.visible) {
      this.raycaster.far = 5000000;
      const visibleColliders = this.multiverseColliders;
      const hits = this.raycaster.intersectObjects(visibleColliders, false);
      if (hits.length > 0) {
        // Priority 1: Check if Astral Core is intersected
        const coreHit = hits.find((h) => h.object.userData.isMultiverseCore || h.object.userData.id === 'multiverse-core');
        if (coreHit && hits[0] === coreHit) {
          return 'multiverse-core';
        }
        const u = hits[0].object.userData;
        if (u.isMultiverseCore || u.id === 'multiverse-core') {
          return 'multiverse-core';
        }
        if (u.isGalaxy && u.galaxyData) {
          this.hoverHit = hits[0].object as THREE.Mesh;
          return `galaxy:${u.galaxyData.id}:${u.realityId}`;
        }
        if (u.isGalaxyCluster && u.clusterData) {
          this.hoverHit = hits[0].object as THREE.Mesh;
          return `cluster:${u.clusterData.id}:${u.realityId}`;
        }
        if (u.isRealityBubble && u.realityId) {
          this.hoverHit = hits[0].object as THREE.Mesh;
          return `reality:${u.realityId}`;
        }
        if (coreHit) {
          return 'multiverse-core';
        }
      }
      return null;
    }

    // Inside a reality at stellar system scale (d <= 1400) — pick local planets and moons,
    // plus the worlds of any isolated inner stellar system you're diving in
    if (d <= 1400) {
      this.raycaster.far = d * 3 + 120;
      /* echo meteors first — a memory streak outranks the empty space it crosses */
      const echoId = this.skyFx.pickEcho();
      if (echoId) return `echo:${echoId}`;
      const list = this.innerColliderList.length > 0 ? this.colliderList.concat(this.innerColliderList) : this.colliderList;
      const hits = this.raycaster.intersectObjects(list, false);
      for (const h of hits) {
        /* Raycaster does not discard an object whose ancestor is hidden. Inner
           systems for every galaxy share one collider list, so reject stale
           colliders from galaxies that are not currently visible. */
        let visible = true;
        for (let obj: THREE.Object3D | null = h.object; obj; obj = obj.parent) {
          if (!obj.visible) { visible = false; break; }
        }
        if (!visible) continue;
        const id = h.object.userData.bodyId as string;
        if (h.object.userData.isInner) return id;
        const b = this.bodies.find((x) => x.data.id === id);
        if (b && b.ghost > 0.6) continue;
        return id;
      }
      return null;
    }

    // GALAXY STAGE (web side) — the active reality's major galaxies are
    // hoverable / clickable right in the field. Window opens right above the
    // local-body range so a traveler inside one galaxy can still click their
    // way into a neighboring one without a dead zone.
    if (this.cosmicStage === 'web' && d > 1400 && d < 120000 && this.galaxyStageColliders.length) {
      this.raycaster.far = d * 4 + 6000;
      const hits = this.raycaster.intersectObjects(this.galaxyStageColliders, false);
      if (hits.length > 0) {
        const u = hits[0].object.userData;
        if (u.isGalaxy && u.galaxyData) {
          this.hoverHit = hits[0].object as THREE.Mesh;
          return `galaxy:${u.galaxyData.id}:${u.realityId}`;
        }
      }
    }
    return null;
  }

  private handleClick() {
    const id = this.pick();
    /* THE COSMIC ECHO — clicking a memory meteor reopens its page */
    if (id && id.startsWith('echo:')) {
      const entryId = id.slice(5);
      const echo = this.skyFx.echoMeteors.find((m) => m.entryId === entryId);
      if (echo) {
        this.selectedId = null;
        this.cb.onEchoOpen?.(echo.entryId, echo.planetId, echo.title);
      }
      return;
    }
    /* THE ASTRAL CORE — one click opens the Multiverse Core Console */
    if (id === 'multiverse-core') {
      if (this.cb.onSelectCore) this.cb.onSelectCore();
      else this.cb.onActivate('multiverse-core');
      return;
    }
    if (id && id.startsWith('cluster:')) {
      const parts = id.split(':');
      const clusterId = parts[1];
      const realityId = parts[2];
      const reality = REALITIES.find((r) => r.id === realityId);
      const cluster = reality?.clusters?.find((c) => c.id === clusterId);
      if (cluster && this.cb.onSelectCluster) {
        this.cb.onSelectCluster(cluster);
      }
      return;
    }
    if (id && id.startsWith('galaxy:')) {
      const parts = id.split(':');
      const galaxyId = parts[1];
      const realityId = parts.slice(2).join(':');
      /* EVERY click on a galaxy dives — single or double, no timers, no
         editor ambiguity. (Double-clicking used to open the editor instead
         of entering, which read as "can't enter any galaxy".) Editing runs
         through the hover card's Edit button and the console. */
      if (this.cb.onSelectGalaxy) this.cb.onSelectGalaxy(galaxyId, realityId);
      return;
    }
    if (id && id.startsWith('reality:')) {
      const realityId = id.replace('reality:', '');
      const t = performance.now();
      if (t - this.lastClickT < 360 && id === this.lastClickId) {
        if (this.clickTimer) { clearTimeout(this.clickTimer); this.clickTimer = null; }
        this.lastClickT = 0;
        if (this.cb.onDoubleClickReality) {
          this.cb.onDoubleClickReality(realityId);
        }
        return;
      }
      this.lastClickT = t;
      this.lastClickId = id;
      if (this.clickTimer) clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => {
        if (this.cb.onSelectReality) {
          this.cb.onSelectReality(realityId);
        }
        this.clickTimer = null;
      }, 350);
      return;
    }
    /* a world inside an isolated inner stellar system — REAL and interactive.
       Single click selects + orbits it; double click ENTERS it (diary) or,
       for the system's star, opens the control panel — the home grammar. */
    if (id && id.startsWith('inner:')) {
      const t = performance.now();
      if (t - this.lastClickT < 330 && id === this.lastClickId) {
        if (this.clickTimer) { clearTimeout(this.clickTimer); this.clickTimer = null; }
        this.lastClickT = 0;
        this.activateInner(id);
        return;
      }
      this.lastClickT = t;
      this.lastClickId = id;
      if (this.clickTimer) clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => {
        this.selectInnerWorld(id);
        this.clickTimer = null;
      }, 340);
      return;
    }
    const t = performance.now();
    if (t - this.lastClickT < 330 && id === this.lastClickId) {
      if (this.clickTimer) { clearTimeout(this.clickTimer); this.clickTimer = null; }
      this.lastClickT = 0;
      this.activate(id);
      return;
    }
    this.lastClickT = t;
    this.lastClickId = id;
    if (this.clickTimer) clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => {
        /* clicking the BACKGROUND hands the orbit back to the reality’s center: whatever it was orbiting — a cosmic body, a galaxy — is released */
        if (id === null && this.cosmicStage === 'web') {
          if (this.innerFocusBodyId) {
            this.releaseInnerWorld();
          } else if (this.galaxyInnerFocus) {
            this.galaxyInnerFocus = false;
            this.rig.setZoomTarget(0.668);
          } else {
            this.focusId = null;
            this.galaxyFocusId = null;
          }
        }
        this.selectedId = id;
        this.cb.onSelect(id);
        this.clickTimer = null;
      }, 340);
  }

  private activate(id: string | null) {
    if (!id) {
      /* background click — release the focus, orbit the reality’s center */
      if (this.cosmicStage === 'web') {
        if (this.innerFocusBodyId) {
          this.releaseInnerWorld();
        } else if (this.galaxyInnerFocus) {
          this.galaxyInnerFocus = false;
          this.rig.setZoomTarget(0.668);
        } else {
          this.focusId = null;
          this.galaxyFocusId = null;
        }
      }
      this.cb.onSelect(null);
      return;
    }
    if (id === 'demon-core') {
      if (this.cb.onSelectDemonCore) {
        this.cb.onSelectDemonCore();
      } else {
        this.cb.onActivate('demon-core');
      }
      return;
    }
    const b = this.bodies.find((x) => x.data.id === id);
    if (id === 'anchor') {
      this.selectedId = id;
      this.cb.onActivate('anchor');
      return;
    }
    if (!b) return;
    this.selectedId = id;
    this.beginPortal(b);
  }

  /* ------------------------------ camera/api ------------------------------ */

  currentDist(): number {
    return this.rig.dist();
  }
  focusBody(): RuntimeBody | null {
    return this.focusId ? this.bodies.find((b) => b.data.id === this.focusId) ?? null : null;
  }

  /* ---- R97 delegations: the stage machine lives in stages/LevelStageSystem;
     these keep every shell call site (the constructor, setReality, tickFrame,
     the App-facing rebuildMultiverse) reading verbatim. */
  buildMultiverse(customRealitiesList?: RealityConfig[]) { this.stages.buildMultiverse(customRealitiesList); }
  rebuildMultiverse(customRealitiesList?: RealityConfig[]) { this.stages.rebuildMultiverse(customRealitiesList); }
  buildLevels() { this.stages.buildLevels(); }
  buildGalaxyStageContents(reality: RealityConfig, chunked = false) { this.stages.buildGalaxyStageContents(reality, chunked); }
  buildIntroMarble() { this.stages.buildIntroMarble(); }
  updateLevels(dt = 0) { this.stages.updateLevels(dt); }

  /* ---- R97 delegations: the world builders live in worlds/BodyBuilders;
     these keep every shell call site (the constructor, the quality closure,
     setReality, rebuildMultiverse, updateBodies) reading verbatim. The orbit
     ring rebuilders stay PUBLIC: the inner-galaxy subsystem calls them too. */
  makeRockGeometry(seed: number): THREE.BufferGeometry { return this.worlds.makeRockGeometry(seed); }
  private buildAnchor() { this.worlds.buildAnchor(); }
  private buildBody(data: CosmicBody) { this.worlds.buildBody(data); }
  private buildBelt() { this.worlds.buildBelt(); }
  buildExoplanetPlates() { this.worlds.buildExoplanetPlates(); }
  syncBodies(list: CosmicBody[]) { this.worlds.syncBodies(list); }
  syncMoons(entries: { planetId: string; createdAt: number; updatedAt: number }[]) { this.worlds.syncMoons(entries); }
  rebuildOrbitLineFromState(
    line: THREE.Line,
    posS: [number, number, number],
    velS: [number, number, number],
    focusS: [number, number, number],
  ): boolean {
    return this.worlds.rebuildOrbitLineFromState(line, posS, velS, focusS);
  }
  rebuildOrbitLineToCanon(line: THREE.Line, data: CosmicBody): void { this.worlds.rebuildOrbitLineToCanon(line, data); }

  /* ---- R97 delegations: the inner-galaxy machine lives in
     worlds/InnerGalaxySystem; these keep every shell call site (the picker,
     setReality, resetView, updateLevels, buildGalaxyStageNode) and the App
     contract reading exactly as they did in the monolith ---- */
  buildInnerStellarSystem(gal: GalaxyData, galCol: THREE.Color, rnd: () => number, reality: RealityConfig): { root: THREE.Group; sys: InnerSystem } {
    return this.innerGalaxy.buildInnerStellarSystem(gal, galCol, rnd, reality);
  }
  updateInnerSystem(node: { data: GalaxyData; group: THREE.Group; inner: THREE.Group; innerSys: InnerSystem | null }, dt: number, nodeDist: number) {
    this.innerGalaxy.updateInnerSystem(node, dt, nodeDist);
  }
  private activateInner(id: string) { this.innerGalaxy.activateInner(id); }
  private selectInnerWorld(id: string) { this.innerGalaxy.selectInnerWorld(id); }
  private releaseInnerWorld() { this.innerGalaxy.releaseInnerWorld(); }
  private beginGalaxyEntry(gal: GalaxyData): boolean { return this.innerGalaxy.beginGalaxyEntry(gal); }
  cancelGalaxyDive() { this.innerGalaxy.cancelGalaxyDive(); }
  enterGalaxy(realityId: string, galaxyId: string) { this.innerGalaxy.enterGalaxy(realityId, galaxyId); }
  getInnerBody(bodyId: string): CosmicBody | null { return this.innerGalaxy.getInnerBody(bodyId); }
  findInnerBody(bodyId: string): { data: CosmicBody; galaxyId: string; galaxyName: string; starName: string } | null {
    return this.innerGalaxy.findInnerBody(bodyId);
  }

  /* ---- R97 delegations & name-preserving readbacks: the Kamui/portal
     machine lives in kamui/KamuiPortalSystem; these keep every shell call
     site and every gauntlet pin reading exactly as it did in the monolith ---- */
  /** R97 — public: the black-hole subsystem reads the live portal phase through it */
  get portal() { return this.kamuiPortal.portal; }
  get kamuiTimer() { return this.kamuiPortal.kamuiTimer; }
  /** R97 — public alias for the pinned-private driver flag (round92 pins
      its `private universeDriverOn` declaration; subsystems read it here) */
  get universeDriverActive() { return this.universeDriverOn; }
  private get stageWarp() { return this.kamuiPortal.stageWarp; }
  get kamuiEase() { return this.kamuiPortal.kamuiEase; }
  get kamuiVortexDir() { return this.kamuiPortal.kamuiVortexDir; }
  kamuiSwallowFactorFor(g: THREE.Object3D): number { return this.kamuiPortal.kamuiSwallowFactorFor(g); }
  beginStageWarp(dir: 'toMultiverse' | 'toWeb', arrivalDial: number, _after?: () => void): void {
    this.kamuiPortal.beginStageWarp(dir, arrivalDial, _after);
  }
  beginPortal(b: { data: CosmicBody }) { this.kamuiPortal.beginPortal(b); }
  private applyKamuiFrame(dt: number) { this.kamuiPortal.applyKamuiFrame(dt); }
  applyKamuiFieldUniforms(material: THREE.ShaderMaterial) { this.kamuiPortal.applyKamuiFieldUniforms(material); }
  setKamuiLocalCenter(material: THREE.ShaderMaterial, mesh: THREE.Object3D | null | undefined) { this.kamuiPortal.setKamuiLocalCenter(material, mesh); }
  leavePortal() { this.kamuiPortal.leavePortal(); }
  finishEntry() { this.kamuiPortal.finishEntry(); }
  portalTo(id: string) { this.kamuiPortal.portalTo(id); }
  triggerKamui(targetUv?: THREE.Vector2, reverse = false) { this.kamuiPortal.triggerKamui(targetUv, reverse); }




  resetView() {
    this.cancelGalaxyDive();
    this.focusId = null;
    this.realityFocused = false;
    this.activeGalaxyName = null;
    this.galaxyFocusId = null;
    this.innerFocusBodyId = null;
    /* ROUND 61 — the default view is reachable again: reset also FORGETS the
       saved placement, so the boot default stays the view instead of the old
       one snapping back on the next open. */
    clearCameraMemory();
    this.bhSys._camMemLast = null;
    if (this.cosmicStage === 'multiverse') {
      this.beginStageWarp('toWeb', 0.15, () => {
        this.rig.setOrbit(null, 1.12);
        this.rig.clearPan();
      });
      return;
    }
    this.cosmicStage = 'web';
    this.rig.setZoomTarget(0.15);
    this.rig.setOrbit(null, 1.12);
    this.rig.clearPan();
  }
  zoomToMultiverse() {
    this.cancelGalaxyDive();
    this.focusId = null;
    this.realityFocused = false;
    this.activeGalaxyName = null;
    this.galaxyFocusId = null;
    if (this.cosmicStage === 'web') {
      this.realityFocused = true;
      this.beginStageWarp('toMultiverse', this.activeReality ? CameraRig.zoomTOf(this.activeReality.bubbleSize * 5.5) : REALITY_FLOOR, () => {
        this.rig.setOrbit(null, 1.05);
      });
      return;
    }
    this.cosmicStage = 'multiverse';
    this.realityFocused = true;
    this.rig.setOrbit(null, 1.05);
    this.rig.setZoomTarget(this.activeReality ? CameraRig.zoomTOf(this.activeReality.bubbleSize * 5.5) : REALITY_FLOOR);
  }
  zoomToSystem() {
    this.cancelGalaxyDive();
    this.focusId = null;
    this.realityFocused = false;
    this.activeGalaxyName = null;
    this.galaxyFocusId = null;
    if (this.cosmicStage === 'multiverse') {
      this.beginStageWarp('toWeb', 0.15, () => {
        this.rig.setOrbit(null, 1.12);
        this.rig.clearPan();
      });
      return;
    }
    this.cosmicStage = 'web';
    this.rig.setZoomTarget(0.15);
    this.rig.setOrbit(null, 1.12);
    this.rig.clearPan();
  }
  zoomToHierarchy(stageIndex: number) {
    this.cancelGalaxyDive();
    this.focusId = null;
    this.rig.clearPan();
    if (stageIndex <= 2 || stageIndex > 6) { this.activeGalaxyName = null; this.galaxyFocusId = null; } /* outside the galaxy's domain */
    if (stageIndex === 0) { this.zoomToMultiverse(); return; }
    if (stageIndex === 1) { // Reality / Universe — multiverse side
      if (this.cosmicStage === 'web') {
        this.realityFocused = false;
        this.beginStageWarp('toMultiverse', 0.88, () => {
          this.rig.setOrbit(null, 1.05);
        });
        return;
      }
      this.cosmicStage = 'multiverse';
      this.realityFocused = false;
      this.rig.setZoomTarget(0.88);
      this.rig.setOrbit(null, 1.05);
      return;
    }
    // stages 2..10 — cosmic web side. Dials live in the shared stage table
    // (src/realities/hierarchyStages.ts), calibrated against the scale-label
    // distance windows (dist = 3 · 800000^zoomT) so each stage LANDS inside
    // its own label band.
    const dial = HIERARCHY_DIALS[stageIndex] ?? 0.15;
    const phi = stageIndex === 6 ? 1.08 : stageIndex <= 8 ? 1.1 : 1.12;
    if (this.galaxyInnerFocus && stageIndex >= 7) return; /* inside an isolated system — the origin-based ladder does not apply */
    if (this.cosmicStage === 'multiverse') {
      this.beginStageWarp('toWeb', dial, () => {
        this.rig.setOrbit(null, phi);
      });
      return;
    }
    this.cosmicStage = 'web';
    this.realityFocused = false;
    this.rig.setZoomTarget(dial);
    this.rig.setOrbit(null, phi);
  }
  /** KAMUI JUMP — long-range teleportation: the view tears open where the
      traveler stands, the throat carries them across the fold, and the
      white-hole ejects at the destination framing. Distance is irrelevant —
      this is the short-range jutsu turned inside out (Kakashi's long-range
      Kamui, aimed at yourself). */
  jumpTo(id: string): boolean {
    if (this.kamuiTimer > 0 || this.portal.phase !== 'idle' || this.bootIntro) return false;
    const galaxy = this.galaxyStageNodes.find((n) => n.data.id === id);
    const homeBody = this.bodies.find((b) => b.data.id === id);

    if (!galaxy && !homeBody) return false;
    this.grabCooldown = 1.4;
    this.rig.killZoomMomentum();
    this.triggerKamui();
    return true;
  }


  zoomIn(step = 0.12) {
    this.rig.nudgeZoom(-step);
  }
  zoomOut(step = 0.12) {
    this.rig.nudgeZoom(step);
  }
  focusOn(id: string) {
    if (id === 'anchor') { this.resetView(); return; }
    this.focusId = id;
    this.realityFocused = false;
    if (this.cosmicStage === 'multiverse') {
    if (this.cosmicStage === 'multiverse') { this.beginStageWarp('toWeb', 0.16); return; }
      this.rig.setZoomTarget(0.16);
      return;
    }
    this.rig.clearPan();
    /* ROUND 60 — the user's found composition (their 21:09 screenshot): the
       camera ~31° ABOVE the disk plane at ~56 rs — the disk reads as a tilted
       ellipse, the stellar belt sweeps around the hole, and the lensed wrap
       fills the frame. (The R53 near-edge-on angle hid this composition
       behind the disk's blaze.) zoomT: dist = 3 · 800000^z, 56 rs = 90.7
       world units → z = ln(90.7/3)/ln(800000) ≈ 0.25. Orbiting away is still
       free after the focus. */
    const target = this.bodies.find((x) => x.data.id === id);
    const geodesicHole = !!target && (target.data.kind === 'hole' || target.data.kind === 'vault')
      && !!(target.group.userData.bh as BlackHoleVisual | undefined)?.geodesic;
    if (geodesicHole) {
      this.rig.tPhi = 1.05;
      this.rig.setZoomTarget(0.25);
      return;
    }
    this.rig.setZoomTarget(Math.min(this.rig.tZoomT, 0.16));
  }
  enterCoreMode() {
    this.coreActive = true;
    this.focusId = null;
    this.realityFocused = false;
    if (this.cosmicStage === 'multiverse') { this.beginStageWarp('toWeb', 0.24); return; }
    this.rig.setZoomTarget(0.24);
  }
  exitCoreMode() {
    this.coreActive = false;
  }
  setPaused(p: boolean) { this.paused = p; }
  get pausedNow() { return this.paused; }
  setRendering(v: boolean) {
    this.rendering = v;
    this.surfaceManager?.getPhotoDome().setVisible(v);
  }

  /* THE SKY STUDIO — apply this reality's photo sky (its own assets folder
     on disk). Null spec = the pure procedural cosmos. Desktop fetches the
     registry itself so a device that never ran the web server still gets
     its skies. The crossfade + texture load run off the render loop. */
  async applyActiveSky(): Promise<void> {
    if (isDesktop()) {
      try {
        await ensureSkyFor(this.activeRealityId);
      } catch { /* keep whatever cache already holds */ }
    }
    this.activeSkySpec = getActiveSkySpec(this.activeRealityId);
    await this.surfaceManager.getPhotoDome().apply(this.activeSkySpec);
  }

  setTemporal(asOf: number | null) {
    this.bodies.forEach((b) => {
      const later = asOf !== null && b.data.createdAt > asOf;
      b.ghostTarget = later ? 1 : 0;
      b.fadeTarget = later ? 0 : 1; /* not yet formed → removed from this moment */
    });
  }

  /* ------------------------- dynamic structure ------------------------- */

  moonGeo?: THREE.SphereGeometry;
  moonMat?: THREE.MeshStandardMaterial;
  lastEntries?: { planetId: string; createdAt: number; updatedAt: number }[];

  /** Dimensional Barrier — strictly isolates state, star spectrum, corona, and local universe to active reality */
  setReality(reality: RealityConfig, liveBodies?: CosmicBody[], liveEntries?: DiaryEntry[]) {
    perfMark('reality-rebuild-start');
    this.activeRealityId = reality.id;
    this.activeReality = reality;

    /* R95 — the session's star: buildBody never renders the anchor (early
       return), so the driver must seed it — register it as the home scope's
       leading mass. Galaxy scopes need no registration (their roster
       already leads with sys.starData). */
    const anchor = reality.bodies.find((b) => b.id === 'anchor') ?? reality.bodies.find((b) => b.kind === 'star');
    if (anchor) setScopeStar(reality.id, anchor);

    // Synchronize Universe Surface (Cosmic Background Canvas)
    if (this.surfaceManager) {
      this.surfaceManager.setReality(reality);
    }
    // Sky Studio: bring this reality's own photo sky to the dome (fire-and-forget;
    // the photo dome crossfades while the rest of the reality builds)
    void this.applyActiveSky();

    /* Round 54 — the funnel palette retint is gone with the funnel: the
       geodesic disk is physics-colored (blackbody + Doppler), exactly like
       the reference, and the silhouette is pure black. */

    // 1. Update Anchor Star shader uniforms & corona palette
    const colA = new THREE.Color(reality.colorA);
    const colB = new THREE.Color(reality.colorB);
    const starCol = new THREE.Color(reality.starColor || reality.colorA);

    if (this.starUniforms) {
      if (!this.starUniforms.uColorA) this.starUniforms.uColorA = { value: colA };
      else (this.starUniforms.uColorA.value as THREE.Color).copy(colA);

      if (!this.starUniforms.uColorB) this.starUniforms.uColorB = { value: colB };
      else (this.starUniforms.uColorB.value as THREE.Color).copy(colB);

      if (!this.starUniforms.uCoreColor) this.starUniforms.uCoreColor = { value: starCol };
      else (this.starUniforms.uCoreColor.value as THREE.Color).copy(starCol);
    }

    if (this.coronaMat && this.coronaMat.uniforms) {
      if (!this.coronaMat.uniforms.uColorA) this.coronaMat.uniforms.uColorA = { value: colA };
      else (this.coronaMat.uniforms.uColorA.value as THREE.Color).copy(colA);

      if (!this.coronaMat.uniforms.uColorB) this.coronaMat.uniforms.uColorB = { value: colB };
      else (this.coronaMat.uniforms.uColorB.value as THREE.Color).copy(colB);
    }

    // 2. Re-anchor Active Reality Ring in Multiverse View
    if (this.activeRealityShieldMesh) {
      this.activeRealityShieldMesh.position.set(...reality.bubblePos);
      this.activeRealityShieldMesh.scale.setScalar(reality.bubbleSize);
      this.activeRealityShieldMesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.color.copy(colA);
        }
      });
    }

    // 3. Sync celestial bodies & diary moons strictly for this reality.
    // The live container (the reality's actual worlds/pages) wins over the
    // static config seed — user-added bodies survive the switch.
    const bodies = liveBodies ?? reality.bodies;
    const entries = liveEntries ?? reality.entries;
    this.syncBodies(bodies);
    this.syncMoons(entries);
    this.lastEntries = entries;
    /* rebuild the GALAXY STAGE from this reality's REAL roster — one full
       spiral per major galaxy — and tint the cluster stage's hot gas.
       The boot call spreads the roster across frames (nothing at boot zoom
       needs it for seconds) so the veil lifts without the multi-second
       startup stall; user-triggered reality switches build synchronously. */
    const bootCall = this.skipNextCompile;
    this.buildGalaxyStageContents(reality, bootCall);
    const gasTint = new THREE.Color(reality.colorB);
    this.clusterGasMats.forEach((m) => {
      m.color.copy(m.userData.baseColor as THREE.Color).lerp(gasTint, 0.42);
    });
    /* precompile anything this reality added (moons, new materials) so the
       first frame after a reality switch never stalls on shader compilation.
       Skipped on the boot call — the constructor compiled this exact scene
       moments ago, and compiling it again doubled the startup freeze. (The
       boot's chunked galaxy roster compiles lazily out at the galaxy band,
       where the entry warp masks it.) */
    if (bootCall) this.skipNextCompile = false;
    else this.renderer.compile(this.scene, this.camera);

    // 4. Clean up any invalid selection / focus
    if (this.selectedId && !bodies.some((b) => b.id === this.selectedId) && this.selectedId !== 'anchor') {
      this.selectedId = null;
      this.cb.onSelect(null);
    }
    if (this.focusId && !bodies.some((b) => b.id === this.focusId) && this.focusId !== 'anchor') {
      this.focusId = null;
    }

    // 5. Dimensional Barrier: Hide all elements belonging to other realities (unless in multiverse view)
    if (this.realityGroups) {
      const isMultiverseMode = this.cosmicStage === 'multiverse';
      Object.keys(this.realityGroups).forEach((id) => {
        if (this.realityGroups[id]) {
          this.realityGroups[id].visible = isMultiverseMode || (id === reality.id);
        }
      });
    }

    // 6. A galaxy dive queued before this roster landed executes now
    if (this.pendingGalaxyEntry && this.pendingGalaxyEntry.realityId === reality.id) {
      const pending = this.pendingGalaxyEntry;
      this.pendingGalaxyEntry = null;
      const gal = (reality.galaxies ?? []).find((g) => g.id === pending.galaxyId);
      if (gal) this.beginGalaxyEntry(gal);
    }
    perfMeasure('reality-rebuild', 'reality-rebuild-start');
  }


  /** Distant exoplanet horizon plates (cinematic tier): procedural billboard
      worlds drifting in the deep cosmic web. Built once; a tier upgrade
      after boot rebuilds them via onQualityChange. */

  /** Frame the Astral Core */
  zoomToCore() {
    this.focusId = null;
    this.realityFocused = false;

    this.rig.setZoomTarget(0.93);
    this.rig.setOrbit(0.85, 1.1);
    this.rig.clearPan();
  }



  /* -------------------------------- frame --------------------------------- */

  private resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private tick = () => {
    if (this.disposed) return;
    /* AUDIT 2026-09-28 — the frame-level fault shield. One exception in one
       update pass (a NaN from physics, a transient GL hiccup) used to skip
       composer.render() for EVERY later frame: the canvas froze black while
       the loop spun and the intro veil never lifted. The shield keeps the
       loop alive, reports the failure once (log spam in a per-frame handler
       would drown the console), and retries rendering on the next frame —
       a transient failure heals itself, a persistent one stays visible in
       the console instead of becoming a silent black screen. */
    try {
      this.tickFrame();
    } catch (err) {
      if (!this.tickErrorLogged) {
        this.tickErrorLogged = true;
        console.error('[universe] a frame update failed — recovering on the next frame:', err);
      }
      try { this.clock.getDelta(); } catch { /* keep the clock sane */ }
    }
  };
  private tickErrorLogged = false;

  private tickFrame = () => {
    const frameStarted = isPerformanceEnabled() ? performance.now() : 0;
    /* Vault/Core overlays do not need a live scene update. Keeping the
       animation loop registered makes resume instant, while this guard avoids
       spending CPU on orbital, physics, hover, and shader-uniform updates. */
    if (!this.rendering) {
      this.clock.getDelta();
      return;
    }
    const dt = Math.min(0.05, this.clock.getDelta());
    this.clockT += dt;
    /* R94 — the galaxy scope is re-decided every frame by updateLevels
       (below); clear it here so a camera that left the realm stops wanting it. */
    this.driverGalaxyScope = null;

    /* Round 20 — the geodesic tier's one-way circuit breaker: while a
       raymarched hole is actually on stage, sustained frame overruns stand
       it down for the session and the proven composite returns. */
    this.bhSys.guardRaymarch(dt);

    /* ROUND 61 — the camera checkpoint (idle quiescence only; see the field
       block above). Cheap: a rig snapshot + a throttled localStorage write. */
    this.bhSys.checkpointCameraView(dt);

    /* time */
    const rate = this.paused ? 0 : 6 * (this.coreActive ? 0.35 : 1);
    this.simDays += dt * rate;
    this.lastSimDelta = dt * rate;
    if (this.clockT - this.lastDateSent > 0.25) {
      this.lastDateSent = this.clockT;
      this.cb.onSimDate(new Date(this.epoch + this.simDays * DAY).toISOString());
    }

    /* KAMUI + PORTAL (R97) — the beat envelopes, the summon hold, the staged
       stage-warp and the portal phases live in kamui/KamuiPortalSystem; these
       four calls hold the exact per-frame order the monolith ran. */
    this.kamuiPortal.updateKamuiBeats(dt);
    this.kamuiPortal.updatePortalHold(dt);
    this.kamuiPortal.updateStageWarp(dt);
    this.kamuiPortal.updatePortalPhases(dt);

    const targetFov = 50 - this.coreT * 4;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
    this.camera.updateProjectionMatrix();

    /* camera — orbit/pan/zoom physics live in the CameraRig */
    this.grabCooldown = Math.max(0, this.grabCooldown - dt);

    /* auto release — zoom out of a focused world and it lets go seamlessly
       (while clamped, rendered distance equals the unclamped base, so the
       hand-off never jumps) */
    const fb = this.focusBody();
    if (fb && this.rig.dist() > 1200 && this.portal.phase === 'idle' && this.kamuiTimer <= 0) {
      this.focusId = null;
      this.grabCooldown = 0.6;
    }

    /* the galaxy dive — the dial eases on its own; flip into the isolated
       inner system once the camera is actually inside the disc */
    if (this.galaxyDive && this.galaxyDive.endInner && !this.galaxyInnerFocus && this.portal.phase === 'idle') {
      const dive = this.galaxyDive;
      const node = this.galaxyStageNodes.find((n) => n.data.id === dive.galaxyId);
      if (node) {
        node.group.getWorldPosition(this._vScratch2);
        if (this.camera.position.distanceTo(this._vScratch2) < 6800) {
          this.galaxyInnerFocus = true;
          this.galaxyDive = null;
        }
      }
    }

    if (this.bootIntro) {
      /* THE QUIET OPENING — no eruption. The home page already sits fully
         formed behind the opaque veil; this finalize runs once on the first
         frame so nothing boot-related can linger (sleeping meteors, hidden
         sky, half-faded worlds, the old 0.075 dive-in zoom). The veil then
         simply fades and you are home. */
      this.cosmicStage = 'web';
      this.realityFocused = false;
      this.birthK = 1;
      this.anchorGroup.visible = true;
      this.anchorGroup.scale.setScalar(1);
      this.bodies.forEach((b) => { b.fadeTarget = 1; });
      /* ROUND 61 — the camera remembers. A placement the user found and
         loved survives close/reopen: the boot default below applies only
         when this device has never saved a view. Reset View (R) clears the
         memory, so the default remains reachable on purpose. */
      const remembered = getCameraMemory();
      if (remembered) {
        /* ROUND 62 — HARD-CUT, not ease-in: the full snapshot (current +
           target channels) puts the camera exactly at the saved view on the
           first frame. The old target-only restore eases from the rig's
           constructor default — a huge distance — and the focus auto-release
           (dist > 1200) un-bound the saved focus before the camera arrived,
           leaving the hole nowhere in frame. */
        this.rig.restore({
          zoomT: remembered.zoomT, tZoomT: remembered.tZoomT,
          theta: remembered.theta, tTheta: remembered.tTheta,
          phi: remembered.phi, tPhi: remembered.tPhi,
          pan: remembered.pan,
        });
        /* restore WHAT the view was orbiting: the rig's focus is recomputed
           from focusBody() every frame, so re-binding the id re-points the
           view at the saved subject (the hole composition). A saved focus is
           re-bound only if the body exists in this boot's roster — a stale
           id (a deleted world) can never point the camera at nothing. */
        if (remembered.focusId && this.bodies.some((b) => b.data.id === remembered.focusId)) {
          this.focusId = remembered.focusId;
        }
      } else {
        this.rig.setZoomTarget(0.15);
        this.rig.setOrbit(null, 1.12);
      }
      this.bootIntro = false;
    } else {
      /* THE LAW — other realities do not exist for a reality. The dial hits
         the membrane and it may shimmer, but it can never be crossed by
         scrolling: the ONLY bridge between the stages is the Kamui, fired
         by explicit actions. */
      if (this.cosmicStage === 'web') {
        if (this.rig.tZoomT > WEB_CEILING) this.rig.setZoomTarget(WEB_CEILING);
        const pushing = this.rig.tZoomT > WEB_CEILING - 0.004 && this.rig.zoomVelocity > 0.02;
        this.membraneShimmer += ((pushing ? 0.16 : 0) - this.membraneShimmer) * Math.min(1, dt * 5);
        /* pushed through the web's ceiling — the crossing IS a Kamui: the
           tear opens at the center of the cosmic web and the fold carries
           you out to the multiverse sphere (the mirror of the floor-return
           in the multiverse branch below). */
        if (
          pushing && this.kamuiTimer <= 0 && this.grabCooldown <= 0 && !this.stageWarp
          && !this.dragging && this.portal.phase === 'idle'
        ) {
          this.realityFocused = true;
          this.beginStageWarp('toMultiverse', this.activeReality ? CameraRig.zoomTOf(this.activeReality.bubbleSize * 5.5) : REALITY_FLOOR);
        }
      } else {
        this.membraneShimmer += (0 - this.membraneShimmer) * Math.min(1, dt * 5);
      }
      if (this.cosmicStage === 'multiverse' && this.kamuiTimer <= 0) {
        if (this.realityFocused && this.rig.tZoomT < REALITY_FLOOR) this.rig.setZoomTarget(REALITY_FLOOR);
        if (this.realityFocused && this.rig.atFocusMax && this.rig.zoomTrend > 0) {
          this.realityFocused = false;
          this.grabCooldown = 0.6;
        }
        if (this.rig.tZoomT < MULTIVERSE_FLOOR_CLAMP) this.rig.setZoomTarget(MULTIVERSE_FLOOR_CLAMP);
        /* pushed through the multiverse's floor — the dial carries you back
           out into the web (this crossing IS a Kamui) */
        if (
          this.rig.tZoomT <= MULTIVERSE_FLOOR_RETURN && this.rig.zoomVelocity < RETURN_ZOOM_VEL && this.grabCooldown <= 0 && !this.stageWarp
          && !this.dragging && this.portal.phase === 'idle'
        ) {
          this.beginStageWarp('toWeb', 0.72);
        }
      }
      /* galaxy focus releases, in a ladder:
         inner system → zoom out → back to that galaxy's frame (in front of
         the specific galaxy you visited); galaxy frame → zoom out → the open
         field; zooming INTO a home-galaxy frame dives THROUGH it into the
         anchor star system. */
      if (this.cosmicStage === 'web' && this.kamuiTimer <= 0 && this.portal.phase === 'idle' && this.galaxyFocusId && this.rig.atFocusMax && this.rig.zoomTrend > 0) {
        if (this.innerFocusBodyId) {
          this.releaseInnerWorld(); /* world → system frame */
          this.grabCooldown = 0.35;
        } else if (this.galaxyInnerFocus) {
          this.galaxyInnerFocus = false;
          this.rig.setZoomTarget(0.668); /* back in front of that galaxy */
          this.grabCooldown = 0.6;
        } else {
          this.galaxyFocusId = null;
          this.grabCooldown = 0.6;
        }
      }
      if (this.cosmicStage === 'web' && this.kamuiTimer <= 0 && this.portal.phase === 'idle' && this.galaxyFocusId && this.rig.atFocusMin && this.rig.zoomTrend < 0) {
        const node = this.galaxyStageNodes.find((n) => n.data.id === this.galaxyFocusId);
        if (node && node.data.isHomeGalaxy && !this.galaxyInnerFocus) {
          this.galaxyFocusId = null;
          this.grabCooldown = 0.35;
        }
      }
    }
    /* auto engage — ONLY while actively zooming in AND only onto the body the
       pointer is actually over: diving toward a world you're touching centers
       it. A plain rotation, a stray scroll, or a zoom across empty space must
       never yank the camera onto a random body and send the sky spinning
       around it — that yank-and-follow was exactly the "clicking a body makes
       the universe rotate" bug. */
    if (
!this.focusId && !this.realityFocused && this.cosmicStage === 'web' && !this.bootIntro && !this.coreActive && this.rig.dist() < 150 && this.portal.phase === 'idle' && this.kamuiTimer <= 0
      && this.grabCooldown <= 0 && !this.dragging && this.rig.zoomTrend < -0.018
    ) {
      if (this.hoveredId && this.hoveredId !== 'anchor') {
        const target = this.bodies.find((b) => b.data.id === this.hoveredId);
        if (target && target.data.kind !== 'nebula' && target.data.kind !== 'hole') {
          this.focusId = target.data.id;
        }
      }
    }

    const activeFb = this.focusBody();
    /* R72 — a staged stage-warp's summon hold keeps the traveler's framing
       exactly where it was: the marble focus (and its sideways re-aim to the
       bubble) engages only when the stage actually hands over. */
    const realityFocusLive = this.realityFocused && !this.stageWarp;
    let focusMin: number | undefined, focusMax: number | undefined;
    let focusRadiusParam = activeFb ? activeFb.data.radius : (this.activeReality ? this.activeReality.bubbleSize * 2.6 : 6);
    let galaxyFocusActive = false;
    if (realityFocusLive && this.activeReality) {
      /* orbit the active reality's marble — framed just outside its glass */
      this._vFocusScratch.set(...this.activeReality.bubblePos);
      focusMin = this.activeReality.bubbleSize * 3.1;  /* just outside the glass */
      focusMax = 520000;                               /* release point on zoom-out */
    } else if (activeFb) {
      activeFb.group.getWorldPosition(this._vFocusScratch);
      /* Round 20 — with the geodesic tier live, never let the camera dive
         inside the disk's inner edge (~5.1 rs): clamp the orbit to his own
         demo's minimum approach (~6 rs, here 7 rs for framing headroom) */
      if (activeFb.data.kind === 'hole' || activeFb.data.kind === 'vault') {
        const rm = activeFb.group.userData.bh as BlackHoleVisual | undefined;
        if (rm && rm.geodesic) {
          focusMin = Math.max(activeFb.data.radius * 1.35, activeFb.data.radius * 0.62 * 7);
        }
      }
    } else if (this.galaxyFocusId) {
      /* orbit the entered galaxy — deep inside its own stellar system
         (galaxyInnerFocus) or framed on its disc from outside */
      const node = this.galaxyStageNodes.find((n) => n.data.id === this.galaxyFocusId);
      if (node) {
        node.group.getWorldPosition(this._vFocusScratch);
        if (this.galaxyInnerFocus) {
          const focusedWorld = this.innerFocusBodyId
            ? node.innerSys?.planets.find((p) => p.data.id === this.innerFocusBodyId) ?? null
            : null;
          if (focusedWorld) {
            /* orbit the clicked world itself */
            focusedWorld.group.getWorldPosition(this._vFocusScratch);
            focusMin = Math.max(2.2, focusedWorld.data.radius * 1.9);
            focusMax = 4200;
            focusRadiusParam = focusedWorld.data.radius;
          } else {
            focusMin = 12;            /* planet-orbit depth */
            focusMax = 7000;
            focusRadiusParam = 30;    /* the system star */
          }
          galaxyFocusActive = true;
        } else {
          focusMin = node.radius * 2.1;
          focusMax = 90000; /* released on zoom-out toward the cluster stage */
          focusRadiusParam = node.radius;
          galaxyFocusActive = true;
        }
      }
      /* stage not built yet (reality switch in flight) → keep drifting to origin until it is */
    } else {
      this._vFocusScratch.set(0, 0, 0);
    }
    /* NOTE: no holdFocus while a planet/vault portal is live — pinning the
       focus to the target body used to glide the camera hundreds of units
       sideways (the "pendulum" sweep). The portal is a local surface event;
       the traveler's framing stays exactly where it was. */
    this.rig.update(dt, {
      focus: this._vFocusScratch,
      focused: !!activeFb || realityFocusLive || galaxyFocusActive,
      focusRadius: focusRadiusParam,
      focusMin,
      focusMax,
    });
this.updateBodies(dt);
    this.applyKamuiFrame(dt);
    /* R92 decree law: while the driver owns the sky, Living Gravity's
       osculating-element writer stands down — the session IS the living
       gravity now (mutual, real, the vault at its full 10 M☉). The toggle
       keeps working the moment the clockwork takes the sky back. */
    if (this.livingGravityOn && !this.universeDriverOn) {
      this.updateLivingGravity();
    }
    /* R88 — the per-frame twin: gated (author flips it from the twin card),
       fire-and-forget, read-only against the rendered sky. */
    if (this.simTwinOn && !this.bootIntro) {
      simTwinTick(this.bodies, this.lastSimDelta, this.simDays);
    }
    /* R92 — the universe driver: gated (author flips it from the twin
       card), fire-and-forget with its own pending guard; the seam in
       updateBodies consumes its readback. R94 — scope-aware: the visible
       realm is the living one. Inside a galaxy's inner system its scope
       ticks and the home scope rests (its memory persists); leaving swaps
       back with a bounded catch-up burst. */
    if (this.universeDriverOn && !this.bootIntro) {
      /* the cast defeats the top-of-frame null assignment's narrowing —
         updateInnerSystem (below) re-populates the scope every frame */
      const gal = this.driverGalaxyScope as { id: string; bodies: DriverBody[] } | null;
      const wantId = gal ? gal.id : this.activeRealityId;
      const wantBodies = gal ? gal.bodies : this.bodies;
      if (driverState.scopeId !== wantId) {
        /* R95 — the activation may adopt a saved memory whose story sits
           ahead of this boot's clock (the universe remembers): set the
           engine clock to the memory's time. */
        void activateScope(wantId, wantBodies, this.simDays).then((adopted) => {
          if (adopted != null) {
            this.simDays = adopted;
            driverState.accumulatedDays = 0;
          }
        });
      } else if (!driverState.pending) {
        driverTick(wantBodies, this.lastSimDelta, this.simDays);
      }
    }
    this.updateSpacetimeLens(dt);
    this.skyFx.updateMeteors(dt);
    this.skyFx.updateAurora(dt);
    this.updatePulses(performance.now());
    this.updateLevels(dt);
    this.skyFx.updateSurface(dt);
    this.updateCore(dt);
    this.updateHover();

    /* Round 54 — drive the geodesic uniforms LAST, after every position
       writer has had its say: the vault ephemeris re-places bodies after
       the main loop's Kepler pass, so a mid-update read landed seconds
       stale and the march ran against a phantom hole. The driver force-
       refreshes the matrix chain from the CURRENT locals, so the hole
       center, the camera offset and the billboard are exact for THIS
       frame's render. */
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    const holeOnStage = this.bhSys.raymarchOnStage();
    this.bhSys.applyAdaptiveResolution(holeOnStage, dt);
    for (const visual of this.bhSys.blackHoles) {
      if (visual.geodesic) updateRaymarchUniforms(visual, this.camera, this.clockT);
    }

    /* ROUND 59 — no background captures of any kind: the sky layers bend
       themselves (the surface manager's 1/θ lens), so the lensed background
       is the LIVE sky rendered by its own shaders — no second image of the
       sky exists in the pipeline, and no square or layer can appear. */

    if (this.rendering) {
      this.composer.render();
      /* one-shot: the first fully rendered frame means shader compilation and
         scene building are done — the App lifts its intro veil on this */
      if (!this.firstFrameFired) {
        this.firstFrameFired = true;
        try { this.cb.onFirstFrame?.(); } catch { /* veil lift must never crash the loop */ }
      }
    }
    if (frameStarted) recordFrame(performance.now() - frameStarted);
  };
  private clock = new THREE.Clock();

  /* ------------------------------ KAMUI ---------------------------------- */

  private updateBodies(dt: number) {
    /* R95 — REALM HIDING: while the camera dives a galaxy's inner system,
       the home system is not part of the visible realm — ease it out (a
       hard cut would pop; the ease keeps the fade silky). This is what
       hides the home vault's geodesic quad from rendering beside the
       visited galaxy's own hole (the "three black holes" bug). */
    this.homeRealmW += ((this.galaxyDiveId ? 0 : 1) - this.homeRealmW) * Math.min(1, dt * 4);
    const sysW = (1 - smoothstep(430, 860, this.currentDist())) * this.homeRealmW;

    /* R92 — THE SEAM (the R91 decree): when the driver owns the sky and its
       readback is fresh, the session's extrapolated positions ARE the
       universe — real mutual gravity driving every world. A stale or absent
       readback returns null and the Kepler solve renders the frame instead
       (the freshness law: the same trust-window rule the keplerCache
       obeys). This is the ONLY place the driver's positions reach the
       scene, and it flows through the same write below — camera targets,
       hover colliders, diaries, the lens and the surface all read the
       groups and follow for free. */
    const drvPos = this.universeDriverOn && driverState.scopeId === this.activeRealityId
      ? driverReadback(this.simDays)
      : null;
    if (drvPos) this.drvLastPos = drvPos;
    /* R95 — THE CROSSFADE: the source switch (session ⇄ clockwork) eases
       over a breath instead of snapping — the visible flicker was this
       switch happening per frame. Rising while the readback is fresh;
       falling from the frozen last session positions when it goes stale. */
    this.drvBlend = drvPos
      ? Math.min(1, this.drvBlend + dt / 0.4)
      : Math.max(0, this.drvBlend - dt / 0.15);
    const drvArr = drvPos ?? this.drvLastPos;

    /* C++ accelerator refresh — every other frame, non-blocking. The native
       core batch-evaluates every orbit; results land one tick later, which is
       visually seamless. Web without WASM never enters this path. R95 — a
       fully-fresh session retires it for the interim (the cache is the
       fallback's accelerator, not the driven sky's). */
    const accelActive = this.keplerCache.valid && Math.abs(this.keplerCache.simDays - this.simDays) < 0.25;
    this.keplerFrame++;
    if (this.keplerFrame % 2 === 0 && !this.keplerCache.inflight && !(drvPos && this.drvBlend >= 1)) {
      void this.refreshKeplerCache();
    }

    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const o = b.data.orbit;
      /* the clockwork anchor — cache or exact Kepler solve — computed every
         frame: the blend's other end, and the fallback when stale */
      let kx: number, ky: number, kz: number;
      if (accelActive && this.keplerCache.xyz.length >= (i + 1) * 3) {
        kx = this.keplerCache.xyz[3 * i];
        ky = this.keplerCache.xyz[3 * i + 1];
        kz = this.keplerCache.xyz[3 * i + 2];
      } else {
        const phys = calculatePhysics(b.data, this.simDays);
        const pos = calculateKeplerPosition(o.a, phys.eccentricity, o.phase, o.incl, this.simDays, o.speed || 0.01, o.node ?? 0, o.argP ?? 0);
        kx = pos.x; ky = pos.y; kz = pos.z;
      }
      let px = kx, py = ky, pz = kz;
      /* R95 — THE STEADY SEAM: the session drives through the blend, +1 —
         the star leads the roster at index 0 (its readback steers the
         anchor group below); a stale readback eases back to the clockwork. */
      if (drvArr && drvArr.length > i + 1 && this.drvBlend > 0) {
        const s = drvArr[i + 1];
        const t = this.drvBlend;
        px = kx + (s[0] - kx) * t;
        py = ky + (s[1] - ky) * t;
        pz = kz + (s[2] - kz) * t;
      }
      b.group.position.set(px, py, pz);
      /* THE BIRTH — during the ejection every world flies outward from the
         single center point in a swirling bend: the orbit unwinds as it
         expands, so the system pours out of the point spinning */
      if (this.bootIntro && this.birthK < 1) {
        const e = 1 - Math.pow(1 - this.birthK, 3); /* ease-out: fast burst, settling */
        b.group.position.multiplyScalar(e);
        const unwind = (1 - e) * 2.8; /* the swirl unwinds as it ejects */
        const px = b.group.position.x, pz = b.group.position.z;
        b.group.position.x = px * Math.cos(unwind) - pz * Math.sin(unwind);
        b.group.position.z = px * Math.sin(unwind) + pz * Math.cos(unwind);
      }


      b.group.getWorldPosition(this._vScratch2);
      this._vScratch1.copy(this._vScratch2).multiplyScalar(-1).normalize();

      /* ghost + fade lerps */
      b.ghost += (b.ghostTarget - b.ghost) * Math.min(1, dt * 3);
      b.fade += (b.fadeTarget - b.fade) * Math.min(1, dt * 3);

      /* hover channel ONLY — the orbit line must never be pinned by a click */
      b.hoverT += ((this.hoveredId === b.data.id ? 1 : 0) - b.hoverT) * Math.min(1, dt * 8);

      if (b.mat) {
        if (b.mat.uniforms.uSunDir) (b.mat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch1);
        if (b.mat.uniforms.uTime) b.mat.uniforms.uTime.value = this.clockT;
        if (b.mat.uniforms.uGhost) b.mat.uniforms.uGhost.value = b.ghost;
        if (b.mat.uniforms.uFade) b.mat.uniforms.uFade.value = b.fade * sysW;
        if (b.mat.uniforms.uTear) b.mat.uniforms.uTear.value = 0;
        if (b.mat.uniforms.uTearTime) b.mat.uniforms.uTearTime.value = this.clockT;
        this.applyKamuiFieldUniforms(b.mat);
        this.setKamuiLocalCenter(b.mat, b.spinMesh);
        if (b.mat.uniforms.uCamLocalP && b.data.kind === 'nebula') {
          this._vScratch3.copy(this.camera.position);
          b.group.worldToLocal(this._vScratch3);
          (b.mat.uniforms.uCamLocalP.value as THREE.Vector3).copy(this._vScratch3);
        }
      }
      b.extras?.forEach((m) => { m.uniforms.uTime.value = this.clockT; });

      /* axial rotation — the surface turns under the fixed sun */
      if (b.spinMesh && b.spinRate) b.spinMesh.rotation.y += dt * b.spinRate;
      if (b.cloudMesh && b.cloudSpinRate) b.cloudMesh.rotation.y += dt * b.cloudSpinRate;

      if (b.cloudMat) {
        b.cloudMat.uniforms.uTime.value = this.clockT;
        (b.cloudMat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch1);
        b.cloudMat.uniforms.uFade.value = b.fade * sysW * (1 - b.ghost);
        if (b.cloudMat.uniforms.uTear) b.cloudMat.uniforms.uTear.value = 0;
        this.applyKamuiFieldUniforms(b.cloudMat);
        b.cloudMat.visible = b.cloudMat.uniforms.uFade.value > 0.02;
      }
      if (b.atmo) {
        const atmoMat = b.atmo.material as THREE.ShaderMaterial;
        (atmoMat.uniforms.uSunDir.value as THREE.Vector3).copy(this._vScratch1);
        if (atmoMat.uniforms.uTear) atmoMat.uniforms.uTear.value = 0;
        this.applyKamuiFieldUniforms(atmoMat);
        b.atmo.visible = b.fade * sysW * (1 - b.ghost) > 0.05;
      }
      if (b.ringMat) {
        b.ringMesh!.getWorldQuaternion(this._qScratch).invert();
        (b.ringMat.uniforms.uSunLocal.value as THREE.Vector3).copy(this._vScratch1).applyQuaternion(this._qScratch);
        this.applyKamuiFieldUniforms(b.ringMat);
        this.setKamuiLocalCenter(b.ringMat, b.ringMesh);
        b.ringMesh!.visible = b.fade * sysW * (1 - b.ghost * 0.85) > 0.05;
      }

      b.moons.forEach((m) => {
        /* R95 — MOONS RIDE PARENTS (the R93 amendment): the canon moon
           table (14–30-day laps skimming the planet) is physically
           impossible — at real gravity moons escape ~200× over, at
           physics-true speeds they blur. The closed-form ornament below is
           the PERMANENT moon law now: each moon rides its planet's session
           position with its own inclined plane (the body groups never
           rotate, so the local write is exact whatever drives the parent). */
        const ma = m.phase + this.simDays * m.speed;
        /* each moon rides its OWN inclined plane at its OWN node — no shared
           moon-sheet, and no shared crossing line either (R84) */
        const mp = tiltInPlaneVector(Math.cos(ma) * m.a, Math.sin(ma) * m.a, m.incl ?? 0, m.node ?? 0);
        m.mesh.position.set(
          mp.x,
          mp.y + Math.sin(ma * 0.7) * m.a * 0.12 * Math.cos(m.incl ?? 0),
          mp.z,
        );
        m.mesh.visible = b.fade * sysW * (1 - b.ghost) > 0.05;
      });

      if (b.orbitLine) {
        /* the orbit ring is driven ONLY by hover. Gate on .visible too so an
           opacity-0 line can never render — it must vanish the instant the
           pointer leaves the world. Selection pulses the body, never the ring. */
        const op = b.hoverT * sysW * 0.22;
        (b.orbitLine.material as THREE.LineBasicMaterial).opacity = op;
        b.orbitLine.visible = op > 0.01;
      }

      const selected = this.selectedId === b.data.id ? 1 : 0;
      const pulse = selected ? 1 + 0.025 * Math.sin(this.clockT * 3.2) : 1;
      b.group.scale.setScalar((1 + Math.max(b.hoverT, selected * 0.5) * 0.035) * pulse * (1 - b.ghost * 0.35) * this.kamuiSwallowFactorFor(b.group));
      b.group.visible = b.fade * sysW > 0.03;

      if (b.streakRing) {
        const mat = b.streakRing.material as THREE.MeshBasicMaterial;
        const st = b.streakTarget ?? 0;
        const days = b.streakDays ?? 0;
        /* alive whenever this world has been written on; a live streak makes it
           distinctly brighter, and total devotion adds a warm base glow */
        const target = days > 0 ? Math.min(0.95, 0.22 + 0.16 * st + 0.02 * days) : 0;
        mat.opacity += (target - mat.opacity) * Math.min(1, dt * 3.5);
        /* breathe + shimmer so it never reads as a static decal */
        const breath = 1 + 0.022 * Math.sin(this.clockT * 1.8 + b.data.id.length);
        mat.opacity = Math.max(0, mat.opacity + 0.05 * target * Math.sin(this.clockT * 3.1));
        b.streakRing.scale.setScalar(breath);
        b.streakRing.rotation.z += dt * 0.25;
        b.streakRing.visible = mat.opacity > 0.02 && b.fade * sysW > 0.03;
      }

      /* Round 54 — the geodesic uniforms are driven by the late-tick pass
         (see tick): the vault ephemeris re-places bodies after this loop,
         so a per-body call here read a matrix seconds stale. */
    }

    /* R95 — THE LIVING RINGS: while the session drives fresh, each world's
       hover ellipse is rebuilt ~1 Hz from its session state's osculating
       elements (the rings follow the living sky instead of stranding on
       their clockwork paths). Stale → the canon ellipses are restored. */
    if (drvPos) {
      const drvVel = this.universeDriverOn && driverState.scopeId === this.activeRealityId
        ? driverVelReadback(this.simDays)
        : null;
      if (drvVel && this.clockT - this.oscRebuildAt > 1) {
        this.oscRebuildAt = this.clockT;
        this.oscCanonDirty = true;
        for (let i = 0; i < this.bodies.length; i++) {
          const b = this.bodies[i];
          if (!b.orbitLine || !b.orbitLine.visible) continue;
          if (drvPos.length <= i + 1 || drvVel.length <= i + 1) continue;
          this.rebuildOrbitLineFromState(b.orbitLine, drvPos[i + 1], drvVel[i + 1], drvPos[0]);
        }
      }
    } else if (this.oscCanonDirty) {
      /* back on the clockwork — every ring returns to its canon ellipse */
      this.oscCanonDirty = false;
      for (const b of this.bodies) {
        if (b.orbitLine) this.rebuildOrbitLineToCanon(b.orbitLine, b.data);
      }
    }

    /* anchor — axial spin, then GRAVITY MADE VISIBLE: the star's barycentric
       wobble, the real radial-velocity method used to find exoplanets. Every
       major world tugs the star with amplitude ∝ m_p/a, each tug advancing at
       that world's own orbital rate — quasi-periodic drift, not a loop. */
    this.anchorGroup.rotation.y += dt * 0.08; /* Axial rotation around polar axis */
    let wobbleX = 0, wobbleY = 0, wobbleZ = 0;
    if (!this.coreActive) {
      for (let i = 0; i < this.bodies.length; i++) {
        const wb = this.bodies[i];
        /* planets, dwarfs AND the vault black hole — every mass tugs the star */
        if (wb.data.kind !== 'planet' && wb.data.kind !== 'dwarf' && wb.data.kind !== 'vault') continue;
        const aAU = Math.max(0.1, wb.data.orbit.a / 52); /* Aurelia = 1 AU */
        const mEarth = Math.pow(Math.max(0.05, wb.data.radius / 2.05), 3);
        const amp = Math.min(0.22, 0.028 * (mEarth / aAU));
        const ang = i * 2.39996 + this.simDays * (wb.data.orbit.speed || 0.01);
        const o = wb.data.orbit;
        /* R84 — the tug points along the world's own full plane geometry
           (node + periapsis), not a shared X-axis node line */
        const tug = tiltInPlaneVector(Math.cos(ang) * amp, Math.sin(ang) * amp, o.incl, o.node ?? 0, o.argP ?? 0);
        wobbleX += tug.x;
        wobbleY += tug.y;
        wobbleZ += tug.z;
      }
    }
    /* R95 — THE HOME STAR LEADS: the session's star (roster index 0) drives
       the anchor group through the same crossfade — its real barycenter
       wobble replaces the cosmetic formula while the session owns the sky
       (the galaxy scopes' seam, home edition). */
    if (drvArr && drvArr.length > 0 && this.drvBlend > 0) {
      const s = drvArr[0];
      const t = this.drvBlend;
      this.anchorGroup.position.set(
        wobbleX + (s[0] - wobbleX) * t,
        wobbleY + (s[1] - wobbleY) * t,
        wobbleZ + (s[2] - wobbleZ) * t,
      );
    } else if (!this.coreActive) {
      this.anchorGroup.position.set(wobbleX, wobbleY, wobbleZ);
    }
    const starMesh = this.anchorGroup.userData.starMesh as THREE.Mesh;
    if (starMesh) starMesh.rotation.y += dt * 0.15;

    this.starUniforms.uTime.value = this.clockT;
    const boostTarget = 1 - this.coreT * 0.42;
    this.starUniforms.uBoost.value += (boostTarget - this.starUniforms.uBoost.value) * Math.min(1, dt * 3);
    /* Round 54 — the reference's blaze: his demo runs bloom ≈ 0.68, the
       project baseline (0.18) stays gentle for the planets. While a geodesic
       hole is on stage the strength damps toward the reference value and
       relaxes when you fly away. */
    /* ROUND 64/65 — HIS BLOOM, distance-aware: strength 0.68 (baseline 0.18
       + boost 0.50) and radius 0.2 at the CLOSE encounter (his values,
       eased on as the hole nears), relaxing to the project's gentle baseline
       in wide views — the blaze is for the meeting, not for the whole sky
       (the R65 eye-comfort fix). His THRESHOLD does not port: it is
       scene-dependent — his scene is a hole on black; ours is a hole in a
       living universe. MEASURED TWICE on the GPU probe: his 0.4 floods our
       void to 0.58–0.65 luminance with the reference's own interior at
       0.33; the calibrated 0.90 lands the interior at 0.33 — a dead match.
       The threshold stays 0.90. */
    const holeBoostTarget = this.holeGlowProximity() * 0.5;
    this.bloomHoleBoost += (holeBoostTarget - this.bloomHoleBoost) * Math.min(1, dt * 3);
    this.bloomPass.strength = 0.18 - this.coreT * 0.08 + this.bloomHoleBoost;
    const holeMix = Math.min(1, this.bloomHoleBoost / 0.5);
    this.bloomPass.radius = 0.15 + (0.20 - 0.15) * holeMix;

    const haloA = this.anchorGroup.userData.haloA as THREE.Points;
    const haloB = this.anchorGroup.userData.haloB as THREE.Points;
    haloA.rotation.y += dt * 0.05;
    haloB.rotation.y -= dt * 0.038;
    (haloA.material as THREE.ShaderMaterial).uniforms.uTime.value = this.clockT;
    (haloB.material as THREE.ShaderMaterial).uniforms.uTime.value = this.clockT;
    (haloA.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 1 - this.coreT * 0.5;
    (haloB.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 1 - this.coreT * 0.5;

    /* corona dims with the star while the core is open */
    this.coronaMat.uniforms.uTime.value = this.clockT;
    this.coronaMat.uniforms.uBoost.value = (1 - this.coreT * 0.55) * (0.92 + 0.08 * Math.sin(this.clockT * 0.8));

    this.anchorGroup.visible = sysW > 0.02;
    /* the belt sleeps through the birth too */
    const birthDark = this.bootIntro && this.clockT < 2.4;
    this.belt.visible = sysW > 0.02 && !birthDark;
    this.belt.rotation.y = this.simDays * 0.0016;

    /* the rocks tumble on their own axes — only worked while anyone can see them */
    if (this.belt.visible) {
      this.asteroidInst.forEach(({ mesh, tumbles }) => {
        for (let k = 0; k < tumbles.length; k++) {
          const t = tumbles[k];
          t.q.multiply(this._rockQ.setFromAxisAngle(t.axis, t.speed * dt));
          this._rockM.compose(t.pos, t.q, t.scale);
          mesh.setMatrixAt(k, this._rockM);
        }
        mesh.instanceMatrix.needsUpdate = true;
      });
    }
  }

  /* R95 — THE LIVING RINGS: rebuild a world's hover ellipse from an
     explicit state (session readback: pos + vel in scene units/day) around
     a focus (the session star), via the standard osculating two-body
     elements. Returns false when the state is unbound or near-parabolic —
     the canon ring stays (a fixed ring for an escaping world would be a
     lie; the canon ellipse is the clockwork's honest answer). */
  /**
   * Batch-evaluate every orbit through the C++ core (native or WASM). The
   * arrays mirror this.bodies order; the tick loop only trusts the cache when
   * its simDays is within a quarter-day of the live sim clock, so a slow IPC
   * round-trip can never freeze the sky.
   */
  private async refreshKeplerCache(): Promise<void> {
    if (!this.bodies.length) return;
    const backend = cosmosBridge.getStatus();
    if (backend.backend === 'typescript') return;
    this.keplerCache.inflight = true;
    try {
      const a: number[] = [];
      const e: number[] = [];
      const phase: number[] = [];
      const incl: number[] = [];
      const speed: number[] = [];
      const node: number[] = [];
      const argP: number[] = [];
      for (const b of this.bodies) {
        const o = b.data.orbit;
        a.push(o.a);
        let ecc = this.keplerEcc.get(b.data.id);
        if (ecc === undefined) {
          ecc = calculatePhysics(b.data, 0).eccentricity;
          this.keplerEcc.set(b.data.id, ecc);
        }
        e.push(ecc);
        phase.push(o.phase);
        incl.push(o.incl);
        speed.push(o.speed || 0.01);
        node.push(o.node ?? 0);
        argP.push(o.argP ?? 0);
      }
      const res = await cosmosBridge.keplerBatch({ a, e, phase, incl, speed, node, argP, simDays: this.simDays });
      /* bodies may have resynced mid-flight — only accept a matching count */
      if (res.xyz.length === this.bodies.length * 3) {
        this.keplerCache.xyz = res.xyz;
        this.keplerCache.simDays = this.simDays;
        this.keplerCache.valid = true;
      }
    } catch {
      this.keplerCache.valid = false;
    } finally {
      this.keplerCache.inflight = false;
    }
  }

  private updateCore(dt: number) {
    const target = this.coreActive ? 1 : 0;
    this.coreT += (target - this.coreT) * Math.min(1, dt * 2.6);
    this.connectionMat.opacity = this.coreT * 0.3;
    if (this.coreT > 0.02) {
      const requiredFloats = this.connections.length * 6;
      if (requiredFloats > this._corePosBuffer.length) {
        this._corePosBuffer = new Float32Array(Math.max(requiredFloats * 2, 3000));
        const attr = new THREE.BufferAttribute(this._corePosBuffer, 3);
        attr.setUsage(THREE.DynamicDrawUsage);
        this.connectionLines.geometry.setAttribute('position', attr);
      }
      let idx = 0;
      for (let i = 0; i < this.connections.length; i++) {
        const [ia, ib] = this.connections[i];
        if (ia.ghostTarget > 0.5 || ib.ghostTarget > 0.5) continue; /* link to an un-formed world stays dark */
        ia.group.getWorldPosition(this._vScratch1);
        ib.group.getWorldPosition(this._vScratch2);
        this._corePosBuffer[idx++] = this._vScratch1.x;
        this._corePosBuffer[idx++] = this._vScratch1.y;
        this._corePosBuffer[idx++] = this._vScratch1.z;
        this._corePosBuffer[idx++] = this._vScratch2.x;
        this._corePosBuffer[idx++] = this._vScratch2.y;
        this._corePosBuffer[idx++] = this._vScratch2.z;
      }
      const attr = this.connectionLines.geometry.getAttribute('position') as THREE.BufferAttribute;
      if (attr) {
        attr.needsUpdate = true;
      }
      this.connectionLines.geometry.setDrawRange(0, idx / 3);
    }
    this.connectionLines.visible = this.coreT > 0.02;
  }
  private connections: [RuntimeBody, RuntimeBody][] = [];
  setConnections(pairs: [string, string][]) {
    this.connections = pairs
      .map(([a, b]) => [this.bodies.find((x) => x.data.id === a), this.bodies.find((x) => x.data.id === b)] as [RuntimeBody | undefined, RuntimeBody | undefined])
      .filter((p): p is [RuntimeBody, RuntimeBody] => Boolean(p[0] && p[1]));
  }

  private updateHover() {
    if (this.pointerMoved) {
      this.pointerMoved = false;
      const id = this.pick();
      /* echo hover: resolve to the memory's id so App can show its card */
      this.echoHoverId = id && id.startsWith('echo:') ? id.slice(5) : null;
      if (this.echoHoverId) {
        this.lastEchoHover = true;
        const echo = this.skyFx.echoMeteors.find((m) => m.entryId === this.echoHoverId);
        this.cb.onHoverEcho?.(echo ? { entryId: echo.entryId, planetId: echo.planetId, title: echo.title } : null, this.mouseScreenX, this.mouseScreenY);
      } else if (this.lastEchoHover) {
        this.cb.onHoverEcho?.(null);
        this.lastEchoHover = false;
      }
      if (id !== this.hoveredId) {
        this.hoveredId = id;
        this.hoverAnchorT = 0;
        this.cb.onHover(id, this.mouseScreenX, this.mouseScreenY, id ? this.hoverDiskOf() : null);
      }
      const canvas = this.renderer.domElement;
      canvas.style.cursor = id ? 'pointer' : this.dragging ? 'grabbing' : 'grab';
    }
    /* THE HERALD'S DISK (R74) — the card follows the thing it heralds: a
       card-bearing object rides its orbit even under a still pointer, so
       its projected disk is re-emitted at ~8 Hz and the card rides the
       disk's edge instead of freezing at the pointer's last position. */
    if (
      this.hoveredId && this.hoverHit
      && (this.hoveredId.startsWith('galaxy:') || this.hoveredId.startsWith('reality:') || this.hoveredId.startsWith('cluster:'))
      && this.clockT - this.hoverAnchorT > 0.12
    ) {
      this.hoverAnchorT = this.clockT;
      const disk = this.hoverDiskOf();
      if (disk) this.cb.onHover(this.hoveredId, this.mouseScreenX, this.mouseScreenY, disk);
    }
  }

  /** THE HERALD'S DISK (R74) — the hovered object's projected screen circle:
      its collider's center and radius in CSS pixels, so the hover card can
      anchor just outside the visible object (a reality bubble's herald
      clears its whole glass via userData.anchorScale). Null when nothing
      card-bearing is hovered or the object is behind the camera. */
  private hoverDiskOf(): { cx: number; cy: number; r: number } | null {
    const obj = this.hoverHit;
    if (!obj) return null;
    const geo = obj.geometry as THREE.SphereGeometry | undefined;
    const geoR = geo?.parameters?.radius;
    if (!geoR) return null;
    const anchorScale = (obj.userData.anchorScale as number | undefined) ?? 1;
    obj.getWorldPosition(this._vScratch1);
    const worldR = geoR * (obj.getWorldScale(this._vScratch2).x || 1) * anchorScale;
    /* the rim: one world-radius along the camera's right axis, both points
       projected to CSS px (y flipped — screen y runs down) */
    this._vScratch2.setFromMatrixColumn(this.camera.matrixWorld, 0).multiplyScalar(worldR);
    this._vScratch3.copy(this._vScratch1).add(this._vScratch2);
    this._vScratch1.project(this.camera);
    this._vScratch3.project(this.camera);
    if (this._vScratch1.z > 1 || this._vScratch3.z > 1) return null;
    const vw = this.renderer.domElement.clientWidth;
    const vh = this.renderer.domElement.clientHeight;
    const cx = (this._vScratch1.x * 0.5 + 0.5) * vw;
    const cy = (1 - (this._vScratch1.y * 0.5 + 0.5)) * vh;
    const rx = (this._vScratch3.x * 0.5 + 0.5) * vw;
    const ry = (1 - (this._vScratch3.y * 0.5 + 0.5)) * vh;
    return { cx, cy, r: Math.max(8, Math.hypot(rx - cx, ry - cy)) };
  }

  disposeObject3D(
    root: THREE.Object3D,
    preserve: {
      geometries?: Set<THREE.BufferGeometry>;
      materials?: Set<THREE.Material>;
      textures?: Set<THREE.Texture>;
    } = {},
  ) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const preservedGeometries = preserve.geometries ?? new Set<THREE.BufferGeometry>();
    const preservedMaterials = preserve.materials ?? new Set<THREE.Material>();
    const preservedTextures = preserve.textures ?? new Set<THREE.Texture>();

    const collectTexture = (value: unknown) => {
      if (value instanceof THREE.Texture) {
        textures.add(value);
      } else if (Array.isArray(value)) {
        value.forEach(collectTexture);
      }
    };

    const collectMaterial = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(collectMaterial);
        return;
      }
      if (!(value instanceof THREE.Material) || preservedMaterials.has(value) || materials.has(value)) return;
      materials.add(value);
      const materialRecord = value as unknown as Record<string, unknown>;
      Object.keys(materialRecord).forEach((key) => collectTexture(materialRecord[key]));
      if (value instanceof THREE.ShaderMaterial) {
        Object.values(value.uniforms).forEach((uniform) => collectTexture(uniform.value));
      }
    };

    root.traverse((object) => {
      const renderable = object as THREE.Object3D & { geometry?: unknown; material?: unknown };
      if (renderable.geometry instanceof THREE.BufferGeometry && !preservedGeometries.has(renderable.geometry)) {
        geometries.add(renderable.geometry);
      }
      collectMaterial(renderable.material);
    });

    textures.forEach((texture) => {
      if (!preservedTextures.has(texture)) texture.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.clickTimer) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }
    this.renderer.setAnimationLoop(null);
    gravityTelemetry.clear();
    disableSimTwin();
    disableDriver(); /* R92 — one last save of the session memory before rest */
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    window.removeEventListener('resize', this.resize);
    this.skyFx.dispose(); /* the echo/meteor teardown, verbatim from the monolith */
    this.canvas.style.touchAction = this.originalTouchAction;
    this.rig.dispose();
    this.bhSys.releaseBlackHolesUnder(this.scene);
    this.disposeObject3D(this.scene);
    this.scene.clear();
    this.composer.dispose();
    this.renderer.dispose();
    window.removeEventListener(QUALITY_CHANGE_EVENT, this.onQualityChange);
    window.removeEventListener(RAYMARCH_OVERRIDE_EVENT, this.onTierOverride);
    window.removeEventListener('pagehide', this.onPageHide);
  }
}
