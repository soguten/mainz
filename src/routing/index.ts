export {
    inferFilesystemRoute,
    inferFilesystemRoutes,
    isFilesystemPageFile,
} from "./filesystem.ts";
export {
    buildSsgOutputEntries,
    buildTargetRouteManifest,
    shouldPrefixLocaleForRoute,
    toLocalePathSegment,
} from "./manifest.ts";

export type {
    BuildTargetRouteManifestInput,
    FilesystemRoute,
    FilesystemRoutingOptions,
    RouteManifestEntry,
    RouteSource,
    RenderMode,
    SsgOutputEntry,
    TargetDefinition,
    TargetRouteManifest,
} from "./types.ts";
