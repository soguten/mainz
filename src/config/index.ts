import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { NavigationMode } from "../routing/index.ts";
import {
    LoadedMainzConfig,
    MainzConfig,
    MainzTargetDefinition,
    NormalizedMainzConfig,
    NormalizedMainzTarget,
    NormalizedTargetBuildDefinition,
    NormalizedTargetBuildProfile,
    TargetBuildDefinition,
} from "./types.ts";

export function defineMainzConfig(config: MainzConfig): MainzConfig {
    return config;
}

export function defineTargetBuild(config: TargetBuildDefinition): TargetBuildDefinition {
    return config;
}

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

    if ("render" in (input as unknown as Record<string, unknown>)) {
        throw new Error(
            'Top-level render config is no longer supported. Remove "render.modes" and rely on page-owned render plus build recipe selection.',
        );
    }

    for (const target of input.targets) {
        if ("defaultNavigation" in (target as unknown as Record<string, unknown>)) {
            throw new Error(
                `Target "${target.name}" no longer supports "defaultNavigation". Routed app navigation now belongs in defineApp({ navigation }).`,
            );
        }

        if ("defaultMode" in (target as unknown as Record<string, unknown>)) {
            throw new Error(
                `Target "${target.name}" no longer supports "defaultMode". Page render is page-owned and defaults to "csr" when undecorated.`,
            );
        }

        if ("filesystemDefaultMode" in (target as unknown as Record<string, unknown>)) {
            throw new Error(
                `Target "${target.name}" no longer supports "filesystemDefaultMode". Filesystem routing now defaults locally to "csr" when no explicit render signal exists.`,
            );
        }
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

    if (!target.viteConfig?.trim()) {
        throw new Error(`Target "${target.name}" must define viteConfig.`);
    }

    const outDir = target.outDir?.trim() || `dist/${target.name}`;

    return {
        ...target,
        appFile: target.appFile?.trim() || undefined,
        authorization: normalizeTargetAuthorization(target.authorization),
        outDir,
    };
}

function normalizeTargetAuthorization(
    authorization: MainzTargetDefinition["authorization"],
): NormalizedMainzTarget["authorization"] {
    const policyNames = authorization?.policyNames
        ?.map((policyName) => policyName.trim())
        .filter((policyName) => policyName.length > 0);

    if (!policyNames?.length) {
        return undefined;
    }

    return {
        policyNames: [...new Set(policyNames)].sort((left, right) => left.localeCompare(right)),
    };
}

function normalizeTargetBuildProfile(profile: {
    basePath?: string;
    navigation?: NavigationMode;
    siteUrl?: string;
}): NormalizedTargetBuildProfile {
    if ("overrideNavigation" in (profile as unknown as Record<string, unknown>)) {
        throw new Error(
            'Target build profiles no longer support "overrideNavigation". Use "navigation" instead.',
        );
    }

    return {
        basePath: normalizeBasePath(profile.basePath),
        navigation: profile.navigation
            ? normalizeNavigationMode(profile.navigation)
            : undefined,
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

function normalizeNavigationMode(mode: NavigationMode): NavigationMode {
    const allowed = new Set<NavigationMode>(["spa", "mpa", "enhanced-mpa"]);
    if (!allowed.has(mode)) {
        throw new Error(
            `Unsupported navigation mode "${mode}". Use "spa", "mpa", or "enhanced-mpa".`,
        );
    }

    return mode;
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
    NormalizedMainzConfig,
    NormalizedMainzTarget,
    NormalizedTargetBuildDefinition,
    NormalizedTargetBuildProfile,
    TargetBuildDefinition,
};
