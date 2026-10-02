/* STATE — actions/bodies (R97): a domain of the single mutation
   surface — text extracted verbatim from the old actions.ts monolith. */
    import type { CosmicBody, BodyKind, Meaning } from '../../domain/universe';
    import { bucket, newId } from '../store';
    import { inclinedOrbitElements } from '../../realities';
    import { procPalette, procRadius } from '../../vault';
  import { notify } from './shared';

export const bodyActions = {
  /* --------------------------- Celestial Bodies -------------------------- */
  setMeaning(id: string, meaning: CosmicBody['meaning']) {
    const b = bucket().bodies.find((x) => x.id === id);
    if (b) {
      b.meaning = meaning;
      notify();
    }
  },

  renameBody(id: string, name: string) {
    const b = bucket().bodies.find((x) => x.id === id);
    if (b && name.trim()) {
      b.name = name.trim();
      notify();
    }
  },

  setNote(id: string, note: string) {
    const b = bucket().bodies.find((x) => x.id === id);
    if (b) {
      b.note = note;
      notify();
    }
  },

  addBody(name: string, kind: BodyKind, meaning: Meaning): CosmicBody {
    const TAU = Math.PI * 2;
    const r = Math.random;
    const body: CosmicBody = {
      id: newId(),
      name,
      kind,
      meaning,
      note: '',
      createdAt: Date.now(),
      radius: procRadius(kind),
      clouds: kind === 'planet' && r() > 0.4,
      palette: procPalette(kind),
      orbit: {
        a: 170 + r() * 70,
        speed: TAU / (4000 + r() * 4000),
        phase: r() * TAU,
        ...inclinedOrbitElements(r, 0.4),
      },
    };
    bucket().bodies.push(body);
    notify();
    return body;
  },

  removeBody(id: string) {
    if (id === 'anchor' || id === 'eventide') return;
    bucket().bodies = bucket().bodies.filter((b) => b.id !== id);
    bucket().entries = bucket().entries.filter((e) => e.planetId !== id);
    bucket().connections = bucket().connections.filter((c) => c.a !== id && c.b !== id);
    notify();
  },

  deleteBody(id: string) {
    bodyActions.removeBody(id);
  },

  connect(a: string, b: string) {
    if (a === b) return;
    if (
      bucket().connections.some(
        (c) => (c.a === a && c.b === b) || (c.a === b && c.b === a)
      )
    )
      return;
    bucket().connections.push({ id: newId(), a, b, createdAt: Date.now() });
    notify();
  },

  disconnect(id: string) {
    bucket().connections = bucket().connections.filter((c) => c.id !== id);
    notify();
  },

};
