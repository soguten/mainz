import { resolve } from "node:path";
import type { NormalizedMainzConfig } from "../config/index.ts";
import type { NavigationMode } from "../routing/index.ts";
import { denoToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import { loadTargetBuildRoutedAppDefinition } from "./app-definition.ts";
import {
  emitRouteArtifacts,
  resolveTargetI18nConfig,
} from "./artifacts.ts";
import type { BuildJob } from "./jobs.ts";
import type { ResolvedBuildProfile } from "./profiles.ts";
import {
  resolveEffectiveNavigationMode,
  resolvePublicationBrowserOutDir,
  resolvePublicationServerOutDir,
} from "./profiles.ts";
import { resolveViteConfigArtifact } from "./vite-resolution.ts";
import { resolveRoutePrerenderContext } from "./prerender-context.ts";
import { resolveTargetAppFile } from "../routing/target-page-discovery.ts";

export async function runBuildJobs(
  config: NormalizedMainzConfig,
  jobs: BuildJob[],
  cwd: string = denoToolingRuntime.cwd(),
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
  for (const job of jobs) {
    await runSingleBuild(config, job, cwd, runtime);
  }
}

export async function runSingleBuild(
  config: NormalizedMainzConfig,
  job: BuildJob,
  cwd: string = denoToolingRuntime.cwd(),
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
  const browserOutputDir = normalizePathSlashes(
    resolvePublicationBrowserOutDir(job.target.outDir),
  );
  const navigationMode = await resolveEffectiveNavigationMode(
    job.target,
    job.profile,
    cwd,
    runtime,
  );
  const appDefinition = await loadTargetBuildRoutedAppDefinition(
    job.target,
    cwd,
    runtime,
  );
  const targetI18n = resolveTargetI18nConfig(appDefinition);
  const appLocales = appDefinition?.i18n?.locales ?? [];
  const viteConfig = await resolveViteConfigPathForBuild({
    runtime,
    cwd,
    job,
    outputDir: browserOutputDir,
    navigationMode,
    appLocales,
    defaultLocale: targetI18n?.defaultLocale,
    localePrefix: targetI18n?.localePrefix ?? "except-default",
    siteUrl: job.profile.siteUrl,
    basePath: resolveViteBasePath(job.profile.basePath, navigationMode),
  });

  try {
    await runViteBuild({
      runtime,
      cwd,
      viteConfigPath: viteConfig.path,
      outputDir: browserOutputDir,
      navigationMode,
      targetName: job.target.name,
      buildLabel: "build",
      basePath: resolveViteBasePath(job.profile.basePath, navigationMode),
      appLocales,
      defaultLocale: targetI18n?.defaultLocale,
      localePrefix: targetI18n?.localePrefix ?? "except-default",
      siteUrl: job.profile.siteUrl,
    });
  } finally {
    await viteConfig.cleanup?.();
  }

  const prerenderContext = await resolveRoutePrerenderContext(
    config,
    job,
    cwd,
    runtime,
  );
  if (prerenderContext.manifest.routes.some((route) => route.mode === "ssr")) {
    await runViteServerBuild({
      runtime,
      cwd,
      job,
      navigationMode,
      appLocales,
      defaultLocale: targetI18n?.defaultLocale,
      localePrefix: targetI18n?.localePrefix ?? "except-default",
      siteUrl: job.profile.siteUrl,
      basePath: resolveViteBasePath(job.profile.basePath, navigationMode),
    });
  }

  const emittedRouteArtifacts = await emitRouteArtifacts(
    config,
    job,
    browserOutputDir,
    cwd,
    runtime,
  );
  void emittedRouteArtifacts;
}

export async function runDevServer(args: {
  config: NormalizedMainzConfig;
  targetName: string;
  profile: ResolvedBuildProfile;
  host?: string | true;
  port?: number;
  debugSsg?: boolean;
  cwd?: string;
  runtime?: MainzToolingRuntime;
}): Promise<void> {
  const runtime = args.runtime ?? denoToolingRuntime;
  const cwd = args.cwd ?? runtime.cwd();
  const target = args.config.targets.find((entry) =>
    entry.name === args.targetName
  );
  if (!target) {
    throw new Error(`No target matched "${args.targetName}".`);
  }

  const navigationMode = await resolveEffectiveNavigationMode(
    target,
    args.profile,
    cwd,
    runtime,
  );
  const appDefinition = await loadTargetBuildRoutedAppDefinition(
    target,
    cwd,
    runtime,
  );
  const targetI18n = resolveTargetI18nConfig(appDefinition);
  const appLocales = appDefinition?.i18n?.locales ?? [];
  const browserOutputDir = normalizePathSlashes(
    resolvePublicationBrowserOutDir(target.outDir),
  );
  const viteConfig = await resolveViteConfigPathForTarget({
    runtime,
    cwd,
    target,
    outputDir: browserOutputDir,
    navigationMode,
    appLocales,
    defaultLocale: targetI18n?.defaultLocale,
    localePrefix: targetI18n?.localePrefix ?? "except-default",
    siteUrl: args.profile.siteUrl,
    basePath: resolveViteBasePath(args.profile.basePath, navigationMode),
    devSsgDebug: args.debugSsg,
  });

  try {
    await runViteDevServer({
      runtime,
      cwd,
      viteConfigPath: viteConfig.path,
      targetName: target.name,
      host: args.host,
      port: args.port,
      navigationMode,
      basePath: resolveViteBasePath(args.profile.basePath, navigationMode),
      appLocales,
      defaultLocale: targetI18n?.defaultLocale,
      localePrefix: targetI18n?.localePrefix ?? "except-default",
      siteUrl: args.profile.siteUrl,
      outputDir: browserOutputDir,
    });
  } finally {
    await viteConfig.cleanup?.();
  }
}

async function resolveViteConfigPathForBuild(args: {
  runtime: MainzToolingRuntime;
  cwd: string;
  job: BuildJob;
  outputDir: string;
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
    runtime: args.runtime,
    cwd: args.cwd,
    target: args.job.target,
    outputDir: args.outputDir,
    navigationMode: args.navigationMode,
    basePath: args.basePath,
    appLocales: args.appLocales,
    defaultLocale: args.defaultLocale,
    localePrefix: args.localePrefix,
    siteUrl: args.siteUrl,
  });
}

async function resolveViteConfigPathForTarget(args: {
  runtime: MainzToolingRuntime;
  cwd: string;
  target: BuildJob["target"];
  outputDir: string;
  navigationMode: NavigationMode;
  basePath: string;
  appLocales: readonly string[];
  defaultLocale?: string;
  localePrefix: "except-default" | "always";
  siteUrl?: string;
  devSsgDebug?: boolean;
}): Promise<{ path: string; cleanup?: () => Promise<void> }> {
  return await resolveViteConfigArtifact(args);
}

async function runViteBuild(args: {
  runtime: MainzToolingRuntime;
  cwd: string;
  viteConfigPath: string;
  outputDir: string;
  navigationMode: NavigationMode;
  targetName: string;
  buildLabel: string;
  basePath: string;
  appLocales: readonly string[];
  defaultLocale?: string;
  localePrefix: "except-default" | "always";
  siteUrl?: string;
}): Promise<void> {
  const status = await args.runtime.run({
    ...args.runtime.resolveViteBuildCommand({
      viteConfigPath: args.viteConfigPath,
    }),
    cwd: args.cwd,
    env: {
      MAINZ_OUT_DIR: args.outputDir,
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
      `Vite ${args.buildLabel} failed for target "${args.targetName}".`,
    );
  }
}

async function runViteServerBuild(args: {
  runtime: MainzToolingRuntime;
  cwd: string;
  job: BuildJob;
  navigationMode: NavigationMode;
  basePath: string;
  appLocales: readonly string[];
  defaultLocale?: string;
  localePrefix: "except-default" | "always";
  siteUrl?: string;
}): Promise<void> {
  const appEntryPath = resolveTargetAppFile(args.job.target, args.cwd);
  if (!appEntryPath) {
    throw new Error(
      `SSR build for target "${args.job.target.name}" requires a resolved app entry file.`,
    );
  }

  const outputDir = normalizePathSlashes(
    resolvePublicationServerOutDir(args.job.target.outDir),
  );
  const viteConfig = await resolveViteConfigArtifact({
    runtime: args.runtime,
    cwd: args.cwd,
    target: args.job.target,
    outputDir,
    navigationMode: args.navigationMode,
    basePath: args.basePath,
    appLocales: args.appLocales,
    defaultLocale: args.defaultLocale,
    localePrefix: args.localePrefix,
    siteUrl: args.siteUrl,
    buildTarget: "server",
    preferTargetViteConfig: false,
    serverBundle: {
      entryPath: appEntryPath,
      outputFileName: "app.mjs",
    },
  });

  try {
    await runViteBuild({
      runtime: args.runtime,
      cwd: args.cwd,
      viteConfigPath: viteConfig.path,
      outputDir,
      navigationMode: args.navigationMode,
      targetName: args.job.target.name,
      buildLabel: "SSR build",
      basePath: args.basePath,
      appLocales: args.appLocales,
      defaultLocale: args.defaultLocale,
      localePrefix: args.localePrefix,
      siteUrl: args.siteUrl,
    });
  } finally {
    await viteConfig.cleanup?.();
  }
}

async function runViteDevServer(args: {
  runtime: MainzToolingRuntime;
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
  outputDir: string;
}): Promise<void> {
  const status = await args.runtime.run({
    ...args.runtime.resolveViteDevCommand({
      viteConfigPath: args.viteConfigPath,
      host: args.host,
      port: args.port,
    }),
    cwd: args.cwd,
    env: {
      MAINZ_OUT_DIR: args.outputDir,
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

function resolveViteBasePath(
  basePath: string,
  navigationMode: NavigationMode,
): string {
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
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

function normalizePathSlashes(path: string): string {
  return path.replaceAll("\\", "/");
}
