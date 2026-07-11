import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { MainzTargetDefinition } from "../config/index.ts";
import {
  captureDefinedAppDuring,
  resolveDefinedAppDefinitionsFromModuleExports,
} from "../navigation/index.ts";
import type { NavigationMode } from "../routing/index.ts";
import {
  denoToolingRuntime,
  nodeToolingRuntime,
  type ToolingRuntimeName,
} from "../tooling/runtime/index.ts";

export interface MaterializedViteNavigationProfile {
  name: string;
  basePath: string;
  requestedBasePath?: string;
  siteUrl?: string;
}

export interface ResolveMaterializedViteNavigationArgs {
  cwd: string;
  configRoot?: string;
  runtimeName: ToolingRuntimeName;
  target: MainzTargetDefinition;
  profile: MaterializedViteNavigationProfile;
}

export interface MaterializedViteNavigationContext {
  navigationMode: NavigationMode;
  basePath: string;
}

export async function resolveMaterializedViteNavigationContext(
  args: ResolveMaterializedViteNavigationArgs,
): Promise<MaterializedViteNavigationContext> {
  const requestedBasePath = args.profile.requestedBasePath ??
    args.profile.basePath;
  const navigationMode = await loadMaterializedNavigationMode(args);

  return {
    navigationMode,
    basePath: resolveViteBasePath(requestedBasePath, navigationMode),
  };
}

export function applyMaterializedViteNavigationToDefine(
  define: Record<string, string>,
  context: MaterializedViteNavigationContext,
): Record<string, string> {
  return {
    ...define,
    __MAINZ_NAVIGATION_MODE__: JSON.stringify(context.navigationMode),
    __MAINZ_BASE_PATH__: JSON.stringify(context.basePath),
  };
}

export function applyMaterializedViteNavigationToDevMiddlewareOptions(
  options: Record<string, unknown>,
  context: MaterializedViteNavigationContext,
): Record<string, unknown> {
  const profile = isRecord(options.profile) ? options.profile : {};

  return {
    ...options,
    profile: {
      ...profile,
      basePath: context.basePath,
    },
  };
}

async function loadMaterializedNavigationMode(
  args: ResolveMaterializedViteNavigationArgs,
): Promise<NavigationMode> {
  const appFile = args.target.appFile?.trim();
  if (!appFile) {
    return "spa";
  }

  const runtime = args.runtimeName === "deno"
    ? denoToolingRuntime
    : nodeToolingRuntime;
  const projectCwd = resolveMaterializedProjectCwd(args);
  const resolvedAppFile = resolve(projectCwd, appFile);
  const moduleUrl = `${
    pathToFileURL(resolvedAppFile).href
  }?materialized-nav=${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { value: moduleExports, app } = await captureDefinedAppDuring(
    async () => {
      return await runtime.importModule<Record<string, unknown>>(moduleUrl);
    },
  );
  const candidates = resolveDefinedAppDefinitionsFromModuleExports(moduleExports);
  if (app && !candidates.includes(app)) {
    candidates.push(app);
  }

  const selectedApp = selectAppDefinition(candidates, args.target);
  return selectedApp && "navigation" in selectedApp && selectedApp.navigation
    ? selectedApp.navigation
    : "spa";
}

function selectAppDefinition(
  candidates: readonly { id: string }[],
  target: MainzTargetDefinition,
): { id: string; navigation?: NavigationMode } | undefined {
  if (!target.appId?.trim()) {
    return candidates.length === 1
      ? candidates[0] as { id: string; navigation?: NavigationMode }
      : candidates[0] as { id: string; navigation?: NavigationMode } | undefined;
  }

  return candidates.find((candidate) => candidate.id === target.appId) as
    | { id: string; navigation?: NavigationMode }
    | undefined;
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

function toViteBasePath(basePath: string): string {
  return basePath === "/" ? "./" : basePath;
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

function resolveMaterializedProjectCwd(
  args: ResolveMaterializedViteNavigationArgs,
): string {
  if (isAbsolute(args.cwd)) {
    return args.cwd;
  }

  if (args.configRoot) {
    return resolve(args.configRoot, args.cwd);
  }

  return resolve(args.cwd);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
