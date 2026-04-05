import type { NormalizedMainzTarget } from "../config/index.ts";
import type { BuildTargetRouteManifestInput } from "../routing/index.ts";
import type { DiscoveredPageDefinition } from "../routing/types.ts";

interface ResolveRouteManifestBuildInputOptions {
    target: NormalizedMainzTarget;
    filesystemPageFiles?: readonly string[];
    discoveredPages?: readonly DiscoveredPageDefinition[];
}

export function resolveRouteManifestBuildInput(
    options: ResolveRouteManifestBuildInputOptions,
): BuildTargetRouteManifestInput {
    return {
        target: options.target,
        filesystemPageFiles: options.filesystemPageFiles,
        // Keep discovered page modes intact so page-owned render decisions survive
        // route-manifest preparation. Filesystem routes default locally to "csr"
        // when no explicit file suffix provides a stronger signal.
        discoveredPages: options.discoveredPages,
    };
}
