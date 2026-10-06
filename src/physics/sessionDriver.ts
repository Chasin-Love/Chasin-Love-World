/**
 * R91 — THE SESSION DRIVER: the stateful N-body simulator promoted from
 * read-only twin to the universe's engine, under the author's R91 decree
 * (docs/ROUND-91-THE-REAL-UNIVERSE-DECREE.md):
 *
 *   THE CANON SEEDS; THE SESSION DRIVES; THE CLOCKWORK IS THE FALLBACK
 *   AND THE HEAL.
 *
 * Division of labor (the narrowed hybrid law):
 *  - THIS module owns the driving session: configure-from-canon, stepping,
 *    batched readback, extrapolation cache, save/restore, reseed.
 *  - The ENGINE (updateBodies seam, R92) is the ONLY writer of rendered
 *    state: it consumes `driverReadback()` and sets mesh positions. This
 *    module holds no scene objects at all, never imports the store, and
 *    publishes telemetry to its own module-level map — the simTwin.ts
 *    purity rules apply here verbatim (the round91 gauntlet enforces them).
 *  - simTwin.ts stays the untouched read-only lab (R88 law intact).
 *
 * Units: the session is SI (m/kg/s — cosmos_engine.hpp); the universe is
 * scene units and sim-days (52 scene units = 1 AU). Masses are the REAL
 * physical masses — with the R95 seed law's two conscious amendments
 * (docs/ROUND-95-THE-STEADY-SKY-2026-10-01.md, the author's ruling):
 *
 *   THE STAR LEADS EVERY ROSTER — index 0 is always the system's star
 *   (registered by the engine, or already leading, or a synthesized central
 *   sun for starless scopes). R94's home sky had NO central mass in the
 *   session: every world was unbound and the sky detonated.
 *
 *   THE ORBIT-TRUE SEED — every world keeps its canon position, direction
 *   and plane, but its session SPEED is the circular-orbit speed of the
 *   gravity actually present, and a vault's in-session mass is the mass its
 *   own canon orbit implies (v²·r/G ≈ 0.1 M☉ — the 10 M☉ display law is
 *   untouched everywhere else; at 10 M☉ no seed can hold the home sky).
 *   The cinematic canon table (outer periods 2–4× Kepler) cannot survive
 *   real gravity as-is; circularized at their canon radii, the worlds hold
 *   their canon sky and then wander honestly.
 *
 *   MOONS RIDE PARENTS (the R93 amendment) — the canon moon table (14–30-day
 *   laps skimming the planet) is physically impossible: at real gravity
 *   moons escape ~200× over, at physics-true speeds they blur. Moons left
 *   the integrated roster; they render as the parent's session position
 *   plus the ornament closed-form (the old stale-fallback, permanent).
 *
 * Session ownership: one session per tier. The driver, the twin lab, and
 * the card's Verify Twin share it — whoever acts last reconfigures it.
 * R92's engine gate arbitrates: while the driver is enabled, the card's
 * Verify rests (the ownership pattern the twin card already implements).
 */
import { calculatePhysics, calculateKeplerPosition, CONSTANTS } from './physicsEngine';
import type { CosmicBody } from '../domain/universe';
import { cosmosBridge, type SimBodyInput, type SimBodyState } from '../platform/native/cpp_bridge';
import { STORAGE_KEYS } from '../platform/storageKeys';

/** 52 scene units = 1 AU (nbody.ts SCENE_UNITS_PER_AU); meters per scene unit. */
const METERS_PER_SCENE_UNIT = CONSTANTS.AU / 52;
/** Sim-days → SI seconds. */
const SECONDS_PER_DAY = 86400;
/** Step the session in 24 sub-steps per fire (~6-hour resolution — fine
    enough for 27-day moon orbits long before R93 needs it). */
const DRIVER_SUBSTEPS = 24;
/** Fire the async session at most every ~2 accumulated sim-days (≈⅓ s at
    full clock rate) — real cadence, gentle IPC. */
const FIRE_THRESHOLD_DAYS = 2;
/** THE FRESHNESS LAW: a readback is trusted for rendering only within this
    window of the live clock (the keplerCache trust-window pattern); outside
    it the engine falls back to the Kepler solve for that frame. R95: 2.5 →
    8 — with accumulate-before-pending the readback never chronically lags,
    and 8 days of linear extrapolation is far inside orbital timescales;
    the old 2.5 left an ~83 ms staleness margin that flickered the sky. */
const TRUST_WINDOW_DAYS = 8;
/** Persist the session memory every N readbacks (8 × 2 days ≈ 2.7 real
    seconds at full clock — an abrupt close loses at most ~3 s of drift). */
const SAVE_EVERY_N_READBACKS = 8;
/** Mirror of the Rust session cap (lib.rs cosmos_sim_configure). */
const SESSION_BODY_CAP = 4096;
/** R95 — the seed law stamp: session memories written under an earlier seed
 *  describe a universe that detonates and are re-seeded from the canon once,
 *  honestly (the seedLaw invalidation). The stamp advances with the law:
 *    2 — the orbit-true seed (star-led roster, circular speeds, vault temper)
 *    3 — the SUBSTEP fix (the tick no longer runs 24× ahead of the clock)
 *        and the HILL temper (the vault ≤ 1/1000 of the star). Measured: the
 *        law-2 sky survives ~600 sim-days; the law-3 sky survives 5000+. */
const SEED_LAW = 3;

interface DriverDrift {
  deviationAU: number;
  driverPosScene: [number, number, number];
  canonPosScene: [number, number, number];
}

export const driverTelemetry = new Map<string, DriverDrift>();

export const driverState = {
  enabled: false,
  configured: false,
  pending: false,
  /** roster signature — a change (reality switch, body edit, diary moons
      born or lost) reconfigures WITH drift preserved (reconfigure-from-
      current-state) */
  signature: '',
  /** R94 — the ACTIVE scope: the home reality ('sol-prime'-style id) or a
      visited galaxy's inner system ('galaxy:${id}'). One session per tier,
      swapped by proximity — the visible universe is the living one; the
      resting scope's memory persists and resumes with a bounded catch-up
      burst on return. */
  scopeId: '',
  /** sim-days stamp of the freshest readback (the extrapolation anchor) */
  readbackDays: 0,
  accumulatedDays: 0,
  stepsRun: 0,
  /** readbacks persisted to the session memory so far */
  savesRun: 0,
  maxDriftAU: 0,
  lastError: null as string | null,
};

interface DriverRosterEntry {
  id: string;
  /** R95 — bodies only (the star leads at index 0). R93's integrated moons
   *  ride their parent's session position with the ornament closed-form. */
  kind: 'body';
  a: number;
  ecc: number;
  phase: number;
  incl: number;
  speed: number;
  node: number;
  argP: number;
  radius: number;
  massKg: number;
}

/** The persisted session memory (STORAGE_KEYS.simSession), per reality. */
export interface SessionSave {
  version: 1;
  /** R95 — the seed law the memory was written under; a mismatch re-seeds. */
  seedLaw: number;
  realityId: string;
  simDays: number;
  savedAt: number;
  signature: string;
  roster: DriverRosterEntry[];
  /** per body [px, py, pz, vx, vy, vz] — SI (m, m/s), the session's own units */
  states: number[][];
  backend: string;
}

/** What the engine feeds the driver: a canon world plus its moons. R95 —
 *  the moons ride the parent (ornament closed-form); the driver ignores
 *  them, the field stays for the engine's feed shape. */
export type DriverBody = {
  data: CosmicBody;
  moons?: { id?: string; a: number; speed: number; phase: number; incl?: number; node?: number; radius?: number }[];
};

/** The engine registers each scope's central star (home: the reality's
 *  anchor — buildBody never renders it, so the driver must seed it).
 *  Galaxy scopes need no registration: their roster already leads with
 *  sys.starData. A starless scope gets a synthesized central sun so the
 *  session ALWAYS has a dominant mass at index 0 (R95 law). */
const scopeStars = new Map<string, CosmicBody>();

export function setScopeStar(scopeId: string, data: CosmicBody): void {
  scopeStars.set(scopeId, data);
}

/** The synthesized central sun for a scope with no registered star and no
 *  leading star body — the session never seeds without a central mass. */
function synthesizedStar(scopeId: string): CosmicBody {
  return {
    id: `${scopeId}::central-star`,
    name: 'Central Star',
    kind: 'star',
    meaning: null,
    note: 'The session stand-in sun for a scope that registered no star.',
    createdAt: 0,
    radius: 2.05,
    palette: { deep: '#ffefc4', base: '#ffd76b', high: '#fff6e0', atmo: '#ffdba8', ice: '#ffffff' },
    orbit: { a: 0, speed: 0, phase: 0, incl: 0 },
  } as unknown as CosmicBody;
}

/** The star a scope's roster leads with (null = the bodies already carry a
 *  star at index 0 — galaxy scopes). */
function starForScope(scopeId: string, bodies: DriverBody[]): CosmicBody | null {
  const registered = scopeStars.get(scopeId);
  if (registered) return registered;
  if (bodies.length > 0 && bodies[0].data.kind === 'star') return null;
  return synthesizedStar(scopeId);
}

/* the driver's private roster mirror: element sets + masses, in feed order
   (the STAR first — index 0 — then the scope's bodies; the engine's home
   seam consumes bodies at i+1). The eccentricity is physicsEngine-derived
   (the Orbit contract doesn't carry it) — the same value Living Gravity's
   nodes use. */
let roster: DriverRosterEntry[] = [];

/* the freshest readback, already converted to scene space: positions at
   driverState.readbackDays + velocities in scene-units per day. */
let readback: Array<{ pos: [number, number, number]; vel: [number, number, number] }> = [];

function rosterSignature(bodies: DriverBody[]): string {
  /* R95 — bodies only: moons ride parents now, so a moon being born must
     not reconfigure the session (the mesh churn stays mesh-side). */
  const ids = bodies.map((b) => b.data.id);
  return `${driverState.scopeId}::${ids.join('|')}`;
}

/** R95 — THE ORBIT-TRUE SEED LAW (the heart of the steady sky):
 *  every world keeps its canon position, direction and plane; its session
 *  SPEED becomes the circular-orbit speed of the gravity actually present.
 *  The cinematic canon table (outer periods 2–4× Kepler for 1 M☉) seeded
 *  sub-circular plunges that demolished the sky; circularized at their own
 *  radii, the worlds hold their canon sky and then wander honestly. */
function seedVelocity(index: number, atDays: number): [number, number, number] {
  const r = roster[index];
  const pos = canonPos(index, atDays);
  if (r.a === 0) return [0, 0, 0]; /* the central star: at rest pre-barycenter */
  /* the canon direction (finite-difference of the closed-form) — preserves
     retrograde motion, inclination and node exactly */
  const dir = canonVel(index, atDays);
  const vmag = Math.hypot(dir[0], dir[1], dir[2]);
  if (!Number.isFinite(vmag) || vmag < 1e-9) return [0, 0, 0];
  /* the centrator: the heaviest roster entry (the star, 1 M☉ by the
     physicsEngine law — the tempered vault never out-masses it) */
  let central = roster[0];
  for (const entry of roster) if (entry.massKg > central.massKg) central = entry;
  const rMeters = Math.hypot(pos[0], pos[1], pos[2]) * METERS_PER_SCENE_UNIT;
  if (rMeters < 1) return [0, 0, 0];
  const vCircMs = Math.sqrt((CONSTANTS.G * central.massKg) / rMeters);
  const vScenePerDay = (vCircMs * SECONDS_PER_DAY) / METERS_PER_SCENE_UNIT;
  return [
    (dir[0] / vmag) * vScenePerDay,
    (dir[1] / vmag) * vScenePerDay,
    (dir[2] / vmag) * vScenePerDay,
  ];
}

/** R95 — the barycenter frame: subtract the mass-weighted mean velocity so
 *  the whole system never drifts off screen.
 *
 *  VELOCITY ONLY, deliberately. The full barycentric transform also relocates
 *  the ORIGIN to the mass centroid — here ~23 units out, because the 0.1 M☉
 *  vault at 4.81 AU outweighs every planet. That would be the textbook frame,
 *  but it would put the session ~23 units away from the clockwork's canon,
 *  and the seam crossfades between exactly those two — the whole sky would
 *  slide during every fade. Keeping the canon's origin and centring only the
 *  velocity keeps both ends in ONE frame.
 *
 *  The star's resulting excursion is physics, not a bug: seeded at the origin
 *  with the recoil its planets give it (~1.3 km/s) while the barycenter sits
 *  ~23 units away, it traces a slow, highly eccentric arc bounded by that
 *  same 23 units — the "gravitational wobble made visible" the anchor group
 *  has always shown, now the real one. */
function barycenterFrame(vels: Array<[number, number, number]>): void {
  let mx = 0, my = 0, mz = 0, mtot = 0;
  for (let i = 0; i < roster.length; i++) {
    const m = roster[i].massKg;
    mx += m * vels[i][0]; my += m * vels[i][1]; mz += m * vels[i][2];
    mtot += m;
  }
  if (mtot <= 0) return;
  for (let i = 0; i < vels.length; i++) {
    vels[i][0] -= mx / mtot;
    vels[i][1] -= my / mtot;
    vels[i][2] -= mz / mtot;
  }
}

/** Build the full roster from the engine's bodies: the STAR leads at index
 *  0 (registered, already-leading, or synthesized — R95), then every body.
 *  R95 — moons are no longer roster entries (they ride their parent). */
function buildRoster(bodies: DriverBody[], simDays: number): DriverRosterEntry[] {
  const entries: DriverRosterEntry[] = [];
  const star = starForScope(driverState.scopeId, bodies);
  /* R95 — the star's mass is the ceiling for every temper below (the Hill
     bound): index 0 is the central sun by law, and when the bodies already
     lead with one, that leading star IS the central mass. */
  const starMassKg = star
    ? calculatePhysics(star, simDays).massKg
    : bodies[0]?.data.kind === 'star'
      ? calculatePhysics(bodies[0].data, simDays).massKg
      : CONSTANTS.M_sun;
  if (star) {
    const starPhys = calculatePhysics(star, simDays);
    entries.push({
      id: star.id,
      kind: 'body',
      a: star.orbit.a,
      ecc: star.orbit.a > 0 ? starPhys.eccentricity : 0,
      phase: star.orbit.phase,
      incl: star.orbit.incl,
      speed: star.orbit.speed,
      node: star.orbit.node ?? 0,
      argP: star.orbit.argP ?? 0,
      radius: star.radius,
      massKg: starPhys.massKg,
    });
  }
  for (const b of bodies) {
    const phys = calculatePhysics(b.data, simDays);
    const elems = {
      a: b.data.orbit.a,
      ecc: phys.eccentricity,
      phase: b.data.orbit.phase,
      incl: b.data.orbit.incl,
      speed: b.data.orbit.speed,
      node: b.data.orbit.node ?? 0,
      argP: b.data.orbit.argP ?? 0,
    };
    /* R95 — the vault temper: in-session mass = the mass its own canon
       orbit implies (|v|²·r/G ≈ 0.1 M☉). At the displayed 10 M☉ no seed
       can hold the sky — the hole dives through the inner system every
       ~sim-year. The 10 M☉ display/UI law is untouched everywhere else. */
    let massKg = phys.massKg;
    if (b.data.kind === 'vault' || b.data.kind === 'hole') {
      const pos = elementsPos(elems, simDays);
      const v = elementsVel(elems, simDays);
      const vmag = Math.hypot(v[0], v[1], v[2]);
      const rMeters = Math.hypot(pos[0], pos[1], pos[2]) * METERS_PER_SCENE_UNIT;
      if (vmag > 1e-9 && rMeters > 1) {
        const vMs = (vmag * METERS_PER_SCENE_UNIT) / SECONDS_PER_DAY;
        const implied = (vMs * vMs * rMeters) / CONSTANTS.G;
        /* R95 — THE HILL TEMPER. The orbit-implied mass (≈0.1 M☉ for the
           vault's own canon lap) is itself too heavy to sit inside a real
           planetary system: a tenth-of-a-solar-mass companion at 4.8 AU
           scatters the inner worlds out of the sky within ~600 sim-days
           (measured — the round's physics probe). The seed must be a system
           that can actually hold together, so a vault is also capped at a
           thousandth of the star — well inside its own Hill sphere, where
           its pull on the inner worlds is bounded and honest.
           The 10 M☉ display/UI law is untouched; this is the session's
           internal mass, and the vault still moves (it is a real body that
           tugs the star and the outer worlds). */
        massKg = Math.min(implied, starMassKg / 1000, phys.massKg);
      }
    }
    entries.push({
      id: b.data.id,
      kind: 'body',
      a: elems.a,
      ecc: elems.ecc,
      phase: elems.phase,
      incl: elems.incl,
      speed: elems.speed,
      node: elems.node,
      argP: elems.argP,
      radius: b.data.radius,
      massKg,
    });
  }
  return entries.slice(0, SESSION_BODY_CAP);
}

/** Build the driver roster from the engine's runtime bodies — the star
 *  leads, then the bodies (R95: moons ride parents, no roster entries). */
function syncRoster(bodies: DriverBody[], simDays: number): void {
  roster = buildRoster(bodies, simDays);
  driverState.signature = rosterSignature(bodies);
}

/** Canonical scene-space position of an element set at a given sim-day —
 *  the exact Kepler solve; a=0 (the central star) sits at the origin. */
function elementsPos(
  r: { a: number; ecc: number; phase: number; incl: number; speed: number; node: number; argP: number },
  atDays: number,
): [number, number, number] {
  if (r.a === 0) return [0, 0, 0];
  const p = calculateKeplerPosition(r.a, r.ecc, r.phase, r.incl, atDays, r.speed, r.node, r.argP);
  return [p.x, p.y, p.z];
}

/** Canonical scene-space velocity by central finite difference — the same
    d = 0.05-day method nbody.ts and simTwin.ts use (there is no stored
    velocity in the Orbit contract). */
function elementsVel(
  r: { a: number; ecc: number; phase: number; incl: number; speed: number; node: number; argP: number },
  atDays: number,
): [number, number, number] {
  if (r.a === 0) return [0, 0, 0];
  const d = 0.05;
  const a = elementsPos(r, atDays + d);
  const b = elementsPos(r, atDays - d);
  const scenePerDay = 1 / (2 * d);
  return [
    (a[0] - b[0]) * scenePerDay,
    (a[1] - b[1]) * scenePerDay,
    (a[2] - b[2]) * scenePerDay,
  ];
}

function canonPos(index: number, atDays: number): [number, number, number] {
  return elementsPos(roster[index], atDays);
}

function canonVel(index: number, atDays: number): [number, number, number] {
  return elementsVel(roster[index], atDays);
}

/** SimBodyInput[] seeded from the canon at `atDays` — R95's orbit-true law:
 *  canon positions, gravity-true circular speeds in the canon direction,
 *  the barycenter frame at rest (real masses, SI units). */
export function buildRosterInputs(atDays: number): SimBodyInput[] {
  const m = METERS_PER_SCENE_UNIT;
  const vels = roster.map((_, i) => seedVelocity(i, atDays));
  barycenterFrame(vels);
  return roster.map((r, i) => {
    const pos = canonPos(i, atDays);
    const vel = vels[i];
    return {
      id: i,
      mass: r.massKg,
      radius: Math.max(1, (r.radius / 2.05) * 6.371e6),
      px: pos[0] * m, py: pos[1] * m, pz: pos[2] * m,
      vx: vel[0] * m / SECONDS_PER_DAY, vy: vel[1] * m / SECONDS_PER_DAY, vz: vel[2] * m / SECONDS_PER_DAY,
    };
  });
}

/** SimBodyInput[] from explicit SI states (restore / churn-preservation). */
function inputsFromStates(states: number[][]): SimBodyInput[] {
  return roster.map((r, i) => {
    const s = states[i] ?? (() => {
      const pos = canonPos(i, driverState.readbackDays);
      const vel = seedVelocity(i, driverState.readbackDays);
      const m = METERS_PER_SCENE_UNIT;
      return [pos[0] * m, pos[1] * m, pos[2] * m, vel[0] * m / SECONDS_PER_DAY, vel[1] * m / SECONDS_PER_DAY, vel[2] * m / SECONDS_PER_DAY];
    })();
    return {
      id: i,
      mass: r.massKg,
      radius: Math.max(1, (r.radius / 2.05) * 6.371e6),
      px: s[0], py: s[1], pz: s[2],
      vx: s[3], vy: s[4], vz: s[5],
    };
  });
}

/** Cache a batched readback (SI → scene) and stamp it. */
function cacheReadback(states: SimBodyState[], atDays: number): void {
  const m = METERS_PER_SCENE_UNIT;
  readback = states.map((st) => ({
    pos: [st.pos[0] / m, st.pos[1] / m, st.pos[2] / m] as [number, number, number],
    vel: [
      st.vel[0] * SECONDS_PER_DAY / m,
      st.vel[1] * SECONDS_PER_DAY / m,
      st.vel[2] * SECONDS_PER_DAY / m,
    ] as [number, number, number],
  }));
  driverState.readbackDays = atDays;
}

/** Configure the session from the canon at `atDays` (the seed), cache the
    readback, and clear drift telemetry — the honest "fresh universe". */
export async function seedFromCanon(bodies: DriverBody[], simDays: number, realityId: string): Promise<void> {
  driverState.scopeId = realityId;
  syncRoster(bodies, simDays);
  driverTelemetry.clear();
  const res = await cosmosBridge.simConfigure(buildRosterInputs(simDays));
  if (res.configured !== roster.length) {
    throw new Error(`sim session configured ${res.configured}/${roster.length} bodies`);
  }
  /* the session now holds exactly the canon: cache it as the first readback */
  const seeded = await cosmosBridge.simStates();
  cacheReadback(seeded.states, simDays);
  driverState.configured = true;
  driverState.readbackDays = simDays;
  driverState.accumulatedDays = 0;
  driverState.maxDriftAU = 0;
  driverState.lastError = null;
}

/** Roster churn WITHOUT losing the story: read every current state, rebuild
    the roster, map old states onto surviving ids (newcomers get canon
    states), and reconfigure FROM THOSE STATES. The universe never resets
    unless the author tells it to. */
async function reconfigurePreserving(bodies: DriverBody[], simDays: number): Promise<void> {
  const oldRoster = roster;
  let oldStates: SimBodyState[] | null = null;
  try {
    const res = await cosmosBridge.simStates();
    if (res.count > 0) oldStates = res.states;
  } catch { /* an empty session is fine — everything seeds from canon */ }

  const previous = new Map<string, SimBodyState>();
  if (oldStates) {
    oldRoster.forEach((r, i) => {
      if (oldStates && i < oldStates.length) previous.set(r.id, oldStates[i]);
    });
  }

  const newRoster = buildRoster(bodies, simDays);
  roster = newRoster;
  driverState.signature = rosterSignature(bodies);
  driverTelemetry.clear();

  const m = METERS_PER_SCENE_UNIT;
  const merged: number[][] = newRoster.map((r, idx) => {
    const carried = previous.get(r.id);
    if (carried) return [carried.pos[0], carried.pos[1], carried.pos[2], carried.vel[0], carried.vel[1], carried.vel[2]];
    /* R95 — newcomers join at the orbit-true seed (canon position, gravity-
       true speed); survivors carry their living states unchanged. */
    const pos = canonPos(idx, simDays);
    const vel = seedVelocity(idx, simDays);
    return [pos[0] * m, pos[1] * m, pos[2] * m, vel[0] * m / SECONDS_PER_DAY, vel[1] * m / SECONDS_PER_DAY, vel[2] * m / SECONDS_PER_DAY];
  });

  const res = await cosmosBridge.simConfigure(inputsFromStates(merged));
  if (res.configured !== roster.length) {
    throw new Error(`sim session configured ${res.configured}/${roster.length} bodies`);
  }
  const fresh = await cosmosBridge.simStates();
  cacheReadback(fresh.states, simDays);
  driverState.configured = true;
  driverState.accumulatedDays = 0;
}

/* ------------------------------ persistence ----------------------------- */

function buildSessionSave(realityId: string, simDays: number, backend: string): SessionSave {
  const m = METERS_PER_SCENE_UNIT;
  return {
    version: 1,
    seedLaw: SEED_LAW,
    realityId,
    simDays,
    savedAt: Date.now(),
    signature: driverState.signature,
    roster,
    states: readback.map((r) => [
      r.pos[0] * m, r.pos[1] * m, r.pos[2] * m,
      r.vel[0] * m / SECONDS_PER_DAY, r.vel[1] * m / SECONDS_PER_DAY, r.vel[2] * m / SECONDS_PER_DAY,
    ]),
    backend,
  };
}

export function serializeSession(realityId: string, simDays: number, backend: string): string {
  return JSON.stringify(buildSessionSave(realityId, simDays, backend));
}

export function parseSession(json: string): SessionSave | null {
  try {
    const save = JSON.parse(json) as SessionSave;
    if (save?.version !== 1 || !Array.isArray(save.roster) || !Array.isArray(save.states)) return null;
    return save;
  } catch {
    return null; /* corrupt memory → the canon re-seeds (recovery-key spirit) */
  }
}

function readMemory(): Record<string, SessionSave> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.simSession);
    return raw ? (JSON.parse(raw) as Record<string, SessionSave>) : {};
  } catch {
    return {};
  }
}

function writeMemory(memory: Record<string, SessionSave>): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEYS.simSession, JSON.stringify(memory));
    return true;
  } catch {
    return false; /* quota — the story continues in RAM; the canon heal exists */
  }
}

/** Persist the driving session's current state (the freshest readback) so
    the drifted universe resumes exactly across close/reopen. */
export function saveSession(realityId: string, simDays: number, backend: string): boolean {
  if (!driverState.configured || roster.length === 0) return false;
  const memory = readMemory();
  memory[realityId] = buildSessionSave(realityId, simDays, backend);
  const ok = writeMemory(memory);
  if (ok) driverState.savesRun += 1;
  return ok;
}

/** Load a reality's saved session (or null — first boot, or corrupt memory). */
export function loadSession(realityId: string): SessionSave | null {
  return readMemory()[realityId] ?? null;
}

/** R102 — ZERO TRACE: a PURGED reality's session memory dies with it, so a
    deleted universe never left so much as a drift stamp behind. The home
    scope's memory is keyed by the reality id (plus any scoped children
    under `${realityId}:`); galaxy-scope memories ('galaxy:${gid}') are keyed
    by galaxy id, become unreachable the moment the reality's roster is
    gone, and are never read again. */
export function forgetSession(realityId: string): void {
  const memory = readMemory();
  let changed = false;
  for (const key of Object.keys(memory)) {
    if (key === realityId || key.startsWith(`${realityId}:`)) {
      delete memory[key];
      changed = true;
    }
  }
  if (changed) writeMemory(memory);
}

/** Restore a saved session: configure from the saved states, cache the
    readback at the saved stamp. Returns the sim-days the engine should
    rewind/advance its clock to (the saved universe's own time). */
export async function restoreSession(save: SessionSave): Promise<number> {
  driverState.scopeId = save.realityId;
  roster = save.roster;
  driverState.signature = save.signature;
  driverTelemetry.clear();
  const res = await cosmosBridge.simConfigure(inputsFromStates(save.states));
  if (res.configured !== roster.length) {
    throw new Error(`sim session restored ${res.configured}/${roster.length} bodies`);
  }
  const fresh = await cosmosBridge.simStates();
  cacheReadback(fresh.states, save.simDays);
  driverState.configured = true;
  driverState.readbackDays = save.simDays;
  driverState.accumulatedDays = 0;
  driverState.lastError = null;
  return save.simDays;
}

/** Restore Ephemeris, driver edition: wipe the memory for this reality and
    re-seed from the canon (the author's personal heal). */
export async function healDriver(bodies: DriverBody[], simDays: number, realityId: string): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    const memory = readMemory();
    delete memory[realityId];
    writeMemory(memory);
  }
  await seedFromCanon(bodies, simDays, realityId);
}

/* ------------------------------- the tick ------------------------------- */

/**
 * The engine's per-frame hook (wired behind the R92 gate). Gated: inert
 * unless driverState.enabled. Accumulates the live clock; at the threshold
 * advances the session by the same simulated days (fire-and-forget — never
 * awaited in the frame), then refreshes the batched readback + drift
 * telemetry and persists the session memory on cadence.
 */
export function driverTick(bodies: DriverBody[], dtDays: number, simDays: number): void {
  if (!driverState.enabled) return;
  /* R95 — accumulate BEFORE the pending guard: sim-days never vanish while
     a step is in flight. The old order dropped them (the session clock
     lagged the sky forever and the freshness law flickered); now the next
     fire after a slow step covers every day it missed. */
  driverState.accumulatedDays += dtDays;
  if (driverState.pending) return;

  /* roster churn (reality switch, create, delete, edit) → reconfigure with
     the drift carried over (never reset unless the author heals) */
  const sig = rosterSignature(bodies);
  if (sig !== driverState.signature) {
    driverState.pending = true;
    reconfigurePreserving(bodies, simDays)
      .then(() => { driverState.pending = false; })
      .catch((err) => {
        driverState.pending = false;
        driverState.lastError = err instanceof Error ? err.message : String(err);
      });
    return;
  }

  if (driverState.accumulatedDays < FIRE_THRESHOLD_DAYS) return;

  const atDays = driverState.readbackDays + driverState.accumulatedDays;
  const dt = driverState.accumulatedDays * SECONDS_PER_DAY;
  driverState.pending = true;

  cosmosBridge
    /* R95 — THE SUBSTEP LAW. simStep(dt, iterations) advances dt × iterations
       (the Rust/C++/TS twins all step the SAME dt `iterations` times), so the
       per-step dt must be the span DIVIDED by the substep count. Passing the
       whole span as dt ran the physics 24× ahead of the sim clock every
       fire: the session's own clock and the rendered sky disagreed by 24×,
       which is exactly the 24-day "eccentricities" the R94 telemetry showed
       on circular orbits — and, once the readback's stamp and the
       integrator's real time disagree, bodies run off their orbits.
       catchUpSession already had this division; the tick did not. */
    .simStep(dt / DRIVER_SUBSTEPS, DRIVER_SUBSTEPS)
    .then(() => cosmosBridge.simStates())
    .then((res) => {
      if (res.count !== roster.length) {
        throw new Error(`session readback ${res.count}/${roster.length} bodies`);
      }
      cacheReadback(res.states, atDays);

      /* drift telemetry: the honest disagreement from the canon, per body */
      let maxDrift = 0;
      for (let i = 0; i < roster.length; i++) {
        const canon = canonPos(i, atDays);
        const drv = readback[i].pos;
        const devScene = Math.hypot(drv[0] - canon[0], drv[1] - canon[1], drv[2] - canon[2]);
        const devAU = devScene / 52;
        maxDrift = Math.max(maxDrift, devAU);
        driverTelemetry.set(roster[i].id, {
          deviationAU: devAU,
          driverPosScene: drv,
          canonPosScene: canon,
        });
      }
      driverState.stepsRun += 1;
      driverState.maxDriftAU = maxDrift;
      driverState.accumulatedDays = 0;
      driverState.lastError = null;

      /* the universe remembers (cadenced, autonomous — an abrupt close
         loses at most a few seconds of drift) */
      if (driverState.stepsRun % SAVE_EVERY_N_READBACKS === 0) {
        saveSession(driverState.scopeId, atDays, res.backend);
      }
    })
    .catch((err) => {
      driverState.lastError = err instanceof Error ? err.message : String(err);
      driverState.accumulatedDays = 0;
    })
    .finally(() => {
      driverState.pending = false;
    });
}

/**
 * THE SEAM READ (consumed by engine.updateBodies, R92): per-body scene-space
 * positions extrapolated from the freshest readback to the LIVE sim-days —
 * pos + velocity × Δt — so motion stays smooth between the 2-day readbacks.
 * Returns null when the driver has nothing trustworthy (disabled, unconfigured,
 * or stale beyond the freshness window): the engine then renders the Kepler
 * solve for that frame, exactly as the keplerCache trust-window dictates.
 */
export function driverReadback(simDays: number): Array<[number, number, number]> | null {
  if (!driverState.enabled || !driverState.configured || readback.length === 0) return null;
  const dtDays = simDays - driverState.readbackDays;
  if (!Number.isFinite(dtDays) || Math.abs(dtDays) > TRUST_WINDOW_DAYS) return null;
  return readback.map((r) => [
    r.pos[0] + r.vel[0] * dtDays,
    r.pos[1] + r.vel[1] * dtDays,
    r.pos[2] + r.vel[2] * dtDays,
  ]);
}

/**
 * R95 — THE VELOCITY SEAM READ: the same freshness gating as
 * driverReadback, returning the cached session velocities (scene-units per
 * day). The engine samples it at ~1 Hz to rebuild each world's hover
 * ellipse from the session's osculating elements — the orbit rings follow
 * the living sky instead of stranding on their clockwork paths.
 */
export function driverVelReadback(simDays: number): Array<[number, number, number]> | null {
  if (!driverState.enabled || !driverState.configured || readback.length === 0) return null;
  const dtDays = simDays - driverState.readbackDays;
  if (!Number.isFinite(dtDays) || Math.abs(dtDays) > TRUST_WINDOW_DAYS) return null;
  return readback.map((r) => [r.vel[0], r.vel[1], r.vel[2]]);
}

/* ------------------------- scope swap (R94) ----------------------------- */

/** Catch-up pacing: one simStep call of 1000 iterations at 0.25-day RK4
 *  sub-steps advances the session 250 sim-days — moon orbits stay resolved
 *  (56+ steps per 14-day orbit) while a long absence costs only a handful
 *  of calls. Beyond the cap, the memory is too far behind to matter. */
const CATCHUP_CHUNK_DAYS = 250;
const CATCHUP_MAX_DAYS = 100000;

/** R95 — yield between catch-up chunks: on the wasm/TS tiers a simStep is
 *  synchronous on the main thread, so a long burst used to freeze every
 *  frame until it finished. A macrotask between chunks lets the loop
 *  render between them (the burst stays bounded, the sky stays alive). */
const yieldBetweenChunks = (): Promise<void> => new Promise<void>((resolve) => { setTimeout(resolve, 0); });

function countRosterBodies(bodies: DriverBody[]): number {
  /* R95 — the star leads (or is synthesized) + every body; moons ride
     parents and are not counted (they are not roster entries). */
  return bodies.length + (starForScope(driverState.scopeId, bodies) ? 1 : 0);
}

/** Fast-forward the freshly restored session to the live clock — the burst
 *  that lets a visited-long-ago scope resume exactly where its story left
 *  off (the decree: the universe remembers, and time did pass). */
async function catchUpSession(toDays: number): Promise<void> {
  let guard = 0;
  while (driverState.readbackDays < toDays - 0.001 && guard < 2000) {
    const remaining = toDays - driverState.readbackDays;
    const chunk = Math.min(CATCHUP_CHUNK_DAYS, remaining);
    const receipt = await cosmosBridge.simStep((chunk * SECONDS_PER_DAY) / 1000, 1000);
    /* R95 — trust the receipt: stamp only what the backend actually
       stepped (a clamped iteration count no longer lies the clock ahead). */
    const steppedRatio = receipt.stepped > 0 ? Math.min(1, receipt.stepped / 1000) : 0;
    driverState.readbackDays += chunk * steppedRatio;
    await yieldBetweenChunks();
    guard += 1;
  }
  const fresh = await cosmosBridge.simStates();
  cacheReadback(fresh.states, driverState.readbackDays);
}

/**
 * R94 — THE SCOPE SWAP ("everything everywhere"): one session per tier, so
 * the visible universe is the living one. Activating a scope saves the
 * resting one (its memory persists), then either resumes the target's own
 * memory — with a bounded catch-up burst to the live clock — or seeds it
 * fresh from the canon. The engine calls this when the camera's realm
 * changes (home ⇄ a galaxy's inner system); the tick only runs for the
 * active scope. R95 — resolves to the adopted sim-days when the memory's
 * story sits AHEAD of the engine clock (boot: the clock restarted at 0,
 * the universe remembers — the engine rewinds/advances to the memory's
 * time), else null.
 */
export function activateScope(scopeId: string, bodies: DriverBody[], simDays: number): Promise<number | null> {
  if (driverState.scopeId === scopeId && driverState.configured) return Promise.resolve(null);
  if (driverState.pending) return Promise.resolve(null); /* an activation is in flight */
  driverState.pending = true;
  const run = async (): Promise<number | null> => {
    if (driverState.configured) {
      saveSession(driverState.scopeId, driverState.readbackDays, 'scope-swap');
    }
    driverState.configured = false;
    readback = [];
    driverState.scopeId = scopeId;
    driverTelemetry.clear();
    const saved = loadSession(scopeId);
    const absence = saved ? simDays - saved.simDays : Infinity;
    if (
      saved
      && saved.seedLaw === SEED_LAW /* pre-R95 memories describe a detonating universe — re-seed */
      && saved.roster.length === countRosterBodies(bodies)
      && absence <= CATCHUP_MAX_DAYS
    ) {
      await restoreSession(saved);
      if (absence >= 0) {
        await catchUpSession(simDays);
        return null;
      }
      /* R95 — THE BOOT RESUME: the engine clock restarted at 0 while the
         memory's story sits ahead of it. The old `absence >= 0` test made
         this branch dead code — every reopen silently discarded the
         memory and re-seeded. The universe remembers: adopt the memory's
         clock (the engine sets simDays to the returned stamp). */
      return saved.simDays;
    }
    await seedFromCanon(bodies, simDays, scopeId);
    return null;
  };
  return run()
    .then((adopted) => { driverState.pending = false; return adopted; })
    .catch((err) => {
      driverState.pending = false;
      driverState.lastError = err instanceof Error ? err.message : String(err);
      return null;
    });
}

/** Flip the driver on. The engine owns the gate; roster sync + seeding (or
    restore from the saved memory) happen here so the tick hook stays cheap.
    R95 — the pending guard lives entirely inside activateScope (the old
    preset made enable's own activation decline itself). */
export function enableDriver(bodies: DriverBody[], simDays: number, realityId: string): Promise<number | null> {
  driverState.enabled = true;
  driverState.lastError = null;
  /* R94: enabling IS activating the home scope — the saved memory for THIS
     reality resumes the story exactly (with the catch-up burst); otherwise
     the canon seeds a fresh universe. */
  return activateScope(realityId, bodies, simDays);
}

export function disableDriver(): void {
  /* the memory outlives the session: one last save before rest */
  if (driverState.enabled && driverState.configured) {
    saveSession(driverState.scopeId, driverState.readbackDays, 'disabled');
  }
  driverState.enabled = false;
  driverState.pending = false;
  driverState.accumulatedDays = 0;
  driverTelemetry.clear();
}
