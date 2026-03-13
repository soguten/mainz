import { I18nConfig } from "../i18n/index.ts";

export type RenderMode = "csr" | "ssg";
export type RenderModeInput = RenderMode | "spa";
export type RoutingStrategy = "explicit" | "filesystem";
export type RouteSource = "explicit" | "filesystem";

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

export interface ExplicitRouteDefinition {
    id?: string;
    file?: string;
    path: string;
    mode: RenderModeInput;
    locales?: readonly string[];
}

export interface TargetDefinition {
    name: string;
    rootDir: string;
    routes?: string;
    pagesDir?: string;
    routing?: RoutingStrategy;
    allowRoutingConflict?: boolean;
    locales?: readonly string[];
    outDir?: string;
    defaultMode?: RenderModeInput;
}

export interface RouteManifestEntry {
    id: string;
    source: RouteSource;
    file?: string;
    path: string;
    pattern: string;
    mode: RenderMode;
    locales: string[];
}

export interface TargetRouteManifest {
    target: string;
    routes: RouteManifestEntry[];
}

export interface BuildTargetRouteManifestInput {
    target: TargetDefinition;
    explicitRoutes?: readonly ExplicitRouteDefinition[];
    filesystemPageFiles?: readonly string[];
    i18n?: Pick<I18nConfig<string>, "locales">;
    globalLocales?: readonly string[];
}

export interface SsgOutputEntry {
    target: string;
    routeId: string;
    locale: string;
    outputHtmlPath: string;
}
