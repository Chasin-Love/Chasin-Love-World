/* PLATFORM — localStorage key registry (R52). One named home for every key the
   app touches; the architecture auditor cross-checks new literals against this. */

export const STORAGE_KEYS = {
  /** Universe state snapshot (state/persist) */
  universeState: 'my-universe:v4',
  /** Quota-failure backup of the universe snapshot */
  universeStateRecovery: 'my-universe:v4:recovery',
  /** sessionStorage one-time guard: the desktop snapshot was adopted and the
      window reloaded once this session (state/persist hydration) */
  hydrateAdopted: 'my-universe:hydrate-adopted',
  /** Render quality tier override (engine/capability) */
  quality: 'my-universe:quality',
  /** One-time guard for the cinematic-tier migration */
  qualityMigrated: 'my-universe:quality-migrated',
  /** Black hole studio panel (engine/blackholeParams) */
  blackholeTuning: 'my-universe:blackhole:v1',
  /** Geodesic-tier override for the black hole (engine/blackholeTier) */
  blackholeTier: 'my-universe:blackhole:tier:v1',
  /** Last camera placement (engine/cameraMemory) — the found view survives
      every close/reopen of the app */
  cameraView: 'my-universe:camera:v1',
  /** Audio mute flag */
  muted: 'my-universe:muted',
  /** R91 — the N-body session's saved memory (physics/sessionDriver): roster
      + states + simDays of the driven universe, so real-gravity drift resumes
      exactly across close/reopen (the decree: the universe remembers) */
  simSession: 'my-universe:sim-session:v1',
  /** Vault auto-lock minutes */
  vaultAutolock: 'eventide:autolock',
  /** One-shot comet courier marker */
  cometBurned: 'eventide:comet-burned',
} as const;
