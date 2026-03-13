import { I18nConfig } from "../i18n/index.ts";
import {
    ExplicitRouteDefinition,
    RenderMode,
    RenderModeInput,
    RoutingStrategy,
} from "../routing/index.ts";

export interface MainzRenderConfig {
    modes?: readonly RenderModeInput[];
}

export interface MainzTargetDefinition {
    name: string;
    rootDir: string;
    routes?: string;
    pagesDir?: string;
    routing?: RoutingStrategy;
    allowRoutingConflict?: boolean;
    locales?: readonly string[];
    outDir?: string;
    defaultMode?: RenderModeInput;
    viteConfig: string;
    routeDefinitions?: readonly ExplicitRouteDefinition[];
}

export interface MainzConfig {
    targets: readonly MainzTargetDefinition[];
    render?: MainzRenderConfig;
    i18n?: I18nConfig<string>;
}

export interface LoadedMainzConfig {
    path: string;
    config: MainzConfig;
}

export interface NormalizedMainzTarget extends Omit<MainzTargetDefinition, "defaultMode"> {
    defaultMode?: RenderMode;
    routing: RoutingStrategy;
    outDir: string;
}

export interface NormalizedMainzConfig {
    targets: NormalizedMainzTarget[];
    renderModes: RenderMode[];
    i18n?: I18nConfig<string>;
}
