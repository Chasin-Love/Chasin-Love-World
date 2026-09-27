import React from "react";
import ReactDOM from "react-dom/client";
import { perfMark } from "./platform/performance";
import { ErrorBoundary } from "./ui/bits";
import "./index.css";
import App from "./App.tsx";

perfMark('main-start');
/* root-level boundary: a render crash anywhere must reach the user as a
   visible card, never as a silent black void (the v15.0.0 lesson) */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="THE UNIVERSE">
    <App />
  </ErrorBoundary>
);
perfMark('react-mounted');
