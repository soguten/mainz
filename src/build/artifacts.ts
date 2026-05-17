import { dirname, relative, resolve } from "node:path";
import {
  buildSsgOutputEntries,
  buildTargetRouteManifest,
  isDynamicRoutePath,
  type NavigationMode,
  type RenderMode,
  resolveLocaleRedirectPath,
  shouldPrefixLocaleForRoute,
  toLocalePathSegment,
} from "../routing/index.ts";
import {
  type NormalizedMainzConfig,
  type NormalizedMainzTarget,
} from "../config/index.ts";
import type { PageHeadDefinition } from "../components/page.ts";
import type { PageAuthorizationMetadata } from "../authorization/index.ts";
import { ResourceAccessError } from "../resources/index.ts";
import type { RoutedAppDefinition } from "../navigation/index.ts";
import {
  type ResolvedBuildProfile,
  resolveArtifactRelativeServerEntryPath,
  resolveEffectiveNavigationMode,
  resolvePublicationBrowserIndexHtmlPath,
  resolvePublicationHydrationManifestPath,
  resolvePublicationRoutesManifestPath,
  resolvePublicationServerOutDir,
  resolvePublicationSsrManifestPath,
} from "./profiles.ts";
import { denoToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import {
  resolveRoutePrerenderContext,
  resolveTargetI18nConfig,
} from "./prerender-context.ts";
import {
  type InitialRouteSnapshot,
  renderRouteAppHtml,
} from "./render-core.ts";
import {
  applyRouteHead,
  buildResolvedRouteHead,
  finalizeEvaluatedRouteDocument,
  finalizePrerenderedRouteDocument,
  injectAppHtml,
  injectRouteSnapshot,
  resolveRenderedRouteHead,
  setHtmlLang,
} from "./render-document.ts";

export {
  applyRouteHead,
  injectAppHtml,
  injectRouteSnapshot,
  setHtmlLang,
} from "./render-document.ts";

export { resolveTargetI18nConfig } from "./prerender-context.ts";

export interface ArtifactBuildJob {
  target: NormalizedMainzTarget;
  profile: ResolvedBuildProfile;
}

export interface SsrRuntimeManifestRouteEntry {
  id: string;
  path: string;
  pattern: string;
  locales: string[];
  notFound?: boolean;
  head?: PageHeadDefinition;
  authorization?: PageAuthorizationMetadata;
}

export interface SsrRuntimeManifest {
  version: 1;
  target: string;
  appId?: string;
  basePath: string;
  siteUrl?: string;
  navigation: NavigationMode;
  serverEntryPath: string;
  routes: SsrRuntimeManifestRouteEntry[];
  i18n?: {
    defaultLocale?: string;
    localePrefix?: "except-default" | "always";
    fallbackLocale?: string;
  };
}

export async function emitRouteArtifacts(
  config: NormalizedMainzConfig,
  job: ArtifactBuildJob,
  outputDir: string,
  cwd: string,
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<boolean> {
  const navigationMode = await resolveEffectiveNavigationMode(
    job.target,
    job.profile,
    cwd,
  );
  const {
    appDefinition,
    templateHtml,
    manifest,
    outputEntries,
    routeById,
    targetI18n,
  } =
    await resolveStaticRouteBuildContext(
      config,
      job,
      outputDir,
      cwd,
      "route",
      runtime,
    );

  if (manifest.routes.length === 0) {
    return false;
  }

  for (const entry of outputEntries) {
    const absoluteOutputPath = resolve(cwd, entry.outputHtmlPath);
    const relativeFromOutputDir = relative(
      dirname(absoluteOutputPath),
      resolve(cwd, outputDir),
    );
    const normalizedRelative = normalizePathSlashes(
      relativeFromOutputDir || ".",
    );
    let html = rewriteAssetPaths(templateHtml, normalizedRelative);
    if (isRootFallbackOutput(entry.outputHtmlPath, outputDir)) {
      html = rewriteFallbackAssetPaths(html, job.profile.basePath);
    }

    const route = routeById.get(entry.routeId);
    if (!route) {
      throw new Error(
        `Missing route "${entry.routeId}" in manifest for target "${manifest.target}".`,
      );
    }

    const routeOutput = route.mode === "ssg"
      ? await renderSsgRouteDocument({
        html,
        absoluteOutputPath,
        outputDir,
        route,
        entry,
        targetI18n,
        job,
        cwd,
      })
      : await renderCsrRouteDocument({
        html,
        absoluteOutputPath,
        outputDir,
        route,
        entry,
        targetI18n,
        job,
        cwd,
      });
    html = routeOutput.html;

    await runtime.mkdir(dirname(absoluteOutputPath), { recursive: true });
    await runtime.writeTextFile(absoluteOutputPath, html);
  }

  const normalizedRoutesManifestPath = resolve(
    cwd,
    resolvePublicationRoutesManifestPath(job.target.outDir),
  );
  await runtime.writeTextFile(
    normalizedRoutesManifestPath,
    JSON.stringify(manifest, null, 2),
  );

  const normalizedHydrationManifestPath = resolve(
    cwd,
    resolvePublicationHydrationManifestPath(job.target.outDir),
  );
  await runtime.writeTextFile(
    normalizedHydrationManifestPath,
    JSON.stringify(
      {
        target: job.target.name,
        hydration: "full-page",
        navigation: navigationMode,
      },
      null,
      2,
    ),
  );

  await emitSsrRuntimeArtifacts({
    runtime,
    cwd,
    outputDir,
    target: job.target,
    profile: job.profile,
    appDefinition,
    manifest,
    navigationMode,
    targetI18n,
  });

  const localeRedirectHtml = buildDefaultLocaleRedirectHtml(
    manifest,
    targetI18n?.defaultLocale,
    targetI18n?.localePrefix,
    job.profile.basePath,
    job.profile.siteUrl,
  );
  if (localeRedirectHtml) {
    await runtime.writeTextFile(
      resolve(cwd, resolvePublicationBrowserIndexHtmlPath(job.target.outDir)),
      localeRedirectHtml,
    );
  }
  return outputEntries.length > 0;
}

async function resolveStaticRouteBuildContext(
  config: NormalizedMainzConfig,
  job: ArtifactBuildJob,
  outputDir: string,
  cwd: string,
  buildLabel: string,
  runtime: MainzToolingRuntime,
): Promise<{
  appDefinition?: RoutedAppDefinition;
  templateHtml: string;
  manifest: ReturnType<typeof buildTargetRouteManifest>;
  outputEntries: ReturnType<typeof buildSsgOutputEntries>;
  routeById: Map<
    string,
    ReturnType<typeof buildTargetRouteManifest>["routes"][number]
  >;
  targetI18n: ReturnType<typeof resolveTargetI18nConfig>;
}> {
  const templateHtml = await readBuildTemplateHtml(
    outputDir,
    cwd,
    job.target.name,
    buildLabel,
    runtime,
  );
  const prerenderContext = await resolveRoutePrerenderContext(
    config,
    job,
    cwd,
    runtime,
  );
  const outputEntries = buildSsgOutputEntries(
    prerenderContext.manifest,
    outputDir,
    {
      localePrefix: prerenderContext.targetI18n?.localePrefix,
      defaultLocale: prerenderContext.targetI18n?.defaultLocale,
      routeEntriesByRouteId: prerenderContext.routeEntriesByRouteId,
    },
  );

  return {
    appDefinition: prerenderContext.appDefinition,
    templateHtml,
    manifest: prerenderContext.manifest,
    outputEntries,
    routeById: new Map(prerenderContext.routeById),
    targetI18n: prerenderContext.targetI18n,
  };
}

export function buildSsrRuntimeManifest(args: {
  target: NormalizedMainzTarget;
  profile: ResolvedBuildProfile;
  manifest: ReturnType<typeof buildTargetRouteManifest>;
  navigationMode: NavigationMode;
  targetI18n: ReturnType<typeof resolveTargetI18nConfig>;
  appDefinition?: { id?: string };
}): SsrRuntimeManifest | undefined {
  const routes = args.manifest.routes
    .filter((route) => route.mode === "ssr")
    .map((route) => ({
      id: route.id,
      path: route.path,
      pattern: route.pattern,
      locales: [...route.locales],
      ...(route.notFound === true ? { notFound: true } : {}),
      ...(route.head ? { head: structuredClone(route.head) } : {}),
      ...(route.authorization
        ? { authorization: structuredClone(route.authorization) }
        : {}),
    }));

  if (routes.length === 0) {
    return undefined;
  }

  return {
    version: 1,
    target: args.target.name,
    appId: args.appDefinition?.id,
    basePath: args.profile.basePath,
    siteUrl: args.profile.siteUrl,
    navigation: args.navigationMode,
    serverEntryPath: resolveArtifactRelativeServerEntryPath(),
    routes,
    i18n: args.targetI18n
      ? {
        defaultLocale: args.targetI18n.defaultLocale,
        localePrefix: args.targetI18n.localePrefix,
        fallbackLocale: args.targetI18n.fallbackLocale,
      }
      : undefined,
  };
}

async function emitSsrRuntimeArtifacts(args: {
  runtime: MainzToolingRuntime;
  cwd: string;
  outputDir: string;
  target: NormalizedMainzTarget;
  profile: ResolvedBuildProfile;
  manifest: ReturnType<typeof buildTargetRouteManifest>;
  navigationMode: NavigationMode;
  targetI18n: ReturnType<typeof resolveTargetI18nConfig>;
  appDefinition?: { id?: string };
}): Promise<void> {
  const ssrManifest = buildSsrRuntimeManifest({
    target: args.target,
    profile: args.profile,
    manifest: args.manifest,
    navigationMode: args.navigationMode,
    targetI18n: args.targetI18n,
    appDefinition: args.appDefinition,
  });
  const serverOutDir = resolve(
    args.cwd,
    resolvePublicationServerOutDir(args.target.outDir),
  );
  if (!ssrManifest) {
    try {
      await args.runtime.remove(serverOutDir, { recursive: true });
    } catch {
      // Ignore missing or locked previous server artifacts here; the next build
      // will either recreate them or leave the directory absent.
    }
    return;
  }

  await args.runtime.mkdir(serverOutDir, { recursive: true });
  await args.runtime.writeTextFile(
    resolve(args.cwd, resolvePublicationSsrManifestPath(args.target.outDir)),
    JSON.stringify(ssrManifest, null, 2),
  );
}

async function renderSsgRouteDocument(args: {
  html: string;
  absoluteOutputPath: string;
  outputDir: string;
  route: ReturnType<typeof buildTargetRouteManifest>["routes"][number];
  entry: ReturnType<typeof buildSsgOutputEntries>[number];
  targetI18n: ReturnType<typeof resolveTargetI18nConfig>;
  job: ArtifactBuildJob;
  cwd: string;
}): Promise<{ html: string }> {
  let renderedApp: Awaited<ReturnType<typeof renderSsgAppHtml>>;
  try {
    renderedApp = await renderSsgAppHtml({
      html: args.html,
      absoluteOutputPath: args.absoluteOutputPath,
      outputDir: resolve(args.cwd, args.outputDir),
      locale: args.entry.locale,
      basePath: toViteBasePath(args.job.profile.basePath),
      renderPath: args.entry.renderPath,
    });
  } catch (error) {
    throw new Error(formatSsgPrerenderError({
      routePath: args.route.path,
      renderPath: args.entry.renderPath,
      locale: args.entry.locale,
      error,
    }));
  }

  for (const warning of renderedApp.warnings) {
    console.warn(formatSsgPrerenderWarning({
      routePath: args.route.path,
      renderPath: args.entry.renderPath,
      locale: args.entry.locale,
      warning,
    }));
  }

  const routeHead = resolveRenderedRouteHead({
    route: args.route,
    entry: args.entry,
    renderedSnapshot: renderedApp.routeSnapshot,
    fallbackHead: args.route.head,
    targetI18n: args.targetI18n,
    profile: args.job.profile,
  });
  const html = finalizePrerenderedRouteDocument({
    html: args.html,
    renderedApp,
    locale: args.entry.locale,
    routeHead,
    snapshotErrorMessage: (error) =>
      `SSG route snapshot for "${args.entry.renderPath}" (route "${args.route.path}", locale "${args.entry.locale}") contains non-public or non-serializable data: ${
        toErrorMessage(error)
      }`,
  });

  return { html };
}

async function renderCsrRouteDocument(args: {
  html: string;
  absoluteOutputPath: string;
  outputDir: string;
  route: ReturnType<typeof buildTargetRouteManifest>["routes"][number];
  entry: ReturnType<typeof buildSsgOutputEntries>[number];
  targetI18n: ReturnType<typeof resolveTargetI18nConfig>;
  job: ArtifactBuildJob;
  cwd: string;
}): Promise<{ html: string }> {
  let renderedApp: Awaited<ReturnType<typeof renderSsgAppHtml>>;
  try {
    renderedApp = await renderSsgAppHtml({
      html: args.html,
      absoluteOutputPath: args.absoluteOutputPath,
      outputDir: resolve(args.cwd, args.outputDir),
      locale: args.entry.locale,
      basePath: toViteBasePath(args.job.profile.basePath),
      renderPath: args.entry.renderPath,
    });
  } catch (error) {
    throw new Error(
      `Failed to evaluate CSR document route "${args.route.path}" for output "${args.entry.renderPath}" (locale "${args.entry.locale}"): ${
        toErrorMessage(error)
      }`,
    );
  }

  for (const warning of renderedApp.warnings) {
    console.warn(
      `CSR document evaluation warning for route "${args.route.path}" and output "${args.entry.renderPath}" (locale "${args.entry.locale}"): ${warning}`,
    );
  }

  const routeHead = resolveRenderedRouteHead({
    route: args.route,
    entry: args.entry,
    renderedSnapshot: renderedApp.routeSnapshot,
    fallbackHead: args.route.head,
    targetI18n: args.targetI18n,
    profile: args.job.profile,
  });
  const html = finalizeEvaluatedRouteDocument({
    html: args.html,
    locale: args.entry.locale,
    routeHead,
  });
  return { html };
}

async function readBuildTemplateHtml(
  outputDir: string,
  cwd: string,
  targetName: string,
  buildLabel: string,
  runtime: MainzToolingRuntime,
): Promise<string> {
  const indexHtmlPath = resolve(cwd, outputDir, "index.html");

  try {
    return await runtime.readTextFile(indexHtmlPath);
  } catch {
    throw new Error(
      `${buildLabel} build for target "${targetName}" requires "${indexHtmlPath}" to exist.`,
    );
  }
}

function toViteBasePath(basePath: string): string {
  return basePath === "/" ? "./" : basePath;
}

export async function renderSsgAppHtml(args: {
  html: string;
  absoluteOutputPath: string;
  outputDir: string;
  locale?: string;
  basePath: string;
  renderPath: string;
  loadModule?: (specifier: string) => Promise<unknown>;
}): Promise<
  { appHtml: string; routeSnapshot?: InitialRouteSnapshot; warnings: string[] }
> {
  return await renderRouteAppHtml(args);
}

export function rewriteAssetPaths(
  html: string,
  relativeFromOutputDir: string,
): string {
  if (relativeFromOutputDir === ".") {
    return html;
  }

  const prefix = `${normalizePathSlashes(relativeFromOutputDir)}/`;

  return html
    .replace(/(["'])\.\/assets\//g, `$1${prefix}assets/`)
    .replace(/(["'])\/assets\//g, `$1${prefix}assets/`);
}

export function rewriteFallbackAssetPaths(
  html: string,
  basePath: string,
): string {
  const normalizedBasePath = normalizeFallbackBasePath(basePath);
  return html
    .replace(/(["'])\.\/assets\//g, `$1${normalizedBasePath}assets/`)
    .replace(/(["'])\/assets\//g, `$1${normalizedBasePath}assets/`);
}

function normalizeFallbackBasePath(basePath: string): string {
  if (!basePath || basePath === "/") {
    return "/";
  }

  const trimmed = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function isRootFallbackOutput(
  outputHtmlPath: string,
  outputDir: string,
): boolean {
  const relativeOutputPath = normalizePathSlashes(
    relative(resolve(outputDir), resolve(outputHtmlPath)),
  );
  return relativeOutputPath === "404.html";
}

export function formatSsgPrerenderError(args: {
  routePath: string;
  renderPath: string;
  locale?: string;
  error: unknown;
}): string {
  return `Failed to prerender SSG route "${args.routePath}" for output "${args.renderPath}"${
    args.locale ? ` (locale "${args.locale}")` : ""
  }: ${
    formatSsgPrerenderCause(args.error)
  }`;
}

export function formatSsgPrerenderWarning(args: {
  routePath: string;
  renderPath: string;
  locale?: string;
  warning: string;
}): string {
  return `SSG prerender warning for route "${args.routePath}" and output "${args.renderPath}"${
    args.locale ? ` (locale "${args.locale}")` : ""
  }: ${args.warning}`;
}

function formatSsgPrerenderCause(error: unknown): string {
  if (error instanceof ResourceAccessError) {
    switch (error.code) {
      case "private-in-ssg":
        return `${error.message} Move this resource behind a defer strategy or an SSG-safe render policy.`;
      case "client-in-ssg":
        return `${error.message} Read it on the client or replace it with a build-compatible resource.`;
      case "forbidden-in-ssg":
        return `${error.message} Remove it from the SSG path or render this route in a non-SSG mode.`;
    }
  }

  const message = toErrorMessage(error);
  if (
    message.includes('@RenderPolicy("forbidden-in-ssg")') &&
    message.includes("cannot be rendered during SSG.")
  ) {
    return appendSsgGuidance(
      message,
      "Remove it from the SSG path or render this route in a non-SSG mode.",
    );
  }

  return message;
}

function appendSsgGuidance(message: string, guidance: string): string {
  return message.includes(guidance) ? message : `${message} ${guidance}`;
}

function buildDefaultLocaleRedirectHtml(
  manifest: {
    routes: Array<{ path: string; mode: RenderMode; locales: string[] }>;
  },
  defaultLocale: string | undefined,
  localePrefix: "except-default" | "always" | undefined,
  basePath: string,
  siteUrl?: string,
): string | null {
  if (localePrefix !== "always") {
    return null;
  }

  const rootRoute = manifest.routes.find((route) => {
    return route.path === "/" &&
      route.mode === "ssg" &&
      shouldPrefixLocaleForRoute(route.locales, localePrefix);
  });

  if (!rootRoute) {
    return null;
  }

  const supportedLocaleSegments = Array.from(
    new Set(rootRoute.locales.map((locale) => toLocalePathSegment(locale))),
  );
  if (supportedLocaleSegments.length === 0) {
    return null;
  }

  const localizedTargetPath = resolveLocaleRedirectPath({
    supportedLocales: supportedLocaleSegments,
    defaultLocale,
  });
  const targetPath = prependBuildBasePath(localizedTargetPath, basePath);
  const canonicalTarget = siteUrl
    ? new URL(targetPath, `${siteUrl}/`).toString()
    : targetPath;
  const supportedLocaleSegmentsJson = JSON.stringify(supportedLocaleSegments);
  const fallbackPathJson = JSON.stringify(targetPath);
  const redirectLang = defaultLocale?.trim() ||
    rootRoute.locales[0]?.trim() || "";
  const htmlOpenTag = redirectLang
    ? `<html lang="${escapeHtmlAttribute(redirectLang)}">`
    : "<html>";

  return [
    "<!doctype html>",
    htmlOpenTag,
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "    <title>Redirecting...</title>",
    `    <link rel="canonical" href="${canonicalTarget}" />`,
    "    <script>",
    "      (function () {",
    `        var supported = ${supportedLocaleSegmentsJson};`,
    `        var fallbackPath = ${fallbackPathJson};`,
    "        var candidates = [];",
    "        if (typeof navigator !== 'undefined') {",
    "          if (Array.isArray(navigator.languages)) candidates = candidates.concat(navigator.languages);",
    "          if (navigator.language) candidates.push(navigator.language);",
    "        }",
    "        function normalize(value) {",
    "          return String(value || '').trim().replace(/_/g, '-').toLowerCase();",
    "        }",
    "        var exact = Object.create(null);",
    "        var base = Object.create(null);",
    "        for (var i = 0; i < supported.length; i += 1) {",
    "          var locale = normalize(supported[i]);",
    "          if (!locale) continue;",
    "          exact[locale] = supported[i];",
    "          var baseLocale = locale.split('-')[0];",
    "          if (baseLocale && !base[baseLocale]) base[baseLocale] = supported[i];",
    "        }",
    "        var selected = null;",
    "        for (var j = 0; j < candidates.length; j += 1) {",
    "          var candidate = normalize(candidates[j]);",
    "          if (!candidate) continue;",
    "          if (exact[candidate]) { selected = exact[candidate]; break; }",
    "          var candidateBase = candidate.split('-')[0];",
    "          if (candidateBase && base[candidateBase]) { selected = base[candidateBase]; break; }",
    "        }",
    "        var targetPath = selected ? ('/' + selected + '/') : fallbackPath;",
    "        location.replace(targetPath);",
    "      })();",
    "    </script>",
    `    <noscript><meta http-equiv="refresh" content="0; url=${targetPath}" /></noscript>`,
    "  </head>",
    "  <body>",
    `    <p>Redirecting to <a href="${targetPath}">${targetPath}</a>...</p>`,
    "  </body>",
    "</html>",
    "",
  ].join("\n");
}

function prependBuildBasePath(pathname: string, basePath: string): string {
  const normalizedBasePath = normalizeAbsoluteBasePath(basePath);
  if (normalizedBasePath === "/") {
    return pathname;
  }

  const normalizedPath = pathname.startsWith("/")
    ? pathname.slice(1)
    : pathname;
  return `${normalizedBasePath}${normalizedPath}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
