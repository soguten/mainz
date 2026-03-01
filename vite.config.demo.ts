import { defineConfig, normalizePath } from "npm:vite";
import { fileURLToPath, URL } from "node:url";

const distPath = normalizePath(fileURLToPath(new URL("./dist/", import.meta.url)));

export default defineConfig({
    resolve: {
        alias: [
            { find: /^mainz\/jsx-runtime$/, replacement: `${distPath}/jsx-runtime.js` },
            { find: /^mainz\/jsx-dev-runtime$/, replacement: `${distPath}/jsx-dev-runtime.js` },

            { find: /^mainz$/, replacement: `${distPath}/index.js` },
        ],
    },

    root: "demo",
    build: {
        outDir: "dist-demo",
        emptyOutDir: true,
        sourcemap: true,
    },

    esbuild: {
        jsx: "automatic",
        jsxImportSource: "mainz",
    },
});