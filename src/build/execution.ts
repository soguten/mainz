import { join, resolve } from "node:path";
import type { NormalizedMainzConfig } from "../config/index.ts";
import type { NavigationMode, RenderMode } from "../routing/index.ts";
import { denoToolingPlatform } from "../tooling/platform/index.ts";
import type { MainzToolingPlatform } from "../tooling/platform/index.ts";
import { loadTargetBuildRoutedAppDefinition } from "./app-definition.ts";
import {
    emitCsrRouteArtifacts,
    emitCsrSpaAppShellMetadata,
    emitSsgArtifacts,
    resolveTargetI18nConfig,
} from "./artifacts.ts";
import type { BuildJob } from "./jobs.ts";
import type { ResolvedBuildProfile } from "./profiles.ts";
import { resolveEffectiveNavigationMode } from "./profiles.ts";
import { renderGeneratedViteConfigModule, resolveGeneratedViteConfig } from "./vite-config.ts";

export async function runBuildJobs(
    config: NormalizedMainzConfig,
    jobs: BuildJob[],
    cwd = denoToolingPlatform.cwd(),
    platform: MainzToolingPlatform = denoToolingPlatform,
): Promise<void> {
    for (const job of jobs) {
        await runSingleBuild(config, job, cwd, platform);
    }
}

export async function runSingleBuild(
    config: NormalizedMainzConfig,
    job: BuildJob,
    cwd = denoToolingPlatform.cwd(),
    platform: MainzToolingPlatform = denoToolingPlatform,
): Promise<void> {
    const modeOutDir = normalizePathSlashes(join(job.target.outDir, job.mode));
    const navigationMode = await resolveEffectiveNavigationMode(
        job.target,
        job.profile,
        cwd,
        platform,
    );
    const appDefinition = await loadTargetBuildRoutedAppDefinition(job.target, cwd, platform);
    const targetI18n = resolveTargetI18nConfig(appDefinition);
    const viteConfig = await resolveViteConfigPathForBuild({
        platform,
        cwd,
        job,
        modeOutDir,
        navigationMode,
        appLocales: appDefinition?.i18n?.locales ??
            (appDefinition?.documentLanguage ? [appDefinition.documentLanguage] : []),
        defaultLocale: targetI18n?.defaultLocale,
        localePrefix: targetI18n?.localePrefix ?? "except-default",
        siteUrl: job.profile.siteUrl,
        basePath: resolveViteBasePath(job.profile.basePath, navigationMode),
    });

    try {
        await runViteBuild({
            platform,
            cwd,
            viteConfigPath: viteConfig.path,
            modeOutDir,
            renderMode: job.mode,
            navigationMode,
            targetName: job.target.name,
            basePath: resolveViteBasePath(job.profile.basePath, navigationMode),
            appLocales: appDefinition?.i18n?.locales ??
                (appDefinition?.documentLanguage ? [appDefinition.documentLanguage] : []),
            defaultLocale: targetI18n?.defaultLocale,
            localePrefix: targetI18n?.localePrefix ?? "except-default",
            siteUrl: job.profile.siteUrl,
        });
    } finally {
        await viteConfig.cleanup?.();
    }

    if (job.mode === "ssg") {
        await emitSsgArtifacts(config, job, modeOutDir, cwd, platform);
        return;
    }

    if (job.mode === "csr" && navigationMode !== "spa") {
        await emitCsrRouteArtifacts(config, job, modeOutDir, cwd, platform);
        return;
    }

    if (job.mode === "csr" && navigationMode === "spa") {
        await emitCsrSpaAppShellMetadata({
            platform,
            modeOutDir,
            cwd,
            documentLanguage: targetI18n?.defaultLocale,
        });
    }
}

export async function runDevServer(args: {
    config: NormalizedMainzConfig;
    targetName: string;
    profile: ResolvedBuildProfile;
    host?: string | true;
    port?: number;
    cwd?: string;
    platform?: MainzToolingPlatform;
}): Promise<void> {
    const platform = args.platform ?? denoToolingPlatform;
    const cwd = args.cwd ?? platform.cwd();
    const target = args.config.targets.find((entry) => entry.name === args.targetName);
    if (!target) {
        throw new Error(`No target matched "${args.targetName}".`);
    }

    const navigationMode = await resolveEffectiveNavigationMode(
        target,
        args.profile,
        cwd,
        platform,
    );
    const appDefinition = await loadTargetBuildRoutedAppDefinition(target, cwd, platform);
    const targetI18n = resolveTargetI18nConfig(appDefinition);
    const modeOutDir = normalizePathSlashes(join(target.outDir, "csr"));
    const viteConfig = await resolveViteConfigPathForTarget({
        platform,
        cwd,
        target,
        modeOutDir,
        renderMode: "csr",
        navigationMode,
        appLocales: appDefinition?.i18n?.locales ??
            (appDefinition?.documentLanguage ? [appDefinition.documentLanguage] : []),
        defaultLocale: targetI18n?.defaultLocale,
        localePrefix: targetI18n?.localePrefix ?? "except-default",
        siteUrl: args.profile.siteUrl,
        basePath: resolveViteBasePath(args.profile.basePath, navigationMode),
    });

    try {
        await runViteDevServer({
            platform,
            cwd,
            viteConfigPath: viteConfig.path,
            targetName: target.name,
            host: args.host,
            port: args.port,
            navigationMode,
            basePath: resolveViteBasePath(args.profile.basePath, navigationMode),
            appLocales: appDefinition?.i18n?.locales ??
                (appDefinition?.documentLanguage ? [appDefinition.documentLanguage] : []),
            defaultLocale: targetI18n?.defaultLocale,
            localePrefix: targetI18n?.localePrefix ?? "except-default",
            siteUrl: args.profile.siteUrl,
            modeOutDir,
        });
    } finally {
        await viteConfig.cleanup?.();
    }
}

async function resolveViteConfigPathForBuild(args: {
    platform: MainzToolingPlatform;
    cwd: string;
    job: BuildJob;
    modeOutDir: string;
    navigationMode: NavigationMode;
    basePath: string;
    appLocales: readonly string[];
    defaultLocale?: string;
    localePrefix: "except-default" | "always";
    siteUrl?: string;
}): Promise<{ path: string; cleanup?: () => Promise<void> }> {
    if (args.job.target.viteConfig) {
        return {
            path: normalizePathSlashes(resolve(args.cwd, args.job.target.viteConfig)),
        };
    }

    return await resolveViteConfigPathForTarget({
        platform: args.platform,
        cwd: args.cwd,
        target: args.job.target,
        modeOutDir: args.modeOutDir,
        renderMode: args.job.mode,
        navigationMode: args.navigationMode,
        basePath: args.basePath,
        appLocales: args.appLocales,
        defaultLocale: args.defaultLocale,
        localePrefix: args.localePrefix,
        siteUrl: args.siteUrl,
    });
}

async function resolveViteConfigPathForTarget(args: {
    platform: MainzToolingPlatform;
    cwd: string;
    target: BuildJob["target"];
    modeOutDir: string;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
    basePath: string;
    appLocales: readonly string[];
    defaultLocale?: string;
    localePrefix: "except-default" | "always";
    siteUrl?: string;
}): Promise<{ path: string; cleanup?: () => Promise<void> }> {
    if (args.target.viteConfig) {
        return {
            path: normalizePathSlashes(resolve(args.cwd, args.target.viteConfig)),
        };
    }

    const tempDir = await createGeneratedViteConfigDir(args.cwd, args.platform);
    const viteConfigPath = normalizePathSlashes(resolve(tempDir, "vite.config.generated.mjs"));
    const generatedConfig = resolveGeneratedViteConfig({
        cwd: args.cwd,
        target: args.target,
        modeOutDir: args.modeOutDir,
        renderMode: args.renderMode,
        navigationMode: args.navigationMode,
        basePath: args.basePath,
        appLocales: args.appLocales,
        defaultLocale: args.defaultLocale,
        localePrefix: args.localePrefix,
        siteUrl: args.siteUrl,
    });

    await args.platform.writeTextFile(
        viteConfigPath,
        renderGeneratedViteConfigModule(generatedConfig, args.platform.name),
    );

    return {
        path: viteConfigPath,
        async cleanup() {
            await args.platform.remove(tempDir, { recursive: true });
        },
    };
}

export async function createGeneratedViteConfigDir(
    cwd: string,
    platform: MainzToolingPlatform,
): Promise<string> {
    if (platform.name === "node") {
        const tempDir = resolve(
            cwd,
            ".mainz",
            `vite-config-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        );
        await platform.mkdir(tempDir, { recursive: true });
        return tempDir;
    }

    return await platform.makeTempDir({
        prefix: "mainz-vite-config-",
    });
}

async function runViteBuild(args: {
    platform: MainzToolingPlatform;
    cwd: string;
    viteConfigPath: string;
    modeOutDir: string;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
    targetName: string;
    basePath: string;
    appLocales: readonly string[];
    defaultLocale?: string;
    localePrefix: "except-default" | "always";
    siteUrl?: string;
}): Promise<void> {
    const status = await args.platform.run({
        ...args.platform.resolveViteBuildCommand({
            viteConfigPath: args.viteConfigPath,
        }),
        cwd: args.cwd,
        env: {
            MAINZ_OUT_DIR: args.modeOutDir,
            MAINZ_RENDER_MODE: args.renderMode,
            MAINZ_NAVIGATION_MODE: args.navigationMode,
            MAINZ_TARGET_NAME: args.targetName,
            MAINZ_BASE_PATH: args.basePath,
            MAINZ_APP_LOCALES: JSON.stringify(args.appLocales),
            MAINZ_DEFAULT_LOCALE: args.defaultLocale ?? "",
            MAINZ_LOCALE_PREFIX: args.localePrefix,
            MAINZ_SITE_URL: args.siteUrl ?? "",
        },
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });
    if (!status.success) {
        throw new Error(
            `Vite build failed for target "${args.targetName}" in "${args.renderMode}" mode.`,
        );
    }
}

async function runViteDevServer(args: {
    platform: MainzToolingPlatform;
    cwd: string;
    viteConfigPath: string;
    targetName: string;
    host?: string | true;
    port?: number;
    navigationMode: NavigationMode;
    basePath: string;
    appLocales: readonly string[];
    defaultLocale?: string;
    localePrefix: "except-default" | "always";
    siteUrl?: string;
    modeOutDir: string;
}): Promise<void> {
    const status = await args.platform.run({
        ...args.platform.resolveViteDevCommand({
            viteConfigPath: args.viteConfigPath,
            host: args.host,
            port: args.port,
        }),
        cwd: args.cwd,
        env: {
            MAINZ_OUT_DIR: args.modeOutDir,
            MAINZ_RENDER_MODE: "csr",
            MAINZ_NAVIGATION_MODE: args.navigationMode,
            MAINZ_TARGET_NAME: args.targetName,
            MAINZ_BASE_PATH: args.basePath,
            MAINZ_APP_LOCALES: JSON.stringify(args.appLocales),
            MAINZ_DEFAULT_LOCALE: args.defaultLocale ?? "",
            MAINZ_LOCALE_PREFIX: args.localePrefix,
            MAINZ_SITE_URL: args.siteUrl ?? "",
        },
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });
    if (!status.success) {
        throw new Error(`Vite dev server failed for target "${args.targetName}".`);
    }
}

function toViteBasePath(basePath: string): string {
    return basePath === "/" ? "./" : basePath;
}

function resolveViteBasePath(basePath: string, navigationMode: NavigationMode): string {
    if (navigationMode === "spa") {
        return normalizeAbsoluteBasePath(basePath);
    }

    return toViteBasePath(basePath);
}

function normalizeAbsoluteBasePath(basePath: string): string {
    const trimmed = basePath.trim();
    if (!trimmed || trimmed === "." || trimmed === "./") {
        return "/";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizePathSlashes(path: string): string {
    return path.replaceAll("\\", "/");
}
