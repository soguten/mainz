import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  SsrRuntimeManifest,
  SsrRuntimeManifestRouteEntry,
} from "./artifacts.ts";
import { renderRouteAppHtml } from "./render-core.ts";
import {
  buildResolvedRouteMetadata,
  finalizePrerenderedRouteDocument,
  injectRouteGenerationMetadata,
  resolveRenderedRouteAssets,
} from "./render-document.ts";
import {
  buildDevSsgCacheKey,
  findDevNotFoundRoute,
  resolveDevRouteRequest,
} from "./dev-route-request.ts";
import {
  denoToolingRuntime,
  type MainzToolingRuntime,
} from "../tooling/runtime/index.ts";
import { dynamicImport } from "../tooling/dynamic-import.ts";
import type {
  RouteManifestEntry,
  TargetRouteManifest,
} from "../routing/index.ts";

export interface SsrArtifactResponseHeaderContext {
  request: Request;
  requestUrl: URL;
  route: RouteManifestEntry;
  params: Record<string, string>;
  locale?: string;
  status: number;
  cacheKey: string;
}

export interface TryRenderSsrArtifactRequestArgs {
  rootDir: string;
  browserRootDir: string;
  request: Request;
  /** Maximum time allowed for a single SSR render. Defaults to 30 seconds. */
  ssrTimeoutMs?: number;
  runtime?: MainzToolingRuntime;
  responseHeaders?: (
    context: SsrArtifactResponseHeaderContext,
  ) => HeadersInit | undefined;
}

export async function tryRenderSsrArtifactRequest(
  args: TryRenderSsrArtifactRequestArgs,
): Promise<Response | null> {
  const runtime = args.runtime ?? denoToolingRuntime;
  const manifest = await loadSsrArtifactManifest(args.rootDir, runtime);
  if (!manifest) {
    return null;
  }

  const requestUrl = new URL(args.request.url);
  const routeManifest = toTargetRouteManifest(manifest);
  const resolution = resolveDevRouteRequest({
    requestUrl,
    basePath: manifest.basePath,
    manifest: routeManifest,
    defaultLocale: manifest.i18n?.defaultLocale,
    localePrefix: manifest.i18n?.localePrefix ?? "except-default",
  });

  if (resolution.kind === "ssr" && resolution.route && resolution.params) {
    return await renderSsrArtifactResponse({
      request: args.request,
      ssrTimeoutMs: args.ssrTimeoutMs,
      requestUrl,
      rootDir: args.rootDir,
      browserRootDir: args.browserRootDir,
      manifest,
      route: resolution.route,
      params: resolution.params,
      locale: resolution.locale,
      status: 200,
      runtime,
      responseHeaders: args.responseHeaders,
    });
  }

  if (resolution.kind === "unmatched") {
    const notFoundRoute = findDevNotFoundRoute({
      manifest: routeManifest,
      locale: resolution.locale,
      mode: "ssr",
    });
    if (notFoundRoute) {
      return await renderSsrArtifactResponse({
        request: args.request,
        ssrTimeoutMs: args.ssrTimeoutMs,
        requestUrl,
        rootDir: args.rootDir,
        browserRootDir: args.browserRootDir,
        manifest,
        route: notFoundRoute,
        params: {},
        locale: resolution.locale,
        status: 404,
        runtime,
        responseHeaders: args.responseHeaders,
      });
    }
  }

  return null;
}

async function renderSsrArtifactResponse(args: {
  request: Request;
  ssrTimeoutMs?: number;
  requestUrl: URL;
  rootDir: string;
  browserRootDir: string;
  manifest: SsrRuntimeManifest;
  route: RouteManifestEntry;
  params: Record<string, string>;
  locale?: string;
  status: number;
  runtime: MainzToolingRuntime;
  responseHeaders?: (
    context: SsrArtifactResponseHeaderContext,
  ) => HeadersInit | undefined;
}): Promise<Response> {
  const indexHtmlPath = resolve(args.browserRootDir, "index.html");
  const templateHtml = await args.runtime.readTextFile(indexHtmlPath);
  const locale = args.locale ?? args.route.locales[0] ??
    args.manifest.i18n?.defaultLocale;
  const loadServerEntryModule = createArtifactServerEntryLoader(
    resolve(args.rootDir, args.manifest.serverEntryPath),
  );
  const timeoutMs = args.ssrTimeoutMs ?? 30_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError(
      "SSR render timeout must be a positive finite number.",
    );
  }
  const renderController = new AbortController();
  const renderTimeoutError = new SsrRenderTimeoutError(timeoutMs);
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      renderController.abort(renderTimeoutError);
      reject(renderTimeoutError);
    }, timeoutMs);
  });

  let renderedApp: Awaited<ReturnType<typeof renderRouteAppHtml>>;
  try {
    renderedApp = await Promise.race([
      renderRouteAppHtml({
        html: templateHtml,
        absoluteOutputPath: indexHtmlPath,
        outputDir: args.browserRootDir,
        locale,
        basePath: args.manifest.basePath,
        renderPath: args.requestUrl.pathname,
        request: args.request,
        signal: renderController.signal,
        loadModule: loadServerEntryModule,
      }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (error instanceof SsrRenderTimeoutError) {
      return new Response("SSR render timed out", {
        status: 504,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    throw error;
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
  const routeMetadata = buildResolvedRouteMetadata({
    route: args.route,
    locale,
    params: args.params,
    matchedPath: renderedApp.routeSnapshot?.matchedPath,
    metadata: renderedApp.routeSnapshot?.metadata ?? args.route.metadata,
    targetI18n: args.manifest.i18n,
    profile: {
      name: "artifact-runtime",
      basePath: args.manifest.basePath,
      siteUrl: args.manifest.siteUrl,
    },
  });
  const routeAssets = resolveRenderedRouteAssets({
    renderedSnapshot: renderedApp.routeSnapshot,
  });
  const html = finalizePrerenderedRouteDocument({
    html: templateHtml,
    renderedApp,
    locale,
    routeMetadata,
    routeAssets,
    snapshotErrorMessage: (error) =>
      `SSR artifact snapshot for "${args.requestUrl.pathname}" (route "${args.route.path}")${
        locale ? ` (locale "${locale}")` : ""
      } contains non-public or non-serializable data: ${toErrorMessage(error)}`,
  });
  const htmlWithMetadata = injectRouteGenerationMetadata(html, {
    routeRenderMode: args.route.mode,
    documentRenderMode: "ssr",
    generatedAt: new Date().toISOString(),
    generationRuntime: "preview",
    routePath: args.route.path,
    renderPath: args.requestUrl.pathname,
    locale,
  });
  const cacheKey = buildDevSsgCacheKey({
    requestUrl: args.requestUrl,
    routeId: args.route.id,
    locale,
    params: args.params,
    statusCode: args.status,
  });
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
  });
  mergeHeaders(
    headers,
    args.responseHeaders?.({
      request: args.request,
      requestUrl: args.requestUrl,
      route: args.route,
      params: args.params,
      locale,
      status: args.status,
      cacheKey,
    }),
  );

  return new Response(
    args.request.method === "HEAD" ? null : htmlWithMetadata,
    {
      status: args.status,
      headers,
    },
  );
}

class SsrRenderTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`SSR render exceeded its ${timeoutMs} ms timeout.`);
    this.name = "SsrRenderTimeoutError";
  }
}

function createArtifactServerEntryLoader(
  serverEntryPath: string,
): (_specifier: string) => Promise<unknown> {
  let loadedModule: Promise<unknown> | undefined;

  return async () => {
    if (!loadedModule) {
      const specifier = `${
        pathToFileURL(serverEntryPath).href
      }?artifact-ssr=${Date.now()}-${Math.random().toString(36).slice(2)}`;
      loadedModule = dynamicImport(specifier);
    }

    return await loadedModule;
  };
}

async function loadSsrArtifactManifest(
  rootDir: string,
  runtime: MainzToolingRuntime,
): Promise<SsrRuntimeManifest | undefined> {
  const manifestPath = resolve(rootDir, "server", "ssr-manifest.json");

  try {
    await runtime.stat(manifestPath);
  } catch {
    return undefined;
  }

  return JSON.parse(
    await runtime.readTextFile(manifestPath),
  ) as SsrRuntimeManifest;
}

function toTargetRouteManifest(
  manifest: SsrRuntimeManifest,
): TargetRouteManifest {
  return {
    target: manifest.target,
    routes: manifest.routes.map(toSsrArtifactRuntimeRouteEntry),
  };
}

export function toSsrArtifactRuntimeRouteEntry(
  route: SsrRuntimeManifestRouteEntry,
): RouteManifestEntry {
  return {
    id: route.id,
    source: "filesystem",
    path: route.path,
    pattern: route.pattern,
    mode: "ssr",
    notFound: route.notFound === true ? true : undefined,
    locales: [...route.locales],
    metadata: route.metadata,
    authorization: route.authorization,
  };
}

function mergeHeaders(target: Headers, init: HeadersInit | undefined): void {
  if (!init) {
    return;
  }

  const source = new Headers(init);
  source.forEach((value, name) => {
    target.set(name, value);
  });
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
