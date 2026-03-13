/// <reference lib="deno.ns" />

import { dirname, join, relative, resolve } from "node:path";
import {
    buildSsgOutputEntries,
    buildTargetRouteManifest,
    RenderMode,
    shouldPrefixLocaleForRoute,
    toLocalePathSegment,
} from "../routing/index.ts";
import { discoverPagesFromFiles } from "../routing/server.ts";
import type { PageHeadDefinition } from "../components/page.ts";
import { pathToFileURL } from "node:url";
import {
    NormalizedMainzConfig,
    NormalizedMainzTarget,
} from "../config/index.ts";
import { withHappyDom } from "../ssg/happy-dom.ts";

export interface BuildCliOptions {
    target?: string;
    mode?: string;
    configPath?: string;
}

export interface BuildJob {
    target: NormalizedMainzTarget;
    mode: RenderMode;
}

export function resolveBuildJobs(config: NormalizedMainzConfig, options: BuildCliOptions): BuildJob[] {
    const targetSelection = options.target?.trim();
    const modeSelection = normalizeModeSelection(options.mode?.trim());

    const targets = targetSelection && targetSelection !== "all"
        ? config.targets.filter((target) => target.name === targetSelection)
        : config.targets;

    if (targets.length === 0) {
        throw new Error(
            `No targets matched "${targetSelection}". Available targets: ${config.targets.map((target) => target.name).join(", ")}`,
        );
    }

    const modes = modeSelection && modeSelection !== "all"
        ? config.renderModes.filter((mode) => mode === modeSelection)
        : config.renderModes;

    if (modes.length === 0) {
        throw new Error(
            `No render modes matched "${modeSelection}". Available modes: ${config.renderModes.join(", ")}`,
        );
    }

    const jobs: BuildJob[] = [];
    for (const target of targets) {
        for (const mode of modes) {
            if (!targetSupportsRenderMode(target, mode)) {
                continue;
            }

            jobs.push({ target, mode });
        }
    }

    if (jobs.length === 0 && targetSelection && modeSelection) {
        const selectedTarget = config.targets.find((target) => target.name === targetSelection);
        if (selectedTarget && !targetSupportsRenderMode(selectedTarget, modeSelection as RenderMode)) {
            throw new Error(
                `Target "${selectedTarget.name}" has no pages/routes and only supports csr app builds.`,
            );
        }
    }

    return jobs;
}

function normalizeModeSelection(mode: string | undefined): string | undefined {
    if (!mode) {
        return mode;
    }

    if (mode === "spa") {
        return "csr";
    }

    return mode;
}

function targetSupportsRenderMode(target: NormalizedMainzTarget, mode: RenderMode): boolean {
    if (mode === "csr") {
        return true;
    }

    return hasRoutingInput(target);
}

function hasRoutingInput(target: NormalizedMainzTarget): boolean {
    return Boolean(target.pagesDir);
}

export async function runBuildJobs(config: NormalizedMainzConfig, jobs: BuildJob[], cwd = Deno.cwd()): Promise<void> {
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

    await runViteBuild({
        cwd,
        viteConfigPath,
        modeOutDir,
        renderMode: job.mode,
        targetName: job.target.name,
    });

    if (job.mode === "ssg") {
        await emitSsgArtifacts(config, job, modeOutDir, cwd);
    }
}

async function runViteBuild(args: {
    cwd: string;
    viteConfigPath: string;
    modeOutDir: string;
    renderMode: RenderMode;
    targetName: string;
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
            MAINZ_TARGET_NAME: args.targetName,
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

async function emitSsgArtifacts(
    config: NormalizedMainzConfig,
    job: BuildJob,
    modeOutDir: string,
    cwd: string,
): Promise<void> {
    const indexHtmlPath = resolve(cwd, modeOutDir, "index.html");
    let templateHtml: string;

    try {
        templateHtml = await Deno.readTextFile(indexHtmlPath);
    } catch (_error) {
        throw new Error(
            `SSG build for target "${job.target.name}" requires "${indexHtmlPath}" to exist.`,
        );
    }

    const filesystemPageFiles = job.target.pagesDir
        ? await collectFilesystemPageFiles(resolve(cwd, job.target.pagesDir))
        : undefined;
    const discoveredPages = filesystemPageFiles?.length
        ? (await discoverPagesFromFiles(filesystemPageFiles)).map((entry) => ({
            file: entry.file,
            exportName: entry.exportName,
            ...entry.page,
        }))
        : undefined;

    const manifest = buildTargetRouteManifest({
        target: {
            ...job.target,
            defaultMode: job.mode,
        },
        filesystemPageFiles,
        discoveredPages,
        i18n: config.i18n ? { locales: config.i18n.locales } : undefined,
    });

    const outputEntries = buildSsgOutputEntries(manifest, modeOutDir, {
        localePrefix: config.i18n?.localePrefix,
    });
    const routeById = new Map(manifest.routes.map((route) => [route.id, route]));

    for (const entry of outputEntries) {
        const absoluteOutputPath = resolve(cwd, entry.outputHtmlPath);
        const relativeFromOutputDir = relative(dirname(absoluteOutputPath), resolve(cwd, modeOutDir));
        const normalizedRelative = normalizePathSlashes(relativeFromOutputDir || ".");
        let html = rewriteAssetPaths(templateHtml, normalizedRelative);

        const route = routeById.get(entry.routeId);
        if (!route) {
            throw new Error(`Missing route "${entry.routeId}" in manifest for target "${manifest.target}".`);
        }

        const routeHead = buildRouteHead(route, manifest, entry.locale, config.i18n?.localePrefix);

        const appHtml = await renderSsgAppHtml({
            html,
            absoluteOutputPath,
            modeOutDir: resolve(cwd, modeOutDir),
            locale: entry.locale,
        });
        html = injectAppHtml(html, appHtml);
        html = setHtmlLang(html, entry.locale);
        html = applyRouteHead(html, { head: routeHead });

        await Deno.mkdir(dirname(absoluteOutputPath), { recursive: true });
        await Deno.writeTextFile(absoluteOutputPath, html);
    }

    const routesManifestPath = resolve(cwd, modeOutDir, "routes.json");
    await Deno.writeTextFile(routesManifestPath, JSON.stringify(manifest, null, 2));

    const islandsManifestPath = resolve(cwd, modeOutDir, "islands.json");
    await Deno.writeTextFile(islandsManifestPath, JSON.stringify({ target: job.target.name, islands: [] }, null, 2));

    const localeRedirectHtml = buildDefaultLocaleRedirectHtml(
        manifest,
        config.i18n?.defaultLocale,
        config.i18n?.localePrefix,
    );
    if (localeRedirectHtml) {
        await Deno.writeTextFile(resolve(cwd, modeOutDir, "index.html"), localeRedirectHtml);
    }
}

async function collectFilesystemPageFiles(pagesDir: string): Promise<string[]> {
    const filePaths: string[] = [];

    for await (const entry of Deno.readDir(pagesDir)) {
        const absolutePath = resolve(pagesDir, entry.name);

        if (entry.isDirectory) {
            const nested = await collectFilesystemPageFiles(absolutePath);
            filePaths.push(...nested);
            continue;
        }

        if (!entry.isFile) continue;
        filePaths.push(normalizePathSlashes(absolutePath));
    }

    return filePaths;
}

async function renderSsgAppHtml(args: {
    html: string;
    absoluteOutputPath: string;
    modeOutDir: string;
    locale: string;
}): Promise<string> {
    const moduleScriptSrc = extractModuleScriptSrc(args.html);
    if (!moduleScriptSrc) {
        throw new Error(
            `Could not find module script in prerender template "${args.absoluteOutputPath}".`,
        );
    }

    const moduleScriptPath = resolveModuleScriptPath({
        moduleScriptSrc,
        absoluteOutputPath: args.absoluteOutputPath,
        modeOutDir: args.modeOutDir,
    });
    const moduleScriptUrl = `${toFileUrl(moduleScriptPath)}?ssg=${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const pageUrl = buildOutputPageUrl(args.absoluteOutputPath, args.modeOutDir);
    const htmlWithoutScripts = stripScriptTags(args.html);

    return await withHappyDom(async (window) => {
        setNavigatorLocale(window, args.locale);

        document.write(htmlWithoutScripts);
        document.close();

        const appContainer = document.querySelector("#app");
        if (!appContainer) {
            throw new Error(
                `Template "${args.absoluteOutputPath}" must include an #app container for SSG.`,
            );
        }

        await import(moduleScriptUrl);
        await Promise.resolve();
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

        const hydratedContainer = document.querySelector("#app");
        if (!hydratedContainer) {
            throw new Error(
                `Hydration removed #app while rendering "${args.absoluteOutputPath}".`,
            );
        }

        return hydratedContainer.innerHTML;
    }, { url: pageUrl });
}

function extractModuleScriptSrc(html: string): string | null {
    const moduleScriptTag = html.match(/<script[^>]*type=["']module["'][^>]*>/i)?.[0];
    if (!moduleScriptTag) {
        return null;
    }

    const srcMatch = moduleScriptTag.match(/src=["']([^"']+)["']/i);
    return srcMatch?.[1] ?? null;
}

function stripScriptTags(html: string): string {
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function buildOutputPageUrl(absoluteOutputPath: string, absoluteModeOutDir: string): string {
    const relativeOutputPath = normalizePathSlashes(relative(absoluteModeOutDir, absoluteOutputPath));
    const normalizedRoutePath = relativeOutputPath.endsWith("/index.html")
        ? relativeOutputPath.slice(0, -"/index.html".length)
        : relativeOutputPath.endsWith("index.html")
        ? relativeOutputPath.slice(0, -"index.html".length)
        : relativeOutputPath;

    const withLeadingSlash = normalizedRoutePath.startsWith("/")
        ? normalizedRoutePath
        : `/${normalizedRoutePath}`;
    const pathname = withLeadingSlash === "/" || withLeadingSlash === ""
        ? "/"
        : withLeadingSlash.endsWith("/")
        ? withLeadingSlash
        : `${withLeadingSlash}/`;

    return `https://mainz.local${pathname}`;
}

function resolveModuleScriptPath(args: {
    moduleScriptSrc: string;
    absoluteOutputPath: string;
    modeOutDir: string;
}): string {
    const normalizedSrc = args.moduleScriptSrc.trim();

    if (/^https?:\/\//i.test(normalizedSrc)) {
        throw new Error(`External module script is not supported for SSG prerender: ${normalizedSrc}`);
    }

    if (normalizedSrc.startsWith("/")) {
        return resolve(args.modeOutDir, `.${normalizedSrc}`);
    }

    return resolve(dirname(args.absoluteOutputPath), normalizedSrc);
}

function setNavigatorLocale(windowLike: { navigator: unknown }, locale: string): void {
    const navigatorLike = windowLike.navigator as object;

    try {
        const navigatorProxy = Object.create(navigatorLike);

        Object.defineProperty(navigatorProxy, "language", {
            configurable: true,
            value: locale,
            writable: true,
        });

        Object.defineProperty(navigatorProxy, "languages", {
            configurable: true,
            value: [locale],
            writable: true,
        });

        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            value: navigatorProxy,
            writable: true,
        });
    } catch {
        // Ignore locale override failures; the app may use other locale resolution strategies.
    }
}

export function rewriteAssetPaths(html: string, relativeFromOutputDir: string): string {
    if (relativeFromOutputDir === ".") {
        return html;
    }

    const prefix = `${normalizePathSlashes(relativeFromOutputDir)}/`;

    return html
        .replace(/(["'])\.\/assets\//g, `$1${prefix}assets/`)
        .replace(/(["'])\/assets\//g, `$1${prefix}assets/`);
}

export function injectAppHtml(html: string, appHtml: string): string {
    const replacedMain = html.replace(
        /<main id="app"><\/main>/,
        `<main id="app">${appHtml}</main>`,
    );

    if (replacedMain !== html) {
        return replacedMain;
    }

    return html.replace(
        /<div id="app"><\/div>/,
        `<div id="app">${appHtml}</div>`,
    );
}

export function setHtmlLang(html: string, locale: string): string {
    const normalizedLocale = locale.trim();
    if (!normalizedLocale) {
        return html;
    }

    if (/<html[^>]*\slang=/.test(html)) {
        return html.replace(/(<html[^>]*\slang=")[^"]*(")/, `$1${normalizedLocale}$2`);
    }

    return html.replace(/<html([^>]*)>/, `<html$1 lang="${normalizedLocale}">`);
}

export function resolveLocaleRedirectPath(args: {
    supportedLocales: readonly string[];
    defaultLocale?: string;
    preferredLocales?: readonly string[];
}): string {
    const normalizedSupported = Array.from(
        new Set(
            args.supportedLocales
                .map((locale) => safeToLocalePathSegment(locale))
                .filter((locale): locale is string => Boolean(locale)),
        ),
    );

    if (normalizedSupported.length === 0) {
        return "/";
    }

    const localeByExact = new Map<string, string>();
    const localeByBase = new Map<string, string>();
    for (const supported of normalizedSupported) {
        localeByExact.set(supported, supported);
        const base = supported.split("-")[0];
        if (base && !localeByBase.has(base)) {
            localeByBase.set(base, supported);
        }
    }

    const preferences = args.preferredLocales ?? [];
    for (const preferred of preferences) {
        const normalizedPreferred = safeToLocalePathSegment(preferred);
        if (!normalizedPreferred) {
            continue;
        }

        const exactMatch = localeByExact.get(normalizedPreferred);
        if (exactMatch) {
            return `/${exactMatch}/`;
        }

        const baseLanguage = normalizedPreferred.split("-")[0];
        if (!baseLanguage) {
            continue;
        }

        const baseMatch = localeByBase.get(baseLanguage);
        if (baseMatch) {
            return `/${baseMatch}/`;
        }
    }

    const normalizedDefault = args.defaultLocale ? safeToLocalePathSegment(args.defaultLocale) : undefined;
    if (normalizedDefault && localeByExact.has(normalizedDefault)) {
        return `/${normalizedDefault}/`;
    }

    const englishFallback = localeByExact.get("en") ?? localeByBase.get("en");
    if (englishFallback) {
        return `/${englishFallback}/`;
    }

    return `/${normalizedSupported[0]}/`;
}

function buildDefaultLocaleRedirectHtml(
    manifest: { routes: Array<{ path: string; mode: RenderMode; locales: string[] }> },
    defaultLocale: string | undefined,
    localePrefix: "auto" | "always" | undefined,
): string | null {
    const rootRoute = manifest.routes.find((route) => {
        return route.path === "/" &&
            route.mode === "ssg" &&
            shouldPrefixLocaleForRoute(route.locales, localePrefix ?? "auto");
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

    const targetPath = resolveLocaleRedirectPath({
        supportedLocales: supportedLocaleSegments,
        defaultLocale,
    });
    const supportedLocaleSegmentsJson = JSON.stringify(supportedLocaleSegments);
    const fallbackPathJson = JSON.stringify(targetPath);

    return [
        "<!doctype html>",
        "<html lang=\"en\">",
        "  <head>",
        "    <meta charset=\"UTF-8\" />",
        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />",
        "    <title>Redirecting...</title>",
        `    <link rel="canonical" href="${targetPath}" />`,
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

function safeToLocalePathSegment(locale: string): string | undefined {
    try {
        return toLocalePathSegment(locale);
    } catch {
        return undefined;
    }
}

export function applyRouteHead(
    html: string,
    route: {
        head?: PageHeadDefinition;
    },
): string {
    if (!route.head) {
        return html;
    }

    let nextHtml = html;

    if (route.head.title) {
        if (/<title>[\s\S]*?<\/title>/i.test(nextHtml)) {
            nextHtml = nextHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(route.head.title)}</title>`);
        } else {
            nextHtml = nextHtml.replace("</head>", `  <title>${escapeHtml(route.head.title)}</title>\n</head>`);
        }
    }

    const tags: string[] = [];

    for (const meta of route.head.meta ?? []) {
        const attributes = [
            meta.name ? ` name="${escapeHtmlAttribute(meta.name)}"` : "",
            meta.property ? ` property="${escapeHtmlAttribute(meta.property)}"` : "",
            ` content="${escapeHtmlAttribute(meta.content)}"`,
        ].join("");
        tags.push(`<meta${attributes} />`);
    }

    for (const link of route.head.links ?? []) {
        const attributes = [
            ` rel="${escapeHtmlAttribute(link.rel)}"`,
            ` href="${escapeHtmlAttribute(link.href)}"`,
            link.hreflang ? ` hreflang="${escapeHtmlAttribute(link.hreflang)}"` : "",
        ].join("");
        tags.push(`<link${attributes} />`);
    }

    if (tags.length > 0) {
        nextHtml = nextHtml.replace("</head>", `  ${tags.join("\n  ")}\n</head>`);
    }

    return nextHtml;
}

export function buildRouteHead(
    route: {
        path: string;
        locales: string[];
        head?: PageHeadDefinition;
    },
    manifest: {
        routes: Array<{
            path: string;
            locales: string[];
        }>;
    },
    locale: string,
    localePrefix: "auto" | "always" | undefined,
): PageHeadDefinition | undefined {
    const generatedLinks = generateRouteHeadLinks(route, locale, localePrefix);
    const manualHead = route.head;

    if (!manualHead && generatedLinks.length === 0) {
        return undefined;
    }

    return {
        title: manualHead?.title,
        meta: manualHead?.meta ? [...manualHead.meta] : undefined,
        links: [
            ...generatedLinks,
            ...(manualHead?.links ? [...manualHead.links] : []),
        ],
    };
}

function generateRouteHeadLinks(
    route: { path: string; locales: string[] },
    locale: string,
    localePrefix: "auto" | "always" | undefined,
): Array<{ rel: string; href: string; hreflang?: string }> {
    if (route.locales.length === 0) {
        return [];
    }

    const links: Array<{ rel: string; href: string; hreflang?: string }> = [];
    links.push({
        rel: "canonical",
        href: buildLocalizedRouteHref(route.path, locale, route.locales, localePrefix),
    });

    if (route.locales.length > 1) {
        for (const alternateLocale of route.locales) {
            links.push({
                rel: "alternate",
                href: buildLocalizedRouteHref(route.path, alternateLocale, route.locales, localePrefix),
                hreflang: alternateLocale,
            });
        }
    }

    return links;
}

function buildLocalizedRouteHref(
    routePath: string,
    locale: string,
    routeLocales: readonly string[],
    localePrefix: "auto" | "always" | undefined,
): string {
    const normalizedRoutePath = routePath === "/" ? "" : routePath;
    const shouldPrefixLocale = shouldPrefixLocaleForRoute(routeLocales, localePrefix ?? "auto");
    const localePrefixPath = shouldPrefixLocale ? `/${toLocalePathSegment(locale)}` : "";
    const href = `${localePrefixPath}${normalizedRoutePath || "/"}`;

    if (href !== "/" && href.endsWith("/")) {
        return href.slice(0, -1);
    }

    return href;
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

function toFileUrl(absolutePath: string): string {
    return pathToFileURL(absolutePath).href;
}

function normalizePathSlashes(path: string): string {
    return path.replaceAll("\\", "/");
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
