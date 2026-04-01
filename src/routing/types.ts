import type { PageEntryDefinition, PageHeadDefinition } from "../components/page.ts";
import type { PageAuthorizationMetadata } from "../authorization/index.ts";

export type RenderMode = "csr" | "ssg";
export type NavigationMode = "spa" | "mpa" | "enhanced-mpa";
export type RouteSource = "filesystem";

export interface FilesystemRoutingOptions {
    pagesDir: string;
    defaultMode: RenderMode;
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
    hasExplicitRenderMode?: boolean;
    notFound?: boolean;
    declaredRoutePath?: string;
    head?: PageHeadDefinition;
    locales?: readonly string[];
    authorization?: PageAuthorizationMetadata;
}

export interface TargetDefinition {
    name: string;
    rootDir: string;
    pagesDir?: string;
    locales?: readonly string[];
    i18n?: {
        defaultLocale?: string;
        localePrefix?: "auto" | "always";
        fallbackLocale?: string;
    };
    outDir?: string;
    defaultMode?: RenderMode;
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
