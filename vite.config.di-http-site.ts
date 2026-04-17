import { defineConfig, normalizePath } from "vite";
import { fileURLToPath, URL } from "node:url";

const srcPath = normalizePath(fileURLToPath(new URL("./src/", import.meta.url)));
const base = process.env.MAINZ_BASE_PATH ?? "./";
const renderMode = process.env.MAINZ_RENDER_MODE ?? "csr";
const navigationMode = process.env.MAINZ_NAVIGATION_MODE ?? "spa";
const appLocales = JSON.parse(process.env.MAINZ_APP_LOCALES ?? "[]") as string[];
const defaultLocale = process.env.MAINZ_DEFAULT_LOCALE || undefined;
const localePrefix = process.env.MAINZ_LOCALE_PREFIX === "always" ? "always" : "except-default";
const siteUrl = process.env.MAINZ_SITE_URL || undefined;
const outputDir = process.env.MAINZ_OUT_DIR ?? `dist/examples/di-http-site/${renderMode}`;

export default defineConfig({
    appType: navigationMode === "spa" ? "spa" : "mpa",
    base,
    resolve: {
        alias: [
            { find: /^mainz\/typecase$/, replacement: `${srcPath}/typecase/index.ts` },
            { find: /^mainz\/jsx-runtime$/, replacement: `${srcPath}/jsx-runtime.ts` },
            { find: /^mainz\/jsx-dev-runtime$/, replacement: `${srcPath}/jsx-dev-runtime.ts` },
            { find: /^mainz\/di$/, replacement: `${srcPath}/di/index.ts` },
            { find: /^mainz\/http\/testing$/, replacement: `${srcPath}/http/testing.ts` },
            { find: /^mainz\/http$/, replacement: `${srcPath}/http/index.ts` },
            { find: /^mainz$/, replacement: `${srcPath}/index.ts` },
        ],
    },
    root: "examples/di-http-site",
    build: {
        outDir: normalizePath(fileURLToPath(new URL(outputDir, import.meta.url))),
        emptyOutDir: true,
        sourcemap: true,
    },
    define: {
        __MAINZ_RENDER_MODE__: JSON.stringify(renderMode),
        __MAINZ_NAVIGATION_MODE__: JSON.stringify(navigationMode),
        __MAINZ_TARGET_NAME__: JSON.stringify("di-http-site"),
        __MAINZ_BASE_PATH__: JSON.stringify(base),
        __MAINZ_APP_LOCALES__: JSON.stringify(appLocales),
        __MAINZ_DEFAULT_LOCALE__: JSON.stringify(defaultLocale),
        __MAINZ_LOCALE_PREFIX__: JSON.stringify(localePrefix),
        __MAINZ_SITE_URL__: JSON.stringify(siteUrl),
    },
    esbuild: {
        keepNames: true,
        jsx: "automatic",
        jsxImportSource: "mainz",
    },
});
