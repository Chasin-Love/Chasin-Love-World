/**
 * WebCrypto Vault Cryptography Engine
 * Provides Argon2id / PBKDF2 key derivation, AES-GCM 256-bit payload
 * encryption/decryption, verifier generation, and SHA-256 digesting.
 *
 * New seals use Argon2id (memory-hard, OWASP-preferred); legacy PBKDF2
 * payloads remain readable and are re-sealed on the next modification.
 */

import { argon2id } from 'hash-wasm';
import type { PasswordRecord, RingEnvelope, VaultFile, VaultSecrets } from '../types';

export const KDF_TARGET_ROUNDS = 310000;
export const KDF_LEGACY_ROUNDS = 90000;
const KDF_LEGACY_RECORD_ROUNDS = 120000;
/** OWASP 2026 floor for PBKDF2-SHA256 when Argon2id cannot be used */
const KDF_PBKDF2_FLOOR = 600000;

type KdfSpec =
  | { type: 'argon2id'; mem: number; iters: number }
  | { type: 'pbkdf2'; rounds: number };

/** Default seal: Argon2id 64 MiB × 3 passes (Bitwarden-class, OWASP-preferred) */
const ARGON2ID_SPEC: KdfSpec = { type: 'argon2id', mem: 64, iters: 3 };

export const b64enc = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

export const b64dec = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveAesKey(spec: KdfSpec, passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (spec.type === 'argon2id') {
    const raw = await argon2id({
      password: passphrase,
      salt,
      parallelism: 1,
      iterations: spec.iters,
      memorySize: spec.mem,
      hashLength: 32,
      outputType: 'binary',
    });
    return crypto.subtle.importKey('raw', raw as unknown as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: spec.rounds, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptRecords(
  passphrase: string,
  records: PasswordRecord[],
  spec: KdfSpec = ARGON2ID_SPEC
): Promise<VaultSecrets> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(spec, passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(records))
  );
  const secrets: VaultSecrets = {
    salt: b64enc(salt.buffer as ArrayBuffer),
    iv: b64enc(iv.buffer as ArrayBuffer),
    data: b64enc(ct),
  };
  if (spec.type === 'argon2id') {
    secrets.kdf = 'argon2id';
    secrets.mem = spec.mem;
    secrets.iters = spec.iters;
  } else {
    secrets.kdf = 'pbkdf2';
    secrets.rounds = spec.rounds;
  }
  return secrets;
}

export async function decryptRecords(
  passphrase: string,
  secrets: VaultSecrets
): Promise<PasswordRecord[]> {
  if (!secrets.salt) throw new Error('legacy seal carries no salt');
  const salt = b64dec(secrets.salt);
  const spec: KdfSpec = secrets.kdf === 'argon2id'
    ? { type: 'argon2id', mem: secrets.mem ?? 64, iters: secrets.iters ?? 3 }
    : { type: 'pbkdf2', rounds: secrets.rounds ?? KDF_LEGACY_RECORD_ROUNDS };
  const key = await deriveAesKey(spec, passphrase, salt);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64dec(secrets.iv) as BufferSource },
    key,
    b64dec(secrets.data)
  );
  return JSON.parse(new TextDecoder().decode(pt)) as PasswordRecord[];
}

/** True when a stored seal meets the current hardening bar (Argon2id, or PBKDF2 ≥ 600k). */
export function isSealHardened(secrets: VaultSecrets | null): boolean {
  if (!secrets) return true; /* an empty ring has nothing to harden */
  if (secrets.version === 2) return true;
  if (secrets.kdf === 'argon2id') return true;
  return (secrets.rounds ?? 0) >= KDF_PBKDF2_FLOOR;
}

/* --------------------------- v2 envelope sealing -------------------------- */
/* The record payload is sealed under a random 256-bit ring key (raw AES-GCM —
   fast saves). Envelopes wrap the ring key under a KDF-derived key: the master
   passphrase (+optional keyfile), a WebAuthn PRF credential, or the stellar
   will's custodian key. Legacy v1 payloads stay readable for migration.      */

const AES_RAW: Algorithm = { name: 'AES-GCM' };

async function importRingKey(ringKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', ringKey as unknown as BufferSource, AES_RAW, false, ['encrypt', 'decrypt']);
}

/** KDF-derive an AES key from a high/low-entropy secret (passphrase, PRF output, custodian key). */
async function deriveEnvelopeKey(
  secret: string,
  salt: Uint8Array,
  spec: KdfSpec
): Promise<CryptoKey> {
  return deriveAesKey(spec, secret, salt);
}

/** Wrap the ring key under a derived envelope key. */
export async function wrapRingKey(
  ringKey: Uint8Array,
  secret: string,
  kind: RingEnvelope['kind'] = 'master',
  extra: Partial<RingEnvelope> = {},
  spec: KdfSpec = ARGON2ID_SPEC
): Promise<RingEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEnvelopeKey(secret, salt, spec);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ringKey as unknown as BufferSource
  );
  const env: RingEnvelope = {
    salt: b64enc(salt.buffer as ArrayBuffer),
    iv: b64enc(iv.buffer as ArrayBuffer),
    data: b64enc(ct),
    kind,
    createdAt: Date.now(),
    ...extra,
  };
  if (spec.type === 'argon2id') { env.kdf = 'argon2id'; env.mem = spec.mem; env.iters = spec.iters; }
  else { env.kdf = 'pbkdf2'; env.rounds = spec.rounds; }
  return env;
}

/** Unwrap the ring key from an envelope. Throws on the wrong secret. */
export async function unwrapRingKey(
  envelope: RingEnvelope,
  secret: string
): Promise<Uint8Array> {
  const salt = b64dec(envelope.salt);
  const spec: KdfSpec = envelope.kdf === 'argon2id'
    ? { type: 'argon2id', mem: envelope.mem ?? 64, iters: envelope.iters ?? 3 }
    : { type: 'pbkdf2', rounds: envelope.rounds ?? KDF_LEGACY_RECORD_ROUNDS };
  const key = await deriveEnvelopeKey(secret, salt, spec);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64dec(envelope.iv) as BufferSource },
    key,
    b64dec(envelope.data)
  );
  return new Uint8Array(pt);
}

/** Effective master secret when a keyfile is bound: `passphrase::kfHash`. */
export const keyfileSecret = (passphrase: string, kfHash: string) => `${passphrase}::${kfHash}`;

/** Fast fingerprint used to verify a chosen keyfile before any KDF runs. */
export async function keyfileFingerprint(file: File): Promise<{ hash: string; fp: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dig = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  const hash = [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const fpDig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hash) as BufferSource);
  const fp = [...new Uint8Array(fpDig)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  return { hash, fp };
}

/** Seal the record payload under the ring key (fast — no KDF). */
export async function sealRecords(
  records: PasswordRecord[],
  ringKey: Uint8Array
): Promise<{ iv: string; data: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importRingKey(ringKey);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(records))
  );
  return { iv: b64enc(iv.buffer as ArrayBuffer), data: b64enc(ct) };
}

/** Open the record payload with a ring key. */
export async function openRing(
  secrets: VaultSecrets,
  ringKey: Uint8Array
): Promise<PasswordRecord[]> {
  const key = await importRingKey(ringKey);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64dec(secrets.iv) as BufferSource },
    key,
    b64dec(secrets.data)
  );
  return JSON.parse(new TextDecoder().decode(pt)) as PasswordRecord[];
}

interface BuildRingOptions {
  keyfileHash?: string;    /* binds the master envelope to a keyfile */
  custodianKey?: string;   /* arms the stellar will */
  months?: number;         /* custodian darkness threshold */
}

/** Build a fresh v2 vault: random ring key + master envelope (+optional will). */
export async function buildRingSecrets(
  passphrase: string,
  records: PasswordRecord[],
  opts: BuildRingOptions = {}
): Promise<VaultSecrets> {
  const ringKey = crypto.getRandomValues(new Uint8Array(32));
  const payload = await sealRecords(records, ringKey);
  const envelopes: RingEnvelope[] = [];
  if (opts.keyfileHash) {
    const fpDig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(opts.keyfileHash) as BufferSource);
    const fp = [...new Uint8Array(fpDig)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
    envelopes.push(await wrapRingKey(ringKey, keyfileSecret(passphrase, opts.keyfileHash), 'master', { fp }));
  } else {
    envelopes.push(await wrapRingKey(ringKey, passphrase, 'master'));
  }
  if (opts.custodianKey) {
    envelopes.push(await wrapRingKey(ringKey, opts.custodianKey, 'custodian', {
      armedAt: Date.now(),
      months: opts.months ?? 6,
    }));
  }
  return { version: 2, ...payload, envelopes, lastOpenedAt: Date.now() };
}

/** Rotate the master envelope in place (keeps the same ring key + payload). */
export async function rewrapMasterEnvelope(
  secrets: VaultSecrets,
  ringKey: Uint8Array,
  passphrase: string,
  keyfileHash?: string
): Promise<VaultSecrets> {
  const envelopes = (secrets.envelopes ?? []).filter((e) => e.kind !== 'master');
  if (keyfileHash) {
    const fpDig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyfileHash) as BufferSource);
    const fp = [...new Uint8Array(fpDig)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
    envelopes.unshift(await wrapRingKey(ringKey, keyfileSecret(passphrase, keyfileHash), 'master', { fp }));
  } else {
    envelopes.unshift(await wrapRingKey(ringKey, passphrase, 'master'));
  }
  return { ...secrets, version: 2, envelopes };
}

/** Legacy PBKDF2 derivation — still used by the identity payload session. */
async function deriveKey(
  passphrase: string,
  salt: BufferSource,
  rounds: number
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: rounds, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function makeVerifier(
  passphrase: string,
  rounds = KDF_TARGET_ROUNDS
): Promise<{ salt: string; verifier: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: rounds, hash: 'SHA-256' },
    base,
    256
  );
  return {
    salt: b64enc(salt.buffer as ArrayBuffer),
    verifier: b64enc(bits),
  };
}

export async function checkVerifier(
  passphrase: string,
  saltB64: string,
  verifier: string,
  rounds = KDF_TARGET_ROUNDS
): Promise<boolean> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: b64dec(saltB64) as BufferSource, iterations: rounds, hash: 'SHA-256' },
    base,
    256
  );
  return b64enc(bits) === verifier;
}

let payloadSessionKey: CryptoKey | null = null;
const authorizedVaultFiles = new Set<string>();
const PAYLOAD_MAGIC = new TextEncoder().encode('EVENTIDE-PAYLOAD-V1\\n');
const PAYLOAD_ENVELOPE_TYPE = 'application/x-eventide-encrypted';

/** Derive an in-memory payload key for the currently authenticated identity. */
export async function unlockPayloadSession(
  passphrase: string,
  saltB64: string,
  rounds = KDF_TARGET_ROUNDS,
): Promise<void> {
  payloadSessionKey = await deriveKey(passphrase, b64dec(saltB64), rounds);
  authorizedVaultFiles.clear();
}

/** Drop the derived key and every per-object unlock grant. */
export function clearPayloadSession(): void {
  payloadSessionKey = null;
  authorizedVaultFiles.clear();
}

export function authorizeVaultFile(id: string): void {
  authorizedVaultFiles.add(id);
}

export function revokeVaultFileAuthorization(id: string): void {
  authorizedVaultFiles.delete(id);
}

export function isVaultFileAuthorized(id: string): boolean {
  return authorizedVaultFiles.has(id);
}

export function hasPayloadSession(): boolean {
  return payloadSessionKey !== null;
}

export function isVaultFileLocked(file: Pick<VaultFile, 'lock' | 'legacyLock'>): boolean {
  return Boolean(file.lock || file.legacyLock);
}

export async function encryptPayload(blob: Blob): Promise<Blob> {
  if (!payloadSessionKey) throw new Error('vault payload session is locked');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    payloadSessionKey,
    await blob.arrayBuffer(),
  );
  const header = new TextEncoder().encode(JSON.stringify({
    version: 1,
    iv: b64enc(iv.buffer as ArrayBuffer),
    mime: blob.type || 'application/octet-stream',
  }));
  const result = new Uint8Array(PAYLOAD_MAGIC.length + 4 + header.length + ciphertext.byteLength);
  result.set(PAYLOAD_MAGIC, 0);
  new DataView(result.buffer).setUint32(PAYLOAD_MAGIC.length, header.length, true);
  result.set(header, PAYLOAD_MAGIC.length + 4);
  result.set(new Uint8Array(ciphertext), PAYLOAD_MAGIC.length + 4 + header.length);
  return new Blob([result], { type: PAYLOAD_ENVELOPE_TYPE });
}

export function hasPayloadEnvelope(raw: Uint8Array): boolean {
  return raw.length >= PAYLOAD_MAGIC.length + 4 && PAYLOAD_MAGIC.every((v, i) => raw[i] === v);
}

export async function decryptPayload(blob: Blob): Promise<Blob> {
  const raw = new Uint8Array(await blob.arrayBuffer());
  if (!hasPayloadEnvelope(raw)) {
    return blob;
  }
  if (!payloadSessionKey) throw new Error('vault payload is encrypted and the vault is locked');

  const headerLength = new DataView(raw.buffer as ArrayBuffer).getUint32(PAYLOAD_MAGIC.length, true);
  const headerStart = PAYLOAD_MAGIC.length + 4;
  const payloadStart = headerStart + headerLength;
  if (payloadStart > raw.length) throw new Error('invalid vault payload envelope');

  const header = JSON.parse(new TextDecoder().decode(raw.slice(headerStart, payloadStart))) as {
    version: number;
    iv: string;
    mime?: string;
  };
  if (header.version !== 1 || !header.iv) throw new Error('unsupported vault payload envelope');
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64dec(header.iv) as BufferSource },
    payloadSessionKey,
    raw.slice(payloadStart) as BufferSource,
  );
  return new Blob([plaintext], { type: header.mime || 'application/octet-stream' });
}

export async function sha256Hex(s: string): Promise<string> {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
