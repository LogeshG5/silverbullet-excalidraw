import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { sassPlugin } from "esbuild-sass-plugin";

const emptyFile = path.resolve(__dirname, "src/empty.js");

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": {}, // optional: catch-all for other references
  },
  resolve: {
    alias: [
      {
        find: /.*Xiaolai-Regular.*\.(woff2|woff|ttf)$/,
        replacement: emptyFile,
      },
      {
        find: /^@excalidraw\/excalidraw$/,
        replacement: path.resolve(
          __dirname,
          "../excalidraw/packages/excalidraw/index.tsx",
        ),
      },
      {
        find: /^@excalidraw\/excalidraw\/(.*?)/,
        replacement: path.resolve(
          __dirname,
          "../excalidraw/packages/excalidraw/$1",
        ),
      },
      {
        find: /^@excalidraw\/utils$/,
        replacement: path.resolve(
          __dirname,
          "../excalidraw/packages/utils/src/index.ts",
        ),
      },
      {
        find: /^@excalidraw\/utils\/(.*?)/,
        replacement: path.resolve(
          __dirname,
          "../excalidraw/packages/utils/src/$1",
        ),
      },
    ],
  },
  plugins: [
    react(),

    sassPlugin({
      type: "css",
    }),
    {
      // works
      name: "remove-locales",
      enforce: "pre", // Run before Vite's internal asset plugins
      resolveId(id) {
        if (id.includes("locales/") && !id.includes("en.json")) {
          return "\0virtual:empty-locale";
        }
      },
      load(id) {
        if (id === "\0virtual:empty-locale") return "export default {}";
      },
    },
    visualizer({
      filename: "stats.html",
      template: "treemap", // or "sunburst"
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    assetsInlineLimit: 100000, // Prevents fonts/images from being base64-inlined
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
