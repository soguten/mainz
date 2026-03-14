import { defineConfig, normalizePath } from "vite";
import { fileURLToPath, URL } from "node:url";

const srcPath = normalizePath(fileURLToPath(new URL("./src/", import.meta.url)));

const base = process.env.MAINZ_BASE_PATH ?? "./";
const renderMode = process.env.MAINZ_RENDER_MODE ?? "csr";
const outputDir = process.env.MAINZ_OUT_DIR ?? `dist/site/${renderMode}`;

export default defineConfig({
    appType: renderMode === "ssg" ? "mpa" : "spa",
    base,
    resolve: {
        alias: [
            { find: /^mainz\/jsx-runtime$/, replacement: `${srcPath}/jsx-runtime.ts` },
            { find: /^mainz\/jsx-dev-runtime$/, replacement: `${srcPath}/jsx-dev-runtime.ts` },
            { find: /^mainz\/i18n$/, replacement: `${srcPath}/i18n/index.ts` },
            { find: /^mainz$/, replacement: `${srcPath}/index.ts` },
        ],
    },

    root: "site",
    build: {
        outDir: normalizePath(fileURLToPath(new URL(outputDir, import.meta.url))),
        emptyOutDir: true,
        sourcemap: true,
    },

    define: {
        __MAINZ_RENDER_MODE__: JSON.stringify(renderMode),
        __MAINZ_TARGET_NAME__: JSON.stringify("site"),
        __MAINZ_BASE_PATH__: JSON.stringify(base),
    },

    esbuild: {
        jsx: "automatic",
        jsxImportSource: "mainz",
    },
});
