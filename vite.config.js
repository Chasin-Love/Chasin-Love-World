import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Monaco's exports map blocks Vite's `?worker` deep imports — map the
      // esm tree straight to disk so worker chunks can be bundled locally
      // (offline-first; the editor is never loaded from a CDN).
      "monaco-editor/esm": fileURLToPath(
        new URL("./node_modules/monaco-editor/esm", import.meta.url),
      ),
    },
  },
  optimizeDeps: {
    // Monaco ships valid ESM — pre-bundling its workers breaks dev mode.
    exclude: ["monaco-editor"],
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    watch: {
      /* The reality daemon + create-folder flow write reality modules into
         src/realities/ at runtime. The build-time reality glob picks those
         up and FULL-PAGE-RELOADS the dev app mid-warp — the engine state
         dies under the user (the "clicks bounce back to the galaxy stage"
         bug). Watcher-off: new disk realities go live on next boot, while
         the running session uses its in-state customRealities copy. */
      ignored: ["**/src/realities/**"],
    },
  },
  build: {
    /* The size floor is honest and stays LOW relative to what's left:
       after the R52 monaco purge (74 unused grammars + the LSP client
       removed — see monacoSetup.ts) the only chunks that can still cross
       it are Monaco's irreducible living core (~2.7 MB minified — its own
       CDN build is 3.5 MB; the standalone diff-editor machinery ships
       inside editor.api.js and cannot be import-pruned) and ts.worker
       (the TypeScript compiler itself — the price of real JS/TS
       intellisense; drops 6.5 MB if that feature is ever cut). Anything
       ELSE appearing above the floor is real fat: remove it, don't raise
       this. The committed docs/verify/bundle-baseline.txt is the regression
       gate — refresh it in the same commit and eyeball the delta. */
    chunkSizeWarningLimit: 4500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const p = id.replace(/\\/g, "/").split("node_modules/").pop();
          /* Monaco is deliberately NOT manual-chunked: its esm layers
             (base/platform ↔ editor ↔ languages) reference each other, and
             forcing them into hand-made chunks evaluates their bindings in a
             cross-chunk order Rollup cannot hoist — a TDZ ReferenceError at
             boot that black-screened the whole installed app (v15.0.0).
             Rollup's own placement is order-safe; Monaco rides the lazy
             vault chunk it is imported from. */
          const pkg = p.startsWith("@") ? p.split("/").slice(0, 2).join("/") : p.split("/")[0];
          if (pkg === "three") return "three";
          if (pkg === "react" || pkg === "react-dom" || pkg === "scheduler" || pkg === "framer-motion") return "react";
          return undefined;
        },
      },
    },
  },
});
