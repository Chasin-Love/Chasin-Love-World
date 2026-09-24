import React, { useRef, useState } from 'react';
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
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  /* EDGE-AWARE PLACEMENT — near a screen/deck edge the centered cloud would
     clip (the deck plate is overflow-hidden), so the cloud anchors to the
     near edge instead: 'right' = cloud's right edge hugs the seal. */
  const [flipX, setFlipX] = useState<'none' | 'left' | 'right'>('none');
  const raise = () => {
    setIsHovered(true);
    const el = wrapRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setFlipX(r.right + 175 > window.innerWidth ? 'right' : r.left - 175 < 0 ? 'left' : 'none');
    }
  };

  /* puff chain anchor — the bubbles must always point at the seal */
  const puffAnchor =
    flipX === 'right'
      ? 'right-4 left-auto'
      : flipX === 'left'
        ? 'left-4 right-auto'
        : 'left-1/2 -translate-x-1/2';
  const puffAnchor2 =
    flipX === 'right'
      ? 'right-8 left-auto'
      : flipX === 'left'
        ? 'left-8 right-auto'
        : 'left-1/2 -translate-x-[14px]';

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
      {/* THE FORGE SEAL — machined rings + glass seat; no native title tooltip
          (the designed cloud IS the tooltip — a native one double-tooltips) */}
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`forge-seal group relative flex items-center justify-center rounded-full bg-white/6 backdrop-blur-md border border-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_18px_rgb(34_211_238/0.18)] hover:border-cyan-300/70 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_0_30px_rgb(34_211_238/0.4)] active:scale-95 transition-all duration-300 cursor-pointer text-cyan-300 hover:text-cyan-100 ${sizeClasses}`}
      >
        {iconType === 'forge' ? (
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

      {/* THE THINKING CLOUD / THOUGHT BUBBLE ANIMATION */}
      {isHovered && (
        <div
          className={`absolute ${posClasses} z-50 pointer-events-none select-none animate-in fade-in zoom-in-90`}
          style={{
            transformOrigin: position === 'top' ? 'bottom center' : 'top center',
            ...(flipX === 'right' ? { left: 'auto', right: '-6px', transform: 'none' } : {}),
            ...(flipX === 'left' ? { right: 'auto', left: '-6px', transform: 'none' } : {}),
          }}
        >
          {/* Puff 1: Smallest thought puff */}
          <div
            className={`absolute ${
              position === 'bottom' ? '-top-2.5' : 'bottom-0'
            } ${puffAnchor} w-2.5 h-2.5 rounded-full bg-abyss/85 backdrop-blur-md border border-cyan-300/60 shadow-[0_0_8px_rgba(6,182,212,0.4)] animate-bounce`}
            style={{ animationDuration: '2s' }}
          />

          {/* Puff 2: Medium thought puff */}
          <div
            className={`absolute ${
              position === 'bottom' ? '-top-1' : 'bottom-2'
            } ${puffAnchor2} w-4 h-4 rounded-full bg-abyss/85 backdrop-blur-md border border-cyan-300/70 shadow-[0_0_12px_rgba(6,182,212,0.5)]`}
          />

          {/* Puff 3: Large billowed cloud container — true glass now */}
          <div className="relative min-w-[250px] max-w-[320px] px-4 py-3 rounded-[24px] bg-abyss/60 backdrop-blur-2xl saturate-150 border border-cyan-300/50 shadow-[0_15px_35px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.25),inset_0_1px_0_rgba(255,255,255,0.25)] text-left">
            {/* Cloud Billow Decorative Puffs along perimeter */}
            <div className="absolute -top-2 left-4 w-6 h-6 rounded-full bg-abyss/60 border-t-2 border-l-2 border-cyan-300/50 -z-10" />
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-abyss/60 border-t-2 border-cyan-300/60 -z-10 shadow-[0_-4px_10px_rgba(6,182,212,0.2)]" />
            <div className="absolute -top-2 right-4 w-6 h-6 rounded-full bg-abyss/60 border-t-2 border-r-2 border-cyan-300/50 -z-10" />

            <div className="absolute -bottom-2 left-6 w-6 h-6 rounded-full bg-abyss/60 border-b-2 border-l-2 border-cyan-300/50 -z-10" />
            <div className="absolute -bottom-2 right-6 w-6 h-6 rounded-full bg-abyss/60 border-b-2 border-r-2 border-cyan-300/50 -z-10" />

            {/* Content inside cloud */}
            <div className="relative z-10 flex items-start gap-2.5">
              <div className="p-1.5 rounded-xl bg-cyan-400/15 border border-cyan-300/50 text-cyan-200 shrink-0 mt-0.5 shadow-[0_0_10px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]">
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
                  <span>Click to initiate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
