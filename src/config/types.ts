import { NavigationMode } from "../routing/index.ts";
import { I18nConfig } from "../i18n/index.ts";

export interface MainzTargetAuthorizationDefinition {
    policyNames?: readonly string[];
}

export interface MainzTargetDefinition {
    name: string;
    rootDir: string;
    pagesDir?: string;
    appFile?: string;
    locales?: readonly string[];
    i18n?: Omit<I18nConfig<string>, "locales" | "detectLocale">;
    outDir?: string;
    defaultNavigation?: NavigationMode;
    authorization?: MainzTargetAuthorizationDefinition;
    viteConfig: string;
    buildConfig?: string;
}

export interface TargetBuildProfileDefinition {
    basePath?: string;
    overrideNavigation?: NavigationMode;
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

export interface NormalizedMainzTarget
    extends Omit<MainzTargetDefinition, "defaultNavigation"> {
    defaultNavigation?: NavigationMode;
    outDir: string;
    authorization?: {
        policyNames: string[];
    };
}

export interface NormalizedTargetBuildProfile {
    basePath?: string;
    overrideNavigation?: NavigationMode;
    siteUrl?: string;
}

export interface NormalizedTargetBuildDefinition {
    profiles: Record<string, NormalizedTargetBuildProfile>;
}

export interface NormalizedMainzConfig {
    targets: NormalizedMainzTarget[];
}
