import type { IncomingMessage } from "node:http";
import { extname } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import {
  denoToolingRuntime,
  nodeToolingRuntime,
  type ToolingRuntimeName,
} from "../tooling/runtime/index.ts";
import { normalizeMainzConfig } from "../config/index.ts";

export interface MainzDevRouteMiddlewarePluginOptions {
  cwd: string;
  runtimeName: ToolingRuntimeName;
  target: {
    name: string;
    rootDir: string;
    appFile?: string;
    appId?: string;
    outDir: string;
    viteConfig?: string;
  };
  profile: {
    name: string;
    basePath: string;
    siteUrl?: string;
  };
  debugSsg?: boolean;
  defaultLocale?: string;
  localePrefix?: "except-default" | "always";
}

export function createMainzDevRouteMiddlewarePlugin(
  options: MainzDevRouteMiddlewarePluginOptions,
): Plugin {
  const invalidateCooldownMs = 25;
  let cachedContext:
    | Awaited<ReturnType<DevPluginRuntime["resolveRoutePrerenderContext"]>>
    | undefined;
  let contextPromise:
    | Promise<
      Awaited<ReturnType<DevPluginRuntime["resolveRoutePrerenderContext"]>>
    >
    | undefined;
  const cachedHtmlByRequestKey = new Map<string, string>();
  let lastInvalidateAt = 0;
  const normalizedConfig = normalizeMainzConfig({
    runtime: options.runtimeName,
    targets: [options.target],
  });
  const target = normalizedConfig.targets[0];

  const invalidate = () => {
    const now = Date.now();
    if (now - lastInvalidateAt < invalidateCooldownMs) {
      return;
    }
    lastInvalidateAt = now;
    cachedContext = undefined;
    contextPromise = undefined;
    cachedHtmlByRequestKey.clear();
  };

  return {
    name: "mainz-dev-route-middleware",
    apply: "serve",
    handleHotUpdate() {
      invalidate();
    },
    configureServer(server) {
      server.watcher.on("add", invalidate);
      server.watcher.on("change", invalidate);
      server.watcher.on("unlink", invalidate);

      server.middlewares.use(async (req, res, next) => {
        const requestUrl = resolveRequestUrl(req, server);
        if (!isHtmlDocumentRequest(req, requestUrl)) {
          next();
          return;
        }

        try {
          const context = await loadPrerenderContext();
          const helpers = await loadDevPluginRuntime();
          const resolution = helpers.resolveDevRouteRequest({
            requestUrl,
            basePath: options.profile.basePath,
            manifest: context.manifest,
            routeEntriesByRouteId: context.routeEntriesByRouteId,
            defaultLocale: options.defaultLocale,
            localePrefix: options.localePrefix,
          });

          if (resolution.kind === "ssg-missing-entry") {
            const notFoundRoute = helpers.findDevNotFoundRoute({
              manifest: context.manifest,
              locale: resolution.locale,
              mode: "ssg",
            });
            if (notFoundRoute) {
              await respondWithSsgHtml({
                req,
                res,
                server,
                requestUrl,
                route: notFoundRoute,
                params: {},
                locale: resolution.locale,
                statusCode: 404,
              });
              return;
            }

            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Not Found");
            return;
          }

          if (resolution.kind === "ssg-csr-fallback") {
            next();
            return;
          }

          if (
            resolution.kind === "ssg" && resolution.route && resolution.params
          ) {
            await respondWithSsgHtml({
              req,
              res,
              server,
              requestUrl,
              route: resolution.route,
              params: resolution.params,
              locale: resolution.locale,
              statusCode: 200,
            });
            return;
          }

          if (resolution.kind === "unmatched") {
            const notFoundRoute = helpers.findDevNotFoundRoute({
              manifest: context.manifest,
              locale: resolution.locale,
              mode: "ssg",
            });
            if (notFoundRoute) {
              await respondWithSsgHtml({
                req,
                res,
                server,
                requestUrl,
                route: notFoundRoute,
                params: {},
                locale: resolution.locale,
                statusCode: 404,
              });
              return;
            }
          }

          next();
        } catch (error) {
          next(error as Error);
        }
      });
    },
  };

  async function loadPrerenderContext() {
    if (cachedContext) {
      return cachedContext;
    }

    if (!contextPromise) {
      const runtime = options.runtimeName === "node"
        ? nodeToolingRuntime
        : denoToolingRuntime;
      const helpers = await loadDevPluginRuntime();
      contextPromise = helpers.resolveRoutePrerenderContext(
        normalizedConfig,
        {
          target,
          mode: "ssg",
          profile: options.profile,
        },
        options.cwd,
        runtime,
      ).then((context) => {
        cachedContext = context;
        return context;
      });
    }

    return await contextPromise;
  }

  async function respondWithSsgHtml(args: {
    req: IncomingMessage;
    res: {
      statusCode: number;
      setHeader(name: string, value: string): void;
      end(body?: string): void;
    };
    server: ViteDevServer;
    requestUrl: URL;
    route: Awaited<
      ReturnType<DevPluginRuntime["resolveRoutePrerenderContext"]>
    >["manifest"]["routes"][number];
    params: Record<string, string>;
    locale?: string;
    statusCode: number;
  }): Promise<void> {
    const helpers = await loadDevPluginRuntime();
    const requestKey = helpers.buildDevSsgCacheKey({
      requestUrl: args.requestUrl,
      routeId: args.route.id,
      locale: args.locale,
      params: args.params,
      statusCode: args.statusCode,
    });
    let html = cachedHtmlByRequestKey.get(requestKey);
    const startedAt = Date.now();
    let cacheHit = true;
    if (!html) {
      cacheHit = false;
      const runtime = options.runtimeName === "node"
        ? nodeToolingRuntime
        : denoToolingRuntime;
      html = await helpers.renderDevSsgHtml({
        cwd: options.cwd,
        targetRootDir: target.rootDir,
        basePath: options.profile.basePath,
        requestUrl: args.requestUrl,
        route: args.route,
        params: args.params,
        locale: args.locale,
        targetLocalesDefaultLocale: options.defaultLocale,
        targetLocalesPrefix: options.localePrefix,
        siteUrl: options.profile.siteUrl,
        runtime,
        transformIndexHtml: async (url, inputHtml) =>
          await args.server.transformIndexHtml(url, inputHtml, args.req.url),
        loadModule: typeof args.server.ssrLoadModule === "function"
          ? async (specifier) => await args.server.ssrLoadModule(specifier)
          : undefined,
      });
      cachedHtmlByRequestKey.set(requestKey, html);
    }

    if (options.debugSsg) {
      console.log(formatDevSsgDebugMessage({
        requestPath: args.requestUrl.pathname,
        routePath: args.route.path,
        locale: args.locale ?? args.route.locales[0] ?? "en",
        statusCode: args.statusCode,
        cacheHit,
        durationMs: Date.now() - startedAt,
      }));
    }

    args.res.statusCode = args.statusCode;
    args.res.setHeader("Content-Type", "text/html; charset=utf-8");
    args.res.end(
      (args.req.method ?? "GET").toUpperCase() === "HEAD" ? "" : html,
    );
  }
}

function formatDevSsgDebugMessage(args: {
  requestPath: string;
  routePath: string;
  locale: string;
  statusCode: number;
  cacheHit: boolean;
  durationMs: number;
}): string {
  return `[mainz][dev:ssg] ${
    args.cacheHit ? "cache-hit" : "rendered"
  } ${args.requestPath} -> ${args.routePath} (${args.locale}, ${args.statusCode}) in ${args.durationMs}ms`;
}

function isHtmlDocumentRequest(req: IncomingMessage, requestUrl: URL): boolean {
  const method = (req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  const accept = req.headers.accept ?? "";
  if (
    accept.includes("text/html") || accept.includes("application/xhtml+xml")
  ) {
    return true;
  }

  const normalizedAccept = accept.trim();
  if (!normalizedAccept || normalizedAccept === "*/*") {
    return isLikelyHtmlDocumentPath(requestUrl.pathname);
  }

  return false;
}

function resolveRequestUrl(req: IncomingMessage, server: ViteDevServer): URL {
  const host = req.headers.host ?? "localhost";
  const origin = `${server.config.server.https ? "https" : "http"}://${host}`;
  return new URL(req.url ?? "/", origin);
}

function isLikelyHtmlDocumentPath(pathname: string): boolean {
  if (
    pathname.startsWith("/@") ||
    pathname.startsWith("/__vite") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return false;
  }

  if (pathname.endsWith("/")) {
    return true;
  }

  return extname(pathname) === "";
}

type DevPluginRuntime = {
  resolveRoutePrerenderContext:
    typeof import("./prerender-context.ts").resolveRoutePrerenderContext;
  resolveDevRouteRequest:
    typeof import("./dev-route-request.ts").resolveDevRouteRequest;
  findDevNotFoundRoute:
    typeof import("./dev-route-request.ts").findDevNotFoundRoute;
  buildDevSsgCacheKey:
    typeof import("./dev-route-request.ts").buildDevSsgCacheKey;
  renderDevSsgHtml: typeof import("./dev-ssg-html.ts").renderDevSsgHtml;
};

let devPluginRuntimePromise: Promise<DevPluginRuntime> | undefined;

function loadDevPluginRuntime(): Promise<DevPluginRuntime> {
  if (!devPluginRuntimePromise) {
    devPluginRuntimePromise = (async () => {
      const prerenderSpecifier =
        new URL("./prerender-context.ts", import.meta.url).href;
      const routeRequestSpecifier =
        new URL("./dev-route-request.ts", import.meta.url).href;
      const htmlSpecifier = new URL("./dev-ssg-html.ts", import.meta.url).href;
      const [prerenderContext, routeRequest, devSsgHtml] = await Promise.all([
        import(/* @vite-ignore */ prerenderSpecifier),
        import(/* @vite-ignore */ routeRequestSpecifier),
        import(/* @vite-ignore */ htmlSpecifier),
      ]);

      return {
        resolveRoutePrerenderContext:
          prerenderContext.resolveRoutePrerenderContext,
        resolveDevRouteRequest: routeRequest.resolveDevRouteRequest,
        findDevNotFoundRoute: routeRequest.findDevNotFoundRoute,
        buildDevSsgCacheKey: routeRequest.buildDevSsgCacheKey,
        renderDevSsgHtml: devSsgHtml.renderDevSsgHtml,
      };
    })();
  }

  return devPluginRuntimePromise;
}
