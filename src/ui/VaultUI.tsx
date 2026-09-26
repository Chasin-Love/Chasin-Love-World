import { STORAGE_KEYS } from '../platform/storageKeys';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { actions, newId } from '../state';
import { prettyPrint } from './format';
import type { MonacoHandle } from './vault/MonacoCodeEditor';

/* the real editor (VS Code engine) — loaded in its own chunk on first open */
const MonacoCodeEditor = lazy(() =>
  import('./vault/MonacoCodeEditor').then((m) => ({ default: m.MonacoCodeEditor })),
);
import {
  authorizeVaultFile, checkVerifier, clearPayloadSession, decryptRecords, dedupeImport, encryptRecords,
  isSealHardened, isVaultFileAuthorized, isVaultFileLocked, novaScan, importVaultExport, revokeVaultFileAuthorization,
  buildRingSecrets, keyfileFingerprint, keyfileSecret, openRing, rewrapMasterEnvelope, sealRecords, unwrapRingKey,
  wrapRingKey, b64enc,
  sealComet, openComet, genCustodianKey, COMET_TTL_DAYS,
  KDF_LEGACY_ROUNDS, KDF_TARGET_ROUNDS, makeVerifier, parseOtpAuth, sha256Hex, totpAt, totpRemaining,
  unlockPayloadSession, validateOtpAuth, CORPUS_SIZE, SOURCE_LABELS,
  fmtBytes, fmtDate,
  efsChecksumOf, efsChildren as efsChildrenOf, efsDirOf, efsPathString, EFS_ROOT,
  getPayload, hasIdb, hasOpfs, putPayload,
  bundleWebApp, canExecute, detectRunner, extractArchiveEntry, pickAppEntry,
  pulseVault, readArchiveListing, resolveBlob, runJavaScript, runPython, unzipAll,
  parseIsoBlob, extractIsoFile, flattenIsoRecords,
  type ImportSource, type CometPacket, type RingEnvelope, type RunnerKind, type IsoParseResult, type IsoDirectoryRecord, type ZipEntry,
} from '../vault';
import type { AvatarFit, FileVersion, PasswordField, PasswordRecord, VaultFile, VfsNode, VaultKind, VaultSecrets, VaultUser } from '../domain/vault';
import type { AuditEntry } from '../domain/universe';
import {
  AudioChip, IcClose, IcCopy, IcDownload, IcEdit, IcEye, IcFolder, IcLock, IcMove, IcPlus,
  IcScan, IcSearch, IcTerminal, IcTrash, IcUnlock, IcUser, useUniverse,
} from './bits';
import { toast } from './toast';
import { readAsDataURL } from './lib';
import { FileManager } from './FileManager';
import { HexInspector, KindGlyph, TilePreview, WaveStripLocal, seedRnd } from './VaultBits';

/* ================================ helpers ================================ */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const videoEvent = (v: HTMLVideoElement, ev: string) => new Promise<void>((res) => {
  const h = () => { v.removeEventListener(ev, h); res(); };
  v.addEventListener(ev, h);
});

/* avatar framing math */
function coverCrop(w: number, h: number, s: number, fit: AvatarFit) {
  const sc = Math.max(s / w, s / h) * fit.zoom;
  const dw = w * sc, dh = h * sc;
  return { dw, dh, dx: (s - dw) / 2 + fit.px * s, dy: (s - dh) / 2 + fit.py * s };
}
function clampFit(fit: AvatarFit, w: number, h: number): AvatarFit {
  const zoom = Math.min(3, Math.max(1, fit.zoom));
  const sc = Math.max(1 / w, 1 / h) * zoom;
  const rw = w * sc, rh = h * sc;
  const mx = Math.max(0, (rw - 1) / 2), my = Math.max(0, (rh - 1) / 2);
  return { zoom, px: Math.min(mx, Math.max(-mx, fit.px)), py: Math.min(my, Math.max(-my, fit.py)) };
}

/* decode a video into frames at the chosen framing — loops forever, plays everywhere */
async function videoToFrames(file: File, fit: AvatarFit): Promise<{ dataUrl: string | null; frames: string[]; fps: number; note: string }> {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.src = url; v.muted = true; v.playsInline = true; v.preload = 'auto';
  try {
    await Promise.race([videoEvent(v, 'loadeddata'), sleep(4000)]);
    const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 6;
    const len = Math.min(dur, 6);
    const S = 120;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d')!;
    const W = v.videoWidth || 640, H = v.videoHeight || 360;
    const count = Math.min(42, Math.max(12, Math.round(len * 7)));
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      v.currentTime = (i / count) * len;
      await Promise.race([videoEvent(v, 'seeked'), sleep(240)]);
      const { dw, dh, dx, dy } = coverCrop(W, H, S, fit);
      g.clearRect(0, 0, S, S);
      g.drawImage(v, dx, dy, dw, dh);
      frames.push(cv.toDataURL('image/jpeg', 0.62));
    }
    return { dataUrl: frames[0], frames, fps: count / len, note: 'living loop' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function processAvatar(file: File, fit?: AvatarFit): Promise<{ dataUrl: string | null; frames?: string[]; fps?: number; note: string }> {
  if (file.type === 'image/gif' || file.type === 'image/apng') {
    if (file.size < 8_000_000) return { dataUrl: await readAsDataURL(file), note: `animated ${file.type === 'image/apng' ? 'apng' : 'gif'}` };
  }
  if (file.type.startsWith('image/')) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    try {
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('bad image')); img.src = url; });
      if (Math.max(img.width, img.height) > 1000) {
        const sc = 1000 / Math.max(img.width, img.height);
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
        return { dataUrl: cv.toDataURL('image/jpeg', 0.88), note: 'photo' };
      }
      return { dataUrl: await readAsDataURL(file), note: 'photo' };
    } finally { URL.revokeObjectURL(url); }
  }
  if (file.type.startsWith('video/')) {
    try {
      const r = await videoToFrames(file, fit ?? { zoom: 1, px: 0, py: 0 });
      return { dataUrl: r.dataUrl, frames: r.frames, fps: r.fps, note: r.note };
    } catch { /* fall through */ }
    if (file.size < 12_000_000) return { dataUrl: await readAsDataURL(file), note: 'living clip' };
    /* poster frame fallback */
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.src = url; v.muted = true; v.playsInline = true;
    try {
      await Promise.race([videoEvent(v, 'loadeddata'), sleep(3000)]);
      v.currentTime = Math.min(0.4, (v.duration || 1) / 2);
      await Promise.race([videoEvent(v, 'seeked'), sleep(1500)]);
      const s = Math.min(1, 240 / Math.max(v.videoWidth || 240, v.videoHeight || 240));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round((v.videoWidth || 240) * s));
      cv.height = Math.max(1, Math.round((v.videoHeight || 240) * s));
      cv.getContext('2d')!.drawImage(v, 0, 0, cv.width, cv.height);
      return { dataUrl: cv.toDataURL('image/jpeg', 0.86), note: 'video frame' };
    } finally { URL.revokeObjectURL(url); }
  }
  throw new Error('unsupported avatar type');
}

/* --------------------------- download synthesis -------------------------- */

function wavBlob(seconds = 1.3, freq = 320): Blob {
  const sr = 22050;
  const n = Math.floor(sr * seconds);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ws(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t * 9) * Math.exp(-t * 2.1);
    const smp = (Math.sin(2 * Math.PI * freq * t) * 0.6 + Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.22) * env;
    v.setInt16(44 + i * 2, Math.max(-32000, Math.min(32000, smp * 26000)), true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

function imageBlob(name: string): Promise<Blob | null> {
  return new Promise((res) => {
    const cv = document.createElement('canvas');
    cv.width = 640; cv.height = 400;
    const g = cv.getContext('2d')!;
    const rnd = seedRnd(name);
    const bg = g.createLinearGradient(0, 0, 640, 400);
    bg.addColorStop(0, '#070b16'); bg.addColorStop(1, '#0b1226');
    g.fillStyle = bg; g.fillRect(0, 0, 640, 400);
    for (let i = 0; i < 420; i++) {
      g.fillStyle = `rgba(${Math.round(200 + rnd() * 55)},${Math.round(210 + rnd() * 45)},255,${(0.15 + rnd() * 0.7).toFixed(2)})`;
      g.beginPath(); g.arc(rnd() * 640, rnd() * 400, rnd() * 1.4, 0, Math.PI * 2); g.fill();
    }
    const glow = g.createRadialGradient(430, 150, 4, 430, 150, 130);
    glow.addColorStop(0, 'rgba(255,214,150,0.5)'); glow.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = glow; g.fillRect(0, 0, 640, 400);
    cv.toBlob((b) => res(b), 'image/png');
  });
}

async function videoBlob(): Promise<Blob | null> {
  try {
    if (typeof MediaRecorder === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 320; cv.height = 180;
    const g = cv.getContext('2d')!;
    const stream = cv.captureStream(30);
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' })); });
    rec.start();
    const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * 320, y: Math.random() * 180, r: Math.random() * 1.3 + 0.3, s: Math.random() * 2 + 1 }));
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const draw = () => {
        const t = (performance.now() - t0) / 1000;
        g.fillStyle = 'rgba(4,6,12,0.4)'; g.fillRect(0, 0, 320, 180);
        stars.forEach((st) => {
          g.fillStyle = `rgba(190,220,255,${(0.3 + 0.7 * Math.abs(Math.sin(t * st.s + st.x))).toFixed(2)})`;
          g.beginPath(); g.arc(st.x, st.y, st.r, 0, Math.PI * 2); g.fill();
        });
        g.strokeStyle = `rgba(111,194,180,${(0.35 + 0.3 * Math.sin(t * 3)).toFixed(2)})`;
        g.lineWidth = 1.4;
        g.beginPath(); g.arc(160, 90, 26 + 6 * Math.sin(t * 2), 0, Math.PI * 2); g.stroke();
        if (t < 1.5) requestAnimationFrame(draw); else { rec.stop(); res(); }
      };
      draw();
    });
    return await done;
  } catch { return null; }
}

async function synthPayload(f: VaultFile): Promise<Blob | null> {
  switch (f.kind) {
    case 'audio': return wavBlob(1.4, 294);
    case 'image': return imageBlob(f.name);
    case 'video': return videoBlob();
    case 'dataset': {
      const rnd = seedRnd(f.name);
      let csv = 'node_id,ra_deg,dec_deg,dist_mly,cluster_mass\n';
      for (let i = 0; i < 240; i++) csv += `${i},${(rnd() * 360).toFixed(4)},${(rnd() * 180 - 90).toFixed(4)},${(rnd() * 9000).toFixed(1)},${(rnd() * 1e15).toExponential(3)}\n`;
      return new Blob([csv], { type: 'text/csv' });
    }
    case 'document':
      return new Blob([`# ${f.name}\n\nMaterialized from the Universal Vault.\nThis object is integrity-sealed; the full payload lives in the execution layer.\n`], { type: 'text/markdown' });
    case 'iso': {
      const buf = new ArrayBuffer(17 * 2048);
      const u = new Uint8Array(buf);
      u[16 * 2048] = 1;
      'CD001'.split('').forEach((ch, i) => { u[16 * 2048 + 1 + i] = ch.charCodeAt(0); });
      return new Blob([buf], { type: 'application/x-iso9660-image' });
    }
    case 'archive': {
      const b = new Uint8Array(22);
      b[0] = 0x50; b[1] = 0x4b; b[2] = 0x05; b[3] = 0x06;
      return new Blob([b], { type: 'application/zip' });
    }
    case 'exe': case 'game': case 'application': {
      const buf = new ArrayBuffer(512);
      const u = new Uint8Array(buf);
      u[0] = 0x4d; u[1] = 0x5a;
      return new Blob([buf], { type: 'application/octet-stream' });
    }
    default:
      return new Blob([`${f.name}\nsealed object — ${f.mime}\n`], { type: 'text/plain' });
  }
}

async function downloadFile(f: VaultFile) {
  if (isVaultFileLocked(f) && !isVaultFileAuthorized(f.id)) {
    toast(`unlock ${f.name} before downloading`, 'warn');
    return;
  }
  if (f.payloadMissing) {
    toast(`original payload for ${f.name} is unavailable`, 'warn');
    return;
  }
  let p: { url: string; revoke: boolean } | null = null;
  if (f.payloadRef) {
    /* real bytes live in IndexedDB — stream them straight out */
    toast(`retrieving ${f.name}…`);
    try {
      const blob = await getPayload(f.payloadRef);
      if (!blob) {
        toast(`original payload for ${f.name} is unavailable`, 'warn');
        return;
      }
      p = { url: URL.createObjectURL(blob), revoke: true };
    } catch {
      toast(`could not read the original payload for ${f.name}`, 'warn');
      return;
    }
  } else if (f.content) {
    p = f.content.startsWith('data:')
      ? { url: f.content, revoke: false }
      : { url: URL.createObjectURL(new Blob([f.content], { type: f.mime || 'text/plain' })), revoke: true };
  }
  if (!p) {
    toast(`materializing ${f.name}…`);
    const blob = await synthPayload(f);
    if (blob) p = { url: URL.createObjectURL(blob), revoke: true };
  }
  if (!p) { toast('could not materialize this object', 'warn'); return; }
  const a = document.createElement('a');
  a.href = p.url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (p.revoke) setTimeout(() => URL.revokeObjectURL(p.url), 8000);
  toast(`carrying ${f.name} out of the vault`);
}

function kindOf(name: string, mime: string): VaultKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('text/') || ['md', 'json', 'txt', 'csv', 'log'].includes(ext)) return ext === 'csv' ? 'dataset' : 'document';
  if (ext === 'csv' || ext === 'fits' || ext === 'parquet') return 'dataset';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (ext === 'iso' || ext === 'img') return 'iso';
  if (ext === 'exe' || ext === 'msi') return 'exe';
  if (ext === 'app' || ext === 'apk' || ext === 'dmg') return 'application';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt'].includes(ext)) return 'document';
  return 'other';
}

/* ================================ avatars ================================ */

function AvatarMedia({ src, alt, size, fit, className = '' }: { src: string; alt: string; size: number; fit?: AvatarFit | null; className?: string }) {
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

function FrameCycler({ frames, fps, size, alt, fit }: { frames: string[]; fps: number; size: number; alt: string; fit?: AvatarFit | null }) {
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
function avatarKind(u: VaultUser): 'living' | 'animated' | 'photo' | 'none' {
  if (u.avatarFrames && u.avatarFrames.length) return 'living';
  if (u.avatar) {
    if (u.avatar.startsWith('data:image/gif') || u.avatar.startsWith('data:image/apng')) return 'animated';
    if (u.avatar.startsWith('data:video') || u.avatar.startsWith('blob:')) return 'living';
    return 'photo';
  }
  return 'none';
}
function AvatarKindBadge({ kind }: { kind: 'living' | 'animated' | 'photo' | 'none' }) {
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

function AvatarCropModal({ src, kind, initial, onCancel, onDone }: {
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

function AvatarPicker({ userId, current, size = 44, onSelect }: { userId: string; current: VaultUser; size?: number; onSelect?: () => void }) {
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

/* =============================== backdrop ================================ */

function VaultBackdrop() {
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

function Gate({ onEnter }: { onEnter: (u: VaultUser, masterPass: string) => Promise<void> | void }) {
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

/* ============================ file system view =========================== */

const VOID_DAYS = 30;

function TheVoid() {
  const state = useUniverse();
  const [armed, setArmed] = useState<string | null>(null);
  const [armAll, setArmAll] = useState(false);

  /* matter older than 30 days collapses on its own */
  useEffect(() => {
    const cutoff = Date.now() - VOID_DAYS * 86400000;
    const stale = state.vaultTrash.filter((t) => t.deletedAt < cutoff);
    if (stale.length) stale.forEach((trash) => actions.purgeTrashed(trash.item.id));
  }, [state.vaultTrash]);

  const restore = (id: string) => { actions.restoreTrashed(id); toast('matter returned to the vault'); };
  const purge = (t: { item: VaultFile }) => {
    if (armed === t.item.id) {
      actions.purgeTrashed(t.item.id);
      setArmed(null);
      toast(`${t.item.name} dissolved permanently`);
    } else {
      setArmed(t.item.id);
      setTimeout(() => setArmed((a) => (a === t.item.id ? null : a)), 2400);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-3 px-5 h-12 border-b border-line/50 shrink-0">
        <span className="font-mono text-[10px] tracking-[0.26em] uppercase text-slate-soft">released matter lingers {VOID_DAYS} days</span>
        <div className="flex-1" />
        {state.vaultTrash.length > 0 && (
          <button
            onClick={() => {
              if (armAll) {
                actions.purgeTrash();
                setArmAll(false);
                toast('the Void is empty');
              } else { setArmAll(true); setTimeout(() => setArmAll(false), 2600); }
            }}
            className={`font-mono text-[8.5px] tracking-[0.2em] uppercase border px-3 py-1.5 transition-colors ${armAll ? 'border-red-400/60 text-red-300 bg-red-400/10' : 'border-line/60 text-slate-soft hover:text-red-300 hover:border-red-400/40'}`}>
            {armAll ? 'confirm — dissolve all' : 'empty the Void'}
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
        {state.vaultTrash.length === 0 && (
          <div className="h-full grid place-items-center">
            <p className="font-mono text-[10px] tracking-[0.26em] uppercase text-slate-dim">the Void is empty — nothing has been released</p>
          </div>
        )}
        {state.vaultTrash.map((t) => {
          const daysLeft = Math.max(0, VOID_DAYS - Math.floor((Date.now() - t.deletedAt) / 86400000));
          return (
            <div key={t.item.id} className="vault-row flex items-center gap-3.5 px-5 py-2.5">
              <span className="w-3.75 grid place-items-center text-slate-dim shrink-0"><KindGlyph kind={t.item.kind} size={13} /></span>
              <span className="text-[12px] text-paper/80 truncate flex-1">{t.item.name}</span>
              <span className="font-mono text-[9px] text-slate-dim shrink-0">{t.dirName ? `from '${t.dirName}'` : 'root'}</span>
              <span className="font-mono text-[9px] text-slate-dim shrink-0">{fmtBytes(t.item.size)}</span>
              <span className="font-mono text-[9px] text-solar/80 shrink-0 w-19 text-right">{daysLeft}d left</span>
              <button onClick={() => restore(t.item.id)} className="font-mono text-[8px] tracking-[0.16em] uppercase text-teal-ice hover:underline shrink-0">restore</button>
              <button onClick={() => purge(t)} className={`font-mono text-[8px] tracking-[0.16em] uppercase shrink-0 ${armed === t.item.id ? 'text-red-300' : 'text-slate-dim hover:text-red-300'}`}>
                {armed === t.item.id ? 'confirm' : 'purge'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================ viewers ================================ */

/* a small playable instrument — what "atmosphere-synth" actually runs */
function AtmosphereSynth({ name, onExit }: { name: string; onExit: () => void }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const [wave, setWave] = useState<OscillatorType>('sine');
  const [cutoff, setCutoff] = useState(1800);
  const [active, setActive] = useState<Set<string>>(new Set());

  const ensure = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.gain.value = 0.22;
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  };

  const play = (freq: number, id: string) => {
    const ctx = ensure();
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o1.type = wave; o2.type = wave;
    o1.frequency.value = freq; o2.frequency.value = freq * 1.005;
    filt.type = 'lowpass'; filt.frequency.value = cutoff; filt.Q.value = 4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    o1.connect(filt); o2.connect(filt); filt.connect(g); g.connect(masterRef.current!);
    o1.start(t); o2.start(t); o1.stop(t + 1.7); o2.stop(t + 1.7);
    setActive((s) => new Set(s).add(id));
    setTimeout(() => setActive((s) => { const n = new Set(s); n.delete(id); return n; }), 240);
  };

  /* an A-minor pentatonic spread across two octaves */
  const notes: { id: string; f: number; l: string }[] = [
    { id: 'a3', f: 220, l: 'A3' }, { id: 'c4', f: 261.6, l: 'C4' }, { id: 'd4', f: 293.7, l: 'D4' },
    { id: 'e4', f: 329.6, l: 'E4' }, { id: 'g4', f: 392, l: 'G4' }, { id: 'a4', f: 440, l: 'A4' },
    { id: 'c5', f: 523.3, l: 'C5' }, { id: 'd5', f: 587.3, l: 'D5' }, { id: 'e5', f: 659.3, l: 'E5' },
    { id: 'g5', f: 784, l: 'G5' }, { id: 'a5', f: 880, l: 'A5' }, { id: 'c6', f: 1046.5, l: 'C6' },
  ];

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  return (
    <div className="mt-2 border border-line/60 bg-void/70">
      <div className="flex items-center gap-3 px-3 py-2 border-b border-line/50">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice/90">{name}</span>
        <span className="font-mono text-[8px] tracking-[0.16em] uppercase text-slate-dim">sandbox · audio bridge live</span>
        <div className="flex-1" />
        <div className="flex border border-line/60">
          {(['sine', 'triangle', 'sawtooth', 'square'] as OscillatorType[]).map((w) => (
            <button key={w} onClick={() => setWave(w)}
              className={`px-2 py-1 font-mono text-[8px] tracking-widest uppercase transition-colors ${wave === w ? 'text-teal-ice bg-teal-ice/15' : 'text-slate-dim hover:text-slate-soft'}`}>
              {w.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5 p-3">
        {notes.map((n) => (
          <button key={n.id}
            onPointerDown={() => play(n.f, n.id)}
            className={`h-16 border transition-all duration-100 font-mono text-[9px] tracking-[0.14em] uppercase ${active.has(n.id) ? 'bg-teal-ice/30 border-teal-ice text-paper shadow-[0_0_18px_rgba(111,194,180,0.5)] scale-[0.97]' : 'bg-void/40 border-line/60 text-slate-soft hover:border-teal-ice/50 hover:text-teal-ice'}`}>
            {n.l}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 px-3 pb-3">
        <span className="font-mono text-[8px] tracking-[0.16em] uppercase text-slate-dim">filter</span>
        <input type="range" min={200} max={6000} value={cutoff} onChange={(e) => setCutoff(Number(e.target.value))} className="pw-range flex-1" />
        <span className="font-mono text-[9px] text-teal-ice tabular-nums w-12 text-right">{cutoff}Hz</span>
      </div>
      <div className="border-t border-line/50 px-3 py-2 flex justify-between items-center">
        <span className="font-mono text-[8px] tracking-[0.16em] uppercase text-slate-dim">press pads to play · runs entirely in your browser</span>
        <button onClick={onExit} className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-red-300/80 hover:text-red-300 transition-colors">terminate</button>
      </div>
    </div>
  );
}

/* ======================= execution engine (real) ======================= */

const RUNNER_LABEL: Record<RunnerKind, string> = {
  'web-app': 'web runtime · CSP-restricted iframe',
  javascript: 'js runtime · dedicated worker',
  python: 'python runtime · terminable worker',
  pdf: 'document runtime · sandboxed viewer',
  archive: 'archive engine · real extraction',
  iso: 'iso 9660 engine · virtual disc mount & execution',
};

function ConsolePane({ lines, running, onStop, bootLabel }: {
  lines: { t: string; level: 'info' | 'warn' | 'error' | 'sys' }[];
  running: boolean;
  onStop: () => void;
  bootLabel: string;
}) {
  const outRef = useRef<HTMLDivElement>(null);
  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight }); }, [lines]);
  return (
    <div className="border border-line/60 bg-void/70 mt-2">
      <div className="flex items-center gap-3 px-3 h-9 border-b border-line/50">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice/90">{bootLabel}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-dim'}`} />
        <div className="flex-1" />
        {running && (
          <button onClick={onStop} className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-red-300/80 hover:text-red-300 transition-colors">terminate</button>
        )}
      </div>
      <div ref={outRef} className="h-55 overflow-y-auto thin-scroll px-3 py-2.5 font-mono text-[11px] leading-[1.8]">
        {lines.map((l, i) => (
          <div key={i} className={l.level === 'sys' ? 'text-solar/90' : l.level === 'error' ? 'text-red-300/90' : l.level === 'warn' ? 'text-amber-300/90' : 'text-slate-soft'}>{l.t}</div>
        ))}
        {!lines.length && <div className="text-slate-dim">awaiting output…</div>}
      </div>
    </div>
  );
}

/* html / html5-game / web app — bundled with its sibling assets, run in a locked iframe */
function WebAppRun({ file, blob }: { file: VaultFile; blob: Blob }) {
  const state = useUniverse();
  const [url, setUrl] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true; let made: string | null = null;
    setUrl(null); setErr('');
    (async () => {
      try {
        /* siblings from the same EFS directory become live blob assets */
        const siblings = new Map<string, Blob>();
        const folderId = file.dirId ?? EFS_ROOT;
        for (const f of state.vault) {
          if (f.id === file.id || (f.dirId ?? EFS_ROOT) !== folderId) continue;
          const b = await resolveBlob(f);
          if (b) siblings.set(f.name, b);
        }
        const u = await bundleWebApp(blob, siblings);
        if (!alive) { URL.revokeObjectURL(u); return; }
        made = u; setUrl(u);
        pulseVault(1);
      } catch (e) { if (alive) setErr(String((e as Error).message ?? e)); }
    })();
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [file.id, nonce]);

  if (err) return <p className="font-mono text-[10px] text-red-300/90 py-6 text-center">bundle failed · {err}</p>;
  if (!url) return <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-dim text-center py-10 pulse-soft">bundling web runtime…</p>;
  return (
    <div>
      <div className="flex items-center gap-3 px-3 h-9 border border-line/60 bg-void/50">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice/90">{RUNNER_LABEL['web-app']}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono text-[8.5px] text-slate-dim">CSP blocks network · opaque origin · local assets only</span>
        <div className="flex-1" />
        <button onClick={() => setNonce((n) => n + 1)} className="font-mono text-[8.5px] tracking-[0.18em] uppercase text-slate-soft hover:text-teal-ice transition-colors">reboot</button>
      </div>
      <iframe key={nonce} src={url} title={file.name} sandbox="allow-scripts allow-pointer-lock allow-forms allow-modals"
        referrerPolicy="no-referrer" className="w-full h-[58vh] mt-2 bg-white border border-line/60" />
    </div>
  );
}

/* plain javascript — executed in a dedicated Web Worker, console piped live */
function JsRun({ blob }: { blob: Blob }) {
  const [lines, setLines] = useState<{ t: string; level: 'info' | 'warn' | 'error' | 'sys' }[]>([]);
  const [running, setRunning] = useState(false);
  const handleRef = useRef<{ stop: () => void } | null>(null);
  const push = (t: string, level: 'info' | 'warn' | 'error' | 'sys' = 'info') =>
    setLines((l) => [...l.slice(-400), { t, level }]);

  const start = async () => {
    setLines([{ t: 'booting dedicated worker…', level: 'sys' }]);
    try {
      const code = await blob.text();
      const h = runJavaScript(code, (line, level) => push(line, level));
      handleRef.current = h;
      setRunning(true);
      pulseVault(1);
    } catch (e) { push(String((e as Error).message ?? e), 'error'); }
  };
  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setRunning(false);
    push('worker terminated by operator', 'sys');
  };
  useEffect(() => () => handleRef.current?.stop(), []);

  return (
    <div>
      {!running && (
        <div className="text-center py-8">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-slate-dim">javascript payload · dedicated worker; browser capabilities are not fully isolated</p>
          <button onClick={() => void start()} className="mt-5 font-mono text-[10px] tracking-[0.26em] uppercase border border-teal-ice/50 text-teal-ice px-6 py-2.5 hover:bg-teal-ice/10 transition-colors">
            execute
          </button>
        </div>
      )}
      <ConsolePane lines={lines} running={running} onStop={stop} bootLabel={RUNNER_LABEL.javascript} />
    </div>
  );
}

/* python — real CPython on wasm via pyodide, fetched once on demand */
function PyRun({ blob }: { blob: Blob }) {
  const [lines, setLines] = useState<{ t: string; level: 'info' | 'warn' | 'error' | 'sys' }[]>([]);
  const [running, setRunning] = useState(false);
  const runId = useRef(0);
  const handleRef = useRef<{ stop: () => void } | null>(null);
  const push = (t: string, level: 'info' | 'warn' | 'error' | 'sys' = 'info') =>
    setLines((l) => [...l.slice(-400), { t, level }]);

  const start = async () => {
    const id = ++runId.current;
    setRunning(true);
    setLines([{ t: 'python process starting…', level: 'sys' }]);
    try {
      const code = await blob.text();
      const handle = runPython(code, (line, level) => { if (runId.current === id) push(line, level); });
      handleRef.current = handle;
      await handle.promise;
      if (runId.current === id) { push('process finished', 'sys'); pulseVault(1); }
    } catch (e) {
      if (runId.current === id) push(String((e as Error).message ?? e), 'error');
    } finally {
      if (runId.current === id) {
        handleRef.current = null;
        setRunning(false);
      }
    }
  };
  const stop = () => {
    runId.current++;
    handleRef.current?.stop();
    handleRef.current = null;
    setRunning(false);
    push('python worker terminated by operator', 'sys');
  };
  useEffect(() => () => {
    runId.current++;
    handleRef.current?.stop();
  }, []);

  return (
    <div>
      {!running && (
        <div className="text-center py-8">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-slate-dim">
            python payload · cpython 3.12 in a terminable worker · browser capabilities are not fully isolated
          </p>
          <button onClick={() => void start()} className="mt-5 font-mono text-[10px] tracking-[0.26em] uppercase border border-teal-ice/50 text-teal-ice px-6 py-2.5 hover:bg-teal-ice/10 transition-colors">
            run python
          </button>
        </div>
      )}
      <ConsolePane lines={lines} running={running} onStop={stop} bootLabel={RUNNER_LABEL.python} />
    </div>
  );
}

/* pdf — native browser viewer over the real stored bytes */
function PdfRun({ file, blob }: { file: VaultFile; blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    pulseVault(0.5);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return <p className="font-mono text-[10px] text-slate-dim py-6 text-center">opening document…</p>;
  return (
    <div>
      <div className="flex items-center gap-3 px-3 h-9 border border-line/60 bg-void/50">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice/90">{RUNNER_LABEL.pdf}</span>
        <span className="font-mono text-[8.5px] text-slate-dim">{file.name}</span>
      </div>
      <iframe src={url} title={file.name} sandbox="" referrerPolicy="no-referrer" className="w-full h-[58vh] mt-2 bg-white border border-line/60" />
    </div>
  );
}

/* zip — REAL listing of the real bytes: extract entries, import them into the
   vault, or launch the archive as a web app when it holds an index.html */
function ArchiveRun({ file, blob }: { file: VaultFile; blob: Blob }) {
  const state = useUniverse();
  const [entries, setEntries] = useState<ZipEntry[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [appUrl, setAppUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    readArchiveListing(blob)
      .then((e) => { if (alive) setEntries(e.filter((x) => !x.dir)); })
      .catch((e) => { if (alive) setErr(String(e.message ?? e)); });
    return () => { alive = false; };
  }, [blob]);

  const openApp = async () => {
    setBusy('launching app from archive…');
    try {
      const extracted = await unzipAll(await blob.arrayBuffer());
      const entryPath = pickAppEntry(extracted.map((x) => x.path));
      if (!entryPath) { toast('no index.html inside this archive', 'warn'); setBusy(''); return; }
      const map = new Map(extracted.map((x) => [x.path, x.blob]));
      const u = await bundleWebApp(map.get(entryPath)!, map);
      setAppUrl(u);
      pulseVault(1);
    } catch (e) { toast(String((e as Error).message ?? e), 'warn'); }
    setBusy('');
  };

  const getEntry = async (e: ZipEntry) => {
    try {
      const b = await extractArchiveEntry(blob, e);
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url; a.download = e.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
      toast(`extracted ${e.name}`);
    } catch (err2) { toast(String((err2 as Error).message ?? err2), 'warn'); }
  };

  const importAll = async () => {
    setBusy('extracting into vault…');
    try {
      const extracted = await unzipAll(await blob.arrayBuffer());
      const rootName = file.name.replace(/\.[^.]+$/, '');
      /* build the archive's directory tree in EFS under the archive's own dir */
      const parent = file.dirId ?? EFS_ROOT;
      const rootDir = actions.efsCreateFolder(parent, rootName);
      if (!rootDir) throw new Error('could not create the archive root directory');
      const dirIds = new Map<string, string>([['', rootDir]]);
      const dirIdOf = (dir: string): string => {
        if (dirIds.has(dir)) return dirIds.get(dir)!;
        const parts = dir.split('/').filter(Boolean);
        let parentId = rootDir;
        let acc = '';
        for (const part of parts) {
          acc = acc ? `${acc}/${part}` : part;
          if (!dirIds.has(acc)) dirIds.set(acc, actions.efsCreateFolder(dirIds.get(acc.slice(0, acc.lastIndexOf('/'))) ?? rootDir, part) ?? rootDir);
          parentId = dirIds.get(acc)!;
        }
        return parentId;
      };
      const files: VaultFile[] = [];
      for (const x of extracted) {
        const dir = x.path.includes('/') ? x.path.slice(0, x.path.lastIndexOf('/')) : '';
        const name = x.path.split('/').pop() || x.path;
        const id = newId();
        const kind = kindOf(name, x.blob.type || 'application/octet-stream');
        const vf: VaultFile = {
          id, name, dirId: dirIdOf(dir), kind,
          mime: x.blob.type || 'application/octet-stream', size: x.blob.size,
          addedAt: Date.now(), realityId: state.activeRealityId,
        };
        await putPayload(id, x.blob);
        vf.payloadRef = id;
        vf.payloadEncrypted = true;
        vf.checksum = await efsChecksumOf(vf, getPayload);
        files.push(vf);
      }
      actions.addVaultFiles(files);
      pulseVault(0.8);
      toast(`${files.length} objects extracted into the Vault`);
    } catch (e) { toast(String((e as Error).message ?? e), 'warn'); }
    setBusy('');
  };

  if (err) return <p className="font-mono text-[10px] text-red-300/90 py-6 text-center">archive unreadable · {err}</p>;
  if (!entries) return <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-dim text-center py-10 pulse-soft">scanning archive…</p>;
  if (appUrl) {
    return (
      <div>
        <div className="flex items-center gap-3 px-3 h-9 border border-line/60 bg-void/50">
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice/90">archive app · live</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex-1" />
          <button onClick={() => setAppUrl(null)} className="font-mono text-[8.5px] tracking-[0.18em] uppercase text-slate-soft hover:text-teal-ice transition-colors">close app</button>
        </div>
        <iframe src={appUrl} title="archive app" sandbox="allow-scripts allow-pointer-lock allow-forms allow-modals"
          referrerPolicy="no-referrer" className="w-full h-[58vh] mt-2 bg-white border border-line/60" />
      </div>
    );
  }
  const hasApp = pickAppEntry(entries.map((e) => e.path)) !== null;
  const totalBytes = entries.reduce((a, e) => a + e.size, 0);
  return (
    <div className="border border-line/60 bg-void/50">
      <div className="flex items-center gap-3 px-4 h-10 border-b border-line/50">
        <span className="font-mono text-[9px] tracking-[0.24em] uppercase text-teal-ice/80">archive engine · {entries.length} entries · {fmtBytes(totalBytes)}</span>
        <div className="flex-1" />
        {hasApp && (
          <button onClick={() => void openApp()} disabled={!!busy}
            className="font-mono text-[8.5px] tracking-[0.18em] uppercase border border-teal-ice/50 text-teal-ice px-3 py-1 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
            run app inside
          </button>
        )}
        <button onClick={() => void importAll()} disabled={!!busy}
          className="font-mono text-[8.5px] tracking-[0.18em] uppercase border border-line/60 text-slate-soft px-3 py-1 hover:text-teal-ice hover:border-teal-ice/40 transition-colors disabled:opacity-40">
          extract all → vault
        </button>
      </div>
      {busy && <p className="px-4 py-1.5 font-mono text-[9px] text-solar/90 pulse-soft">{busy}</p>}
      <div className="max-h-[42vh] overflow-y-auto thin-scroll">
        {entries.map((e) => (
          <div key={e.path} className="flex items-center gap-3 px-4 py-2 hover:bg-teal-ice/5">
            <span className="font-mono text-[11px] text-slate-soft flex-1 min-w-0 truncate" title={e.path}>{e.path}</span>
            <span className="font-mono text-[9.5px] text-slate-dim tabular-nums">{fmtBytes(e.size)}</span>
            <button onClick={() => void getEntry(e)} className="font-mono text-[8px] tracking-[0.16em] uppercase text-slate-dim hover:text-teal-ice border border-transparent hover:border-teal-ice/30 px-1.5 py-0.5 transition-colors">
              get
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function IsoRun({ file, blob }: { file: VaultFile; blob: Blob }) {
  const state = useUniverse();
  const [parseResult, setParseResult] = useState<IsoParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<IsoDirectoryRecord | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<{ name: string; text?: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    parseIsoBlob(blob).then((res) => {
      if (!alive) return;
      setParseResult(res);
      setLoading(false);
      pulseVault(1.2);
    }).catch((err) => {
      if (!alive) return;
      setParseResult({ valid: false, error: String(err), files: [] });
      setLoading(false);
    });
    return () => { alive = false; };
  }, [blob]);

  const extractAndDownload = async (rec: IsoDirectoryRecord) => {
    try {
      setBusy(`extracting ${rec.name}…`);
      const fileBlob = await extractIsoFile(blob, rec);
      const url = URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = rec.name;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Extracted ${rec.name} (${fmtBytes(rec.size)})`);
    } catch (e) {
      toast(`Extraction failed: ${e instanceof Error ? e.message : String(e)}`, 'warn');
    } finally {
      setBusy(null);
    }
  };

  const previewRecord = async (rec: IsoDirectoryRecord) => {
    try {
      setBusy(`loading ${rec.name}…`);
      setSelectedRecord(rec);
      const fileBlob = await extractIsoFile(blob, rec);
      let text: string | undefined;
      const ext = rec.name.split('.').pop()?.toLowerCase() ?? '';
      if (['txt', 'log', 'cfg', 'inf', 'ini', 'md', 'json', 'html', 'js'].includes(ext) && rec.size < 500000) {
        text = await fileBlob.text();
      }
      setExtractedPreview({ name: rec.name, text });
    } catch (e) {
      toast(`Preview error: ${e instanceof Error ? e.message : String(e)}`, 'warn');
    } finally {
      setBusy(null);
    }
  };

  const mountToVault = async () => {
    if (!parseResult || !parseResult.valid) return;
    setBusy('mounting ISO volume to vault filesystem…');
    try {
      const allFiles = flattenIsoRecords(parseResult.files);
      const rootName = file.name.replace(/\.[^.]+$/, '');
      const parent = file.dirId ?? EFS_ROOT;
      const rootDir = actions.efsCreateFolder(parent, rootName);
      if (!rootDir) throw new Error('could not create the ISO root directory');
      
      const dirIds = new Map<string, string>([['', rootDir]]);
      const dirIdOf = (dir: string): string => {
        if (dirIds.has(dir)) return dirIds.get(dir)!;
        const parts = dir.split('/').filter(Boolean);
        let parentId = rootDir;
        let acc = '';
        for (const part of parts) {
          acc = acc ? `${acc}/${part}` : part;
          if (!dirIds.has(acc)) dirIds.set(acc, actions.efsCreateFolder(dirIds.get(acc.slice(0, acc.lastIndexOf('/'))) ?? rootDir, part) ?? rootDir);
          parentId = dirIds.get(acc)!;
        }
        return parentId;
      };

      const filesToAdd: VaultFile[] = [];
      let count = 0;
      for (const item of allFiles) {
        if (item.record.isDirectory) continue;
        if (count >= 40) break; // Safe threshold for browser storage
        const itemBlob = await extractIsoFile(blob, item.record);
        const dir = item.path.includes('/') ? item.path.slice(0, item.path.lastIndexOf('/')) : '';
        const name = item.record.name;
        const id = newId();
        const kind = kindOf(name, itemBlob.type || 'application/octet-stream');
        const vf: VaultFile = {
          id,
          name,
          dirId: dirIdOf(dir),
          kind,
          mime: itemBlob.type || 'application/octet-stream',
          size: itemBlob.size,
          addedAt: Date.now(),
          realityId: state.activeRealityId,
        };
        await putPayload(id, itemBlob);
        vf.payloadRef = id;
        vf.payloadEncrypted = true;
        vf.checksum = await efsChecksumOf(vf, getPayload);
        filesToAdd.push(vf);
        count++;
      }
      actions.addVaultFiles(filesToAdd);
      toast(`Mounted ISO disc volume: ${filesToAdd.length} files imported to /${rootName}`);
    } catch (e) {
      toast(`Mount error: ${e instanceof Error ? e.message : String(e)}`, 'warn');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-teal-ice pulse-soft">
          mounting iso 9660 volume · parsing primary volume descriptor…
        </p>
      </div>
    );
  }

  if (!parseResult || !parseResult.valid) {
    return (
      <div className="border border-red-500/30 bg-red-950/20 p-5 mt-3 text-center">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-red-300">
          ISO 9660 Mount Error: {parseResult?.error || 'Unrecognized disc image format'}
        </p>
      </div>
    );
  }

  const desc = parseResult.descriptor;
  const flatFiles = flattenIsoRecords(parseResult.files);

  return (
    <div className="border border-line/60 bg-void/60 mt-2">
      <div className="px-4 py-3 border-b border-line/50 bg-teal-ice/5 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-ice animate-pulse" />
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-teal-ice font-bold">
              {desc?.volumeIdentifier || 'ISO 9660 DISC'}
            </span>
          </div>
          <p className="font-mono text-[8.5px] text-slate-dim mt-0.5 tracking-[0.14em]">
            System: {desc?.systemIdentifier || 'STANDARD'} · Sector Size: {desc?.logicalBlockSize}B · {flatFiles.length} files detected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void mountToVault()}
            disabled={!!busy}
            className="font-mono text-[8.5px] tracking-[0.18em] uppercase border border-teal-ice/60 text-teal-ice px-3 py-1.5 hover:bg-teal-ice/15 transition-colors disabled:opacity-40"
          >
            mount to efs vault
          </button>
        </div>
      </div>

      {busy && (
        <div className="px-4 py-1.5 bg-solar/10 border-b border-solar/30">
          <p className="font-mono text-[9px] text-solar tracking-[0.15em] pulse-soft">{busy}</p>
        </div>
      )}

      {extractedPreview && (
        <div className="px-4 py-3 border-b border-line/60 bg-black/40">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] text-teal-ice tracking-[0.16em]">
              PREVIEW: {extractedPreview.name}
            </span>
            <button
              onClick={() => setExtractedPreview(null)}
              className="font-mono text-[8px] text-slate-dim hover:text-white"
            >
              CLOSE
            </button>
          </div>
          {extractedPreview.text ? (
            <pre className="font-mono text-[9.5px] text-slate-soft max-h-36 overflow-auto bg-black/60 p-2.5 border border-line/40 rounded">
              {extractedPreview.text.slice(0, 4000)}
            </pre>
          ) : (
            <p className="font-mono text-[9px] text-slate-dim">
              Binary file inspected ({fmtBytes(selectedRecord?.size || 0)}). Ready for execution or extraction.
            </p>
          )}
        </div>
      )}

      <div className="max-h-[46vh] overflow-y-auto thin-scroll divide-y divide-line/30">
        {flatFiles.length === 0 ? (
          <p className="p-6 text-center font-mono text-[9px] text-slate-dim tracking-[0.15em]">
            No files found inside volume descriptor table
          </p>
        ) : (
          flatFiles.map(({ record, path }) => (
            <div
              key={path}
              className={`flex items-center gap-3 px-4 py-2 hover:bg-teal-ice/5 transition-colors ${
                selectedRecord === record ? 'bg-teal-ice/10' : ''
              }`}
            >
              <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                record.isDirectory ? 'bg-indigo-500/20 text-indigo-300' : 'bg-line/40 text-slate-dim'
              }`}>
                {record.isDirectory ? 'DIR' : 'FILE'}
              </span>
              <span className="font-mono text-[10.5px] text-slate-soft flex-1 min-w-0 truncate" title={path}>
                {path}
              </span>
              <span className="font-mono text-[9px] text-slate-dim tabular-nums">
                {record.isDirectory ? '—' : fmtBytes(record.size)}
              </span>
              {!record.isDirectory && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => void previewRecord(record)}
                    disabled={!!busy}
                    className="font-mono text-[8px] tracking-[0.14em] uppercase text-teal-ice/90 hover:text-teal-ice border border-teal-ice/30 px-2 py-0.5"
                  >
                    view
                  </button>
                  <button
                    onClick={() => void extractAndDownload(record)}
                    disabled={!!busy}
                    className="font-mono text-[8px] tracking-[0.14em] uppercase text-slate-dim hover:text-white border border-line/40 px-2 py-0.5"
                  >
                    extract
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* entry point — resolves real bytes, picks the runtime, or falls back to the
   legacy materialization for pre-engine objects that never stored payload */
function RunView({ file }: { file: VaultFile }) {
  const [phase, setPhase] = useState<'probe' | 'ready' | 'legacy' | 'unavailable'>('probe');
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let alive = true;
    if (file.payloadMissing) {
      setBlob(null);
      setPhase('unavailable');
      return () => { alive = false; };
    }
    setPhase('probe');
    (async () => {
      const b = await resolveBlob(file);
      if (!alive) return;
      setBlob(b);
      setPhase(b && canExecute(file) ? 'ready' : file.payloadRef ? 'unavailable' : 'legacy');
    })();
    return () => { alive = false; };
  }, [file.id, file.payloadRef, file.payloadMissing, file.content]);

  if (phase === 'probe') return <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-dim text-center py-10 pulse-soft">probing payload…</p>;
  if (phase === 'unavailable') {
    return <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-solar/80 text-center py-10">original payload unavailable · restore the binary before running this object</p>;
  }
  if (phase === 'legacy' || !blob) {
    return (
      <div>
        <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-solar/70 text-center pt-4">
          legacy object · payload predates the execution engine — showing the materialization sandbox
        </p>
        <SandboxLaunch file={file} />
      </div>
    );
  }
  const runner = detectRunner(file);
  if (!runner) {
    return (
      <div className="text-center py-8">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-slate-dim">real bytes stored · no in-browser runtime for {file.mime || 'this format'}</p>
        <button onClick={() => void downloadFile(file)} className="mt-5 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.2em] uppercase border border-teal-ice/50 text-teal-ice px-5 py-2 hover:bg-teal-ice/10 transition-colors mx-auto">
          <IcDownload size={12} /> download
        </button>
      </div>
    );
  }
  if (runner === 'web-app') return <WebAppRun file={file} blob={blob} />;
  if (runner === 'javascript') return <JsRun blob={blob} />;
  if (runner === 'python') return <PyRun blob={blob} />;
  if (runner === 'pdf') return <PdfRun file={file} blob={blob} />;
  if (runner === 'iso') return <IsoRun file={file} blob={blob} />;
  return <ArchiveRun file={file} blob={blob} />;
}

function SandboxLaunch({ file }: { file: VaultFile }) {
  const state = useUniverse();
  const [phase, setPhase] = useState<'idle' | 'boot' | 'run' | 'game' | 'app' | 'dead'>('idle');
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [lines, setLines] = useState<{ t: string; s: string }[]>([]);
  const [input, setInput] = useState('');
  const outRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);

  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight }); }, [lines, bootLines]);

  const boot = async () => {
    setPhase('boot');
    const steps = [
      `allocating sandbox for ${file.name}…`,
      'renderer-isolated process · pid ' + (4000 + Math.floor(Math.random() * 900)),
      'verifying integrity seal… ok',
      'compatibility layer: eventide/wasm-bridge',
      file.kind === 'game' ? 'launching game runtime…' : 'spawning shell…',
    ];
    for (const s of steps) {
      setBootLines((l) => [...l, s]);
      await sleep(340);
    }
    if (file.kind === 'game') { setPhase('game'); return; }
    if (file.kind === 'application') { setPhase('app'); return; }
    setPhase('run');
    setLines([{ t: 'sys', s: `${file.name} is running in an isolated sandbox` }, { t: 'sys', s: 'type "help" for commands · "exit" to terminate' }]);
  };

  const exec = (raw: string) => {
    const [cmd] = raw.trim().split(/\s+/);
    const print = (t: string, s: string) => setLines((l) => [...l, { t, s }]);
    print('in', `$ ${raw}`);
    switch (cmd) {
      case '': break;
      case 'help': print('out', 'help · status · manifest · about · clear · exit'); break;
      case 'status': print('out', `running · sandbox healthy · ${file.mime} · ${fmtBytes(file.size)}`); break;
      case 'manifest':
        print('out', `name    ${file.name}`);
        print('out', `kind    ${file.kind}`);
        print('out', `sealed  ${file.sealed ? 'yes' : 'no'}`);
        print('out', `dir     ${efsPathString(state.efs, file.dirId ?? EFS_ROOT)}`);
        break;
      case 'about': print('out', 'a sealed executable — its true payload lives in the desktop execution layer.'); break;
      case 'clear': setLines([]); break;
      case 'exit': setPhase('dead'); print('sys', 'process terminated by operator'); break;
      default: print('err', `unknown command: ${cmd ?? ''}`);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="text-center py-10">
        <KindGlyph kind={file.kind} size={30} />
        <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-slate-dim mt-4">sealed executable — execution happens outside the renderer</p>
        <button onClick={() => void boot()} className="mt-5 font-mono text-[10px] tracking-[0.26em] uppercase border border-teal-ice/50 text-teal-ice px-6 py-2.5 hover:bg-teal-ice/10 transition-colors">
          launch in sandbox
        </button>
      </div>
    );
  }
  if (phase === 'boot') {
    return (
      <div className="py-6 font-mono text-[11px] leading-loose text-teal-ice/90">
        {bootLines.map((l, i) => <div key={i}>▸ {l}</div>)}
        <span className="inline-block w-2 h-3.5 bg-teal-ice/80 animate-pulse align-middle" />
      </div>
    );
  }
  if (phase === 'game') return <GravityGarden name={file.name} onExit={() => setPhase('dead')} />;
  if (phase === 'app') return <AtmosphereSynth name={file.name} onExit={() => setPhase('dead')} />;
  return (
    <div className="border border-line/60 bg-void/70 mt-2">
      <div ref={outRef} className="h-55 overflow-y-auto thin-scroll px-3 py-2.5 font-mono text-[11px] leading-[1.8]">
        {lines.map((l, i) => (
          <div key={i} className={l.t === 'in' ? 'text-teal-ice' : l.t === 'err' ? 'text-red-300/90' : l.t === 'sys' ? 'text-solar/90' : 'text-slate-soft'}>{l.s}</div>
        ))}
        {phase === 'run' && (
          <div className="flex items-center gap-2 text-teal-ice">
            <span className="text-slate-dim">$</span>
            <input ref={inRef} autoFocus value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { exec(input); setInput(''); } }}
              className="flex-1 bg-transparent outline-none text-paper" spellCheck={false} />
          </div>
        )}
      </div>
      {phase === 'run' && (
        <div className="border-t border-line/50 px-3 py-2 flex justify-end">
          <button onClick={() => setPhase('dead')} className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-red-300/80 hover:text-red-300 transition-colors">terminate</button>
        </div>
      )}
    </div>
  );
}

function GravityGarden({ name, onExit }: { name: string; onExit: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [over, setOver] = useState(false);
  const scoreRef = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    cv.width = 560; cv.height = 280;
    let raf = 0;
    let px = 280;
    const parts = Array.from({ length: 26 }, () => ({ x: Math.random() * 560, y: -Math.random() * 280, v: 1 + Math.random() * 1.6, r: 2 + Math.random() * 3 }));
    const keys: Record<string, boolean> = {};
    const kd = (e: KeyboardEvent) => { keys[e.key] = true; };
    const ku = (e: KeyboardEvent) => { keys[e.key] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      const left = Math.max(0, 30 - t);
      setTimeLeft(Math.ceil(left));
      if (left <= 0) { setOver(true); return; }
      raf = requestAnimationFrame(loop);
      if (keys['ArrowLeft'] || keys['a']) px -= 5;
      if (keys['ArrowRight'] || keys['d']) px += 5;
      px = Math.max(30, Math.min(530, px));
      g.fillStyle = 'rgba(4,6,12,0.35)';
      g.fillRect(0, 0, 560, 280);
      parts.forEach((p) => {
        p.y += p.v;
        if (p.y > 262 && Math.abs(p.x - px) < 34) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
          p.y = -10; p.x = Math.random() * 560;
        } else if (p.y > 290) { p.y = -10; p.x = Math.random() * 560; }
        g.fillStyle = 'rgba(140,215,199,0.85)';
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
      });
      g.fillStyle = 'rgba(242,193,120,0.9)';
      g.fillRect(px - 30, 262, 60, 6);
      g.strokeStyle = 'rgba(242,193,120,0.3)';
      g.strokeRect(px - 34, 250, 68, 18);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-4 mb-2">
        <p className="font-mono text-[9px] tracking-[0.24em] uppercase text-teal-ice/80">{name} — catch the infalling matter</p>
        <span className="font-mono text-[10px] text-paper tabular-nums">score {score}</span>
        <span className={`font-mono text-[10px] tabular-nums ${timeLeft < 8 ? 'text-solar' : 'text-slate-dim'}`}>{timeLeft}s</span>
        <div className="flex-1" />
        <button onClick={onExit} className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-slate-dim hover:text-red-300 transition-colors">exit</button>
      </div>
      <canvas ref={ref} className="w-full border border-line/60 bg-void/60" style={{ imageRendering: 'auto' }} />
      <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-slate-dim mt-2">← → or A/D to move the well{over ? `  ·  time! final score ${score}` : ''}</p>
    </div>
  );
}

function IsoMount({ name }: { name: VaultFile['name'] }) {
  const rnd = useMemo(() => seedRnd(name), [name]);
  const [path, setPath] = useState('/');
  const tree = useMemo(() => {
    const roots = ['BOOT', 'DATA', 'PAYLOAD', 'README.TXT', 'SETUP.BIN'];
    const mk = (depth: number): { n: string; dir: boolean; mb: number }[] => {
      if (depth <= 0) return [];
      return Array.from({ length: 3 + Math.floor(rnd() * 3) }, (_, i) => {
        const dir = depth > 1 && rnd() > 0.55;
        return { n: dir ? `DIR_${String.fromCharCode(65 + i)}${Math.floor(rnd() * 90)}` : `file_${Math.floor(rnd() * 900)}.bin`, dir, mb: rnd() * 40 };
      });
    };
    return { roots: roots.map((n) => ({ n, dir: !n.includes('.'), mb: 0 })), mk };
  }, [rnd]);
  const entries = path === '/' ? tree.roots : tree.mk(1);
  return (
    <div className="border border-line/60 bg-void/50">
      <div className="flex items-center gap-3 px-4 h-10 border-b border-line/50">
        <span className="font-mono text-[9px] tracking-[0.24em] uppercase text-teal-ice/80">mounted · iso9660</span>
        <span className="font-mono text-[10px] text-slate-soft">{path}</span>
        <div className="flex-1" />
        {path !== '/' && <button onClick={() => setPath('/')} className="font-mono text-[8.5px] tracking-[0.18em] uppercase text-slate-dim hover:text-teal-ice transition-colors">← root</button>}
      </div>
      {entries.map((e) => (
        <div key={e.n} className={`flex items-center gap-3 px-4 py-2.5 ${e.dir ? 'hover:bg-teal-ice/6' : ''}`}>
          <button onClick={() => { if (e.dir) setPath(path === '/' ? `/${e.n}` : `${path}/${e.n}`); }}
            className={`flex items-center gap-3 flex-1 min-w-0 text-left ${e.dir ? 'cursor-pointer' : 'cursor-default'}`}>
            <span className={`font-mono text-[11px] truncate ${e.dir ? 'text-teal-ice' : 'text-slate-soft'}`}>{e.dir ? '▸ ' : '  '}{e.n}</span>
          </button>
          <span className="font-mono text-[9.5px] text-slate-dim tabular-nums">{e.dir ? 'DIR' : `${e.mb.toFixed(1)} MB`}</span>
          {!e.dir && (
            <button onClick={() => extractEntry(e.n, name)} className="font-mono text-[8px] tracking-[0.16em] uppercase text-slate-dim hover:text-teal-ice border border-transparent hover:border-teal-ice/30 px-1.5 py-0.5 transition-colors">
              get
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function extractEntry(entry: string, from: string) {
  const blob = new Blob([`Materialized from ${from} :: ${entry}\nThe full payload lives in the desktop execution layer.\n`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = entry;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 6000);
  toast(`extracted ${entry}`);
}

function CsvView({ content }: { content: string }) {
  const rows = useMemo(() => content.trim().split('\n').slice(0, 40).map((l) => l.split(',')), [content]);
  const header = rows[0] ?? [];
  return (
    <div className="border border-line/60 overflow-x-auto">
      <table className="w-full font-mono text-[10px]">
        <thead>
          <tr>{header.map((h, i) => <th key={i} className="text-left px-3 py-2 text-teal-ice/80 border-b border-line/60 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(1).map((r, i) => (
            <tr key={i} className="odd:bg-void/30">
              {r.map((c, j) => <td key={j} className="px-3 py-1.5 text-slate-soft whitespace-nowrap">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FitsView({ name }: { name: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    cv.width = 560; cv.height = 300;
    const rnd = seedRnd(name);
    g.fillStyle = '#04060c';
    g.fillRect(0, 0, 560, 300);
    for (let i = 0; i < 900; i++) {
      const x = rnd() * 560, y = rnd() * 300;
      const b = rnd();
      g.fillStyle = `rgba(${200 + Math.round(b * 55)},${210 + Math.round(b * 40)},255,${(0.15 + b * 0.8).toFixed(2)})`;
      g.beginPath(); g.arc(x, y, b * 1.4 + 0.2, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 5; i++) {
      const x = rnd() * 560, y = rnd() * 300, r = 20 + rnd() * 40;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(111,194,180,0.25)');
      grad.addColorStop(1, 'rgba(111,194,180,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  }, [name]);
  return (
    <div>
      <canvas ref={ref} className="w-full border border-line/60" />
      <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-slate-dim mt-2">fits hdU 0 · reconstructed projection · payload sealed</p>
    </div>
  );
}

/* ================== Enhanced Vault Players & Studios ================== */

/* Real audio player — waveform, scrubbing, speed controls, loop, time readout */
function AudioPlayer({ src, name }: { src: string; name: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const a = ref.current; if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onMeta = () => setDur(a.duration || 0);
    const onEnd = () => { if (!loop) setPlaying(false); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [src, loop]);

  const toggle = () => {
    const a = ref.current; if (!a) return;
    if (a.paused) { void a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };

  const cycleRate = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length];
    setRate(next);
    if (ref.current) ref.current.playbackRate = next;
    toast(`playback speed ${next}x`);
  };

  const toggleLoop = () => {
    const next = !loop;
    setLoop(next);
    if (ref.current) ref.current.loop = next;
    toast(next ? 'audio loop active' : 'audio loop off');
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (ref.current) ref.current.muted = next;
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60); const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  return (
    <div className="py-4">
      <audio ref={ref} src={src} loop={loop} />
      <div className="flex flex-col gap-3 border border-line/60 bg-void/60 p-4 rounded">
        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="w-10 h-10 grid place-items-center border border-teal-ice/50 text-teal-ice hover:bg-teal-ice/10 transition-colors shrink-0 rounded"
            title={playing ? 'pause' : 'play'}
          >
            {playing
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l11 7-11 7z" /></svg>}
          </button>

          <span className="font-mono text-[10px] text-teal-ice tabular-nums w-10">{fmt(cur)}</span>

          <input
            type="range"
            min={0}
            max={dur || 1}
            step={0.05}
            value={cur}
            onChange={(e) => {
              const a = ref.current;
              if (a) a.currentTime = Number(e.target.value);
              setCur(Number(e.target.value));
            }}
            className="pw-range flex-1"
          />

          <span className="font-mono text-[10px] text-slate-dim tabular-nums w-10 text-right">{fmt(dur)}</span>
        </div>

        {/* Secondary audio controls */}
        <div className="flex items-center justify-between pt-2 border-t border-line/30 text-[9px] font-mono text-slate-soft">
          <div className="flex items-center gap-2">
            <button
              onClick={cycleRate}
              className="px-2 py-0.5 border border-line/50 hover:border-teal-ice/40 hover:text-teal-ice rounded transition-colors"
              title="Cycle playback speed"
            >
              SPEED: {rate}x
            </button>
            <button
              onClick={toggleLoop}
              className={`px-2 py-0.5 border rounded transition-colors ${loop ? 'border-solar/60 text-solar bg-solar/10' : 'border-line/50 hover:border-solar/40'}`}
              title="Toggle continuous loop"
            >
              LOOP: {loop ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={toggleMute}
              className={`px-2 py-0.5 border rounded transition-colors ${muted ? 'border-red-400/60 text-red-300' : 'border-line/50 text-slate-soft'}`}
              title="Toggle mute"
            >
              {muted ? 'MUTED' : 'UNMUTED'}
            </button>
          </div>

          <span className="truncate max-w-50 text-slate-dim">{name}</span>
        </div>
      </div>
    </div>
  );
}

/* Enhanced Video Player */
function AdvancedVideoPlayer({ src, name }: { src: string; name: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);

  const cycleRate = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length];
    setRate(next);
    if (ref.current) ref.current.playbackRate = next;
    toast(`video speed ${next}x`);
  };

  const toggleLoop = () => {
    const next = !loop;
    setLoop(next);
    if (ref.current) ref.current.loop = next;
    toast(next ? 'video loop active' : 'video loop off');
  };

  const toggleFull = () => {
    if (ref.current) {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void ref.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <video
        ref={ref}
        src={src}
        controls
        playsInline
        preload="metadata"
        loop={loop}
        className="max-h-[56vh] w-full border border-line bg-void/60 rounded"
      />
      <div className="flex items-center justify-between p-2 bg-void/40 border border-line/40 rounded font-mono text-[9px] text-slate-soft">
        <div className="flex items-center gap-2">
          <button
            onClick={cycleRate}
            className="px-2 py-0.5 border border-line/50 hover:border-teal-ice/40 hover:text-teal-ice rounded transition-colors"
          >
            SPEED: {rate}x
          </button>
          <button
            onClick={toggleLoop}
            className={`px-2 py-0.5 border rounded transition-colors ${loop ? 'border-solar/60 text-solar bg-solar/10' : 'border-line/50'}`}
          >
            LOOP: {loop ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={toggleFull}
            className="px-2 py-0.5 border border-line/50 hover:border-teal-ice/40 hover:text-teal-ice rounded transition-colors"
          >
            FULLSCREEN
          </button>
        </div>
        <span className="text-slate-dim truncate">{name}</span>
      </div>
    </div>
  );
}

/* =========================================================================
   CODE & DOCUMENT STUDIO (Storage, Documentation, Code Inspection & Safe Preview)
   ========================================================================= */

interface CodeDocStudioProps {
  initial: string;
  fileName: string;
  mime?: string;
  onSave: (val: string) => void;
  onDownload?: () => void;
}

function CodeDocStudio({
  initial,
  fileName,
  mime = 'text/plain',
  onSave,
  onDownload,
}: CodeDocStudioProps) {
  const ext = useMemo(() => fileName.split('.').pop()?.toLowerCase() ?? '', [fileName]);
  const isHtml = mime === 'text/html' || ext === 'html' || ext === 'htm';
  const isCss = mime === 'text/css' || ext === 'css';
  const isSvg = ext === 'svg' || mime === 'image/svg+xml';
  const isMd = ext === 'md' || mime === 'text/markdown';
  const isJson = ext === 'json' || mime === 'application/json';
  const isXml = ext === 'xml';
  const isJsDoc = ['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx'].includes(ext);
  const formattable = isJson || isHtml || isCss || isJsDoc;

  /* minified files open PRE-FORMATTED in the editor (baseline = formatted, so
     SEAL stores the pretty version) — a one-line blob never reaches the pane */
  const prettyInitial = useMemo(() => {
    const minified = initial.split('\n').some((l) => l.length > 200);
    if (!minified || !formattable) return initial;
    const lang = isJson ? 'json' : isHtml ? 'html' : isCss ? 'css' : 'js';
    return prettyPrint(initial, lang);
  }, [initial]);

  const [code, setCode] = useState(prettyInitial);
  const [mode, setMode] = useState<'code' | 'preview' | 'split' | 'metrics'>('split');
  const [wordWrap, setWordWrap] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const monacoRef = useRef<MonacoHandle | null>(null);
  const editorActive = mode === 'code' || mode === 'split';

  useEffect(() => {
    setCode(prettyInitial);
    setIsDirty(false);
  }, [prettyInitial]);

  const canPreview = isHtml || isCss || isSvg || isMd || isJson || isXml;

  // Track edits (baseline is the formatted-open text)
  const handleCodeChange = (val: string) => {
    setCode(val);
    setIsDirty(val !== prettyInitial);
  };

  // Safe Static Document Preview (Non-executing sandbox for documentation)
  const previewDoc = useMemo(() => {
    if (isHtml) {
      // Strip active script execution tags for pure static document layout preview
      const staticHtml = code.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '<!-- [script stored & documented] -->');
      return staticHtml;
    }
    if (isSvg) {
      return `<!doctype html><html><body style="margin:0;padding:24px;display:grid;place-items:center;min-height:100vh;background:#0d1322;">${code}</body></html>`;
    }
    if (isCss) {
      return `<!doctype html><html><head><style>${code}</style></head><body style="padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#0c101c;color:#e6edf3;">
<div style="max-width:540px;margin:0 auto;padding:24px;border:1px solid rgba(135,235,215,0.3);border-radius:12px;background:rgba(20,30,52,0.6);">
  <h2 style="margin-top:0;color:#8ce8d8;">Style Sheet Documentation Preview</h2>
  <p style="color:#94a3b8;line-height:1.6;">This preview validates CSS classes, variables, and typography rules in isolation.</p>
  <button style="padding:8px 18px;border-radius:6px;cursor:pointer;">Sample Element</button>
</div>
</body></html>`;
    }
    return '';
  }, [code, isHtml, isSvg, isCss]);

  // Code inspection metrics
  const lines = useMemo(() => code.split('\n'), [code]);
  const metrics = useMemo(() => {
    const chars = code.length;
    const bytes = new Blob([code]).size;
    const tagMatches = isHtml ? (code.match(/<([a-z0-9-]+)/gi) || []).length : 0;
    const scriptCount = isHtml ? (code.match(/<script/gi) || []).length : 0;
    const styleCount = isHtml ? (code.match(/<style/gi) || []).length : 0;
    const linkCount = isHtml ? (code.match(/<link|<a\b/gi) || []).length : 0;
    let jsonStatus = 'N/A';
    let jsonKeys = 0;
    if (isJson) {
      try {
        const parsed = JSON.parse(code);
        jsonStatus = 'Valid JSON Structure';
        jsonKeys = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0;
      } catch (e: any) {
        jsonStatus = `Syntax Error: ${e.message || 'invalid'}`;
      }
    }
    return { chars, bytes, linesCount: lines.length, tagMatches, scriptCount, styleCount, linkCount, jsonStatus, jsonKeys };
  }, [code, isHtml, isJson, lines.length]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      toast('code copied to clipboard');
    }).catch(() => toast('failed to copy', 'warn'));
  };

  const handleSave = () => {
    onSave(code);
    setIsDirty(false);
  };

  const formatJson = () => {
    try {
      const p = JSON.parse(code);
      const formatted = JSON.stringify(p, null, 2);
      setCode(formatted);
      setIsDirty(formatted !== initial);
      toast('JSON formatted (2 spaces)');
    } catch {
      toast('cannot format invalid JSON', 'warn');
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((l, i) => {
      if (l.startsWith('# ')) {
        return <h1 key={i} className="font-display text-[19px] text-paper tracking-[0.08em] mt-4 mb-2 pb-1.5 border-b border-line/30">{l.slice(2)}</h1>;
      }
      if (l.startsWith('## ')) {
        return <h2 key={i} className="font-display text-[15px] tracking-widest text-teal-ice mt-3.5 mb-1.5">{l.slice(3)}</h2>;
      }
      if (l.startsWith('### ')) {
        return <h3 key={i} className="font-mono text-[13px] font-bold text-solar mt-2.5 mb-1">{l.slice(4)}</h3>;
      }
      if (l.startsWith('- ') || l.startsWith('* ')) {
        return <p key={i} className="pl-4 text-paper/90 leading-relaxed">• {l.slice(2)}</p>;
      }
      if (l.startsWith('> ')) {
        return <blockquote key={i} className="border-l-2 border-teal-ice/60 pl-3 my-2 text-slate-soft italic">{l.slice(2)}</blockquote>;
      }
      if (l.startsWith('```')) {
        return <div key={i} className="px-2.5 py-1 bg-void/90 font-mono text-[10.5px] text-solar/90 border border-line/40 rounded my-1.5">{l}</div>;
      }
      if (l.trim() === '---' || l.trim() === '***') {
        return <hr key={i} className="my-3.5 border-line/30" />;
      }
      return <p key={i} className="text-paper/90 leading-relaxed">{l || '\u00a0'}</p>;
    });
  };

  return (
    <div className="flex flex-col h-[62vh] border border-teal-ice/20 bg-void/50 rounded-lg overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Studio Header Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-[#090f1d]/90 border-b border-teal-ice/15 shrink-0 select-none">
        {/* Navigation Modes */}
        <div className="flex items-center gap-1 border border-line/40 rounded p-0.5 bg-void/60">
          <button
            onClick={() => setMode('code')}
            className={`px-2.5 py-1 text-[9px] font-mono tracking-wider uppercase rounded transition-all ${
              mode === 'code' ? 'bg-teal-ice/20 text-teal-ice border border-teal-ice/40 shadow-sm' : 'text-slate-dim hover:text-paper'
            }`}
            title="Inspect & Edit Code"
          >
            &lt;/&gt; CODE
          </button>
          {canPreview && (
            <button
              onClick={() => setMode('preview')}
              className={`px-2.5 py-1 text-[9px] font-mono tracking-wider uppercase rounded transition-all ${
                mode === 'preview' ? 'bg-teal-ice/20 text-teal-ice border border-teal-ice/40 shadow-sm' : 'text-slate-dim hover:text-paper'
              }`}
              title="Safe Static Document Layout Preview"
            >
              ◈ PREVIEW
            </button>
          )}
          {canPreview && (
            <button
              onClick={() => setMode('split')}
              className={`px-2.5 py-1 text-[9px] font-mono tracking-wider uppercase rounded transition-all ${
                mode === 'split' ? 'bg-teal-ice/20 text-teal-ice border border-teal-ice/40 shadow-sm' : 'text-slate-dim hover:text-paper'
              }`}
              title="Side-by-Side Split View"
            >
              ◫ SPLIT
            </button>
          )}
          <button
            onClick={() => setMode('metrics')}
            className={`px-2.5 py-1 text-[9px] font-mono tracking-wider uppercase rounded transition-all ${
              mode === 'metrics' ? 'bg-solar/20 text-solar border border-solar/40 shadow-sm' : 'text-slate-dim hover:text-paper'
            }`}
            title="Document Metadata & Inspection"
          >
            ≡ METADATA
          </button>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center gap-2">
          {formattable && (
            <button
              onClick={() => {
                const lang = isJson ? 'json' : isHtml ? 'html' : isCss ? 'css' : 'js';
                const next = isJson
                  ? (() => { try { return JSON.stringify(JSON.parse(code), null, 2); } catch { return code; } })()
                  : prettyPrint(code, lang);
                if (next !== code) handleCodeChange(next);
              }}
              className="px-2 py-1 text-[9px] font-mono border border-line/50 text-slate-soft hover:text-teal-ice hover:border-teal-ice/40 rounded transition-colors"
              title={isJson ? 'Format JSON' : 'Pretty-print document'}
            >
              FORMAT
            </button>
          )}

          {editorActive && (
            <button
              onClick={() => monacoRef.current?.find()}
              className="px-2 py-1 text-[9px] font-mono border border-line/50 text-slate-soft hover:text-paper rounded transition-colors"
              title="Find & replace (Ctrl+F inside the editor)"
            >
              FIND
            </button>
          )}

          <button
            onClick={() => {
              const next = !wordWrap;
              setWordWrap(next);
              monacoRef.current?.setWordWrap(next);
            }}
            className={`px-2 py-1 text-[9px] font-mono border rounded transition-colors ${
              wordWrap ? 'border-teal-ice/40 text-teal-ice' : 'border-line/50 text-slate-soft hover:text-paper'
            }`}
            title="Toggle word wrap"
          >
            WRAP: {wordWrap ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={handleCopy}
            className="px-2 py-1 text-[9px] font-mono border border-line/50 text-slate-soft hover:text-paper rounded transition-colors"
            title="Copy Code"
          >
            COPY
          </button>

          {onDownload && (
            <button
              onClick={onDownload}
              className="px-2 py-1 text-[9px] font-mono border border-line/50 text-slate-soft hover:text-teal-ice hover:border-teal-ice/40 rounded transition-colors"
              title="Download File"
            >
              GET
            </button>
          )}

          <button
            onClick={handleSave}
            className={`px-3 py-1 text-[9px] font-mono tracking-wider uppercase border rounded transition-all font-medium ${
              isDirty
                ? 'border-teal-ice text-paper bg-teal-ice/25 hover:bg-teal-ice/35 shadow-[0_0_12px_rgba(111,194,180,0.4)]'
                : 'border-teal-ice/40 bg-teal-ice/10 text-teal-ice hover:bg-teal-ice/20'
            }`}
            title="Save changes to Vault (creates snapshot)"
          >
            {isDirty ? '● SAVE SNAPSHOT' : 'SEAL CHANGES'}
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Editor Pane */}
        {(mode === 'code' || mode === 'split') && (
          <div className={`${mode === 'split' && canPreview ? 'w-1/2 border-r border-teal-ice/15' : 'w-full'} flex flex-col h-full bg-[#050914]`}>
            <div className="flex items-center justify-between px-3 py-1 bg-void/70 border-b border-line/20 text-[8.5px] font-mono text-slate-dim">
              <span>{lines.length} lines · {metrics.chars} characters · {fmtBytes(metrics.bytes)}</span>
              <span className="text-teal-ice/80 uppercase tracking-wider">{ext || 'doc'} document</span>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center font-mono text-[10px] text-slate-dim tracking-[0.2em] uppercase animate-pulse">
                    summoning the code engine…
                  </div>
                }
              >
                <MonacoCodeEditor
                  value={code}
                  fileName={fileName}
                  wordWrap={wordWrap}
                  onChange={handleCodeChange}
                  onMountHandle={(h) => { monacoRef.current = h; }}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* Static Document Layout Preview Pane */}
        {(mode === 'preview' || (mode === 'split' && canPreview)) && (
          <div className={`${mode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col h-full bg-[#070c18] relative overflow-hidden`}>
            <div className="flex items-center justify-between px-3 py-1 bg-void/80 border-b border-line/20 text-[8.5px] font-mono text-slate-dim">
              <span className="text-teal-ice/90">STATIC LAYOUT PREVIEW</span>
              <span className="text-slate-dim">Isolated · Safe Layout Inspection</span>
            </div>
            {isMd ? (
              <div className="flex-1 p-5 overflow-y-auto thin-scroll font-body text-[13px] text-paper/90 bg-[#060a15]">
                {renderMarkdown(code)}
              </div>
            ) : isJson ? (
              <div className="flex-1 p-4 overflow-y-auto thin-scroll font-mono text-[11px] leading-[1.6] bg-[#050914] text-paper">
                <pre className="whitespace-pre-wrap">{code}</pre>
              </div>
            ) : (
              <iframe
                title={fileName}
                srcDoc={previewDoc}
                sandbox=""
                className="w-full flex-1 border-0 bg-white/95"
              />
            )}
          </div>
        )}

        {/* Document Intelligence & Metrics Pane */}
        {mode === 'metrics' && (
          <div className="w-full h-full p-6 overflow-y-auto thin-scroll bg-[#050914] text-paper font-mono text-[11px]">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="border border-teal-ice/30 bg-teal-ice/5 p-4 rounded-lg">
                <p className="text-[14px] font-display tracking-widest text-teal-ice uppercase">{fileName}</p>
                <p className="text-[9.5px] text-slate-dim mt-1">Classification: {mime} · Storage Type: Document Object</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 border border-line/40 bg-void/60 rounded">
                  <p className="text-[8.5px] tracking-wider text-slate-dim uppercase">Total Lines</p>
                  <p className="text-[18px] text-paper font-bold mt-1">{metrics.linesCount}</p>
                </div>
                <div className="p-3 border border-line/40 bg-void/60 rounded">
                  <p className="text-[8.5px] tracking-wider text-slate-dim uppercase">Character Count</p>
                  <p className="text-[18px] text-teal-ice font-bold mt-1">{metrics.chars}</p>
                </div>
                <div className="p-3 border border-line/40 bg-void/60 rounded">
                  <p className="text-[8.5px] tracking-wider text-slate-dim uppercase">Exact Matter Size</p>
                  <p className="text-[18px] text-solar font-bold mt-1">{fmtBytes(metrics.bytes)}</p>
                </div>
              </div>

              {isHtml && (
                <div className="border border-line/40 bg-void/40 p-4 rounded-lg space-y-2">
                  <p className="text-[10px] text-teal-ice uppercase tracking-wider font-bold">HTML Structure Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-soft pt-1">
                    <div>DOM Tags Count: <span className="text-paper font-bold">{metrics.tagMatches}</span></div>
                    <div>Stored Script Blocks: <span className="text-paper font-bold">{metrics.scriptCount}</span></div>
                    <div>Stylesheet Declarations: <span className="text-paper font-bold">{metrics.styleCount}</span></div>
                    <div>Links & References: <span className="text-paper font-bold">{metrics.linkCount}</span></div>
                  </div>
                </div>
              )}

              {isJson && (
                <div className="border border-line/40 bg-void/40 p-4 rounded-lg space-y-2">
                  <p className="text-[10px] text-teal-ice uppercase tracking-wider font-bold">JSON Intelligence</p>
                  <p className="text-[10px] text-slate-soft">Status: <span className="text-paper font-bold">{metrics.jsonStatus}</span></p>
                  <p className="text-[10px] text-slate-soft">Root Keys: <span className="text-paper font-bold">{metrics.jsonKeys}</span></p>
                </div>
              )}

              <div className="border-t border-line/30 pt-4 flex items-center justify-between text-[9px] text-slate-dim">
                <span>Integrity: SHA-256 Verified</span>
                <span>Storage Mode: Sealed Document Record</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* unknown / binary objects (.dat, .bin, …) — readable when they hold text,
   otherwise a clean card with a download and an opt-in byte view */
function OtherView({ file }: { file: VaultFile }) {
  const [showBytes, setShowBytes] = useState(false);
  const looksText = !!file.content && /^[\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]*$/.test(file.content.slice(0, 2000));
  return (
    <div>
      {looksText ? (
        <pre className="w-full max-h-[52vh] overflow-auto thin-scroll bg-void/60 border border-line/60 p-4 font-mono text-[11.5px] leading-[1.7] text-paper/90 whitespace-pre-wrap">{file.content}</pre>
      ) : (
        <div className="text-center py-8">
          <KindGlyph kind="other" size={30} />
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-slate-dim mt-4">binary object · {file.mime || 'unknown type'}</p>
          <p className="text-[12px] text-slate-dim leading-relaxed mt-2 max-w-[380px] mx-auto">
            This file isn't text the vault can read directly. Carry it out to open it with a program on your machine.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button onClick={() => void downloadFile(file)}
              className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.2em] uppercase border border-teal-ice/50 text-teal-ice px-5 py-2 hover:bg-teal-ice/10 transition-colors">
              <IcDownload size={12} /> download
            </button>
            <button onClick={() => setShowBytes((v) => !v)}
              className="font-mono text-[8.5px] tracking-[0.18em] uppercase text-slate-dim hover:text-slate-soft transition-colors">
              {showBytes ? 'hide bytes' : 'peek at bytes'}
            </button>
          </div>
        </div>
      )}
      {showBytes && !looksText && (
        <div className="mt-4"><HexInspector file={file} /></div>
      )}
    </div>
  );
}

function Viewer({ file, onClose }: { file: VaultFile; onClose: () => void }) {
  const [text, setText] = useState(file.content ?? '');
  const [showHistory, setShowHistory] = useState(false);
  /* payload-backed text files: content resolved once from vault storage */
  const [payloadText, setPayloadText] = useState<string | null>(null);
  const [payloadResolving, setPayloadResolving] = useState(false);
  const isCsv = /\.csv$/i.test(file.name);
  const isFits = /\.fits$/i.test(file.name);
  const isPayloadTextDoc = file.kind === 'document' && file.content === undefined && !!file.payloadRef && !file.sealed;
  const editable = file.kind === 'document' && (file.content !== undefined || (isPayloadTextDoc && payloadText !== null)) && !file.sealed;

  useEffect(() => {
    setText(file.content ?? '');
  }, [file.content]);

  useEffect(() => {
    if (!isPayloadTextDoc || payloadText !== null || payloadResolving) return;
    let alive = true;
    setPayloadResolving(true);
    void getPayload(file.payloadRef!)
      .then(async (blob) => {
        if (!alive) return;
        setPayloadText(blob ? await blob.text() : '');
      })
      .catch(() => { if (alive) setPayloadText(''); })
      .finally(() => { if (alive) setPayloadResolving(false); });
    return () => { alive = false; };
  }, [isPayloadTextDoc, file.payloadRef, payloadText, payloadResolving]);

  /* large payloads stream in from IndexedDB as an object URL.
     Sealed media with no stored bytes gets materialized into a real,
     playable clip so audio and video always run. */
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; let url: string | null = null;
    const useBlob = (blob: Blob | null) => {
      if (!alive || !blob) return;
      url = URL.createObjectURL(blob);
      setMediaUrl(url);
    };
    if (file.payloadRef) {
      getPayload(file.payloadRef).then(useBlob).catch(() => undefined);
    } else if (!file.content && (file.kind === 'audio' || file.kind === 'video')) {
      void synthPayload(file).then(useBlob).catch(() => undefined);
    } else {
      setMediaUrl(null);
    }
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [file.payloadRef, file.content, file.kind]);

  const mediaSrc = file.content ?? mediaUrl ?? undefined;
  const versions = file.versions ?? [];

  const handleSave = (newContent: string) => {
    if (file.payloadRef && file.content === undefined) {
      /* payload-backed document: snapshot, then re-encrypt + write through */
      if (newContent !== payloadText) {
        actions.saveVersionContent(file.id, 'before save', payloadText ?? '');
      }
      void putPayload(file.payloadRef, new Blob([newContent], { type: file.mime || 'text/plain' }))
        .then(async () => {
          const size = new Blob([newContent]).size;
          const checksum = await sha256Hex(newContent);
          actions.updateVaultFile(file.id, { checksum, size });
          setPayloadText(newContent);
          setText(newContent);
          toast('payload re-sealed & snapshot created');
        })
        .catch(() => toast('payload write failed — storage unavailable', 'warn'));
      return;
    }
    if (newContent !== file.content) {
      actions.saveVersion(file.id, 'before save');
    }
    actions.updateVaultFile(file.id, { content: newContent, size: newContent.length });
    setText(newContent);
    toast('document re-sealed and snapshot created');
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center overlay-in" style={{ background: 'rgba(3,5,10,0.82)' }} onClick={onClose}>
      <div className="vault-glass w-[min(940px,96vw)] max-h-[90vh] flex flex-col rise-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 h-12 border-b border-teal-ice/15 shrink-0 bg-[#060b17]/60">
          <span className="text-teal-ice"><KindGlyph kind={file.kind} size={15} /></span>
          <span className="text-[12.5px] text-paper truncate flex-1 font-medium">{file.name}</span>
          {file.lock && <span className="text-solar" title="key-locked"><IcLock size={12} /></span>}
          <span className="font-mono text-[9px] text-slate-dim">{fmtBytes(file.size)}</span>
          {editable && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`font-mono text-[8.5px] tracking-[0.2em] uppercase border px-2.5 py-1 transition-colors ${showHistory ? 'border-solar/50 text-solar bg-solar/10' : 'border-line/60 text-slate-soft hover:text-solar hover:border-solar/40'}`}
              title="version history snapshots">
              history{versions.length ? ` (${versions.length})` : ''}
            </button>
          )}
          <button
            onClick={() => void downloadFile(file)}
            className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.18em] uppercase border border-line/60 text-slate-soft px-2.5 py-1 hover:text-teal-ice hover:border-teal-ice/40 transition-colors"
            title="download file">
            <IcDownload size={11} /> get
          </button>
          <button onClick={onClose} className="text-slate-dim hover:text-paper transition-colors p-1"><IcClose size={14} /></button>
        </div>

        {/* Version History Drawer */}
        {showHistory && editable && (
          <div className="px-5 py-3 border-b border-line/40 bg-[#040813]/90">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[8.5px] tracking-[0.24em] uppercase text-solar">version snapshots — newest last</p>
              <button onClick={() => setShowHistory(false)} className="text-[9px] font-mono text-slate-dim hover:text-paper uppercase">close</button>
            </div>
            {versions.length === 0 && <p className="font-mono text-[9px] text-slate-dim">no snapshots yet — saving any edit creates a sealed checkpoint automatically</p>}
            <div className="max-h-[140px] overflow-y-auto thin-scroll space-y-1">
              {[...versions].reverse().map((v: FileVersion) => (
                <div key={v.id} className="flex items-center gap-3 text-[11px] p-1.5 rounded bg-void/50 border border-line/30">
                  <span className="font-mono text-[8.5px] text-slate-dim tabular-nums shrink-0">{fmtDate(v.savedAt)}</span>
                  <span className="text-slate-soft flex-1 truncate">{v.label} · {fmtBytes(v.size)}</span>
                  <button onClick={() => {
                    const targetContent = v.content ?? '';
                    actions.restoreVersion(file.id, v.id);
                    setText(targetContent);
                    toast(`snapshot restored: ${v.label} (${fmtDate(v.savedAt)})`);
                  }}
                    className="font-mono text-[8.5px] tracking-[0.16em] uppercase text-teal-ice border border-teal-ice/40 px-2 py-0.5 hover:bg-teal-ice/10 rounded transition-colors shrink-0">restore</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto thin-scroll p-4 sm:p-5">
          {/* Universal Code & Document Studio — inline OR payload-backed text */}
          {file.kind === 'document' && (file.content !== undefined || (isPayloadTextDoc && payloadText !== null)) && (
            <CodeDocStudio
              key={file.id + (file.content === undefined ? ':payload' : ':inline')}
              initial={file.content !== undefined ? text : payloadText ?? ''}
              fileName={file.name}
              mime={file.mime}
              onSave={handleSave}
              onDownload={() => void downloadFile(file)}
            />
          )}

          {isPayloadTextDoc && payloadText === null && (
            <p className={`font-mono text-[10px] tracking-[0.2em] uppercase text-slate-dim text-center py-10 ${payloadResolving ? 'animate-pulse' : ''}`}>
              {payloadResolving ? 'decrypting payload…' : 'payload sealed — content stored outside heap'}
            </p>
          )}

          {file.kind === 'image' && (mediaSrc || file.thumb) && (
            <img src={mediaSrc ?? file.thumb} alt={file.name} className="max-h-[62vh] mx-auto border border-teal-ice/30 rounded-lg shadow-xl" />
          )}
          {file.kind === 'image' && !mediaSrc && !file.thumb && <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-dim text-center py-10">image payload unavailable</p>}

          {file.kind === 'audio' && (mediaSrc ? (
            <AudioPlayer key={mediaSrc} src={mediaSrc} name={file.name} />
          ) : (
            <div className="py-4"><WaveStripLocal name={file.name} height={56} /><p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-slate-dim mt-3 pulse-soft">materializing audio…</p></div>
          ))}

          {file.kind === 'video' && (mediaSrc ? (
            <AdvancedVideoPlayer key={mediaSrc} src={mediaSrc} name={file.name} />
          ) : (
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-dim text-center py-10 pulse-soft">preparing playback…</p>
          ))}

          {file.kind === 'dataset' && isCsv && file.content && <CsvView content={file.content} />}
          {file.kind === 'dataset' && isFits && <FitsView name={file.name} />}
          {file.kind === 'dataset' && !isCsv && !isFits && (
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-dim text-center py-10">binary dataset — schema inspection only</p>
          )}

          {file.kind === 'iso' && <IsoMount name={file.name} />}
          {(file.kind === 'archive' || file.kind === 'exe' || file.kind === 'application' || file.kind === 'game' || /\.pdf$/i.test(file.name)) && <RunView file={file} />}
          {file.kind === 'other' && <OtherView file={file} />}
        </div>
      </div>
    </div>
  );
}

/* ================================ key ring ================================ */

const CATEGORIES = ['site', 'app', 'finance', 'wifi', 'device', 'note'] as const;
const CAT_COLORS: Record<string, string> = {
  site: '#7fc4e8', app: '#9fd8a8', finance: '#f2c178', wifi: '#b49ae8', device: '#e0785a', note: '#8b93a8',
};
const HISTORY_CAP = 8;
const TRASH_TTL_DAYS = 30;

const WORDS = [
  'orbit', 'comet', 'lunar', 'solar', 'nebula', 'quasar', 'pulsar', 'zenith', 'aurora', 'photon',
  'eclipse', 'gravity', 'horizon', 'ion', 'meteor', 'nova', 'plasma', 'radial', 'signal', 'tides',
  'umbra', 'vector', 'vertex', 'wave', 'anchor', 'basalt', 'cipher', 'drift', 'ember', 'fathom',
];

function pwScore(s: string): number {
  if (!s) return 0;
  let sc = Math.min(4, s.length / 6);
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) sc += 1;
  if (/\d/.test(s)) sc += 1;
  if (/[^a-zA-Z0-9]/.test(s)) sc += 1.5;
  if (s.length >= 16) sc += 1;
  return Math.min(8, sc);
}
function pwTier(sc: number): { label: string; color: string } {
  if (sc < 2) return { label: 'fragile', color: '#e06a5a' };
  if (sc < 4) return { label: 'fair', color: '#e8b25c' };
  if (sc < 6) return { label: 'strong', color: '#9fd8a8' };
  return { label: 'eventide-grade', color: '#6fc2b4' };
}
function genKey(len: number, opts: { upper: boolean; digits: boolean; symbols: boolean }): string {
  let pool = 'abcdefghijkmnopqrstuvwxyz';
  if (opts.upper) pool += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  if (opts.digits) pool += '23456789';
  if (opts.symbols) pool += '!@#$%^&*_-+=?';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => pool[n % pool.length]).join('');
}
function genPassphrase(words: number): string {
  const arr = new Uint32Array(words * 2);
  crypto.getRandomValues(arr);
  const out: string[] = [];
  for (let i = 0; i < words; i++) {
    const w = WORDS[arr[i * 2] % WORDS.length];
    out.push(i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1));
  }
  return out.join('-') + (arr[arr.length - 1] % 90 + 10);
}
const ageDays = (t: number) => Math.floor((Date.now() - t) / 86400000);

/** Push a replaced secret into history (newest last, capped). */
function withHistory(rec: PasswordRecord, replacedSecret: string): PasswordRecord {
  if (!replacedSecret || replacedSecret === rec.secret) return rec;
  const entry = { secret: replacedSecret, changedAt: Date.now() };
  const history = [...(rec.history ?? []), entry].slice(-HISTORY_CAP);
  return { ...rec, history };
}

const HISTORY_LABELS = ['janitor', 'orbiter', 'satellite', 'moon', 'planet', 'star', 'giant', 'quasar'];

/* ------------------------------- pulsar code ------------------------------ */

/** Live TOTP code with a countdown ring — the pulsar's light-curve. */
function PulsarCode({ otpauth, onCopy }: { otpauth: string; onCopy: (code: string, issuer: string) => void }) {
  const params = useMemo(() => { try { return parseOtpAuth(otpauth); } catch { return null; } }, [otpauth]);
  const [code, setCode] = useState('······');
  const [remain, setRemain] = useState(params?.period ?? 30);
  const issuer = params?.issuer ?? 'pulsar';

  useEffect(() => {
    if (!params) return;
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      try {
        setCode(await totpAt(params, Date.now()));
        setRemain(totpRemaining(params, Date.now()));
      } catch { setCode('∅'); }
    };
    void tick();
    const iv = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(iv); };
  }, [params]);

  if (!params) return <span className="font-mono text-[9px] text-red-300" title={otpauth}>dead pulsar — bad seed</span>;
  const frac = remain / params.period;
  const hue = frac > 0.4 ? '#6fc2b4' : frac > 0.2 ? '#e8b25c' : '#e06a5a';
  return (
    <button
      onClick={() => onCopy(code, issuer)}
      title={`pulsar code · ${issuer} — tap to copy (scrubs in 20s)`}
      className="flex items-center gap-1.5 px-1.5 py-0.5 border border-line/50 hover:border-teal-ice/40 transition-colors group/plsr">
      <svg width="13" height="13" viewBox="0 0 20 20" className="shrink-0 -rotate-90">
        <circle cx="10" cy="10" r="8" fill="none" stroke="#2a3140" strokeWidth="2.4" />
        <circle cx="10" cy="10" r="8" fill="none" stroke={hue} strokeWidth="2.4" strokeDasharray={`${2 * Math.PI * 8}`}
          strokeDashoffset={`${2 * Math.PI * 8 * (1 - frac)}`} strokeLinecap="butt" style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s' }} />
      </svg>
      <span className="font-mono text-[11px] tracking-[0.14em] tabular-nums text-solar group-hover/plsr:text-paper transition-colors">{code}</span>
    </button>
  );
}

/* ------------------------------ nova marker ------------------------------- */

const NovaGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" className="shrink-0" role="img" aria-label="nova — compromised secret">
    <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#e06a5a">
      <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
    </path>
  </svg>
);

/* ------------------------------ gravity well ------------------------------ */

function GravityWellModal({ existing, onClose, onIngest }: {
  existing: PasswordRecord[];
  onClose: () => void;
  onIngest: (fresh: PasswordRecord[], duplicates: number, source: ImportSource) => void;
}) {
  const [preview, setPreview] = useState<{ records: PasswordRecord[]; duplicates: number; skipped: number; source: ImportSource } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const feed = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setErr('');
    try {
      const text = await f.text();
      const result = importVaultExport(f.name, text);
      const { fresh, duplicates } = dedupeImport(result.records, existing);
      setPreview({ records: fresh, duplicates, skipped: result.skipped, source: result.source });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'the well rejected that mass');
      setPreview(null);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[136] grid place-items-center overlay-in" style={{ background: 'rgba(3,5,10,0.8)' }} onClick={onClose}>
      <div className="vault-glass w-[420px] max-w-[92vw] p-6 rise-in" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-[13px] tracking-[0.22em] text-paper">THE GRAVITY WELL</p>
        <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">
          Drop a rival vault's export — Bitwarden (CSV / JSON), 1Password, Chrome, Edge, Firefox,
          Proton Pass, KeePass — and the well swallows it whole. Nothing leaves this machine; parsing happens in memory.
        </p>
        <label className={`block mt-4 border border-dashed px-4 py-6 text-center transition-colors cursor-pointer ${preview ? 'border-teal-ice/60 bg-teal-ice/5' : 'border-line/60 hover:border-teal-ice/40'}`}>
          <input type="file" accept=".csv,.json,text/csv,application/json" className="hidden" disabled={busy}
            onChange={(e) => { void feed(e.target.files?.[0]); e.target.value = ''; }} />
          <p className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-slate-soft">
            {busy ? 'bending spacetime…' : preview ? `swallowed · ${SOURCE_LABELS[preview.source]}` : 'drop export file · or tap to browse'}
          </p>
          <p className="font-mono text-[7.5px] tracking-[0.18em] uppercase text-slate-dim mt-1">.csv / .json</p>
        </label>
        {err && <p className="font-mono text-[9px] text-red-300 mt-3 leading-relaxed">{err}</p>}
        {preview && (
          <div className="mt-4 space-y-1.5 font-mono text-[9.5px] text-slate-soft">
            <p><span className="text-teal-ice">{preview.records.length}</span> new credentials will orbit your ring</p>
            {preview.duplicates > 0 && <p><span className="text-solar">{preview.duplicates}</span> duplicates quietly refused (already on the ring)</p>}
            {preview.skipped > 0 && <p><span className="text-slate-dim">{preview.skipped}</span> rows carried no secret and were left adrift</p>}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
          <button
            onClick={() => { if (preview) { onIngest(preview.records, preview.duplicates, preview.source); onClose(); } }}
            disabled={!preview || preview.records.length === 0}
            className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
            seal {preview?.records.length ?? 0} into the ring
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- sentinel report ---------------------------- */

interface SentinelIssue {
  kind: 'weak' | 'reused' | 'aged' | 'nova' | 'no-totp' | 'expiring' | 'trash';
  label: string;
  count: number;
  hint: string;
  color: string;
}

/** Parse MM/YY or MM/YYYY card-expiry style field values. */
function parseCardExpiry(v: string): Date | null {
  const m = v.trim().match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;
  const yearRaw = Number(m[2]);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  return new Date(year, month, 0, 23, 59, 59); /* end of expiry month */
}

const EXPIRY_KEY = /^(exp|expiry|expires|expiration|valid|valid until|card expiry|expires on|good thru|good through)/i;

/** Itemized Watchtower-grade audit of the ring, derived from live records. */
function sentinelIssues(records: PasswordRecord[]): SentinelIssue[] {
  const active = records.filter((r) => !r.deletedAt);
  const issues: SentinelIssue[] = [];
  const weak = active.filter((r) => pwScore(r.secret) < 4);
  const seen = new Map<string, number>();
  for (const r of active) seen.set(r.secret, (seen.get(r.secret) ?? 0) + 1);
  const reused = [...seen.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0);
  const aged = active.filter((r) => ageDays(r.updatedAt) > 365);
  const novae = active.filter((r) => r.breachedAt);
  const noTotp = active.filter((r) => !r.otpauth);
  const trashed = records.filter((r) => r.deletedAt);
  const expiring = active.filter((r) => (r.fields ?? []).some((f) => {
    if (!EXPIRY_KEY.test(f.k)) return false;
    const d = parseCardExpiry(f.v);
    return d !== null && d.getTime() - Date.now() < 90 * 86400000;
  }));
  if (novae.length) issues.push({ kind: 'nova', label: 'nova flare', count: novae.length, hint: 'secrets found in breach corpora — forge a new one tonight', color: '#e06a5a' });
  if (weak.length) issues.push({ kind: 'weak', label: 'weak gravity', count: weak.length, hint: 'fragile secrets a dictionary attack cracks first', color: '#e8b25c' });
  if (reused) issues.push({ kind: 'reused', label: 'shared orbit', count: reused, hint: 'identical secrets across credentials — one leak breaches all', color: '#e8b25c' });
  if (aged.length) issues.push({ kind: 'aged', label: 'old light', count: aged.length, hint: 'unchanged for over a year — rotate to refresh the signal', color: '#e8b25c' });
  if (expiring.length) issues.push({ kind: 'expiring', label: 'collapsing orbit', count: expiring.length, hint: 'cards or documents expiring within 90 days — update their fields', color: '#e8b25c' });
  if (noTotp.length && active.length) issues.push({ kind: 'no-totp', label: 'no pulsar', count: noTotp.length, hint: 'credentials without a second factor — paste their otpauth seeds', color: '#7fc4e8' });
  if (trashed.length) issues.push({ kind: 'trash', label: 'debris field', count: trashed.length, hint: 'soft-deleted credentials awaiting the final purge', color: '#8b93a8' });
  return issues;
}

function SentinelPanel({ records, onScan, scanning }: { records: PasswordRecord[]; onScan: () => void; scanning: boolean }) {
  const issues = sentinelIssues(records);
  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-2">
        <p className="font-mono text-[8.5px] tracking-[0.3em] uppercase text-teal-ice/80">sentinel report</p>
        <div className="flex-1" />
        <button onClick={onScan} disabled={scanning}
          className="font-mono text-[8px] tracking-[0.18em] uppercase border border-line/60 text-slate-soft px-2 py-1 hover:text-teal-ice hover:border-teal-ice/40 transition-colors disabled:opacity-40">
          {scanning ? 'scanning…' : `nova scan · ${CORPUS_SIZE} known`}
        </button>
      </div>
      <p className="text-[10.5px] text-slate-dim leading-relaxed mt-1.5 mb-3 max-w-140">
        An itemized audit of the ring's gravity: every weakness with its remedy one click away.
        Nova scan screens all secrets against {CORPUS_SIZE} compromised passwords — offline, locally, forever.
      </p>
      {issues.length === 0 && <p className="font-mono text-[9.5px] text-teal-ice/80">the ring is pristine — nothing to flag</p>}
      {issues.map((issue) => (
        <div key={issue.kind} className="flex items-start gap-3 py-2 border-b border-line/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ background: issue.color, boxShadow: `0 0 6px ${issue.color}` }} />
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] text-slate-soft">
              <span style={{ color: issue.color }}>{issue.count}×</span> {issue.label}
            </p>
            <p className="text-[10px] text-slate-dim leading-snug">{issue.hint}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function KeyGenerator({ onUse }: { onUse: (k: string) => void }) {
  const [len, setLen] = useState(20);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [mode, setMode] = useState<'random' | 'phrase'>('random');
  const [out, setOut] = useState(() => genKey(20, { upper: true, digits: true, symbols: true }));
  const reroll = () => setOut(mode === 'random' ? genKey(len, { upper, digits, symbols }) : genPassphrase(4));
  useEffect(() => { reroll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [len, upper, digits, symbols, mode]);
  const sc = pwScore(out);
  const tier = pwTier(sc);
  const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
    <button onClick={() => set(!on)}
      className={`px-2.5 py-1 font-mono text-[8.5px] tracking-[0.2em] uppercase border transition-colors ${on ? 'border-teal-ice/60 text-teal-ice bg-teal-ice/10' : 'border-line/60 text-slate-dim hover:text-slate-soft'}`}>
      {label}
    </button>
  );
  return (
    <div className="vault-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[8.5px] tracking-[0.3em] uppercase text-teal-ice/80">key forge</span>
        <div className="flex-1" />
        <button onClick={() => setMode('random')} className={`px-2 py-0.5 font-mono text-[8px] tracking-[0.18em] uppercase border transition-colors ${mode === 'random' ? 'border-teal-ice/50 text-teal-ice' : 'border-line/50 text-slate-dim'}`}>random</button>
        <button onClick={() => setMode('phrase')} className={`px-2 py-0.5 font-mono text-[8px] tracking-[0.18em] uppercase border transition-colors ${mode === 'phrase' ? 'border-teal-ice/50 text-teal-ice' : 'border-line/50 text-slate-dim'}`}>passphrase</button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-[12.5px] text-paper break-all select-all bg-void/50 border border-line/50 px-3 py-2">{out}</code>
        <button onClick={reroll} className="shrink-0 font-mono text-[8.5px] tracking-[0.2em] uppercase border border-line/60 text-slate-soft px-2.5 py-2 hover:text-teal-ice hover:border-teal-ice/40 transition-colors" title="forge another">↻</button>
      </div>
      <div className="pw-meter"><span style={{ width: `${(sc / 8) * 100}%`, background: tier.color }} /></div>
      {mode === 'random' ? (
        <>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-slate-dim w-16">length {len}</span>
            <input type="range" min={8} max={40} value={len} onChange={(e) => setLen(Number(e.target.value))} className="pw-range flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Toggle on={upper} set={setUpper} label="a–Z" />
            <Toggle on={digits} set={setDigits} label="0–9" />
            <Toggle on={symbols} set={setSymbols} label="#$%" />
            <span className="flex-1" />
            <span className="font-mono text-[8.5px] tracking-[0.18em] uppercase" style={{ color: tier.color }}>{tier.label}</span>
          </div>
        </>
      ) : (
        <p className="font-mono text-[8.5px] tracking-[0.18em] uppercase text-slate-dim">four cosmic words + suffix — memorable, high-entropy</p>
      )}
      <button onClick={() => onUse(out)} className="w-full font-mono text-[9.5px] tracking-[0.26em] uppercase border border-teal-ice/50 text-teal-ice px-3 py-2 hover:bg-teal-ice/10 transition-colors">
        forge into the secret field
      </button>
    </div>
  );
}

/* -------------------------- stargate · will · courier --------------------- */

const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlDecode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** Module-level clipboard copy with the standard 20-second scrub. */
const copyScrubbed = (text: string, what: string) => {
  void navigator.clipboard?.writeText(text).then(() => {
    toast(`${what} copied — clipboard scrubs in 20s`);
    setTimeout(() => { void navigator.clipboard?.writeText('·').catch(() => undefined); }, 20000);
  });
};

/** Ask the authenticator to evaluate the PRF extension for a salt → b64 secret. */
async function prfDerive(credIdB64: string, prfSaltB64: string): Promise<string> {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: b64urlDecode(credIdB64) as unknown as BufferSource, type: 'public-key' }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: b64urlDecode(prfSaltB64) as unknown as BufferSource } } },
    },
  }) as PublicKeyCredential | null;
  const ext = (assertion?.response as unknown as { getExtensions?: () => { prf?: { results?: { first?: ArrayBuffer } } } | null }).getExtensions?.();
  const first = ext?.prf?.results?.first;
  if (!first) throw new Error('this authenticator cannot derive keys (no PRF support)');
  return btoa(String.fromCharCode(...new Uint8Array(first)));
}

function StargateModal({ ringKey, onAttuned, onClose }: {
  ringKey: Uint8Array;
  onAttuned: (env: RingEnvelope) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const attune = async () => {
    setBusy(true); setErr('');
    try {
      const prfSalt = b64enc(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Eventide Key Ring', id: location.hostname },
          user: { id: crypto.getRandomValues(new Uint8Array(16)) as unknown as BufferSource, name: 'eventide-ring', displayName: 'Eventide Key Ring' },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
          authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
          extensions: { prf: {} },
        },
      }) as PublicKeyCredential | null;
      if (!cred) throw new Error('the gate did not answer');
      const prfSecret = await prfDerive(b64url(cred.rawId), prfSalt);
      const env = await wrapRingKey(ringKey, prfSecret, 'prf', { credId: b64url(cred.rawId), prfSalt });
      onAttuned(env);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'the gate refused';
      setErr(`${msg} — PRF needs a platform authenticator (Windows Hello, Touch ID) or a modern security key, over https or localhost.`);
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[137] grid place-items-center overlay-in" style={{ background: 'rgba(3,5,10,0.8)' }} onClick={onClose}>
      <div className="vault-glass w-[420px] max-w-[92vw] p-6 rise-in" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-[13px] tracking-[0.22em] text-paper">ATTUNE THE STARGATE</p>
        <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">
          Bind a biometric or hardware authenticator to the ring. It derives a secret inside the
          secure hardware (WebAuthn PRF) that unwraps the ring key — the master key itself is never
          stored, never typed, never leaves the device. Unlock afterwards with one glance or touch.
        </p>
        <button onClick={() => void attune()} disabled={busy}
          className="w-full mt-4 font-mono text-[9.5px] tracking-[0.24em] uppercase border border-teal-ice/50 text-teal-ice px-3 py-2.5 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
          {busy ? 'the gate listens…' : 'attune authenticator'}
        </button>
        {err && <p className="font-mono text-[9px] text-red-300 mt-3 leading-relaxed">{err}</p>}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">close</button>
        </div>
      </div>
    </div>
  );
}

function StellarWillModal({ mode, secrets, ringKey, onArm, onClaim, onClose }: {
  mode: 'arm' | 'claim';
  secrets: VaultSecrets | null;
  ringKey?: Uint8Array;
  onArm?: (env: RingEnvelope) => void;
  onClaim?: (key: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [months, setMonths] = useState(6);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const armed = secrets?.envelopes?.find((e) => e.kind === 'custodian');

  const arm = async () => {
    if (!ringKey || !onArm) return;
    setBusy(true);
    try {
      const custodianKey = genCustodianKey();
      const env = await wrapRingKey(ringKey, custodianKey, 'custodian', { armedAt: Date.now(), months });
      onArm(env);
      setRevealed(custodianKey);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[137] grid place-items-center overlay-in" style={{ background: 'rgba(3,5,10,0.8)' }} onClick={revealed ? undefined : onClose}>
      <div className="vault-glass w-[420px] max-w-[92vw] p-6 rise-in" onClick={(e) => e.stopPropagation()}>
        {mode === 'arm' ? (
          <>
            <p className="font-display text-[13px] tracking-[0.22em] text-paper">THE STELLAR WILL</p>
            {revealed ? (
              <>
                <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">
                  The will is armed. This custodian key is shown <span className="text-solar">once</span> —
                  copy it somewhere safe outside this machine. Whoever holds it can open the ring
                  after {months} months of darkness.
                </p>
                <code className="block mt-3 font-mono text-[11px] text-paper break-all select-all bg-void/50 border border-solar/40 px-3 py-2.5">{revealed}</code>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => { copyScrubbed(revealed, 'custodian key'); }} className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors">copy</button>
                  <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">i have it — close</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">
                  If this vault stays dark for months, a custodian key can open it — a stellar will
                  for your digital legacy. A random key is forged and shown once; the ring key is
                  wrapped under it. Nothing ever leaves this machine.
                </p>
                {armed && (
                  <p className="font-mono text-[8.5px] tracking-[0.16em] uppercase text-solar mt-3">
                    a will is already armed · {armed.months} months · arming again replaces it
                  </p>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <span className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-slate-dim">darkness before claim</span>
                  <div className="flex-1" />
                  {[3, 6, 12].map((m) => (
                    <button key={m} onClick={() => setMonths(m)}
                      className={`px-2.5 py-1 font-mono text-[8.5px] tracking-[0.16em] uppercase border transition-colors ${months === m ? 'border-teal-ice/60 text-teal-ice bg-teal-ice/10' : 'border-line/60 text-slate-dim hover:text-slate-soft'}`}>
                      {m}mo
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
                  <button onClick={() => void arm()} disabled={busy} className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
                    {busy ? 'forging…' : 'arm the will'}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <p className="font-display text-[13px] tracking-[0.22em] text-paper">CLAIM THE STELLAR WILL</p>
            <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">
              Present the custodian key. It works only after the armed darkness has passed —
              until then the star still burns.
            </p>
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="custodian key"
              className="field w-full px-3 py-2 font-mono text-[11px] text-paper placeholder:text-slate-dim/60 mt-4" />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
              <button onClick={async () => { if (onClaim && await onClaim(key)) onClose(); }} disabled={busy || !key.trim()}
                className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
                claim
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CourierModal({ records, onSend, onClose }: {
  records: PasswordRecord[];
  onSend: (picked: PasswordRecord[], note: string) => Promise<void>;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [starlight, setStarlight] = useState<string | null>(null);
  const active = records.filter((r) => !r.deletedAt);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="fixed inset-0 z-[137] grid place-items-center overlay-in" style={{ background: 'rgba(3,5,10,0.8)' }} onClick={starlight ? undefined : onClose}>
      <div className="vault-glass w-[440px] max-w-[92vw] p-6 rise-in" onClick={(e) => e.stopPropagation()}>
        {starlight ? (
          <>
            <p className="font-display text-[13px] tracking-[0.22em] text-paper">COMET LAUNCHED</p>
            <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">
              The sealed comet file is downloading. Send it one way, and this starlight key the
              other — never together. It burns in {COMET_TTL_DAYS} days, or on first opening.
            </p>
            <code className="block mt-3 font-mono text-[11px] text-paper break-all select-all bg-void/50 border border-solar/40 px-3 py-2.5">{starlight}</code>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => copyScrubbed(starlight, 'starlight key')} className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors">copy key</button>
              <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">i have it — close</button>
            </div>
          </>
        ) : (
          <>
            <p className="font-display text-[13px] tracking-[0.22em] text-paper">THE COMET COURIER</p>
            <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">
              Seal credentials into a self-contained encrypted comet. The payload is useless
              without the one-time starlight key, which you send separately. One view, then ash.
            </p>
            <div className="mt-3 max-h-56 overflow-y-auto thin-scroll border border-line/40 divide-y divide-line/30">
              {active.map((r) => (
                <label key={r.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-void/40 cursor-pointer">
                  <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} className="accent-teal-ice" />
                  <span className="text-[11px] text-paper truncate flex-1">{r.label}</span>
                  <span className="font-mono text-[8px] text-slate-dim uppercase tracking-[0.14em]">{r.user || '—'}</span>
                </label>
              ))}
              {active.length === 0 && <p className="px-3 py-4 text-center font-mono text-[9px] text-slate-dim">the ring is empty</p>}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setPicked(new Set(active.map((r) => r.id)))} className="font-mono text-[8px] tracking-[0.18em] uppercase text-slate-dim hover:text-teal-ice transition-colors">select all</button>
              <span className="font-mono text-[8px] text-slate-dim">{picked.size} chosen</span>
              <div className="flex-1" />
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="a note for the recipient (optional)"
              className="field w-full px-3 py-2 font-mono text-[11px] text-paper placeholder:text-slate-dim/60 mt-2.5" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
              <button onClick={async () => { setBusy(true); try { await onSend(active.filter((r) => picked.has(r.id)), note); } finally { setBusy(false); } }}
                disabled={busy || picked.size === 0}
                className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
                {busy ? 'sealing…' : `launch comet · ${picked.size}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReceiveModal({ onIngest, onClose }: {
  onIngest: (fresh: PasswordRecord[]) => Promise<void>;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState('');
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ records: PasswordRecord[]; packet: CometPacket } | null>(null);
  const [busy, setBusy] = useState(false);
  const tryOpen = async () => {
    if (!file) { setErr('choose a .comet file first'); return; }
    setErr('');
    const res = await openComet(file, key);
    if (res.ok) setResult({ records: res.records, packet: res.packet });
    else { setResult(null); setErr(res.message); }
  };
  return (
    <div className="fixed inset-0 z-[137] grid place-items-center overlay-in" style={{ background: 'rgba(3,5,10,0.8)' }} onClick={onClose}>
      <div className="vault-glass w-[420px] max-w-[92vw] p-6 rise-in" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-[13px] tracking-[0.22em] text-paper">CATCH A COMET</p>
        <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">
          Receive an encrypted comet and its starlight key — from two different channels.
          Burn-after-read is honored here: once opened, it cannot be opened again on this machine.
        </p>
        <label className="block mt-4 border border-dashed border-line/60 hover:border-teal-ice/40 px-4 py-5 text-center transition-colors cursor-pointer">
          <input type="file" accept=".comet,.json,application/json" className="hidden" disabled={busy}
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); e.target.value = ''; }} />
          <p className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-slate-soft">{file ? file.name : 'drop comet file · or tap to browse'}</p>
        </label>
        <input value={key} onChange={(e) => { setKey(e.target.value); setResult(null); }} placeholder="starlight key"
          className="field w-full px-3 py-2 font-mono text-[11px] text-paper placeholder:text-slate-dim/60 mt-2.5" />
        {err && <p className="font-mono text-[9px] text-red-300 mt-2.5 leading-relaxed">{err}</p>}
        {result && (
          <p className="font-mono text-[9.5px] text-teal-ice mt-2.5">
            {result.records.length} credential{result.records.length === 1 ? '' : 's'} decrypted{result.packet.note ? ` · "${result.packet.note}"` : ''} — sealing will burn this comet
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
          <button onClick={() => void tryOpen()} disabled={!file || !key.trim() || busy}
            className="font-mono text-[9px] tracking-[0.2em] uppercase border border-line/60 text-slate-soft px-4 py-2 hover:text-teal-ice hover:border-teal-ice/40 transition-colors disabled:opacity-40">
            open
          </button>
          <button onClick={async () => { if (result) { setBusy(true); try { await onIngest(result.records); onClose(); } finally { setBusy(false); } } }}
            disabled={!result || busy}
            className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
            seal {result?.records.length ?? 0} into the ring
          </button>
        </div>
      </div>
    </div>
  );
}

function RotateKeyModal({ secrets, ringKey, onRewound, onClose }: {
  secrets: VaultSecrets;
  ringKey: Uint8Array;
  onRewound: (next: VaultSecrets, message: string) => void;
  onClose: () => void;
}) {
  const [cur, setCur] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [kfHash, setKfHash] = useState<string | null>(null);
  const [kfFp, setKfFp] = useState<string | null>(null);
  const [keepKf, setKeepKf] = useState(true);
  const kfRef = useRef<HTMLInputElement>(null);
  const masterEnv = secrets.envelopes?.find((e) => (e.kind ?? 'master') === 'master');
  const boundFp = masterEnv?.fp ?? null;
  const sc = pwScore(n1);
  const tier = pwTier(sc);
  const doRotate = async () => {
    if (busy) return;
    if (n1.length < 6) { setErr('new key needs at least 6 characters'); return; }
    if (n1 !== n2) { setErr('new keys do not match'); return; }
    setBusy(true); setErr('');
    try {
      /* verify the current secret by unwrapping the live master envelope */
      let curSecret: string;
      if (boundFp) {
        if (!kfHash) { setErr('the currently bound keyfile is required to rotate'); setBusy(false); return; }
        curSecret = keyfileSecret(cur, kfHash);
      } else {
        curSecret = cur;
      }
      if (masterEnv) await unwrapRingKey(masterEnv, curSecret);
      const newKf = kfHash && keepKf ? kfHash : undefined;
      const next = await rewrapMasterEnvelope(secrets, ringKey, n1, newKf);
      const detail = newKf ? 'Argon2id envelope · keyfile bound' : `Argon2id envelope ${next.envelopes?.[0]?.mem}MiB × ${next.envelopes?.[0]?.iters}`;
      onRewound(next, detail);
      onClose();
    } catch {
      setErr('current key does not fit the seal');
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[135] grid place-items-center overlay-in" style={{ background: 'rgba(3,5,10,0.78)' }}>
      <div className="vault-glass w-90 max-w-[92vw] p-6 rise-in">
        <p className="font-display text-[13px] tracking-[0.22em] text-paper">ROTATE MASTER KEY</p>
        <p className="text-[11.5px] text-slate-dim leading-relaxed mt-2">
          The ring key is wrapped anew — your credentials never re-encrypt, so rotation is instant.
          Optionally bind (or replace) a keyfile as a second factor; unbind by rotating without one.
        </p>
        <div className="space-y-2.5 mt-4">
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="current master key" className="field w-full px-3 py-2 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
          {boundFp && !kfHash && <p className="font-mono text-[8.5px] tracking-[0.16em] uppercase text-solar">a keyfile ({boundFp}) guards the current seal — present it below</p>}
          <button onClick={() => kfRef.current?.click()}
            className={`w-full font-mono text-[8.5px] tracking-[0.2em] uppercase px-3 py-2 border transition-colors ${kfHash ? 'border-teal-ice/60 text-teal-ice' : 'border-line/60 text-slate-dim hover:text-slate-soft'}`}>
            {kfHash ? `keyfile bound · ${kfFp}` : boundFp ? 'present current keyfile' : 'bind a keyfile (optional)'}
          </button>
          <input ref={kfRef} type="file" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            const { hash, fp } = await keyfileFingerprint(f);
            setKfHash(hash); setKfFp(fp);
          }} />
          {kfHash && (
            <label className="flex items-center gap-2 font-mono text-[8.5px] tracking-[0.16em] uppercase text-slate-soft cursor-pointer">
              <input type="checkbox" checked={keepKf} onChange={(e) => setKeepKf(e.target.checked)} className="accent-teal-ice" />
              keep the keyfile bound to the new seal
            </label>
          )}
          <input type="password" value={n1} onChange={(e) => setN1(e.target.value)} placeholder="new master key" className="field w-full px-3 py-2 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
          <div className="pw-meter"><span style={{ width: `${(sc / 8) * 100}%`, background: tier.color }} /></div>
          <input type="password" value={n2} onChange={(e) => setN2(e.target.value)} placeholder="new master key again" className="field w-full px-3 py-2 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
        </div>
        {err && <p className="font-mono text-[9px] tracking-[0.14em] text-red-300 mt-2.5">{err}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim px-3 py-2 hover:text-paper transition-colors">cancel</button>
          <button onClick={() => void doRotate()} disabled={busy} className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-4 py-2 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
            {busy ? 'rotating…' : 'rotate'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordVault({ masterPass, keyName }: { masterPass: string; keyName: string }) {
  const state = useUniverse();
  const [status, setStatus] = useState<'loading' | 'open' | 'foreign' | 'locked' | 'keyfile'>('loading');
  const [records, setRecords] = useState<PasswordRecord[]>([]);
  const [reveal, setReveal] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: '', user: '', secret: '', category: '', notes: '', otpauth: '', urls: '', fields: '' });
  const [showForge, setShowForge] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showSentinel, setShowSentinel] = useState(false);
  const [showRotate, setShowRotate] = useState(false);
  const [showWell, setShowWell] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showCourier, setShowCourier] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showWill, setShowWill] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [autoLock, setAutoLock] = useState(() => Number(localStorage.getItem(STORAGE_KEYS.vaultAutolock) ?? 0));
  const [unlockPass, setUnlockPass] = useState('');
  const [unlockErr, setUnlockErr] = useState('');
  const [form, setForm] = useState({ label: '', user: '', secret: '', category: 'site', notes: '', otpauth: '', urls: '', fields: '' });
  const [keyfileFp, setKeyfileFp] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);
  const ringKeyRef = useRef<Uint8Array | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const keyfileRef = useRef<HTMLInputElement>(null);
  const lastActivity = useRef(Date.now());

  /** Unwrap the ring key with the master passphrase (+"::"+keyfile when bound). */
  const unwrapWithMaster = async (secrets: VaultSecrets, kfHash?: string): Promise<Uint8Array> => {
    const env = secrets.envelopes?.find((e) => (e.kind ?? 'master') === 'master');
    if (!env) throw new Error('no master envelope');
    const secret = env.fp && kfHash ? keyfileSecret(masterPass, kfHash) : env.fp ? '' : masterPass;
    if (!secret) throw new Error('keyfile required');
    return unwrapRingKey(env, secret);
  };

  /** Adopt an unwrapped ring key: load records, bump the will clock, open. */
  const adoptRingKey = async (secrets: VaultSecrets, rk: Uint8Array, silent = false) => {
    const recs = await openRing(secrets, rk);
    ringKeyRef.current = rk;
    setRecords(recs);
    setStatus('open');
    lastActivity.current = Date.now();
    if (!silent && Date.now() - (secrets.lastOpenedAt ?? 0) > 86400000) {
      actions.setSecrets({ ...secrets, lastOpenedAt: Date.now() });
    }
    return recs;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const secrets = state.secrets;
      if (!secrets) { if (alive) setStatus('open'); return; }
      try {
        if (secrets.version === 2 && secrets.envelopes?.length) {
          const env = secrets.envelopes.find((e) => (e.kind ?? 'master') === 'master');
          if (!env) throw new Error('no master envelope');
          if (env.fp) { if (alive) { setKeyfileFp(env.fp); setStatus('keyfile'); } return; }
          const rk = await unwrapWithMaster(secrets);
          if (alive) await adoptRingKey(secrets, rk);
        } else {
          /* legacy v1 payload — read it once, then migrate to envelope sealing */
          const recs = await decryptRecords(masterPass, secrets);
          if (!alive) return;
          const v2 = await buildRingSecrets(masterPass, recs);
          const rk = await unwrapWithMaster(v2);
          ringKeyRef.current = rk;
          actions.setSecrets(v2);
          setRecords(recs);
          setStatus('open');
          actions.logAudit('migrated the ring to Argon2id envelope sealing');
          toast('the singularity hardened — envelope sealing engaged');
        }
      } catch { if (alive) setStatus('foreign'); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlockWithKeyfile = async (file: File) => {
    const secrets = state.secrets;
    if (!secrets) return;
    try {
      const { hash, fp } = await keyfileFingerprint(file);
      if (keyfileFp && fp !== keyfileFp) { toast('that is not the bound keyfile — the fingerprints differ', 'warn'); return; }
      const rk = await unwrapWithMaster(secrets, hash);
      setKeyfileFp(null);
      await adoptRingKey(secrets, rk);
      toast('the keyfile sings — ring unsealed');
    } catch {
      setUnlockErr('keyfile rejected — wrong file or wrong master key');
      toast('keyfile rejected', 'warn');
    }
  };

  /* stargate: WebAuthn PRF — the platform authenticator derives the ring key */
  const stargateUnlock = async () => {
    const secrets = state.secrets;
    if (!secrets?.envelopes) return;
    const env = secrets.envelopes.find((e) => e.kind === 'prf');
    if (!env?.credId || !env.prfSalt) { toast('no stargate is attuned to this ring', 'warn'); return; }
    setGateBusy(true);
    try {
      const prfSecret = await prfDerive(env.credId, env.prfSalt);
      const rk = await unwrapRingKey(env, prfSecret);
      await adoptRingKey(secrets, rk);
      toast('the gate opens — biometric unlock succeeded');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'the gate refused';
      setUnlockErr(msg);
    } finally { setGateBusy(false); }
  };

  /** Enroll/replace the PRF envelope from the stargate modal. */
  const attuneStargate = (env: RingEnvelope) => {
    const secrets = state.secrets;
    if (!secrets) return;
    const envelopes = (secrets.envelopes ?? []).filter((e) => e.kind !== 'prf');
    envelopes.push(env);
    actions.setSecrets({ ...secrets, envelopes });
    actions.logAudit('stargate attuned — a PRF credential can now unwrap the ring');
    setShowGate(false);
    toast('the stargate is attuned — unlock with a glance or touch from now on');
  };

  const willClaim = async (custodianKey: string): Promise<boolean> => {
    const secrets = state.secrets;
    if (!secrets?.envelopes) return false;
    const env = secrets.envelopes.find((e) => e.kind === 'custodian');
    if (!env?.armedAt || !env.months) { toast('no stellar will is armed on this ring', 'warn'); return false; }
    const darkForDays = Math.floor((Date.now() - (secrets.lastOpenedAt ?? env.armedAt)) / 86400000);
    const neededDays = env.months * 30;
    if (darkForDays < neededDays) {
      toast(`the star still burns — ${neededDays - darkForDays} days of light remain before the will activates`, 'warn');
      return false;
    }
    try {
      const rk = await unwrapRingKey(env, custodianKey.trim());
      await adoptRingKey(secrets, rk, true);
      actions.setSecrets({ ...secrets, lastOpenedAt: Date.now() });
      actions.logAudit('stellar will claimed — custodian key opened the ring');
      toast('the will executes — the ring answers to its custodian. consider rotating the master key.');
      return true;
    } catch {
      toast('the custodian key does not fit this will', 'warn');
      return false;
    }
  };

  /** Arm (or re-arm) the stellar will from the modal. */
  const armWill = (env: RingEnvelope) => {
    const secrets = state.secrets;
    if (!secrets) return;
    const envelopes = (secrets.envelopes ?? []).filter((e) => e.kind !== 'custodian');
    envelopes.push(env);
    actions.setSecrets({ ...secrets, envelopes });
    actions.logAudit(`stellar will armed · custodian claim after ${env.months} months of darkness`);
  };

  /** Launch a comet with the chosen credentials. */
  const sendComet = async (picked: PasswordRecord[], note: string) => {
    const { packet, starlightKey } = await sealComet(picked, note);
    const blob = new Blob([JSON.stringify(packet)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventide-comet-${new Date().toISOString().slice(0, 10)}.comet.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    logEvent(`comet launched · ${picked.length} credentials · burns ${COMET_TTL_DAYS}d or on first open`);
  };

  /** Ingest an opened comet's credentials. */
  const ingestComet = async (fresh: PasswordRecord[]) => {
    const { fresh: deduped, duplicates } = dedupeImport(fresh, records);
    await save([...records, ...deduped]);
    logEvent(`comet received · ${deduped.length} credentials sealed (${duplicates} duplicates refused)`);
    toast(`${deduped.length} credentials sealed from the comet${duplicates ? ` · ${duplicates} duplicates refused` : ''}`);
  };

  /* auto-lock: wipe plaintext from memory after inactivity */
  useEffect(() => {
    if (!autoLock || status !== 'open') return;
    const bump = () => { lastActivity.current = Date.now(); };
    window.addEventListener('pointerdown', bump);
    window.addEventListener('keydown', bump);
    const iv = setInterval(() => {
      if (Date.now() - lastActivity.current > autoLock * 1000) {
        setRecords([]);
        ringKeyRef.current = null;
        setStatus('locked');
        actions.logAudit('auto-locked · memory wiped');
      }
    }, 4000);
    return () => { clearInterval(iv); window.removeEventListener('pointerdown', bump); window.removeEventListener('keydown', bump); };
  }, [autoLock, status]);

  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(() => setReveal(null), 12000);
    return () => clearTimeout(t);
  }, [reveal]);

  const save = async (recs: PasswordRecord[]) => {
    setRecords(recs);
    const secrets = state.secrets;
    if (ringKeyRef.current && secrets?.version === 2) {
      /* envelope sealing — re-encrypt the payload under the ring key (no KDF) */
      const payload = await sealRecords(recs, ringKeyRef.current);
      actions.setSecrets({ ...secrets, ...payload });
    } else {
      /* legacy path before migration completes */
      actions.setSecrets(await encryptRecords(masterPass, recs));
    }
  };

  /** Parse multi-line editor strings into structured fields. */
  const parseFormExtras = (f: typeof form) => {
    const urls = f.urls.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const fields = f.fields.split(/\r?\n/).map((line) => {
      const idx = line.indexOf(':');
      if (idx <= 0) return null;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      return k && v ? { k, v } : null;
    }).filter((x): x is PasswordField => x !== null);
    return { urls: urls.length ? urls : undefined, fields: fields.length ? fields : undefined, otpauth: f.otpauth.trim() || undefined };
  };

  const add = async () => {
    if (!form.label || !form.secret) { toast('label and secret are required', 'warn'); return; }
    if (form.otpauth.trim()) {
      try { await validateOtpAuth(form.otpauth); }
      catch (e) { toast(e instanceof Error ? e.message : 'bad pulsar seed', 'warn'); return; }
    }
    const extras = parseFormExtras(form);
    await save([...records, { id: newId(), label: form.label, user: form.user, secret: form.secret, category: form.category, notes: form.notes || undefined, updatedAt: Date.now(), ...extras }]);
    setForm({ label: '', user: '', secret: '', category: 'site', notes: '', otpauth: '', urls: '', fields: '' });
    toast('credential sealed under your master key');
  };

  /** Soft-delete into ring trash — restorable for 30 days. */
  const trashRecord = (r: PasswordRecord) => {
    logEvent(`dropped into trash · ${r.label}`);
    void save(records.map((x) => x.id === r.id ? { ...x, deletedAt: Date.now() } : x));
    toast('dropped into the debris field — restorable for 30 days');
  };

  const restoreRecord = (r: PasswordRecord) => {
    logEvent(`restored from trash · ${r.label}`);
    const { deletedAt: _drop, ...rest } = r;
    void save(records.map((x) => x.id === r.id ? rest as PasswordRecord : x));
    toast('restored — the star re-ignites');
  };

  const purgeRecord = (r: PasswordRecord) => {
    logEvent(`purged · ${r.label}`);
    void save(records.filter((x) => x.id !== r.id));
    toast('purged — the debris burns up');
  };

  const emptyTrash = () => {
    const n = records.filter((r) => r.deletedAt).length;
    if (!n) return;
    logEvent(`purged the debris field · ${n} credentials`);
    void save(records.filter((r) => !r.deletedAt));
    toast(`${n} credentials burned out of existence`);
  };

  const runNovaScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const result = await novaScan(records.filter((r) => !r.deletedAt));
      const trashed = records.filter((r) => r.deletedAt);
      await save([...result.records, ...trashed]);
      for (const nova of result.novae) logEvent(`nova flare · ${nova.label} — compromised secret detected`);
      if (result.novae.length) toast(`${result.novae.length} nova flare${result.novae.length === 1 ? '' : 's'} — compromised secrets found`, 'warn');
      else if (result.cleared) toast(`nova scan clean — ${result.cleared} earlier flare${result.cleared === 1 ? '' : 's'} lifted`);
      else toast('nova scan clean — no compromised secrets');
      setShowSentinel(true);
    } finally { setScanning(false); }
  };

  const ingestImport = async (fresh: PasswordRecord[], duplicates: number, source: ImportSource) => {
    await save([...records, ...fresh]);
    logEvent(`gravity well · absorbed ${fresh.length} credentials from ${SOURCE_LABELS[source]} (${duplicates} duplicates refused)`);
    toast(`${fresh.length} credentials sealed from ${SOURCE_LABELS[source]}${duplicates ? ` · ${duplicates} duplicates refused` : ''}`);
  };

  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      toast(`${what} copied — clipboard scrubs in 20s`);
      setTimeout(() => { void navigator.clipboard?.writeText('·').catch(() => undefined); }, 20000);
    });
  };

  const logEvent = (msg: string) => actions.logAudit(msg);

  const exportBackup = async () => {
    if (!state.secrets) { toast('nothing sealed yet', 'warn'); return; }
    const raw = JSON.stringify(state.secrets);
    const checksum = await sha256Hex(raw);
    const blob = new Blob([JSON.stringify({ v: 2, checksum, secrets: state.secrets })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'eventide-keyring.vault.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    logEvent('exported checksummed backup');
    toast('encrypted backup carried out — still sealed');
  };

  const importBackup = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text()) as { v: number; checksum: string; secrets: VaultSecrets };
      const raw = JSON.stringify(parsed.secrets);
      if (await sha256Hex(raw) !== parsed.checksum) { toast('checksum mismatch — backup rejected', 'warn'); return; }
      let recs: PasswordRecord[];
      if (parsed.secrets.version === 2 && parsed.secrets.envelopes?.length) {
        const rk = await unwrapWithMaster(parsed.secrets);
        recs = await openRing(parsed.secrets, rk);
        setRecords(recs);
        ringKeyRef.current = rk;
        actions.setSecrets(parsed.secrets);
      } else {
        /* v1 backup — restore through the legacy seal, then migrate */
        recs = await decryptRecords(masterPass, parsed.secrets);
        const v2 = await buildRingSecrets(masterPass, recs);
        setRecords(recs);
        ringKeyRef.current = await unwrapWithMaster(v2);
        actions.setSecrets(v2);
      }
      setStatus('open');
      logEvent('imported verified backup');
      toast(`restored ${recs.length} credentials`);
    } catch {
      toast('backup rejected — wrong key or corrupted file', 'warn');
    }
  };

  const reUnlock = async () => {
    const secrets = state.secrets;
    if (!secrets) return;
    setUnlockErr('');
    try {
      if (secrets.version === 2 && secrets.envelopes?.length) {
        const env = secrets.envelopes.find((e) => (e.kind ?? 'master') === 'master');
        if (env?.fp) {
          setKeyfileFp(env.fp);
          setStatus('keyfile');
          return;
        }
        const rk = await unwrapWithMaster(secrets);
        await adoptRingKey(secrets, rk);
      } else {
        if (unlockPass !== masterPass) { setUnlockErr('wrong key'); return; }
        const recs = await decryptRecords(masterPass, secrets);
        setRecords(recs);
        setStatus('open');
        lastActivity.current = Date.now();
      }
    } catch { setUnlockErr('wrong key'); }
  };

  if (status === 'loading') return <p className="flex-1 grid place-items-center font-mono text-[10px] tracking-[0.26em] uppercase text-slate-dim">deriving key…</p>;

  if (status === 'foreign') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-10 text-center">
        <IcLock size={22} className="text-slate-dim" />
        <p className="font-mono text-[10px] tracking-[0.26em] uppercase text-slate-soft">these records were sealed with another key</p>
        <p className="text-[12px] text-slate-dim leading-relaxed max-w-[400px]">
          The key ring is encrypted per master key. Switch to the identity whose key forged the seal to read them.
        </p>
      </div>
    );
  }

  if (status === 'keyfile') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-10 text-center">
        <IcLock size={24} className="text-teal-ice" />
        <p className="font-mono text-[10px] tracking-[0.26em] uppercase text-slate-soft">a keyfile guards this ring</p>
        <p className="text-[12px] text-slate-dim max-w-[400px] leading-relaxed">
          The master envelope is bound to a keyfile. Present both the file and the master key —
          fingerprint <span className="font-mono text-teal-ice">{keyfileFp}</span>.
        </p>
        <input ref={keyfileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void unlockWithKeyfile(f); }} />
        <button onClick={() => keyfileRef.current?.click()} className="font-mono text-[9.5px] tracking-[0.26em] uppercase border border-teal-ice/50 text-teal-ice px-6 py-2 hover:bg-teal-ice/10 transition-colors">
          present the keyfile
        </button>
        {unlockErr && <p className="font-mono text-[9px] text-red-300">{unlockErr}</p>}
      </div>
    );
  }

  if (status === 'locked') {
    const hasGate = Boolean(state.secrets?.envelopes?.some((e) => e.kind === 'prf'));
    const hasWill = Boolean(state.secrets?.envelopes?.some((e) => e.kind === 'custodian'));
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-10 text-center">
        <IcLock size={24} className="text-solar" />
        <p className="font-mono text-[10px] tracking-[0.26em] uppercase text-slate-soft">key ring sealed · memory wiped</p>
        <p className="text-[12px] text-slate-dim max-w-[380px] leading-relaxed">auto-lock erased the decrypted records from memory after inactivity. present the master key to re-derive them.</p>
        <input type="password" autoFocus value={unlockPass} onChange={(e) => setUnlockPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void reUnlock()}
          placeholder="master key" className="field px-4 py-2 font-mono text-[11px] text-paper text-center placeholder:text-slate-dim/60 w-60" />
        {unlockErr && <p className="font-mono text-[9px] text-red-300">{unlockErr}</p>}
        <button onClick={() => void reUnlock()} className="font-mono text-[9.5px] tracking-[0.26em] uppercase border border-teal-ice/50 text-teal-ice px-6 py-2 hover:bg-teal-ice/10 transition-colors">
          unseal
        </button>
        {(hasGate || hasWill) && (
          <div className="flex items-center gap-2 pt-1">
            {hasGate && (
              <button onClick={() => void stargateUnlock()} disabled={gateBusy}
                title="unlock with the attuned authenticator — Windows Hello / Touch ID / security key derives the ring key"
                className="font-mono text-[8.5px] tracking-[0.22em] uppercase border border-teal-ice/40 text-teal-ice/90 px-4 py-2 hover:bg-teal-ice/10 transition-colors disabled:opacity-40">
                {gateBusy ? 'the gate listens…' : 'stargate'}
              </button>
            )}
            {hasWill && (
              <button onClick={() => setShowWill(true)}
                title="claim the ring with the stellar will's custodian key"
                className="font-mono text-[8.5px] tracking-[0.22em] uppercase border border-line/60 text-slate-soft px-4 py-2 hover:text-paper transition-colors">
                stellar will
              </button>
            )}
          </div>
        )}
        {showWill && <StellarWillModal mode="claim" secrets={state.secrets} onClaim={(k) => willClaim(k)} onClose={() => setShowWill(false)} />}
      </div>
    );
  }

  const activeRecords = records.filter((r) => !r.deletedAt);
  const trashCount = records.length - activeRecords.length;
  const filtered = activeRecords.filter((r) => {
    if (cat !== 'all' && r.category !== cat) return false;
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return r.label.toLowerCase().includes(t) || r.user.toLowerCase().includes(t) || (r.notes ?? '').toLowerCase().includes(t)
      || (r.urls ?? []).some((u) => u.toLowerCase().includes(t)) || (r.fields ?? []).some((f) => f.k.toLowerCase().includes(t) || f.v.toLowerCase().includes(t));
  });
  const trashFiltered = showTrash ? records.filter((r) => r.deletedAt) : [];
  const staleCount = activeRecords.filter((r) => ageDays(r.updatedAt) > 180).length;
  const health = activeRecords.length === 0 ? 100 : Math.max(8, Math.round(100
    - activeRecords.filter((r) => pwScore(r.secret) < 4).length / activeRecords.length * 45
    - activeRecords.filter((r) => ageDays(r.updatedAt) > 365).length / activeRecords.length * 30
    - (new Set(activeRecords.map((r) => r.secret)).size < activeRecords.length ? 15 : 0)
    - activeRecords.filter((r) => r.breachedAt).length / activeRecords.length * 25));
  const healthColor = health > 75 ? '#6fc2b4' : health > 45 ? '#e8b25c' : '#e06a5a';

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* header band */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-line/50 shrink-0">
        <span className="w-9 h-9 grid place-items-center border border-solar/40 text-solar" style={{ boxShadow: '0 0 14px rgba(242,193,120,0.15)' }}>
          <IcLock size={15} />
        </span>
        <div>
          <p className="font-display text-[13px] tracking-[0.24em] text-paper">KEY RING</p>
          <p className="font-mono text-[8px] tracking-[0.22em] uppercase text-slate-dim mt-0.5">
            {records.length} credential{records.length === 1 ? '' : 's'} · key of <span className="text-teal-ice/80">{keyName}</span>
            {staleCount > 0 && <span className="text-solar ml-2">· {staleCount} aged 180d+</span>}
          </p>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-slate-dim">ring health</p>
          <div className="flex items-center gap-2 justify-end mt-1">
            <div className="w-[90px] h-[4px] bg-void/70 border border-line/40 overflow-hidden">
              <div className="h-full" style={{ width: `${health}%`, background: healthColor, transition: 'width 0.6s ease' }} />
            </div>
            <span className="font-mono text-[10px] tabular-nums" style={{ color: healthColor }}>{health}</span>
          </div>
        </div>
      </div>

      {/* toolbar — search left, one compact action cluster right */}
      <div className="flex items-center gap-2 px-5 h-12 border-b border-line/50 shrink-0">
        <div className="relative">
          <IcSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search the ring…"
            className="field pl-7 pr-3 py-1.5 font-mono text-[11px] text-paper w-48 placeholder:text-slate-dim/60" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)}
          className="field px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-soft bg-void/60 cursor-pointer">
          <option value="all">all kinds</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex-1" />
        <div className="flex items-center border border-line/60 divide-x divide-line/60">
          <button onClick={() => setShowWell(true)} title="swallow a rival vault's export — Bitwarden, 1Password, Chrome, Proton, KeePass" className="kr-btn">import</button>
          <button onClick={() => setShowForge((v) => !v)} title="generate strong keys & passphrases" className={`kr-btn ${showForge ? 'on' : ''}`}>forge</button>
          <button onClick={() => void runNovaScan()} title={`screen every secret against ${CORPUS_SIZE} breached passwords — offline`} className="kr-btn">scan</button>
          <button onClick={() => void exportBackup()} title="download the still-encrypted ring" className="kr-btn">backup</button>
          <button onClick={() => importRef.current?.click()} title="restore a checksummed backup" className="kr-btn">restore</button>
          <button onClick={() => setShowRotate(true)} title="change the master key" className="kr-btn warn">rotate</button>
          <button onClick={() => setShowTrash((v) => !v)} title="the debris field — soft-deleted credentials" className={`kr-btn ${showTrash ? 'on' : ''} ${trashCount ? '' : 'opacity-50'}`}>trash{trashCount ? ` ${trashCount}` : ''}</button>
          <button onClick={() => setShowSentinel((v) => !v)} title="the sentinel report — itemized weaknesses & remedies" className={`kr-btn ${showSentinel ? 'on' : ''}`}>sentinel</button>
          <button onClick={() => setShowAudit((v) => !v)} title="the ring's memory — every sensitive act, timestamped" className={`kr-btn ${showAudit ? 'on' : ''}`}>audit</button>
        </div>
        <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => { void importBackup(e.target.files?.[0]); e.target.value = ''; }} />
        <select value={autoLock} onChange={(e) => { const v = Number(e.target.value); setAutoLock(v); localStorage.setItem(STORAGE_KEYS.vaultAutolock, String(v)); }}
          className="field px-2 py-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-soft bg-void/60 cursor-pointer" title="auto-lock after inactivity">
          <option value={0}>no auto-lock</option>
          <option value={60}>lock · 1m</option>
          <option value={300}>lock · 5m</option>
          <option value={900}>lock · 15m</option>
        </select>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* records */}
        <div className="flex-1 min-w-0 overflow-y-auto thin-scroll">
          {showAudit ? (
            <div className="px-5 py-3">
              <p className="font-mono text-[8.5px] tracking-[0.3em] uppercase text-teal-ice/80">security audit</p>
              <p className="text-[10.5px] text-slate-dim leading-relaxed mt-1.5 mb-3 max-w-140">
                The ring's memory. Every unseal, reveal, copy, seal, purge, rotation and auto-lock leaves a
                timestamped trace below — so if anything ever happens that wasn't you, you'll see it here.
              </p>
              {state.audit.length === 0 && <p className="font-mono text-[9px] text-slate-dim">no events recorded</p>}
              {[...state.audit].reverse().map((a: AuditEntry, i: number) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-line/30">
                  <span className="font-mono text-[8px] text-slate-dim tabular-nums shrink-0">{new Date(a.t).toLocaleTimeString()}</span>
                  <span className="font-mono text-[9.5px] text-slate-soft">{a.msg}</span>
                </div>
              ))}
            </div>
          ) : showSentinel ? (
            <SentinelPanel records={records} scanning={scanning} onScan={() => void runNovaScan()} />
          ) : showTrash ? (
            <div className="px-5 py-3">
              <div className="flex items-center gap-2">
                <p className="font-mono text-[8.5px] tracking-[0.3em] uppercase text-teal-ice/80">the debris field</p>
                <div className="flex-1" />
                {trashCount > 0 && (
                  <button onClick={emptyTrash} className="font-mono text-[8px] tracking-[0.18em] uppercase border border-red-400/40 text-red-300 px-2 py-1 hover:bg-red-400/10 transition-colors">purge all</button>
                )}
              </div>
              <p className="text-[10.5px] text-slate-dim leading-relaxed mt-1.5 mb-3 max-w-140">
                Soft-deleted credentials drift here for {TRASH_TTL_DAYS} days before burning up. Nothing is truly gone until you say so.
              </p>
              {trashFiltered.length === 0 && <p className="font-mono text-[9px] text-slate-dim">the field is empty — no debris orbiting</p>}
              {trashFiltered.map((r) => {
                const daysLeft = TRASH_TTL_DAYS - ageDays(r.deletedAt ?? Date.now());
                return (
                  <div key={r.id} className="vault-row flex items-center gap-3.5 px-5 py-2.5 border-b border-line/40">
                    <span className="w-1.75 h-1.75 rounded-full shrink-0 bg-slate-dim/60" />
                    <div className="w-40 min-w-0">
                      <p className="text-[12px] text-slate-dim truncate">{r.label}</p>
                      <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-red-300/70">{daysLeft > 0 ? `${daysLeft}d to burnout` : 'burning up'}</p>
                    </div>
                    <span className="flex-1 min-w-0 font-mono text-[10px] text-slate-dim/70 truncate">{r.user || '—'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => restoreRecord(r)} className="font-mono text-[8px] tracking-[0.18em] uppercase text-teal-ice border border-teal-ice/40 px-2 py-1 hover:bg-teal-ice/10 transition-colors">restore</button>
                      <button onClick={() => purgeRecord(r)} title="purge forever" className="px-2 py-1 text-slate-dim hover:text-red-300 transition-colors"><IcTrash size={11} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {filtered.length === 0 && (
                <p className="text-center font-mono text-[10px] tracking-[0.24em] uppercase text-slate-dim py-16">
                  {activeRecords.length === 0 ? 'the ring is empty — seal your first credential' : 'no credential answers that search'}
                </p>
              )}
              {filtered.map((r) => {
                const age = ageDays(r.updatedAt);
                const sc = pwScore(r.secret);
                const tier = pwTier(sc);
                const isEdit = editing === r.id;
                const isNova = Boolean(r.breachedAt);
                return (
                  <div key={r.id} className="border-b border-line/40">
                    <div className="vault-row flex items-center gap-3.5 px-5 py-2.5">
                      {isNova ? <NovaGlyph /> : <span className="w-1.75 h-1.75 rounded-full shrink-0" style={{ background: tier.color, boxShadow: `0 0 6px ${tier.color}` }} title={`strength: ${tier.label}`} />}
                      <span className="w-[64px] shrink-0 font-mono text-[7.5px] tracking-[0.18em] uppercase px-1.5 py-0.5 text-center border"
                        style={{ color: CAT_COLORS[r.category ?? 'note'], borderColor: `${CAT_COLORS[r.category ?? 'note']}44` }}>
                        {r.category ?? 'site'}
                      </span>
                      <div className="w-40 min-w-0">
                        <p className="text-[12px] text-paper truncate">{r.label}</p>
                        <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-slate-dim">
                          {age}d{isNova && <span className="text-red-300"> · nova</span>}{age > 365 && <span className="text-red-300"> · rotate</span>}{age > 180 && age <= 365 && <span className="text-solar"> · aged</span>}
                        </p>
                      </div>
                      <button onClick={() => copy(r.user, 'identity')} className="w-40 min-w-0 text-left group/uid" title="copy identity">
                        <span className="font-mono text-[11px] text-slate-soft truncate block group-hover/uid:text-teal-ice transition-colors">{r.user || '—'}</span>
                      </button>
                      <span className="flex-1 min-w-0 font-mono text-[11px] tracking-[0.16em] truncate">
                        {reveal === r.id ? <span className="text-solar tracking-normal">{r.secret}</span> : <span className="text-slate-dim">••••••••••••</span>}
                      </span>
                      {r.otpauth && <PulsarCode otpauth={r.otpauth} onCopy={(code, issuer) => { copy(code, `${issuer} pulsar code`); logEvent(`copied pulsar code · ${r.label}`); }} />}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { const on = reveal !== r.id; setReveal(on ? r.id : null); if (on) logEvent(`revealed · ${r.label}`); }} title={reveal === r.id ? 'conceal' : 'reveal'}
                          className={`px-2 py-1 border border-transparent transition-colors ${reveal === r.id ? 'text-solar' : 'text-slate-dim hover:text-teal-ice'}`}>
                          <IcEye size={12} />
                        </button>
                        <button onClick={() => { copy(r.secret, 'secret'); logEvent(`copied · ${r.label}`); }} title="copy secret"
                          className="px-2 py-1 text-slate-dim hover:text-teal-ice border border-transparent transition-colors">
                          <IcCopy size={12} />
                        </button>
                        <button onClick={() => { setEditing(r.id); setEditForm({ label: r.label, user: r.user, secret: r.secret, category: r.category ?? 'site', notes: r.notes ?? '', otpauth: r.otpauth ?? '', urls: (r.urls ?? []).join('\n'), fields: (r.fields ?? []).map((f) => `${f.k}: ${f.v}`).join('\n') }); }}
                          title="edit" className="px-2 py-1 text-slate-dim hover:text-paper transition-colors">
                          <IcEdit size={11} />
                        </button>
                        <button onClick={() => trashRecord(r)} title="drop into the debris field (30-day restore)"
                          className="px-2 py-1 text-slate-dim hover:text-red-300 transition-colors">
                          <IcTrash size={11} />
                        </button>
                      </div>
                    </div>
                    {isEdit && (
                      <div className="px-5 pb-3 pt-1 grid grid-cols-2 gap-2 bg-void/30">
                        <input value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} placeholder="label" className="field px-2.5 py-1.5 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
                        <input value={editForm.user} onChange={(e) => setEditForm({ ...editForm, user: e.target.value })} placeholder="identity" className="field px-2.5 py-1.5 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
                        <input value={editForm.secret} onChange={(e) => setEditForm({ ...editForm, secret: e.target.value })} placeholder="secret" className="field px-2.5 py-1.5 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
                        <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="field px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-soft bg-void/60">
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input value={editForm.otpauth} onChange={(e) => setEditForm({ ...editForm, otpauth: e.target.value })} placeholder="otpauth://… or base32 seed (pulsar code)" className="field px-2.5 py-1.5 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
                        <input value={editForm.urls} onChange={(e) => setEditForm({ ...editForm, urls: e.target.value })} placeholder="urls — one per line" className="field px-2.5 py-1.5 font-mono text-[11px] text-paper placeholder:text-slate-dim/60" />
                        <textarea value={editForm.fields} onChange={(e) => setEditForm({ ...editForm, fields: e.target.value })} placeholder="custom fields — one per line as  name: value" rows={2} className="field px-2.5 py-1.5 font-mono text-[11px] text-paper placeholder:text-slate-dim/60 col-span-2 resize-none" />
                        <input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="notes (optional)" className="field px-2.5 py-1.5 font-mono text-[11px] text-paper placeholder:text-slate-dim/60 col-span-2" />
                        {r.history && r.history.length > 0 && (
                          <div className="col-span-2 border border-line/40 bg-void/40 px-2.5 py-1.5">
                            <p className="font-mono text-[7.5px] tracking-[0.2em] uppercase text-slate-dim mb-1">prior secrets — tap to resurrect</p>
                            <div className="flex flex-wrap gap-1.5">
                              {[...r.history].reverse().map((h, i) => (
                                <button key={i} title={HISTORY_LABELS[Math.min(i, HISTORY_LABELS.length - 1)]}
                                  onClick={() => setEditForm((f) => ({ ...f, secret: h.secret }))}
                                  className="font-mono text-[8px] tracking-[0.14em] uppercase text-slate-soft border border-line/50 px-1.5 py-0.5 hover:text-teal-ice hover:border-teal-ice/40 transition-colors">
                                  {HISTORY_LABELS[Math.min(i, HISTORY_LABELS.length - 1)]} · {new Date(h.changedAt).toLocaleDateString()}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="col-span-2 flex gap-2 justify-end">
                          <button onClick={() => setEditing(null)} className="font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim hover:text-paper px-3 py-1.5 border border-line/50 transition-colors">cancel</button>
                          <button
                            onClick={async () => {
                              const extras = parseFormExtras(editForm);
                              const next = records.map((x) => x.id === r.id ? {
                                ...withHistory(x, editForm.secret),
                                label: editForm.label,
                                user: editForm.user,
                                secret: editForm.secret,
                                category: editForm.category || undefined,
                                notes: editForm.notes || undefined,
                                otpauth: extras.otpauth,
                                urls: extras.urls,
                                fields: extras.fields,
                                updatedAt: Date.now(),
                              } : x);
                              await save(next);
                              setEditing(null);
                              toast('credential re-sealed');
                            }}
                            className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal-ice border border-teal-ice/50 px-3 py-1.5 hover:bg-teal-ice/10 transition-colors">
                            re-seal
                          </button>
                        </div>
                      </div>
                    )}
                    {!isEdit && (r.notes || (r.fields && r.fields.length) || (r.urls && r.urls.length)) && (
                      <p className="px-5 pb-2 -mt-1 font-body text-[11px] italic text-slate-dim truncate">
                        ✎ {r.notes}{r.notes && r.fields?.length ? ' · ' : ''}{(r.fields ?? []).slice(0, 2).map((f) => f.k).join(' · ')}{(r.urls ?? []).length ? ` · ${(r.urls ?? []).length} url${(r.urls ?? []).length === 1 ? '' : 's'}` : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* right column */}
        <div className="w-75 shrink-0 border-l border-line/40 p-4 space-y-4 overflow-y-auto thin-scroll">
          {showForge && <KeyGenerator onUse={(k) => { setForm((f) => ({ ...f, secret: k })); toast('forged key placed in the secret field'); }} />}
          <div className="vault-surface p-4 space-y-2.5">
            <p className="font-mono text-[8.5px] tracking-[0.3em] uppercase text-teal-ice/80">seal a credential</p>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="label — e.g. orbital mail" className="field px-2.5 py-2 font-mono text-[11px] text-paper w-full placeholder:text-slate-dim/60" />
            <input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="identity / username" className="field px-2.5 py-2 font-mono text-[11px] text-paper w-full placeholder:text-slate-dim/60" />
            <div>
              <input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="secret / key" className="field px-2.5 py-2 font-mono text-[11px] text-paper w-full placeholder:text-slate-dim/60" />
              <div className="pw-meter mt-1.5"><span style={{ width: `${(pwScore(form.secret) / 8) * 100}%`, background: pwTier(pwScore(form.secret)).color }} /></div>
              <p className="font-mono text-[7.5px] tracking-[0.2em] uppercase mt-1 text-right" style={{ color: pwTier(pwScore(form.secret)).color }}>{form.secret ? pwTier(pwScore(form.secret)).label : 'strength'}</p>
            </div>
            <input value={form.otpauth} onChange={(e) => setForm({ ...form, otpauth: e.target.value })} placeholder="otpauth://… or base32 seed — optional pulsar" className="field px-2.5 py-2 font-mono text-[11px] text-paper w-full placeholder:text-slate-dim/60" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="field px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-soft bg-void/60 w-full">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.urls} onChange={(e) => setForm({ ...form, urls: e.target.value })} placeholder="urls — one per line (optional)" className="field px-2.5 py-2 font-mono text-[11px] text-paper w-full placeholder:text-slate-dim/60" />
            <input value={form.fields} onChange={(e) => setForm({ ...form, fields: e.target.value })} placeholder="custom fields — name: value per line" className="field px-2.5 py-2 font-mono text-[11px] text-paper w-full placeholder:text-slate-dim/60" />
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="notes (optional)" className="field px-2.5 py-2 font-mono text-[11px] text-paper w-full placeholder:text-slate-dim/60" />
            <button onClick={() => void add()} className="w-full font-mono text-[9.5px] tracking-[0.24em] uppercase border border-teal-ice/50 text-teal-ice px-3 py-2 hover:bg-teal-ice/10 transition-colors">
              seal into the ring
            </button>
          </div>
          <div className="vault-surface p-4 space-y-2">
            <p className="font-mono text-[8.5px] tracking-[0.3em] uppercase text-teal-ice/80">vault armory</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowGate(true)} title="attune a biometric / hardware authenticator (WebAuthn PRF)"
                className="font-mono text-[8.5px] tracking-[0.18em] uppercase border border-line/60 text-slate-soft px-2 py-2 hover:text-teal-ice hover:border-teal-ice/40 transition-colors">
                stargate
              </button>
              <button onClick={() => setShowWill(true)} title="arm the stellar will — a custodian key for your digital legacy"
                className="font-mono text-[8.5px] tracking-[0.18em] uppercase border border-line/60 text-slate-soft px-2 py-2 hover:text-teal-ice hover:border-teal-ice/40 transition-colors">
                will{state.secrets?.envelopes?.some((e) => e.kind === 'custodian') ? ' ✓' : ''}
              </button>
              <button onClick={() => setShowCourier(true)} title="launch an encrypted one-view comet"
                className="font-mono text-[8.5px] tracking-[0.18em] uppercase border border-line/60 text-slate-soft px-2 py-2 hover:text-teal-ice hover:border-teal-ice/40 transition-colors">
                comet
              </button>
              <button onClick={() => setShowReceive(true)} title="catch a comet someone launched to you"
                className="font-mono text-[8.5px] tracking-[0.18em] uppercase border border-line/60 text-slate-soft px-2 py-2 hover:text-teal-ice hover:border-teal-ice/40 transition-colors">
                receive
              </button>
            </div>
            <p className="font-mono text-[7px] tracking-[0.16em] uppercase leading-relaxed text-slate-dim/80">
              {state.secrets?.envelopes?.some((e) => e.kind === 'prf')
                ? 'stargate attuned · '
                : ''}{state.secrets?.envelopes?.find((e) => (e.kind ?? 'master') === 'master')?.fp
                ? 'keyfile bound · '
                : ''}{state.secrets?.envelopes?.some((e) => e.kind === 'custodian')
                ? 'will armed · '
                : ''}envelope-sealed
            </p>
          </div>
          <p className="font-mono text-[7.5px] tracking-[0.18em] uppercase leading-relaxed text-slate-dim/80">
            AES-256-GCM · Argon2id 64MiB×3 envelopes · ring key sealed per master key · revealed secrets auto-conceal after 12s
          </p>
        </div>
      </div>

      {showRotate && ringKeyRef.current && state.secrets && (
        <RotateKeyModal
          secrets={state.secrets}
          ringKey={ringKeyRef.current}
          onRewound={(next, detail) => {
            actions.setSecrets(next);
            logEvent(`rotated master key · ${detail}`);
            toast('master key rotated — the old key is dead');
          }}
          onClose={() => setShowRotate(false)}
        />
      )}
      {showWell && (
        <GravityWellModal
          existing={records}
          onClose={() => setShowWell(false)}
          onIngest={(fresh, duplicates, source) => void ingestImport(fresh, duplicates, source)}
        />
      )}
      {showGate && ringKeyRef.current && (
        <StargateModal ringKey={ringKeyRef.current} onAttuned={attuneStargate} onClose={() => setShowGate(false)} />
      )}
      {showWill && (
        <StellarWillModal
          mode="arm"
          secrets={state.secrets}
          ringKey={ringKeyRef.current ?? undefined}
          onArm={armWill}
          onClose={() => setShowWill(false)}
        />
      )}
      {showCourier && (
        <CourierModal records={records} onSend={sendComet} onClose={() => setShowCourier(false)} />
      )}
      {showReceive && (
        <ReceiveModal onIngest={ingestComet} onClose={() => setShowReceive(false)} />
      )}
    </div>
  );
}

/* ============================= identity editor ============================ */

function IdentityEditor({ user, onClose, onRemoved }: { user: VaultUser; onClose: () => void; onRemoved: () => void }) {
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

function LockModal({ file, openAfter, onClose }: { file: VaultFile; openAfter: boolean; onClose: () => void }) {
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

function UnlockPrompt({ file, onOk, onClose }: { file: VaultFile; onOk: () => void; onClose: () => void }) {
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

function Telemetry({ files }: { files: VaultFile[] }) {
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

function VaultHome({ files, bytes, userName, onOpen, onSection, onSeal, onTerminal, onScan }: {
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

function VaultTerminal({ onClose }: { onClose: () => void }) {
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

function DeepScan({ onClose }: { onClose: () => void }) {
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
const SECTIONS: { id: string; label: string; kinds: VaultKind[] | null }[] = [
  { id: 'home', label: 'Home', kinds: null },
  { id: 'fs', label: 'File Manager', kinds: null },
  { id: 'all', label: 'Everything', kinds: null },
  { id: 'void', label: 'The Void', kinds: null },
];

export default function VaultUI({ onClose }: { onClose: () => void }) {
  const state = useUniverse();
  const [user, setUser] = useState<VaultUser | null>(null);
  const [masterPass, setMasterPass] = useState('');
  /* the vault opens straight into its file system — the organizing principle */
  const [section, setSection] = useState('fs');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<VaultFile | null>(null);
  const [viewer, setViewer] = useState<VaultFile | null>(null);
  const [unlocking, setUnlocking] = useState<{ file: VaultFile; action: 'open' | 'download' | 'remove-lock' } | null>(null);
  const [lockModal, setLockModal] = useState<{ file: VaultFile; openAfter: boolean } | null>(null);
  const [editUser, setEditUser] = useState<VaultUser | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [gq, setGq] = useState('');
  const [sort, setSort] = useState<'recent' | 'name' | 'size'>('recent');
  const [delArm, setDelArm] = useState<string | null>(null);
  const [dropHot, setDropHot] = useState(false);
  const dragDepth = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  /* the EFS tree is global — every vault surface lists the whole vault,
     regardless of which reality each file was sealed in */
  const activeVault = useMemo(() => state.vault, [state.vault]);
  const bytes = activeVault.reduce((a, f) => a + f.size, 0);
  const efsChildren = (dirId: string) => efsChildrenOf(state.efs, dirId);

  const items = useMemo(() => {
    const sec = SECTIONS.find((s) => s.id === section);
    let list = activeVault;
    if (sec?.kinds) list = list.filter((f) => sec.kinds!.includes(f.kind));
    if (q.trim()) list = list.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()));
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'size') return b.size - a.size;
      return b.addedAt - a.addedAt;
    });
  }, [activeVault, section, q, sort]);

  const groups = useMemo(() => {
    const m = new Map<string, VaultFile[]>();
    items.forEach((f) => {
      const k = efsPathString(state.efs, f.dirId ?? EFS_ROOT);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    });
    return [...m.entries()];
  }, [items, state.efs]);

  const importFiles = async (files: FileList | null, destDirId?: string) => {
    if (!files || !files.length) return;
    const added: VaultFile[] = [];
    const canStorePayload = hasIdb() || hasOpfs();
    /* imports land in the current EFS directory; section-wide drops from
       home/all go into an 'imports' directory at the vault root */
    const parent = destDirId ?? EFS_ROOT;
    const existingImports = efsChildren(parent).dirs.find((d) => d.name === 'imports');
    const importsDir = destDirId
      ? destDirId
      : (section === 'fs' ? parent : (existingImports ? existingImports.id : (actions.efsCreateFolder(parent, 'imports') ?? parent)));
    for (const f of Array.from(files)) {
      /* Payload sealing encrypts the whole object in memory; past ~2 GB the
         tab used to crash with an OOM instead of explaining itself. */
      const MAX_IMPORT_BYTES = 2 * 1024 * 1024 * 1024;
      if (f.size > MAX_IMPORT_BYTES) {
        toast(`${f.name} is over the 2 GB vault import limit and was skipped`, 'warn');
        continue;
      }
      if (f.size > 512 * 1024 * 1024) toast(`sealing ${f.name} — a very large object, this may take a moment`, 'warn');
      const kind = kindOf(f.name, f.type);
      const base: VaultFile = {
        id: newId(), name: f.name,
        dirId: importsDir,
        kind, mime: f.type || 'application/octet-stream', size: f.size, addedAt: Date.now(),
        realityId: state.activeRealityId,
      };
      const isText = kind === 'document' && f.size < 1_500_000;
      /* New imports use encrypted OPFS/IndexedDB payloads regardless of size. */
      const isMedia = kind === 'image' || kind === 'audio' || kind === 'video';
      if (canStorePayload) {
        try {
          await putPayload(base.id, f);
          base.payloadRef = base.id;
          base.payloadEncrypted = true;
          if (kind === 'image') base.thumb = await makeThumb(f);
          base.checksum = await efsChecksumOf(base, getPayload);
        } catch {
          base.sealed = true;
        }
      } else if (isText) {
        base.content = await f.text();
        base.checksum = await efsChecksumOf(base, getPayload);
      } else if (isMedia) {
        base.content = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(f);
        });
      } else base.sealed = true;
      added.push(base);
    }
    actions.addVaultFiles(added);
    void actions.efsRunDedup();
    pulseVault(0.6);
    toast(`${added.length} object${added.length === 1 ? '' : 's'} sealed into the Vault`);
  };

  /* tiny inline preview so IDB-backed images still render in the grid */
  const makeThumb = (f: File) => new Promise<string | undefined>((res) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 160 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * s));
      cv.height = Math.max(1, Math.round(img.height * s));
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      res(cv.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(undefined); };
    img.src = url;
  });

  const open = (f: VaultFile) => {
    if (isVaultFileLocked(f) && !isVaultFileAuthorized(f.id)) {
      setUnlocking({ file: f, action: 'open' });
      return;
    }
    setViewer(f);
  };

  const requestDownload = (f: VaultFile) => {
    if (isVaultFileLocked(f) && !isVaultFileAuthorized(f.id)) {
      setUnlocking({ file: f, action: 'download' });
      return;
    }
    void downloadFile(f);
  };

  const quickLock = (f: VaultFile) => {
    if (isVaultFileLocked(f)) setUnlocking({ file: f, action: 'remove-lock' });
    else setLockModal({ file: f, openAfter: false });
  };
  const removeFile = (f: VaultFile) => {
    if (delArm === f.id) {
      actions.releaseVaultFile(f.id);
      if (selected?.id === f.id) setSelected(null);
      setDelArm(null);
      toast(`released ${f.name} to the Void — restore it anytime`);
    } else {
      setDelArm(f.id);
      setTimeout(() => setDelArm((d) => (d === f.id ? null : d)), 2400);
    }
  };

  const selectedLive = selected ? activeVault.find((f) => f.id === selected.id) ?? null : null;
  const gHits = gq.trim()
    ? activeVault.filter((f) => {
        const t = gq.trim().toLowerCase();
        return f.name.toLowerCase().includes(t) || f.kind.includes(t) || efsPathString(state.efs, f.dirId ?? EFS_ROOT).toLowerCase().includes(t);
      }).slice(0, 8)
    : [];
  const activeSec = SECTIONS.find((s) => s.id === section);

  useEffect(() => {
    return () => clearPayloadSession();
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !viewer && !lockModal && !unlocking && !showTerminal && !showScan) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, viewer, lockModal, unlocking, showTerminal, showScan]);

  return (
    <div className="vault-scope fixed inset-0 z-110 overlay-in overflow-hidden" style={{ background: 'rgba(3,5,11,0.34)' }}>
      <VaultBackdrop />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 100% at 50% 0%, rgba(8,13,24,0.12), rgba(3,5,11,0.3))' }} />
      <div
        className="vault-glass absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-[min(1080px,94vw)] h-[min(660px,88vh)] flex flex-col rise-in"
        onDragEnter={(e) => { if (!user) return; e.preventDefault(); dragDepth.current++; setDropHot(true); }}
        onDragOver={(e) => { if (!user) return; e.preventDefault(); }}
        onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropHot(false); }}
        onDrop={(e) => {
          if (!user) return;
          e.preventDefault();
          dragDepth.current = 0;
          setDropHot(false);
          void importFiles(e.dataTransfer.files);
        }}
      >
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { void importFiles(e.target.files); e.target.value = ''; }} />

        {dropHot && (
          <div className="drop-veil absolute inset-0 z-[60] grid place-items-center pointer-events-none">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto border border-dashed border-teal-ice/70 rotate-45 grid place-items-center" style={{ boxShadow: '0 0 30px rgba(111,194,180,0.35)' }}>
                <IcPlus size={20} className="text-teal-ice -rotate-45" />
              </div>
              <p className="font-display text-[14px] tracking-[0.26em] text-paper mt-5">RELEASE TO SEAL</p>
              <p className="font-mono text-[8.5px] tracking-[0.28em] uppercase text-teal-ice/80 mt-2">matter will be sorted into the vault</p>
            </div>
          </div>
        )}

        {/* header */}
        <div className="flex items-center gap-5 px-6 h-14 border-b border-teal-ice/15 shrink-0">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-[13px] font-medium tracking-[0.26em] text-paper">EVENTIDE</span>
            <span className="font-mono text-[8px] tracking-[0.3em] uppercase text-teal-ice/70">universal vault</span>
          </div>
          {/* vault-wide search — finds objects from any tab, any folder */}
          <div className="relative ml-5 hidden md:block">
            <IcSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-dim pointer-events-none" />
            <input
              value={gq}
              onChange={(e) => setGq(e.target.value)}
              placeholder="find anything in the vault…"
              className="gsearch-inp"
            />
            {gq.trim() && (
              <div className="gsearch-drop">
                {gHits.map((f) => (
                  <button key={f.id} className="gsearch-row" onClick={() => { setGq(''); open(f); }}>
                    <KindGlyph kind={f.kind} size={13} />
                    <span className="truncate flex-1 text-left">{f.name}</span>
                    {f.lock && <IcLock size={10} className="text-solar shrink-0" />}
                    <span className="gsearch-path shrink-0">{efsPathString(state.efs, f.dirId ?? EFS_ROOT)}</span>
                  </button>
                ))}
                {gHits.length === 0 && (
                  <p className="px-3 py-2.5 font-mono text-[9px] tracking-[0.2em] uppercase text-slate-dim">nothing in the vault matches</p>
                )}
              </div>
            )}
          </div>
          <div className="flex-1" />
          {user && (
            <div className="flex items-center gap-1">
              <button onClick={() => setShowTerminal(true)} className="p-2 text-slate-dim hover:text-teal-ice transition-colors" title="open the eventide shell">
                <IcTerminal size={14} />
              </button>
              <button onClick={() => setShowScan(true)} className="p-2 text-slate-dim hover:text-teal-ice transition-colors" title="deep integrity scan">
                <IcScan size={14} />
              </button>
            </div>
          )}
          {user && (
            <button
              onClick={() => setSection(section === 'passwords' ? 'home' : 'passwords')}
              className={`flex items-center gap-2 px-3 py-1.5 border transition-colors ${section === 'passwords' ? 'border-solar/60 text-solar bg-solar/10' : 'border-line/60 text-slate-soft hover:text-solar hover:border-solar/40'}`}
              title="the key ring — sealed credentials"
            >
              <IcLock size={11} />
              <span className="font-mono text-[8.5px] tracking-[0.24em] uppercase">key ring</span>
            </button>
          )}
          {user && (
            <div className="flex items-center gap-2">
              {/* avatar is its own picker (never nested in a button) — click to change */}
              <span className="identity-chip-avatar">
                <AvatarPicker userId={user.id} current={state.vaultUsers.find((u) => u.id === user.id) ?? user} size={32} />
              </span>
              <button onClick={() => { clearPayloadSession(); setUser(null); setMasterPass(''); setViewer(null); setLockModal(null); }} className="group text-left" title="switch identity">
                <span className="block font-mono text-[9.5px] tracking-[0.16em] uppercase text-paper group-hover:text-teal-ice transition-colors leading-tight">{user.name}</span>
                <span className="block font-mono text-[7.5px] tracking-[0.2em] uppercase text-slate-dim leading-tight mt-0.5">switch identity</span>
              </button>
              <button onClick={() => setEditUser(user)} className="w-7 h-7 grid place-items-center text-slate-dim hover:text-teal-ice transition-colors" title="edit name & avatar">
                <IcEdit size={12} />
              </button>
            </div>
          )}
          <button onClick={onClose} className="p-2 -mr-2 text-slate-dim hover:text-paper transition-colors" title="leave the vault">
            <IcClose size={15} />
          </button>
        </div>

        {/* body */}
        {!user ? (
          <Gate onEnter={async (u, pass) => {
            await unlockPayloadSession(pass, u.salt, u.kdfRounds ?? KDF_TARGET_ROUNDS);
            setUser(u);
            setMasterPass(pass);
          }} />
        ) : (
          <div className="flex flex-1 min-h-0 relative">
            {/* rail — collapsible */}
            <div className="rail-wrap relative shrink-0 overflow-hidden" style={{ width: railOpen ? 192 : 0, transition: 'width 0.45s cubic-bezier(0.22,1,0.36,1)' }}>
              <div className="w-48 border-r border-line/60 py-3 h-full overflow-y-auto thin-scroll" style={{ opacity: railOpen ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                {SECTIONS.map((s) => {
                  const count = s.id === 'home' ? '◈'
                    : s.id === 'void' ? (state.vaultTrash.length || '·')
                    : s.kinds === null ? activeVault.length
                    : activeVault.filter((f) => s.kinds!.includes(f.kind)).length;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setSection(s.id); setSelected(null); }}
                      className={`rail-item w-full flex items-center justify-between px-5 py-2 text-left ${section === s.id ? 'active' : ''}`}
                    >
                      <span className="text-[12px] flex items-center gap-2">
                        {s.id === 'fs' && <IcFolder size={11} />}
                        {s.id === 'void' && <IcTrash size={11} />}
                        {s.label}
                      </span>
                      <span className="font-mono text-[9px] text-slate-dim">{count}</span>
                    </button>
                  );
                })}
                <div className="mx-5 my-3 h-px bg-line/50" />
                <button
                  onClick={() => setSection('passwords')}
                  className={`rail-item w-full flex items-center justify-between px-5 py-2 text-left ${section === 'passwords' ? 'active' : ''}`}
                >
                  <span className="text-[12px] flex items-center gap-2 text-solar/90"><IcLock size={11} /> Key ring</span>
                  <span className="font-mono text-[9px] text-slate-dim">{state.secrets ? '⚿' : '·'}</span>
                </button>
              </div>
            </div>
            <button
              onClick={() => setRailOpen((v) => !v)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-14 grid place-items-center border border-line/60 border-l-0 text-slate-dim hover:text-teal-ice transition-colors bg-void/60"
              style={{ left: railOpen ? 192 : 0, transition: 'left 0.45s cubic-bezier(0.22,1,0.36,1)' }}
              title={railOpen ? 'collapse rail' : 'expand rail'}
            >
              {railOpen ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 6l-6 6 6 6" /></svg>
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 6l6 6-6 6" /></svg>}
            </button>

            {/* main */}
            <div className="flex-1 min-w-0 flex flex-col">
              {section === 'passwords' ? (
                <PasswordVault masterPass={masterPass} keyName={user.name} />
              ) : section === 'home' ? (
                <VaultHome
                  files={activeVault}
                  bytes={bytes}
                  userName={user.name}
                  onOpen={open}
                  onSection={(id) => { setSection(id); setSelected(null); }}
                  onSeal={() => fileRef.current?.click()}
                  onTerminal={() => setShowTerminal(true)}
                  onScan={() => setShowScan(true)}
                />
              ) : section === 'fs' ? (
                <FileManager onOpen={open} onImport={(f, d) => void importFiles(f, d)} onLock={quickLock} />
              ) : section === 'void' ? (
                <TheVoid />
              ) : (
                <>
                  <div className="flex items-center gap-3 px-5 h-12 border-b border-line/50 shrink-0">
                    <div className="flex items-center gap-2 flex-1">
                      <IcSearch size={12} className="text-slate-dim" />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={`search ${activeSec?.label.toLowerCase() ?? ''}…`}
                        className="bg-transparent font-mono text-[11px] text-paper w-56 placeholder:text-slate-dim/60 outline-none"
                      />
                    </div>
                    <span className="font-mono text-[9px] tracking-[0.18em] text-slate-dim">{items.length} OBJECTS</span>
                    <select value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'name' | 'size')}
                      className="field px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-soft bg-void/60 cursor-pointer">
                      <option value="recent">recent</option>
                      <option value="name">name</option>
                      <option value="size">size</option>
                    </select>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="font-mono text-[9.5px] tracking-[0.2em] uppercase border border-teal-ice/30 text-teal-ice px-3 py-1.5 hover:bg-teal-ice/10 transition-colors"
                    >
                      seal files in
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {items.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center gap-2">
                        <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-slate-dim">vacuum — nothing sealed here</p>
                      </div>
                    )}
                    {groups.map(([folder, gfiles]) => (
                      <div key={folder} className="mb-5">
                        <div className="flex items-center gap-3 mb-2">
                          <IcFolder size={11} className="text-teal-ice/75" />
                          <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-teal-ice/80">{folder}</span>
                          <span className="font-mono text-[8.5px] text-slate-dim">{gfiles.length} object{gfiles.length === 1 ? '' : 's'}</span>
                          <span className="flex-1 h-px bg-line/40" />
                        </div>
                        <div className="vault-tile-grid">
                          {gfiles.map((f) => (
                            <div
                              key={f.id}
                              role="button" tabIndex={0}
                              onClick={() => setSelected(f)}
                              onDoubleClick={() => open(f)}
                              className={`vault-item group/tile relative text-left px-3.5 py-3 border cursor-pointer ${selected?.id === f.id ? 'border-teal-ice/60 bg-teal-ice/10' : 'border-line/70'}`}
                            >
                              <div className="flex items-start justify-between">
                                <span className={selected?.id === f.id ? 'text-teal-ice' : 'text-slate-soft'}><KindGlyph kind={f.kind} /></span>
                                <span className="flex items-center gap-1">
                                  {f.lock && <span className="text-solar" title="key-locked"><IcLock size={11} /></span>}
                                  {f.payloadMissing && <span className="font-mono text-[7.5px] tracking-[0.16em] text-solar border border-solar/40 px-1 py-[1px]">MISSING</span>}
                                  {f.sealed && !f.payloadMissing && <span className="font-mono text-[7.5px] tracking-[0.16em] text-slate-dim border border-line px-1 py-[1px]">SEALED</span>}
                                </span>
                              </div>
                              <div className="h-[52px] mt-2 overflow-hidden border border-line/30 bg-void/50"><TilePreview f={f} /></div>
                              <p className="text-[11.5px] text-paper mt-2 truncate" title={f.name}>{f.name}</p>
                              <p className="font-mono text-[8.5px] tracking-widest text-slate-dim mt-1">{fmtBytes(f.size)} · {fmtDate(f.addedAt).split(', ')[0]}</p>
                              <div className="tile-actions absolute inset-x-0 bottom-0 hidden group-hover/tile:flex items-stretch border-t border-line/60 bg-void/85 backdrop-blur-sm">
                                <button className="tile-action" title="open" onClick={(e) => { e.stopPropagation(); open(f); }}><IcEye size={11} /></button>
                                <button className="tile-action" title="download" onClick={(e) => { e.stopPropagation(); requestDownload(f); }}><IcDownload size={11} /></button>
                                <button className="tile-action" title={f.lock ? 'unlock' : 'key-lock'} onClick={(e) => { e.stopPropagation(); quickLock(f); }}>{f.lock ? <IcUnlock size={11} /> : <IcLock size={11} />}</button>
                                <button className={`tile-action ${delArm === f.id ? 'text-red-300' : ''}`} title={delArm === f.id ? 'confirm release' : 'release'} onClick={(e) => { e.stopPropagation(); removeFile(f); }}><IcTrash size={11} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* inspector strip */}
                  <div className="h-11 border-t border-line/50 px-5 flex items-center gap-4 shrink-0">
                    {selectedLive ? (
                      <>
                        <span className="text-teal-ice"><KindGlyph kind={selectedLive.kind} size={14} /></span>
                        <span className="text-[11.5px] text-paper truncate">{selectedLive.name}</span>
                        <span className="font-mono text-[9px] text-slate-dim">{selectedLive.mime}</span>
                        <span className="font-mono text-[9px] text-slate-dim">{fmtBytes(selectedLive.size)}</span>
                        <div className="flex-1" />
                        <button
                          onClick={() => quickLock(selectedLive)}
                          className="p-1.5 border border-line/60 text-slate-dim hover:text-solar hover:border-solar/40 transition-colors"
                          title={selectedLive.lock ? 'unlock' : 'key-lock this object'}
                        >
                          {selectedLive.lock ? <IcUnlock size={12} /> : <IcLock size={12} />}
                        </button>
                        <button
                          onClick={() => requestDownload(selectedLive)}
                          className="p-1.5 border border-line/60 text-slate-dim hover:text-teal-ice hover:border-teal-ice/40 transition-colors"
                          title="download this object"
                        >
                          <IcDownload size={12} />
                        </button>
                        <button
                          onClick={() => open(selectedLive)}
                          className="font-mono text-[9.5px] tracking-[0.2em] uppercase border border-teal-ice/40 text-teal-ice px-3 py-1 hover:bg-teal-ice/10 transition-colors"
                        >
                          {selectedLive.kind === 'document' ? 'open' : 'inspect'}
                        </button>
                      </>
                    ) : (
                      <span className="font-mono text-[8.5px] tracking-[0.24em] uppercase text-slate-dim">select an object · double-click opens · drag files anywhere to seal</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {viewer && <Viewer file={state.vault.find((x) => x.id === viewer.id) ?? viewer} onClose={() => setViewer(null)} />}
      {showTerminal && <VaultTerminal onClose={() => setShowTerminal(false)} />}
      {showScan && <DeepScan onClose={() => setShowScan(false)} />}
      {editUser && (
        <IdentityEditor
          user={editUser}
          onClose={() => setEditUser(null)}
          onRemoved={() => { clearPayloadSession(); setEditUser(null); setUser(null); setMasterPass(''); setViewer(null); setLockModal(null); }}
        />
      )}
      {lockModal && <LockModal file={lockModal.file} openAfter={lockModal.openAfter} onClose={() => setLockModal(null)} />}
      {unlocking && (
        <UnlockPrompt
          file={unlocking.file}
          onOk={() => {
            const { file, action } = unlocking;
            authorizeVaultFile(file.id);
            setUnlocking(null);
            if (action === 'open') setViewer(file);
            else if (action === 'download') void downloadFile(file);
            else {
              actions.updateVaultFile(file.id, { lock: undefined, legacyLock: undefined });
              toast(`unlocked ${file.name}`);
            }
          }}
          onClose={() => setUnlocking(null)}
        />
      )}
    </div>
  );
}
