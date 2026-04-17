import type { NormalizedMainzTarget } from "../config/index.ts";
import type { RoutedAppDefinition } from "../navigation/index.ts";
import type { BuildTargetRouteManifestInput } from "../routing/index.ts";
import type { DiscoveredPageDefinition } from "../routing/types.ts";

interface ResolveRouteManifestBuildInputOptions {
    target: NormalizedMainzTarget;
    appDefinition?: RoutedAppDefinition;
    filesystemPageFiles?: readonly string[];
    discoveredPages?: readonly DiscoveredPageDefinition[];
}

export function resolveRouteManifestBuildInput(
    options: ResolveRouteManifestBuildInputOptions,
): BuildTargetRouteManifestInput {
    const appLocales = options.appDefinition?.i18n?.locales ??
        (options.appDefinition?.documentLanguage
            ? [options.appDefinition.documentLanguage]
            : undefined);
    const appLocaleSource = options.appDefinition?.i18n
        ? "i18n"
        : options.appDefinition?.documentLanguage
        ? "documentLanguage"
        : undefined;

    return {
        target: options.target,
        appLocales,
        appLocaleSource,
        filesystemPageFiles: options.filesystemPageFiles,
        // Keep discovered page modes intact so page-owned render decisions survive
        // route-manifest preparation. Filesystem routes default locally to "csr"
        // when no explicit file suffix provides a stronger signal.
        discoveredPages: options.discoveredPages,
    };
}
