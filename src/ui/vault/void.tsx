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

import { sleep, videoEvent, coverCrop, clampFit, videoToFrames, processAvatar, wavBlob, imageBlob, videoBlob, synthPayload, downloadFile, kindOf } from './helpers';
/* ============================ file system view =========================== */

export const VOID_DAYS = 30;

export function TheVoid() {
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

