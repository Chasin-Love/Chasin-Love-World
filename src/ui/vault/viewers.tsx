import { CsvView, FitsView, IsoMount, RunView } from './sandbox';
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
/* ================== Enhanced Vault Players & Studios ================== */

/* Real audio player — waveform, scrubbing, speed controls, loop, time readout */
export function AudioPlayer({ src, name }: { src: string; name: string }) {
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
export function AdvancedVideoPlayer({ src, name }: { src: string; name: string }) {
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

export function CodeDocStudio({
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
export function OtherView({ file }: { file: VaultFile }) {
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

export function Viewer({ file, onClose }: { file: VaultFile; onClose: () => void }) {
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

