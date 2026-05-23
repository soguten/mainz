import { resolve } from "node:path";
import type { NavigationMode } from "../routing/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import { resolveMainzTempPath } from "../tooling/temp-paths.ts";
import type { BuildJob } from "./jobs.ts";
import {
  renderGeneratedViteConfigModule,
  resolveGeneratedViteConfig,
} from "./vite-config.ts";
import {
  materializeGeneratedViteConfigFile,
  resolveGeneratedViteConfigArtifactDir,
} from "./vite-workspace.ts";

export interface ResolvedViteConfigArtifact {
  path: string;
  cleanup?: () => Promise<void>;
}

export interface ResolveGeneratedViteConfigArtifactArgs {
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
  preferTargetViteConfig?: boolean;
  buildTarget?: "browser" | "server";
  serverBundle?: {
    entryPath: string;
    outputFileName?: string;
  };
}

export async function resolveViteConfigArtifact(
  args: ResolveGeneratedViteConfigArtifactArgs,
): Promise<ResolvedViteConfigArtifact> {
  if (args.preferTargetViteConfig !== false && args.target.viteConfig) {
    return {
      path: normalizePathSlashes(resolve(args.cwd, args.target.viteConfig)),
    };
  }

  const generatedConfig = resolveGeneratedViteConfig({
    cwd: args.cwd,
    runtimeName: args.runtime.name,
    target: args.target,
    outputDir: args.outputDir,
    navigationMode: args.navigationMode,
    basePath: args.basePath,
    appLocales: args.appLocales,
    defaultLocale: args.defaultLocale,
    localePrefix: args.localePrefix,
    siteUrl: args.siteUrl,
    devSsgDebug: args.devSsgDebug,
    buildTarget: args.buildTarget,
    serverBundle: args.serverBundle,
    cacheDir: normalizePathSlashes(
      resolveMainzTempPath(args.cwd, "vite-cache", args.target.name),
    ),
  });
  const moduleSource = renderGeneratedViteConfigModule(
    generatedConfig,
    args.runtime.name,
  );
  const artifact = await materializeGeneratedViteConfigFile({
    artifactDir: resolveGeneratedViteConfigArtifactDir({
      cwd: args.cwd,
      targetName: args.target.name,
      runtimeName: args.runtime.name,
    }),
    runtime: args.runtime,
    moduleSource,
  });
  return {
    path: normalizePathSlashes(artifact.path),
  };
}

export function renderGeneratedViteConfigVariant(args: {
  runtime: MainzToolingRuntime;
}): string {
  return args.runtime.name;
}

function normalizePathSlashes(path: string): string {
  return path.replaceAll("\\", "/");
}
