import { RealityConfig } from '../types';
import { chasinLoveSurface } from './surface';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const chasinLoveReality: RealityConfig = {
  id: "reality-mutjb6jm-z69j",
  name: "Chasin Love",
  codeName: "PARALLEL-1242",
  spectral: "Class B Tachyon Radiance",
  description: "world for testing",
  bubblePos: [0, 0, 0],
  bubbleSize: 7500,
  colorA: "#38bdf8",
  colorB: "#ec4899",
  starColor: "#38bdf8",
  bodies: [
  {
    "id": "anchor",
    "name": "CHASIN LOVE ANCHOR STAR",
    "kind": "star",
    "meaning": "chapter",
    "note": "Primary cosmic anchor star for the Chasin Love continuum.",
    "createdAt": 1687421033698,
    "radius": 4.8,
    "palette": {
      "deep": "#0f172a",
      "base": "#38bdf8",
      "high": "#ec4899",
      "atmo": "#38bdf8",
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
    "id": "reality-mutjb6jm-z69j-planet-1",
    "name": "Lumenor",
    "kind": "planet",
    "meaning": "memory",
    "note": "Celestial world in the Chasin Love system.",
    "createdAt": 1739261033698,
    "radius": 1.2,
    "rings": false,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#38bdf8",
      "high": "#e2e8f0",
      "atmo": "#38bdf8",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 38.24401878279596,
      "speed": 0.0044879895051282755,
      "phase": 1.5209190214846764,
      "incl": 0.07777516911357213,
      "node": 2.8684772590732757,
      "argP": 3.692736881271057
    }
  },
  {
    "id": "reality-mutjb6jm-z69j-vault",
    "name": "Chasin Eventide Singularity BLACK HOLE",
    "kind": "vault",
    "meaning": null,
    "note": "Isolated Eventide Black Hole (Vault). Stores, protects, and executes quantum memory data buffers in total isolation.",
    "createdAt": 1713341033698,
    "radius": 2.9,
    "palette": {
      "deep": "#000000",
      "base": "#0b0f19",
      "high": "#38bdf8",
      "atmo": "#ec4899",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 210,
      "speed": 0.0005235987755982988,
      "phase": 1.2,
      "incl": -0.1,
      "node": 6.131775870248455,
      "argP": 2.9359874813504234
    }
  }
],
  entries: [],
  galaxyCountHint: 1,
};

export * from './surface';
