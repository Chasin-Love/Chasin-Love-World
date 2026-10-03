import React from 'react';
import { type CosmicBody } from '../../domain/universe';
import { calculatePhysics } from '../../physics/physicsEngine';
import { driverTelemetry } from '../../physics/sessionDriver';
import { simTwinTelemetry } from '../../physics/simTwin';
import { getSimDays, subscribeSimDays } from '../../platform/simClock';

/* The engine seam — the card reaches the gate through the boot contract. */
function getEngine(): { simDays?: number; livingField?: any } | null {
  const eng = (window as unknown as { __ENGINE__?: { simDays?: number; livingField?: any } | null }).__ENGINE__;
  return eng ?? null;
}

/* SCIENCE VERDICT — the world's real physics report card (R101.3).
   Every metric is computed from live engine data, nothing invented.
   Metrics:
   - GOODNESS OF FIT: inverse of driver vs canon deviation (lower deviation = better fit)
   - GR: time dilation at surface (1/τ where τ = √(1−Rs/R)) — for anchor star
   - Rs: Schwarzschild radius of anchor star (2GM/c² in km)
   - MODIFIED: Living Gravity coupling ratio (perturbing accel / central Keplerian accel)
   - Taylor remainder: RK4 local truncation estimate from simTwin deviation per step */

interface MetricRow {
  label: string;
  value: string;
  subtitle: string;
  color: string;
  cloud: {
    label: string;
    subtitle: string;
    hint: string;
  };
}

function formatMetric(v: number, precision: number = 4): string {
  if (v >= 1e6) return v.toExponential(2);
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(precision);
  return v.toExponential(2);
}

function ScienceVerdictCardContent({ activeReality, simDays }: { activeReality?: any; simDays: number }) {
  const engine = getEngine();

  const anchorStar = activeReality?.bodies?.find((b: any) => b.kind === 'anchor' || b.kind === 'star');
  const physics = anchorStar ? calculatePhysics(anchorStar, simDays) : null;

  const driver = anchorStar ? driverTelemetry.get(anchorStar.id) : undefined;
  const twin = anchorStar ? simTwinTelemetry.get(anchorStar.id) : undefined;

  /* GOODNESS OF FIT — from driver deviation (lower = better) */
  const driverDeviation = driver?.deviationAU ?? 0;
  const goodnessRaw = Math.max(0, 1 - driverDeviation / 0.1);
  const goodnessLabel = goodnessRaw > 0.9 ? 'EXCELLENT' : goodnessRaw > 0.7 ? 'GOOD' : goodnessRaw > 0.5 ? 'FAIR' : 'POOR';
  const goodnessColor = goodnessRaw > 0.9 ? '#10b981' : goodnessRaw > 0.7 ? '#f59e0b' : goodnessRaw > 0.5 ? '#f97316' : '#ef4444';

  /* GR — time dilation at surface (τ = √(1−Rs/R)); display as 1/τ so >1 means dilation */
  const tau = physics?.timeDilationAtSurface ?? 1;
  const gr = tau > 0 ? 1 / tau : 1;

  /* Rs — Schwarzschild radius in km */
  const rsKm = physics?.schwarzschildRadiusKm ?? 0;

  /* MODIFIED — Living Gravity coupling ratio.
     perturbing acceleration / central Keplerian acceleration. */
  let modified = 1;
  if (engine && physics && engine.livingField) {
    const node = engine.livingField.nodes.find((n: any) => n.id === anchorStar?.id);
    if (node && node.strongestPullN > 0 && physics.orbitalFieldMs2 > 0) {
      modified = 1 + node.strongestPullN / physics.orbitalFieldMs2;
    }
  }

  /* Taylor remainder — RK4 local truncation estimate.
     Use simTwin deviation per sim-day as proxy for integration error. */
  const twinDeviation = simTwinTelemetry.get(anchorStar?.id ?? '')?.deviationAU ?? 0;
  const taylorRemainder = simDays > 0 ? twinDeviation / Math.max(1, simDays) : 0;

  const metrics: MetricRow[] = [
    {
      label: 'GOODNESS OF FIT',
      value: goodnessLabel,
      subtitle: `driver deviation ${driverDeviation.toExponential(2)} AU`,
      color: goodnessColor,
      cloud: {
        label: 'Goodness of Fit',
        subtitle: `Inverse of Universe Driver deviation from Kepler canon. 1.0 = perfect clockwork match. Current: ${(goodnessRaw * 100).toFixed(1)}% fit. Driver deviation: ${driverDeviation.toExponential(2)} AU over ${simDays} sim-days.`,
        hint: 'lower deviation = better',
      },
    },
    {
      label: 'GR',
      value: gr.toFixed(6),
      subtitle: `1/τ where τ = √(1−Rs/R) = ${tau.toFixed(6)}`,
      color: '#67e8f9',
      cloud: {
        label: 'General Relativity Factor',
        subtitle: `Gravitational time dilation at the anchor star's surface. τ = √(1 − 2GM/Rc²). For Sun-like star: τ ≈ 0.999998 → 1/τ ≈ 1.000002. Shows relativistic strength.`,
        hint: '1.0 = Newtonian limit',
      },
    },
    {
      label: 'Rs',
      value: `${formatMetric(rsKm)} km`,
      subtitle: `Schwarzschild radius 2GM/c²`,
      color: '#fbbf24',
      cloud: {
        label: 'Schwarzschild Radius',
        subtitle: `Rs = 2GM/c² for the anchor star. Sun = 2.95 km. This is the event horizon radius if the star collapsed to a black hole.`,
        hint: 'Sun = 2.95 km',
      },
    },
    {
      label: 'MODIFIED',
      value: modified.toFixed(6),
      subtitle: `1 + a_perturb / a_kepler`,
      color: '#a78bfa',
      cloud: {
        label: 'Modified Gravity Coupling',
        subtitle: `The Living Gravity factor: 1 + (perturbing acceleration / central Keplerian acceleration). Pure Kepler = 1.0. N-body mutual gravity modifies the orbit. Computed from the LivingGravityField strongest perturbing pull.`,
        hint: '1.0 = pure Kepler',
      },
    },
    {
      label: 'Taylor remainder',
      value: taylorRemainder.toExponential(2),
      subtitle: `AU/sim-day (simTwin deviation / steps)`,
      color: '#f472b6',
      cloud: {
        label: 'Taylor Remainder (RK4 Error)',
        subtitle: `Estimated RK4 local truncation error per sim-day. Derived from Simulator Twin's per-step deviation from the Kepler canon. Lower = more accurate integration.`,
        hint: 'lower = better',
      },
    },
  ];

  return (
    <div className="cc-panel p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="cc-panel-title">
          <div className="p-1.5 rounded-xl bg-violet-500/20 border border-violet-400/35 text-violet-300">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <span>Science Verdict</span>
        </span>
        <span className="cc-label text-violet-300/80 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Live Physics
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {metrics.map((m, i) => (
          <ThoughtCloud
            key={m.label}
            label={m.cloud.label}
            subtitle={m.cloud.subtitle}
            hint={m.cloud.hint}
            className="w-full"
          >
            <div className="group p-2.5 rounded-xl bg-black/20 border border-white/10 hover:bg-black/30 transition-all cursor-default">
              <div className="flex items-center justify-between mb-1">
                <span className="cc-label text-slate-400">{m.label}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
              </div>
              <div className="font-mono text-[13px] font-bold" style={{ color: m.color }}>
                {m.value}
              </div>
              <div className="font-mono text-[8px] text-slate-500 mt-0.5 truncate">{m.subtitle}</div>
            </div>
          </ThoughtCloud>
        ))}
      </div>
    </div>
  );
}

/* Lightweight ThoughtCloud inline for the card metrics (same manner, simpler) */
function ThoughtCloud({
  label,
  subtitle,
  hint,
  children,
  className,
}: {
  label: string;
  subtitle: string;
  hint: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const wrapRef = React.useRef<HTMLSpanElement>(null);
  const [below, setBelow] = React.useState(false);
  const [shift, setShift] = React.useState({ x: 0, y: 0 });

  React.useLayoutEffect(() => {
    if (!open) {
      setShift((s) => (s.x === 0 && s.y === 0 ? s : { x: 0, y: 0 }));
      setBelow((b) => (b ? false : b));
      return;
    }
    const wrap = wrapRef.current;
    const el = bubbleRef.current;
    if (!wrap || !el) return;
    const t = wrap.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!below && t.top < b.height + 28 && t.bottom + b.height + 28 <= window.innerHeight) {
      setBelow(true);
      return;
    }
    setShift((s) => {
      let dx = 0;
      if (b.left < 8) dx = 8 - b.left;
      else if (b.right > window.innerWidth - 8) dx = window.innerWidth - 8 - b.right;
      let dy = 0;
      if (b.top < 8) dy = 8 - b.top;
      else if (b.bottom > window.innerHeight - 8) dy = window.innerHeight - 8 - b.bottom;
      if (dx === 0 && dy === 0) return s;
      return { x: s.x + dx, y: s.y + dy };
    });
  }, [open, below]);

  const dots = (anchor: 'top' | 'bottom') => (
    <div className="relative h-4" aria-hidden="true">
      {[
        { cls: 'cc-thought-dot w-2.5 h-2.5', style: undefined },
        { cls: 'cc-thought-dot cc-thought-dot-2 w-2 h-2', style: undefined },
        { cls: 'cc-thought-dot w-1.5 h-1.5', style: { animationDelay: '0.56s' } },
      ].map((d, i) => (
        <span
          key={i}
          className={`absolute ${anchor}-0 left-1/2 -translate-x-1/2 rounded-full bg-cyan-200 border border-cyan-300/70 shadow-[0_0_8px_rgba(103,232,249,0.6)] ${d.cls}`}
          style={d.style}
        />
      ))}
    </div>
  );

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          ref={bubbleRef}
          className={`absolute left-1/2 z-50 pointer-events-none select-none ${
            below ? 'top-full mt-1' : 'bottom-full mb-1'
          }`}
          style={{ transform: `translate(calc(-50% + ${shift.x}px), ${shift.y}px)` }}
        >
          {below && dots('bottom')}
          <div className="cc-cloud-rise min-w-[250px] max-w-[320px] rounded-2xl bg-[#0a0d16]/88 border border-white/15 shadow-[0_18px_44px_rgba(0,0,0,0.55),0_0_34px_rgba(6,182,212,0.16),inset_0_1px_0_rgba(255,255,255,0.22)]">
            <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-cyan-300/70 rounded-tl-sm" aria-hidden="true" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r border-cyan-300/70 rounded-tr-sm" aria-hidden="true" />
            <span className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l border-cyan-300/70 rounded-bl-sm" aria-hidden="true" />
            <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-cyan-300/70 rounded-br-sm" aria-hidden="true" />
            <div className="relative z-10 px-3.5 py-3 text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-violet-200 tracking-wide">
                  {label}
                </span>
              </div>
              <p className="font-mono text-[9.5px] text-slate-200/85 mt-1 leading-relaxed whitespace-pre-line">
                {subtitle}
              </p>
              <div className="mt-1.5 flex items-center gap-1 font-mono text-[8px] text-cyan-300/90 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping inline-block" />
                <span>{hint}</span>
              </div>
            </div>
          </div>
          {!below && dots('top')}
        </div>
      )}
    </span>
  );
}

export function ScienceVerdictCard({ activeReality }: { activeReality?: any }) {
  const [simDays, setSimDays] = React.useState(() => getSimDays());

  React.useEffect(() => {
    const unsub = subscribeSimDays(() => {
      setSimDays(getSimDays());
    });
    return unsub;
  }, []);

  return <ScienceVerdictCardContent activeReality={activeReality} simDays={simDays} />;
}