/**
 * C++ Cosmos Engine Bridge v2 — the loader chain that makes the native core
 * real, with graceful degradation at every tier:
 *
 *   1. native-cpp   Tauri desktop: C++ compiled into the shell binary,
 *                   reached through invoke() commands (src-tauri/src).
 *   2. wasm         Browser: Emscripten build in ./wasm/ (built by CI or
 *                   scripts/build-wasm.sh; absent on machines without emsdk).
 *   3. typescript   Reference implementation (src/physics/physicsEngine.ts),
 *                   always available, numerically identical by contract.
 *
 * The bridge never lies: `status.backend` reports the tier actually in use,
 * and `verifyParity()` cross-checks the active tier against the TS reference
 * so "C++ is driving" is a verified claim, not marketing.
 */

type CosmosBackend = 'native-cpp' | 'wasm' | 'typescript';

/* R98 — THE DEGRADATION LEDGER.
   Before this round every failed tier collapsed into a bare `return null`, so a
   browser with no WASM artifact and a browser whose artifact was corrupt both
   looked identical from the outside: `backend: 'typescript'`, no message, no
   error, nothing in the console. "Nothing asserts that the browser is actually
   on the WASM tier" was a TRUE and UNFALSIFIABLE statement about the old code —
   the answer was not merely unreported, it did not exist.

   The loader now names the reason it rejected each tier. The names are the
   whole point: `no-artifact` (nothing built — expected on a machine without
   emsdk) is a different fact from `instantiate-failed` (something WAS built and
   is broken — a real defect someone must fix). Degradation stays SILENT for the
   user (never an error, never a broken sky) but is now LOUD in the one place
   that is for maintainers: the console, and the console card. */
export type DegradationReason =
  /* tier 1 (native) rejections — expected everywhere except the desktop shell */
  | 'no-tauri'            /* not running inside the Tauri shell at all */
  | 'tauri-import-failed' /* __TAURI_INTERNALS__ present but the api module would not load */
  | 'native-status-failed'/* invoke('cosmos_status') threw */
  | 'native-stub-build'   /* the shell answered, but with the type-check stub — never claim native physics */
  /* tier 2 (wasm) rejections — the five paths loadWasm used to swallow */
  | 'no-artifact'         /* HEAD did not answer ok — CI never built it / public/wasm missing */
  | 'wrong-content-type'  /* an HTML SPA fallback, not JavaScript — Vite dev answered 200 for a missing path */
  | 'import-failed'       /* the JS loaded but the dynamic import threw */
  | 'no-factory'          /* neither EXPORT_ES6 default nor the global name was present */
  | 'instantiate-failed'  /* the factory ran and the module could not be built/would not expose ccall */
  | 'wasm-fetch-failed';  /* the HEAD probe itself threw (offline, blocked, CORS) */

export interface TierDegradation {
  tier: 'native-cpp' | 'wasm';
  reason: DegradationReason;
  detail: string;
}

export interface CosmosStatus {
  backend: CosmosBackend;
  version: string;
  physicsFieldCount: number;
  ready: boolean;
  /** R98 — every tier that was tried and rejected, in the order tried.
   *  Empty means the FIRST tier won (nothing was given up). */
  degraded: TierDegradation[];
  /** R98 — true only when a tier above `typescript` was tried and lost. The
   *  browser normally lands on wasm (the artifact is committed at
   *  public/wasm/); landing here means that artifact could not be fetched or
   *  instantiated, or the page predates it. The desktop shell landing here
   *  IS a defect. */
  fellBack: boolean;
}

interface KeplerBatchInput {
  a: number[];
  e: number[];
  phase: number[];
  incl: number[];
  speed: number[];
  /* R84 ascending-node elements (radians) — optional, zeros = node-at-X */
  node?: number[];
  argP?: number[];
  simDays: number;
}

interface KeplerBatchResult {
  xyz: Float64Array;      /* 3n */
  radius: Float64Array;   /* n */
  trueAnomaly: Float64Array; /* n */
}

interface PhysicsBatchInput {
  ids: string[];
  orbitA: number[];
  radius: number[];
  /** COSMOS_KIND_* encoding: 0 star, 1 planet, 2 dwarf, 3 nebula, 4 hole, 5 vault */
  kinds: number[];
  hasRings: number[];
  phase: number[];
  speed: number[];
  simTimeSec: number;
}

/* R87 — the stateful simulator tier. SI units (m/kg/s): the C++
 * NBodySimulator's own system (cosmos_engine.hpp G_CONST/AU_METERS). A body
 * crosses as a plain object; the session lives on the tier itself — the
 * Rust SIM static, a WASM handle, or the TS twin instance below. */
export interface SimBodyInput {
  id: number;
  mass: number;   /* kg */
  radius: number; /* meters (informational — gravity uses mass only) */
  px: number; py: number; pz: number;  /* meters */
  vx: number; vy: number; vz: number;  /* m/s */
}

export interface SimBodyState {
  pos: [number, number, number];
  vel: [number, number, number];
}

export interface TwinParityReceipt {
  maxDelta: number;
  steps: number;
  bodies: number;
  backend: CosmosBackend;
}

/** Field layout — must stay in lockstep with COSMOS_PHYSICS_FIELD_COUNT in
 * cosmos_engine.hpp and BodyPhysicsData in physicsEngine.ts. */
export const PHYSICS_FIELD_COUNT = 41;



type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

/** R98 — the loaders reject with a NAMED reason instead of a bare null, so the
 *  caller can record which tier died and why. `detail` is developer-facing
 *  (status line, error text) and never reaches an end user unfiltered. */
class TierRejection extends Error {
  constructor(readonly reason: DegradationReason, readonly detail: string) {
    super(`${reason}: ${detail}`);
    this.name = 'TierRejection';
  }
}

async function loadTauriInvoke(): Promise<TauriInvoke> {
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown };
  if (!w.__TAURI_INTERNALS__) {
    throw new TierRejection('no-tauri', 'no __TAURI_INTERNALS__ on window (not the desktop shell)');
  }
  try {
    const core = await import('@tauri-apps/api/core');
    return core.invoke as TauriInvoke;
  } catch (err) {
    throw new TierRejection('tauri-import-failed', err instanceof Error ? err.message : String(err));
  }
}

async function loadWasm(): Promise<WasmModule> {
  /* the WASM artifact is optional (built by CI / scripts/tools/build-wasm.sh into
     public/wasm/, served at the site root in dev and prod alike — R89 moved
     it there from the in-source folder, which the bundled dist could never
     serve). */
  /* Absolute and computed at runtime — Vite's dev transform wraps dynamic
     imports in __vite__injectQuery(spec, 'import'), whose helper passes
     through only specifiers that do NOT start with '.' or '/'; a
     root-relative path arrived as '/wasm/...?import' and the dev server
     404s public-dir files under that query. Absolute URLs sail through in
     dev and resolve identically in prod and Tauri. @vite-ignore still
     guards the build-time resolver (the artifact may not exist at build). */
  const wasmSpec = new URL('/wasm/cosmos_engine.js', window.location.origin).href;
  let probe: Response;
  try {
    probe = await fetch(wasmSpec, { method: 'HEAD' });
  } catch (err) {
    throw new TierRejection('wasm-fetch-failed', err instanceof Error ? err.message : String(err));
  }
  if (!probe.ok) {
    throw new TierRejection('no-artifact', `HEAD ${wasmSpec} → HTTP ${probe.status}`);
  }
  /* Vite's dev SPA fallback answers missing paths with 200 text/html —
     importing that would throw a loud console error for a perfectly
     normal "no artifact yet" host. The artifact is optional; only a real
     JavaScript response may be imported (the silent-fallback contract). */
  const contentType = probe.headers.get('content-type') || '(none)';
  if (!contentType.includes('javascript')) {
    throw new TierRejection('wrong-content-type', `HEAD ${wasmSpec} → content-type ${contentType}`);
  }
  /* @vite-ignore — the artifact is optional and may not exist at build time */
  let mod: Record<string, unknown>;
  try {
    mod = (await import(/* @vite-ignore */ wasmSpec)) as unknown as Record<string, unknown>;
  } catch (err) {
    throw new TierRejection('import-failed', err instanceof Error ? err.message : String(err));
  }
  /* EXPORT_ES6 gives a default export; older glue assigns the global name —
     accept both so either artifact shape loads */
  const w = window as unknown as { cosmos_engine?: unknown };
  const factory = (mod.default ?? mod.cosmos_engine ?? w.cosmos_engine) as
    | ((init?: unknown) => Promise<WasmModule>)
    | null
    | undefined;
  if (typeof factory !== 'function') {
    throw new TierRejection('no-factory', `neither default export nor global cosmos_engine on ${wasmSpec}`);
  }
  let module: WasmModule;
  try {
    module = await factory({ locateFile: (f: string) => `/wasm/${f}` });
  } catch (err) {
    throw new TierRejection('instantiate-failed', err instanceof Error ? err.message : String(err));
  }
  if (!module || typeof module.ccall !== 'function') {
    /* the glue loaded but carries no Emscripten runtime surface — a truncated or
       hand-edited artifact. Distinct from instantiate-failed: nothing threw. */
    throw new TierRejection('instantiate-failed', 'module exposed no ccall (truncated or non-Emscripten artifact)');
  }
  return module;
}

/** Minimal Emscripten module surface used by the bridge. */
interface WasmModule {
  ccall: (
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
  ) => unknown;
  _cosmos_version?: () => string;
  _malloc?: (bytes: number) => number;
  _free?: (ptr: number) => void;
  HEAPF64?: Float64Array;
}

class CosmosBridge {
  private statusValue: CosmosStatus = {
    backend: 'typescript',
    version: 'ts-1.0',
    physicsFieldCount: PHYSICS_FIELD_COUNT,
    ready: false,
    degraded: [],
    fellBack: false,
  };
  private initPromise: Promise<CosmosStatus> | null = null;
  private invokeFn: TauriInvoke | null = null;
  private wasm: WasmModule | null = null;
  /** R98 — the ledger, in the order the tiers were tried. */
  private degraded: TierDegradation[] = [];
  /* R87 sim session state — one handle on the wasm tier, one twin on TS */
  private wasmSimHandle: number | null = null;
  private wasmSimBodyCount = 0; /* R91 — roster size of the wasm session (the C++ core does not report it back) */
  private readonly tsSim = new TsNBodySim();

  /* ------------------------------ lifecycle ------------------------------ */

  /** R98 — record why a tier was given up. Never throws: degradation is not
   *  an error, it is the documented fallback contract. */
  private reject(tier: 'native-cpp' | 'wasm', err: unknown): void {
    const rejection = err instanceof TierRejection ? err : null;
    this.degraded.push({
      tier,
      reason: rejection?.reason ?? 'wasm-fetch-failed',
      detail: rejection?.detail ?? (err instanceof Error ? err.message : String(err)),
    });
  }

  /** R98 — THE ONE-TIME WARNING.
   *  This is the answer to "something that tells us this has gone wrong".
   *  Exactly one line per page load, on the console, naming the tier that was
   *  lost and why — deliberately NOT console.error, because falling back to the
   *  TS reference is the designed behaviour on a machine with no emsdk, and a
   *  red console would train the eye to ignore it. The line is quiet enough to
   *  miss in normal use and impossible to miss when you go looking, and it
   *  separates "never built here" from "built and broken". */
  private warnDegradation(): void {
    const d = this.degraded;
    if (d.length === 0) return;
    /* no-tauri is the browser's NORMAL state, not a degradation worth a line —
       a plain web tab has no reason to have the desktop shell. Log the rest. */
    const notable = d.filter((x) => x.reason !== 'no-tauri');
    if (notable.length === 0) return;
    const lines = notable.map((x) => `  · ${x.tier}: ${x.reason} — ${x.detail}`);
    console.warn(
      `[cosmos] native tier degraded → running the TypeScript reference.\n${lines.join('\n')}\n` +
      `  The sky is unaffected (the TS reference is numerically the same law); ` +
      `if this is the desktop app, run: bash scripts/tools/build-wasm.sh (or reinstall the release).`,
    );
  }

  init(): Promise<CosmosStatus> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      /* R98 — each tier now throws a NAMED TierRejection instead of returning
         null. The fall-through order and the winning conditions are unchanged;
         only the bookkeeping around the failures is new. */
      try {
        const invoke = await loadTauriInvoke();
        try {
          const res = await invoke<{ backend: string; version: string; physicsFieldCount: number }>('cosmos_status');
          if (res.version !== 'stub') {
            this.invokeFn = invoke;
            this.statusValue = { backend: 'native-cpp', version: res.version, physicsFieldCount: res.physicsFieldCount, ready: true, degraded: [...this.degraded], fellBack: false };
            return this.statusValue;
          }
          /* stub build (type-check host) — never claim native physics */
          this.reject('native-cpp', new TierRejection('native-stub-build', `cosmos_status reported version "stub"`));
        } catch (err) {
          this.reject('native-cpp', new TierRejection('native-status-failed', err instanceof Error ? err.message : String(err)));
        }
      } catch (err) {
        this.reject('native-cpp', err);
      }
      try {
        const wasm = await loadWasm();
        this.wasm = wasm;
        let version = 'wasm';
        try {
          version = wasm.ccall('cosmos_version', 'string', [], []) as string;
        } catch { /* keep default */ }
        this.statusValue = { backend: 'wasm', version, physicsFieldCount: PHYSICS_FIELD_COUNT, ready: true, degraded: [...this.degraded], fellBack: false };
        return this.statusValue;
      } catch (err) {
        this.reject('wasm', err);
      }
      this.statusValue = { backend: 'typescript', version: 'ts-reference', physicsFieldCount: PHYSICS_FIELD_COUNT, ready: true, degraded: [...this.degraded], fellBack: true };
      this.warnDegradation();
      return this.statusValue;
    })();
    return this.initPromise;
  }

  getStatus(): CosmosStatus {
    return { ...this.statusValue, degraded: this.statusValue.degraded.map((d) => ({ ...d })) };
  }

  /* -------------------------------- kernels ------------------------------ */

  async keplerBatch(input: KeplerBatchInput): Promise<KeplerBatchResult> {
    await this.init();
    const n = input.a.length;
    if (this.statusValue.backend === 'native-cpp' && this.invokeFn) {
      const res = await this.invokeFn<{ xyz: number[]; radius: number[]; trueAnomaly: number[] }>('cosmos_kepler_batch', {
        args: {
          a: input.a,
          eccentricity: input.e,
          phase: input.phase,
          inclination: input.incl,
          speed: input.speed,
          simDays: input.simDays,
          node: input.node ?? [],
          argPeri: input.argP ?? [],
        },
      });
      return {
        xyz: Float64Array.from(res.xyz),
        radius: Float64Array.from(res.radius),
        trueAnomaly: Float64Array.from(res.trueAnomaly),
      };
    }
    if (this.statusValue.backend === 'wasm' && this.wasm) {
      const w = this.wasm;
      const malloc = (arr: number[]) => {
        const ptr = w._malloc!(arr.length * 8);
        w.HEAPF64!.set(arr, ptr / 8);
        return ptr;
      };
      const pa = malloc(input.a), pe = malloc(input.e), pp = malloc(input.phase);
      const pi = malloc(input.incl), ps = malloc(input.speed);
      const pn = malloc(input.node ?? []), pw = malloc(input.argP ?? []);
      const po = w._malloc!(n * 3 * 8), pr = w._malloc!(n * 8), pt = w._malloc!(n * 8);
      try {
        w.ccall('cosmos_kepler_batch', null, ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
          [pa, pe, pp, pi, ps, n, input.simDays, pn, pw, po, pr, pt]);
        const xyz = new Float64Array(n * 3);
        xyz.set(w.HEAPF64!.subarray(po / 8, po / 8 + n * 3));
        const radius = new Float64Array(n);
        radius.set(w.HEAPF64!.subarray(pr / 8, pr / 8 + n));
        const trueAnomaly = new Float64Array(n);
        trueAnomaly.set(w.HEAPF64!.subarray(pt / 8, pt / 8 + n));
        return { xyz, radius, trueAnomaly };
      } finally {
        w._free!(pa); w._free!(pe); w._free!(pp); w._free!(pi); w._free!(ps);
        w._free!(pn); w._free!(pw);
        w._free!(po); w._free!(pr); w._free!(pt);
      }
    }
    /* TypeScript reference tier */
    return this.keplerBatchTS(input);
  }

  /**
   * The 41-field per-body physics port, one body per PHYSICS_FIELD_COUNT slot.
   *
   * R98 — READ THIS BEFORE CALLING IT FROM PRODUCTION.
   *
   * This is the ONLY consumer of the C++ BODY PROFILE TABLE (the per-body
   * eccentricity / density / albedo / axial-tilt law), and therefore the only
   * path that can observe that table's numbers. The law that governs it:
   *
   *  THE ARTIFACT AND THE SOURCE MUST AGREE WHILE THIS METHOD IS REACHABLE.
   *  R98 found the committed public/wasm/cosmos_engine.wasm carrying pre-fix
   *  physics (goliath 0.0489, no tiltDeg) while the source had moved on, and
   *  refused to wire this method rather than ship per-tier divergence. R99
   *  rebuilt the artifact — the author's emsdk lives at ~/Desktop/emsdk,
   *  off the PATH, which is how R98 missed it (build-wasm.sh now activates
   *  it itself) — and the round98 physics gauntlet checks the binary's
   *  BYTES, not mtimes: a stale artifact is a WARN while nothing calls this
   *  method and a hard FAIL the moment one does. `npm run wasm:build` after
   *  EVERY cosmos_engine.cpp edit — editing C++ changes nothing for the web
   *  tier until then (PROJECT-BRAIN trap 11).
   *
   * The desktop tier compiles cosmos_engine.cpp directly and is always as
   * fresh as the source.
   */
  async physicsBatch(input: PhysicsBatchInput): Promise<Float64Array> {
    await this.init();
    const n = input.ids.length;
    if (this.statusValue.backend === 'native-cpp' && this.invokeFn) {
      const res = await this.invokeFn<{ fields: number[]; fieldCount: number }>('cosmos_physics_batch', {
        args: {
          ids: input.ids,
          orbitA: input.orbitA,
          radius: input.radius,
          kinds: input.kinds,
          hasRings: input.hasRings,
          phase: input.phase,
          speed: input.speed,
          simTimeSec: input.simTimeSec,
        },
      });
      return Float64Array.from(res.fields);
    }
    if (this.statusValue.backend === 'wasm' && this.wasm) {
      const w = this.wasm;
      const enc = new TextEncoder();
      const idsPtrs: number[] = [];
      const idBufs: number[] = [];
      for (const id of input.ids) {
        const bytes = enc.encode(id + '\0');
        const ptr = w._malloc!(bytes.length);
        const heapU8 = new Uint8Array(w.HEAPF64!.buffer);
        heapU8.set(bytes, ptr);
        idBufs.push(ptr);
        idsPtrs.push(ptr);
      }
      const idsArrPtr = w._malloc!(idsPtrs.length * 4);
      const heapU32 = new Uint32Array(w.HEAPF64!.buffer);
      idsPtrs.forEach((p, i) => { heapU32[idsArrPtr / 4 + i] = p; });
      const pa = this.wasmMallocF64(w, input.orbitA);
      const pr = this.wasmMallocF64(w, input.radius);
      const pk = this.wasmMallocF64(w, input.kinds as unknown as number[]);
      const ph = this.wasmMallocF64(w, input.hasRings as unknown as number[]);
      const pp = this.wasmMallocF64(w, input.phase);
      const pv = this.wasmMallocF64(w, input.speed);
      const po = w._malloc!(n * PHYSICS_FIELD_COUNT * 8);
      try {
        w.ccall('cosmos_physics_batch', null, ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
          [idsArrPtr, pa, pr, pk, ph, pp, pv, n, input.simTimeSec, po]);
        const out = new Float64Array(n * PHYSICS_FIELD_COUNT);
        out.set(w.HEAPF64!.subarray(po / 8, po / 8 + n * PHYSICS_FIELD_COUNT));
        return out;
      } finally {
        [pa, pr, pk, ph, pp, pv, po].forEach((p) => w._free!(p));
        idBufs.forEach((p) => w._free!(p));
        w._free!(idsArrPtr);
      }
    }
    return this.physicsBatchTS(input);
  }

  private wasmMallocF64(w: WasmModule, arr: number[]): number {
    const ptr = w._malloc!(arr.length * 8);
    w.HEAPF64!.set(arr, ptr / 8);
    return ptr;
  }

  async benchmark(nBodies: number, iterations: number): Promise<{ opsPerSec: number; backend: CosmosBackend }> {
    await this.init();
    if (this.statusValue.backend === 'native-cpp' && this.invokeFn) {
      const ops = await this.invokeFn<number>('cosmos_benchmark', { nBodies, iterations });
      return { opsPerSec: ops, backend: 'native-cpp' };
    }
    /* TS tier benchmark (also used by wasm until the kernel is exposed) */
    const t0 = performance.now();
    this.tsRk4Burn(nBodies, iterations);
    const seconds = Math.max(0.0001, (performance.now() - t0) / 1000);
    return { opsPerSec: (nBodies * nBodies * iterations) / seconds, backend: this.statusValue.backend };
  }

  /* ------------------------ stateful simulator session ------------------- */
  /* R87 — the cosmos_sim_* commands finally get their frontend voice. The
     session lives on the tier (Rust SIM static / WASM handle / TS twin);
     configure always resets for a clean deterministic run — the same
     contract as cosmos_sim_configure in lib.rs. Button-driven consumers
     only: nothing in the frame loop touches this session. */

  async simConfigure(bodies: SimBodyInput[]): Promise<{ configured: number; backend: CosmosBackend }> {
    await this.init();
    if (this.statusValue.backend === 'native-cpp' && this.invokeFn) {
      /* signature trap: cosmos_sim_configure takes the bodies array
         directly (Vec<serde_json::Value>) — NO args envelope, and a wrong
         field name would silently become 0.0 via as_f64().unwrap_or(0.0). */
      const res = await this.invokeFn<{ configured: number }>('cosmos_sim_configure', { bodies });
      return { configured: res.configured, backend: 'native-cpp' };
    }
    if (this.statusValue.backend === 'wasm' && this.wasm) {
      const w = this.wasm;
      if (this.wasmSimHandle !== null) {
        w.ccall('cosmos_destroy_simulator', null, ['number'], [this.wasmSimHandle]);
        this.wasmSimHandle = null;
        this.wasmSimBodyCount = 0;
      }
      const handle = w.ccall('cosmos_create_simulator', 'number', [], []) as number;
      if (!handle) throw new Error('simulator unavailable in this build');
      for (const b of bodies) {
        w.ccall('cosmos_add_body', null,
          ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
          [handle, b.id >>> 0, b.mass, b.radius, b.px, b.py, b.pz, b.vx, b.vy, b.vz]);
      }
      this.wasmSimHandle = handle;
      this.wasmSimBodyCount = bodies.length;
      return { configured: bodies.length, backend: 'wasm' };
    }
    return { configured: this.tsSim.configure(bodies), backend: 'typescript' };
  }

  async simStep(dt: number, iterations: number): Promise<{ stepped: number; dt: number; backend: CosmosBackend }> {
    await this.init();
    /* mirror the Rust clamp (lib.rs: iterations.clamp(1, 1000)) */
    const iters = Math.max(1, Math.min(1000, Math.floor(iterations)));
    if (this.statusValue.backend === 'native-cpp' && this.invokeFn) {
      const res = await this.invokeFn<{ stepped: number; dt: number }>('cosmos_sim_step', { dt, iterations: iters });
      return { stepped: res.stepped, dt: res.dt, backend: 'native-cpp' };
    }
    if (this.statusValue.backend === 'wasm' && this.wasm && this.wasmSimHandle !== null) {
      this.wasm.ccall('cosmos_step_simulation', null, ['number', 'number', 'number'], [this.wasmSimHandle, dt, iters]);
      return { stepped: iters, dt, backend: 'wasm' };
    }
    if (this.tsSim.bodyCount === 0) throw new Error('no simulator session — call simConfigure first');
    this.tsSim.step(dt, iters);
    return { stepped: iters, dt, backend: 'typescript' };
  }

  async simBody(index: number): Promise<SimBodyState & { backend: CosmosBackend }> {
    await this.init();
    if (this.statusValue.backend === 'native-cpp' && this.invokeFn) {
      const res = await this.invokeFn<{ pos: number[]; vel: number[] }>('cosmos_sim_body', { index });
      return { pos: [res.pos[0], res.pos[1], res.pos[2]], vel: [res.vel[0], res.vel[1], res.vel[2]], backend: 'native-cpp' };
    }
    if (this.statusValue.backend === 'wasm' && this.wasm && this.wasmSimHandle !== null) {
      const w = this.wasm;
      const pp = w._malloc!(3 * 8);
      const pv = w._malloc!(3 * 8);
      try {
        w.ccall('cosmos_get_body_state', null, ['number', 'number', 'number'], [this.wasmSimHandle, index, pp, pv]);
        const pos = Array.from(w.HEAPF64!.subarray(pp / 8, pp / 8 + 3)) as [number, number, number];
        const vel = Array.from(w.HEAPF64!.subarray(pv / 8, pv / 8 + 3)) as [number, number, number];
        return { pos, vel, backend: 'wasm' };
      } finally {
        w._free!(pp);
        w._free!(pv);
      }
    }
    const st = this.tsSim.bodyState(index);
    if (!st) throw new Error(`sim body index out of range: ${index}`);
    return { ...st, backend: 'typescript' };
  }

  /* R91 — batched session read: EVERY body's pos+vel in one call (the
     wide eye the driver needs; reading 10–50 bodies must never cost one
     round-trip each). An empty session is a valid answer, not an error:
     { count: 0, states: [] } — the driver's freshness law decides what
     to do with it, the bridge never throws for "nothing configured". */
  async simStates(): Promise<{ count: number; states: SimBodyState[]; backend: CosmosBackend }> {
    await this.init();
    if (this.statusValue.backend === 'native-cpp' && this.invokeFn) {
      const res = await this.invokeFn<{ count: number; states: number[] }>('cosmos_sim_states');
      const states: SimBodyState[] = [];
      for (let i = 0; i < res.count; i++) {
        const row = res.states;
        states.push({
          pos: [row[i * 6], row[i * 6 + 1], row[i * 6 + 2]],
          vel: [row[i * 6 + 3], row[i * 6 + 4], row[i * 6 + 5]],
        });
      }
      return { count: res.count, states, backend: 'native-cpp' };
    }
    if (this.statusValue.backend === 'wasm' && this.wasm) {
      const w = this.wasm;
      if (this.wasmSimHandle === null || this.wasmSimBodyCount === 0) {
        return { count: 0, states: [], backend: 'wasm' };
      }
      const n = this.wasmSimBodyCount;
      const buf = w._malloc!(n * 6 * 8);
      try {
        const written = w.ccall('cosmos_get_body_states', 'number',
          ['number', 'number', 'number'], [this.wasmSimHandle, n, buf]) as number;
        const count = Math.min(written, n);
        const heap = w.HEAPF64!;
        const base = buf / 8;
        const states: SimBodyState[] = [];
        for (let i = 0; i < count; i++) {
          states.push({
            pos: [heap[base + i * 6], heap[base + i * 6 + 1], heap[base + i * 6 + 2]],
            vel: [heap[base + i * 6 + 3], heap[base + i * 6 + 4], heap[base + i * 6 + 5]],
          });
        }
        return { count, states, backend: 'wasm' };
      } finally {
        w._free!(buf);
      }
    }
    return { count: this.tsSim.bodyCount, states: this.tsSim.allStates(), backend: 'typescript' };
  }

  /**
   * R87 — the simulator twin receipt: configure a fixed seeded system on
   * the active tier, step it, read every body back, and compare against
   * the TS twin running the identical run. Relative-scaled delta like
   * verifyParity — both compilers run -ffast-math, so the contract is
   * agreement to tolerance, never bit-exactness. On the typescript tier
   * the twin IS the reference, so the receipt reports the trivial 0.
   */
  async verifyTwinParity(steps = 120, dt = 86400): Promise<TwinParityReceipt> {
    await this.init();
    const bodies = seededSimSystem();
    const active = await this.simConfigure(bodies);
    await this.simStep(dt, steps);
    const states: SimBodyState[] = [];
    for (let i = 0; i < bodies.length; i++) {
      const s = await this.simBody(i);
      states.push({ pos: s.pos, vel: s.vel });
    }
    if (active.backend === 'typescript') {
      return { maxDelta: 0, steps, bodies: bodies.length, backend: 'typescript' };
    }
    const reference = new TsNBodySim();
    reference.configure(bodies);
    reference.step(dt, steps);
    let maxDelta = 0;
    for (let i = 0; i < bodies.length; i++) {
      const ref = reference.bodyState(i)!;
      for (let k = 0; k < 3; k++) {
        maxDelta = Math.max(maxDelta, Math.abs(states[i].pos[k] - ref.pos[k]) / Math.max(1, Math.abs(ref.pos[k])));
        maxDelta = Math.max(maxDelta, Math.abs(states[i].vel[k] - ref.vel[k]) / Math.max(1, Math.abs(ref.vel[k])));
      }
    }
    return { maxDelta, steps, bodies: bodies.length, backend: active.backend };
  }

  /* ------------------------- TS reference implementations ---------------- */

  private tsRk4Burn(n: number, iterations: number): void {
    const G = 6.6743e-11;
    const softening = 1e4;
    const px = new Float64Array(n); const py = new Float64Array(n); const pz = new Float64Array(n);
    const vx = new Float64Array(n); const vy = new Float64Array(n); const vz = new Float64Array(n);
    const mass = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      px[i] = (Math.random() - 0.5) * 1e11;
      py[i] = (Math.random() - 0.5) * 1e11;
      pz[i] = (Math.random() - 0.5) * 1e10;
      mass[i] = 1e24 + Math.random() * 1e30;
    }
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < n; i++) {
        let ax = 0, ay = 0, az = 0;
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const dx = px[j] - px[i], dy = py[j] - py[i], dz = pz[j] - pz[i];
          const distSq = dx * dx + dy * dy + dz * dz + softening;
          const dist = Math.sqrt(distSq);
          const f = (G * mass[j]) / (distSq * dist);
          ax += dx * f; ay += dy * f; az += dz * f;
        }
        vx[i] += ax * 0.01; vy[i] += ay * 0.01; vz[i] += az * 0.01;
        px[i] += vx[i] * 0.01; py[i] += vy[i] * 0.01; pz[i] += vz[i] * 0.01;
      }
    }
  }

  private keplerBatchTS(input: KeplerBatchInput): KeplerBatchResult {
    /* lazy import avoided: physicsEngine is a tiny pure module */
    const n = input.a.length;
    const xyz = new Float64Array(n * 3);
    const radius = new Float64Array(n);
    const trueAnomaly = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const r = keplerPositionTS(input.a[i], input.e[i], input.phase[i], input.incl[i], input.simDays, input.speed[i], input.node?.[i] ?? 0, input.argP?.[i] ?? 0);
      xyz[3 * i] = r.x; xyz[3 * i + 1] = r.y; xyz[3 * i + 2] = r.z;
      radius[i] = r.currentRadius;
      trueAnomaly[i] = r.trueAnomaly;
    }
    return { xyz, radius, trueAnomaly };
  }

  private physicsBatchTS(input: PhysicsBatchInput): Float64Array {
    const n = input.ids.length;
    const out = new Float64Array(n * PHYSICS_FIELD_COUNT);
    for (let i = 0; i < n; i++) {
      const body = {
        id: input.ids[i],
        kind: kindFromCode(input.kinds[i]),
        radius: input.radius[i],
        orbit: { a: input.orbitA[i], speed: input.speed[i], phase: input.phase[i], incl: 0 },
        rings: input.hasRings[i] === 1,
      } as unknown as Parameters<typeof calculatePhysicsTS>[0];
      const d = calculatePhysicsTS(body, input.simTimeSec);
      const o = i * PHYSICS_FIELD_COUNT;
      out[o + 0] = d.a_AU;
      out[o + 1] = d.eccentricity;
      out[o + 2] = d.periodDays;
      out[o + 3] = d.periodYears;
      out[o + 4] = d.periapsisAU;
      out[o + 5] = d.apoapsisAU;
      out[o + 6] = d.currentDistanceAU;
      out[o + 7] = d.currentVelocityKms;
      out[o + 8] = d.meanVelocityKms;
      out[o + 9] = d.radiusKm;
      out[o + 10] = d.radiusEarth;
      out[o + 11] = d.densityGcm3;
      out[o + 12] = d.massKg;
      out[o + 13] = d.massEarth;
      out[o + 14] = d.surfaceGravityMs2;
      out[o + 15] = d.surfaceGravityRelative;
      out[o + 16] = d.escapeVelocityKms;
      out[o + 17] = d.gravitationalForceN;
      out[o + 18] = d.gravitationalPotentialJ;
      out[o + 19] = d.orbitalFieldMs2;
      out[o + 20] = d.centripetalForceN;
      out[o + 21] = d.stellarFluxWm2;
      out[o + 22] = d.solarFluxRelative;
      out[o + 23] = d.albedo;
      out[o + 24] = d.eqTempKelvin;
      out[o + 25] = d.eqTempCelsius;
      out[o + 26] = d.habitableStatus === 'Goldilocks (Habitable)' ? 1 : d.habitableStatus === 'Too Hot' ? 2 : 0;
      out[o + 27] = d.rocheLimitKm;
      out[o + 28] = d.ringsInsideRoche ? 1 : 0;
      out[o + 29] = d.isRelativistic ? 1 : 0;
      out[o + 30] = d.schwarzschildRadiusKm ?? NaN;
      out[o + 31] = d.photonSphereKm ?? NaN;
      out[o + 32] = d.iscoKm ?? NaN;
      out[o + 33] = d.timeDilationFactor ?? NaN;
      out[o + 34] = d.axialRotationPeriodDays;
      out[o + 35] = d.axialSpinVelocityKms;
      out[o + 36] = d.axialTiltDeg;
      out[o + 37] = d.galacticRadiusKpc;
      out[o + 38] = d.galacticVelocityKms;
      out[o + 39] = d.galacticYearMillionYrs;
      out[o + 40] = d.supermassiveBlackHoleMassSun;
    }
    return out;
  }

  /**
   * Cross-check the active tier against the TS reference over a synthetic
   * batch. Returns the max absolute delta — the receipt that "C++ is
   * driving" matches the reference math.
   */
  async verifyParity(n = 12, simTimeSec = 4321.5): Promise<{ maxDelta: number; backend: CosmosBackend }> {
    await this.init();
    const input: PhysicsBatchInput = {
      ids: ['aurelia', 'rust', 'goliath', 'veil', 'cinder', 'mirror', 'hollow', 'wisp', 'eventide', 'anchor', 'unknown-world', 'deep-haven'],
      orbitA: [52, 79, 180, 38, 30, 264, 344, 0, 96, 0, 120, 61],
      radius: [2.05, 1.4, 6.2, 1.9, 0.9, 2.6, 1.1, 5.0, 3.1, 6.5, 2.4, 2.0],
      kinds: [1, 1, 1, 1, 1, 1, 1, 3, 4, 0, 2, 1],
      hasRings: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      phase: [1.2, 2.8, 0.4, 3.3, 5.1, 1.9, 4.4, 0, 2.2, 0, 0.7, 3.9],
      speed: [0.0172, 0.0077, 0.0021, 0.0131, 0.0199, 0.0029, 0.0018, 0, 0, 0, 0.0044, 0.0124],
      simTimeSec,
    };
    const native = await this.physicsBatch(input);
    const reference = this.physicsBatchTS(input);
    let maxDelta = 0;
    for (let i = 0; i < native.length; i++) {
      const a = native[i];
      const b = reference[i];
      if (Number.isNaN(a) && Number.isNaN(b)) continue;
      const d = Math.abs(a - b);
      /* relative-ish scale: huge SI magnitudes need a proportional tolerance */
      const scale = Math.max(1, Math.abs(b));
      maxDelta = Math.max(maxDelta, d / scale);
    }
    return { maxDelta, backend: this.statusValue.backend };
  }
}

/* Local copies of the TS reference math (imports would create a cycle from
   physicsEngine's side; these mirror calculateKeplerPosition/calculatePhysics
   and are guarded by verifyParity against the C++ port). */
import { calculatePhysics as calculatePhysicsTS } from '../../physics/physicsEngine';

function kindFromCode(code: number): string {
  switch (code) {
    case 0: return 'star';
    case 2: return 'dwarf';
    case 3: return 'nebula';
    case 4: return 'hole';
    case 5: return 'vault';
    default: return 'planet';
  }
}

function keplerPositionTS(
  a: number, eccentricity: number, phase: number, inclination: number,
  simDays: number, speed: number, node = 0, argP = 0,
): { x: number; y: number; z: number; trueAnomaly: number; currentRadius: number } {
  const e = Math.min(0.85, Math.max(0, eccentricity));
  const M = (phase + simDays * speed) % (2 * Math.PI);
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  const trueAnomaly = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const currentRadius = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));
  /* true-3D inclined plane — mirrors physicsEngine.calculateKeplerPosition:
     ω in-plane, i about the node line, Ω to the node's azimuth (+X toward +Z) */
  const x0 = Math.cos(trueAnomaly) * currentRadius;
  const z0 = Math.sin(trueAnomaly) * currentRadius;
  const x1 = x0 * Math.cos(argP) - z0 * Math.sin(argP);
  const z1 = x0 * Math.sin(argP) + z0 * Math.cos(argP);
  const y = z1 * Math.sin(inclination);
  const z1t = z1 * Math.cos(inclination);
  return {
    x: x1 * Math.cos(node) - z1t * Math.sin(node),
    y,
    z: x1 * Math.sin(node) + z1t * Math.cos(node),
    trueAnomaly,
    currentRadius,
  };
}

/* R87 — the TS reference tier of the stateful simulator: a line-faithful
   port of NBodySimulator (cosmos_engine.cpp computeAccelerations + stepRK4).
   SI units (m/kg/s); mutual Newtonian gravity over all pairs with the same
   softening; the same 4-stage RK4 with the same stage composition.
   NOT Living Gravity (scene units, element perturbations — a different job):
   this exists so the native simulator can be verified anywhere, on any tier.
   Constants must mirror cosmos_engine.hpp (G_CONST, SOLAR_MASS, AU_METERS). */
class TsNBodySim {
  private static readonly G = 6.67430e-11;           /* m^3 kg^-1 s^-2 */
  /* R95 — 1e12 m² (ε = 1000 km, a planetary scale), mirrored from
     cosmos_engine.cpp in lockstep (the old 1e4 let encounters sling
     bodies out of the session). */
  private static readonly SOFTENING = 1e12;          /* m^2 */
  private px: number[] = []; private py: number[] = []; private pz: number[] = [];
  private vx: number[] = []; private vy: number[] = []; private vz: number[] = [];
  private mass: number[] = [];

  get bodyCount(): number {
    return this.mass.length;
  }

  configure(bodies: SimBodyInput[]): number {
    /* destroy + recreate semantics: a fresh, deterministic session */
    this.px = bodies.map((b) => b.px);
    this.py = bodies.map((b) => b.py);
    this.pz = bodies.map((b) => b.pz);
    this.vx = bodies.map((b) => b.vx);
    this.vy = bodies.map((b) => b.vy);
    this.vz = bodies.map((b) => b.vz);
    this.mass = bodies.map((b) => b.mass);
    return bodies.length;
  }

  /* computeAccelerations — pairwise i<j pass, Newton's third law, exactly
     as the C++ static of the same name (softening inside distSq). */
  private accelerations(ax: number[], ay: number[], az: number[]): void {
    const n = this.mass.length;
    for (let i = 0; i < n; ++i) { ax[i] = 0; ay[i] = 0; az[i] = 0; }
    for (let i = 0; i < n; ++i) {
      for (let j = i + 1; j < n; ++j) {
        const dx = this.px[j] - this.px[i];
        const dy = this.py[j] - this.py[i];
        const dz = this.pz[j] - this.pz[i];
        const distSq = dx * dx + dy * dy + dz * dz + TsNBodySim.SOFTENING;
        const dist = Math.sqrt(distSq);
        const invDistCube = 1.0 / (distSq * dist);
        const fi = TsNBodySim.G * this.mass[j] * invDistCube;
        const fj = TsNBodySim.G * this.mass[i] * invDistCube;
        ax[i] += dx * fi; ay[i] += dy * fi; az[i] += dz * fi;
        ax[j] -= dx * fj; ay[j] -= dy * fj; az[j] -= dz * fj;
      }
    }
  }

  /* stepRK4 — the same 4-stage composition: pos_k derives from the previous
     stage's velocities, vel_k from the previous stage's accelerations, and
     the combination weights both by dt/6 (1, 2, 2, 1). */
  step(dt: number, iterations: number): void {
    const n = this.mass.length;
    if (n === 0) return;
    for (let it = 0; it < iterations; ++it) {
      const px0 = this.px.slice(), py0 = this.py.slice(), pz0 = this.pz.slice();
      const vx0 = this.vx.slice(), vy0 = this.vy.slice(), vz0 = this.vz.slice();
      const ax0 = new Array<number>(n).fill(0), ay0 = new Array<number>(n).fill(0), az0 = new Array<number>(n).fill(0);
      const ax1 = new Array<number>(n).fill(0), ay1 = new Array<number>(n).fill(0), az1 = new Array<number>(n).fill(0);
      const ax2 = new Array<number>(n).fill(0), ay2 = new Array<number>(n).fill(0), az2 = new Array<number>(n).fill(0);
      const ax3 = new Array<number>(n).fill(0), ay3 = new Array<number>(n).fill(0), az3 = new Array<number>(n).fill(0);
      const px1 = new Array<number>(n), py1 = new Array<number>(n), pz1 = new Array<number>(n);
      const vx1 = new Array<number>(n), vy1 = new Array<number>(n), vz1 = new Array<number>(n);
      const px2 = new Array<number>(n), py2 = new Array<number>(n), pz2 = new Array<number>(n);
      const vx2 = new Array<number>(n), vy2 = new Array<number>(n), vz2 = new Array<number>(n);
      const px3 = new Array<number>(n), py3 = new Array<number>(n), pz3 = new Array<number>(n);
      const vx3 = new Array<number>(n), vy3 = new Array<number>(n), vz3 = new Array<number>(n);

      this.accelerations(ax0, ay0, az0);

      for (let i = 0; i < n; ++i) {
        px1[i] = px0[i] + vx0[i] * (0.5 * dt);
        py1[i] = py0[i] + vy0[i] * (0.5 * dt);
        pz1[i] = pz0[i] + vz0[i] * (0.5 * dt);
        vx1[i] = vx0[i] + ax0[i] * (0.5 * dt);
        vy1[i] = vy0[i] + ay0[i] * (0.5 * dt);
        vz1[i] = vz0[i] + az0[i] * (0.5 * dt);
      }
      this.px = px1.slice(); this.py = py1.slice(); this.pz = pz1.slice();
      this.accelerations(ax1, ay1, az1);
      this.px = px0.slice(); this.py = py0.slice(); this.pz = pz0.slice();

      for (let i = 0; i < n; ++i) {
        px2[i] = px0[i] + vx1[i] * (0.5 * dt);
        py2[i] = py0[i] + vy1[i] * (0.5 * dt);
        pz2[i] = pz0[i] + vz1[i] * (0.5 * dt);
        vx2[i] = vx0[i] + ax1[i] * (0.5 * dt);
        vy2[i] = vy0[i] + ay1[i] * (0.5 * dt);
        vz2[i] = vz0[i] + az1[i] * (0.5 * dt);
      }
      this.px = px2.slice(); this.py = py2.slice(); this.pz = pz2.slice();
      this.accelerations(ax2, ay2, az2);
      this.px = px0.slice(); this.py = py0.slice(); this.pz = pz0.slice();

      for (let i = 0; i < n; ++i) {
        px3[i] = px0[i] + vx2[i] * dt;
        py3[i] = py0[i] + vy2[i] * dt;
        pz3[i] = pz0[i] + vz2[i] * dt;
        vx3[i] = vx0[i] + ax2[i] * dt;
        vy3[i] = vy0[i] + ay2[i] * dt;
        vz3[i] = vz0[i] + az2[i] * dt;
      }
      this.px = px3.slice(); this.py = py3.slice(); this.pz = pz3.slice();
      this.accelerations(ax3, ay3, az3);
      this.px = px0.slice(); this.py = py0.slice(); this.pz = pz0.slice();

      for (let i = 0; i < n; ++i) {
        this.px[i] += (vx0[i] + vx1[i] * 2.0 + vx2[i] * 2.0 + vx3[i]) * (dt / 6.0);
        this.py[i] += (vy0[i] + vy1[i] * 2.0 + vy2[i] * 2.0 + vy3[i]) * (dt / 6.0);
        this.pz[i] += (vz0[i] + vz1[i] * 2.0 + vz2[i] * 2.0 + vz3[i]) * (dt / 6.0);
        this.vx[i] += (ax0[i] + ax1[i] * 2.0 + ax2[i] * 2.0 + ax3[i]) * (dt / 6.0);
        this.vy[i] += (ay0[i] + ay1[i] * 2.0 + ay2[i] * 2.0 + ay3[i]) * (dt / 6.0);
        this.vz[i] += (az0[i] + az1[i] * 2.0 + az2[i] * 2.0 + az3[i]) * (dt / 6.0);
      }
    }
  }

  bodyState(index: number): SimBodyState | null {
    if (index < 0 || index >= this.mass.length) return null;
    return {
      pos: [this.px[index], this.py[index], this.pz[index]],
      vel: [this.vx[index], this.vy[index], this.vz[index]],
    };
  }

  /* R91 — batched read: every body in one allocation pass (the driver's
     per-readback fetch; mirrors cosmos_get_body_states). */
  allStates(): SimBodyState[] {
    const n = this.mass.length;
    const out: SimBodyState[] = new Array(n);
    for (let i = 0; i < n; ++i) {
      out[i] = {
        pos: [this.px[i], this.py[i], this.pz[i]],
        vel: [this.vx[i], this.vy[i], this.vz[i]],
      };
    }
    return out;
  }
}

/** R87 — deterministic seeded system for twin parity: the same bodies on
 * every tier, every call. A 1 M☉ star at the origin and five planets on
 * near-circular AU-scale orbits with exact circular velocities (SI). */
function seededSimSystem(): SimBodyInput[] {
  let seed = 0x5f3759df >>> 0;
  const rnd = (): number => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    seed >>>= 0;
    return seed / 0xffffffff;
  };
  const G = 6.67430e-11;
  const M_SUN = 1.98847e30;
  const AU = 1.495978707e11;
  const bodies: SimBodyInput[] = [
    { id: 0, mass: M_SUN, radius: 6.9634e8, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0 },
  ];
  for (let i = 1; i <= 5; i++) {
    const r = AU * (0.7 + 0.6 * i) * (0.95 + 0.1 * rnd());
    const v = Math.sqrt((G * M_SUN) / r);
    const theta = rnd() * Math.PI * 2;
    bodies.push({
      id: i,
      mass: (0.3 + 3 * rnd()) * 5.972e24,
      radius: 6.371e6,
      px: r * Math.cos(theta), py: 0, pz: r * Math.sin(theta),
      vx: -v * Math.sin(theta), vy: 0, vz: v * Math.cos(theta),
    });
  }
  return bodies;
}

export const cosmosBridge = new CosmosBridge();
