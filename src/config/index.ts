import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { RenderMode, RenderModeInput } from "../routing/index.ts";
import {
    LoadedMainzConfig,
    MainzConfig,
    MainzTargetDefinition,
    NormalizedMainzConfig,
    NormalizedMainzTarget,
} from "./types.ts";

export function defineMainzConfig(config: MainzConfig): MainzConfig {
    return config;
}

export function defineRoutes<T>(routes: readonly T[]): readonly T[] {
    return routes;
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

    const normalizedTargets = input.targets.map(normalizeTarget);
    assertUniqueTargetNames(normalizedTargets);

    const requestedModes: RenderMode[] = input.render?.modes && input.render.modes.length > 0
        ? input.render.modes.map(normalizeRenderModeInput)
        : ["csr", "ssg"];

    const renderModes = dedupeRenderModes(requestedModes);

    return {
        targets: normalizedTargets,
        renderModes,
        i18n: input.i18n,
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

    const routing = target.routing ?? (target.routes ? "explicit" : "filesystem");
    const outDir = target.outDir?.trim() || `dist/${target.name}`;

    return {
        ...target,
        defaultMode: target.defaultMode ? normalizeRenderModeInput(target.defaultMode) : undefined,
        routing,
        outDir,
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

function dedupeRenderModes(modes: RenderMode[]): RenderMode[] {
    const allowed = new Set<RenderMode>(["csr", "ssg"]);
    const unique: RenderMode[] = [];
    const seen = new Set<RenderMode>();

    for (const mode of modes) {
        if (!allowed.has(mode)) {
            throw new Error(`Unsupported render mode "${mode}". Use "csr" or "ssg" (legacy alias: "spa").`);
        }

        if (seen.has(mode)) continue;
        seen.add(mode);
        unique.push(mode);
    }

    return unique;
}

function normalizeRenderModeInput(mode: RenderModeInput): RenderMode {
    if (mode === "spa") {
        return "csr";
    }

    return mode;
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
};
