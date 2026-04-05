/// <reference lib="deno.ns" />

import { join, resolve } from "node:path";
import type { NormalizedMainzConfig } from "../config/index.ts";
import type { NavigationMode, RenderMode } from "../routing/index.ts";
import {
    emitCsrRouteArtifacts,
    emitSsgArtifacts,
    resolveTargetI18nConfig,
} from "./artifacts.ts";
import type { BuildJob } from "./jobs.ts";
import { resolveEffectiveNavigationMode } from "./profiles.ts";

export async function runBuildJobs(
    config: NormalizedMainzConfig,
    jobs: BuildJob[],
    cwd = Deno.cwd(),
): Promise<void> {
    for (const job of jobs) {
        await runSingleBuild(config, job, cwd);
    }
}

export async function runSingleBuild(
    config: NormalizedMainzConfig,
    job: BuildJob,
    cwd = Deno.cwd(),
): Promise<void> {
    const modeOutDir = normalizePathSlashes(join(job.target.outDir, job.mode));
    const viteConfigPath = normalizePathSlashes(resolve(cwd, job.target.viteConfig));
    const navigationMode = await resolveEffectiveNavigationMode(job.target, job.profile, cwd);
    const targetI18n = resolveTargetI18nConfig(job.target);

    await runViteBuild({
        cwd,
        viteConfigPath,
        modeOutDir,
        renderMode: job.mode,
        navigationMode,
        targetName: job.target.name,
        basePath: resolveViteBasePath(job.profile.basePath, navigationMode),
        targetLocales: job.target.locales ?? [],
        defaultLocale: targetI18n?.defaultLocale,
        localePrefix: targetI18n?.localePrefix ?? "auto",
        siteUrl: job.profile.siteUrl,
    });

    if (job.mode === "ssg") {
        await emitSsgArtifacts(config, job, modeOutDir, cwd);
        return;
    }

    if (job.mode === "csr" && navigationMode !== "spa") {
        await emitCsrRouteArtifacts(config, job, modeOutDir, cwd);
    }
}

async function runViteBuild(args: {
    cwd: string;
    viteConfigPath: string;
    modeOutDir: string;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
    targetName: string;
    basePath: string;
    targetLocales: readonly string[];
    defaultLocale?: string;
    localePrefix: "auto" | "always";
    siteUrl?: string;
}): Promise<void> {
    const command = new Deno.Command("deno", {
        cwd: args.cwd,
        args: [
            "run",
            "-A",
            "npm:vite",
            "build",
            "--config",
            args.viteConfigPath,
        ],
        env: {
            MAINZ_OUT_DIR: args.modeOutDir,
            MAINZ_RENDER_MODE: args.renderMode,
            MAINZ_NAVIGATION_MODE: args.navigationMode,
            MAINZ_TARGET_NAME: args.targetName,
            MAINZ_BASE_PATH: args.basePath,
            MAINZ_TARGET_LOCALES: JSON.stringify(args.targetLocales),
            MAINZ_DEFAULT_LOCALE: args.defaultLocale ?? "",
            MAINZ_LOCALE_PREFIX: args.localePrefix,
            MAINZ_SITE_URL: args.siteUrl ?? "",
        },
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });

    const child = command.spawn();
    const status = await child.status;
    if (!status.success) {
        throw new Error(
            `Vite build failed for target "${args.targetName}" in "${args.renderMode}" mode.`,
        );
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
