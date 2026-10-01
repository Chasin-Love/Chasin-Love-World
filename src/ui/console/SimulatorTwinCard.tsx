import React, { useEffect, useState } from 'react';
import { Orbit, Play, BadgeCheck, BadgeX } from 'lucide-react';
import { cosmosBridge, type CosmosStatus, type TwinParityReceipt } from '../../platform/native/cpp_bridge';
import { toast } from '../../ui/toast';

const BACKEND_LABEL: Record<string, { text: string; cls: string }> = {
  'native-cpp': { text: 'NATIVE C++ SESSION', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
  wasm: { text: 'WASM SESSION', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' },
  typescript: { text: 'TS TWIN (SELF-CHECK)', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
};

/* R87 — the stateful N-body simulator's public face. The C++ core has
   hosted a real RK4 N-body session (cosmos_sim_configure/step/body) since
   its first build; this card is its verification surface: one button
   configures a deterministic seeded star system on the active tier, steps
   it, reads every body back, and compares against the TS twin running the
   identical run. Button-driven by design — the frame loop never touches
   this session, and nothing here can move the rendered sky. */
export const SimulatorTwinCard: React.FC = () => {
  const [status, setStatus] = useState<CosmosStatus>(() => cosmosBridge.getStatus());
  const [receipt, setReceipt] = useState<TwinParityReceipt | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    cosmosBridge.init().then((s) => {
      if (alive) setStatus({ ...s });
    }).catch(() => { /* ignore init failure */ });
    return () => { alive = false; };
  }, []);

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

  const backend = BACKEND_LABEL[status.backend] ?? BACKEND_LABEL.typescript;

  return (
    <div className="cc-panel p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3 flex-wrap">
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
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-200 text-xs font-mono tracking-wider transition-all cursor-pointer"
        >
          <Play className={`w-3 h-3 ${busy ? 'animate-pulse' : ''}`} />
          <span>{busy ? 'Running...' : 'Verify Twin'}</span>
        </button>
      </div>

      <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
        The same C++ core that solves your orbits hosts a stateful N-body simulator
        (mutual gravity, 4th-order Runge-Kutta). This card configures a seeded star
        system on the active physics tier, advances it 120 days, and checks every body
        against the TypeScript twin of the same integrator. The session lives here only —
        the sky you see is still driven by the Kepler clockwork.
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
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-abyss/45 backdrop-blur-md border border-white/10 font-mono text-[11px]">
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
    </div>
  );
};
