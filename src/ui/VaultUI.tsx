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

import { sleep, videoEvent, coverCrop, clampFit, videoToFrames, processAvatar, wavBlob, imageBlob, videoBlob, synthPayload, downloadFile, kindOf } from './vault/helpers';
import { AvatarMedia, FrameCycler, Crossfade, Avatar, avatarKind, AvatarKindBadge, AvatarCropModal, AvatarPicker } from './vault/avatars';
import { VaultBackdrop, Gate } from './vault/gate';
import { VOID_DAYS, TheVoid } from './vault/void';
import { AtmosphereSynth } from './vault/atmosphere';
import { RUNNER_LABEL, ConsolePane, WebAppRun, JsRun, PyRun, PdfRun, ArchiveRun, IsoRun, RunView, SandboxLaunch, GravityGarden, IsoMount, extractEntry, CsvView, FitsView } from './vault/sandbox';
import { AudioPlayer, AdvancedVideoPlayer, CodeDocStudio, OtherView, Viewer } from './vault/viewers';
import { CATEGORIES, CAT_COLORS, HISTORY_CAP, TRASH_TTL_DAYS, WORDS, pwScore, pwTier, genKey, genPassphrase, ageDays, withHistory, HISTORY_LABELS, PulsarCode, NovaGlyph, GravityWellModal, parseCardExpiry, EXPIRY_KEY, sentinelIssues, SentinelPanel, KeyGenerator, b64url, b64urlDecode, copyScrubbed, prfDerive, StargateModal, StellarWillModal, CourierModal, ReceiveModal, RotateKeyModal, PasswordVault } from './vault/keyring';
import { IdentityEditor, LockModal, UnlockPrompt, Telemetry, ALLOC, VaultHome, VaultTerminal, DeepScan, SECTIONS } from './vault/shell';

export default function VaultUI({ onClose, closing }: { onClose: () => void; closing?: boolean }) {
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
    <div className={`vault-scope fixed inset-0 z-110 overlay-in overflow-hidden ${closing ? 'kamui-suck' : ''}`} style={{ background: 'rgba(3,5,11,0.34)' }}>
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

