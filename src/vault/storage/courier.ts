import { STORAGE_KEYS } from '../../platform/storageKeys';
/**
 * Comet Courier & Stellar Will — offline E2E sharing and legacy release.
 *
 * Comet Courier: chosen credentials are sealed into a self-contained .comet
 * file under a random one-time key. The file travels one way; the "starlight
 * key" travels another. Burn-after-read is enforced on the receiving side by
 * a local consumed-ledger — the file alone is useless without its key.
 *
 * Stellar Will: a custodian envelope wraps the ring key under a random
 * custodian key shown exactly once at arming time. If the vault stays dark
 * past the armed threshold, the custodian key opens it.
 */

import type { PasswordRecord } from '../types';
import { b64dec, b64enc } from './crypto';

export const COMET_TTL_DAYS = 7;

export interface CometPacket {
  v: 1;
  kind: 'eventide-comet';
  id: string;
  iv: string;
  data: string;
  count: number;
  note?: string;
  createdAt: number;
  expiresAt: number;
  burn: boolean;
}

async function aesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as unknown as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Seal chosen records into a comet packet + its one-time starlight key. */
export async function sealComet(
  records: PasswordRecord[],
  note?: string
): Promise<{ packet: CometPacket; starlightKey: string }> {
  if (!records.length) throw new Error('a comet needs at least one credential');
  const key = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await aesKey(key);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    k,
    new TextEncoder().encode(JSON.stringify(records))
  );
  const now = Date.now();
  const ivB64 = b64enc(iv.buffer as ArrayBuffer);
  const dataB64 = b64enc(ct);
  /* packet id — hash of the ciphertext, so identical payloads still differ */
  const idDig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ivB64}:${dataB64}`) as BufferSource);
  const id = [...new Uint8Array(idDig)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  const packet: CometPacket = {
    v: 1,
    kind: 'eventide-comet',
    id,
    iv: ivB64,
    data: dataB64,
    count: records.length,
    note: note?.trim() || undefined,
    createdAt: now,
    expiresAt: now + COMET_TTL_DAYS * 86400000,
    burn: true,
  };
  return { packet, starlightKey: b64enc(key.buffer as ArrayBuffer) };
}

type CometOpenResult =
  | { ok: true; records: PasswordRecord[]; packet: CometPacket }
  | { ok: false; reason: 'expired' | 'burned' | 'bad-key' | 'bad-file'; message: string };

const BURN_LEDGER = STORAGE_KEYS.cometBurned;

function burned(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(BURN_LEDGER) ?? '[]') as string[]); }
  catch { return new Set(); }
}

function markBurned(id: string): void {
  const set = burned();
  set.add(id);
  localStorage.setItem(BURN_LEDGER, JSON.stringify([...set]));
}

/** Open a comet file + starlight key. Enforces expiry and burn-after-read. */
export async function openComet(file: File, starlightKey: string): Promise<CometOpenResult> {
  let packet: CometPacket;
  try {
    const parsed = JSON.parse(await file.text()) as CometPacket;
    if (parsed.kind !== 'eventide-comet' || parsed.v !== 1) throw new Error('not a comet');
    packet = parsed;
  } catch {
    return { ok: false, reason: 'bad-file', message: 'that is not a comet — expected an eventide .comet file' };
  }
  if (Date.now() > packet.expiresAt) {
    return { ok: false, reason: 'expired', message: 'the comet burned out in flight — its 7-day tail is gone' };
  }
  if (packet.burn && burned().has(packet.id)) {
    return { ok: false, reason: 'burned', message: 'this comet already burned — one view, as promised' };
  }
  try {
    const key = b64dec(starlightKey.trim());
    const k = await aesKey(key);
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64dec(packet.iv) as BufferSource },
      k,
      b64dec(packet.data)
    );
    const records = JSON.parse(new TextDecoder().decode(pt)) as PasswordRecord[];
    if (!Array.isArray(records) || !records.length) throw new Error('empty');
    if (packet.burn) markBurned(packet.id);
    return { ok: true, records, packet };
  } catch {
    return { ok: false, reason: 'bad-key', message: 'the starlight key does not fit this comet' };
  }
}

/** Generate a stellar-will custodian key (shown exactly once at arming). */
export function genCustodianKey(): string {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return b64enc(raw.buffer as ArrayBuffer);
}
