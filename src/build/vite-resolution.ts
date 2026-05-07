import { join, resolve } from "node:path";
import type { NavigationMode, RenderMode } from "../routing/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
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
  modeOutDir: string;
  renderMode: RenderMode;
  navigationMode: NavigationMode;
  basePath: string;
  appLocales: readonly string[];
  defaultLocale?: string;
  localePrefix: "except-default" | "always";
  siteUrl?: string;
  devSsgDebug?: boolean;
}

export async function resolveViteConfigArtifact(
  args: ResolveGeneratedViteConfigArtifactArgs,
): Promise<ResolvedViteConfigArtifact> {
  if (args.target.viteConfig) {
    return {
      path: normalizePathSlashes(resolve(args.cwd, args.target.viteConfig)),
    };
  }

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
    devSsgDebug: args.devSsgDebug,
    cacheDir: args.runtime.name === "node"
      ? join(".mainz_temp", "vite-cache", args.target.name)
      : undefined,
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
