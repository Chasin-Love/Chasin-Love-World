/**
 * R88 — THE PER-FRAME TWIN: the stateful native simulator running alongside
 * the live universe on its own clock, measuring how far true N-body gravity
 * drifts from the Kepler clockwork.
 *
 * THE HYBRID LAW (R87 ruling): Kepler is the sky's canon — this module NEVER
 * writes to a body's position, rotation, or any rendered state. It only
 * reads (orbit elements → canonical positions), feeds the simulator session
 * (cosmos_sim_* through the bridge), and publishes drift telemetry to its
 * own module-level map. The engine gates it: the tick hook is inert unless
 * the author flips it on from the Native Simulator Twin card.
 *
 * Units: the simulator is SI (m/kg/s — cosmos_engine.hpp), the universe is
 * scene units and sim-days (52 scene units = 1 AU, see nbody.ts). All
 * conversions happen here. Masses are the REAL physical masses
 * (physicsEngine-derived kg — the vault really is 10 M☉ here; the
 * dimensional-anchor damping is Living Gravity's UI tempering, not nature's).
 *
 * Session ownership: the native layer holds ONE simulator session (the SIM
 * static in lib.rs). This twin and the console card's "Verify Twin" share
 * it — whoever acts last reconfigures it. The card disables its verify
 * button while the per-frame twin owns the session.
 */
import { calculatePhysics, calculateKeplerPosition, CONSTANTS } from './physicsEngine';
import type { CosmicBody } from '../domain/universe';
import { cosmosBridge } from '../platform/native/cpp_bridge';

/** 52 scene units = 1 AU (nbody.ts SCENE_UNITS_PER_AU); meters per scene unit. */
const METERS_PER_SCENE_UNIT = CONSTANTS.AU / 52;
/** Sim-days → SI seconds. */
const SECONDS_PER_DAY = 86400;
/** Fire the async session at most every ~2 accumulated sim-days (≈⅓ s at
    full clock rate) — real cadence, gentle IPC. */
const FIRE_THRESHOLD_DAYS = 2;

export interface SimTwinDrift {
  deviationAU: number;
  /** twin position in scene units — for cards that want to draw it */
  twinPosScene: [number, number, number];
  canonPosScene: [number, number, number];
}

export const simTwinTelemetry = new Map<string, SimTwinDrift>();

export const simTwinState = {
  enabled: false,
  configured: false,
  pending: false,
  /** the twin's own clock, in sim-days (initialized from the engine) */
  twinDays: 0,
  accumulatedDays: 0,
  stepsRun: 0,
  maxDriftAU: 0,
  lastError: null as string | null,
  /** roster signature — a change (reality switch, body edit) reconfigures */
  signature: '',
};

type TwinBody = { data: CosmicBody };

/* the twin's private roster mirror: element sets + masses, in feed order.
   The eccentricity is physicsEngine-derived (the Orbit contract doesn't
   carry it) — the same value Living Gravity's nodes use. */
let roster: Array<{
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
}> = [];

function rosterSignature(bodies: TwinBody[]): string {
  return bodies.map((b) => b.data.id).join('|');
}

/** Build the twin roster from the engine's runtime bodies. Physical masses
    come from physicsEngine (star = 1 M☉, hole/vault = 10 M☉, planets from
    radius³ × profile density). */
function syncRoster(bodies: TwinBody[], simDays: number): void {
  roster = bodies.map((b) => {
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
  simTwinState.signature = rosterSignature(bodies);
  simTwinState.configured = false; /* force a fresh configure */
}

/** Canonical scene-space position of a roster entry at a given sim-day. */
function canonPos(index: number, atDays: number): [number, number, number] {
  const r = roster[index];
  const p = calculateKeplerPosition(r.a, r.ecc, r.phase, r.incl, atDays, r.speed, r.node, r.argP);
  return [p.x, p.y, p.z];
}

/** Canonical scene-space velocity by central finite difference — the same
    d = 0.05-day method nbody.ts uses (there is no stored velocity). */
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

async function configureSession(): Promise<void> {
  const bodies = roster.map((r, i) => {
    const pos = canonPos(i, simTwinState.twinDays);
    const vel = canonVel(i, simTwinState.twinDays);
    const m = METERS_PER_SCENE_UNIT;
    return {
      id: i,
      mass: r.massKg,
      radius: Math.max(1, (r.radius / 2.05) * 6.371e6),
      px: pos[0] * m, py: pos[1] * m, pz: pos[2] * m,
      vx: vel[0] * m / SECONDS_PER_DAY, vy: vel[1] * m / SECONDS_PER_DAY, vz: vel[2] * m / SECONDS_PER_DAY,
    };
  });
  const res = await cosmosBridge.simConfigure(bodies);
  if (res.configured !== roster.length) {
    throw new Error(`sim session configured ${res.configured}/${roster.length} bodies`);
  }
  simTwinState.configured = true;
}

/**
 * The engine's per-frame hook. Gated: inert unless simTwinState.enabled.
 * Accumulates the live clock; when the threshold is reached, advances the
 * twin session by the same simulated days (fire-and-forget — never awaited
 * in the frame, never blocking, never touching rendered state) and, on
 * read-back, measures how far true N-body gravity has drifted from the
 * Kepler canon for every body.
 */
export function simTwinTick(bodies: TwinBody[], dtDays: number, simDays: number): void {
  if (!simTwinState.enabled || simTwinState.pending) return;

  /* roster churn (reality switch, create, delete, edit) → fresh session */
  const sig = rosterSignature(bodies);
  if (sig !== simTwinState.signature) {
    syncRoster(bodies, simDays);
    simTwinTelemetry.clear();
    simTwinState.twinDays = simDays;
    simTwinState.accumulatedDays = 0;
    simTwinState.pending = true;
    configureSession()
      .then(() => { simTwinState.pending = false; })
      .catch((err) => {
        simTwinState.pending = false;
        simTwinState.lastError = err instanceof Error ? err.message : String(err);
      });
    return;
  }

  simTwinState.accumulatedDays += dtDays;
  if (simTwinState.accumulatedDays < FIRE_THRESHOLD_DAYS) return;

  const dt = simTwinState.accumulatedDays * SECONDS_PER_DAY;
  const atDays = simTwinState.twinDays + simTwinState.accumulatedDays;
  const count = roster.length;
  simTwinState.pending = true;

  cosmosBridge
    .simStep(dt, 1)
    .then(async () => {
      let maxDrift = 0;
      for (let i = 0; i < count; i++) {
        const st = await cosmosBridge.simBody(i);
        const canon = canonPos(i, atDays);
        const m = METERS_PER_SCENE_UNIT;
        const twinScene: [number, number, number] = [st.pos[0] / m, st.pos[1] / m, st.pos[2] / m];
        const devScene = Math.hypot(twinScene[0] - canon[0], twinScene[1] - canon[1], twinScene[2] - canon[2]);
        const devAU = devScene / 52;
        maxDrift = Math.max(maxDrift, devAU);
        simTwinTelemetry.set(roster[i].id, { deviationAU: devAU, twinPosScene: twinScene, canonPosScene: canon });
      }
      simTwinState.stepsRun += 1;
      simTwinState.maxDriftAU = maxDrift;
      simTwinState.twinDays = atDays;
      simTwinState.accumulatedDays = 0;
      simTwinState.lastError = null;
    })
    .catch((err) => {
      simTwinState.lastError = err instanceof Error ? err.message : String(err);
      simTwinState.accumulatedDays = 0;
    })
    .finally(() => {
      simTwinState.pending = false;
    });
}

/** Flip the twin on. The engine owns the gate; the roster sync + session
    configure happen here so the tick hook stays cheap. */
export function enableSimTwin(bodies: TwinBody[], simDays: number): void {
  simTwinState.enabled = true;
  simTwinState.lastError = null;
  syncRoster(bodies, simDays);
  simTwinState.twinDays = simDays;
  simTwinState.accumulatedDays = 0;
  simTwinState.pending = true;
  configureSession()
    .then(() => { simTwinState.pending = false; })
    .catch((err) => {
      simTwinState.pending = false;
      simTwinState.lastError = err instanceof Error ? err.message : String(err);
    });
}

export function disableSimTwin(): void {
  simTwinState.enabled = false;
  simTwinState.pending = false;
  simTwinState.accumulatedDays = 0;
  simTwinTelemetry.clear();
}
