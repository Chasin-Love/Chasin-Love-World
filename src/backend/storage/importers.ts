/**
 * The Gravity Well — rival-vault importer for the Key Ring.
 *
 * Parses exports from Bitwarden (CSV + unencrypted JSON), 1Password (CSV),
 * Chrome / Edge / Firefox / Safari (CSV), Proton Pass (CSV), KeePass(XC)
 * (CSV) and a best-effort generic CSV. Everything maps into PasswordRecord
 * with urls, notes, otpauth seeds and category inference. Detection is
 * header-driven; parsing is a proper quoted-CSV state machine.
 */

import type { PasswordRecord } from '../types';
import { buildOtpAuth } from './totp';

export type ImportSource =
  | 'bitwarden-csv' | 'bitwarden-json' | '1password-csv' | 'chrome-csv'
  | 'protonpass-csv' | 'keepass-csv' | 'generic-csv';

export const SOURCE_LABELS: Record<ImportSource, string> = {
  'bitwarden-csv': 'Bitwarden CSV',
  'bitwarden-json': 'Bitwarden JSON',
  '1password-csv': '1Password CSV',
  'chrome-csv': 'Chrome / Edge / Firefox CSV',
  'protonpass-csv': 'Proton Pass CSV',
  'keepass-csv': 'KeePass / KeePassXC CSV',
  'generic-csv': 'generic CSV',
};

export interface ImportResult {
  source: ImportSource;
  records: PasswordRecord[];
  skipped: number;   /* rows without a usable secret */
}

/* ------------------------------ CSV machine ------------------------------ */

/** RFC 4180-ish CSV parser: quoted fields, embedded commas & newlines, "" escapes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, ''); /* strip BOM */
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]/g, '');

/** Case/separator-insensitive header column finder. */
function col(headers: string[], ...names: string[]): number {
  const normalized = headers.map(norm);
  for (const n of names) {
    const idx = normalized.indexOf(norm(n));
    if (idx !== -1) return idx;
  }
  return -1;
}

function detectSource(headers: string[], text: string): ImportSource | null {
  const h = headers.map(norm);
  const has = (...names: string[]) => names.every((n) => h.includes(norm(n)));
  if (text.trimStart().startsWith('{') || text.trimStart().startsWith('[')) {
    try {
      JSON.parse(text);
      return 'bitwarden-json';
    } catch { return null; }
  }
  if (has('login_uri', 'login_username') || has('login_uri', 'login_password') || has('folder', 'login_totp')) return 'bitwarden-csv';
  if (has('title', 'url', 'username', 'password') && h.includes(norm('Title'))) return '1password-csv';
  if (has('name', 'url', 'username', 'password')) return 'chrome-csv';
  if (has('url', 'username', 'password') && h.includes(norm('name')) === false && h.includes(norm('note'))) return 'protonpass-csv';
  if (has('url', 'username', 'password')) return 'chrome-csv'; /* firefox */
  if (has('group', 'title', 'username', 'password') || has('account', 'login', 'password')) return 'keepass-csv';
  if (has('title', 'username', 'password') || has('name', 'username', 'password')) return 'generic-csv';
  return null;
}

/* --------------------------- category inference --------------------------- */

const CAT_HINTS: [RegExp, string][] = [
  [/bank|paypal|invest|trading|crypto|wallet|coin|finance|visa|mastercard|amex/i, 'finance'],
  [/wifi|router|network|ssid|hotspot/i, 'wifi'],
  [/mail|gmail|outlook|proton|email/i, 'site'],
  [/server|nas|ssh|vps|root|admin panel|router/i, 'device'],
];

function inferCategory(label: string, url: string, folder: string, existing?: string): string {
  if (existing && existing.trim()) return existing.trim().toLowerCase().slice(0, 24);
  const haystack = `${label} ${url}`;
  for (const [re, cat] of CAT_HINTS) if (re.test(haystack)) return cat;
  if (url.trim()) return 'site';
  if (folder) return 'app';
  return 'site';
}

/** KeePass folders like "Internet/Forums" → last segment. */
const lastSegment = (s: string) => s.split('/').filter(Boolean).pop() ?? '';

/* ------------------------------- normalizer ------------------------------ */

interface RawEntry {
  label: string; user: string; secret: string; url: string;
  notes: string; otp: string; folder: string; extra: string;
}

function toRecord(e: RawEntry, now: number): PasswordRecord | null {
  const label = (e.label || lastSegment(e.url) || e.user || '').trim();
  const secret = e.secret;
  if (!label && !secret) return null;
  if (!secret) return null; /* skip notes-only rows — count them as skipped */
  const rec: PasswordRecord = {
    id: `imp-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    label: label || 'unnamed star',
    user: e.user ?? '',
    secret,
    category: inferCategory(label, e.url, e.folder),
    notes: e.notes || undefined,
    updatedAt: now,
  };
  if (e.url.trim()) rec.urls = [e.url.trim()];
  if (e.otp.trim()) {
    rec.otpauth = /^otpauth:\/\//i.test(e.otp.trim())
      ? e.otp.trim()
      : buildOtpAuth(e.otp.trim(), label || 'imported', e.user || 'secret');
  }
  if (e.extra.trim()) {
    const kv = parseKeyValues(e.extra);
    if (kv.length) rec.fields = kv;
  }
  return rec;
}

/** Bitwarden "fields" column: "name: value\nname2: value2" (possibly quoted). */
function parseKeyValues(raw: string): { k: string; v: string }[] {
  return raw.split(/\r?\n/)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx <= 0) return null;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      return k && v ? { k, v } : null;
    })
    .filter((x): x is { k: string; v: string } => x !== null);
}

/* -------------------------------- parsers -------------------------------- */

function parseAnyCsv(text: string): { rows: string[][]; headers: string[] } {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('the file carries no rows');
  return { rows: rows.slice(1), headers: rows[0].map((x) => x.replace(/^"|"$/g, '')) };
}

function importCsvByHeader(text: string, now: number): { records: PasswordRecord[]; skipped: number; source: ImportSource } {
  const { rows, headers } = parseAnyCsv(text);
  const source = detectSource(headers, text);
  if (!source) throw new Error('unrecognized constellation — no known headers found');

  const pick = (...names: string[]) => {
    const i = col(headers, ...names);
    return i === -1 ? () => '' : (r: string[]) => (r[i] ?? '').trim();
  };
  const L = pick('name', 'title', 'account', 'login');
  const U = pick('login_username', 'username', 'email', 'login');
  const S = pick('login_password', 'password', 'pass');
  const W = pick('login_uri', 'url', 'website', 'uri');
  const N = pick('notes', 'note');
  const T = pick('login_totp', 'totp', 'otpauth');
  const F = pick('folder', 'group', 'collection');
  const X = pick('fields', 'extra');

  let skipped = 0;
  const records: PasswordRecord[] = [];
  for (const r of rows) {
    const rec = toRecord({ label: L(r), user: U(r), secret: S(r), url: W(r), notes: N(r), otp: T(r), folder: F(r), extra: X(r) }, now);
    if (rec) records.push(rec); else skipped++;
  }
  return { records, skipped, source };
}

interface BitwardenJsonItem {
  name?: string; notes?: string; folderId?: string; favorite?: boolean;
  login?: { username?: string; password?: string; totp?: string; uris?: { match?: unknown; uri?: string }[] };
  fields?: { name?: string; value?: string }[];
}
interface BitwardenJsonExport {
  encrypted?: boolean;
  folders?: { id: string; name: string }[];
  items?: BitwardenJsonItem[];
}

function importBitwardenJson(text: string, now: number): { records: PasswordRecord[]; skipped: number } {
  const data = JSON.parse(text) as BitwardenJsonExport;
  if (data.encrypted) throw new Error('this Bitwarden export is encrypted — re-export unencrypted (or with the web vault password option) and feed it to the well again');
  if (!Array.isArray(data.items)) throw new Error('no items found in the Bitwarden export');
  const folders = new Map<string, string>((data.folders ?? []).map((f) => [f.id, f.name]));
  let skipped = 0;
  const records: PasswordRecord[] = [];
  for (const item of data.items) {
    const secret = item.login?.password ?? '';
    if (!secret) { skipped++; continue; }
    const rec: PasswordRecord = {
      id: `imp-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      label: item.name || item.login?.username || 'unnamed star',
      user: item.login?.username ?? '',
      secret,
      category: inferCategory(item.name ?? '', item.login?.uris?.[0]?.uri ?? '', folders.get(item.folderId ?? '') ?? ''),
      notes: item.notes || undefined,
      updatedAt: now,
    };
    const uris = (item.login?.uris ?? []).map((u) => (u.uri ?? '').trim()).filter(Boolean);
    if (uris.length) rec.urls = uris;
    if (item.login?.totp) {
      rec.otpauth = /^otpauth:\/\//i.test(item.login.totp)
        ? item.login.totp
        : buildOtpAuth(item.login.totp, rec.label, item.login.username || 'secret');
    }
    const fields = (item.fields ?? []).filter((f) => f.name && f.value).map((f) => ({ k: f.name!, v: f.value! }));
    if (fields.length) rec.fields = fields;
    records.push(rec);
  }
  return { records, skipped };
}

/** Entry point — detect + parse any supported rival export. */
export function importVaultExport(filename: string, text: string): ImportResult {
  const now = Date.now();
  const isJson = /\.json$/i.test(filename) || text.trimStart().startsWith('{');
  if (isJson) {
    const { records, skipped } = importBitwardenJson(text, now);
    return { source: 'bitwarden-json', records, skipped };
  }
  const { records, skipped, source } = importCsvByHeader(text, now);
  return { source, records, skipped };
}

/** Drop records whose (label+user) or (label+url) already exist in the ring. */
export function dedupeImport(incoming: PasswordRecord[], existing: PasswordRecord[]): { fresh: PasswordRecord[]; duplicates: number } {
  const key = (r: Pick<PasswordRecord, 'label' | 'user' | 'urls'>) =>
    `${r.label.trim().toLowerCase()}|${(r.user ?? '').trim().toLowerCase()}|${(r.urls?.[0] ?? '').replace(/\/+$/, '').toLowerCase()}`;
  const seen = new Set(existing.filter((r) => !r.deletedAt).map(key));
  const fresh: PasswordRecord[] = [];
  let duplicates = 0;
  for (const r of incoming) {
    const k = key(r);
    if (seen.has(k)) { duplicates++; continue; }
    seen.add(k);
    fresh.push(r);
  }
  return { fresh, duplicates };
}
