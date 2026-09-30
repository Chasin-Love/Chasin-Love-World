import { STORAGE_KEYS } from '../../platform/storageKeys';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { actions, newId } from '../../state';
import { prettyPrint } from '../format';
import type { MonacoHandle } from '../vault/MonacoCodeEditor';

/* the real editor (VS Code engine) — loaded in its own chunk on first open */
const MonacoCodeEditor = lazy(() =>
  import('./MonacoCodeEditor').then((m) => ({ default: m.MonacoCodeEditor })),
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
  readArchiveListing, resolveBlob, runJavaScript, runPython, unzipAll,
  parseIsoBlob, extractIsoFile, flattenIsoRecords,
  type ImportSource, type CometPacket, type RingEnvelope, type RunnerKind, type IsoParseResult, type IsoDirectoryRecord, type ZipEntry,
} from '../../vault';
import type { AvatarFit, FileVersion, PasswordField, PasswordRecord, VaultFile, VfsNode, VaultKind, VaultSecrets, VaultUser } from '../../domain/vault';
import type { AuditEntry } from '../../domain/universe';
import {
  AudioChip, IcClose, IcCopy, IcDownload, IcEdit, IcEye, IcFolder, IcLock, IcMove, IcPlus,
  IcScan, IcSearch, IcTerminal, IcTrash, IcUnlock, IcUser, useUniverse,
} from '../bits';
import { toast } from '../toast';
import { readAsDataURL } from '../lib';
import { FileManager } from '../FileManager';
import { HexInspector, KindGlyph, TilePreview, WaveStripLocal, seedRnd } from '../VaultBits';

/* ================================ helpers ================================ */

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const videoEvent = (v: HTMLVideoElement, ev: string) => new Promise<void>((res) => {
  const h = () => { v.removeEventListener(ev, h); res(); };
  v.addEventListener(ev, h);
});

/* avatar framing math */
export function coverCrop(w: number, h: number, s: number, fit: AvatarFit) {
  const sc = Math.max(s / w, s / h) * fit.zoom;
  const dw = w * sc, dh = h * sc;
  return { dw, dh, dx: (s - dw) / 2 + fit.px * s, dy: (s - dh) / 2 + fit.py * s };
}
export function clampFit(fit: AvatarFit, w: number, h: number): AvatarFit {
  const zoom = Math.min(3, Math.max(1, fit.zoom));
  const sc = Math.max(1 / w, 1 / h) * zoom;
  const rw = w * sc, rh = h * sc;
  const mx = Math.max(0, (rw - 1) / 2), my = Math.max(0, (rh - 1) / 2);
  return { zoom, px: Math.min(mx, Math.max(-mx, fit.px)), py: Math.min(my, Math.max(-my, fit.py)) };
}

/* decode a video into frames at the chosen framing — loops forever, plays everywhere */
export async function videoToFrames(file: File, fit: AvatarFit): Promise<{ dataUrl: string | null; frames: string[]; fps: number; note: string }> {
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

export async function processAvatar(file: File, fit?: AvatarFit): Promise<{ dataUrl: string | null; frames?: string[]; fps?: number; note: string }> {
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

export function wavBlob(seconds = 1.3, freq = 320): Blob {
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

export function imageBlob(name: string): Promise<Blob | null> {
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

export async function videoBlob(): Promise<Blob | null> {
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

export async function synthPayload(f: VaultFile): Promise<Blob | null> {
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

export async function downloadFile(f: VaultFile) {
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

export function kindOf(name: string, mime: string): VaultKind {
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

