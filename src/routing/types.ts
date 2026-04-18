import type { PageEntryDefinition, PageHeadDefinition } from "../components/page.ts";
import type { PageAuthorizationMetadata } from "../authorization/index.ts";

export type RenderMode = "csr" | "ssg";
export type NavigationMode = "spa" | "mpa" | "enhanced-mpa";
export type RouteSource = "filesystem";

export interface FilesystemRoutingOptions {
    pagesDir: string;
}

export interface FilesystemRoute {
    file: string;
    source: RouteSource;
    mode: RenderMode;
    path: string;
    pattern: string;
    routeKey: string;
}

export interface DiscoveredPageDefinition {
    file: string;
    exportName: string;
    path: string;
    mode: RenderMode;
    notFound?: boolean;
    head?: PageHeadDefinition;
    locales?: readonly string[];
    authorization?: PageAuthorizationMetadata;
}

export interface TargetDefinition {
    name: string;
    rootDir: string;
    pagesDir?: string;
    outDir?: string;
}

export interface RouteManifestEntry {
    id: string;
    source: RouteSource;
    file?: string;
    exportName?: string;
    path: string;
    pattern: string;
    mode: RenderMode;
    notFound?: boolean;
    locales: string[];
    head?: PageHeadDefinition;
    authorization?: PageAuthorizationMetadata;
}

export interface TargetRouteManifest {
    target: string;
    routes: RouteManifestEntry[];
}

export interface BuildTargetRouteManifestInput {
    target: TargetDefinition;
    appLocales?: readonly string[];
    appLocaleSource?: "i18n" | "documentLanguage";
    filesystemPageFiles?: readonly string[];
    discoveredPages?: readonly DiscoveredPageDefinition[];
}

export interface SsgOutputEntry {
    target: string;
    routeId: string;
    locale: string;
    outputHtmlPath: string;
    renderPath: string;
    params?: PageEntryDefinition["params"];
    notFound?: boolean;
}

export interface ResolvedSsgRouteEntry extends PageEntryDefinition {
    locale: string;
}
