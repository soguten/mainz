import { defineConfig, normalizePath } from "npm:vite";
import { fileURLToPath, URL } from "node:url";

const srcPath = normalizePath(fileURLToPath(new URL("./src/", import.meta.url)));

export default defineConfig({
    resolve: {
        alias: [
            { find: "@/", replacement: `${srcPath}/` },
            { find: "@components/", replacement: `${srcPath}/components/` },
            { find: "@jsx/", replacement: `${srcPath}/jsx/` },
        ],
    },
    build: {
        outDir: "build",
        emptyOutDir: true,
        lib: {
            entry: "./src/loader.ts",
            name: "Mainz",
            formats: ["es"],
            fileName: () => "loader.js",
        }
    },
    esbuild: {
        jsx: "automatic",
        jsxImportSource: "@jsx",
    },
});