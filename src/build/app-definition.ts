import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { NormalizedMainzTarget } from "../config/index.ts";
import {
    captureDefinedRoutedAppDuring,
    type RoutedAppDefinition,
    resolveRoutedAppDefinitionFromModuleExports,
} from "../navigation/index.ts";
import { resolveTargetAppFile } from "../routing/target-page-discovery.ts";

export async function loadTargetBuildRoutedAppDefinition(
    target: NormalizedMainzTarget,
    cwd: string,
): Promise<RoutedAppDefinition | undefined> {
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

        return resolveRoutedAppDefinitionFromModuleExports(moduleExports) ?? app;
    } catch (error) {
        throw new Error(
            `Could not load app definition from "${resolvedAppFile}": ${toErrorMessage(error)}`,
        );
    }
}

function normalizePathSlashes(path: string): string {
    return path.replaceAll("\\", "/");
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
