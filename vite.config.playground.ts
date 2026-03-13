import { defineConfig, normalizePath } from "vite";
import { fileURLToPath, URL } from "node:url";

const srcPath = normalizePath(fileURLToPath(new URL("./src/", import.meta.url)));
const base = "./";
const renderMode = process.env.MAINZ_RENDER_MODE ?? "csr";
const outputDir = process.env.MAINZ_OUT_DIR ?? `dist/playground/${renderMode}`;

export default defineConfig({
    appType: "spa",
    base,
    resolve: {
        alias: [
            { find: /^mainz\/jsx-runtime$/, replacement: `${srcPath}/jsx-runtime.ts` },
            { find: /^mainz\/jsx-dev-runtime$/, replacement: `${srcPath}/jsx-dev-runtime.ts` },
            { find: /^mainz$/, replacement: `${srcPath}/index.ts` },
        ],
    },

    root: "playground",
    build: {
        outDir: normalizePath(fileURLToPath(new URL(outputDir, import.meta.url))),
        emptyOutDir: true,
        sourcemap: true,
    },

    define: {
        __MAINZ_RENDER_MODE__: JSON.stringify(renderMode),
        __MAINZ_TARGET_NAME__: JSON.stringify("playground"),
    },

    esbuild: {
        jsx: "automatic",
        jsxImportSource: "mainz",
    },
});
