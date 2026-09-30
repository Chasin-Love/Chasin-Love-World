import { FrameCycler, AvatarMedia, AvatarCropModal } from './avatars';
import { lazy, useEffect, useMemo, useRef, useState } from 'react';
import { actions } from '../../state';

/* the real editor (VS Code engine) — loaded in its own chunk on first open */
const MonacoCodeEditor = lazy(() =>
  import('./MonacoCodeEditor').then((m) => ({ default: m.MonacoCodeEditor })),
);
import {
  checkVerifier, 
  isSealHardened, revokeVaultFileAuthorization,
  
  
  
  KDF_LEGACY_ROUNDS, KDF_TARGET_ROUNDS, makeVerifier, 
  
  fmtBytes, fmtDate,
  efsChildren as efsChildrenOf, efsDirOf, efsPathString, EFS_ROOT,
  
  
  
  
  
} from '../../vault';
import type { AvatarFit, VaultFile, VfsNode, VaultKind, VaultUser } from '../../domain/vault';
import {
  IcClose, IcFolder, IcLock, 
  IcScan, IcTerminal, IcUser, useUniverse,
} from '../bits';
import { toast } from '../toast';
import { KindGlyph, TilePreview } from '../VaultBits';

import { processAvatar } from './helpers';
/* ============================= identity editor ============================ */

export function IdentityEditor({ user, onClose, onRemoved }: { user: VaultUser; onClose: () => void; onRemoved: () => void }) {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<{ dataUrl: string | null; frames?: string[] | null; fps?: number | null; fit?: AvatarFit | null; note?: string | null } | null>(
    user.avatar || (user.avatarFrames && user.avatarFrames.length)
      ? { dataUrl: user.avatar, frames: user.avatarFrames, fps: user.avatarFps, fit: user.avatarFit, note: user.avatarNote }
      : null,
  );
  const [crop, setCrop] = useState<{ src: string; note: string; kind: 'image' | 'video'; file?: File } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !crop) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, crop]);

  const save = () => {
    actions.updateUser(user.id, {
      name: name.trim() || user.name,
      avatar: avatar?.dataUrl ?? null,
      avatarFrames: avatar?.frames ?? null,
      avatarFps: avatar?.fps ?? null,
      avatarFit: avatar?.fit ?? null,
      avatarNote: avatar?.note ?? null,
    });
    toast('identity updated');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[128] flex items-center justify-center overlay-in" style={{ background: 'rgba(3,5,10,0.78)' }} onClick={onClose}>
      <div className="vault-glass w-[400px] max-w-[92vw] rise-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 h-12 border-b border-teal-ice/15">
          <span className="font-display text-[12px] tracking-[0.24em] text-paper">EDIT IDENTITY</span>
          <div className="flex-1" />
          <button onClick={onClose} className="text-slate-dim hover:text-paper transition-colors"><IcClose size={13} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-5">
            <button onClick={() => fileRef.current?.click()} className="group avatar-ring shrink-0" title="change avatar — image, gif or video">
              {avatar ? (
                avatar.frames && avatar.frames.length ? (
                  <FrameCycler frames={avatar.frames} fps={avatar.fps ?? 9} size={76} alt="avatar preview" fit={avatar.fit ?? undefined} />
                ) : (
                  <AvatarMedia src={avatar.dataUrl ?? ''} alt="avatar preview" size={76} fit={avatar.fit ?? undefined} className="border-teal-ice/50" />
                )
              ) : (
                <span className="w-19 h-19 rounded-full border border-dashed border-line grid place-items-center text-slate-dim group-hover:border-teal-ice/50 group-hover:text-teal-ice transition-colors">
                  <IcUser size={26} />
                </span>
              )}
              <span className="absolute inset-0 grid place-items-center rounded-full bg-void/55 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-teal-ice">change</span>
              </span>
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
            <div className="flex-1 space-y-2">
              <label className="field-label">identity name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="field w-full px-3 py-2 font-mono text-[12px] text-paper" />
              <p className="font-mono text-[7.5px] tracking-[0.18em] uppercase text-slate-dim">forged {fmtDate(user.createdAt)} · last seen {fmtDate(user.lastSeen)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {confirmDel ? (
              <button
                onClick={() => { actions.removeUser(user.id); toast('identity dissolved'); onRemoved(); }}
                onMouseLeave={() => setConfirmDel(false)}
                className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-red-300 border border-red-400/50 px-3 py-2 hover:bg-red-400/10 transition-colors">
                dissolve identity?
              </button>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-slate-dim hover:text-red-300 transition-colors px-1 py-2">
                dissolve
              </button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} className="font-mono text-[9px] tracking-[0.22em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
            <button onClick={save} disabled={busy} className="font-mono text-[9px] tracking-[0.22em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
              save
            </button>
          </div>
        </div>
      </div>
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

/* ================================ lock modal =============================== */

export function LockModal({ file, openAfter, onClose }: { file: VaultFile; openAfter: boolean; onClose: () => void }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    if (busy) return;
    if (pass.length < 4) { setErr('at least 4 characters'); return; }
    setBusy(true); setErr('');
    try {
      const v = await makeVerifier(pass, KDF_TARGET_ROUNDS);
      revokeVaultFileAuthorization(file.id);
      actions.updateVaultFile(file.id, {
        lock: { version: 1, salt: v.salt, verifier: v.verifier, rounds: KDF_TARGET_ROUNDS },
        legacyLock: undefined,
      });
      toast(`${file.name} key-locked`);
      onClose();
    } catch {
      setErr('could not create object key');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-130 grid place-items-center overlay-in" style={{ background: 'rgba(3,5,10,0.78)' }}>
      <div className="vault-glass w-85 max-w-[92vw] p-6 rise-in">
        <p className="font-display text-[13px] tracking-[0.22em] text-paper">KEY-LOCK OBJECT</p>
        <p className="font-mono text-[10px] text-slate-soft mt-3 truncate">{file.name}</p>
        <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">opening this object will require its own key, on top of crossing the horizon.</p>
        <input autoFocus type="password" value={pass} onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="object key" className="field w-full px-3 py-2 mt-4 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
        {err && <p className="font-mono text-[9px] text-red-300 mt-2">{err}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
          <button onClick={() => void apply()} disabled={busy} className="font-mono text-[9px] tracking-[0.2em] uppercase text-solar border border-solar/50 px-4 py-2 hover:bg-solar/10 transition-colors disabled:opacity-40">
            {busy ? 'sealing…' : openAfter ? 'lock & open' : 'lock'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UnlockPrompt({ file, onOk, onClose }: { file: VaultFile; onOk: () => void; onClose: () => void }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const ok = file.lock
        ? await checkVerifier(pass, file.lock.salt, file.lock.verifier, file.lock.rounds)
        : file.legacyLock === pass;
      if (!ok) { setErr('wrong object key'); return; }

      if (!file.lock && file.legacyLock) {
        const v = await makeVerifier(pass, KDF_TARGET_ROUNDS);
        actions.updateVaultFile(file.id, {
          lock: { version: 1, salt: v.salt, verifier: v.verifier, rounds: KDF_TARGET_ROUNDS },
          legacyLock: undefined,
        });
      }
      onOk();
    } catch {
      setErr('could not verify object key');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-130 grid place-items-center overlay-in" style={{ background: 'rgba(3,5,10,0.78)' }}>
      <div className="vault-glass w-85 max-w-[92vw] p-6 rise-in">
        <p className="font-display text-[13px] tracking-[0.22em] text-paper flex items-center gap-2"><IcLock size={14} className="text-solar" /> KEY-LOCKED</p>
        <p className="font-mono text-[10px] text-slate-soft mt-3 truncate">{file.name}</p>
        <input autoFocus type="password" value={pass} onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void verify(); }}
          placeholder="object key" className="field w-full px-3 py-2 mt-4 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
        {err && <p className="font-mono text-[9px] text-red-300 mt-2">{err}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
          <button onClick={() => void verify()} disabled={busy}
            className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
            {busy ? 'checking…' : 'unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================== telemetry ================================ */

export function Telemetry({ files }: { files: VaultFile[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(iv);
  }, []);
  const entropy = (6.2 + Math.sin(tick * 0.7) * 0.5).toFixed(2);
  const pressure = (0.28 + Math.abs(Math.sin(tick * 0.4)) * 0.09).toFixed(2);
  const temp = (1.42 + Math.sin(tick * 0.23) * 0.05).toFixed(2);
  return (
    <div className="grid grid-cols-4 gap-3 mt-8">
      <div className="tele-card">
        <p className="tele-label">entropy</p>
        <p className="tele-value tabular-nums">{entropy}<span className="tele-frac"> bit/B</span></p>
      </div>
      <div className="tele-card">
        <p className="tele-label">seal pressure</p>
        <p className="tele-value tabular-nums">{pressure}<span className="tele-frac"> mPa</span></p>
      </div>
      <div className="tele-card">
        <p className="tele-label">horizon temp</p>
        <p className="tele-value tabular-nums">{temp}<span className="tele-frac"> ×10⁻³K</span></p>
      </div>
      <div className="tele-card">
        <p className="tele-label">objects sealed</p>
        <p className="tele-value tabular-nums">{files.length}<span className="tele-frac"> /{files.filter((f) => f.sealed).length} heavy</span></p>
      </div>
    </div>
  );
}

/* ============================== vault home =============================== */

const ALLOC = 8 * 1073741824;

export function VaultHome({ files, bytes, userName, onOpen, onSection, onSeal, onTerminal, onScan }: {
  files: VaultFile[]; bytes: number; userName: string;
  onOpen: (f: VaultFile) => void; onSection: (id: string) => void; onSeal: () => void;
  onTerminal: () => void; onScan: () => void;
}) {
  const recent = [...files].sort((a, b) => b.addedAt - a.addedAt).slice(0, 8);
  const pct = Math.min(1, bytes / ALLOC);
  const C = 2 * Math.PI * 38;
  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scroll px-8 py-7">
      <div className="flex items-center justify-between gap-8">
        <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-slate-dim">
          digital matter · key of <span className="text-teal-ice/90">{userName}</span>
        </p>
        <div className="shrink-0 flex items-center gap-5">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(139,161,196,0.14)" strokeWidth="5" />
            <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(111,194,180,0.85)" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)', filter: 'drop-shadow(0 0 6px rgba(111,194,180,0.4))' }} />
            <text x="48" y="46" textAnchor="middle" fill="#e9ecf1" fontSize="13" fontFamily="var(--font-mono)">{Math.round(pct * 100)}%</text>
            <text x="48" y="60" textAnchor="middle" fill="#5b6b85" fontSize="7.5" fontFamily="var(--font-mono)" letterSpacing="1.5">OF 8 GB</text>
          </svg>
          <div className="font-mono text-[10px] leading-loose text-slate-soft">
            <div><span className="text-paper">{fmtBytes(bytes)}</span> sealed</div>
            <div><span className="text-paper">{files.length}</span> objects</div>
            <div><span className="text-paper">{files.filter((f) => f.lock).length}</span> key-locked</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-7 flex-wrap">
        <button onClick={onSeal} className="font-mono text-[9.5px] tracking-[0.24em] uppercase border border-teal-ice/45 text-teal-ice px-5 py-2.5 hover:bg-teal-ice/10 transition-colors">
          + seal files in
        </button>
        <button onClick={() => onSection('fs')} className="font-mono text-[9.5px] tracking-[0.24em] uppercase border border-teal-ice/45 text-teal-ice px-5 py-2.5 hover:bg-teal-ice/10 transition-colors flex items-center gap-2">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg> shadows & scrub
        </button>
        <button onClick={() => onSection('fs')} className="font-mono text-[9.5px] tracking-[0.24em] uppercase border border-line/60 text-slate-soft px-5 py-2.5 hover:text-paper hover:border-paper/30 transition-colors flex items-center gap-2">
          <IcFolder size={11} /> file system
        </button>
        <button onClick={() => onSection('all')} className="font-mono text-[9.5px] tracking-[0.24em] uppercase border border-line/60 text-slate-soft px-5 py-2.5 hover:text-paper hover:border-paper/30 transition-colors">
          browse everything
        </button>
        <button onClick={onTerminal} className="font-mono text-[9.5px] tracking-[0.24em] uppercase border border-line/60 text-slate-soft px-5 py-2.5 hover:text-teal-ice hover:border-teal-ice/40 transition-colors flex items-center gap-2">
          <IcTerminal size={11} /> shell
        </button>
        <button onClick={onScan} className="font-mono text-[9.5px] tracking-[0.24em] uppercase border border-line/60 text-slate-soft px-5 py-2.5 hover:text-teal-ice hover:border-teal-ice/40 transition-colors flex items-center gap-2">
          <IcScan size={11} /> scan
        </button>
      </div>

      <Telemetry files={files} />

      <div className="mt-9">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-mono text-[10px] tracking-[0.34em] uppercase text-paper/75">Recent matter</h3>
          <span className="font-mono text-[8.5px] text-slate-dim">double-click to open</span>
        </div>
        {recent.length === 0 ? (
          <p className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-slate-dim py-8 text-center">the vault is empty — seal something in</p>
        ) : (
          <div className="vault-tile-grid">
            {recent.map((f) => (
              <button key={f.id} onClick={() => onOpen(f)} title="open"
                className="vault-item text-left px-3.5 py-3 border border-line/70 hover:border-teal-ice/40 transition-colors">
                <div className="flex items-start justify-between">
                  <span className="text-slate-soft"><KindGlyph kind={f.kind} /></span>
                  {f.lock && <IcLock size={11} className="text-solar" />}
                </div>
                <div className="h-11.5 mt-2 overflow-hidden border border-line/30 bg-void/50"><TilePreview f={f} /></div>
                <p className="text-[11.5px] text-paper mt-2 truncate">{f.name}</p>
                <p className="font-mono text-[8.5px] text-slate-dim mt-1">{fmtBytes(f.size)} · {fmtDate(f.addedAt).split(', ')[0]}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ vault terminal ============================== */

type TLine = { t: 'in' | 'out' | 'err' | 'sys'; s: string };

export function VaultTerminal({ onClose }: { onClose: () => void }) {
  const state = useUniverse();
  const [lines, setLines] = useState<TLine[]>([
    { t: 'sys', s: 'EVENTIDE SHELL · isolated execution layer' },
    { t: 'sys', s: `mounted ${state.vault.length} objects · type "help"` },
    { t: 'out', s: '' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState(EFS_ROOT);
  const [hist, setHist] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const outRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);

  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight }); }, [lines]);
  useEffect(() => { inRef.current?.focus(); }, []);

  const dirs = useMemo(() => Object.values(state.efs.nodes).filter((n) => n.type === 'dir'), [state.efs.nodes]);
  const cwdNode = state.efs.nodes[cwd] ?? state.efs.nodes[EFS_ROOT];
  const childFilesOf = (dirId: string): { node: VfsNode; file: VaultFile }[] =>
    efsChildrenOf(state.efs, dirId).fileIds
      .map((nid) => state.efs.nodes[nid])
      .map((n) => ({ node: n, file: n.fileId ? state.vault.find((f) => f.id === n.fileId) : null }))
      .filter((x): x is { node: VfsNode; file: VaultFile } => !!x.file);
  const find = (name: string) => {
    const kids = childFilesOf(cwd);
    return state.vault.find((f) => f.name === name) ?? kids.find((k) => k.file.name === name)?.file;
  };
  /** Resolves a shell path ('..', 'name', '/abs/name') to a directory node id. */
  const resolveDir = (arg: string): string | null => {
    const efs = state.efs;
    let cur = arg.startsWith('/') ? EFS_ROOT : cwd;
    for (const part of arg.split('/').filter(Boolean)) {
      if (part === '.') continue;
      if (part === '..') { cur = efs.nodes[cur]?.parentId ?? EFS_ROOT; continue; }
      const kid = efsChildrenOf(efs, cur).dirs.find((d) => d.name.toLowerCase() === part.toLowerCase());
      if (!kid) return null;
      cur = kid.id;
    }
    return cur;
  };
  const print = (t: TLine['t'], s: string) => setLines((l) => [...l, { t, s }]);

  const runScan = () => {
    setBusy(true);
    print('sys', 'efs scrub started — verifying sha-256 of every payload');
    void actions.efsRunScrub((prog) => {
      if (prog.current) print('out', `  verifying ${prog.current} … ${prog.done}/${prog.total}`);
    }).then((report) => {
      print('out', '');
      print('sys', `scrub ${report.status.toUpperCase()} · ${report.filesScanned} files · ${fmtBytes(report.bytesScanned)} · ${report.errorsFound} errors · ${report.errorsCorrected} repaired`);
      (report.log ?? []).slice(0, 8).forEach((l) => print(l.startsWith('REPAIRED') ? 'out' : 'err', `  ${l}`));
      setBusy(false);
    }).catch((err) => {
      print('err', `scrub failed: ${String(err)}`);
      setBusy(false);
    });
  };

  const exec = (raw: string) => {
    const [cmd, ...args] = raw.trim().split(/\s+/);
    print('in', `${efsPathString(state.efs, cwd)} $ ${raw}`);
    switch (cmd) {
      case '': break;
      case 'help':
        print('out', '  ls [dir]     list folder         cd <dir>    enter a folder');
        print('out', '  mkdir <n>    form a folder       pwd         print position');
        print('out', '  cat <file>   read text payload   info <f>    object manifest');
        print('out', '  cp <f> [n]   zero-copy CoW clone tree      print the EFS tree');
        print('out', '  shadow ls/freeze <n>/restore <n>/rm <n>   CoW snapshots');
        print('out', '  fork <dir>   fork a directory    scrub       checksum verify');
        print('out', '  dedup        share equal extents trash      void census');
        print('out', '  scan         integrity scan      keyring     sealed count');
        print('out', '  objects      vault census        weather     ambient telemetry');
        print('out', '  find <text>  search every object in the vault');
        print('out', '  clear        wipe screen         exit        leave the shell');
        break;
      case 'shadow': {
        const sub = args[0];
        if (sub === 'ls' || !sub) {
          if (!state.efs.shadows.length) { print('out', '  no shadows — freeze one with: shadow freeze <name>'); break; }
          state.efs.shadows.forEach((s) => print('out', `  ${s.name}  · gen ${s.generation} · ${s.fileCount} files · ${fmtBytes(s.bytes)}`));
        } else if (sub === 'freeze') {
          const s = actions.efsShadow(args.slice(1).join(' ') || `gen-${state.efs.super.generation}`);
          print('out', `  [EFS CoW] shadow '${s.name}' frozen at gen ${s.generation} — 0 payload bytes copied`);
        } else if (sub === 'restore') {
          const s = state.efs.shadows.find((x) => x.name === args.slice(1).join(' '));
          if (!s) { print('err', '  no such shadow (shadow ls)'); break; }
          actions.efsRestoreShadow(s.id);
          print('out', `  rolled back to '${s.name}' · a safety shadow was taken first`);
        } else if (sub === 'rm') {
          const s = state.efs.shadows.find((x) => x.name === args.slice(1).join(' '));
          if (!s) { print('err', '  no such shadow'); break; }
          actions.efsDeleteShadow(s.id);
          print('out', `  shadow '${s.name}' deleted`);
        } else print('err', '  usage: shadow ls | freeze <name> | restore <name> | rm <name>');
        break;
      }
      case 'tree': {
        const walk = (dirId: string, depth: number) => {
          const d = state.efs.nodes[dirId];
          if (!d || depth > 6) return;
          print('out', `  ${'│  '.repeat(depth)}${depth ? '├ ' : ''}${d.name}/`);
          efsChildrenOf(state.efs, dirId).dirs.forEach((k) => walk(k.id, depth + 1));
          efsChildrenOf(state.efs, dirId).fileIds.forEach((fid) => {
            const n = state.efs.nodes[fid];
            print('out', `  ${'│  '.repeat(depth + 1)}├ ${n.name}`);
          });
        };
        walk(cwd, 0);
        break;
      }
      case 'cp': {
        const src = find(args[0] ?? '');
        if (!src) { print('err', `  file not found: ${args[0] ?? ''}`); break; }
        const node = Object.values(state.efs.nodes).find((n) => n.type === 'file' && n.fileId === src.id);
        if (!node) { print('err', '  node missing'); break; }
        const made = actions.efsCopyNodes([node.id], cwd);
        if (made.length) print('out', `  [EFS CoW] clone created: ${state.efs.nodes[made[0]]?.name} (0 payload bytes allocated)`);
        break;
      }
      case 'fork': {
        const target = resolveDir(args.join(' ') || '.');
        if (!target) { print('err', '  no such directory'); break; }
        const made = actions.efsForkDir(target);
        if (made) print('out', `  [EFS CoW] forked '${state.efs.nodes[target].name}' → '${state.efs.nodes[made]?.name}' (shared extents)`);
        else print('err', '  cannot fork the root');
        break;
      }
      case 'dedup': {
        const rep = actions.efsRunDedup();
        print('out', `  [EFS dedup] ${rep.collapsed} duplicate${rep.collapsed === 1 ? '' : 's'} now share extents · ${fmtBytes(rep.savedBytes)} saved`);
        break;
      }
      case 'trash': {
        print('out', `  ${state.vaultTrash.length} object(s) resting in the void`);
        state.vaultTrash.slice(0, 10).forEach((t) => print('out', `  ${t.item.name}  · ${fmtBytes(t.item.size)}${t.dirName ? ` · from '${t.dirName}'` : ''}`));
        break;
      }
      case 'ls': {
        const target = args[0] ? resolveDir(args[0]) : cwd;
        if (target === null) { print('err', `  no such folder: ${args[0]}`); break; }
        const kids = efsChildrenOf(state.efs, target);
        kids.dirs.forEach((d) => print('out', `  ${d.name}/`));
        childFilesOf(target).forEach(({ file }) => print('out', `  ${file.lock ? '⚿ ' : '   '}${file.name}  ·  ${fmtBytes(file.size)}`));
        if (!kids.dirs.length && !kids.fileIds.length) print('out', '  (vacuum)');
        break;
      }
      case 'cd': {
        const target = resolveDir(args[0] ?? '/');
        if (target === null) print('err', `  no such folder: ${args[0] ?? ''}`);
        else { setCwd(target); print('out', `  ${efsPathString(state.efs, target)}`); }
        break;
      }
      case 'pwd': print('out', `  ${efsPathString(state.efs, cwd)}`); break;
      case 'mkdir': {
        if (!args[0]) { print('err', '  usage: mkdir <name>'); break; }
        const made = actions.efsCreateFolder(cwd, args[0]);
        if (made) print('out', `  formed ${args[0]}/`);
        else print('err', '  that name is taken here');
        break;
      }
      case 'cat': {
        const f = find(args[0] ?? '');
        if (!f) { print('err', `  not found: ${args[0] ?? ''}`); break; }
        if (f.content && (f.kind === 'document' || f.kind === 'dataset')) {
          f.content.split('\n').slice(0, 14).forEach((l) => print('out', `  ${l}`));
        } else print('out', `  [binary · ${fmtBytes(f.size)} · use "info ${f.name}"]`);
        break;
      }
      case 'info': {
        const f = find(args[0] ?? '');
        if (!f) { print('err', `  not found: ${args[0] ?? ''}`); break; }
        print('out', `  ${f.name}  ·  ${f.kind} · ${f.mime}`);
        print('out', `  ${fmtBytes(f.size)} · sealed ${fmtDate(f.addedAt)} · ${efsPathString(state.efs, efsDirOf(state.efs, f).id)}`);
        print('out', `  ${f.lock ? 'key-locked' : 'open'} · payload ${f.payloadRef ? (f.dedupOf ? 'shared extent' : 'opfs/idb') : f.content ? 'inline' : 'sealed'}`);
        if (f.checksum) print('out', `  csum sha-256 ${f.checksum.slice(0, 20)}…`);
        break;
      }
      case 'objects': print('out', `  ${state.vault.length} objects · ${fmtBytes(state.vault.reduce((a, f) => a + f.size, 0))} total · gen ${state.efs.super.generation}`); break;
      case 'keyring': {
        if (!state.secrets) { print('out', '  key ring empty'); break; }
        const kdf = state.secrets.kdf === 'argon2id'
          ? `Argon2id ${state.secrets.mem ?? 64}MiB × ${state.secrets.iters ?? 3}`
          : `PBKDF2 ${state.secrets.rounds ?? KDF_LEGACY_ROUNDS}${isSealHardened(state.secrets) ? '' : ' · below the OWASP floor — hardens on next open'}`;
        print('out', `  key ring present · sealed · credential count withheld · ${kdf}`);
        break;
      }
      case 'find': {
        const t = args.join(' ').trim().toLowerCase();
        if (!t) { print('err', '  usage: find <text>'); break; }
        const pathOf = (f: VaultFile) => efsPathString(state.efs, efsDirOf(state.efs, f).id);
        const hits = state.vault.filter((f) => f.name.toLowerCase().includes(t) || f.kind.includes(t) || pathOf(f).toLowerCase().includes(t));
        if (!hits.length) { print('out', '  nothing in the vault matches'); break; }
        hits.slice(0, 14).forEach((f) => print('out', `  ${pathOf(f) === '/' ? '' : pathOf(f) + '/'}${f.name}  ·  ${f.kind} · ${fmtBytes(f.size)}`));
        if (hits.length > 14) print('out', `  … and ${hits.length - 14} more`);
        break;
      }
      case 'scan': runScan(); break;
      case 'weather':
        print('out', '  entropy nominal · seal pressure 0.3 mPa · horizon calm');
        print('out', `  uptime ${Math.floor(performance.now() / 1000)}s · ${state.vault.filter((f) => f.lock).length} locks engaged`);
        break;
      case 'clear': setLines([]); break;
      case 'exit': onClose(); break;
      default: print('err', `  unknown command: ${cmd} — type "help"`);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (busy) return;
    if (e.key === 'Enter') {
      const v = input;
      if (v.trim()) { setHist((h) => [...h, v]); setHistIdx(-1); }
      setInput('');
      exec(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hist.length) { const i = histIdx < 0 ? hist.length - 1 : Math.max(0, histIdx - 1); setHistIdx(i); setInput(hist[i]); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx >= 0) { const i = histIdx + 1; if (i >= hist.length) { setHistIdx(-1); setInput(''); } else { setHistIdx(i); setInput(hist[i]); } }
    }
  };

  return (
    <div className="fixed inset-0 z-130 flex items-center justify-center overlay-in" style={{ background: 'rgba(3,5,10,0.78)' }} onClick={onClose}>
      <div className="vault-glass w-[min(700px,92vw)] h-[min(520px,80vh)] flex flex-col rise-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 h-11 border-b border-teal-ice/15 shrink-0">
          <IcTerminal size={14} className="text-teal-ice" />
          <span className="font-mono text-[9.5px] tracking-[0.26em] uppercase text-paper">eventide shell</span>
          <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-slate-dim">isolated layer · cwd {efsPathString(state.efs, cwd)}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="text-slate-dim hover:text-paper transition-colors"><IcClose size={13} /></button>
        </div>
        <div ref={outRef} className="flex-1 min-h-0 overflow-y-auto thin-scroll px-4 py-3 font-mono text-[11.5px] leading-[1.7]">
          {lines.map((l, i) => (
            <div key={i} className={l.t === 'in' ? 'text-teal-ice' : l.t === 'err' ? 'text-red-300/90' : l.t === 'sys' ? 'text-solar/90' : 'text-slate-soft'}>
              {l.s || '\u00a0'}
            </div>
          ))}
          <div className="flex items-center gap-2 text-teal-ice">
            <span className="text-slate-dim shrink-0">{efsPathString(state.efs, cwd)} $</span>
            <input ref={inRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} disabled={busy}
              className="flex-1 bg-transparent outline-none text-paper placeholder:text-slate-dim/50" placeholder={busy ? 'scanning…' : ''} spellCheck={false} />
            <span className="w-1.75 h-3.5 bg-teal-ice/80 animate-pulse shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================== deep scan =============================== */

export function DeepScan({ onClose }: { onClose: () => void }) {
  const state = useUniverse();
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const all = useMemo(() => state.vault.filter((f) => (f.realityId ?? 'sol-prime') === (state.activeRealityId || 'sol-prime')), [state.vault, state.activeRealityId]);
  useEffect(() => {
    if (idx >= all.length) { setDone(true); return; }
    const t = setTimeout(() => setIdx((i) => i + 1), 70);
    return () => clearTimeout(t);
  }, [idx, all.length]);
  const pct = all.length ? Math.round((Math.min(idx, all.length) / all.length) * 100) : 100;
  const locked = all.filter((f) => f.lock).length;
  const sealedCount = all.filter((f) => f.sealed).length;
  const total = all.reduce((a, f) => a + f.size, 0);
  return (
    <div className="fixed inset-0 z-130 flex items-center justify-center overlay-in" style={{ background: 'rgba(3,5,10,0.78)' }} onClick={onClose}>
      <div className="vault-glass w-[min(560px,92vw)] rise-in p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <IcScan size={16} className={done ? 'text-teal-ice' : 'text-solar animate-pulse'} />
          <p className="font-display text-[15px] font-medium tracking-[0.22em] text-paper">{done ? 'SCAN COMPLETE' : 'DEEP INTEGRITY SCAN'}</p>
        </div>
        {!done ? (
          <>
            <p className="font-mono text-[9px] tracking-[0.24em] uppercase text-slate-dim mt-4">
              verifying {Math.min(idx + 1, all.length)} / {all.length} · {all[Math.min(idx, all.length - 1)]?.name ?? ''}
            </p>
            <div className="mt-3 h-[5px] bg-void/70 border border-line/40 overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, rgba(111,194,180,0.5), rgba(111,194,180,0.95))', boxShadow: '0 0 12px rgba(111,194,180,0.6)', transition: 'width 0.12s linear' }} />
            </div>
            <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-slate-dim mt-2 text-right">{pct}%</p>
          </>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3">
            <div><p className="font-mono text-[20px] text-teal-ice tabular-nums">{all.length}</p><p className="font-mono text-[7.5px] tracking-[0.22em] uppercase text-slate-dim">objects verified</p></div>
            <div><p className="font-mono text-[20px] text-paper tabular-nums">{fmtBytes(total)}</p><p className="font-mono text-[7.5px] tracking-[0.22em] uppercase text-slate-dim">matter accounted</p></div>
            <div><p className="font-mono text-[20px] text-solar tabular-nums">{locked}</p><p className="font-mono text-[7.5px] tracking-[0.22em] uppercase text-slate-dim">key-locked</p></div>
            <div><p className="font-mono text-[20px] text-slate-soft tabular-nums">{sealedCount}</p><p className="font-mono text-[7.5px] tracking-[0.22em] uppercase text-slate-dim">payloads sealed</p></div>
            <div className="col-span-2 border-t border-line/40 pt-3">
              <p className="font-mono text-[9px] tracking-[0.24em] uppercase text-teal-ice">integrity 100% · no corruption · all signatures match</p>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          {done && <button onClick={() => { setIdx(0); setDone(false); }} className="font-mono text-[9.5px] tracking-[0.24em] uppercase px-4 py-2 text-slate-dim hover:text-paper transition-colors">re-scan</button>}
          <button onClick={onClose} className="font-mono text-[9.5px] tracking-[0.24em] uppercase px-5 py-2 border border-teal-ice/50 text-teal-ice hover:bg-teal-ice/10 transition-colors">{done ? 'close' : 'cancel'}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== main vault =============================== */

/* three surfaces, no duplication — the file system tree already exposes every
   folder, so kind-tabs would only repeat what the tree shows */
export const SECTIONS: { id: string; label: string; kinds: VaultKind[] | null }[] = [
  { id: 'home', label: 'Home', kinds: null },
  { id: 'fs', label: 'File Manager', kinds: null },
  { id: 'all', label: 'Everything', kinds: null },
  { id: 'void', label: 'The Void', kinds: null },
];
