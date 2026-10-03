import React, { useLayoutEffect, useRef, useState } from 'react';

/* THE THOUGHT CLOUD — the console's hover widget, the anime thinking-bubble
   manner (R101.2): wrap any quiet element and the words rise beside it in a
   frost bubble trailing a chain of thinking dots. The card keeps only the
   numbers and the controls; every paragraph lives in a cloud like this one.

   PLACEMENT LAW (R101.3, the author's ruling — "the widget appears on the
   button, how am I supposed to click?"): the bubble NEVER covers its own
   trigger. It prefers ABOVE; when the viewport has no room above, it flips
   BELOW the trigger instead of sliding down onto it; the viewport clamp on
   both axes is the last-resort straightener, not the placement. The bubble
   is pointer-transparent, so a click always lands on the control under it. */
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
  const wrapRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [below, setBelow] = useState(false);
  const [shift, setShift] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!open) {
      /* functional updates that return the SAME state when unchanged — a
         fresh object here would re-render forever */
      setShift((s) => (s.x === 0 && s.y === 0 ? s : { x: 0, y: 0 }));
      setBelow((b) => (b ? false : b));
      return;
    }
    const wrap = wrapRef.current;
    const el = bubbleRef.current;
    if (!wrap || !el) return;
    const t = wrap.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    /* the flip: no honest room above → render below instead of covering the trigger */
    if (!below && t.top < b.height + 28 && t.bottom + b.height + 28 <= window.innerHeight) {
      setBelow(true);
      return; /* the effect re-runs on `below` and clamps the flipped rect */
    }
    /* CUMULATIVE correction — the measured rect already carries the current
       shift (the transform replaces, it does not add), so each pass adds its
       delta through the functional updater; the deltas converge to 0 and the
       identical-reference bail-out ends the cycle. A non-cumulative clamp
       oscillated between two positions forever (Maximum update depth — the
       crash the flip receipt caught on 2026-10-03). `shift` is deliberately
       NOT a dependency: the effect must never chase its own setState. */
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
          {!below && dots('top')}
        </div>
      )}
    </span>
  );
}
