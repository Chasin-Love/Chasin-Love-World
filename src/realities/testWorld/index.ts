import { RealityConfig } from '../types';
import { testWorldSurface } from './surface';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const testWorldReality: RealityConfig = {
  id: "reality-mucxi73n-5z1p",
  name: "test world",
  codeName: "PARALLEL-2036",
  spectral: "Class B Blue Luminary · Binary Companion",
  description: "A newly synthesized custom universe branch within the sovereign multiverse.",
  bubblePos: [0, 0, 0],
  bubbleSize: 7500,
  colorA: "#00f5d4",
  colorB: "#8b5cf6",
  starColor: "#00f5d4",
  bodies: [
  {
    "id": "anchor",
    "name": "TEST WORLD ANCHOR STAR",
    "kind": "star",
    "meaning": "chapter",
    "note": "Primary cosmic anchor star for the test world continuum.",
    "createdAt": 1686416950643,
    "radius": 4.8,
    "palette": {
      "deep": "#0f172a",
      "base": "#00f5d4",
      "high": "#8b5cf6",
      "atmo": "#00f5d4",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 0,
      "speed": 0,
      "phase": 0,
      "incl": 0
    }
  },
  {
    "id": "reality-mucxi73n-5z1p-planet-1",
    "name": "Aethelgard",
    "kind": "planet",
    "meaning": "memory",
    "note": "Celestial world in the test world system.",
    "createdAt": 1738256950643,
    "radius": 1.2,
    "rings": false,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#00f5d4",
      "high": "#e2e8f0",
      "atmo": "#00f5d4",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 38.442905312851465,
      "speed": 0.0044879895051282755,
      "phase": 3.9621166884051737,
      "incl": 0.04316005413501718
    }
  },
  {
    "id": "reality-mucxi73n-5z1p-vault",
    "name": "test Eventide Singularity BLACK HOLE",
    "kind": "vault",
    "meaning": null,
    "note": "Isolated Eventide Black Hole (Vault). Stores, protects, and executes quantum memory data buffers in total isolation.",
    "createdAt": 1712336950643,
    "radius": 2.9,
    "palette": {
      "deep": "#000000",
      "base": "#0b0f19",
      "high": "#00f5d4",
      "atmo": "#8b5cf6",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 210,
      "speed": 0.0005235987755982988,
      "phase": 1.2,
      "incl": -0.1
    }
  }
],
  entries: [],
  galaxyCountHint: 1,
};

export * from './surface';
