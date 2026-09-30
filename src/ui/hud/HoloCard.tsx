import React from 'react';

export interface HoverDisk { cx: number; cy: number; r: number }
interface HoloStem { x1: number; y1: number; x2: number; y2: number }

/** THE HERALD'S PLACEMENT (R74) — the card never stands on the thing it
    heralds. All four sides of the disk are scored (clamped penetration into
    the circle, then viewport fit, then the side the traveler approached
    from) and the cleanest one wins — so even on a cramped viewport the card
    clears as much of the disk as geometry allows. The stem stays honest no
    matter where the card lands: it always runs from the card's near edge to
    the disk's true rim. */
export function placeHoloCard(
  disk: HoverDisk | null | undefined,
  pointer: { x: number; y: number } | null | undefined,
  cardW: number,
  cardH: number,
): { left: number; top: number; stem: HoloStem | null } {
  const pad = 14;
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (disk && pointer) {
    let dx = pointer.x - disk.cx;
    let dy = pointer.y - disk.cy;
    const len = Math.hypot(dx, dy);
    if (len < 1) { dx = 0.7071; dy = -0.7071; } /* dwelling on the center — herald up-right */
    const ux = dx / (len || 1);
    const uy = dy / (len || 1);
    const rimX = disk.cx + ux * disk.r;
    const rimY = disk.cy + uy * disk.r;
    /* the four sides, anchored just past the disk's rim */
    const candidates = [
      { left: disk.cx + disk.r + gap, top: disk.cy - cardH / 2 },
      { left: disk.cx - cardW - disk.r - gap, top: disk.cy - cardH / 2 },
      { left: disk.cx - cardW / 2, top: disk.cy - disk.r - gap - cardH },
      { left: disk.cx - cardW / 2, top: disk.cy + disk.r + gap },
    ];
    let best = candidates[0];
    let bestScore = Infinity;
    for (const c of candidates) {
      const left = Math.min(Math.max(pad, c.left), vw - cardW - pad);
      const top = Math.min(Math.max(pad, c.top), vh - cardH - pad);
      /* how deep the clamped card bites into the disk circle */
      const nx = Math.min(Math.max(disk.cx, left), left + cardW);
      const ny = Math.min(Math.max(disk.cy, top), top + cardH);
      const pen = Math.max(0, disk.r - Math.hypot(nx - disk.cx, ny - disk.cy));
      /* the herald prefers the side its traveler approached from */
      const align = (c.left > disk.cx ? ux : -ux) + (c.top > disk.cy ? uy : -uy);
      const clampCost = Math.abs(left - c.left) + Math.abs(top - c.top);
      const score = pen * 1000 + clampCost * 0.5 - align * 10;
      if (score < bestScore) { bestScore = score; best = { left, top }; }
    }
    const stem: HoloStem = {
      x1: Math.min(Math.max(rimX, best.left), best.left + cardW),
      y1: Math.min(Math.max(rimY, best.top), best.top + cardH),
      x2: rimX,
      y2: rimY,
    };
    return { left: best.left, top: best.top, stem };
  }
  if (pointer) {
    let left = pointer.x + 24;
    let top = pointer.y - 40;
    if (left + cardW > vw - pad) left = pointer.x - cardW - 24;
    top = Math.min(Math.max(pad, top), vh - cardH - pad);
    left = Math.min(Math.max(pad, left), vw - cardW - pad);
    return { left, top, stem: null };
  }
  return { left: 32, top: vh - 320, stem: null };
}

/** THE HOLOGRAPHIC HERALD (R74) — the shared hover-card shell: an animated
    holo border in the object's own palette, a 3D perspective entrance, and
    a dashed stem that plugs the card into the object's disk edge. The shell
    is pointer-events-none throughout — the herald can never steal a click
    aimed at the thing it announces; the content's own buttons stay
    pointer-events-auto. `id` re-keys the shell per object so the entrance
    plays on every new subject. */
export const HoloCardShell: React.FC<{
  id: string;
  accent: string;
  disk?: HoverDisk | null;
  pointer?: { x: number; y: number } | null;
  width: number;
  height: number;
  children: React.ReactNode;
}> = ({ id, accent, disk, pointer, width, height, children }) => {
  const place = placeHoloCard(disk, pointer, width, height);
  return (
    <>
      {place.stem && (
        <svg className="fixed inset-0 z-40 pointer-events-none" width="100%" height="100%" aria-hidden="true">
          <line
            x1={place.stem.x1} y1={place.stem.y1} x2={place.stem.x2} y2={place.stem.y2}
            stroke={accent} strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 4"
            className="holo-stem-flow"
          />
          <circle cx={place.stem.x2} cy={place.stem.y2} r="3" fill={accent} className="holo-stem-dot" />
        </svg>
      )}
      <div
        key={id}
        className="holo-card fixed z-50 pointer-events-none select-none"
        style={{ left: `${place.left}px`, top: `${place.top}px`, width: `${width}px`, ['--holo-accent' as string]: accent }}
      >
        <div className="holo-card-border">
          <div className="holo-card-inner">{children}</div>
        </div>
      </div>
    </>
  );
};
