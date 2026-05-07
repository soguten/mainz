import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  NormalizedMainzTarget,
  normalizeTargetBuildConfig,
  type TargetBuildDefinition,
} from "../config/index.ts";
import { NavigationMode } from "../routing/index.ts";
import { resolveTargetDiscoveredPagesForTarget } from "../routing/target-page-discovery.ts";
import { denoToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import { loadTargetBuildRoutedAppDefinition } from "./app-definition.ts";

export interface ResolvedBuildProfile {
  name: string;
  basePath: string;
  siteUrl?: string;
}

export interface PublicationMetadata {
  target: string;
  profile: string;
  outDir: string;
  basePath: string;
  navigation: NavigationMode;
  siteUrl?: string;
}

const DEFAULT_BUILD_PROFILE_NAME = "production";

export async function resolveTargetBuildProfile(
  target: NormalizedMainzTarget,
  requestedProfile: string | undefined,
  cwd: string = denoToolingRuntime.cwd(),
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<ResolvedBuildProfile> {
  const profileName = requestedProfile?.trim() || DEFAULT_BUILD_PROFILE_NAME;
  const buildConfig = await loadTargetBuildConfig(target, cwd, runtime);
  const profile = buildConfig.profiles[profileName];

  if (!profile) {
    if (profileName === DEFAULT_BUILD_PROFILE_NAME) {
      return {
        name: profileName,
        basePath: "/",
        siteUrl: undefined,
      };
    }

    const availableProfiles = Object.keys(buildConfig.profiles);
    throw new Error(
      availableProfiles.length > 0
        ? `Target "${target.name}" does not define profile "${profileName}". Available profiles: ${
          availableProfiles.join(", ")
        }`
        : `Target "${target.name}" does not define profile "${profileName}" and has no target build profiles.`,
    );
  }

  return {
    name: profileName,
    basePath: profile.basePath ?? "/",
    siteUrl: profile.siteUrl,
  };
}

export async function resolvePublicationMetadata(
  target: NormalizedMainzTarget,
  requestedProfile: string | undefined,
  cwd: string = denoToolingRuntime.cwd(),
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<PublicationMetadata> {
  const profile = await resolveTargetBuildProfile(
    target,
    requestedProfile,
    cwd,
    runtime,
  );
  const navigationMode = await resolveEffectiveNavigationMode(
    target,
    profile,
    cwd,
    runtime,
  );

  return {
    target: target.name,
    profile: profile.name,
    outDir: resolvePublicationOutDir(target.outDir, navigationMode),
    basePath: profile.basePath,
    navigation: navigationMode,
    siteUrl: profile.siteUrl,
  };
}

export async function resolveEffectiveNavigationMode(
  target: NormalizedMainzTarget,
  profile: ResolvedBuildProfile,
  cwd: string = denoToolingRuntime.cwd(),
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<NavigationMode> {
  const appDefinition = await loadTargetBuildRoutedAppDefinition(
    target,
    cwd,
    runtime,
  );
  if (appDefinition?.navigation) {
    return appDefinition.navigation;
  }

  if (await hasRoutingInput(target, cwd, runtime)) {
    return "spa";
  }

  return "spa";
}

async function loadTargetBuildConfig(
  target: NormalizedMainzTarget,
  cwd: string,
  runtime: MainzToolingRuntime,
) {
  const buildConfigPath = await resolveTargetBuildConfigPath(
    target,
    cwd,
    runtime,
  );
  if (!buildConfigPath) {
    return normalizeTargetBuildConfig({});
  }

  let module: unknown;
  try {
    module = await runtime.importModule(
      `${pathToFileURL(buildConfigPath).href}?t=${Date.now()}`,
    );
  } catch (error) {
    throw new Error(
      `Could not load target build config at "${buildConfigPath}": ${
        toErrorMessage(error)
      }`,
    );
  }

  const exported = (module as { default?: unknown }).default;
  if (!exported || typeof exported !== "object") {
    throw new Error(
      `Target build config "${buildConfigPath}" must export a default object.`,
    );
  }

  return normalizeTargetBuildConfig(exported as TargetBuildDefinition);
}

async function resolveTargetBuildConfigPath(
  target: NormalizedMainzTarget,
  cwd: string,
  runtime: MainzToolingRuntime,
): Promise<string | undefined> {
  if (target.buildConfig?.trim()) {
    return resolve(cwd, target.buildConfig);
  }

  const defaultPath = resolve(cwd, target.rootDir, "mainz.build.ts");
  try {
    await runtime.stat(defaultPath);
    return defaultPath;
  } catch {
    return undefined;
  }
}

async function hasRoutingInput(
  target: NormalizedMainzTarget,
  cwd: string,
  runtime: MainzToolingRuntime,
): Promise<boolean> {
  if (!target.appFile?.trim()) {
    return false;
  }

  const discovery = await resolveTargetDiscoveredPagesForTarget(
    target,
    cwd,
    runtime,
  );
  if (discovery.discoveryErrors?.length) {
    return true;
  }

  return Boolean(discovery.discoveredPages?.length);
}

function normalizePathSlashes(path: string): string {
  return path.replaceAll("\\", "/");
}

function resolvePublicationOutDir(
  outDir: string,
  navigation: NavigationMode,
): string {
  const publicationMode = navigation === "spa" ? "csr" : "ssg";
  return normalizePathSlashes(`${outDir}/${publicationMode}`);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
