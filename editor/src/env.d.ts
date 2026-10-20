// src/env.d.ts
interface ImportMetaEnv {
  readonly VITE_APP_LIBRARY_URL: string;
  readonly EXCALIDRAW_PLUGIN_LIBRARIES_JSON_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
