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
  pulseVault, readArchiveListing, resolveBlob, runJavaScript, runPython, unzipAll,
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

import { sleep, videoEvent, coverCrop, clampFit, videoToFrames, processAvatar, wavBlob, imageBlob, videoBlob, synthPayload, downloadFile, kindOf } from './helpers';
/* ================================ key ring ================================ */

export const CATEGORIES = ['site', 'app', 'finance', 'wifi', 'device', 'note'] as const;
export const CAT_COLORS: Record<string, string> = {
  site: '#7fc4e8', app: '#9fd8a8', finance: '#f2c178', wifi: '#b49ae8', device: '#e0785a', note: '#8b93a8',
};
export const HISTORY_CAP = 8;
export const TRASH_TTL_DAYS = 30;

export const WORDS = [
  'orbit', 'comet', 'lunar', 'solar', 'nebula', 'quasar', 'pulsar', 'zenith', 'aurora', 'photon',
  'eclipse', 'gravity', 'horizon', 'ion', 'meteor', 'nova', 'plasma', 'radial', 'signal', 'tides',
  'umbra', 'vector', 'vertex', 'wave', 'anchor', 'basalt', 'cipher', 'drift', 'ember', 'fathom',
];

export function pwScore(s: string): number {
  if (!s) return 0;
  let sc = Math.min(4, s.length / 6);
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) sc += 1;
  if (/\d/.test(s)) sc += 1;
  if (/[^a-zA-Z0-9]/.test(s)) sc += 1.5;
  if (s.length >= 16) sc += 1;
  return Math.min(8, sc);
}
export function pwTier(sc: number): { label: string; color: string } {
  if (sc < 2) return { label: 'fragile', color: '#e06a5a' };
  if (sc < 4) return { label: 'fair', color: '#e8b25c' };
  if (sc < 6) return { label: 'strong', color: '#9fd8a8' };
  return { label: 'eventide-grade', color: '#6fc2b4' };
}
export function genKey(len: number, opts: { upper: boolean; digits: boolean; symbols: boolean }): string {
  let pool = 'abcdefghijkmnopqrstuvwxyz';
  if (opts.upper) pool += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  if (opts.digits) pool += '23456789';
  if (opts.symbols) pool += '!@#$%^&*_-+=?';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => pool[n % pool.length]).join('');
}
export function genPassphrase(words: number): string {
  const arr = new Uint32Array(words * 2);
  crypto.getRandomValues(arr);
  const out: string[] = [];
  for (let i = 0; i < words; i++) {
    const w = WORDS[arr[i * 2] % WORDS.length];
    out.push(i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1));
  }
  return out.join('-') + (arr[arr.length - 1] % 90 + 10);
}
export const ageDays = (t: number) => Math.floor((Date.now() - t) / 86400000);

/** Push a replaced secret into history (newest last, capped). */
export function withHistory(rec: PasswordRecord, replacedSecret: string): PasswordRecord {
  if (!replacedSecret || replacedSecret === rec.secret) return rec;
  const entry = { secret: replacedSecret, changedAt: Date.now() };
  const history = [...(rec.history ?? []), entry].slice(-HISTORY_CAP);
  return { ...rec, history };
}

export const HISTORY_LABELS = ['janitor', 'orbiter', 'satellite', 'moon', 'planet', 'star', 'giant', 'quasar'];

/* ------------------------------- pulsar code ------------------------------ */

/** Live TOTP code with a countdown ring — the pulsar's light-curve. */
export function PulsarCode({ otpauth, onCopy }: { otpauth: string; onCopy: (code: string, issuer: string) => void }) {
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

export const NovaGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" className="shrink-0" role="img" aria-label="nova — compromised secret">
    <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#e06a5a">
      <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
    </path>
  </svg>
);

/* ------------------------------ gravity well ------------------------------ */

export function GravityWellModal({ existing, onClose, onIngest }: {
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
export function parseCardExpiry(v: string): Date | null {
  const m = v.trim().match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;
  const yearRaw = Number(m[2]);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  return new Date(year, month, 0, 23, 59, 59); /* end of expiry month */
}

export const EXPIRY_KEY = /^(exp|expiry|expires|expiration|valid|valid until|card expiry|expires on|good thru|good through)/i;

/** Itemized Watchtower-grade audit of the ring, derived from live records. */
export function sentinelIssues(records: PasswordRecord[]): SentinelIssue[] {
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

export function SentinelPanel({ records, onScan, scanning }: { records: PasswordRecord[]; onScan: () => void; scanning: boolean }) {
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

export function KeyGenerator({ onUse }: { onUse: (k: string) => void }) {
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

export const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const b64urlDecode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** Module-level clipboard copy with the standard 20-second scrub. */
export const copyScrubbed = (text: string, what: string) => {
  void navigator.clipboard?.writeText(text).then(() => {
    toast(`${what} copied — clipboard scrubs in 20s`);
    setTimeout(() => { void navigator.clipboard?.writeText('·').catch(() => undefined); }, 20000);
  });
};

/** Ask the authenticator to evaluate the PRF extension for a salt → b64 secret. */
export async function prfDerive(credIdB64: string, prfSaltB64: string): Promise<string> {
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

export function StargateModal({ ringKey, onAttuned, onClose }: {
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

export function StellarWillModal({ mode, secrets, ringKey, onArm, onClaim, onClose }: {
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

export function CourierModal({ records, onSend, onClose }: {
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

export function ReceiveModal({ onIngest, onClose }: {
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

export function RotateKeyModal({ secrets, ringKey, onRewound, onClose }: {
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

export function PasswordVault({ masterPass, keyName }: { masterPass: string; keyName: string }) {
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

