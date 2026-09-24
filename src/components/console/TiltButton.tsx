import React, { useCallback, useRef } from 'react';

/* browsers coalesce mousemove to frame rate anyway, so the transform is
   written directly in the handler — no rAF indirection, works everywhere */

type TiltButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** max tilt in degrees — small is premium, large is toy-like */
  maxTilt?: number;
  /** icon size lift in px — the glyph floats above the cap */
  lift?: number;
};

/**
 * THE 3D TILT CONTROL — a button that behaves like a physical key cap.
 *
 * The pointer's position within the button drives a real 3D rotation
 * (perspective + rotateX/rotateY), the face content rides closer to the
 * viewer on its own Z layer, and a specular glare tracks the pointer like
 * light glancing off glass. On leave, a spring settles it back flat.
 * Reduced-motion users get a static premium button instead.
 */
export const TiltButton: React.FC<TiltButtonProps> = ({
  maxTilt = 9,
  lift = 14,
  className = '',
  children,
  onMouseMove,
  onMouseLeave,
  ...rest
}) => {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onMouseMove?.(e);
      const el = ref.current;
      if (!el) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   /* 0..1 across the cap */
      const py = (e.clientY - r.top) / r.height;
      const rx = (0.5 - py) * maxTilt * 2;         /* tilt toward pointer */
      const ry = (px - 0.5) * maxTilt * 2;
      el.style.transform = `perspective(520px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(2px)`;
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
      el.style.setProperty('--glare', '1');
    },
    [maxTilt, onMouseMove],
  );

  const handleLeave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onMouseLeave?.(e);
      const el = ref.current;
      if (!el) return;
      /* spring back — CSS transition does the settle */
      el.style.transform = 'perspective(520px) rotateX(0deg) rotateY(0deg) translateZ(0)';
      el.style.setProperty('--glare', '0');
    },
    [onMouseLeave],
  );

  return (
    <button
      ref={ref}
      {...rest}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`tilt-btn ${className}`}
      style={{
        ['--lift' as string]: `${lift}px`,
        transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease, box-shadow 0.3s ease',
        willChange: 'transform',
      }}
    >
      <span className="tilt-face">{children}</span>
      <span className="tilt-glare" aria-hidden="true" />
    </button>
  );
};
