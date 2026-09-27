/* PLATFORM — localStorage key registry (R52). One named home for every key the
   app touches; the architecture auditor cross-checks new literals against this. */

export const STORAGE_KEYS = {
  /** Universe state snapshot (state/persist) */
  universeState: 'my-universe:v4',
  /** Quota-failure backup of the universe snapshot */
  universeStateRecovery: 'my-universe:v4:recovery',
  /** Render quality tier override (engine/capability) */
  quality: 'my-universe:quality',
  /** One-time guard for the cinematic-tier migration */
  qualityMigrated: 'my-universe:quality-migrated',
  /** Black hole studio panel (engine/blackholeParams) */
  blackholeTuning: 'my-universe:blackhole:v1',
  /** Geodesic-tier override for the black hole (engine/blackholeTier) */
  blackholeTier: 'my-universe:blackhole:tier:v1',
  /** Audio mute flag */
  muted: 'my-universe:muted',
  /** Vault auto-lock minutes */
  vaultAutolock: 'eventide:autolock',
  /** One-shot comet courier marker */
  cometBurned: 'eventide:comet-burned',
} as const;
