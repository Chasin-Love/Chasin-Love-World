import { AvatarPicker, AvatarKindBadge, FrameCycler, AvatarMedia, AvatarCropModal, avatarKind } from './avatars';
import { lazy, useEffect, useRef, useState } from 'react';
import { actions, newId } from '../../state';

/* the real editor (VS Code engine) — loaded in its own chunk on first open */
const MonacoCodeEditor = lazy(() =>
  import('./MonacoCodeEditor').then((m) => ({ default: m.MonacoCodeEditor })),
);
import {
  checkVerifier, decryptRecords, encryptRecords,
  isSealHardened, 
  
  
  
  KDF_LEGACY_ROUNDS, KDF_TARGET_ROUNDS, makeVerifier, 
  
  fmtDate,
  
  
  
  
  
  
} from '../../vault';
import type { AvatarFit, VaultUser } from '../../domain/vault';
import {
  IcLock, 
  IcUser, useUniverse,
} from '../bits';
import { toast } from '../toast';

import { processAvatar } from './helpers';
/* =============================== backdrop ================================ */

export function VaultBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    let raf = 0;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const resize = () => { cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr; };
    resize();
    window.addEventListener('resize', resize);
    const stars = Array.from({ length: 320 }, () => ({
      x: Math.random(), y: Math.random(),
      s: Math.random() * 1.5 + 0.3,
      p: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 0.9,
      hue: Math.random() > 0.75 ? (Math.random() > 0.5 ? 'warm' : 'cyan') : 'ice',
    }));
    const matter = Array.from({ length: 160 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 0.25 + Math.random() * 0.75,
      s: 0.0003 + Math.random() * 0.0014,
      sz: Math.random() * 2 + 0.4,
      hue: Math.random() > 0.4 ? 'teal' : 'amber',
    }));
    const t0 = performance.now();
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = (now - t0) / 1000;
      const w = cv.width, h = cv.height;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, w, h);
      const cx = w * 0.5, cy = h * 0.54;
      const R = Math.min(w, h) * 0.38;

      /* deep space cosmic gradients */
      const washA = g.createRadialGradient(w * 0.18, h * 0.26, 0, w * 0.18, h * 0.26, Math.max(w, h) * 0.65);
      washA.addColorStop(0, 'rgba(40,128,120,0.38)');
      washA.addColorStop(0.45, 'rgba(20,64,88,0.22)');
      washA.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = washA; g.fillRect(0, 0, w, h);

      const washB = g.createRadialGradient(w * 0.85, h * 0.75, 0, w * 0.85, h * 0.75, Math.max(w, h) * 0.6);
      washB.addColorStop(0, `rgba(180,110,48,${(0.24 + 0.06 * Math.sin(t * 0.35)).toFixed(3)})`);
      washB.addColorStop(0.5, 'rgba(90,48,70,0.15)');
      washB.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = washB; g.fillRect(0, 0, w, h);

      const washC = g.createRadialGradient(cx, cy * 0.8, 0, cx, cy * 0.8, Math.max(w, h) * 0.5);
      washC.addColorStop(0, `rgba(75,45,120,${(0.18 + 0.04 * Math.cos(t * 0.25)).toFixed(3)})`);
      washC.addColorStop(0.6, 'rgba(20,30,60,0.08)');
      washC.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = washC; g.fillRect(0, 0, w, h);

      /* shimmering crystal stars */
      stars.forEach((s) => {
        const tw = 0.35 + 0.55 * Math.abs(Math.sin(t * s.sp + s.p));
        if (s.hue === 'warm') g.fillStyle = `rgba(255,225,170,${(tw * 0.9).toFixed(3)})`;
        else if (s.hue === 'cyan') g.fillStyle = `rgba(140,240,230,${(tw * 0.95).toFixed(3)})`;
        else g.fillStyle = `rgba(215,232,255,${(tw * 0.85).toFixed(3)})`;
        g.fillRect(s.x * w, s.y * h, s.s * dpr, s.s * dpr);
      });

      /* shimmering orbital accretion arcs */
      for (let ring = 0; ring < 4; ring++) {
        const rr = R * (0.55 + ring * 0.18);
        g.strokeStyle = ring === 1
          ? 'rgba(245,195,120,0.55)'
          : ring === 2
          ? 'rgba(130,225,210,0.5)'
          : 'rgba(111,194,180,0.35)';
        g.lineWidth = (2.6 - ring * 0.45) * dpr;
        const start = t * (0.2 + ring * 0.06) * (ring % 2 ? -1 : 1);
        g.beginPath();
        g.arc(cx, cy, rr, start, start + Math.PI * (1.1 + 0.3 * Math.sin(t * 0.35 + ring)));
        g.stroke();
      }

      /* infalling matter and radiant motes */
      matter.forEach((m) => {
        m.a += m.s * 18;
        m.r -= 0.0006;
        if (m.r < 0.12) { m.r = 0.6 + Math.random() * 0.4; m.a = Math.random() * Math.PI * 2; }
        const x = cx + Math.cos(m.a) * R * m.r * 1.55;
        const y = cy + Math.sin(m.a) * R * m.r * 0.82;
        const al = Math.min(1, (0.6 - m.r) * 2 + 0.2);
        g.fillStyle = m.hue === 'amber' ? `rgba(245,195,120,${al.toFixed(3)})` : `rgba(140,225,210,${al.toFixed(3)})`;
        g.beginPath();
        g.arc(x, y, m.sz * dpr, 0, Math.PI * 2);
        g.fill();
      });

      /* luminous eventide horizon core */
      const glow = g.createRadialGradient(cx, cy, R * 0.08, cx, cy, R * 0.55);
      glow.addColorStop(0, 'rgba(0,0,0,0.92)');
      glow.addColorStop(0.5, 'rgba(8,14,24,0.48)');
      glow.addColorStop(0.8, `rgba(111,215,200,${(0.14 + 0.05 * Math.sin(t * 0.85)).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(111,215,200,0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(cx, cy, R * 0.55, 0, Math.PI * 2); g.fill();
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.95 }} />;
}

/* ================================= gate ================================== */

export function Gate({ onEnter }: { onEnter: (u: VaultUser, masterPass: string) => Promise<void> | void }) {
  const state = useUniverse();
  const [phase, setPhase] = useState<'select' | 'password' | 'create'>(state.vaultUsers.length ? 'select' : 'create');
  const [pending, setPending] = useState<VaultUser | null>(null);
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [key1, setKey1] = useState('');
  const [key2, setKey2] = useState('');
  const [avatar, setAvatar] = useState<{ dataUrl: string | null; frames?: string[]; fps?: number; fit?: AvatarFit; note: string } | null>(null);
  const [crop, setCrop] = useState<{ src: string; note: string; kind: 'image' | 'video'; file?: File } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [lockLeft, setLockLeft] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const fail = (msg: string) => { setErr(msg); setShake((s) => s + 1); };

  const guardKey = (id: string) => `eventide:guard:${id}`;
  const readGuard = (id: string): { fails: number; until: number } | null => {
    try { return JSON.parse(localStorage.getItem(guardKey(id)) || 'null'); } catch { return null; }
  };
  const writeGuard = (id: string, g: { fails: number; until: number } | null) => {
    try { if (g) localStorage.setItem(guardKey(id), JSON.stringify(g)); else localStorage.removeItem(guardKey(id)); } catch { /* */ }
  };

  useEffect(() => {
    if (!pending) return;
    const g = readGuard(pending.id);
    const left = g ? Math.max(0, Math.ceil((g.until - Date.now()) / 1000)) : 0;
    setLockLeft(left);
    if (left <= 0) return;
    const iv = setInterval(() => {
      const gg = readGuard(pending.id);
      const l = gg ? Math.max(0, Math.ceil((gg.until - Date.now()) / 1000)) : 0;
      setLockLeft(l);
      if (l <= 0) clearInterval(iv);
    }, 500);
    return () => clearInterval(iv);
  }, [pending, shake]);

  const tryUnlock = async () => {
    if (!pending || busy || lockLeft > 0) return;
    setBusy(true); setErr('');
    try {
      const ok = await checkVerifier(pass, pending.salt, pending.verifier, pending.kdfRounds ?? KDF_LEGACY_ROUNDS);
      if (!ok) {
        const g = readGuard(pending.id) ?? { fails: 0, until: 0 };
        const fails = g.fails + 1;
        const lock = fails >= 3 ? Math.min(300, 30 * Math.pow(2, fails - 3)) : 0;
        writeGuard(pending.id, { fails, until: Date.now() + lock * 1000 });
        setShake((s) => s + 1);
        setErr(lock > 0 ? `wrong key — sealed for ${lock}s after ${fails} attempts` : `wrong key — ${fails}/3 before lockout`);
        return;
      }
      writeGuard(pending.id, null);
      actions.touchUser(pending.id);
      /* silent re-hardening of legacy verifiers */
      if ((pending.kdfRounds ?? KDF_LEGACY_ROUNDS) < KDF_TARGET_ROUNDS) {
        const v = await makeVerifier(pass, KDF_TARGET_ROUNDS);
        actions.updateUser(pending.id, { salt: v.salt, verifier: v.verifier, kdfRounds: KDF_TARGET_ROUNDS });
        if (state.secrets && !isSealHardened(state.secrets) && state.secrets.kdf !== 'argon2id') {
          try {
            const recs = await decryptRecords(pass, state.secrets);
            actions.setSecrets(await encryptRecords(pass, recs));
          } catch { /* leave records as-is */ }
        }
      }
      await onEnter(pending, pass);
    } finally { setBusy(false); }
  };

  const create = async () => {
    if (busy) return;
    if (!name.trim()) { fail('an identity needs a name'); return; }
    if (key1.length < 6) { fail('the master key needs at least 6 characters'); return; }
    if (key1 !== key2) { fail('the keys do not match'); return; }
    setBusy(true); setErr('');
    try {
      const v = await makeVerifier(key1, KDF_TARGET_ROUNDS);
      const user: VaultUser = {
        id: newId(), name: name.trim(),
        avatar: avatar?.dataUrl ?? null,
        avatarFrames: avatar?.frames ?? null,
        avatarFps: avatar?.fps ?? null,
        avatarFit: avatar?.fit ?? null,
        avatarNote: avatar?.note ?? null,
        createdAt: Date.now(), lastSeen: Date.now(), salt: v.salt, verifier: v.verifier,
        kdfRounds: KDF_TARGET_ROUNDS,
      };
      actions.addUser(user);
      await onEnter(user, key1);
    } finally { setBusy(false); }
  };

  return (
    <div className="flex-1 grid place-items-center overflow-y-auto thin-scroll">
      {phase === 'select' && (
        <div className="text-center max-w-140 px-8">
          <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-teal-ice/80">identity horizon</p>
          <h2 className="font-display text-[22px] font-medium tracking-[0.28em] text-paper mt-2">WHO CROSSES?</h2>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {state.vaultUsers.map((u, i) => (
              <div key={u.id} className="identity-card group" style={{ animationDelay: `${i * 70}ms` }}
                onClick={() => { setPending(u); setPass(''); setErr(''); setPhase('password'); }}
                role="button" tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (setPending(u), setPass(''), setErr(''), setPhase('password'))}
                title={`${u.name} — click to present key, double-click the face to change it`}
              >
                <span className="avatar-ring">
                  <AvatarPicker userId={u.id} current={u} size={68} onSelect={() => { setPending(u); setPass(''); setErr(''); setPhase('password'); }} />
                  <AvatarKindBadge kind={avatarKind(u)} />
                </span>
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-slate-soft group-hover:text-teal-ice transition-colors truncate max-w-full leading-tight">
                  {u.name}
                </span>
                <span className="font-mono text-[7.5px] tracking-[0.14em] uppercase text-slate-dim -mt-1">last crossed {fmtDate(u.lastSeen)}</span>
              </div>
            ))}
            <button
              className="identity-card new group"
              style={{ animationDelay: `${state.vaultUsers.length * 70}ms` }}
              onClick={() => { setPhase('create'); setErr(''); }}
            >
              <span className="w-17 h-17 rounded-full border border-dashed border-slate-dim/40 grid place-items-center text-slate-dim group-hover:border-solar/60 group-hover:text-solar transition-colors">
                <IcUser size={26} />
              </span>
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim group-hover:text-solar transition-colors">forge new</span>
            </button>
          </div>
          <p className="font-mono text-[8px] tracking-[0.22em] uppercase text-slate-dim/70 mt-6">
            click a card to present its key · double-click a face to change its photo / gif / clip
          </p>
        </div>
      )}

      {phase === 'password' && pending && (
        <div key={shake} className={`text-center w-85 ${shake ? 'shake' : ''}`}>
          <button onClick={() => setPhase('select')} className="font-mono text-[8.5px] tracking-[0.26em] uppercase text-slate-dim hover:text-paper transition-colors">← all identities</button>
          <div className="flex justify-center mt-7">
            <span className="avatar-ring">
              <AvatarPicker userId={pending.id} current={pending} size={92} onSelect={() => undefined} />
              <AvatarKindBadge kind={avatarKind(pending)} />
            </span>
          </div>
          <p className="font-display text-[16px] tracking-[0.24em] text-paper mt-5">{pending.name}</p>
          <p className="font-mono text-[7.5px] tracking-[0.2em] uppercase text-slate-dim mt-1.5">present your master key</p>
          <input
            autoFocus type="password" value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void tryUnlock()}
            placeholder="master key"
            className="field w-full px-4 py-2.5 mt-5 font-mono text-[12px] text-paper text-center placeholder:text-slate-dim/60"
          />
          {err && <p className="font-mono text-[9.5px] tracking-[0.14em] text-red-300 mt-3">{err}</p>}
          {lockLeft > 0 && (
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-solar mt-3">
              <IcLock size={11} className="inline -mt-0.5 mr-1.5" />sealed · retry in {lockLeft}s
            </p>
          )}
          <div className="mt-5">
            <button
              onClick={() => void tryUnlock()} disabled={busy || !pass || lockLeft > 0}
              className="font-mono text-[10px] tracking-[0.28em] uppercase border border-teal-ice/45 text-teal-ice px-7 py-2.5 hover:bg-teal-ice/10 transition-colors disabled:opacity-40"
            >
              {busy ? 'verifying…' : lockLeft > 0 ? `${lockLeft}s` : 'cross the horizon'}
            </button>
          </div>
        </div>
      )}

      {phase === 'create' && (
        <div className="w-90 max-w-[92vw]">
          <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-teal-ice/80 text-center">forge an identity</p>
          <div className="flex flex-col items-center mt-7">
            <button onClick={() => fileRef.current?.click()} className="group avatar-ring" title="upload image, gif or video">
              {avatar ? (
                avatar.frames && avatar.frames.length ? (
                  <FrameCycler frames={avatar.frames} fps={avatar.fps ?? 9} size={88} alt="avatar preview" fit={avatar.fit} />
                ) : (
                  <AvatarMedia src={avatar.dataUrl ?? ''} alt="avatar preview" size={88} fit={avatar.fit} className="border-teal-ice/50" />
                )
              ) : (
                <span className="w-22 h-22 rounded-full border border-dashed border-line grid place-items-center text-slate-dim group-hover:border-teal-ice/50 group-hover:text-teal-ice transition-colors">
                  <IcUser size={30} />
                </span>
              )}
              {avatar && <span className="absolute inset-0 grid place-items-center rounded-full bg-void/55 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-teal-ice">change</span>
              </span>}
            </button>
            <input
              ref={fileRef} type="file" accept="image/gif,image/apng,image/png,image/jpeg,image/webp,video/*" className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                if (f.type.startsWith('video/')) {
                  setCrop({ src: URL.createObjectURL(f), note: 'living loop', kind: 'video', file: f });
                  return;
                }
                setBusy(true);
                try {
                  const a = await processAvatar(f);
                  if (a.dataUrl && !a.frames) setCrop({ src: a.dataUrl, note: a.note, kind: 'image' });
                  else { setAvatar({ dataUrl: a.dataUrl, frames: a.frames, fps: a.fps, note: a.note }); toast(`avatar set · ${a.note}`); }
                } catch { toast('could not read that file as an avatar', 'warn'); }
                setBusy(false);
              }}
            />
            <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-slate-dim mt-2.5">
              {avatar ? `avatar set · ${avatar.note}` : 'image · gif / apng · video (auto-looped)'}
            </p>
          </div>
          <div className="space-y-3 mt-6">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="identity name" className="field w-full px-4 py-2.5 font-mono text-[12px] text-paper placeholder:text-slate-dim/60" />
            <input type="password" value={key1} onChange={(e) => setKey1(e.target.value)} placeholder="master key" className="field w-full px-4 py-2.5 font-mono text-[12px] text-paper placeholder:text-slate-dim/60" />
            <input type="password" value={key2} onChange={(e) => setKey2(e.target.value)} placeholder="master key again" className="field w-full px-4 py-2.5 font-mono text-[12px] text-paper placeholder:text-slate-dim/60" />
          </div>
          {err && <p className="font-mono text-[9.5px] tracking-[0.14em] text-red-300 mt-3 text-center">{err}</p>}
          <div className="flex justify-center mt-5">
            <button onClick={() => void create()} disabled={busy}
              className="font-mono text-[10px] tracking-[0.28em] uppercase border border-teal-ice/45 text-teal-ice px-7 py-2.5 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
              {busy ? 'forging…' : 'forge identity'}
            </button>
          </div>
          {state.vaultUsers.length > 0 && (
            <p className="text-center mt-4">
              <button onClick={() => setPhase('select')} className="font-mono text-[8.5px] tracking-[0.24em] uppercase text-slate-dim hover:text-paper transition-colors">← back</button>
            </p>
          )}
        </div>
      )}

      {crop && (
        <AvatarCropModal
          src={crop.src}
          kind={crop.kind}
          initial={avatar?.fit ?? { zoom: 1, px: 0, py: 0 }}
          onCancel={() => { if (crop.kind === 'video') URL.revokeObjectURL(crop.src); setCrop(null); }}
          onDone={async (fit) => {
            if (crop.kind === 'video' && crop.file) {
              toast('forging a living loop…');
              setBusy(true);
              try {
                const av = await processAvatar(crop.file, fit);
                setAvatar({ dataUrl: av.dataUrl, frames: av.frames, fps: av.fps, fit, note: av.note });
                toast(`avatar set · ${av.note}`);
              } catch { toast('could not forge that clip', 'warn'); }
              setBusy(false);
              URL.revokeObjectURL(crop.src);
            } else {
              setAvatar({ dataUrl: crop.src, fit, note: crop.note });
              toast(`avatar set · ${crop.note}`);
            }
            setCrop(null);
          }}
        />
      )}
    </div>
  );
}

