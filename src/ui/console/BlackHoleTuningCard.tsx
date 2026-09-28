import React, { useEffect, useState } from 'react';
import { Orbit, RotateCcw } from 'lucide-react';
import { toast } from '../../ui/toast';
import {
  BLACKHOLE_CHANGE_EVENT,
  BLACKHOLE_RANGES,
  getBlackHoleParams,
  resetBlackHoleParams,
  setBlackHoleParam,
  type BlackHoleParams,
} from '../../engine/blackholeParams';
import {
  getRaymarchOverride,
  getRaymarchStatus,
  setRaymarchOverride,
  RAYMARCH_OVERRIDE_EVENT,
  RAYMARCH_STATUS_EVENT,
  type RaymarchOverride,
  type RaymarchStatus,
} from '../../engine/blackholeTier';

/** The ten live knobs — labels mirror dgreenheck's demo panel; ranges are
    his ui.js verbatim. ROUND 63 adds his appearance trio (Inner/Outer
    Softness, Sharpness) so the whole appearance folder is user-tunable. */
const SLIDERS: Array<{ key: keyof BlackHoleParams; label: string }> = [
  { key: 'mass', label: 'Mass' },
  { key: 'lensing', label: 'Grav. Lensing' },
  { key: 'doppler', label: 'Doppler Beaming' },
  { key: 'diskInner', label: 'Inner Radius' },
  { key: 'diskOuter', label: 'Outer Radius' },
  { key: 'brightness', label: 'Brightness' },
  { key: 'rotSpeed', label: 'Rotation Speed' },
  { key: 'softInner', label: 'Inner Softness' },
  { key: 'softOuter', label: 'Outer Softness' },
  { key: 'arcSharpness', label: 'Arc Sharpness' },
];

const TIER_OPTIONS: Array<{ v: RaymarchOverride; label: string }> = [
  { v: 'auto', label: 'Auto' },
  { v: 'on', label: 'Always On' },
  { v: 'off', label: 'Off' },
];

/** What the engine's last tier transition means for the eye watching the hole. */
const STATUS_TEXT: Record<RaymarchStatus['state'], Record<string, string>> = {
  active: { attached: 'geodesic lensing live', 're-armed': 'geodesic lensing re-armed', auto: 'geodesic lensing live', 'quality-restore': 'geodesic lensing restored' },
  forced: { attached: 'lensing live (Always On)', 'override-on': 'lensing forced (Always On)' },
  fallback: {
    boot: 'hole hidden (booting…)',
    'frame-budget': 'hole hidden — frame budget; fly away & return to retry',
    'frame-budget-3-strikes': 'hole hidden — frame budget (3 strikes this session)',
    'shader-error': 'hole hidden — shader failure this session',
  },
  off: { 'tier-low': 'hole hidden — quality tier too low', 'override-off': 'hole hidden — switch is Off' },
};

function statusLine(s: RaymarchStatus): string {
  return STATUS_TEXT[s.state]?.[s.reason] ?? `${s.state} · ${s.reason}`;
}

/**
 * ROUND 20.4 — live tuning for the raymarched black hole. Writes through to
 * the renderer immediately (blackholeParams store → CustomEvent → material
 * uniforms) and persists across boots. Defaults ARE the reference config:
 * dgreenheck's demo settings, the ones the ported look was tuned against.
 *
 * ROUND 53 — the Cinematic Lensing switch (blackholeTier): the engine
 * reports every tier transition back, so the card shows what is actually
 * rendering instead of guessing.
 */
export const BlackHoleTuningCard: React.FC = () => {
  const [params, setParams] = useState<BlackHoleParams>(() => getBlackHoleParams());
  const [override, setOverride] = useState<RaymarchOverride>(() => getRaymarchOverride());
  const [status, setStatus] = useState<RaymarchStatus>(() => getRaymarchStatus());

  useEffect(() => {
    const sync = (e: Event) => setParams({ ...(e as CustomEvent<BlackHoleParams>).detail });
    window.addEventListener(BLACKHOLE_CHANGE_EVENT, sync);
    const syncTier = () => setOverride(getRaymarchOverride());
    const syncStatus = (e: Event) => setStatus({ ...(e as CustomEvent<RaymarchStatus>).detail });
    window.addEventListener(RAYMARCH_OVERRIDE_EVENT, syncTier);
    window.addEventListener(RAYMARCH_STATUS_EVENT, syncStatus);
    return () => {
      window.removeEventListener(BLACKHOLE_CHANGE_EVENT, sync);
      window.removeEventListener(RAYMARCH_OVERRIDE_EVENT, syncTier);
      window.removeEventListener(RAYMARCH_STATUS_EVENT, syncStatus);
    };
  }, []);

  const change = (key: keyof BlackHoleParams, value: number) => setParams(setBlackHoleParam(key, value));

  const reset = () => {
    setParams(resetBlackHoleParams());
    toast('✦ Black hole restored to the reference config');
  };

  const live = status.state === 'active' || status.state === 'forced';

  return (
    <div className="cc-panel p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-300">
            <Orbit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[13px] font-semibold text-white tracking-wide">
                BLACK HOLE STUDIO
              </h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                LIVE
              </span>
            </div>
            <p className="font-mono text-[9px] text-slate-400">
              geodesic renderer · dgreenheck reference config · applied &amp; remembered instantly
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-200 text-xs font-mono tracking-wider transition-all cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset to Reference</span>
        </button>
      </div>

      {/* Cinematic lensing switch + live status */}
      <div className="flex items-center justify-between gap-3 flex-wrap border border-white/8 rounded-xl px-3 py-2.5 bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-amber-400/80'}`} />
          <span className="font-mono text-[11px] text-slate-300">{statusLine(status)}</span>
        </div>
        <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
          {TIER_OPTIONS.map(({ v, label }) => (
            <button
              key={v}
              onClick={() => { setOverride(v); setRaymarchOverride(v); }}
              className={`px-3 py-1.5 text-[10px] font-mono tracking-wider transition-all cursor-pointer ${
                override === v
                  ? 'bg-cyan-500/25 text-cyan-200'
                  : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3 font-mono text-xs">
        {SLIDERS.map(({ key, label }) => {
          const range = BLACKHOLE_RANGES[key];
          return (
            <label key={key} className="block">
              <span className="flex items-center justify-between mb-1">
                <span className="cc-label">{label}</span>
                <span className="text-cyan-300 tabular-nums">{params[key].toFixed(range.step < 0.1 ? 2 : 1)}</span>
              </span>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={params[key]}
                onChange={(e) => change(key, Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </label>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500">
        Mass sets the Schwarzschild radius (rs = 2 × mass); lensing bends light per rs — the pair
        reproduces the original demo's physics, and the real background — your nebula and stars —
        bends with it. The softness pair shapes the disk's edge ramps and Arc Sharpness the flow's
        grain, all his demo's own knobs (the softness trio defaults 0.18 / 0.5 / 7.4).
        Peak temp 49.78 kK and falloff 5.22 stay at the reference values. Focusing the hole lands
        at the reference camera (25.8 rs, 14° below the disk plane) where the lensed arcs wrap over
        and under the shadow.
        Cinematic Lensing: Auto keeps the frame-budget safety net; Always On forces the geodesic
        renderer; Off hides the hole entirely — there is no stand-in renderer anymore.
      </p>
    </div>
  );
};
