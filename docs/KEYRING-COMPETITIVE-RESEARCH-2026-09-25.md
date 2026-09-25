# Key Ring Competitive Research & Feature Arsenal (2026-09-25)

Exhaustive internet analysis of the password-manager / keyring battlefield, and
the feature program that puts the Eventide Key Ring ahead of every rival.
Companion to `COMPETITIVE-RESEARCH-2026-09-24.md` (which covers the cosmos /
journaling side). This document covers **only the vault password manager &
keyring war**.

---

## 0. What the Key Ring is today (code-verified inventory)

From `src/ui/VaultUI.tsx` (~line 3060–3400), `src/backend/storage/crypto.ts`,
`src/types.ts`:

| Capability | Status |
|---|---|
| KDF | PBKDF2-SHA256, 310,000 rounds (⚠ below OWASP 2026 minimum, see §3.1) |
| Cipher | AES-GCM 256-bit, per-identity sealing (`VaultSecrets { salt, iv, data, rounds }`) |
| Record model | label / user / secret / category / notes / updatedAt |
| Strength & health | per-item `pwScore` tier colors; composite **ring health** (weak + aged + duplicates) |
| Staleness | 180d "aged" / 365d "rotate" warnings |
| Generator | "forge" — passwords + passphrases, reroll, forge-into-field |
| Copy / reveal | clipboard scrub after 20s; reveal auto-conceal after 12s |
| Auto-lock | 1/5/15 min, plaintext wiped from memory, re-derive to unlock |
| Rotation | master key rotate; multi-identity ("foreign key" state for mismatched seals) |
| Audit | timestamped log of every unseal/reveal/copy/seal/purge/rotation/auto-lock |
| Backup | encrypted + SHA-256-checksummed export/import (own JSON format) |
| CLI | terminal `keyring` command |

**Confirmed absent (market-standard today):** TOTP authenticator · passkeys ·
breach monitoring · import from rival managers · password history · item types
(cards / identities / SSH keys / crypto wallets) · custom fields · secure
sharing · hardware-key unlock · Argon2id · trash/undo for credentials.

---

## 1. The battlefield — who the Key Ring actually fights

### 1.1 The commercial kings (subscription, cloud-sync)

**1Password** (~$2.99/mo individual, $4.99/mo families)
- Watchtower (weak / reused / compromised passwords, expired cards, 
  unreachable sites), Travel Mode (border-crossing vault wiping), full passkey
  suite, SSH agent + CLI + Secrets automation for developers, rich item types
  (logins, cards, identities, documents, SSH keys, API keys, crypto wallets).
- **Weak spots:** subscription-only, no free tier; a ~33% price hike in early
  2026 triggered open revolt (r/webdev, r/macapps, Hacker News) and was
  reverted after backlash; Electron-app complaints; zero offline story.

**Dashlane** (most expensive of the majors)
- Dark-web monitoring, bundled VPN, passkeys, password health.
- **Weak spots:** price (rated 7.5 vs NordPass 8.2 in value comparisons);
  feature churn (VPN/password-changer deprecations burned trust).

**NordPass**
- Data Breach Scanner, Password Health, email masking, emergency access,
  passkeys. **Weak spots:** Nord ecosystem upsell; subscription.

### 1.2 The open-source/local-first camp (our true philosophical rivals)

**Bitwarden** (+ Vaultwarden self-host)
- Argon2id KDF option, TOTP (moved to the **free tier** in 2025-26), passkey
  sync, vault health reports, HIBP breach checks, Send (encrypted
  self-destructing text/file shares), emergency access, Secrets Manager for
  machine secrets. Teams ~$4/user/mo.
- **Weak spots:** cloud-by-default (self-host takes a server); Premium price
  doubled $10→$20/yr with community backlash; "always free" marketing
  scrubbing incident; clunkier UX than 1Password.

**KeePassXC** (free, desktop)
- Single KDBX4 file (Argon2id), **keyfile + YubiKey HMAC challenge-response**
  unlock, TOTP, **Secret Service API integration (it can BE the Linux OS
  keyring)**, built-in SSH agent, KeeShare signed sharing, auto-type,
  KeePassXC-Browser extension.
- **Weak spots:** no official sync or mobile apps (outsource to
  KeePassium/Strongbox/Syncthing), manual everything, dated UX.

**Enpass** (the closest paid local-first rival)
- Vault lives on your own storage, one-time-purchase desktop (~$80–100
  lifetime), keyfile as 2FA-alternative, breach alerts, passkey storage.
- **Weak spots:** mobile still subscription; 3.8/5 review scores — "basic but
  reliable"; no ecosystem magic.

**KeePassium / Strongbox** (mobile KeePass clients) — polished iOS
auto-fill over the KeePass format; proves file-based vaults can feel premium.

**Spectre (Master Password)** — algorithmic password derivation (no storage
at all): a cult idea worth borrowing for generator UX, not for real-world use.

### 1.3 The free ecosystem giants

**Apple Passwords** (free, iOS 18+/Sequoia+): passwords + passkeys + Wi-Fi
passwords + verification codes (TOTP) + shared groups + web Access Keys; AI
sign-in features announced 2026. **Weak spot:** Apple-only sync.
**Google Password Manager** (free): cross-platform passkeys (now even on
iOS via Chrome), Password Checkup, verification codes. **Weak spot:** you are
the product; Google account lockout = life lockout.

### 1.4 The privacy challenger

**Proton Pass** (free w/ 10 aliases; Plus ~$24/yr)
- **Hide-my-email aliases** (SimpleLogin built in — the single most-copied
  feature of 2024-26), Secure Links (expiring E2E share links), Pass Monitor
  (dark web + health + 2FA audit), passkeys, built-in 2FA, Sentinel AI
  anti-takeover. **Weak spots:** Proton ecosystem gravity; alias reliability
  complaints; still a cloud service.

### 1.5 What "keyring" means on the OS itself

- **Linux:** freedesktop **Secret Service API** over D-Bus — GNOME Keyring,
  KWallet (both transitioning to Secret Service as the unified standard), and
  KeePassXC can all serve as the backend; apps store secrets via libsecret
  and don't care which daemon answers. PAM unlocks at login.
- **macOS:** Keychain + Secure Enclave (third-party apps get keychain
  integration; hardware-isolated keys).
- **Windows:** Credential Manager + **Windows Hello**, with the WebAuthn
  **PRF extension** now able to derive vault encryption keys from biometrics.

### 1.6 Market sentiment 2026 (the opening)

- Subscription fatigue is the dominant emotion: 1Password's 33% hike backlash,
  Bitwarden's 100% Premium hike, recurring "TOTP should be free" rants —
  users are actively churning between managers or splitting free PM + free
  authenticator apps.
- Everyone is converging on the same 2026 baseline: **TOTP + passkeys +
  breach monitoring + health report** behind a zero-knowledge story.
- **Nobody** owns: offline-first + zero-subscription + beautiful + OS-keyring
  integration + post-quantum option. That intersection is empty. That's the
  Key Ring's lane.

---

## 2. Feature-by-feature gap matrix

Legend: ✅ has it · ➖ partial · ❌ missing

| Feature | Key Ring | 1Password | Bitwarden | KeePassXC | Proton Pass | Apple/Google | Enpass |
|---|---|---|---|---|---|---|---|
| Local/offline-first, no account | ✅ | ❌ | ➖(self-host) | ✅ | ❌ | ❌ | ✅ |
| Zero subscription | ✅ | ❌ | ➖ | ✅ | ➖ | ✅ | ➖(mobile) |
| Argon2id KDF | ❌ | ❌ | ✅ | ✅ | ❌ | — | ❌ |
| TOTP authenticator | ❌ | ✅ | ✅(free) | ✅ | ✅ | ✅ | ✅ |
| Passkey storage | ❌ | ✅ | ✅ | ➖ | ✅ | ✅ | ✅ |
| Breach monitoring | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Health report | ✅ | ✅ | ✅ | ➖ | ✅ | ✅ | ✅ |
| Import from rivals | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Password history + revert | ❌ | ✅ | ✅ | ✅ | ✅ | ➖ | ✅ |
| Item types (cards/IDs/SSH/wallets) | ❌ | ✅ | ✅ | ➖ | ✅ | ➖ | ✅ |
| Custom fields / multi-URL | ❌ | ✅ | ✅ | ✅ | ✅ | ➖ | ✅ |
| Secure expiring share (Send) | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Email aliases | ❌ | ➖ | ❌ | ❌ | ✅ | ➖(Hide) | ❌ |
| Hardware key unlock (YubiKey CR) | ❌ | ➖ | ✅ | ✅ | ➖ | ➖ | ✅(keyfile) |
| Biometric unlock | ❌ | ✅ | ✅ | ➖ | ✅ | ✅ | ✅ |
| Emergency / dead-man access | ❌ | ✅ | ✅ | ❌ | ➖ | ➖ | ➖ |
| Travel mode | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit log of sensitive ops | ✅ | ➖ | ➖ | ➖ | ➖ | ❌ | ➖ |
| Encrypted backup file you own | ✅ | ➖ | ✅ | ✅ | ➖ | ❌ | ✅ |
| SSH agent | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| OS keyring bridge | ❌ | ➖ | ❌ | ✅ | ❌ | — | ❌ |
| Post-quantum option | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Theatrical, memorable UX | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Read the matrix this way: everything the market treats as **table stakes**
(TOTP, passkeys, breach check, import, item types, history, biometric unlock)
is missing from the Key Ring — that's Wave 1. Everything **nobody** has
(OS-keyring bridge from a browser vault, post-quantum sealing, offline
subscription-free theater, the cosmos itself) is already half-ours — that's
the moat.

---

## 3. Security-frontier findings that change our roadmap

### 3.1 KDF: our 310k PBKDF2 is now below the OWASP minimum
OWASP 2026 guidance: **Argon2id preferred** (19 MiB / 2 iterations minimum,
128 MiB / 3 preferred); PBKDF2-HMAC-SHA256 only where FIPS-required, at
**600,000+ iterations**. We run 310k. Argon2id ships in browsers via
`hash-wasm`; Bitwarden and KeePassXC already offer it. **This is a
credibility hole and the single cheapest headline fix we can make.**

### 3.2 Passkeys & WebAuthn PRF
WebAuthn Level 3 + the **PRF extension** reached mainstream hardware support
by 2026 (YubiKey, Nitrokey, SoloKey): an authenticator can deterministically
derive a symmetric key, i.e. **unlock the vault with a biometric / hardware
token instead of typing the master key**. In the Tauri desktop shell, Windows
Hello / platform authenticators expose the same primitive. 1Password and
Bitwarden already ride this.

### 3.3 Breach checking is a solved, privacy-safe pattern
HIBP **k-anonymity range API**: SHA-1 the password locally, send only the
first 5 hex chars, compare returned suffixes locally. FBI contributed 630M
seized passwords to the corpus (Dec 2025). Full ~850MB corpus exists for
**fully offline** checking — which fits our offline-first religion: embed a
top-N corpus, offer the live API as opt-in.

### 3.4 Post-quantum is still an empty lane for consumer PMs
NIST FIPS 203 (ML-KEM/Kyber) is final; Signal (PQXDH) and Apple (PQ3) shipped
hybrid PQ. **No consumer password manager offers a PQ-hardened vault
envelope yet.** A hybrid X25519+ML-KEM seal on the backup/export format would
be a genuine first-mover headline ("the first password manager whose exports
survive quantum adversaries"), cheap to scope to exports since we control
both ends offline.

### 3.5 TOTP interop standard
RFC 6238 + `otpauth://` URIs (with labels, issuers, digits, period, algorithm)
are the universal exchange format (QR codes from every site). Steam-variant
and 8-digit codes are the edge cases to support.

### 3.6 The Linux keyring is an open bridge
KDE is migrating KWallet onto Secret Service (announced 2025). KeePassXC
already acts as a Secret Service provider — proving a third-party vault can
**be** the OS keyring. Our Tauri desktop shell could do the same: every
libsecret app on Linux transparently stores its secrets inside the Eventide
vault. No cloud PM can follow us there.

---

## 4. THE ARSENAL — what to build, in strike order

### WAVE 1 — Table stakes & trust (ship first; without these we're not in the game)

1. **Argon2id sealing** ("the singularity hardens") — new vaults sealed with
   Argon2id (hash-wasm; 64 MiB / 3 iterations), legacy PBKDF2 vaults bumped to
   600k on next unlock + one-touch migration. Metadata records KDF + params
   next to `salt/iv/rounds`. *One day of work, instantly matches
   Bitwarden/KeePassXC, erases the OWASP gap.*
2. **Pulsar Codes — the TOTP authenticator** — store `otpauth://` seeds
   (paste URI or scan QR via camera/image-file), generate RFC 6238 codes with
   countdown ring, copy-with-scrub, search, and a "missing 2FA" item in ring
   health. **Free, forever** — market sentiment says TOTP paywalls are hated;
   we weaponize that. UX identity: each TOTP credential is a *pulsar* — a
   star that flashes on schedule; the countdown ring is its light-curve.
3. **The Gravity Well — importer** — one dialog that eats: Bitwarden
   CSV+JSON, 1Password CSV + 1PUX, KeePass CSV (+ KDBX via optional
   keyfile), Chrome/Edge/Safari CSV, Proton Pass CSV. Map → label/user/
   secret/category/notes/URLs/custom fields, de-dup preview, then seal.
   **Switching cost is the #1 adoption barrier in every review thread.**
4. **Password history + revert** — keep prior secrets per record (encrypted,
   capped count), diff view, one-click restore. Every rival has it.
5. **Item kinds & custom fields** — extend `PasswordRecord` with `fields[]`,
   `urls[]`, and first-class kinds: login / card / identity / note / SSH key /
   API key / bank / crypto-wallet (the seed phrase gets a special
   "never-reveal-just-copy" treatment). Cards surface expiries in health.
6. **Nova Scan — breach monitoring** — opt-in HIBP k-anonymity range API
   (5-char SHA-1 prefix, nothing else leaves), plus an embedded top-10k
   common-passwords corpus for always-on offline screening. Breached
   credentials render as *novae* (flaring red) in the ring and in the health
   report with a forge-and-replace flow.
7. **Ring trash** — soft-delete credentials (30-day restore) before purge;
   aligns the Key Ring with EFS Trash semantics we already have.

### WAVE 2 — Differentiators (things that make people switch TO us)

8. **Passkey Vault** — store/export/import passkeys (WebAuthn Level 3 JSON);
   in the desktop shell, register as a platform virtual authenticator so the
   Key Ring answers passkey challenges for the OS; PRF-derived unlock so
   Windows Hello / Touch ID / YubiKey can *derive the master key* instead of
   the user typing it. Cosmic identity: passkeys are **fixed stars** — they
   never rotate, they authenticate by position.
9. **Comet Courier — secure send** — expiring, encrypted, one-view secret
   shares (Bitwarden Send / Proton Secure Links equivalent) rendered as a
   comet: bright tail while alive, gone when it burns out. Payload sealed
   client-side; the link carries only the key fragment.
10. **Hardware key unlock** — YubiKey HMAC-SHA1 challenge-response as a
    second secret factor alongside the master key (KeePassXC-style, proven
    model). Also accept a **keyfile** (Enpass-style) for unlock.
11. **Stellar Will — dead-man's switch** (already planned as #14 in the 2026-09-24
    arsenal): if the vault stays sealed for N configurable months, a custodian
    recovery key activates. Frame it as a star going dark and bequeathing its
    system. No mainstream rival has shipped this for personal vaults.
12. **Watchtower-grade health report** — evolve ring health from a score into
    an itemized, actionable report (weak / reused / aged / breached /
    missing-TOTP / expiring cards / 2FA-available-but-off), each row one click
    from fix. This is 1Password's most-cited feature; our version renders as
    a **constellation map** of the ring.

### WAVE 3 — The moat (things nobody can copy quickly)

13. **Eventide Secret Service (Linux)** — Tauri daemon exposing the
    freedesktop Secret Service D-Bus API backed by the Key Ring: the user's
    *entire OS* (NetworkManager, git, browsers, CLI tools) stores secrets in
    their personal black hole. KeePassXC proved the pattern; we make it
    cinematic. This is the literal fulfillment of the name "Key Ring."
14. **SSH agent mode** (desktop) — Key Ring answers `SSH_AUTH_SOCK`,
    keys sealed in the vault, per-key approval prompts (1Password/KeePassXC
    parity for the dev audience).
15. **Post-quantum export envelope** — hybrid X25519 + ML-KEM (FIPS 203)
    sealing for backups/`.cosmos` exports: "the first personal vault whose
    backups a quantum adversary can't open." Ship as an option; classic
    AES-GCM stays default.
16. **Per-reality keys** (already planned #12 in the prior arsenal) — each
    reality's Key Ring sealed under its own derived key; crossing realities
    without the key shows only a locked singularity.
17. **Panic warp & redshift archive** (prior arsenal #15/#16) — instant
    vault-collapse keypress; idle realities visibly dim. The Key Ring locks
    itself into the theater.
18. **Alias recipes (offline hide-my-email)** — we can't run Proton's alias
    *servers*, but for users with a custom catch-all domain we can generate
    **deterministic per-site aliases** (`site@yourdomain` recipes, stored,
    searchable, paste-ready) — 90% of the alias benefit, zero cloud, and a
    honest explanation page of the difference.

### Standing positioning (marketing, not code)

- **Free forever, offline forever** into every Wave-1 release note — aimed
  straight at the 1P/Bitwarden price-hike refugees (Reddit threads are full
  of them right now).
- **"Your key ring is a file you hold"** — the checksummed encrypted export
  already exists; make it a headline, not a toolbar button.
- Security page: publish the crypto spec (KDF params, cipher, memory-wipe
  behavior, audit log). KeePassXC's transparency is its brand; ours can be
  louder.

---

## 5. Effort × impact quick map

| # | Feature | Effort | Impact |
|---|---|---|---|
| 1 Argon2id | S | High (credibility) |
| 2 TOTP | M | Very high (most-used daily feature) |
| 3 Importer | M | Very high (removes switching cost) |
| 4 History | S | Medium |
| 5 Item kinds/fields | M | High |
| 6 Nova Scan | S–M | High |
| 7 Ring trash | S | Medium |
| 8 Passkeys + PRF unlock | L | Very high (future-proof) |
| 9 Comet Courier | M | High |
| 10 Hardware/keyfile unlock | M | Medium-high |
| 11 Stellar Will | M | High (unique) |
| 12 Watchtower report | S–M | High |
| 13 Secret Service bridge | L | Strategic (Linux flagship) |
| 14 SSH agent | M | Medium (dev niche) |
| 15 PQ export | M | Headline (first-mover) |
| 16–18 Per-reality keys / panic / aliases | M | Medium-high |

Recommended sequence for the next rounds: **1 → 2 → 3** as the immediate
trio (trust, daily-use, adoption), then **5 + 6 + 12** (complete the manager),
then **8** (future-proof), then pick moat items **13/15** by platform energy.

---

## 6. Sources

- OWASP Password Storage Cheat Sheet — Argon2id/PBKDF2 2026 parameters (cheatsheetseries.owasp.org; bellatorcyber.com; toolsana.com)
- 2026 PM landscape & trends (techcompare.app; lock.pub; relyshield.com; vpnoverview.com; passwork.pro; panicvault.org; esecurityplanet.com)
- 1Password features/pricing/backlash (productsverdict.com 2026 review; r/webdev, r/macapps, r/1Password, r/Bitwarden price-increase threads; Hacker News)
- Bitwarden features, Argon2id, free-tier TOTP, Send, Secrets Manager, price hike (bitwarden.com; dev.to Sept 2026; vpsbg.eu; teampassword.com)
- KeePassXC Secret Service / SSH agent / YubiKey (keepassxc.org docs+FAQ; wiki.gentoo.org; security.stackexchange.com; yubico.com)
- Proton Pass aliases / Secure Links / Pass Monitor / Sentinel (proton.me/pass/aliases; proton.me Sentinel program)
- Apple Passwords & Google PM (support.apple.com 120758; developer.chrome.com passkeys-gpm-ios; panicvault.org comparison; slashdot software comparison)
- NordPass / Dashlane (cyberpresso.com; malcare.com; passwordgeeks.com; tooltivity.com)
- Enpass local storage & one-time purchase (safetydetectives.com; allaboutcookies.org; digitaltrends.com; apps.microsoft.com; pcmag.com; techrepublic.com; passwordmanager.com)
- WebAuthn PRF & passkey adoption 2026 (fidoalliance.org CTAP spec; labhub.hopto.org 2026 PM survey; DTU & arXiv adoption research)
- HIBP k-anonymity & FBI 630M corpus (securitymagazine.com Dec 2025; getrekey.com; learn.microsoft.com)
- Post-quantum status (NIST FIPS 203 ML-KEM; cloudsecurityalliance.org; pypi vault-for-agents Feb 2026)
- Secret Service / KWallet transition (notmart.org; forum.manjaro.org; blog.ce9e.org; discuss.kde.org)
- Import/export formats (bitwarden.com import-export FAQs; servorbit.com 1PUX guide; migratingto.dev)
