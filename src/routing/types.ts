import type { PageDefinition, PageHeadDefinition } from "../components/page.ts";

export type RenderMode = "csr" | "ssg";
export type RenderModeInput = RenderMode | "spa";
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

export interface DiscoveredPageDefinition extends Omit<PageDefinition, "mode"> {
    file: string;
    exportName: string;
    mode: RenderMode;
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
    defaultMode?: RenderModeInput;
}

export interface RouteManifestEntry {
    id: string;
    source: RouteSource;
    file?: string;
    exportName?: string;
    path: string;
    pattern: string;
    mode: RenderMode;
    locales: string[];
    head?: PageHeadDefinition;
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
}
