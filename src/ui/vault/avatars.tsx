import { lazy, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { actions } from '../../state';

/* the real editor (VS Code engine) — loaded in its own chunk on first open */
const MonacoCodeEditor = lazy(() =>
  import('./MonacoCodeEditor').then((m) => ({ default: m.MonacoCodeEditor })),
);
import type { AvatarFit, VaultUser } from '../../domain/vault';
import {
  
  IcUser, 
} from '../bits';
import { toast } from '../toast';

import { coverCrop, clampFit, processAvatar } from './helpers';
/* ================================ avatars ================================ */

export function AvatarMedia({ src, alt, size, fit, className = '' }: { src: string; alt: string; size: number; fit?: AvatarFit | null; className?: string }) {
  const cls = `rounded-full object-cover border border-teal-ice/40 ${className}`;
  const ref = useRef<HTMLVideoElement>(null);
  /* only true video sources play in a <video> — photos & GIFs render as <img> */
  const isVideo = src.startsWith('data:video') || src.startsWith('blob:');
  /* read the media's real dimensions so the crop matches the compose preview
     exactly (a hardcoded ratio would stretch portrait / square images) */
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setDims(null);
    if (isVideo) {
      const v = document.createElement('video');
      v.onloadedmetadata = () => setDims({ w: v.videoWidth || 16, h: v.videoHeight || 9 });
      v.src = src;
    } else {
      const im = new Image();
      im.onload = () => setDims({ w: im.naturalWidth || 16, h: im.naturalHeight || 9 });
      im.src = src;
    }
  }, [src, isVideo]);
  useEffect(() => {
    const v = ref.current;
    if (!isVideo || !v) return;
    v.muted = true;
    const tryPlay = () => { v.play().catch(() => undefined); };
    tryPlay();
    v.addEventListener('loadeddata', tryPlay);
    v.addEventListener('canplay', tryPlay);
    const iv = setInterval(tryPlay, 700);
    const stop = setTimeout(() => clearInterval(iv), 3500);
    return () => { clearInterval(iv); clearTimeout(stop); v.removeEventListener('loadeddata', tryPlay); v.removeEventListener('canplay', tryPlay); };
  }, [isVideo, src]);
  const f: AvatarFit = fit ?? { zoom: 1, px: 0, py: 0 };
  const d = dims ?? { w: 16, h: 9 };
  const { dw, dh, dx, dy } = coverCrop(d.w, d.h, size, clampFit(f, d.w, d.h));
  const style = { position: 'absolute' as const, left: dx, top: dy, width: dw, height: dh, maxWidth: 'none' as const };
  if (isVideo) {
    return (
      <span className="av-live" style={{ width: size, height: size }}>
        <span className="absolute inset-0 rounded-full overflow-hidden">
          <video ref={ref} key={src.slice(0, 48)} src={src} style={style} className={cls} autoPlay loop muted playsInline preload="auto" />
        </span>
      </span>
    );
  }
  return (
    <span className="relative inline-block rounded-full overflow-hidden border border-teal-ice/40" style={{ width: size, height: size }}>
      <img src={src} alt={alt} draggable={false} style={style} className={cls} />
    </span>
  );
}

export function FrameCycler({ frames, fps, size, alt, fit }: { frames: string[]; fps: number; size: number; alt: string; fit?: AvatarFit | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    g.scale(dpr, dpr);
    const imgs = frames.map((src) => { const im = new Image(); im.src = src; return im; });
    let i = 0, raf = 0, last = 0;
    const interval = 1000 / Math.max(1, fps);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < interval) return;
      last = now;
      const im = imgs[i % imgs.length];
      if (im && im.complete && im.naturalWidth) { g.clearRect(0, 0, size, size); g.drawImage(im, 0, 0, size, size); }
      i++;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, fps, size]);
  void alt; void fit;
  return (
    <span className="av-live" style={{ width: size, height: size }}>
      <canvas ref={ref} style={{ width: size, height: size }} className="rounded-full border border-teal-ice/40" />
    </span>
  );
}

/* crossfades between two avatar states — the outgoing face blurs away while
   the incoming one sharpens in, so switching never feels like a hard swap */
function Crossfade({ sig, size, children }: { sig: string; size: number; children: React.ReactNode }) {
  const [cur, setCur] = useState<{ sig: string; node: React.ReactNode }>({ sig, node: children });
  const [prev, setPrev] = useState<{ sig: string; node: React.ReactNode } | null>(null);
  useEffect(() => {
    if (sig === cur.sig) return;
    setPrev(cur);
    setCur({ sig, node: children });
    const t = setTimeout(() => setPrev(null), 420);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return (
    <span className="relative inline-block overflow-hidden rounded-full" style={{ width: size, height: size }}>
      {prev && <span className="absolute inset-0 avatar-out pointer-events-none" aria-hidden>{prev.node}</span>}
      <span key={cur.sig} className="absolute inset-0 avatar-in">{cur.node}</span>
    </span>
  );
}

function Avatar({ user, size = 44 }: { user: VaultUser | null; size?: number }) {
  let node: React.ReactNode;
  let sig: string;
  if (user?.avatarFrames && user.avatarFrames.length) {
    sig = `frames:${user.avatarFrames.length}:${user.avatarFps ?? 0}:${(user.avatarFrames[0] ?? '').slice(0, 32)}`;
    node = <FrameCycler frames={user.avatarFrames} fps={user.avatarFps ?? 9} size={size} alt={user.name} fit={user.avatarFit} />;
  } else if (user?.avatar) {
    sig = `img:${user.avatar.slice(0, 48)}:${user.avatarFit?.zoom ?? 1}`;
    node = <AvatarMedia src={user.avatar} alt={user.name} size={size} fit={user.avatarFit} />;
  } else {
    sig = 'none';
    node = (
      <span style={{ width: size, height: size }} className="rounded-full border border-teal-ice/30 grid place-items-center text-teal-ice/70 bg-teal-ice/5">
        <IcUser size={size * 0.46} />
      </span>
    );
  }
  return <Crossfade sig={sig} size={size}>{node}</Crossfade>;
}

/* what an avatar is made of — shown as a tiny badge on horizon cards */
export function avatarKind(u: VaultUser): 'living' | 'animated' | 'photo' | 'none' {
  if (u.avatarFrames && u.avatarFrames.length) return 'living';
  if (u.avatar) {
    if (u.avatar.startsWith('data:image/gif') || u.avatar.startsWith('data:image/apng')) return 'animated';
    if (u.avatar.startsWith('data:video') || u.avatar.startsWith('blob:')) return 'living';
    return 'photo';
  }
  return 'none';
}
export function AvatarKindBadge({ kind }: { kind: 'living' | 'animated' | 'photo' | 'none' }) {
  if (kind === 'none') return null;
  /* living = pulsing dot · animated = twin-frame glyph · photo = still dot */
  return (
    <span className="avatar-type-badge" title={kind === 'living' ? 'living loop' : kind === 'animated' ? 'animated' : 'photo'}>
      {kind === 'living' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-teal-ice pulse-soft" />
      ) : kind === 'animated' ? (
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="1" y="2.5" width="5.5" height="5.5" rx="1" /><rect x="3.5" y="1" width="5.5" height="5.5" rx="1" opacity="0.5" />
        </svg>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full border border-teal-ice/80" />
      )}
    </span>
  );
}

/* ------------------------------ crop modal ------------------------------- */

export function AvatarCropModal({ src, kind, initial, onCancel, onDone }: {
  src: string; kind: 'image' | 'video'; initial: AvatarFit; onCancel: () => void;
  onDone: (fit: AvatarFit) => void;
}) {
  const SIZE = 260;
  const [fit, setFit] = useState(initial);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (kind === 'image') {
      const im = new Image();
      im.onload = () => setDims({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 });
      im.src = src;
    } else {
      const v = document.createElement('video');
      v.onloadedmetadata = () => setDims({ w: v.videoWidth || 16, h: v.videoHeight || 9 });
      v.src = src;
    }
  }, [src, kind]);

  const clamped = dims ? clampFit(fit, dims.w, dims.h) : { ...fit, zoom: Math.min(3, Math.max(1, fit.zoom)) };
  const { dw, dh, dx, dy } = dims ? coverCrop(dims.w, dims.h, SIZE, clamped) : { dw: SIZE, dh: SIZE, dx: 0, dy: 0 };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return; }
      if (!dims) return;
      const N = 0.03;
      if (e.key === 'ArrowLeft') { e.preventDefault(); setFit((f) => clampFit({ ...f, px: f.px - N }, dims.w, dims.h)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setFit((f) => clampFit({ ...f, px: f.px + N }, dims.w, dims.h)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setFit((f) => clampFit({ ...f, py: f.py - N }, dims.w, dims.h)); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFit((f) => clampFit({ ...f, py: f.py + N }, dims.w, dims.h)); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel, dims]);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: clamped.px, py: clamped.py };
    setDragging(true);
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !dims) return;
    const nx = drag.current.px + (e.clientX - drag.current.x) / SIZE;
    const ny = drag.current.py + (e.clientY - drag.current.y) / SIZE;
    setFit((f) => clampFit({ ...f, px: nx, py: ny }, dims.w, dims.h));
  };
  const onUp = () => { drag.current = null; setDragging(false); };
  const nudge = (ddx: number, ddy: number) => {
    if (!dims) return;
    setTouched(true);
    setFit((f) => clampFit({ ...f, px: f.px + ddx * 0.03, py: f.py + ddy * 0.03 }, dims.w, dims.h));
  };

  return createPortal(
    <div className="fixed inset-0 z-132 flex items-center justify-center overlay-in" style={{ background: 'rgba(3,5,10,0.78)' }} onClick={onCancel}>
      <div className="vault-glass w-85 max-w-[94vw] rise-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-2 text-center">
          <p className="font-display text-[13px] tracking-[0.24em] text-paper">COMPOSE AVATAR</p>
          <p className="text-[10.5px] text-slate-dim mt-1.5">drag to choose the region · scroll or slide to zoom · arrows nudge · double-click recenters</p>
        </div>
        <div className="flex items-center justify-center gap-3 pb-4">
          <button onClick={() => nudge(-1, 0)} className="crop-nudge" title="nudge left">←</button>
          <div className="flex flex-col items-center gap-1.5">
            <button onClick={() => nudge(0, -1)} className="crop-nudge" title="nudge up">↑</button>
            <div
              ref={boxRef}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              onDoubleClick={() => { setFit({ zoom: 1, px: 0, py: 0 }); setTouched(true); }}
              onWheel={(e) => { if (!dims) return; setTouched(true); setFit((f) => clampFit({ ...f, zoom: f.zoom - e.deltaY * 0.0012 }, dims.w, dims.h)); }}
              className={`crop-stage relative rounded-full overflow-hidden select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ width: SIZE, height: SIZE, touchAction: 'none' }}
            >
              {kind === 'video' ? (
                <video src={src} autoPlay loop muted playsInline style={{ position: 'absolute', left: dx, top: dy, width: dw, height: dh, maxWidth: 'none', pointerEvents: 'none' }} />
              ) : (
                <img src={src} alt="avatar crop" draggable={false} style={{ position: 'absolute', left: dx, top: dy, width: dw, height: dh, maxWidth: 'none', pointerEvents: 'none' }} />
              )}
              <span className="crop-rule" style={{ left: '33.4%', top: '12%', bottom: '12%', width: 1 }} />
              <span className="crop-rule" style={{ left: '66.6%', top: '12%', bottom: '12%', width: 1 }} />
              <span className="crop-guide" />
              {!touched && (
                <span className="absolute inset-0 grid place-items-center pointer-events-none">
                  <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-paper bg-void/70 border border-teal-ice/40 px-3 py-1.5 pulse-soft">drag here</span>
                </span>
              )}
            </div>
            <button onClick={() => nudge(0, 1)} className="crop-nudge" title="nudge down">↓</button>
          </div>
          <button onClick={() => nudge(1, 0)} className="crop-nudge" title="nudge right">→</button>
        </div>
        <div className="px-6 pb-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-slate-dim w-10">zoom</span>
            <input type="range" min={1} max={3} step={0.01} value={clamped.zoom}
              onChange={(e) => { setTouched(true); setFit((f) => ({ ...f, zoom: Number(e.target.value) })); }}
              className="pw-range flex-1" />
            <span className="font-mono text-[9px] text-teal-ice w-10 text-right">{clamped.zoom.toFixed(2)}×</span>
          </div>
        </div>
        {/* live preview at the three sizes the avatar actually appears at */}
        <div className="px-6 pb-2 pt-3 border-t border-line/30 mt-2">
          <p className="font-mono text-[7.5px] tracking-[0.24em] uppercase text-slate-dim text-center mb-3">as it will appear</p>
          <div className="crop-previews">
            <div className="crop-preview"><AvatarMedia src={src} alt="" size={30} fit={clamped} /><span>chip</span></div>
            <div className="crop-preview"><AvatarMedia src={src} alt="" size={56} fit={clamped} /><span>horizon</span></div>
            <div className="crop-preview"><AvatarMedia src={src} alt="" size={80} fit={clamped} /><span>key gate</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4">
          <button onClick={onCancel} className="font-mono text-[9px] tracking-[0.22em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
          <button onClick={() => onDone(clamped)} className="font-mono text-[9px] tracking-[0.22em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors">
            seal avatar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------ avatar picker ---------------------------- */

export function AvatarPicker({ userId, current, size = 44, onSelect }: { userId: string; current: VaultUser; size?: number; onSelect?: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [crop, setCrop] = useState<{ src: string; note: string; kind: 'image' | 'video'; file?: File } | null>(null);

  const openPicker = () => { const inp = ref.current; if (inp) { inp.value = ''; inp.click(); } };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.detail >= 2) {
      if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
      openPicker();
      return;
    }
    if (!onSelect) { openPicker(); return; }
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickTimer.current = null; onSelect(); }, 240);
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.type.startsWith('video/')) {
      setCrop({ src: URL.createObjectURL(f), note: 'living loop', kind: 'video', file: f });
      return;
    }
    try {
      const av = await processAvatar(f);
      if (av.dataUrl && !av.frames) { setCrop({ src: av.dataUrl, note: av.note, kind: 'image' }); return; }
      actions.updateUser(userId, { avatar: av.dataUrl ?? null, avatarFrames: av.frames ?? null, avatarFps: av.fps ?? null, avatarNote: av.note });
      toast(`avatar updated · ${av.note}`);
    } catch {
      toast('could not read that file as an avatar', 'warn');
    }
  };

  return (
    <>
      <button
        type="button"
        className="relative block cursor-pointer rounded-full p-0 border-0 bg-transparent transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"
        style={{ width: size, height: size }}
        title="click — present key · double-click — change photo / gif / video"
        onClick={handleClick}
      >
        <Avatar user={current} size={size} />
      </button>
      <input ref={ref} type="file" accept="image/gif,image/apng,image/png,image/jpeg,image/webp,video/*" className="hidden"
        onChange={(e) => { void pick(e.target.files?.[0]); }} />
      {crop && (
        <AvatarCropModal
          src={crop.src}
          kind={crop.kind}
          initial={current.avatarFit ?? { zoom: 1, px: 0, py: 0 }}
          onCancel={() => { if (crop.kind === 'video') URL.revokeObjectURL(crop.src); setCrop(null); }}
          onDone={async (fit) => {
            if (crop.kind === 'video' && crop.file) {
              toast('forging a living loop…');
              try {
                const av = await processAvatar(crop.file, fit);
                actions.updateUser(userId, { avatar: av.dataUrl ?? null, avatarFrames: av.frames ?? null, avatarFps: av.fps ?? null, avatarFit: fit, avatarNote: av.note });
                toast(`avatar updated · ${av.note}`);
              } catch { toast('could not forge that clip', 'warn'); }
              URL.revokeObjectURL(crop.src);
            } else {
              actions.updateUser(userId, { avatar: crop.src, avatarFit: fit, avatarFrames: null, avatarNote: crop.note });
              toast(`avatar updated · ${crop.note}`);
            }
            setCrop(null);
          }}
        />
      )}
    </>
  );
}

