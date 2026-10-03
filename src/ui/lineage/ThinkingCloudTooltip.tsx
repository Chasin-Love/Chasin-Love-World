import React, { useLayoutEffect, useRef, useState } from 'react';
import { Sparkles, Wand2, Plus } from 'lucide-react';

interface ThinkingCloudTooltipProps {
  label?: string;
  subtitle?: string;
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconType?: 'forge' | 'star' | 'singularity' | 'plus';
  position?: 'bottom' | 'top' | 'left' | 'right';
  id?: string;
  /* custom glyph — renders any icon in a neutral square seat (icon-first
     chrome); when omitted the built-in iconType seals behave as before */
  icon?: React.ReactNode;
  /* accent state for custom-icon triggers (reads the deck's --cc) */
  active?: boolean;
  /* footer micro-copy inside the thought card */
  hint?: string;
}

/* THE FORGE SIGIL — a precision SVG instrument, not a gradient blob.
   Concentric machined rings (dashed = graduations) slowly counter-rotating
   around the glyph; four register dots orbit on the outer ring; the whole
   seal ignites (stroke brightens, rings accelerate, spark ignites) on hover.
   currentColor everywhere so it inherits the cyan. */
function ForgeSeal({ active, size }: { active: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className="pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {/* outer graduated ring — 48 fine graduations, the 6th longer (register) */}
      <g className="forge-ring-outer" style={{ transformOrigin: '24px 24px' }}>
        <circle
          cx="24" cy="24" r="21.5" fill="none"
          stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 1.8"
          opacity={active ? 0.95 : 0.55}
        />
        <circle
          cx="24" cy="24" r="18.8" fill="none"
          stroke="currentColor" strokeWidth="0.5" strokeDasharray="0.4 4.54"
          opacity={0.7}
        />
      </g>
      {/* inner reticle ring, counter-rotating */}
      <g
        className="forge-ring-inner"
        style={{ transformOrigin: '24px 24px', animationDuration: active ? '6s' : '14s' }}
      >
        <circle
          cx="24" cy="24" r="14.5" fill="none"
          stroke="currentColor" strokeWidth="0.7" strokeDasharray="10 6"
          opacity={active ? 0.9 : 0.45}
        />
        {/* four register dots riding the reticle */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <circle
              key={deg}
              cx={24 + Math.cos(rad) * 14.5}
              cy={24 + Math.sin(rad) * 14.5}
              r="1.3" fill="currentColor"
              opacity={active ? 1 : 0.6}
            />
          );
        })}
      </g>
      {/* the glyph — a forge plus with beveled terminals */}
      <g
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        opacity={active ? 1 : 0.85}
        style={{ transition: 'opacity .3s' }}
      >
        <line x1="24" y1="17.5" x2="24" y2="30.5" />
        <line x1="17.5" y1="24" x2="30.5" y2="24" />
      </g>
    </svg>
  );
}

export const ThinkingCloudTooltip: React.FC<ThinkingCloudTooltipProps> = ({
  label = 'Forge Reality Continuum',
  subtitle = 'Manifest a new parallel realm & disk directory',
  onClick,
  className = '',
  size = 'md',
  iconType = 'forge',
  position = 'bottom',
  id = 'thinking-cloud-forge',
  icon,
  active = false,
  hint = 'Click to initiate',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  /* VIEWPORT CLAMP (R101.2) — the old edge-guess flipped the cloud by class
     arithmetic (±175px, guessed) and still clipped: the anchor override left
     the `-translate-x-1/2` utility alive, so flipped clouds kept a hidden
     half-shift and rail/pod clouds lost their first word off-screen. Now the
     MOUNTED cloud is measured and shifted by exactly whatever keeps it
     inside the viewport — the shift rides `transform`, which composes with
     the anchor classes' `translate`, so every position is clamp-safe. */
  const cloudRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    if (!isHovered) {
      setShift((s) => (s.x === 0 && s.y === 0 ? s : { x: 0, y: 0 }));
      return;
    }
    const el = cloudRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    /* cumulative single-pass correction (the ThoughtCloud law — a replacing
       clamp measured against an already-shifted rect would oscillate) */
    setShift((s) => {
      let dx = 0;
      if (r.left < 8) dx = 8 - r.left;
      else if (r.right > window.innerWidth - 8) dx = window.innerWidth - 8 - r.right;
      let dy = 0;
      if (r.top < 8) dy = 8 - r.top;
      else if (r.bottom > window.innerHeight - 8) dy = window.innerHeight - 8 - r.bottom;
      if (dx === 0 && dy === 0) return s;
      return { x: s.x + dx, y: s.y + dy };
    });
  }, [isHovered, position]);

  /* puff chain anchor — the dots always ride the trigger's side of the card */
  const raise = () => setIsHovered(true);

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-13 h-13 text-base',
  }[size];

  const px = { sm: 36, md: 44, lg: 52 }[size];

  const posClasses = {
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  }[position];

  return (
    <div
      id={id}
      ref={wrapRef}
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={raise}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={raise}
      onBlur={() => setIsHovered(false)}
    >
      {/* THE SEAL — custom-icon triggers wear a neutral solid square seat
          (no blur); the built-in iconTypes keep their glass round seat */}
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={
          icon !== undefined
            ? `group relative flex items-center justify-center rounded-xl bg-black/45 border shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_6px_16px_rgba(0,0,0,0.30)] hover:bg-black/65 hover:border-white/30 active:scale-95 transition-all duration-300 cursor-pointer text-slate-300 hover:text-white ${
                active ? 'border-[rgb(var(--cc))]' : 'border-white/12'
              } ${sizeClasses}`
            : `forge-seal group relative flex items-center justify-center rounded-full bg-white/6 backdrop-blur-md border border-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_18px_rgb(34_211_238/0.18)] hover:border-cyan-300/70 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_0_30px_rgb(34_211_238/0.4)] active:scale-95 transition-all duration-300 cursor-pointer text-cyan-300 hover:text-cyan-100 ${sizeClasses}`
        }
        style={icon !== undefined && active ? { color: 'rgb(var(--cc))' } : undefined}
      >
        {icon !== undefined ? (
          <span className="relative flex items-center justify-center">{icon}</span>
        ) : iconType === 'forge' ? (
          <ForgeSeal active={isHovered} size={px} />
        ) : (
          <span className="relative flex items-center justify-center">
            {iconType === 'star' && (
              <Sparkles className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_#f59e0b]" />
            )}
            {iconType === 'singularity' && (
              <Wand2 className="w-5 h-5 text-violet-300 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_#8b5cf6]" />
            )}
            {iconType === 'plus' && (
              <Plus className="w-5 h-5 text-cyan-300 group-hover:text-white group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_#22d3ee]" />
            )}
          </span>
        )}
        {/* the ignition spark — a tiny forge-star that ignites on hover */}
        {iconType === 'forge' && (
          <span
            className={`absolute -top-0.5 -right-0.5 text-amber-300 transition-all duration-300 ${
              isHovered ? 'opacity-100 scale-110 drop-shadow-[0_0_6px_#fbbf24]' : 'opacity-70 scale-90'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
          </span>
        )}
      </button>

      {/* THE THOUGHT CARD — a clean rectangular glass pane that rises under
          the seal; a chain of thinking-dots pulses between them. */}
      {isHovered && (
        <div
          ref={cloudRef}
          className={`absolute ${posClasses} z-50 pointer-events-none select-none`}
          style={{
            transformOrigin: position === 'top' ? 'bottom center' : 'top center',
            transform: shift.x !== 0 || shift.y !== 0 ? `translate(${shift.x}px, ${shift.y}px)` : undefined,
          }}
        >          {/* the thinking chain — three dots pulsing from the trigger;
              always on the trigger's side of the card */}
          {position === 'bottom' && (
            <div className="relative h-5" aria-hidden="true">
              {[
                { cls: 'cc-thought-dot w-1.5 h-1.5', x: 'left-1/2 -translate-x-1/2' },
                { cls: 'cc-thought-dot cc-thought-dot-2 w-2 h-2', x: 'left-1/2 -translate-x-1/2' },
                { cls: 'cc-thought-dot w-2.5 h-2.5', x: 'left-1/2 -translate-x-1/2', style: { animationDelay: '0.56s' } },
              ].map((d, i) => (
                <span
                  key={i}
                  className={`absolute bottom-0 rounded-full bg-cyan-200 border border-cyan-300/70 shadow-[0_0_8px_rgba(103,232,249,0.6)] ${d.cls} ${d.x}`}
                  style={d.style}
                />
              ))}
            </div>
          )}

          {/* THE CARD — frosted pane, precision corner accents */}
          <div
            className={`cc-cloud-rise relative min-w-[250px] max-w-[320px] rounded-2xl bg-[#0a0d16]/88 border border-cyan-300/45 shadow-[0_18px_44px_rgba(0,0,0,0.55),0_0_34px_rgba(6,182,212,0.2),inset_0_1px_0_rgba(255,255,255,0.28)] text-left backdrop-blur-xl`}
          >
            {/* corner brackets — machined, not bubbly */}
            <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-cyan-300/70 rounded-tl-sm" aria-hidden="true" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r border-cyan-300/70 rounded-tr-sm" aria-hidden="true" />
            <span className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l border-cyan-300/70 rounded-bl-sm" aria-hidden="true" />
            <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-cyan-300/70 rounded-br-sm" aria-hidden="true" />

            {/* Content */}
            <div className="relative z-10 flex items-start gap-2.5 px-4 py-3">
              <div className="p-1.5 rounded-lg bg-cyan-400/15 border border-cyan-300/45 text-cyan-200 shrink-0 mt-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-violet-200 tracking-wide">
                    {label}
                  </span>
                </div>
                {subtitle && (
                  <p className="font-mono text-[9px] text-slate-200/85 mt-0.5 leading-tight">
                    {subtitle}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-1 font-mono text-[8px] text-cyan-300/90 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping inline-block" />
                  <span>{hint}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
