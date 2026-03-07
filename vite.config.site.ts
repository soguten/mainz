import { defineConfig, normalizePath } from "vite";
import { fileURLToPath, URL } from "node:url";

const srcPath = normalizePath(fileURLToPath(new URL("./src/", import.meta.url)));

export default defineConfig({
    base: "/mainz/",
    resolve: {
        alias: [
            { find: /^mainz\/jsx-runtime$/, replacement: `${srcPath}/jsx-runtime.ts` },
            { find: /^mainz\/jsx-dev-runtime$/, replacement: `${srcPath}/jsx-dev-runtime.ts` },
            { find: /^mainz$/, replacement: `${srcPath}/index.ts` },
        ],
    },

    root: "site",
    build: {
        outDir: "../dist-site",
        emptyOutDir: true,
        sourcemap: true,
    },

    esbuild: {
        jsx: "automatic",
        jsxImportSource: "mainz",
    },
});
