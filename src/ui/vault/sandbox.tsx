import { AtmosphereSynth } from './atmosphere';
import { lazy, useEffect, useMemo, useRef, useState } from 'react';
import { actions, newId } from '../../state';

/* the real editor (VS Code engine) — loaded in its own chunk on first open */
const MonacoCodeEditor = lazy(() =>
  import('./MonacoCodeEditor').then((m) => ({ default: m.MonacoCodeEditor })),
);
import {
  
  
  
  
  
  
  
  fmtBytes, 
  efsChecksumOf, efsPathString, EFS_ROOT,
  getPayload, putPayload,
  bundleWebApp, canExecute, detectRunner, extractArchiveEntry, pickAppEntry,
  readArchiveListing, resolveBlob, runJavaScript, runPython, unzipAll,
  parseIsoBlob, extractIsoFile, flattenIsoRecords,
  type RunnerKind, type IsoParseResult, type IsoDirectoryRecord, type ZipEntry,
} from '../../vault';
import type { VaultFile } from '../../domain/vault';
import {
  IcDownload, 
  useUniverse,
} from '../bits';
import { toast } from '../toast';
import { KindGlyph, seedRnd } from '../VaultBits';

import { sleep, downloadFile, kindOf } from './helpers';
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
      if (runId.current === id) { push('process finished', 'sys'); }
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
export function RunView({ file }: { file: VaultFile }) {
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

export function IsoMount({ name }: { name: VaultFile['name'] }) {
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

export function CsvView({ content }: { content: string }) {
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

export function FitsView({ name }: { name: string }) {
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

