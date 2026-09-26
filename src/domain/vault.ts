/* DOMAIN — VAULT (Eventide EFS, files, users, secrets) — R52: split out of src/types.ts (the single 400-line type hub).
   No imports outside the domain — the vault is self-describing.Changes here are API changes: check inbound importers with npm run audit:arch. */
export type VaultKind = 'document' | 'image' | 'audio' | 'video' | 'dataset' | 'archive' | 'iso' | 'exe' | 'application' | 'game' | 'other';
export type VfsNodeType = 'dir' | 'file';
export interface VfsNode {
  id: string;
  type: VfsNodeType;
  name: string;
  parentId: string | null;   /* null only for the root */
  createdAt: number;
  modifiedAt: number;
  /* dirs */
  color?: string;            /* user color dot */
  /* files */
  fileId?: string;           /* → VaultFile.id (the payload record) */
  tags?: string[];
  pinned?: boolean;
}
export interface VfsShadow {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  generation: number;        /* superblock generation at freeze time */
  dirCount: number;
  fileCount: number;
  bytes: number;
  tree: Record<string, VfsNode>;  /* frozen metadata tree (payload ids kept,
                                     inline content stripped — extents shared) */
}
export interface EfsSuperblock {
  uuid: string;
  label: string;             /* 'eventide-efs' */
  createdAt: number;
  generation: number;        /* bumped on every tree mutation */
  dedupBytes: number;        /* payload bytes saved by dedup */
  lastScrubAt?: number;
}
export interface EfsScrubReport {
  startedAt: number;
  finishedAt?: number;
  filesScanned: number;
  bytesScanned: number;
  errorsFound: number;
  errorsCorrected: number;
  status: 'idle' | 'running' | 'clean' | 'repaired' | 'corrupted';
  log?: string[];
}
export interface VfsState {
  rootId: string;                          /* always 'vfs-root' */
  nodes: Record<string, VfsNode>;
  super: EfsSuperblock;
  shadows: VfsShadow[];
  scrub?: EfsScrubReport;
}
export interface VaultLock {
  version: 1;
  salt: string;
  verifier: string;
  rounds: number;
}
export interface VaultFile {
  id: string;
  name: string;
  kind: VaultKind;
  mime: string;
  size: number;
  addedAt: number;
  dirId?: string;            /* parent EFS directory node (root when absent) */
  checksum?: string;         /* sha-256 hex of the plaintext payload — integrity & dedup */
  dedupOf?: string;          /* payload id this file shares bytes with (zero-copy) */
  content?: string;          /* legacy inline payload; new imports use encrypted payloads */
  payloadRef?: string;       /* payload lives in OPFS/IndexedDB under this key */
  payloadEncrypted?: boolean;/* new payload was written through the encrypted store */
  payloadMissing?: boolean;  /* metadata was restored but original payload bytes were unavailable */
  thumb?: string;            /* tiny inline preview for images */
  sealed?: boolean;          /* payload lives in the execution layer only */
  lock?: VaultLock;          /* versioned verifier; the object password is never stored */
  legacyLock?: string;       /* one-time migration field for old plaintext locks */
  versions?: FileVersion[];  /* edit history for inline-payload objects */
  realityId?: string;        /* reality continuum id this vault file belongs to */
}
export interface FileVersion {
  id: string;
  savedAt: number;
  label: string;
  size: number;
  content?: string;
  generation?: number;
  csum?: string;
}
export interface TrashedFile {
  item: VaultFile;
  deletedAt: number;
  fromDirId?: string;        /* original parent so restore lands back in place */
  node?: VfsNode;            /* the file's own tree node, re-attached on restore */
  dirNodes?: VfsNode[];      /* when a whole directory was trashed: its frozen
                                subtree (dirs), restored alongside the files */
  dirName?: string;
}
export interface AvatarFit { zoom: number; px: number; py: number; }
export interface VaultUser {
  id: string;
  name: string;
  avatar: string | null;
  avatarFrames?: string[] | null;
  avatarFps?: number | null;
  avatarFit?: AvatarFit | null;
  avatarNote?: string | null;
  createdAt: number;
  lastSeen: number;
  salt: string;
  verifier: string;
  kdfRounds?: number;
}
export interface PasswordField { k: string; v: string; }
export interface PasswordHistoryEntry { secret: string; changedAt: number; }
export interface PasswordRecord {
  id: string;
  label: string;
  user: string;
  secret: string;
  category?: string;
  notes?: string;
  updatedAt: number;
  /** TOTP seed as an otpauth:// URI — grants the record a pulsar code */
  otpauth?: string;
  /** Associated login addresses (one per line in editors) */
  urls?: string[];
  /** Custom key/value payload — card numbers, recovery codes, SSH hosts… */
  fields?: PasswordField[];
  /** Prior secrets, newest last, capped — one-click revert on edit */
  history?: PasswordHistoryEntry[];
  /** Soft-delete marker — the record falls into ring trash until purged */
  deletedAt?: number;
  /** Set by nova scan when the secret matches a known-compromised corpus */
  breachedAt?: number;
}
export interface RingEnvelope {
  salt: string;
  iv: string;
  /** the wrapped ring key, AES-GCM under the KDF-derived envelope key */
  data: string;
  kdf?: 'argon2id' | 'pbkdf2';
  rounds?: number;
  mem?: number;
  iters?: number;
  kind?: 'master' | 'prf' | 'custodian';
  /** keyfile fingerprint (first 16 hex of sha256(kfHash)) — present means a keyfile is required */
  fp?: string;
  /** WebAuthn credential id (b64url) for prf envelopes */
  credId?: string;
  /** PRF eval salt (b64) for prf envelopes */
  prfSalt?: string;
  /** when the custodian envelope was armed */
  armedAt?: number;
  /** stellar-will darkness threshold in months */
  months?: number;
  createdAt?: number;
}
export interface VaultSecrets {
  /** v2 envelope sealing — record payload is raw AES-GCM under the ring key */
  version?: 2;
  iv: string;
  data: string;
  envelopes?: RingEnvelope[];
  /** last successful open — drives the stellar will's darkness check */
  lastOpenedAt?: number;
  /* ---- legacy v1 fields (payload sealed under a passphrase-derived key) ---- */
  salt?: string;
  rounds?: number;
  kdf?: 'argon2id' | 'pbkdf2';
  mem?: number;
  iters?: number;
}
