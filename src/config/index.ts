import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
    LoadedMainzConfig,
    MainzConfig,
    MainzTargetDefinition,
    MainzTargetViteAlias,
    MainzTargetViteOptions,
    NormalizedMainzConfig,
    NormalizedMainzTarget,
    NormalizedTargetBuildDefinition,
    NormalizedTargetBuildProfile,
    TargetBuildDefinition,
    TargetBuildProfileDefinition,
} from "./types.ts";
export { defineMainzConfig, defineTargetBuild } from "./definition.ts";

export async function loadMainzConfig(configPath = "mainz.config.ts"): Promise<LoadedMainzConfig> {
    const absolutePath = resolve(configPath);

    let module: Record<string, unknown>;
    try {
        module = await import(`${pathToFileURL(absolutePath).href}?t=${Date.now()}`);
    } catch (error) {
        throw new Error(
            `Could not load Mainz config at "${absolutePath}": ${toErrorMessage(error)}`,
        );
    }

    const exported = module.default;
    if (!exported || typeof exported !== "object") {
        throw new Error(
            `Mainz config "${absolutePath}" must export a default object.`,
        );
    }

    return {
        path: absolutePath,
        config: exported as MainzConfig,
    };
}

export function normalizeMainzConfig(input: MainzConfig): NormalizedMainzConfig {
    if (!Array.isArray(input.targets) || input.targets.length === 0) {
        throw new Error("Mainz config requires at least one target.");
    }

    const normalizedTargets = input.targets.map(normalizeTarget);
    assertUniqueTargetNames(normalizedTargets);

    return {
        targets: normalizedTargets,
    };
}

export function normalizeTargetBuildConfig(
    input: TargetBuildDefinition | undefined,
): NormalizedTargetBuildDefinition {
    const profiles = input?.profiles ?? {};
    const normalizedProfiles = Object.fromEntries(
        Object.entries(profiles).map((
            [name, profile],
        ) => [name, normalizeTargetBuildProfile(profile)]),
    );

    return {
        profiles: normalizedProfiles,
    };
}

function normalizeTarget(target: MainzTargetDefinition): NormalizedMainzTarget {
    if (!target.name?.trim()) {
        throw new Error("Every target must define a non-empty name.");
    }

    if (!target.rootDir?.trim()) {
        throw new Error(`Target "${target.name}" must define rootDir.`);
    }

    const viteConfig = target.viteConfig?.trim() || undefined;
    if (viteConfig && target.vite) {
        throw new Error(
            `Target "${target.name}" must not define both viteConfig and vite. Use viteConfig for full Vite control or vite for generated-config extensions.`,
        );
    }

    const outDir = target.outDir?.trim() || `dist/${target.name}`;

    return {
        ...target,
        appFile: target.appFile?.trim() || undefined,
        appId: target.appId?.trim() || undefined,
        viteConfig,
        vite: normalizeTargetViteOptions(target.name, target.vite),
        outDir,
    };
}

function normalizeTargetViteOptions(
    targetName: string,
    options: MainzTargetViteOptions | undefined,
): MainzTargetViteOptions | undefined {
    if (!options) {
        return undefined;
    }

    const alias = normalizeTargetViteAlias(targetName, options.alias);
    const define = normalizeTargetViteDefine(targetName, options.define);

    if (!alias && !define) {
        return undefined;
    }

    return {
        ...(alias ? { alias } : {}),
        ...(define ? { define } : {}),
    };
}

function normalizeTargetViteAlias(
    targetName: string,
    alias: MainzTargetViteOptions["alias"],
): MainzTargetViteOptions["alias"] | undefined {
    if (!alias) {
        return undefined;
    }

    if (Array.isArray(alias)) {
        const normalized = alias.map((entry) => normalizeTargetViteAliasEntry(targetName, entry));
        return normalized.length > 0 ? normalized : undefined;
    }

    const normalizedEntries = Object.entries(alias).map(([find, replacement]) => {
        const normalizedFind = find.trim();
        const normalizedReplacement = replacement.trim();
        assertAppAliasCanUseFind(targetName, normalizedFind);

        if (!normalizedReplacement) {
            throw new Error(
                `Target "${targetName}" vite.alias "${find}" must define a non-empty replacement.`,
            );
        }

        return [normalizedFind, normalizedReplacement] as const;
    });

    return normalizedEntries.length > 0 ? Object.fromEntries(normalizedEntries) : undefined;
}

function normalizeTargetViteAliasEntry(
    targetName: string,
    entry: MainzTargetViteAlias,
): MainzTargetViteAlias {
    const find = entry.find?.trim();
    const replacement = entry.replacement?.trim();
    assertAppAliasCanUseFind(targetName, find);

    if (!replacement) {
        throw new Error(
            `Target "${targetName}" vite.alias "${find}" must define a non-empty replacement.`,
        );
    }

    return { find, replacement };
}

function assertAppAliasCanUseFind(targetName: string, find: string): void {
    if (!find) {
        throw new Error(`Target "${targetName}" vite.alias entries must define a non-empty find.`);
    }

    if (find === "mainz" || find.startsWith("mainz/")) {
        throw new Error(
            `Target "${targetName}" vite.alias "${find}" cannot override Mainz framework aliases. Use viteConfig for full Vite control.`,
        );
    }
}

function normalizeTargetViteDefine(
    targetName: string,
    define: MainzTargetViteOptions["define"],
): MainzTargetViteOptions["define"] | undefined {
    if (!define) {
        return undefined;
    }

    const normalizedEntries = Object.entries(define).map(([key, value]) => {
        const normalizedKey = key.trim();
        if (!normalizedKey) {
            throw new Error(`Target "${targetName}" vite.define entries must use non-empty keys.`);
        }

        if (normalizedKey.startsWith("__MAINZ_")) {
            throw new Error(
                `Target "${targetName}" vite.define "${normalizedKey}" cannot override Mainz framework defines. Use viteConfig for full Vite control.`,
            );
        }

        if (typeof value !== "string") {
            throw new Error(
                `Target "${targetName}" vite.define "${normalizedKey}" must be a string replacement value.`,
            );
        }

        return [normalizedKey, value] as const;
    });

    return normalizedEntries.length > 0 ? Object.fromEntries(normalizedEntries) : undefined;
}

function normalizeTargetBuildProfile(profile: {
    basePath?: string;
    siteUrl?: string;
}): NormalizedTargetBuildProfile {
    return {
        basePath: normalizeBasePath(profile.basePath),
        siteUrl: normalizeSiteUrl(profile.siteUrl),
    };
}

function assertUniqueTargetNames(targets: NormalizedMainzTarget[]): void {
    const seen = new Set<string>();

    for (const target of targets) {
        const key = target.name.trim();
        if (seen.has(key)) {
            throw new Error(`Duplicate target name "${target.name}" in Mainz config.`);
        }

        seen.add(key);
    }
}

function normalizeBasePath(basePath: string | undefined): string | undefined {
    if (!basePath) {
        return undefined;
    }

    const trimmed = basePath.trim();
    if (!trimmed || trimmed === "/") {
        return "/";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeSiteUrl(siteUrl: string | undefined): string | undefined {
    if (!siteUrl) {
        return undefined;
    }

    const trimmed = siteUrl.trim();
    if (!trimmed) {
        return undefined;
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        throw new Error(`Invalid build profile siteUrl "${siteUrl}". Expected an absolute URL.`);
    }

    parsed.hash = "";
    parsed.search = "";

    return parsed.toString().replace(/\/+$/, "");
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export type {
    LoadedMainzConfig,
    MainzConfig,
    MainzTargetDefinition,
    MainzTargetViteAlias,
    MainzTargetViteOptions,
    NormalizedMainzConfig,
    NormalizedMainzTarget,
    NormalizedTargetBuildDefinition,
    NormalizedTargetBuildProfile,
    TargetBuildDefinition,
    TargetBuildProfileDefinition,
};
