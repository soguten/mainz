import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { NormalizedMainzTarget } from "../config/index.ts";
import {
    captureDefinedRoutedAppDuring,
    type DefinedApp,
    resolveDefinedAppDefinitionsFromModuleExports,
    resolveRoutedAppDefinitionsFromModuleExports,
    type RoutedAppDefinition,
} from "../navigation/index.ts";
import { resolveTargetAppFile } from "../routing/target-page-discovery.ts";

export async function loadTargetBuildAppDefinition(
    target: NormalizedMainzTarget,
    cwd: string,
): Promise<DefinedApp | undefined> {
    const appFile = resolveTargetAppFile(target, cwd);
    if (!appFile) {
        return undefined;
    }

    const resolvedAppFile = normalizePathSlashes(resolve(cwd, appFile));
    const moduleUrl = `${pathToFileURL(resolvedAppFile).href}?build-app=${Date.now()}-${
        Math.random().toString(36).slice(2)
    }`;

    try {
        const { value: moduleExports, app } = await captureDefinedRoutedAppDuring(async () => {
            return await import(moduleUrl) as Record<string, unknown>;
        });
        const candidates = resolveDefinedAppDefinitionsFromModuleExports(moduleExports);
        if (app && !candidates.includes(app)) {
            candidates.push(app);
        }

        if (!target.appId) {
            if (candidates.length === 0) {
                return undefined;
            }

            if (candidates.length === 1) {
                return candidates[0];
            }

            throw new Error(
                `Target "${target.name}" found multiple apps in "${resolvedAppFile}". Add appId to select one.`,
            );
        }

        const matchingCandidates = candidates.filter((candidate) => candidate.id === target.appId);
        if (matchingCandidates.length === 1) {
            return matchingCandidates[0];
        }

        if (matchingCandidates.length > 1) {
            throw new Error(
                `Target "${target.name}" selects appId "${target.appId}", but multiple apps with that id were found.`,
            );
        }

        throw new Error(
            `Target "${target.name}" selects appId "${target.appId}", but "${resolvedAppFile}" exports no app with that id.`,
        );
    } catch (error) {
        throw new Error(
            `Could not load app definition from "${resolvedAppFile}": ${toErrorMessage(error)}`,
        );
    }
}

export async function loadTargetBuildRoutedAppDefinition(
    target: NormalizedMainzTarget,
    cwd: string,
): Promise<RoutedAppDefinition | undefined> {
    const appDefinition = await loadTargetBuildAppDefinition(target, cwd);
    return appDefinition && "pages" in appDefinition ? appDefinition : undefined;
}

function normalizePathSlashes(path: string): string {
    return path.replaceAll("\\", "/");
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
