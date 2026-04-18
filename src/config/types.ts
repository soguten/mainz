import { NavigationMode } from "../routing/index.ts";

export interface MainzTargetDefinition {
    name: string;
    rootDir: string;
    pagesDir?: string;
    appFile?: string;
    appId?: string;
    outDir?: string;
    viteConfig: string;
    buildConfig?: string;
}

export interface TargetBuildProfileDefinition {
    basePath?: string;
    navigation?: NavigationMode;
    siteUrl?: string;
}

export interface TargetBuildDefinition {
    profiles?: Record<string, TargetBuildProfileDefinition>;
}

export interface MainzConfig {
    targets: readonly MainzTargetDefinition[];
}

export interface LoadedMainzConfig {
    path: string;
    config: MainzConfig;
}

export interface NormalizedMainzTarget extends MainzTargetDefinition {
    outDir: string;
}

export interface NormalizedTargetBuildProfile {
    basePath?: string;
    navigation?: NavigationMode;
    siteUrl?: string;
}

export interface NormalizedTargetBuildDefinition {
    profiles: Record<string, NormalizedTargetBuildProfile>;
}

export interface NormalizedMainzConfig {
    targets: NormalizedMainzTarget[];
}
