import { RealityConfig } from '../types';
import { chasinLoveSurface } from './surface';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const chasinLoveReality: RealityConfig = {
  id: 'reality-mubhhydu-i9vs',
  name: "Chasin Love",
  codeName: "test",
  spectral: "Class B Blue Luminary · Binary Companion",
  description: "A newly synthesized custom universe branch within the sovereign multiverse.",
  bubblePos: [0, 0, 0],
  bubbleSize: 7500,
  colorA: '#00f5d4',
  colorB: '#8b5cf6',
  starColor: '#00f5d4',
  bodies: [
  {
    "id": "anchor",
    "name": "CHASIN LOVE ANCHOR STAR",
    "kind": "star",
    "meaning": "chapter",
    "note": "Primary cosmic anchor star for the Chasin Love continuum.",
    "createdAt": 1686329599314,
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
    "id": "reality-mubhhydu-i9vs-planet-1",
    "name": "Aethelgard",
    "kind": "planet",
    "meaning": "memory",
    "note": "Celestial world in the Chasin Love system.",
    "createdAt": 1738169599314,
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
      "a": 37.03935115098669,
      "speed": 0.0044879895051282755,
      "phase": 4.708253226245804,
      "incl": 0.038493673210348724
    }
  },
  {
    "id": "reality-mubhhydu-i9vs-planet-2",
    "name": "Celestia",
    "kind": "planet",
    "meaning": "dream",
    "note": "Celestial world in the Chasin Love system.",
    "createdAt": 1742489599314,
    "radius": 1.65,
    "rings": true,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#8b5cf6",
      "high": "#e2e8f0",
      "atmo": "#00f5d4",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 62.95950903225247,
      "speed": 0.0031415926535897933,
      "phase": 6.234750513670057,
      "incl": -0.05811289453632468
    }
  },
  {
    "id": "reality-mubhhydu-i9vs-planet-3",
    "name": "Vesperion",
    "kind": "planet",
    "meaning": "project",
    "note": "Celestial world in the Chasin Love system.",
    "createdAt": 1746809599314,
    "radius": 2.1,
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
      "a": 80.46980516093757,
      "speed": 0.00241660973353061,
      "phase": 4.664294255836317,
      "incl": 0.00752629933541328
    }
  },
  {
    "id": "reality-mubhhydu-i9vs-planet-4",
    "name": "Chronos",
    "kind": "planet",
    "meaning": "idea",
    "note": "Celestial world in the Chasin Love system.",
    "createdAt": 1751129599314,
    "radius": 1.2,
    "rings": false,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#8b5cf6",
      "high": "#e2e8f0",
      "atmo": "#00f5d4",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 103.13149166372136,
      "speed": 0.001963495408493621,
      "phase": 2.1117353502647362,
      "incl": 0.00010824347282722746
    }
  },
  {
    "id": "reality-mubhhydu-i9vs-planet-5",
    "name": "Astraea",
    "kind": "planet",
    "meaning": "moment",
    "note": "Celestial world in the Chasin Love system.",
    "createdAt": 1755449599314,
    "radius": 1.65,
    "rings": true,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#00f5d4",
      "high": "#e2e8f0",
      "atmo": "#00f5d4",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 125.8596394206951,
      "speed": 0.0016534698176788386,
      "phase": 0.842950096453011,
      "incl": -0.06758463882263369
    }
  },
  {
    "id": "reality-mubhhydu-i9vs-vault",
    "name": "Chasin Eventide Singularity BLACK HOLE",
    "kind": "vault",
    "meaning": null,
    "note": "Isolated Eventide Black Hole (Vault). Stores, protects, and executes quantum memory data buffers in total isolation.",
    "createdAt": 1712249599314,
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
};

export * from './surface';
