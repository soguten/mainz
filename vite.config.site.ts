import { defineConfig, normalizePath } from "vite";
import { fileURLToPath, URL } from "node:url";

const srcPath = normalizePath(fileURLToPath(new URL("./src/", import.meta.url)));

const base = process.env.MAINZ_BASE_PATH ?? "./";
const renderMode = process.env.MAINZ_RENDER_MODE ?? "csr";
const navigationMode = process.env.MAINZ_NAVIGATION_MODE ?? "enhanced-mpa";
const targetLocales = JSON.parse(process.env.MAINZ_TARGET_LOCALES ?? "[]") as string[];
const defaultLocale = process.env.MAINZ_DEFAULT_LOCALE || undefined;
const localePrefix = process.env.MAINZ_LOCALE_PREFIX === "always" ? "always" : "auto";
const siteUrl = process.env.MAINZ_SITE_URL || undefined;
const outputDir = process.env.MAINZ_OUT_DIR ?? `dist/site/${renderMode}`;

export default defineConfig({
    appType: navigationMode === "spa" ? "spa" : "mpa",
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
        __MAINZ_NAVIGATION_MODE__: JSON.stringify(navigationMode),
        __MAINZ_TARGET_NAME__: JSON.stringify("site"),
        __MAINZ_BASE_PATH__: JSON.stringify(base),
        __MAINZ_TARGET_LOCALES__: JSON.stringify(targetLocales),
        __MAINZ_DEFAULT_LOCALE__: JSON.stringify(defaultLocale),
        __MAINZ_LOCALE_PREFIX__: JSON.stringify(localePrefix),
        __MAINZ_SITE_URL__: JSON.stringify(siteUrl),
    },

    esbuild: {
        jsx: "automatic",
        jsxImportSource: "mainz",
    },
});
