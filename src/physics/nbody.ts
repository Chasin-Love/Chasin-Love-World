/* -------------------------------------------------------------------------- */
/*         LIVING GRAVITY — FIRST-ORDER N-BODY COUPLING IN ELEMENTS          */
/* -------------------------------------------------------------------------- */

/* Newton's law of universal gravitation says every mass pulls every other
   mass; Einstein says the resulting motion is free-fall through curved
   spacetime. This module adds that mutual attraction WITHOUT ever being able
   to destabilize the universe — and it does so with the SAME formalism real
   celestial mechanics uses for exactly this problem:

   • OSCULATING ELEMENTS, NOT POSITION DELTAS. Integrating position offsets
     against a prescribed Kepler ephemeris has a secular drift channel (the
     tidal tensor's anti-restoring directions pump the delta forever). Real
     perturbation theory instead integrates the ORBITAL ELEMENTS with Gauss's
     planetary equations (Murray & Dermott, "Solar System Dynamics") — the
     formalism behind Lagrange–Laplace secular theory and every modern
     long-term Solar System model (Laskar). The dominant star–planet Kepler
     problem stays solved EXACTLY in closed form (calculateKeplerPosition);
     each world's eccentricity, apsidal angle and inclination breathe and
     precess by the real mutual tides, and the rendered position is
     re-derived from the exact Kepler solver of the perturbed elements.
   • STRUCTURAL STABILITY. The integrated state lives entirely in bounded
     variables: two angles (apsidal, inclination) and one clamped scalar
     (eccentricity, fenced by THE KEEPER at 0.6). There is no drift channel —
     a pathological roster (giant masses, overlapping orbits) can deform every
     orbit, but can never eject a world. This mirrors why the real Solar
     System endures: its chaos is BOUNDED element diffusion (KAM / resonance
     fencing), never open runaway.
   • CANONICAL HEAL. The divine orbital elements are the sole source of truth
     and are never written. The perturbations (Δe, Δω, Δi) are ephemeral:
     zeroing them instantly restores the exact canonical ephemeris.
   • PLUMMER SOFTENING — the mutual field a = G′m·d/(r²+ε²)^{3/2} keeps close
     encounters finite (the Hill-separation guarantee).
   • THE DIMENSIONAL ANCHOR. The Vault is a 10 M☉ singularity held by the
     lore in stable Keplerian companionship with a 1 M☉ star at 4.8 AU — a
     configuration real Newtonian tides would never permit. The same
     dimensional barrier tempers the singularity's DYNAMIC reach to 10⁻³;
     its LENS still bends starlight like the true 10 M☉ singularity it is.
     Einstein keeps the truth, Newton keeps the peace.

   Unit system closes exactly: 52 scene units = 1 AU, time in days, masses in
   solar masses, G′ = k²·52³ → a 1 AU circular orbit checks out at 365.3
   days. */

import { CONSTANTS, calculateKeplerPosition } from './physicsEngine';
import type { BodyKind } from '../types';

/* ------------------------------ unit system ------------------------------ */
export const SCENE_UNITS_PER_AU = 52;
const GM_SUN_AU3_DAY2 = 2.9591220828559115e-4; /* Gaussian k² */
export const NBODY_G = GM_SUN_AU3_DAY2 * Math.pow(SCENE_UNITS_PER_AU, 3); /* scene³ M☉⁻¹ day⁻² */

/* Plummer softening ε = 0.6 scene units (~1.8 million km) */
const SOFTENING_SQ = 0.36;

/* THE KEEPER — element fences. Real resonances pump eccentricity; the real
   Solar System survives because resonances can also fence it. Here the
   fence is absolute: eccentricity may breathe, never break. */
const E_MAX = 0.6;
const INC_MAX = 0.35;        /* rad of inclination breathing (~20°) */
const RATE_CLAMP = 0.02;     /* max |d(element)/dt| per day — pathological-mass brake */

export interface GravityNode {
  id: string;
  massSolar: number;
  massKg: number;
  isStar: boolean;
  /* canonical orbital elements — set at sync time, NEVER integrated */
  a: number; e0: number; phase: number; incl: number; speed: number; /* rad/day */
  /* per-frame feed from the engine's exact Kepler solve */
  cx: number; cy: number; cz: number;   /* canonical position */
  trueAnomaly: number;                  /* f, from the same solve */
  /* the ONLY integrated state: osculating element perturbations */
  eP: number;      /* Δe  — eccentricity breathing */
  omegaP: number;  /* Δω  — apsidal precession (in-plane) */
  incP: number;    /* Δi  — nodal breathing about the divine node line */
  /* telemetry */
  deviationAU: number;
  strongestPullN: number;
  guarded: boolean;
}

export interface GravityTelemetry {
  deviationAU: number;
  dE: number;
  dOmegaDeg: number;
  dIncDeg: number;
  strongestPullN: number;
  guarded: boolean;
}

/* Module-level telemetry read by React (PhysicsHUD) — high-frequency engine
   data must not ride the UI store's notify/persist cycle. */
export const gravityTelemetry = new Map<string, GravityTelemetry>();
export const gravityFieldStats = { nodes: 0, maxDeviationAU: 0 };

/* THE DIMENSIONAL ANCHOR — see header. */
export function dynamicMassKg(massKg: number, kind: BodyKind): number {
  return (kind === 'hole' || kind === 'vault') ? massKg * 1e-3 : massKg;
}

/* --------------------------- the field itself ---------------------------- */

export class LivingGravityField {
  nodes: GravityNode[] = [];

  /** Rebuild the roster to match the reality's bodies. Fresh or changed
      bodies start healed (zero element perturbation) — a new world is born
      on its divine path, then feels its neighbours. */
  sync(entries: { id: string; massKg: number; isStar: boolean; a: number; e0: number; phase: number; incl: number; speed: number }[]): void {
    const prev = new Map(this.nodes.map((n) => [n.id, n]));
    this.nodes = entries.map((e) => {
      const old = prev.get(e.id);
      const same = old && Math.abs(old.massKg - e.massKg) < 1e-6 && old.a === e.a && old.e0 === e.e0 && old.speed === e.speed;
      if (same) {
        old!.massKg = e.massKg;
        old!.massSolar = e.massKg / CONSTANTS.M_sun;
        return old!;
      }
      return {
        id: e.id,
        massKg: e.massKg,
        massSolar: e.massKg / CONSTANTS.M_sun,
        isStar: e.isStar,
        a: e.a, e0: e.e0, phase: e.phase, incl: e.incl, speed: e.speed,
        cx: 0, cy: 0, cz: 0,
        trueAnomaly: 0,
        eP: 0, omegaP: 0, incP: 0,
        deviationAU: 0,
        strongestPullN: 0,
        guarded: false,
      };
    });
    this.heal();
  }

  /** CANONICAL HEAL — restore the exact divine ephemeris in one stroke. */
  heal(): void {
    for (const n of this.nodes) {
      n.eP = 0; n.omegaP = 0; n.incP = 0;
      n.deviationAU = 0;
      n.strongestPullN = 0;
      n.guarded = false;
      gravityTelemetry.set(n.id, { deviationAU: 0, dE: 0, dOmegaDeg: 0, dIncDeg: 0, strongestPullN: 0, guarded: false });
    }
    gravityFieldStats.nodes = this.nodes.length;
    gravityFieldStats.maxDeviationAU = 0;
  }

  /** Softened mutual perturbing accelerations at the CANONICAL configuration
      (first order in the masses — the order all real perturbation theory
      works at), including the Democratic-Heliocentric indirect term: the
      heliocentric frame is the star's accelerating frame, so every body's
      disturbing acceleration loses the same uniform field. */
  private disturb(out: Float64Array): void {
    out.fill(0);
    const n = this.nodes.length;
    let ix = 0, iy = 0, iz = 0;
    for (let j = 0; j < n; j++) {
      const b = this.nodes[j];
      if (b.isStar) continue;
      const r2 = b.cx * b.cx + b.cy * b.cy + b.cz * b.cz + SOFTENING_SQ;
      const k = NBODY_G * b.massSolar / (r2 * Math.sqrt(r2));
      ix += b.cx * k; iy += b.cy * k; iz += b.cz * k;
    }
    for (let i = 0; i < n; i++) {
      const a = this.nodes[i];
      if (a.isStar) continue; /* the origin feels no disturbing force */
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = this.nodes[j];
        if (b.isStar) continue; /* the star's pull is the exact Kepler term */
        const dx = b.cx - a.cx, dy = b.cy - a.cy, dz = b.cz - a.cz;
        const r2 = dx * dx + dy * dy + dz * dz + SOFTENING_SQ;
        const inv = NBODY_G * b.massSolar / (r2 * Math.sqrt(r2));
        out[3 * i] += dx * inv;
        out[3 * i + 1] += dy * inv;
        out[3 * i + 2] += dz * inv;
      }
      out[3 * i] -= ix;
      out[3 * i + 1] -= iy;
      out[3 * i + 2] -= iz;
    }
  }

  /** Advance the element perturbations by dtSim sim-days via GAUSS'S
      PLANETARY EQUATIONS projected along each world's exact Kepler state.
      Integration is explicit Euler at the engine's sim-dt — the rates are
      O(m/M)·n ~ 10⁻⁸/day at real masses, thousands of times slower than the
      step, so this is exact to well below any meaningful scale. */
  step(dtSim: number, simDays: number): void {
    if (dtSim <= 0 || this.nodes.length === 0) { this.writeTelemetry(); return; }
    const acc = new Float64Array(this.nodes.length * 3);
    this.disturb(acc);

    for (let i = 0; i < this.nodes.length; i++) {
      const nd = this.nodes[i];
      if (nd.isStar) continue;

      /* radial / transverse / normal frame at the exact Kepler state */
      const rMag = Math.sqrt(nd.cx * nd.cx + nd.cy * nd.cy + nd.cz * nd.cz);
      if (rMag <= 0 || nd.a <= 0 || nd.speed === 0) continue;
      const rx = nd.cx / rMag, ry = nd.cy / rMag, rz = nd.cz / rMag;
      /* canonical velocity by numeric derivative of the exact solution */
      const d = 0.05;
      const p1 = calculateKeplerPosition(nd.a, nd.e0, nd.phase, nd.incl, simDays + d, nd.speed);
      const p0 = calculateKeplerPosition(nd.a, nd.e0, nd.phase, nd.incl, simDays - d, nd.speed);
      let vx = (p1.x - p0.x) / (2 * d), vy = (p1.y - p0.y) / (2 * d), vz = (p1.z - p0.z) / (2 * d);
      const vDotR = vx * rx + vy * ry + vz * rz;
      vx -= vDotR * rx; vy -= vDotR * ry; vz -= vDotR * rz; /* transverse part */
      const vMag = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      const tx = vx / vMag, ty = vy / vMag, tz = vz / vMag;
      /* orbit normal ĥ = r̂ × t̂ */
      const hx = ry * tz - rz * ty, hy = rz * tx - rx * tz, hz = rx * ty - ry * tx;

      const ax = acc[3 * i], ay = acc[3 * i + 1], az = acc[3 * i + 2];
      const R = ax * rx + ay * ry + az * rz;   /* radial disturbing force */
      const T = ax * tx + ay * ty + az * tz;   /* transverse */
      const N = ax * hx + ay * hy + az * hz;   /* normal */

      const e = Math.max(0, nd.e0 + nd.eP);
      const p = nd.a * (1 - e * e);
      const f = nd.trueAnomaly;
      const nMean = Math.abs(nd.speed);
      const sqrt1me2 = Math.sqrt(Math.max(1e-9, 1 - e * e));
      const eSafe = Math.max(e, 1e-3); /* the apsidal rate is 1/e-singular; a circular orbit's periapsis is undefined anyway */

      /* GAUSS'S PLANETARY EQUATIONS (Murray & Dermott, Solar System Dynamics):
         eccentricity, apsidal and nodal rates under a generic disturbing force */
      const deDt = (sqrt1me2 / (nMean * nd.a)) * (
        R * Math.sin(f) + T * (Math.cos(f) + (e + Math.cos(f)) / (1 + e * Math.cos(f)))
      );
      const dwDt = (sqrt1me2 / (nMean * nd.a * eSafe)) * (
        -R * Math.cos(f) + T * (1 + rMag / p) * Math.sin(f)
      );
      const diDt = (rMag * Math.cos(f) * N) / (nMean * nd.a * nd.a * sqrt1me2);

      const cl = (rate: number) => Math.max(-RATE_CLAMP, Math.min(RATE_CLAMP, rate));
      const de = cl(deDt) * dtSim, dw = cl(dwDt) * dtSim, di = cl(diDt) * dtSim;
      nd.eP += de;
      nd.omegaP += dw;
      nd.incP += di;

      /* THE KEEPER's fence */
      const before = `${nd.eP}|${nd.incP}`;
      nd.eP = Math.max(-E_MAX, Math.min(E_MAX, Math.max(-nd.e0, nd.eP))); /* e_total ∈ [0, E_MAX] */
      nd.incP = Math.max(-INC_MAX, Math.min(INC_MAX, nd.incP));
      nd.guarded = nd.guarded || before !== `${nd.eP}|${nd.incP}`;
    }
    this.writeTelemetry();
  }

  /** Osculating position of a body: the exact Kepler solver run on the
      perturbed elements, with the apsidal precession applied as an in-plane
      rotation (exact for the solver's node-at-+x geometry up to O(Δω·sin i),
      irrelevant at precession angles ~10⁻⁴ rad). Returns the deviation from
      the canonical position in scene units as well. */
  perturbedPosition(nd: GravityNode, simDays: number): { x: number; y: number; z: number; deviation: number } {
    const eEff = Math.max(0, Math.min(E_MAX, nd.e0 + nd.eP));
    const canon = calculateKeplerPosition(nd.a, nd.e0, nd.phase, nd.incl, simDays, nd.speed);
    const pert = calculateKeplerPosition(nd.a, eEff, nd.phase, nd.incl + nd.incP, simDays, nd.speed);
    const cw = Math.cos(nd.omegaP), sw = Math.sin(nd.omegaP);
    return {
      x: pert.x * cw - pert.z * sw,
      y: pert.y,
      z: pert.x * sw + pert.z * cw,
      deviation: Math.hypot(pert.x - canon.x, pert.y - canon.y, pert.z - canon.z),
    };
  }

  private writeTelemetry(): void {
    let maxDev = 0;
    const metersPerScene = CONSTANTS.AU / SCENE_UNITS_PER_AU;
    for (const n of this.nodes) {
      /* strongest fellow-world pull (star attraction is reported separately
         by the engine's gravitationalForceN): F = G·m₁·m₂/r² in true SI */
      let pull = 0;
      if (!n.isStar) {
        for (const b of this.nodes) {
          if (b === n || b.isStar) continue;
          const dx = b.cx - n.cx, dy = b.cy - n.cy, dz = b.cz - n.cz;
          const rMeters = Math.sqrt(dx * dx + dy * dy + dz * dz + SOFTENING_SQ) * metersPerScene;
          if (rMeters > 0) {
            const f = CONSTANTS.G * n.massKg * b.massKg / (rMeters * rMeters);
            if (f > pull) pull = f;
          }
        }
      }
      n.strongestPullN = pull;
      n.deviationAU = 0; /* filled by the engine after applying positions */
      gravityTelemetry.set(n.id, {
        deviationAU: n.deviationAU,
        dE: n.eP,
        dOmegaDeg: (n.omegaP * 180) / Math.PI,
        dIncDeg: (n.incP * 180) / Math.PI,
        strongestPullN: pull,
        guarded: n.guarded,
      });
    }
    gravityFieldStats.nodes = this.nodes.length;
    gravityFieldStats.maxDeviationAU = maxDev;
  }
}

/* --------------------- lens strength (universe surface) --------------------- */

/** Einstein-ring angle θ_E (radians) a body casts on the UNIVERSE SURFACE —
    the celestial dome and background star shells bend around it with the
    true thin-lens law α = θ_E²/θ (surfaceShaders' applyLensBend). The
    honest range problem again: the anchor star is 1.99e30 kg, a world
    ~6e24 kg — 10⁶:1 — so θ_E is log-compressed from the real mass while
    keeping the ORDERING exact (star ≫ worlds, the Vault strongest). The
    bodies themselves never bend — only the background does. */
export function lensStrengthFor(massKg: number, kind: BodyKind): number {
  const m = Math.max(1e18, massKg);
  const depth = Math.max(0, (Math.log10(m) - 21) / 10.2);
  if (kind === 'hole' || kind === 'vault') return 0.115;
  if (kind === 'star') return 0.05;
  return 0.014 + 0.022 * Math.min(1, depth);
}
