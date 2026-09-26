/* DOMAIN — UNIVERSE (cosmos, diary, reality containers) — R52: split out of src/types.ts (the single 400-line type hub).
   Changes here are API changes: check inbound importers with npm run audit:arch. */
import type { GalaxyData } from '../realities/hierarchyTypes';
import type { TrashedFile, VaultFile, VaultSecrets, VaultUser, VfsState } from './vault';

export type BodyKind = 'star' | 'planet' | 'dwarf' | 'nebula' | 'hole' | 'vault';
export type Meaning = 'memory' | 'dream' | 'person' | 'project' | 'moment' | 'idea' | 'chapter' | 'unresolved' | null;
export const MEANING_LABEL: Record<string, string> = {
  memory: 'memory', dream: 'dream', person: 'person', project: 'project',
  moment: 'moment', idea: 'idea', chapter: 'chapter', unresolved: 'unresolved',
};
export const MEANINGS: { id: Exclude<Meaning, null>; desc: string; color: string }[] = [
  { id: 'memory', desc: 'something that happened and stays', color: '#7fc4e8' },
  { id: 'dream', desc: 'a night-logic, unverified', color: '#b49ae8' },
  { id: 'person', desc: 'someone this world is about', color: '#f2a0b0' },
  { id: 'project', desc: 'work in motion', color: '#f2c178' },
  { id: 'moment', desc: 'brief, bright, gone', color: '#e0785a' },
  { id: 'idea', desc: 'a seed, not yet a planet', color: '#9fd8a8' },
  { id: 'chapter', desc: 'an era of the life', color: '#d8b48a' },
  { id: 'unresolved', desc: 'still falling inward', color: '#8b93a8' },
];
export interface Palette { deep: string; base: string; high: string; atmo: string; ice: string; }
export interface Orbit { a: number; speed: number; phase: number; incl: number; }
export interface CosmicBody {
  id: string;
  name: string;
  kind: BodyKind;
  meaning: Meaning;
  note: string;
  createdAt: number;
  radius: number;
  rings?: boolean;
  clouds?: boolean;
  nightside?: boolean;
  palette: Palette;
  orbit: Orbit;
}
export interface Connection { id: string; a: string; b: string; createdAt: number; }
export type Mood = 'calm' | 'warm' | 'bright' | 'heavy' | 'burning';
export type Weather = 'clear' | 'rain' | 'storm' | 'fog' | 'dust';
export interface Attachment {
  id: string;
  kind: 'image' | 'audio' | 'video' | 'file' | 'code';
  name: string;
  dataUrl: string;
  /** Large diary media may live in OPFS/IndexedDB instead of localStorage. */
  payloadRef?: string;
  payloadMissing?: boolean;
  isGif?: boolean;
  peaks?: number[];
  duration?: number;
  size?: number;
  fileExt?: string;
  codeSnippet?: string;
  lineCount?: number;
  mimeType?: string;
  /* freeform position on the page — glued exactly where you drag it.
     x is % of the page width, y is px down from the top of the page.
     w is % width; h (px) only applies to voice memos. */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  /* finishing touches */  tone?: string;   /* '' | 'noir' | 'warm' | 'fade' — photo grading */
  tilt?: boolean;  /* hand-placed slight rotation */
  /* sealed INTO the paper: occupies its area inline like a typed sentence.
     false/undefined = free-floating plate you drag anywhere. */
  glued?: boolean;
}
export interface DiaryEntry {
  id: string;
  planetId: string;
  title: string;
  body: string;
  tags: string[];
  bookmarked: boolean;
  archived: boolean;
  mood?: Mood;
  weather?: Weather;
  createdAt: number;
  updatedAt: number;
  attachments: Attachment[];
}
export interface AuditEntry { t: number; msg: string; }
export interface RealityMetaPatch {
  name?: string;
  codeName?: string;
  spectral?: string;
  colorA?: string;
  colorB?: string;
  starColor?: string; /* the anchor star's aura — core surface + corona light */
}
export interface TrashedReality {
  id: string;
  name: string;
  codeName?: string;
  spectral: string;
  colorA: string;
  colorB: string;
  description: string;
  deletedAt: number;
  originalConfig?: any;
  folderName?: string;
}
export interface BinFolderInfo {
  folderName: string;
  path: string;
  trashedAt: number;
}
export interface DiskSyncState {
  connected: boolean;       /* last poll reached the disk daemon */
  lastSyncTime: number;     /* timestamp of the last successful poll */
  scanCount: number;        /* daemon scan counter */
  activeFolders: string[];  /* reality folders currently on disk */
  binDetails: BinFolderInfo[];
  operationsLog: { timestamp: number; type: string; details: string }[];
  pendingOps: number;       /* queued disk mutations awaiting retry */
  lastError: string | null;
}
export interface RealityBucket {
  bodies: CosmicBody[];
  entries: DiaryEntry[];
  connections: Connection[];
  vault: VaultFile[];
  vaultTrash: TrashedFile[];
  efs: VfsState;             /* this reality's own Eventide Filesystem */
}
export interface UniverseState {
  activeRealityId?: string;
  /* Round 14 — physics toggles (persisted; absent flag = ON, no migration) */
  spacetimeLensing?: boolean;  /* Einstein lensing — masses bend the light passing them */
  livingGravity?: boolean;     /* true mutual N-body coupling (osculating elements) */
  customRealityDescriptions?: Record<string, string>;
  customRealities?: any[];
  deletedRealityIds?: string[];
  binRealities?: TrashedReality[];
  /* realityId → disk folder name — recorded at create/rename time so every
     bin operation can address the exact folder (no fragile name matching) */
  realityFolders?: Record<string, string>;
  /* live disk-mirror telemetry (ephemeral — never persisted) */
  diskSync?: DiskSyncState;
  /* user-authored major-galaxy rosters — fully replaces the deterministic
     defaults for that reality (created/renamed/edited/deleted galaxies) */
  customGalaxies?: Record<string, GalaxyData[]>;
  customRealityMeta?: Record<string, RealityMetaPatch>;
  /* the per-reality world containers — the source of truth */
  realities: Record<string, RealityBucket>;
  /* derived views of the ACTIVE reality's container — refreshed by
     createSnapshot on every notify so existing consumers stay reality-scoped
     without knowing about containers. Never persisted. */
  bodies: CosmicBody[];
  entries: DiaryEntry[];
  connections: Connection[];
  vault: VaultFile[];
  efs: VfsState;
  vaultTrash: TrashedFile[];
  vaultUsers: VaultUser[];
  secrets: VaultSecrets | null;
  audit: AuditEntry[];
  visitedAt: number;
  version?: number;          /* migration marker — bumped when stored data needs a one-time fix */
}
export interface TimelineEvent { t: number; label: string; kind: 'body' | 'entry' | 'link' | 'vault'; refId: string; }
