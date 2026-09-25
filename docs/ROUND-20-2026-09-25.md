# ROUND 20 — The Key Ring Arsenal (2026-09-25)

Wave 1 of the Key Ring feature program from
[`KEYRING-COMPETITIVE-RESEARCH-2026-09-25.md`](KEYRING-COMPETITIVE-RESEARCH-2026-09-25.md)
is implemented and verified. The Eventide Key Ring now meets the 2026
password-manager table stakes — and keeps its zero-cloud, zero-subscription,
audit-everything identity that no rival matches.

## Shipped this round

### 1. Argon2id sealing (`crypto.ts`)
- New vault seals use **Argon2id 64 MiB × 3 passes** via `hash-wasm` —
  memory-hard, OWASP-preferred, Bitwarden-class.
- `VaultSecrets` gained `kdf` / `mem` / `iters` metadata; legacy PBKDF2
  payloads (any round count) remain fully readable.
- **Silent hardening:** the first time a legacy ring opens (or an old
  identity signs in), it is transparently re-sealed under Argon2id with an
  audit entry and a toast — "the singularity hardened".
- `isSealHardened()` gates the migration; PBKDF2 is kept only as a
  compatibility path (`KDF_PBKDF2_FLOOR = 600000` documents the OWASP floor).

### 2. Pulsar Codes — the TOTP authenticator (`totp.ts`, VaultUI)
- Full RFC 6238 engine: RFC 4648 base32, HMAC-SHA1/256/512, 6–8 digits,
  custom periods, dynamic truncation. **Verified against every official
  RFC 6238 SHA-1 test vector** (59 s → 20000000000 s).
- `otpauth://totp/...` URIs parse and canonicalize; bare base32 seeds are
  auto-wrapped; `add` validates seeds before sealing.
- Each credential with a seed renders a **live pulsar** — countdown ring
  light-curve (teal → amber → red as the period burns down), tap to copy
  with the 20-second clipboard scrub. Invalid seeds show a "dead pulsar".
- Free forever, by design — aimed straight at the "TOTP shouldn't be
  paywalled" sentiment.

### 3. The Gravity Well — rival import (`importers.ts`, GravityWellModal)
- Eats: **Bitwarden CSV + unencrypted JSON** (folders/fields/TOTP/uris),
  **1Password CSV**, **Chrome / Edge / Firefox CSV**, **Proton Pass CSV**,
  **KeePass / KeePassXC CSV**, and best-effort generic CSV.
- Proper RFC 4180 quoted-CSV state machine (embedded commas/newlines/quotes),
  header-driven source detection, category inference (bank/wifi/mail/server
  hints → URL → folder), KeePass group paths, Bitwarden encrypted-export
  rejection with a clear message.
- Dedupe preview (label+user+URL) before anything is sealed; skipped
  note-only rows are reported.

### 4. Nova Scan — offline breach screening (`breaches.ts`, SentinelPanel)
- ~330-entry embedded corpus of the internet's most-breached passwords
  (RockYou/HIBP vintage), hashed to SHA-1 at boot so plaintext never sits
  next to comparisons. Fully offline — nothing leaves the machine.
- Scans the whole ring, stamps `breachedAt` (a pulsing red **nova glyph**
  replaces the strength dot), lifts flags when secrets are fixed, writes
  audit entries, and folds a nova penalty into ring health.

### 5. Sentinel report (VaultUI)
- The Watchtower answer, in-universe: itemized **nova flare / weak gravity /
  shared orbit (reuse) / old light (365d+) / no pulsar / debris field**
  counts, each with a one-line remedy. Backs the new `scan` toolbar action.

### 6. Ring trash (debris field)
- Delete = soft-delete (`deletedAt`), 30-day burnout countdown, restore or
  purge individually, **purge all** button. No credential is truly gone
  until the user says so.

### 7. Password history
- Replaced secrets stack into `history` (newest last, capped at 8) with
  epoch names (janitor → quasar); edit panel shows prior secrets as
  one-tap resurrect chips.

### 8. Structured records
- New fields on `PasswordRecord`: `otpauth`, `urls[]`, `fields[]`
  (`name: value` lines), `history[]`, `deletedAt`, `breachedAt` — all
  optional and backward-compatible. Add/edit forms expose them; search now
  covers urls and custom fields; row subline previews notes · fields · urls.

### 9. Terminal & chrome
- `keyring` CLI reports the KDF (Argon2id params or legacy-rounds status)
  without ever decrypting counts.
- Toolbar: import · forge · scan · backup · restore · rotate · trash ·
  sentinel · audit. Footer shows the new seal spec.

## Verification
- `tsc --noEmit` strict — clean.
- `npm run build` — clean (hash-wasm bundles into the main chunk).
- Standalone harness (esbuild-bundled modules, Node):
  RFC 6238 vectors **6/6**, otpauth parse, CSV machine, Bitwarden
  CSV+JSON / Chrome / KeePass imports, dedupe, Argon2id roundtrip +
  wrong-key rejection + legacy-PBKDF2 readability, nova stamp/clear —
  **all pass**.

## Next waves (from the research doc)
- Wave 2: passkey vault + WebAuthn PRF unlock, Comet Courier shares,
  hardware-key/keyfile unlock, Stellar Will dead-man's switch.
- Wave 3: Secret Service D-Bus bridge (Tauri), SSH agent, ML-KEM export
  envelopes, per-reality keys.
