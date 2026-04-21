/**
 * Configuration for one Mainz build/dev/test target.
 */
export interface MainzTargetDefinition {
    /** Unique target name used by CLI commands. */
    name: string;
    /** Root directory that contains the target app files. */
    rootDir: string;
    /** App definition module consumed by build, diagnostics, and dev tooling. */
    appFile?: string;
    /** App id selected from the exported app definitions. */
    appId?: string;
    /** Output directory for build artifacts. */
    outDir?: string;
    /** Advanced Vite config override for targets that need full control. */
    viteConfig?: string;
    /** Generated Vite config extensions for aliases and defines. */
    vite?: MainzTargetViteOptions;
    /** Optional build-profile module for this target. */
    buildConfig?: string;
}

/**
 * Vite alias entry used by generated Mainz Vite configs.
 */
export interface MainzTargetViteAlias {
    /** Alias matcher passed to Vite. */
    find: string;
    /** Alias replacement path passed to Vite. */
    replacement: string;
}

/**
 * Vite options supported by Mainz generated configs.
 */
export interface MainzTargetViteOptions {
    /** Additional aliases merged into the generated Vite config. */
    alias?: Record<string, string> | readonly MainzTargetViteAlias[];
    /** Additional define replacements merged into the generated Vite config. */
    define?: Record<string, string>;
}

/**
 * Publication profile options for a target build.
 */
export interface TargetBuildProfileDefinition {
    /** Public base path used by generated artifacts. */
    basePath?: string;
    /** Absolute site URL used for publication metadata and SEO output. */
    siteUrl?: string;
}

/**
 * Build profile configuration for a target.
 */
export interface TargetBuildDefinition {
    /** Named build profiles such as production or gh-pages. */
    profiles?: Record<string, TargetBuildProfileDefinition>;
}

/**
 * Root Mainz project configuration.
 */
export interface MainzConfig {
    /** Targets known to Mainz CLI commands. */
    targets: readonly MainzTargetDefinition[];
}

/**
 * Loaded Mainz config with its resolved source path.
 */
export interface LoadedMainzConfig {
    /** Absolute path to the config file that was loaded. */
    path: string;
    /** Parsed config object exported from the config file. */
    config: MainzConfig;
}

/**
 * Normalized target definition used by build and dev internals.
 */
export interface NormalizedMainzTarget extends MainzTargetDefinition {
    /** Normalized output directory. */
    outDir: string;
}

/**
 * Normalized build profile used by publication-aware commands.
 */
export interface NormalizedTargetBuildProfile {
    /** Normalized public base path. */
    basePath?: string;
    /** Normalized absolute site URL. */
    siteUrl?: string;
}

/**
 * Normalized target build configuration.
 */
export interface NormalizedTargetBuildDefinition {
    /** Normalized named build profiles. */
    profiles: Record<string, NormalizedTargetBuildProfile>;
}

/**
 * Normalized root Mainz project configuration.
 */
export interface NormalizedMainzConfig {
    /** Normalized target definitions. */
    targets: NormalizedMainzTarget[];
}
