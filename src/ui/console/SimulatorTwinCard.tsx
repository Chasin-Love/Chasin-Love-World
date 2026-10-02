import React, { useEffect, useState } from 'react';
import { Orbit, Play, Square, BadgeCheck, BadgeX, Activity, Globe } from 'lucide-react';
import { cosmosBridge, type CosmosStatus, type TwinParityReceipt } from '../../platform/native/cpp_bridge';
import { simTwinState, simTwinTelemetry } from '../../physics/simTwin';
import { driverState, driverTelemetry } from '../../physics/sessionDriver';
import { actions, useUniverse } from '../../state';
import { toast } from '../../ui/toast';

const BACKEND_LABEL: Record<string, { text: string; cls: string }> = {
  'native-cpp': { text: 'NATIVE C++ SESSION', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
  wasm: { text: 'WASM SESSION', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' },
  typescript: { text: 'TS TWIN (SELF-CHECK)', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
};

/* The engine seam (the same one smoke.ts consumes) — the card never holds
   the engine instance, it reaches the gate through the boot contract. */
function engineHasSimTwin(): boolean {
  const eng = (window as unknown as { __ENGINE__?: { setSimTwin?: (on: boolean) => void } | null }).__ENGINE__;
  return typeof eng?.setSimTwin === 'function';
}

/* R87/R88 — the stateful N-body simulator's public face. The C++ core has
   hosted a real RK4 N-body session (cosmos_sim_configure/step/body) since
   its first build; this card is its verification surface. R88 adds the
   per-frame twin: a toggle that runs the session alongside the live
   universe on its own clock, measuring N-body drift from the Kepler canon.
   Read-only against the rendered sky — the hybrid ruling holds. */
export const SimulatorTwinCard: React.FC = () => {
  const [status, setStatus] = useState<CosmosStatus>(() => cosmosBridge.getStatus());
  const [receipt, setReceipt] = useState<TwinParityReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [twinOn, setTwinOn] = useState(() => simTwinState.enabled);
  const [tick, setTick] = useState(0);
  const universe = useUniverse();
  /* R94 — THE FLIP: absent flag = ON (the decree's default; the console
     switch restores the clockwork on demand) */
  const driverOn = universe.universeDriver !== false;

  useEffect(() => {
    let alive = true;
    cosmosBridge.init().then((s) => {
      if (alive) setStatus({ ...s });
    }).catch(() => { /* ignore init failure */ });
    return () => { alive = false; };
  }, []);

  /* live readout — 1 Hz module-map poll (the PhysicsHUD pattern:
     high-frequency data never rides the UI store's notify/persist cycle).
     R92: the poll also keeps twinOn honest — the engine force-stops the
     twin lab when the driver takes the session, and the switch must show it. */
  useEffect(() => {
    if (!twinOn && !driverOn) return;
    const iv = window.setInterval(() => {
      setTwinOn(simTwinState.enabled);
      setTick((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(iv);
  }, [twinOn, driverOn]);

  const runTwin = async () => {
    setBusy(true);
    try {
      const res = await cosmosBridge.verifyTwinParity();
      setReceipt(res);
      const ok = res.maxDelta < 1e-9 || res.backend === 'typescript';
      toast(ok
        ? `✦ Simulator twin verified — ${res.bodies} bodies, ${res.steps} steps, max relative Δ ${res.maxDelta.toExponential(1)}`
        : `⚠ Simulator twin drift ${res.maxDelta.toExponential(1)} vs TS twin`);
    } catch (err) {
      toast(`⚠ Twin verification failed: ${err instanceof Error ? err.message : String(err)}`, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const togglePerFrame = () => {
    if (driverOn) {
      /* one session per tier: the driver owns it while it drives */
      toast('⚠ The universe driver owns the session — stop true gravity first', 'warn');
      return;
    }
    if (!engineHasSimTwin()) {
      toast('⚠ The engine is not mounted yet — open the universe first', 'warn');
      return;
    }
    const next = !twinOn;
    /* through the boot contract: the engine owns the gate and feeds the twin */
    (window as unknown as { __ENGINE__: { setSimTwin: (on: boolean) => void } }).__ENGINE__.setSimTwin(next);
    setTwinOn(next);
    setTick((n) => n + 1);
    toast(next
      ? '✦ Per-frame twin running — the N-body session now tracks the live clock'
      : 'Per-frame twin stopped — the session rests');
  };

  /* R92 — the universe driver switch (the R91 decree). Through the store's
     single mutation surface: the persisted flag rides the App effect into
     the engine, which hands the session to the driver and stops the twin. */
  const toggleDriver = () => {
    const next = !driverOn;
    actions.setUniverseDriver(next);
    toast(next
      ? '✦ True gravity now drives the sky — the clockwork rests as seed, fallback and heal'
      : 'The Kepler clockwork takes the sky back — the session memory is saved');
  };

  const backend = BACKEND_LABEL[status.backend] ?? BACKEND_LABEL.typescript;
  const drifts = twinOn
    ? [...simTwinTelemetry.entries()].sort((a, b) => b[1].deviationAU - a[1].deviationAU).slice(0, 4)
    : [];
  const driverDrifts = driverOn
    ? [...driverTelemetry.entries()].sort((a, b) => b[1].deviationAU - a[1].deviationAU).slice(0, 4)
    : [];
  void tick; /* the poll just refreshes the module-map reads below */

  return (
    <div className="cc-panel p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/12 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-400/35 text-violet-300">
            <Orbit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[13px] font-semibold text-white tracking-wide">
                NATIVE SIMULATOR TWIN
              </h3>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${backend.cls}`}>
                {backend.text}
              </span>
            </div>
            <p className="font-mono text-[9px] text-slate-400">
              stateful RK4 N-body session · SI units (m/kg/s) · verified against the TS twin
            </p>
          </div>
        </div>

        <button
          onClick={runTwin}
          disabled={busy || twinOn || driverOn}
          title={twinOn
            ? 'The per-frame twin owns the session — stop it first'
            : driverOn
              ? 'The universe driver owns the session — stop true gravity first'
              : 'Verify the session against the TS twin'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-200 text-xs font-mono tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className={`w-3 h-3 ${busy ? 'animate-pulse' : ''}`} />
          <span>{busy ? 'Running...' : 'Verify Twin'}</span>
        </button>
      </div>

      <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
        The same C++ core that solves your orbits hosts a stateful N-body simulator
        (mutual gravity, 4th-order Runge-Kutta). Verify Twin checks it against the
        TypeScript twin; the per-frame twin runs it alongside the live universe on its own
        clock and measures how far true N-body gravity drifts from the Kepler canon.
        Read-only — the sky you see is still driven by the Kepler clockwork.
      </p>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="p-2.5 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <span className="cc-label block">Session Tier</span>
          <span className="text-sm font-bold text-white tabular-nums">{status.backend}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <span className="cc-label block">Bodies</span>
          <span className="text-sm font-bold text-cyan-300 tabular-nums">{receipt === null ? '—' : receipt.bodies}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <span className="cc-label block">Steps (days)</span>
          <span className="text-sm font-bold text-emerald-300 tabular-nums">{receipt === null ? '—' : receipt.steps}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <span className="cc-label block">Max Relative Δ</span>
          <span className="text-sm font-bold text-amber-300 tabular-nums">
            {receipt === null ? '—' : receipt.maxDelta.toExponential(1)}
          </span>
        </div>
      </div>

      {/* Twin receipt — the TS tier is its own reference, so it always reads verified */}
      {receipt !== null && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/25 border border-white/10 font-mono text-[11px]">
          {(receipt.maxDelta < 1e-9 || receipt.backend === 'typescript')
            ? <BadgeCheck className="w-4 h-4 text-emerald-400" />
            : <BadgeX className="w-4 h-4 text-amber-400" />}
          <span className={(receipt.maxDelta < 1e-9 || receipt.backend === 'typescript') ? 'text-emerald-300' : 'text-amber-300'}>
            {(receipt.maxDelta < 1e-9 || receipt.backend === 'typescript')
              ? 'Simulator twin verified'
              : 'Simulator twin drift detected'}
            {' '}— active tier {receipt.backend} vs TS twin over {receipt.steps} steps
          </span>
        </div>
      )}

      {/* R92 — THE UNIVERSE DRIVER (the R91 decree, in shadow): the switch
          that hands the rendered sky to true N-body gravity. The store flag
          persists; the App effect carries it into the engine gate. */}
      <div className="space-y-2 font-mono text-xs rounded-xl border border-violet-400/25 bg-violet-500/5 p-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="cc-panel-title">
            <Globe className="w-3.5 h-3.5" />
            <span>Universe Driver — true gravity</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-mono ${
              driverOn
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}>
              {driverOn ? 'DRIVING THE SKY' : 'CLOCKWORK'}
            </span>
          </div>
          <button
            onClick={toggleDriver}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono tracking-wider transition-all cursor-pointer ${
              driverOn
                ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                : 'bg-violet-500/20 border-violet-400/40 text-violet-200 hover:bg-violet-500/30'
            }`}
          >
            <Globe className={`w-3 h-3 ${driverOn ? 'animate-pulse' : ''}`} />
            <span>{driverOn ? 'RESTORE CLOCKWORK' : 'DRIVE THE SKY'}</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {driverOn
            ? 'The session drives every world by real mutual gravity — the canon is the seed, the clockwork renders any stale frame, Restore Ephemeris re-seeds. Drift is the honest story of your universe, saved across restarts.'
            : 'Flip this and the N-body session takes the sky: real mutual gravity with the full 10 M☉ vault, real chaos, the story saved across restarts. The clockwork remains seed, fallback and heal.'}
        </p>
        {driverOn && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
              <span>steps run: <span className="text-white tabular-nums">{driverState.stepsRun}</span></span>
              <span>session clock: <span className="text-white tabular-nums">{Math.floor(driverState.readbackDays)} d</span></span>
              <span>memories saved: <span className="text-white tabular-nums">{driverState.savesRun}</span></span>
              <span>max drift: <span className={`tabular-nums ${(driverState.maxDriftAU < 0.01 ? 'text-emerald-300' : driverState.maxDriftAU < 0.1 ? 'text-amber-300' : 'text-red-300')}`}>{driverState.maxDriftAU.toFixed(4)} AU</span></span>
            </div>
            {driverDrifts.length > 0 && (
              <div className="space-y-0.5 text-[10px]">
                {driverDrifts.map(([id, d]) => (
                  <div key={id} className="flex items-center justify-between px-2 py-1 rounded-lg bg-abyss/45 border border-white/10">
                    <span className="text-slate-300 truncate">{id}</span>
                    <span className="tabular-nums text-slate-400">{d.deviationAU.toFixed(4)} AU</span>
                  </div>
                ))}
              </div>
            )}
            {driverState.lastError && (
              <p className="text-[10px] text-amber-300">⚠ {driverState.lastError}</p>
            )}
          </div>
        )}
      </div>

      {/* R88 — the per-frame twin */}
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="cc-panel-title">
            <Activity className="w-3.5 h-3.5" />
            <span>Per-Frame Twin (live drift vs Kepler canon)</span>
          </div>
          <button
            onClick={togglePerFrame}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono tracking-wider transition-all cursor-pointer ${
              twinOn
                ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {twinOn ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{twinOn ? 'STOP TWIN' : 'RUN TWIN'}</span>
          </button>
        </div>
        {twinOn && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span>steps run: <span className="text-white tabular-nums">{simTwinState.stepsRun}</span></span>
              <span>twin clock: <span className="text-white tabular-nums">{Math.floor(simTwinState.twinDays)} d</span></span>
              <span>max drift: <span className={`tabular-nums ${(simTwinState.maxDriftAU < 0.01 ? 'text-emerald-300' : simTwinState.maxDriftAU < 0.1 ? 'text-amber-300' : 'text-red-300')}`}>{simTwinState.maxDriftAU.toFixed(4)} AU</span></span>
            </div>
            {drifts.length > 0 && (
              <div className="space-y-0.5 text-[10px]">
                {drifts.map(([id, d]) => (
                  <div key={id} className="flex items-center justify-between px-2 py-1 rounded-lg bg-abyss/45 border border-white/10">
                    <span className="text-slate-300 truncate">{id}</span>
                    <span className="tabular-nums text-slate-400">{d.deviationAU.toFixed(4)} AU</span>
                  </div>
                ))}
              </div>
            )}
            {simTwinState.lastError && (
              <p className="text-[10px] text-amber-300">⚠ {simTwinState.lastError}</p>
            )}
            <p className="text-[10px] text-slate-500">
              Drift is the honest distance between true N-body gravity and the Kepler
              canon — it grows as the clockwork and the simulation disagree. The session
              is shared: Verify Twin rests while the per-frame twin owns it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
