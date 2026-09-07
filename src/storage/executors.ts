/**
 * Vault Execution Engine.
 * Turns stored payloads into live processes inside the browser sandbox:
 *   - HTML/CSS/JS apps & games  → bundled and run in an isolated iframe
 *   - JavaScript                → Web Worker with a piped console
 *   - Python                    → Pyodide runtime (loaded on demand)
 *   - PDF                       → embedded native viewer
 *   - ZIP archives              → real listing, extraction and app launch
 * Everything runs client-side; nothing is ever uploaded anywhere.
 */

import type { VaultFile } from '../types';
import { getPayload } from './indexedDB';
import { readZipEntries, extractZipEntry, unzipAll } from './zip';

export type RunnerKind = 'web-app' | 'javascript' | 'python' | 'pdf' | 'archive';

export function detectRunner(file: VaultFile): RunnerKind | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf' || file.mime === 'application/pdf') return 'pdf';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || file.kind === 'archive') return 'archive';
  if (ext === 'html' || ext === 'htm' || file.mime === 'text/html') return 'web-app';
  if (ext === 'js' || ext === 'mjs' || file.mime === 'text/javascript' || file.mime === 'application/javascript') return 'javascript';
  if (ext === 'py' || file.mime === 'text/x-python') return 'python';
  return null;
}

export function canExecute(file: VaultFile): boolean {
  return detectRunner(file) !== null;
}

/** Materializes the real bytes behind a vault file (OPFS/IndexedDB payload, inline content or data URL). */
export async function resolveBlob(file: VaultFile): Promise<Blob | null> {
  if (file.payloadRef) {
    try {
      const blob = await getPayload(file.payloadRef);
      if (blob) return blob;
    } catch { /* fall through */ }
  }
  if (file.content) {
    if (file.content.startsWith('data:')) {
      try {
        const res = await fetch(file.content);
        return await res.blob();
      } catch { return null; }
    }
    return new Blob([file.content], { type: file.mime || 'text/plain' });
  }
  return null;
}

/* ------------------------- web app bundler ------------------------- */

function normPath(p: string): string {
  const parts: string[] = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function resolveRef(ref: string, baseDir: string): string {
  const clean = ref.split('?')[0].split('#')[0];
  if (/^[a-z]+:/i.test(clean) || clean.startsWith('//')) return '';
  return baseDir ? normPath(`${baseDir}/${clean}`) : normPath(clean);
}

/**
 * Builds a self-contained blob URL for an HTML app: every relative src/href
 * that matches a sibling vault payload is rewritten to a live blob URL, and
 * an import map lets ES modules find their sibling scripts.
 */
export async function bundleWebApp(entry: Blob, siblings: Map<string, Blob>): Promise<string> {
  let html: string;
  try {
    html = await entry.text();
  } catch {
    return URL.createObjectURL(entry);
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const urlMap = new Map<string, string>();
  const objUrl = (key: string, blob: Blob) => {
    if (!urlMap.has(key)) urlMap.set(key, URL.createObjectURL(blob));
    return urlMap.get(key)!;
  };

  const rewrite = (el: Element, attr: string, baseDir: string) => {
    const ref = el.getAttribute(attr);
    if (!ref) return;
    const resolved = resolveRef(ref, baseDir);
    if (!resolved) return;
    const blob = siblings.get(resolved) ?? siblings.get(normPath(resolved).split('/').pop() ?? '');
    if (blob) el.setAttribute(attr, objUrl(resolved, blob));
  };

  const baseEl = doc.querySelector('base[href]');
  const baseDir = baseEl ? resolveRef(baseEl.getAttribute('href')!, '') : '';

  doc.querySelectorAll('[src]').forEach((el) => rewrite(el, 'src', baseDir));
  doc.querySelectorAll('link[href], a[href], embed[href]').forEach((el) => rewrite(el, 'href', baseDir));

  /* import map so ES-module apps can `import x from './lib.js'` */
  const scriptTags = Array.from(doc.querySelectorAll('script[type="module"][src]'));
  const modules = new Map<string, string>();
  siblings.forEach((blob, path) => {
    if (/\.(m?js|cjs)$/i.test(path)) modules.set(path, objUrl(path, blob));
  });
  if (modules.size && scriptTags.length) {
    const im = doc.createElement('script');
    im.type = 'importmap';
    const imports: Record<string, string> = {};
    modules.forEach((url, path) => {
      imports[`./${path.split('/').pop()}`] = url;
      imports[path] = url;
    });
    im.textContent = JSON.stringify({ imports });
    doc.head.prepend(im);
  }

  return URL.createObjectURL(new Blob([`<!DOCTYPE html>\n${doc.documentElement.outerHTML}`], { type: 'text/html' }));
}

/** Finds the best entry HTML inside an extracted archive ('index.html' preferred, shallowest wins). */
export function pickAppEntry(paths: string[]): string | null {
  const files = paths.filter((p) => /\.html?$/i.test(p));
  if (!files.length) return null;
  const index = files.filter((p) => /(^|\/)index\.html?$/i.test(p));
  const pool = index.length ? index : files;
  return pool.sort((a, b) => a.split('/').length - b.split('/').length)[0];
}

/* ------------------------- javascript worker ------------------------- */

export interface JsRunHandle {
  worker: Worker;
  stop: () => void;
}

export type LogSink = (line: string, level: 'info' | 'warn' | 'error') => void;

const WORKER_SHIM = `
const __send = (lvl, args) => self.postMessage({ __vault: true, level: lvl, text: args.map(a => {
  try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
}).join(' ') });
self.console = {
  log:   (...a) => __send('info', a),  info:  (...a) => __send('info', a),
  debug: (...a) => __send('info', a),  warn:  (...a) => __send('warn', a),
  error: (...a) => __send('error', a), table: (...a) => __send('info', a),
};
self.onerror = (m) => { self.postMessage({ __vault: true, level: 'error', text: 'uncaught: ' + m }); return false; };
self.onunhandledrejection = (e) => self.postMessage({ __vault: true, level: 'error', text: 'unhandled rejection: ' + e.reason });
`;

/** Runs a JS payload in a dedicated Web Worker; returns a handle to terminate it. */
export function runJavaScript(code: string, onLog: LogSink): JsRunHandle {
  const blob = new Blob([WORKER_SHIM, '\n', code], { type: 'text/javascript' });
  const worker = new Worker(URL.createObjectURL(blob));
  worker.onmessage = (e: MessageEvent) => {
    if (e.data && e.data.__vault) onLog(e.data.text, e.data.level);
    else onLog(typeof e.data === 'string' ? e.data : JSON.stringify(e.data), 'info');
  };
  worker.onerror = (e) => onLog(`worker fault: ${e.message}`, 'error');
  return { worker, stop: () => worker.terminate() };
}

/* ------------------------- python (pyodide) ------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
let pyodidePromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}

/**
 * Boots the Pyodide runtime once (fetched from the jsDelivr CDN on first use —
 * needs internet the first time; afterwards it is cached by the browser).
 */
export async function ensurePython(onStatus: LogSink): Promise<any> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    onStatus('fetching python runtime (pyodide) · first boot downloads ~10 MB…', 'info');
    const version = 'v0.26.4';
    const base = `https://cdn.jsdelivr.net/pyodide/${version}/full/`;
    await loadScript(`${base}pyodide.js`);
    if (typeof (window as any).loadPyodide !== 'function') throw new Error('pyodide loader unavailable');
    const py = await (window as any).loadPyodide({ indexURL: base });
    onStatus('python runtime online · CPython 3.12 (wasm)', 'info');
    return py;
  })().catch((err) => {
    pyodidePromise = null;
    throw err;
  });
  return pyodidePromise;
}

export function pythonBooting(): boolean {
  return pyodidePromise !== null;
}

/** Runs python source, streaming stdout/stderr into the sink. */
export async function runPython(code: string, onLog: LogSink): Promise<void> {
  const py = await ensurePython(onLog);
  py.setStdout({ batched: (s: string) => onLog(s, 'info') });
  py.setStderr({ batched: (s: string) => onLog(s, 'warn') });
  try {
    await py.runPythonAsync(code);
  } catch (err) {
    onLog(String(err), 'error');
  }
}

/* ------------------------- archive helpers ------------------------- */

export { readZipEntries, extractZipEntry, unzipAll };

export async function readArchiveListing(blob: Blob): Promise<import('./zip').ZipEntry[]> {
  const buf = await blob.arrayBuffer();
  return readZipEntries(buf);
}

/** Extracts one entry as a Blob (for download or import into the vault). */
export async function extractArchiveEntry(blob: Blob, entry: import('./zip').ZipEntry): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  return extractZipEntry(buf, entry);
}

/* ------------------------- engine bridge ------------------------- */

/** Signals the 3D universe that the Vault was used — the black hole reacts. */
export function pulseVault(intensity = 1): void {
  try {
    window.dispatchEvent(new CustomEvent('eventide-vault-pulse', { detail: { intensity } }));
  } catch { /* engine not mounted — harmless */ }
}
