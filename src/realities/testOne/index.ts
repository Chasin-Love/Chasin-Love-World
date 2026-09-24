import { RealityConfig } from '../types';
import { testOneSurface } from './surface';

const day = 86400000;
const now = Date.now();
const TAU = Math.PI * 2;

export const testOneReality: RealityConfig = {
  id: "reality-muey9188-ayqk",
  name: "Test One",
  codeName: "UNIV-157-TES",
  spectral: "Quantum Foam",
  description: "repro",
  bubblePos: [0, 0, 0],
  bubbleSize: 7500,
  colorA: "#ff8844",
  colorB: "#44aaff",
  starColor: "#ff8844",
  bodies: [
  {
    "id": "anchor",
    "name": "TEST ONE ANCHOR STAR",
    "kind": "star",
    "meaning": "chapter",
    "note": "Primary cosmic anchor star for the Test One continuum.",
    "createdAt": 1686539135096,
    "radius": 4.8,
    "palette": {
      "deep": "#0f172a",
      "base": "#ff8844",
      "high": "#44aaff",
      "atmo": "#ff8844",
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
    "id": "reality-muey9188-ayqk-planet-1",
    "name": "Cindara",
    "kind": "planet",
    "meaning": "memory",
    "note": "Celestial world in the Test One system.",
    "createdAt": 1738379135096,
    "radius": 1.2,
    "rings": false,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#ff8844",
      "high": "#e2e8f0",
      "atmo": "#ff8844",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 35.244617706995996,
      "speed": 0.0044879895051282755,
      "phase": 2.8662224534355265,
      "incl": 0.03161691044783301
    }
  },
  {
    "id": "reality-muey9188-ayqk-planet-2",
    "name": "Orivane",
    "kind": "planet",
    "meaning": "dream",
    "note": "Celestial world in the Test One system.",
    "createdAt": 1742699135096,
    "radius": 1.65,
    "rings": true,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#44aaff",
      "high": "#e2e8f0",
      "atmo": "#ff8844",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 57.56469422621439,
      "speed": 0.0031415926535897933,
      "phase": 3.8949803270839034,
      "incl": -0.017424640821822324
    }
  },
  {
    "id": "reality-muey9188-ayqk-planet-3",
    "name": "Solaris",
    "kind": "planet",
    "meaning": "project",
    "note": "Celestial world in the Test One system.",
    "createdAt": 1747019135096,
    "radius": 2.1,
    "rings": false,
    "clouds": true,
    "palette": {
      "deep": "#030712",
      "base": "#ff8844",
      "high": "#e2e8f0",
      "atmo": "#ff8844",
      "ice": "#ffffff"
    },
    "orbit": {
      "a": 81.2526354312863,
      "speed": 0.00241660973353061,
      "phase": 0.5107362650729582,
      "incl": 0.020105429093079566
    }
  },
  {
    "id": "reality-muey9188-ayqk-vault",
    "name": "Test Eventide Singularity BLACK HOLE",
    "kind": "vault",
    "meaning": null,
    "note": "Isolated Eventide Black Hole (Vault). Stores, protects, and executes quantum memory data buffers in total isolation.",
    "createdAt": 1712459135096,
    "radius": 2.9,
    "palette": {
      "deep": "#000000",
      "base": "#0b0f19",
      "high": "#ff8844",
      "atmo": "#44aaff",
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
