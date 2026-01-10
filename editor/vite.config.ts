import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const emptyFile = path.resolve(__dirname, "src/empty.js");

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": {}, // optional: catch-all for other references
  },
  resolve: {
    alias: [],
  },
  plugins: [
    react(),
    { // Remove locales except english
      name: "remove-locales",
      enforce: "pre", // Run before Vite's internal asset plugins
      resolveId(id) {
        if (id.includes("locales/") && !id.includes("en.json")) {
          return "\0virtual:empty-locale";
        }
      },
      load(id) {
        if (id === "\0virtual:empty-locale") return "export default {}";
      }
    },
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      name: "Editor", // global variable name for IIFE
      formats: ["iife"], // single IIFE file
      fileName: () => "editor.js",
    },
    minify: true,
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      external: ["@excalidraw/mermaid-to-excalidraw"], // keep external fonts external
    },
  },
});
