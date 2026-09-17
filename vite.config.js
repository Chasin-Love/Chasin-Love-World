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
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          react: ["react", "react-dom", "react-router-dom", "framer-motion"],
        },
      },
    },
  },
});
