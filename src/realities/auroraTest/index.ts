import { RealityConfig } from '../types';
import { auroraTestSurface } from './surface';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const auroraTestReality: RealityConfig = {
  id: "reality-mueznhkq-7j72",
  name: "Aurora Test",
  codeName: "UNIV-850-AUR",
  spectral: "Class G Star",
  description: "wave7 verification",
  bubblePos: [0, 0, 0],
  bubbleSize: 7500,
  colorA: "#ffaa55",
  colorB: "#55ccff",
  starColor: "#ffaa55",
  bodies: [
  {
    "id": "anchor",
    "name": "AURORA TEST ANCHOR STAR",
    "kind": "star",
    "meaning": "chapter",
    "note": "Primary cosmic anchor star for the Aurora Test continuum.",
    "createdAt": 1686541489082,
    "radius": 4.8,
    "palette": {
      "deep": "#0f172a",
      "base": "#ffaa55",
      "high": "#55ccff",
      "atmo": "#ffaa55",
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
    "id": "reality-mueznhkq-7j72-planet-1",
    "name": "Solaris",
    "kind": "planet",
    "meaning": "memory",
    "note": "Celestial world in the Aurora Test system.",
    "createdAt": 1738381489082,
    "radius": 1.2,
    "rings": false,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#ffaa55",
      "high": "#e2e8f0",
      "atmo": "#ffaa55",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 36.427805564295,
      "speed": 0.0044879895051282755,
      "phase": 4.992266421439091,
      "incl": 0.08143819607164886
    }
  },
  {
    "id": "reality-mueznhkq-7j72-planet-2",
    "name": "Vantress",
    "kind": "planet",
    "meaning": "dream",
    "note": "Celestial world in the Aurora Test system.",
    "createdAt": 1742701489082,
    "radius": 1.65,
    "rings": true,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#55ccff",
      "high": "#e2e8f0",
      "atmo": "#ffaa55",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 62.19082086658956,
      "speed": 0.0031415926535897933,
      "phase": 5.357180262035639,
      "incl": 0.07854954046122634
    }
  },
  {
    "id": "reality-mueznhkq-7j72-planet-3",
    "name": "Ondrim",
    "kind": "planet",
    "meaning": "project",
    "note": "Celestial world in the Aurora Test system.",
    "createdAt": 1747021489082,
    "radius": 2.1,
    "rings": false,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#ffaa55",
      "high": "#e2e8f0",
      "atmo": "#ffaa55",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 82.40212939545157,
      "speed": 0.00241660973353061,
      "phase": 2.226863836816141,
      "incl": -0.016553142638054175
    }
  },
  {
    "id": "reality-mueznhkq-7j72-vault",
    "name": "Aurora Eventide Singularity BLACK HOLE",
    "kind": "vault",
    "meaning": null,
    "note": "Isolated Eventide Black Hole (Vault). Stores, protects, and executes quantum memory data buffers in total isolation.",
    "createdAt": 1712461489082,
    "radius": 2.9,
    "palette": {
      "deep": "#000000",
      "base": "#0b0f19",
      "high": "#ffaa55",
      "atmo": "#55ccff",
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
