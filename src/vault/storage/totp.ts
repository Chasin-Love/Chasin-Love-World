/**
 * Pulsar Codes — RFC 6238 TOTP engine for the Key Ring.
 *
 * Time-based one-time passwords derived from an otpauth:// seed. The code
 * flashes, counts down its period, and dies — a pulsar's light-curve. All
 * derivation is local WebCrypto HMAC; nothing ever leaves the vault.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32 decode (padding-insensitive, whitespace-insensitive). */
function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx === -1) throw new Error(`invalid base32 character "${c}"`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

interface TotpParams {
  secret: string;       /* base32 seed */
  digits: number;       /* 6 or 8 */
  period: number;       /* seconds — 30 standard */
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512';
  issuer?: string;
  label?: string;
}

/** Parse an otpauth:// URI into parameters. Raw base32 secrets are wrapped. */
export function parseOtpAuth(uri: string): TotpParams {
  const trimmed = uri.trim();
  if (!/^otpauth:\/\//i.test(trimmed)) {
    /* raw base32 seed pasted directly — canonicalized to uppercase */
    return { secret: trimmed.replace(/\s/g, '').toUpperCase(), digits: 6, period: 30, algorithm: 'SHA-1' };
  }
  const u = new URL(trimmed.replace(/^otpauth:\/\//i, 'https://'));
  if ((u.host || '').toLowerCase() !== 'totp') throw new Error('only otpauth://totp is supported');
  const params = u.searchParams;
  const pathLabel = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
  const issuerParam = params.get('issuer') ?? undefined;
  const secret = (params.get('secret') ?? '').replace(/\s/g, '').toUpperCase();
  if (!secret) throw new Error('otpauth URI carries no secret');
  const algorithm = (params.get('algorithm') ?? 'SHA1').toUpperCase().replace('SHA', 'SHA-');
  return {
    secret,
    digits: Math.min(10, Math.max(6, Number(params.get('digits')) || 6)),
    period: Math.max(5, Number(params.get('period')) || 30),
    algorithm: algorithm === 'SHA-256' || algorithm === 'SHA-512' ? algorithm : 'SHA-1',
    issuer: issuerParam ?? (pathLabel.split(':')[0] || undefined),
    label: pathLabel.includes(':') ? pathLabel.split(':').slice(1).join(':') : pathLabel || undefined,
  };
}

/** Wrap a bare seed into a canonical otpauth:// URI. */
export function buildOtpAuth(secret: string, issuer: string, label: string, opts?: Partial<TotpParams>): string {
  const p = new URLSearchParams({ secret });
  if (issuer) p.set('issuer', issuer);
  if (opts?.digits && opts.digits !== 6) p.set('digits', String(opts.digits));
  if (opts?.period && opts.period !== 30) p.set('period', String(opts.period));
  if (opts?.algorithm && opts.algorithm !== 'SHA-1') p.set('algorithm', opts.algorithm.replace('-', ''));
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label || 'secret')}?${p.toString()}`;
}

async function hmac(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512', key: Uint8Array, counter: bigint): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: { name: algorithm } }, false, ['sign']);
  const ctr = new Uint8Array(8);
  new DataView(ctr.buffer).setBigUint64(0, counter, false);
  return crypto.subtle.sign('HMAC', cryptoKey, ctr as BufferSource);
}

/** RFC 4226 dynamic truncation → numeric code of `digits` length. */
function truncate(digest: ArrayBuffer, digits: number): string {
  const bytes = new Uint8Array(digest);
  const offset = bytes[bytes.length - 1] & 0x0f;
  const binary = ((bytes[offset] & 0x7f) << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
  return String(binary % (10 ** digits)).padStart(digits, '0');
}

/** Compute the TOTP code for a unix timestamp (ms). */
export async function totpAt(params: TotpParams, timeMs: number): Promise<string> {
  const counter = BigInt(Math.floor(timeMs / 1000 / params.period));
  return truncate(await hmac(params.algorithm, base32Decode(params.secret), counter), params.digits);
}

/** Seconds remaining in the current code's period. */
export function totpRemaining(params: TotpParams, timeMs: number): number {
  return params.period - Math.floor(timeMs / 1000) % params.period;
}

/** Validates that a seed decodes and produces a code — throws otherwise. */
export async function validateOtpAuth(uri: string): Promise<TotpParams> {
  const params = parseOtpAuth(uri);
  await totpAt(params, Date.now());
  return params;
}
