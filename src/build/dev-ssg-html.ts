import { resolve } from "node:path";
import { buildRouteHead, materializeRoutePath, type RouteManifestEntry } from "../routing/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import {
    applyRouteHead,
    formatSsgPrerenderError,
    formatSsgPrerenderWarning,
    injectAppHtml,
    injectRouteSnapshot,
    renderSsgAppHtml,
    setHtmlLang,
} from "./artifacts.ts";

export async function renderDevSsgHtml(args: {
    cwd: string;
    targetRootDir: string;
    basePath: string;
    requestUrl: URL;
    route: RouteManifestEntry;
    params: Record<string, string>;
    locale?: string;
    targetLocalesDefaultLocale?: string;
    targetLocalesPrefix?: "except-default" | "always";
    siteUrl?: string;
    runtime: MainzToolingRuntime;
    transformIndexHtml: (url: string, html: string) => Promise<string>;
    loadModule?: (specifier: string) => Promise<unknown>;
}): Promise<string> {
    const absoluteIndexHtmlPath = resolve(args.cwd, args.targetRootDir, "index.html");
    const templateHtml = await args.runtime.readTextFile(absoluteIndexHtmlPath);
    const transformedHtml = await args.transformIndexHtml(args.requestUrl.pathname, templateHtml);
    const locale = args.locale ?? args.route.locales[0] ?? "en";

    let renderedApp: Awaited<ReturnType<typeof renderSsgAppHtml>>;
    try {
        renderedApp = await renderSsgAppHtml({
            html: transformedHtml,
            absoluteOutputPath: absoluteIndexHtmlPath,
            modeOutDir: resolve(args.cwd, args.targetRootDir),
            locale,
            basePath: args.basePath,
            renderPath: args.requestUrl.pathname,
            loadModule: args.loadModule,
        });
    } catch (error) {
        throw new Error(formatSsgPrerenderError({
            routePath: args.route.path,
            renderPath: args.requestUrl.pathname,
            locale,
            error,
        }));
    }

    for (const warning of renderedApp.warnings) {
        console.warn(formatSsgPrerenderWarning({
            routePath: args.route.path,
            renderPath: args.requestUrl.pathname,
            locale,
            warning,
        }));
    }

    let html = injectAppHtml(transformedHtml, renderedApp.appHtml);
    html = injectRouteSnapshot(html, renderedApp.routeSnapshot);
    html = setHtmlLang(html, locale);
    html = applyRouteHead(html, {
        head: buildRouteHead({
            path: renderedApp.routeSnapshot?.matchedPath ??
                materializeRoutePath(args.route.path, args.params),
            locale,
            locales: args.route.locales,
            head: renderedApp.routeSnapshot?.head ?? args.route.head,
            localePrefix: args.targetLocalesPrefix,
            defaultLocale: args.targetLocalesDefaultLocale,
            basePath: args.basePath,
            siteUrl: args.siteUrl,
        }),
    });

    return html;
}
