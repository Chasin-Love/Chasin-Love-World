import React, { useLayoutEffect, useRef, useState } from 'react';

/* THE THOUGHT CLOUD — the console's hover widget, the anime thinking-bubble
   manner (R101.2): wrap any quiet element and the words rise above it in a
   frost bubble trailing a chain of thinking dots. The card keeps only the
   numbers and the controls; every paragraph lives in a cloud like this one.
   The mounted bubble is MEASURED and shifted by whatever keeps it inside
   the viewport, so a hover near a screen edge can never clip the words. */
export function ThoughtCloud({
  label,
  subtitle,
  hint,
  children,
  className,
}: {
  label: string;
  subtitle?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!open) {
      setShift({ x: 0, y: 0 });
      return;
    }
    const el = bubbleRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = 0;
    let y = 0;
    if (r.left < 8) x = 8 - r.left;
    else if (r.right > window.innerWidth - 8) x = window.innerWidth - 8 - r.right;
    if (r.top < 8) y = 8 - r.top;
    else if (r.bottom > window.innerHeight - 8) y = window.innerHeight - 8 - r.bottom;
    setShift({ x, y });
  }, [open]);

  return (
    <span
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          ref={bubbleRef}
          className="absolute bottom-full left-1/2 z-50 mb-1 pointer-events-none select-none"
          style={{ transform: `translate(calc(-50% + ${shift.x}px), ${shift.y}px)` }}
        >
          {/* the bubble */}
          <div className="cc-cloud-rise min-w-[250px] max-w-[320px] rounded-2xl bg-[#0a0d16]/88 border border-white/15 shadow-[0_18px_44px_rgba(0,0,0,0.55),0_0_34px_rgba(6,182,212,0.16),inset_0_1px_0_rgba(255,255,255,0.22)]">
            {/* corner brackets — machined, like every cloud on the deck */}
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
              {subtitle && (
                <p className="font-mono text-[9.5px] text-slate-200/85 mt-1 leading-relaxed whitespace-pre-line">
                  {subtitle}
                </p>
              )}
              {hint && (
                <div className="mt-1.5 flex items-center gap-1 font-mono text-[8px] text-cyan-300/90 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping inline-block" />
                  <span>{hint}</span>
                </div>
              )}
            </div>
          </div>
          {/* the thinking chain — dots descending from the bubble to the trigger */}
          <div className="relative h-4" aria-hidden="true">
            {[
              { cls: 'cc-thought-dot w-2.5 h-2.5' },
              { cls: 'cc-thought-dot cc-thought-dot-2 w-2 h-2' },
              { cls: 'cc-thought-dot w-1.5 h-1.5', style: { animationDelay: '0.56s' } },
            ].map((d, i) => (
              <span
                key={i}
                className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-cyan-200 border border-cyan-300/70 shadow-[0_0_8px_rgba(103,232,249,0.6)] ${d.cls}`}
                style={d.style}
              />
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
