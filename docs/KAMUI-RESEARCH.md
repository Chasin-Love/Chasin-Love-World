# KAMUI — RESEARCH DOSSIER
### The Mangekyō Sharingan's space–time ninjutsu, and the real physics it stands on
*Compiled 2026-09-27 for the KAMUI Dimensional Traversal Engine (Round 58). Sources listed inline.*

---

## 1. THE JUTSU (Naruto)

**Kamui** (神威, "authority of the gods") is the space–time ninjutsu of Obito Uchiha's Mangekyō Sharingan — one of the most powerful teleportation abilities in the series. Both of Obito's eyes (his right, and the left he gave to Kakashi) connect to the **same linked pocket dimension**; that shared dimension is the bridge.

**Two modes — both implemented in our engine:**

| Mode | Canon | Our mapping |
|---|---|---|
| **Short-range** (Obito's right eye) | Warps the user's own body (or anything touching them) into the dimension — granting intangibility while parts of the body coexist elsewhere | The **portal** profile: the traveler dives at a clicked body; also the "in-place" grammar of the reverse traversal |
| **Long-range** (Kakashi's left eye) | Warps any target within **line of sight**: a swirling vortex appears at the target and consumes it | The **warp** and **jump** profiles: the tear opens where the traveler stands (or at the stage boundary) and the throat carries them across |

**The signature visual** is the swirling vortex: space deforms into a logarithmic spiral that consumes the target. **The weakness/limit** (the ~5-minute intangibility cap, the shared-dimension counterattack) is the kind of rule that makes an ability feel real — ours is the law that *no scroll can ever cross between stages*.

Sources: [Narutopedia — Kamui](https://naruto.fandom.com/wiki/Kamui) · [Game Rant — Naruto: Kamui Explained](https://gamerant.com/naruto-kamui-explained) · [r/Naruto mechanics thread](https://www.reddit.com/r/Naruto/comments/qf7ppu/how_does_obitos_kamui_work_exactly)

---

## 2. THE PHYSICS (why every beat looks the way it does)

### 2.1 The swirl — accretion dynamics
Matter pulled toward a mass with angular momentum does not fall straight in: it spirals, forming an accretion flow with **differential (Keplerian) rotation** — inner regions orbit faster than the rim (our shader uses `angularVelocity ∝ r⁻⁰·⁵⁵`). The "bitter twist" the swirl needs is angular momentum, exactly as in the user's vision.

### 2.2 The bending of reality itself — frame dragging
A spinning mass drags spacetime around with it — the **Lense–Thirring effect**. Observed directly as the precession of a tidal-disruption debris disk around a supermassive black hole. This is why our **surface tear** (the `uKamuiErase` log-spiral warp of the sky dome) bends the *whole reality surface* around the sightline, not just nearby matter: the vacuum itself is swept.

### 2.3 Nearest-first stretching — tidal spaghettification
A star passing a black hole is torn apart by the tidal gradient: the near side is pulled harder than the far side (force ∝ 1/r³). Debris stretches into luminous streams, then wraps into a disk — a **tidal disruption event**. Our point-cloud suction (`uVortexS` smoothstep over `uVortexR`) is exactly a nearest-first consumption wave; the throat quad's "tidal streams" and "tear strands" are the same grammar.

### 2.4 The glowing throat — Morris–Thorne traversability
A traversable wormhole (Morris–Thorne metric) requires the **flare-out condition**, which via Einstein's equations forces a **violation of the null energy condition** — "exotic matter" with negative energy density at the throat. Physically, the throat *must* look bright and wrong. Hence the signature ramp — **violet → magenta → orange → gold → white-hot** — that the aperture, tunnel and exit always wear, while the pull/vortex stay in the reality's own palette (hybrid identity).

### 2.5 The exit — white hole
The time-reversal of a black hole: nothing can enter, everything is expelled. The user's own diagram is the whole story: **Galaxy 1 → Black Hole (entrance tear) → Wormhole (throat) → White Hole (ejection) → Galaxy 2**. Our EJECT beat replays the vortex in reverse (`uReverse`/`uVortexRev` = −1) with a radial sign flip that pushes instead of pulls.

### 2.6 Lore hook — ER = EPR
Maldacena & Susskind's conjecture ties entangled particles by microscopic wormholes; Maldacena & Qi built a *traversable* wormhole sustained by a quantum coupling rather than classical exotic matter. Beautiful banner text for our law: **isolated realities are entangled — Kamui is the coupling that makes the bridge traversable.**

Sources: [Tidal disruption event — Wikipedia](https://en.wikipedia.org/wiki/Tidal_disruption_event) · [Syracuse — Tidal Disruption Events](https://gravitationalwaves.syracuse.edu/tidal-disruption-events) · [Nature — Lense–Thirring precession after a TDE](https://www.scilit.com) · [arXiv — QPEs as Lense–Thirring precession](https://www.alphaxiv.org) · [arXiv — Morris–Thorne-type wormholes](https://arxiv.org) · [arXiv — Many-body quantum teleportation via the traversable wormhole protocol](https://arxiv.org/abs/2102.00010)

---

## 3. THE SEQUENCE (systems/kamuiPhases.ts)

**ARM → PULL → VORTEX → COLLAPSE → THROAT → EJECT → SETTLE**

| Beat | Physics | Visual |
|---|---|---|
| ARM | the field arms | gravity well blooms at the source |
| PULL | gravitation + frame dragging | the surface bends, clouds swept, bodies drawn in |
| VORTEX | differential rotation | violent swirl, tidal streams, the target caves |
| COLLAPSE | NEC violation begins | compression to a point, the exotic ring opens |
| THROAT | traversable wormhole | the ramp-colored tunnel; stage swaps mid-flight |
| EJECT | white hole | reverse-swirl burst, destination resolves |
| SETTLE | the field relaxes | displaced bodies return to their orbits |

Durations are adaptive per profile: portal ≈ 2.6 s, dive ≈ 3.2 s, jump ≈ 3.7 s, warp ≈ 4.7 s; reduced motion ≈ 0.9 s (no tunnel).

## 4. THE LAWS

1. **Isolated realities.** Other realities do not exist for a reality. The zoom dial hits the membrane at the web's ceiling and can only shimmer — the ONLY bridge between the Cosmic Web and the Multiverse is Kamui, fired by explicit actions.
2. **Bodies bend only during Kamui.** Bodies inside the field region (and the anchor star, if in range) are visually drawn toward the tear with a tidal shear — additive, recomputed from the raw Kepler position every frame, exactly zero at rest.
