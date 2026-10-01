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
 * physical masses (the vault really is 10 M☉ here — the decree supersedes
 * Living Gravity's dimensional-anchor tempering while driving).
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
    it the engine falls back to the Kepler solve for that frame. */
const TRUST_WINDOW_DAYS = 2.5;
/** Persist the session memory every N readbacks (8 × 2 days ≈ 2.7 real
    seconds at full clock — an abrupt close loses at most ~3 s of drift). */
const SAVE_EVERY_N_READBACKS = 8;
/** Mirror of the Rust session cap (lib.rs cosmos_sim_configure). */
const SESSION_BODY_CAP = 4096;

export interface DriverDrift {
  deviationAU: number;
  driverPosScene: [number, number, number];
  canonPosScene: [number, number, number];
}

export const driverTelemetry = new Map<string, DriverDrift>();

export const driverState = {
  enabled: false,
  configured: false,
  pending: false,
  /** roster signature — a change (reality switch, body edit) reconfigures
      WITH drift preserved (reconfigure-from-current-state) */
  signature: '',
  realityId: '',
  /** sim-days stamp of the freshest readback (the extrapolation anchor) */
  readbackDays: 0,
  accumulatedDays: 0,
  stepsRun: 0,
  /** readbacks persisted to the session memory so far */
  savesRun: 0,
  maxDriftAU: 0,
  lastError: null as string | null,
};

export interface DriverRosterEntry {
  id: string;
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
  realityId: string;
  simDays: number;
  savedAt: number;
  signature: string;
  roster: DriverRosterEntry[];
  /** per body [px, py, pz, vx, vy, vz] — SI (m, m/s), the session's own units */
  states: number[][];
  backend: string;
}

type DriverBody = { data: CosmicBody };

/* the driver's private roster mirror: element sets + masses, in feed order.
   The eccentricity is physicsEngine-derived (the Orbit contract doesn't
   carry it) — the same value Living Gravity's nodes use. */
let roster: DriverRosterEntry[] = [];

/* the freshest readback, already converted to scene space: positions at
   driverState.readbackDays + velocities in scene-units per day. */
let readback: Array<{ pos: [number, number, number]; vel: [number, number, number] }> = [];

function rosterSignature(bodies: DriverBody[]): string {
  return `${driverState.realityId}::${bodies.map((b) => b.data.id).join('|')}`;
}

/** Build the driver roster from the engine's runtime bodies. Physical masses
    come from physicsEngine (star = 1 M☉, hole/vault = 10 M☉, planets from
    radius³ × profile density) — the same law the twin lab obeys. */
function syncRoster(bodies: DriverBody[], simDays: number): void {
  roster = bodies.slice(0, SESSION_BODY_CAP).map((b) => {
    const phys = calculatePhysics(b.data, simDays);
    return {
      id: b.data.id,
      a: b.data.orbit.a,
      ecc: phys.eccentricity,
      phase: b.data.orbit.phase,
      incl: b.data.orbit.incl,
      speed: b.data.orbit.speed,
      node: b.data.orbit.node ?? 0,
      argP: b.data.orbit.argP ?? 0,
      radius: b.data.radius,
      massKg: phys.massKg,
    };
  });
  driverState.signature = rosterSignature(bodies);
}

/** Canonical scene-space position of a roster entry at a given sim-day. */
function canonPos(index: number, atDays: number): [number, number, number] {
  const r = roster[index];
  const p = calculateKeplerPosition(r.a, r.ecc, r.phase, r.incl, atDays, r.speed, r.node, r.argP);
  return [p.x, p.y, p.z];
}

/** Canonical scene-space velocity by central finite difference — the same
    d = 0.05-day method nbody.ts and simTwin.ts use (there is no stored
    velocity in the Orbit contract). */
function canonVel(index: number, atDays: number): [number, number, number] {
  const d = 0.05;
  const a = canonPos(index, atDays + d);
  const b = canonPos(index, atDays - d);
  const scenePerDay = 1 / (2 * d);
  return [
    (a[0] - b[0]) * scenePerDay,
    (a[1] - b[1]) * scenePerDay,
    (a[2] - b[2]) * scenePerDay,
  ];
}

/** SimBodyInput[] seeded from the canon at `atDays` (the seeding math the
    twin lab uses — real masses, finite-difference velocities, SI units). */
export function buildRosterInputs(atDays: number): SimBodyInput[] {
  const m = METERS_PER_SCENE_UNIT;
  return roster.map((r, i) => {
    const pos = canonPos(i, atDays);
    const vel = canonVel(i, atDays);
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
      const vel = canonVel(i, driverState.readbackDays);
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
  driverState.realityId = realityId;
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

  const newRoster = bodies.slice(0, SESSION_BODY_CAP).map((b) => {
    const phys = calculatePhysics(b.data, simDays);
    return {
      id: b.data.id,
      a: b.data.orbit.a,
      ecc: phys.eccentricity,
      phase: b.data.orbit.phase,
      incl: b.data.orbit.incl,
      speed: b.data.orbit.speed,
      node: b.data.orbit.node ?? 0,
      argP: b.data.orbit.argP ?? 0,
      radius: b.data.radius,
      massKg: phys.massKg,
    };
  });
  roster = newRoster;
  driverState.signature = rosterSignature(bodies);
  driverTelemetry.clear();

  const m = METERS_PER_SCENE_UNIT;
  const merged: number[][] = newRoster.map((r, idx) => {
    const carried = previous.get(r.id);
    if (carried) return [carried.pos[0], carried.pos[1], carried.pos[2], carried.vel[0], carried.vel[1], carried.vel[2]];
    const pos = canonPos(idx, simDays);
    const vel = canonVel(idx, simDays);
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

/** Restore a saved session: configure from the saved states, cache the
    readback at the saved stamp. Returns the sim-days the engine should
    rewind/advance its clock to (the saved universe's own time). */
export async function restoreSession(save: SessionSave): Promise<number> {
  driverState.realityId = save.realityId;
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
  if (!driverState.enabled || driverState.pending) return;

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

  driverState.accumulatedDays += dtDays;
  if (driverState.accumulatedDays < FIRE_THRESHOLD_DAYS) return;

  const atDays = driverState.readbackDays + driverState.accumulatedDays;
  const dt = driverState.accumulatedDays * SECONDS_PER_DAY;
  driverState.pending = true;

  cosmosBridge
    .simStep(dt, DRIVER_SUBSTEPS)
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
        saveSession(driverState.realityId, atDays, res.backend);
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

/** Flip the driver on. The engine owns the gate; roster sync + seeding (or
    restore from the saved memory) happen here so the tick hook stays cheap.
    Returns 'restored' | 'seeded' via promise resolution count semantics —
    the engine just awaits readiness. */
export function enableDriver(bodies: DriverBody[], simDays: number, realityId: string): Promise<void> {
  driverState.enabled = true;
  driverState.lastError = null;
  /* a saved memory for THIS reality resumes the story exactly; otherwise
     the canon seeds a fresh universe */
  const saved = loadSession(realityId);
  if (saved && saved.roster.length === bodies.length) {
    driverState.pending = true;
    return restoreSession(saved)
      .then(() => { driverState.pending = false; })
      .catch((err) => {
        driverState.pending = false;
        driverState.lastError = err instanceof Error ? err.message : String(err);
        /* the memory lied (roster drift, corrupt states) — re-seed clean */
        return seedFromCanon(bodies, simDays, realityId).then(() => undefined);
      });
  }
  driverState.pending = true;
  return seedFromCanon(bodies, simDays, realityId)
    .then(() => { driverState.pending = false; })
    .catch((err) => {
      driverState.pending = false;
      driverState.lastError = err instanceof Error ? err.message : String(err);
    });
}

export function disableDriver(): void {
  /* the memory outlives the session: one last save before rest */
  if (driverState.enabled && driverState.configured) {
    saveSession(driverState.realityId, driverState.readbackDays, 'disabled');
  }
  driverState.enabled = false;
  driverState.pending = false;
  driverState.accumulatedDays = 0;
  driverTelemetry.clear();
}
