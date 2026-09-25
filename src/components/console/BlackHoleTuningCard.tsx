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

/** The seven live knobs — labels mirror dgreenheck's demo panel; ranges are
    his ui.js ranges verbatim, so dragging feels like the original. */
const SLIDERS: Array<{ key: keyof BlackHoleParams; label: string }> = [
  { key: 'mass', label: 'Mass' },
  { key: 'lensing', label: 'Grav. Lensing' },
  { key: 'doppler', label: 'Doppler Beaming' },
  { key: 'diskInner', label: 'Inner Radius' },
  { key: 'diskOuter', label: 'Outer Radius' },
  { key: 'brightness', label: 'Brightness' },
  { key: 'rotSpeed', label: 'Rotation Speed' },
];

/**
 * ROUND 20.4 — live tuning for the raymarched black hole. Writes through to
 * the renderer immediately (blackholeParams store → CustomEvent → material
 * uniforms) and persists across boots. Defaults ARE the reference config:
 * dgreenheck's demo settings, the ones the ported look was tuned against.
 */
export const BlackHoleTuningCard: React.FC = () => {
  const [params, setParams] = useState<BlackHoleParams>(() => getBlackHoleParams());

  useEffect(() => {
    const sync = (e: Event) => setParams({ ...(e as CustomEvent<BlackHoleParams>).detail });
    window.addEventListener(BLACKHOLE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(BLACKHOLE_CHANGE_EVENT, sync);
  }, []);

  const change = (key: keyof BlackHoleParams, value: number) => setParams(setBlackHoleParam(key, value));

  const reset = () => {
    setParams(resetBlackHoleParams());
    toast('✦ Black hole restored to the reference config');
  };

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

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3 font-mono text-xs">
        {SLIDERS.map(({ key, label }) => {
          const range = BLACKHOLE_RANGES[key];
          return (
            <label key={key} className="block">
              <span className="flex items-center justify-between mb-1">
                <span className="cc-label">{label}</span>
                <span className="text-cyan-300 tabular-nums">{params[key].toFixed(1)}</span>
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
        reproduces the original demo's physics. Peak temp 49.78 kK, falloff 5.22, turbulence
        1.81 / 0.75 / 7.4 and softness 0.18 / 0.5 stay at the reference values. The raymarched
        renderer activates at MEDIUM+ quality tier; the composite hole remains the fallback.
      </p>
    </div>
  );
};
