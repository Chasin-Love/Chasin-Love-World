 (sarthaksarma7@gmail.com ----for contact )
 # MY UNIVERSE

A personal infinite-scale cosmic environment. Not a website that looks like
space — a real-time universe that happens to be a website.

Built with **Three.js / WebGL2**, **TypeScript**, **React**, and **Tailwind CSS**.

---

## The idea

- The **Anchor Star** is the core of your personal universe — double-click it
  to enter Core Mode, inspect every world you've formed, and drag the
  timeline to rewind the universe itself.
- **Planets are thoughts.** Every world represents something — a memory, a
  person, a dream, a project. Its **moons are its diary pages**: one moon per
  page, generated live.
- Double-click a world and space bends — a gravitational **portal** forms and
  pulls you into that world's **physical diary**: pages you turn like paper,
  windows that behave like matter, voices you can record, moods and weather
  each memory carries.
- The **Universal Vault** (a black-hole-class object) is the single place
  your actual digital matter lives — files, apps, games, ISOs — behind a
  master-key identity system with a sealed Key Ring (AES-256-GCM, PBKDF2).
- Zoom out forever: planetary system → stellar neighborhood → spiral galaxy →
  local cluster → the cosmic web → the observable universe.

## Running it

```
npm install
npm run dev       # develop
npm run build     # production build → dist/
```

## Architecture

```
src/
  App.tsx            orchestrator — chrome, input, windows, modes
  engine/
    engine.ts        the universe — camera, bodies, portal, LOD levels
    shaders.ts       GLSL — star, planets, corona, rings, portal, terrain
  ui/
    CoreMode.tsx     the Anchor Star core + universe timeline
    DiaryWindow.tsx  physical diary windows (moods, weather, links)
    Book.tsx         wave page-turn mechanics
    VaultUI.tsx      file system, key ring, terminal, scanners
    bits.tsx         store hook, icons, toasts
  state.ts           store + persistence + vault crypto
  types.ts           shared model
  audio.ts           ambient drones + interaction sound
```

See **`RESTORE.md`** for the disaster-recovery map: what every file is,
which ones are originals, and exactly how to rebuild the project from this
repository if anything is ever lost.

## Design principles

- The universe is the interface — no dashboards, no permanent panels.
- UI appears only when you interact; it fades when you don't.
- Everything persists to the browser; the Key Ring is encrypted per master
  key and can never be reset — rotate it while you still know it.
