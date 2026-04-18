export interface MainzTargetDefinition {
    name: string;
    rootDir: string;
    pagesDir?: string;
    appFile?: string;
    appId?: string;
    outDir?: string;
    viteConfig?: string;
    vite?: MainzTargetViteOptions;
    buildConfig?: string;
}

export interface MainzTargetViteAlias {
    find: string;
    replacement: string;
}

export interface MainzTargetViteOptions {
    alias?: Record<string, string> | readonly MainzTargetViteAlias[];
    define?: Record<string, string>;
}

export interface TargetBuildProfileDefinition {
    basePath?: string;
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
    siteUrl?: string;
}

export interface NormalizedTargetBuildDefinition {
    profiles: Record<string, NormalizedTargetBuildProfile>;
}

export interface NormalizedMainzConfig {
    targets: NormalizedMainzTarget[];
}
