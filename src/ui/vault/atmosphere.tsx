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
/* ================================ viewers ================================ */

/* a small playable instrument — what "atmosphere-synth" actually runs */
export function AtmosphereSynth({ name, onExit }: { name: string; onExit: () => void }) {
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

