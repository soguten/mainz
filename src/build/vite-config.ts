import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { NormalizedMainzTarget } from "../config/index.ts";
import { MAINZ_PUBLIC_ENTRYPOINTS } from "../config/public-entrypoints.ts";
import type { NavigationMode, RenderMode } from "../routing/index.ts";

export interface GeneratedViteAlias {
    find: string;
    replacement: string;
    framework: boolean;
}

export interface GeneratedViteConfigInput {
    cwd: string;
    target: NormalizedMainzTarget;
    modeOutDir: string;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
    basePath: string;
    appLocales: readonly string[];
    defaultLocale?: string;
    localePrefix: "except-default" | "always";
    siteUrl?: string;
}

export interface GeneratedViteConfig {
    root: string;
    base: string;
    appType: "spa" | "mpa";
    outDir: string;
    aliases: readonly GeneratedViteAlias[];
    define: Record<string, string>;
}

export function resolveGeneratedViteConfig(input: GeneratedViteConfigInput): GeneratedViteConfig {
    return {
        root: normalizePathSlashes(resolve(input.cwd, input.target.rootDir)),
        base: input.basePath,
        appType: input.navigationMode === "spa" ? "spa" : "mpa",
        outDir: normalizePathSlashes(resolve(input.cwd, input.modeOutDir)),
        aliases: [
            ...resolveFrameworkAliases(input.cwd),
            ...resolveTargetAliases(input.cwd, input.target),
        ],
        define: {
            __MAINZ_RENDER_MODE__: JSON.stringify(input.renderMode),
            __MAINZ_NAVIGATION_MODE__: JSON.stringify(input.navigationMode),
            __MAINZ_TARGET_NAME__: JSON.stringify(input.target.name),
            __MAINZ_BASE_PATH__: JSON.stringify(input.basePath),
            __MAINZ_APP_LOCALES__: JSON.stringify(input.appLocales),
            __MAINZ_DEFAULT_LOCALE__: JSON.stringify(input.defaultLocale),
            __MAINZ_LOCALE_PREFIX__: JSON.stringify(input.localePrefix),
            __MAINZ_SITE_URL__: JSON.stringify(input.siteUrl),
            ...input.target.vite?.define,
        },
    };
}

export function renderGeneratedViteConfigModule(config: GeneratedViteConfig): string {
    const aliases = config.aliases.map((alias) => {
        if (alias.framework) {
            return `{ find: ${renderExactSpecifierRegex(alias.find)}, replacement: ${
                JSON.stringify(alias.replacement)
            } }`;
        }

        return `{ find: ${JSON.stringify(alias.find)}, replacement: ${
            JSON.stringify(alias.replacement)
        } }`;
    });

    return [
        `import { defineConfig } from "npm:vite";`,
        ``,
        `export default defineConfig({`,
        `    appType: ${JSON.stringify(config.appType)},`,
        `    base: ${JSON.stringify(config.base)},`,
        `    resolve: {`,
        `        alias: [`,
        ...aliases.map((alias) => `            ${alias},`),
        `        ],`,
        `    },`,
        `    root: ${JSON.stringify(config.root)},`,
        `    build: {`,
        `        outDir: ${JSON.stringify(config.outDir)},`,
        `        emptyOutDir: true,`,
        `        sourcemap: true,`,
        `    },`,
        `    define: ${renderObjectLiteral(config.define, 4)},`,
        `    esbuild: {`,
        `        keepNames: true,`,
        `        jsx: "automatic",`,
        `        jsxImportSource: "mainz",`,
        `    },`,
        `});`,
        ``,
    ].join("\n");
}

function resolveFrameworkAliases(cwd: string): GeneratedViteAlias[] {
    return MAINZ_PUBLIC_ENTRYPOINTS
        .map((entrypoint) => ({
            find: entrypoint.specifier,
            replacement: normalizePathSlashes(resolve(cwd, entrypoint.sourcePath)),
            framework: true,
        }))
        .filter((alias) => existsSync(alias.replacement));
}

function resolveTargetAliases(
    cwd: string,
    target: NormalizedMainzTarget,
): GeneratedViteAlias[] {
    const alias = target.vite?.alias;
    if (!alias) {
        return [];
    }

    if (Array.isArray(alias)) {
        return alias.map((entry) => ({
            find: entry.find,
            replacement: normalizeAliasReplacement(cwd, entry.replacement),
            framework: false,
        }));
    }

    return Object.entries(alias).map(([find, replacement]) => ({
        find,
        replacement: normalizeAliasReplacement(cwd, replacement),
        framework: false,
    }));
}

function normalizeAliasReplacement(cwd: string, replacement: string): string {
    if (
        replacement.startsWith(".") || replacement.startsWith("/") ||
        replacement.startsWith("\\") || isAbsolute(replacement)
    ) {
        return normalizePathSlashes(resolve(cwd, replacement));
    }

    return replacement;
}

function renderObjectLiteral(record: Record<string, string>, indent: number): string {
    const entries = Object.entries(record);
    if (entries.length === 0) {
        return "{}";
    }

    const padding = " ".repeat(indent);
    const entryPadding = " ".repeat(indent + 4);
    return [
        `{`,
        ...entries.map(([key, value]) =>
            `${entryPadding}${JSON.stringify(key)}: ${JSON.stringify(value)},`
        ),
        `${padding}}`,
    ].join("\n");
}

function renderExactSpecifierRegex(specifier: string): string {
    return `/${escapeRegex(specifier)}$/`;
}

function escapeRegex(value: string): string {
    return `^${value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}`;
}

function normalizePathSlashes(path: string): string {
    return path.replaceAll("\\", "/");
}
