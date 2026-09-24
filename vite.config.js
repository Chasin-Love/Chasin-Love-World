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
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          react: ["react", "react-dom", "framer-motion"],
        },
      },
    },
  },
});
