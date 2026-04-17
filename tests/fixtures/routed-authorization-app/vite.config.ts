import { isAbsolute, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, normalizePath } from "vite";

const repoSrcPath = normalizePath(fileURLToPath(new URL("../../../src/", import.meta.url)));
const fixtureRoot = normalizePath(fileURLToPath(new URL("./", import.meta.url)));

const base = process.env.MAINZ_BASE_PATH ?? "./";
const renderMode = process.env.MAINZ_RENDER_MODE ?? "csr";
const navigationMode = process.env.MAINZ_NAVIGATION_MODE ?? "enhanced-mpa";
const targetName = process.env.MAINZ_TARGET_NAME ?? "routed-authorization-app";
const appLocales = JSON.parse(process.env.MAINZ_APP_LOCALES ?? "[]") as string[];
const defaultLocale = process.env.MAINZ_DEFAULT_LOCALE || undefined;
const localePrefix = process.env.MAINZ_LOCALE_PREFIX === "always" ? "always" : "except-default";
const siteUrl = process.env.MAINZ_SITE_URL || undefined;
const outputDir = process.env.MAINZ_OUT_DIR ?? `dist/${targetName}/${renderMode}`;
const resolvedOutputDir = isAbsolute(outputDir)
    ? normalizePath(outputDir)
    : normalizePath(resolve(fixtureRoot, outputDir));

export default defineConfig({
    appType: navigationMode === "spa" ? "spa" : "mpa",
    base,
    resolve: {
        alias: [
            { find: /^mainz\/jsx-runtime$/, replacement: `${repoSrcPath}/jsx-runtime.ts` },
            { find: /^mainz\/jsx-dev-runtime$/, replacement: `${repoSrcPath}/jsx-dev-runtime.ts` },
            { find: /^mainz\/i18n$/, replacement: `${repoSrcPath}/i18n/index.ts` },
            { find: /^mainz$/, replacement: `${repoSrcPath}/index.ts` },
        ],
    },
    root: fixtureRoot,
    build: {
        outDir: resolvedOutputDir,
        emptyOutDir: true,
        sourcemap: true,
    },
    define: {
        __MAINZ_RENDER_MODE__: JSON.stringify(renderMode),
        __MAINZ_NAVIGATION_MODE__: JSON.stringify(navigationMode),
        __MAINZ_TARGET_NAME__: JSON.stringify(targetName),
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
