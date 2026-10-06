import React from "react";
import ReactDOM from "react-dom/client";
import { perfMark } from "./platform/performance";
import { witnessDesktopBoot } from "./platform/desktop/bootWitness";
import { ErrorBoundary } from "./ui/bits";
import "./index.css";
import App from "./App.tsx";

perfMark('main-start');
/* R104 — the desktop boot witness: one honest line naming the GPU the
   webview actually got (web mode: isDesktop() is false, this is a no-op). */
witnessDesktopBoot();
/* root-level boundary: a render crash anywhere must reach the user as a
   visible card, never as a silent black void (the v15.0.0 lesson) */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="THE UNIVERSE">
    <App />
  </ErrorBoundary>
);
perfMark('react-mounted');
