import React, { useEffect, useState } from 'react';
import { Play, Square, BadgeCheck, BadgeX, Globe } from 'lucide-react';
import { cosmosBridge, type CosmosStatus, type TwinParityReceipt } from '../../platform/native/cpp_bridge';
import { simTwinState, simTwinTelemetry } from '../../physics/simTwin';
import { driverState, driverTelemetry } from '../../physics/sessionDriver';
import { actions, useUniverse } from '../../state';
import { toast } from '../../ui/toast';
import { ThoughtCloud } from './ThoughtCloud';

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

  /* R101.2 — THE QUIET CARD: only the name, the badges, three controls and
     one line of live numbers stay on the card; every paragraph, the drift
     list and the receipt's fine print rise in ThoughtClouds on hover. The
     logic below this line is the R87/R88/R92/R94 contract, untouched. */
  const drifts = twinOn
    ? [...simTwinTelemetry.entries()].sort((a, b) => b[1].deviationAU - a[1].deviationAU).slice(0, 4)
    : [];
  const driverDrifts = driverOn
    ? [...driverTelemetry.entries()].sort((a, b) => b[1].deviationAU - a[1].deviationAU).slice(0, 4)
    : [];
  const activeDrifts = driverOn ? driverDrifts : drifts;
  const maxDriftAU = driverOn ? driverState.maxDriftAU : simTwinState.maxDriftAU;
  void tick; /* the poll just refreshes the module-map reads below */

  return (
    <div className="cc-panel p-4 sm:p-5 flex flex-col gap-3">
      {/* Header — name + tier + driver state */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <ThoughtCloud
          label="Native Simulator Twin"
          subtitle={'The same C++ core that solves your orbits hosts a stateful N-body simulator (mutual gravity, 4th-order Runge-Kutta, SI units). Verify Twin checks it against the TypeScript twin; the per-frame twin runs it alongside the live universe on its own clock.\nRead-only — this card never touches the rendered sky.'}
          hint="the words live here — the card keeps only the numbers"
        >
          <h3 className="font-display text-[13px] font-semibold text-white tracking-wide cursor-default">
            NATIVE SIMULATOR TWIN
          </h3>
        </ThoughtCloud>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${backend.cls}`}>
            {backend.text}
          </span>
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
            driverOn
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
              : 'bg-white/5 text-slate-400 border-white/10'
          }`}>
            {driverOn ? 'DRIVING THE SKY' : 'CLOCKWORK'}
          </span>
        </div>
      </div>

      {/* Controls — three quiet chips; hover each for its thought cloud */}
      <div className="flex items-center gap-2 flex-wrap">
        <ThoughtCloud
          label={driverOn ? 'Restore the Clockwork' : 'Drive the Sky'}
          subtitle={driverOn
            ? 'The session drives every world by real mutual gravity — the canon is the seed, the clockwork renders any stale frame, Restore Ephemeris re-seeds. Drift is the honest story of your universe, saved across restarts.'
            : 'Flip this and the N-body session takes the sky: real mutual gravity with the full 10 M☉ vault, real chaos, the story saved across restarts. The clockwork remains seed, fallback and heal.'}
          hint="one session per tier"
        >
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
        </ThoughtCloud>

        <ThoughtCloud
          label="Per-Frame Twin"
          subtitle={'Runs the session alongside the live universe on its own clock and measures how far true N-body gravity drifts from the Kepler canon. The session is shared — Verify Twin rests while the per-frame twin owns it.'}
          hint="read-only against the rendered sky"
        >
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
        </ThoughtCloud>

        <ThoughtCloud
          label="Verify Twin"
          subtitle="Checks the active tier against the TypeScript RK4 twin line-for-line — the same numerical half the round98 physics gauntlet executes in CI on every push. The TS tier trivially matches itself, so it always reads verified."
          hint="also proven in CI"
        >
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
        </ThoughtCloud>

        {/* the receipt — one quiet badge; the fine print in its cloud */}
        {receipt !== null && (
          <ThoughtCloud
            label={(receipt.maxDelta < 1e-9 || receipt.backend === 'typescript') ? 'Simulator twin verified' : 'Simulator twin drift detected'}
            subtitle={`Active tier ${receipt.backend} vs TS twin over ${receipt.steps} steps, ${receipt.bodies} bodies — max relative Δ ${receipt.maxDelta.toExponential(1)}.`}
            hint={(receipt.maxDelta < 1e-9 || receipt.backend === 'typescript') ? 'parity holds' : 'check the tier'}
          >
            <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono ${
              (receipt.maxDelta < 1e-9 || receipt.backend === 'typescript')
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-400/30'
            }`}>
              {(receipt.maxDelta < 1e-9 || receipt.backend === 'typescript')
                ? <BadgeCheck className="w-3.5 h-3.5" />
                : <BadgeX className="w-3.5 h-3.5" />}
              <span className="tabular-nums">Δ {receipt.maxDelta.toExponential(1)}</span>
            </span>
          </ThoughtCloud>
        )}
      </div>

      {/* Live readout — one line of real numbers; the drift list in a cloud */}
      {(driverOn || twinOn) && (
        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400 flex-wrap">
          <span>steps run <span className="text-white tabular-nums">{driverOn ? driverState.stepsRun : simTwinState.stepsRun}</span></span>
          <span>clock <span className="text-white tabular-nums">{driverOn ? `${Math.floor(driverState.readbackDays)} d` : `${Math.floor(simTwinState.twinDays)} d`}</span></span>
          <ThoughtCloud
            label="Drift — the honest distance from the canon"
            subtitle={
              <span className="block space-y-1">
                {driverOn && <span className="block text-slate-300">memories saved: <span className="text-white tabular-nums">{driverState.savesRun}</span></span>}
                {activeDrifts.map(([id, d]) => (
                  <span key={id} className="flex items-center justify-between gap-4">
                    <span className="text-slate-300 truncate">{id}</span>
                    <span className="tabular-nums text-slate-400">{d.deviationAU.toFixed(4)} AU</span>
                  </span>
                ))}
                {activeDrifts.length === 0 && <span className="block">the readback is fresh — no per-body drift to list yet</span>}
              </span>
            }
            hint="grows as the clockwork and the simulation disagree"
          >
            <span
              className={`tabular-nums cursor-default ${
                maxDriftAU < 0.01 ? 'text-emerald-300' : maxDriftAU < 0.1 ? 'text-amber-300' : 'text-red-300'
              }`}
            >
              drift {maxDriftAU.toFixed(4)} AU ⌄
            </span>
          </ThoughtCloud>
        </div>
      )}
      {driverOn && driverState.lastError && (
        <p className="text-[10px] text-amber-300 font-mono">⚠ {driverState.lastError}</p>
      )}
      {twinOn && simTwinState.lastError && (
        <p className="text-[10px] text-amber-300 font-mono">⚠ {simTwinState.lastError}</p>
      )}
    </div>
  );
};
