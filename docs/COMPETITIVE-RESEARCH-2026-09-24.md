# Competitive Research & Feature Arsenal (2026-09-24)

Internet research across the six arenas Chasin Love World competes in, then the
feature list that turns our fusion moat into market dominance.

## 1. The Battlefield

| Competitor | What they sell | Their weak spot we exploit |
|---|---|---|
| **Universe Sandbox** (~$30) | Real n-body gravity, collisions, materials, atmospheres; 2026 roadmap: meteor drag + Barnes-Hut optimization | Zero personal meaning — nothing is *yours*. No journal, no vault, no privacy story. |
| **SpaceEngine** (~$25) | Photoreal procedural everything, VR, billions of galaxies | A sightseeing simulator. You visit; you don't *live* there. No creation, no memory. |
| **World Anvil** (subscription) | Worldbuilding wikis, timelines, campaign management | Pure text/maps — flat, no living 3D cosmos, no privacy layer, no vault. |
| **Day One / Apple Journal** | Polished journaling, E2E encryption, streaks | A flat list of pages. No spatial soul, no worlds, no metaphor. |
| **Rosebud / Reflection / Mindsera** | AI prompts, sentiment analysis, pattern detection | Chat-box interfaces. Nothing to *see*. Your memories never become a place. |
| **Obsidian Canvas** | Local-first spatial thinking, knowledge graphs | A tool for thinkers, a cold file system. No wonder, no physics, no story. |
| **Cryptee** | Encrypted notes + photo/video vault, EU jurisdiction | Pure storage bunker. Zero delight. |

**Our fusion moat:** nobody else on the market combines a living 3D cosmos +
personal meaning (planets ARE memories) + an isolated encrypted vault per
universe + total offline-first ownership. Every competitor owns one column of
that table. We own the intersection.

## 2. The Feature Arsenal — 24 weapons, tiered

### TIER 1 — Beat the simulator kings (Universe Sandbox / SpaceEngine)

1. **True n-body gravity mode** — toggle between the current stable Kepler
   orbits and a real n-body solver (we already have the C++ accelerator and a
   barycentric star wobble; add Barnes-Hut octree so 100+ bodies stay 60fps).
   Universe Sandbox's whole identity is gravity — we match it *inside a
   personal universe*, which they can't.
2. **Collisions & accretion** — planets that shatter into debris fields,
   moons that reform from rings, worlds that merge (mass-conserving). Their
   "explosion" moment, but the debris is *your* lost diary world.
3. **Celestial weather & time evolution** — stellar aging (main sequence →
   red giant → white dwarf swallows inner planets), orbital drift, tidal
   locking. Let a universe actually *die* — or be saved.
4. **Real-catalog import** — "Import the real Solar System / TRAPPIST-1 /
   Kepler-186" from embedded catalog data (offline). SpaceEngine has reality;
   we get it in one click, then let users bend it.
5. **Planet surfaces you can land on** — we already have the surface manager;
   add generated terrain heightmaps + a walk mode on any world. SpaceEngine's
   killer feature, ours because the world holds your memories.

### TIER 2 — Beat the journal/AI kings (Day One / Rosebud / Mindsera)

6. **Local AI Sky Oracle** — an offline (WebLLM/WASM) companion living in the
   anchor star: reflection prompts from your own entries, mood patterns drawn
   as *auroras* on the star, "you've been heavy for 4 days — here's what you
   wrote the last time that happened." On-device = the privacy answer.
7. **Sentiment aurora** — entries tint the anchor star's corona by mood;
   the light itself becomes your emotional history graph. No competitor makes
   feelings *visible in the sky*.
8. **Time-lapse birth replay** — "watch this year form": a cinematic replay
   where every diary entry detonates into its planet in chronological order,
   with the mood aurora burning behind it. The streak feature, made mythic.
9. **Memory constellation search** — natural-language search ("find when I
   wrote about trains") that lights up the matching planets and draws golden
   constellation lines between hits in the 3D sky. Ctrl+K exists — make the
   results *constellations*.
10. **On-this-day cosmic echo** — a yearly meteor shower where each meteor is
    an entry from the same date in past years; click one to reopen the page.
11. **Voice dictation into planets** — speak the entry; on-device Whisper
    transcribes; the planet forms as you speak. Zero-friction capture beats
    every journaling app's typing box.

### TIER 3 — Beat the vault kings (Cryptee / Obsidian)

12. **Per-reality vault encryption keys** — each reality's payloads sealed
    under its own passphrase-derived key; crossing realities without the key
    shows only a locked singularity. True "multiverse clearance levels."
13. **Vault timeline scrubber** — the EFS shadows exist; expose a visual
    time machine: drag a slider, watch the whole file tree flow through its
    generations like the universe's own birth replay.
14. **Dead-man's stellar will** — encrypted, time-locked legacy mode: if the
    vault isn't opened for N months, a chosen reality becomes unlockable by a
    custodian key. Grief-tech no competitor dares.
15. **Panic warp** — one keypress collapses every window into the vault and
    scrubs the desktop to the pure cosmos screen. Privacy theater, instant.
16. **Redshift archive** — long-idle realities visibly redshift on the dial
    (the dimming of unused universes), with one-click re-light. Makes the
    multiverse feel alive and honest about attention.

### TIER 4 — Beat the worldbuilding kings (World Anvil)

17. **Lore codex auto-woven** — the reality editor generates a living wiki
    page per world from its entries, meanings, physics telemetry and lineage;
    exportable as a beautiful standalone HTML "Codex of the Continuum."
18. **Character-population layer** — people you write about recur as moons,
    stations or ring-shepherds with their own mini-orbits; relationship
    entries draw gravity links between their bodies (we already draw
    connections — extend to beings).
19. **In-universe map maker** — draw continents on any planet's surface;
    the map wraps the actual 3D world you orbit. World Anvil's maps are
    flat images; ours are *the planet*.
20. **Multi-reality narratives** — connect worlds *across* realities with
    traversable wormholes (lore-linked, camera flies the tunnel), so story
    arcs can span universes.

### TIER 5 — The capture & spread layer (growth weapons)

21. **Reality snapshot cards** — one-click share/export: a gorgeous rendered
    postcard of a planet + entry excerpt, watermark-styled, steganographically
    carrying the universe seed so a friend can *hatch your world* offline.
22. **Universe import/export as a single .cosmos file** — everything (config,
    diary, vault metadata, skies) in one encrypted archive; drag-drop to
    clone a whole multiverse. Ownership marketing gold: "your universe is a
    file you hold."
23. **Mobile companion capture** — Tauri mobile shell: capture voice/photos
    on the phone, they fly to the desktop universe as shooting stars that
    land into planets. Friction-to-zero capture.
24. **The Genesis Cinema** — a 60-second auto-directed documentary of any
    reality (its birth, its heaviest days, its happiest constellation)
    rendered in-engine, exportable as video. The built-in trailer for every
    user's own universe — the ultimate share/loop feature.

## 3. Recommended strike order

- **Next wave (retention):** #7 sentiment aurora + #10 cosmic echo + #9
  constellation search — all shallow-dip into existing engine/state, huge
  daily-use emotional payoff.
- **Wave after (headline):** #1 n-body + #2 collisions — the market-facing
  physics flex; then #22 .cosmos export — the ownership story.
- **Then (moat deepening):** #12 per-reality vault keys (the security answer
  the user already asked about), #6 Sky Oracle, #24 Genesis Cinema.

Every weapon above reuses systems we already own: the physics engine, the
barycentric wobble, the EFS shadows, the reality folders, the palette system,
the command palette, the daemon. This is compounding, not rebuilding.
