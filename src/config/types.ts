import { I18nConfig } from "../i18n/index.ts";
import {
    RenderMode,
    RenderModeInput,
} from "../routing/index.ts";

export interface MainzRenderConfig {
    modes?: readonly RenderModeInput[];
}

export interface MainzTargetDefinition {
    name: string;
    rootDir: string;
    pagesDir?: string;
    locales?: readonly string[];
    outDir?: string;
    defaultMode?: RenderModeInput;
    viteConfig: string;
    buildConfig?: string;
}

export interface TargetBuildProfileDefinition {
    basePath?: string;
    overridePageMode?: RenderModeInput;
}

export interface TargetBuildDefinition {
    profiles?: Record<string, TargetBuildProfileDefinition>;
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
    outDir: string;
}

export interface NormalizedTargetBuildProfile {
    basePath?: string;
    overridePageMode?: RenderMode;
}

export interface NormalizedTargetBuildDefinition {
    profiles: Record<string, NormalizedTargetBuildProfile>;
}

export interface NormalizedMainzConfig {
    targets: NormalizedMainzTarget[];
    renderModes: RenderMode[];
    i18n?: I18nConfig<string>;
}
