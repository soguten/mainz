import { inferFilesystemRoutes } from "./filesystem.ts";
import type { I18nConfig } from "../i18n/index.ts";
import type { PageHeadDefinition, PageHeadLinkDefinition } from "../components/page.ts";
import {
    normalizeLocaleTag,
    toLocalePathSegment as toLocalePathSegmentFromI18n,
} from "../i18n/index.ts";
import {
    BuildTargetRouteManifestInput,
    DiscoveredPageDefinition,
    FilesystemRoute,
    RenderMode,
    RouteManifestEntry,
    RouteSource,
    SsgOutputEntry,
    TargetRouteManifest,
} from "./types.ts";

interface CandidateRoute {
    idHint?: string;
    source: RouteSource;
    file?: string;
    exportName?: string;
    path: string;
    pattern: string;
    routeKey: string;
    mode: RenderMode;
    notFound?: boolean;
    locales: string[];
    head?: PageHeadDefinition;
}

interface ExpandedRouteLocale {
    idHint?: string;
    source: RouteSource;
    file?: string;
    exportName?: string;
    path: string;
    pattern: string;
    routeKey: string;
    mode: RenderMode;
    notFound?: boolean;
    locale: string;
    head?: PageHeadDefinition;
}

interface BuildSsgOutputEntriesOptions {
    localePrefix?: I18nConfig["localePrefix"];
    defaultLocale?: string;
}

export function buildTargetRouteManifest(input: BuildTargetRouteManifestInput): TargetRouteManifest {
    const target = input.target;
    const targetName = target.name;

    const filesystemConfigured = Boolean(target.pagesDir || input.filesystemPageFiles || input.discoveredPages);

    if (!filesystemConfigured) {
        return {
            target: targetName,
            routes: [],
        };
    }

    if (filesystemConfigured && !target.defaultMode && !input.discoveredPages?.length) {
        throw new Error(
            `Target "${targetName}" uses filesystem routing and requires defaultMode ("ssg" or "csr").`,
        );
    }

    const filesystemRoutes = buildFilesystemCandidates(input);

    const mergedByRouteAndLocale = new Map<string, ExpandedRouteLocale>();

    for (const route of filesystemRoutes) {
        upsertByLocale(mergedByRouteAndLocale, route, targetName);
    }

    const mergedRoutes = aggregateRoutes(Array.from(mergedByRouteAndLocale.values()));
    validateManifestRoutes(mergedRoutes, targetName);
    assignStableRouteIds(mergedRoutes, targetName);

    return {
        target: targetName,
        routes: mergedRoutes,
    };
}

export function buildSsgOutputEntries(
    manifest: TargetRouteManifest,
    outDir: string,
    options: BuildSsgOutputEntriesOptions = {},
): SsgOutputEntry[] {
    const outputEntries: SsgOutputEntry[] = [];
    const localePrefix = options.localePrefix ?? "auto";
    const notFoundRoutes = manifest.routes.filter((route) => route.notFound === true);

    if (notFoundRoutes.length > 1) {
        throw new Error(`Target "${manifest.target}" defines multiple notFound routes.`);
    }

    for (const route of manifest.routes) {
        if (route.mode !== "ssg") continue;

        const shouldPrefixLocale = shouldPrefixLocaleForRoute(route.locales, localePrefix);
        const normalizedPath = normalizeRoutePath(route.path);

        for (const locale of route.locales) {
            const localePathSegment = toLocalePathSegment(locale);
            const renderPath = buildLocalizedRoutePath({
                routePath: normalizedPath,
                localeSegment: localePathSegment,
                shouldPrefixLocale,
            });
            const outputHtmlPath = buildOutputHtmlPath({
                outDir,
                routePath: normalizedPath,
                localeSegment: localePathSegment,
                shouldPrefixLocale,
            });

            outputEntries.push({
                target: manifest.target,
                routeId: route.id,
                locale,
                outputHtmlPath,
                renderPath,
                notFound: route.notFound === true ? true : undefined,
            });
        }
    }

    const notFoundRoute = notFoundRoutes[0];
    if (notFoundRoute) {
        const locale = resolveNotFoundOutputLocale(notFoundRoute.locales, options.defaultLocale);
        const localePathSegment = toLocalePathSegment(locale);
        const shouldPrefixLocale = shouldPrefixLocaleForRoute(notFoundRoute.locales, localePrefix);
        const normalizedPath = normalizeRoutePath(notFoundRoute.path);

        outputEntries.push({
            target: manifest.target,
            routeId: notFoundRoute.id,
            locale,
            outputHtmlPath: `${trimTrailingSlash(normalizePath(outDir))}/404.html`,
            renderPath: buildLocalizedRoutePath({
                routePath: normalizedPath,
                localeSegment: localePathSegment,
                shouldPrefixLocale,
            }),
            notFound: true,
        });
    }

    return outputEntries;
}

export function toLocalePathSegment(locale: string): string {
    return toLocalePathSegmentFromI18n(locale);
}

export function shouldPrefixLocaleForRoute(
    locales: readonly string[],
    localePrefix: I18nConfig["localePrefix"] = "auto",
): boolean {
    if (locales.length === 0) {
        return false;
    }

    if (localePrefix === "always") {
        return true;
    }

    return locales.length > 1;
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

export function buildRouteHead(args: {
    path: string;
    locale: string;
    locales: readonly string[];
    head?: PageHeadDefinition;
    localePrefix?: I18nConfig["localePrefix"];
    defaultLocale?: string;
    basePath?: string;
    siteUrl?: string;
}): PageHeadDefinition | undefined {
    const generatedLinks = generateRouteHeadLinks({
        path: args.path,
        locale: args.locale,
        locales: args.locales,
        localePrefix: args.localePrefix,
        defaultLocale: args.defaultLocale,
        basePath: args.basePath,
        siteUrl: args.siteUrl,
    });
    const manualHead = args.head;

    if (!manualHead && generatedLinks.length === 0) {
        return undefined;
    }

    return {
        title: manualHead?.title,
        meta: manualHead?.meta ? [...manualHead.meta] : undefined,
        links: mergeRouteHeadLinks(generatedLinks, manualHead?.links),
    };
}

function buildFilesystemCandidates(input: BuildTargetRouteManifestInput): CandidateRoute[] {
    const target = input.target;
    const targetName = target.name;

    if (input.discoveredPages) {
        return input.discoveredPages.map((page) => buildDiscoveredPageCandidate(page, input));
    }

    if (!target.pagesDir && !input.filesystemPageFiles) {
        return [];
    }

    if (!target.pagesDir) {
        throw new Error(
            `Target "${targetName}" received filesystemPageFiles but pagesDir is missing.`,
        );
    }

    if (!input.filesystemPageFiles) {
        throw new Error(
            `Target "${targetName}" defines pagesDir="${target.pagesDir}" but filesystem files were not loaded.`,
        );
    }

    let filesystemRoutes: FilesystemRoute[];
    try {
        filesystemRoutes = inferFilesystemRoutes([...input.filesystemPageFiles], {
            pagesDir: target.pagesDir,
            defaultMode: target.defaultMode!,
        });
    } catch (error) {
        throw new Error(
            `Target "${targetName}" filesystem routing failed: ${toErrorMessage(error)}`,
        );
    }

    return filesystemRoutes.map((route) => {
        const locales = resolveRouteLocales({
            routeLocales: undefined,
            targetLocales: target.locales,
            targetName,
            routeLabel: route.path,
        });

        return {
            source: "filesystem",
            file: route.file,
            mode: route.mode,
            path: route.path,
            pattern: route.pattern,
            routeKey: route.routeKey,
            locales,
        };
    });
}

function buildDiscoveredPageCandidate(
    page: DiscoveredPageDefinition,
    input: BuildTargetRouteManifestInput,
): CandidateRoute {
    const targetName = input.target.name;
    const path = normalizeRoutePath(page.path);
    const routeKey = canonicalizeRouteKey(path);
    const locales = resolveRouteLocales({
        routeLocales: page.locales,
        targetLocales: input.target.locales,
        targetName,
        routeLabel: `${page.file}#${page.exportName}`,
    });

    return {
        idHint: undefined,
        source: "filesystem",
        file: page.file,
        exportName: page.exportName,
        path,
        pattern: path,
        routeKey,
        mode: page.mode,
        notFound: page.notFound === true ? true : undefined,
        locales,
        head: page.head,
    };
}

function upsertByLocale(
    destination: Map<string, ExpandedRouteLocale>,
    candidate: CandidateRoute,
    targetName: string,
): void {
    for (const locale of candidate.locales) {
        const localeKey = normalizeLocaleTag(locale).toLowerCase();
        const key = `${candidate.routeKey}::${localeKey}`;

        const existing = destination.get(key);
        if (!existing) {
            destination.set(key, {
                idHint: candidate.idHint,
                source: candidate.source,
                file: candidate.file,
                exportName: candidate.exportName,
                path: candidate.path,
                pattern: candidate.pattern,
                routeKey: candidate.routeKey,
                mode: candidate.mode,
                notFound: candidate.notFound === true ? true : undefined,
                locale,
                head: candidate.head,
            });
            continue;
        }

        throw new Error(
            [
                `Target "${targetName}" has conflicting routes for pattern "${candidate.routeKey}" and locale "${locale}".`,
                `Existing source: ${describeRouteSource(existing)}`,
                `New source: ${describeRouteSource(candidate)}`,
                `Suggestion: rename one page or change its path metadata.`,
            ].join(" "),
        );
    }
}

function aggregateRoutes(expandedRoutes: ExpandedRouteLocale[]): RouteManifestEntry[] {
    const groupedByRoute = new Map<string, RouteManifestEntry>();

    for (const route of expandedRoutes) {
        const groupingKey = [
            route.source,
            route.file ?? "",
            route.exportName ?? "",
            route.path,
            route.pattern,
            route.mode,
            route.idHint ?? "",
        ].join("::");

        const existing = groupedByRoute.get(groupingKey);
        if (!existing) {
            groupedByRoute.set(groupingKey, {
                id: route.idHint ?? "",
                source: route.source,
                file: route.file,
                exportName: route.exportName,
                path: route.path,
                pattern: route.pattern,
                mode: route.mode,
                notFound: route.notFound === true ? true : undefined,
                locales: [route.locale],
                head: route.head ? cloneHead(route.head) : undefined,
            });
            continue;
        }

        if (!existing.locales.includes(route.locale)) {
            existing.locales.push(route.locale);
        }
    }

    return Array.from(groupedByRoute.values())
        .map((entry) => ({
            ...entry,
            locales: dedupeLocales(entry.locales),
        }))
        .sort((a, b) => {
            if (a.path !== b.path) {
                return a.path.localeCompare(b.path);
            }

            if ((a.exportName ?? "") !== (b.exportName ?? "")) {
                return (a.exportName ?? "").localeCompare(b.exportName ?? "");
            }

            return (a.file ?? "").localeCompare(b.file ?? "");
        });
}

function validateManifestRoutes(routes: readonly RouteManifestEntry[], targetName: string): void {
    const notFoundRoutes = routes.filter((route) => route.notFound === true);

    if (notFoundRoutes.length > 1) {
        throw new Error(`Target "${targetName}" defines multiple notFound routes.`);
    }

    const notFoundRoute = notFoundRoutes[0];
    if (notFoundRoute && notFoundRoute.mode !== "ssg") {
        throw new Error(`Target "${targetName}" notFound route "${notFoundRoute.path}" must use mode "ssg".`);
    }
}

function assignStableRouteIds(routes: RouteManifestEntry[], targetName: string): void {
    const usedIds = new Set<string>();
    const slugCounters = new Map<string, number>();

    for (const route of routes) {
        if (route.id) {
            if (usedIds.has(route.id)) {
                throw new Error(
                    `Target "${targetName}" has duplicated route id "${route.id}".`,
                );
            }

            usedIds.add(route.id);
            continue;
        }

        const baseSlug = routeIdSlug(route.path);
        const nextCount = (slugCounters.get(baseSlug) ?? 0) + 1;
        slugCounters.set(baseSlug, nextCount);

        const derivedId = nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`;
        route.id = derivedId;
        usedIds.add(derivedId);
    }
}

function resolveRouteLocales(args: {
    routeLocales?: readonly string[];
    targetLocales?: readonly string[];
    targetName: string;
    routeLabel: string;
}): string[] {
    const effectiveLocales = args.routeLocales?.length
        ? [...args.routeLocales]
        : args.targetLocales?.length
            ? [...args.targetLocales]
            : [];

    if (effectiveLocales.length === 0) {
        throw new Error(
            `Target "${args.targetName}" route "${args.routeLabel}" has no resolved locales (route > target).`,
        );
    }

    return dedupeLocales(effectiveLocales.map(normalizeLocaleTag));
}

function dedupeLocales(locales: readonly string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const locale of locales) {
        const key = normalizeLocaleTag(locale).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(normalizeLocaleTag(locale));
    }

    return unique;
}

function normalizeRoutePath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) return "/";

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const normalizedSlashes = withLeadingSlash.replace(/\/{2,}/g, "/");

    if (normalizedSlashes.length > 1 && normalizedSlashes.endsWith("/")) {
        return normalizedSlashes.slice(0, -1);
    }

    return normalizedSlashes;
}

function canonicalizeRouteKey(path: string): string {
    const normalizedPath = normalizeRoutePath(path);
    if (normalizedPath === "/") {
        return "/";
    }

    const segments = normalizedPath.split("/").filter(Boolean);
    const canonicalSegments: string[] = [];
    const seenParamNames = new Set<string>();
    let catchAllCount = 0;

    segments.forEach((segment, index) => {
        const dynamicSegment = segment.match(/^:([A-Za-z_][A-Za-z0-9_-]*)$/);
        const bracketDynamic = segment.match(/^\[([^\].]+)\]$/);
        const bracketCatchAll = segment.match(/^\[\.\.\.([^\].]+)\]$/);

        if (segment === "*" || bracketCatchAll) {
            catchAllCount += 1;

            if (catchAllCount > 1) {
                throw new Error(`Invalid route path "${path}": multiple catch-all segments are not allowed.`);
            }

            if (index !== segments.length - 1) {
                throw new Error(`Invalid route path "${path}": catch-all segment must be last.`);
            }

            const paramName = bracketCatchAll?.[1] ?? "parts";
            assertUniqueParamName(paramName, seenParamNames, path);
            canonicalSegments.push("*");
            return;
        }

        if (dynamicSegment || bracketDynamic) {
            const paramName = dynamicSegment?.[1] ?? bracketDynamic?.[1] ?? "param";
            assertUniqueParamName(paramName, seenParamNames, path);
            canonicalSegments.push(":");
            return;
        }

        canonicalSegments.push(segment);
    });

    return `/${canonicalSegments.join("/")}`;
}

function assertUniqueParamName(paramName: string, seen: Set<string>, path: string): void {
    if (seen.has(paramName)) {
        throw new Error(`Invalid route path "${path}": duplicate param name "${paramName}".`);
    }

    seen.add(paramName);
}

function routeIdSlug(path: string): string {
    if (path === "/") return "index";

    const slug = path
        .split("/")
        .filter(Boolean)
        .map((segment) => {
            if (segment === "*") return "all";
            if (segment.startsWith(":")) return segment.slice(1) || "param";
            return segment;
        })
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/--+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug || "route";
}

function buildOutputHtmlPath(args: {
    outDir: string;
    routePath: string;
    localeSegment: string;
    shouldPrefixLocale: boolean;
}): string {
    const pieces = [trimTrailingSlash(normalizePath(args.outDir))];

    if (args.shouldPrefixLocale) {
        pieces.push(args.localeSegment);
    }

    if (args.routePath !== "/") {
        pieces.push(...args.routePath.split("/").filter(Boolean));
    }

    pieces.push("index.html");

    return pieces.join("/");
}

function buildLocalizedRoutePath(args: {
    routePath: string;
    localeSegment: string;
    shouldPrefixLocale: boolean;
}): string {
    const pieces: string[] = [];

    if (args.shouldPrefixLocale) {
        pieces.push(args.localeSegment);
    }

    if (args.routePath !== "/") {
        pieces.push(...args.routePath.split("/").filter(Boolean));
    }

    if (pieces.length === 0) {
        return "/";
    }

    return `/${pieces.join("/")}`;
}

function resolveNotFoundOutputLocale(locales: readonly string[], defaultLocale: string | undefined): string {
    const normalizedDefaultLocale = defaultLocale ? normalizeLocaleTag(defaultLocale) : undefined;
    if (normalizedDefaultLocale) {
        const matchingLocale = locales.find((locale) => normalizeLocaleTag(locale) === normalizedDefaultLocale);
        if (matchingLocale) {
            return matchingLocale;
        }
    }

    return locales[0];
}

function mergeRouteHeadLinks(
    generatedLinks: readonly PageHeadLinkDefinition[],
    manualLinks: readonly PageHeadLinkDefinition[] | undefined,
): PageHeadLinkDefinition[] {
    const merged: PageHeadLinkDefinition[] = [];
    const seenKeys = new Set<string>();

    for (const link of [...generatedLinks, ...(manualLinks ? [...manualLinks] : [])]) {
        const key = createRouteHeadLinkKey(link);
        if (seenKeys.has(key)) {
            continue;
        }

        seenKeys.add(key);
        merged.push({ ...link });
    }

    return merged;
}

function createRouteHeadLinkKey(link: PageHeadLinkDefinition): string {
    const rel = link.rel.trim().toLowerCase();
    if (rel === "canonical") {
        return "canonical";
    }

    if (rel === "alternate" && link.hreflang) {
        return `alternate:${link.hreflang.trim().toLowerCase()}`;
    }

    return `${rel}:${link.href.trim()}:${link.hreflang?.trim().toLowerCase() ?? ""}`;
}

function generateRouteHeadLinks(args: {
    path: string;
    locale: string;
    locales: readonly string[];
    localePrefix: I18nConfig["localePrefix"] | undefined;
    defaultLocale: string | undefined;
    basePath: string | undefined;
    siteUrl: string | undefined;
}): PageHeadLinkDefinition[] {
    if (args.locales.length === 0) {
        return [];
    }

    const links: PageHeadLinkDefinition[] = [];
    links.push({
        rel: "canonical",
        href: buildLocalizedRouteHref({
            path: args.path,
            locale: args.locale,
            routeLocales: args.locales,
            localePrefix: args.localePrefix,
            basePath: args.basePath,
            siteUrl: args.siteUrl,
        }),
    });

    if (args.locales.length > 1) {
        for (const alternateLocale of args.locales) {
            links.push({
                rel: "alternate",
                href: buildLocalizedRouteHref({
                    path: args.path,
                    locale: alternateLocale,
                    routeLocales: args.locales,
                    localePrefix: args.localePrefix,
                    basePath: args.basePath,
                    siteUrl: args.siteUrl,
                }),
                hreflang: alternateLocale,
            });
        }

        const xDefaultLocale = args.locales.includes(args.defaultLocale ?? "")
            ? args.defaultLocale!
            : args.locales[0];
        links.push({
            rel: "alternate",
            href: buildLocalizedRouteHref({
                path: args.path,
                locale: xDefaultLocale,
                routeLocales: args.locales,
                localePrefix: args.localePrefix,
                basePath: args.basePath,
                siteUrl: args.siteUrl,
            }),
            hreflang: "x-default",
        });
    }

    return links;
}

function buildLocalizedRouteHref(args: {
    path: string;
    locale: string;
    routeLocales: readonly string[];
    localePrefix: I18nConfig["localePrefix"] | undefined;
    basePath?: string;
    siteUrl?: string;
}): string {
    const normalizedRoutePath = normalizeRouteHeadPath(args.path);
    const shouldPrefixLocale = shouldPrefixLocaleForRoute(args.routeLocales, args.localePrefix ?? "auto");
    const localePrefixPath = shouldPrefixLocale ? `/${toLocalePathSegment(args.locale)}` : "";
    const href = `${localePrefixPath}${normalizedRoutePath || "/"}`;
    const isLocalizedRootRoute = normalizedRoutePath === "" && localePrefixPath !== "";
    const normalizedHref = isLocalizedRootRoute
        ? `${localePrefixPath}/`
        : href !== "/" && href.endsWith("/") ? href.slice(0, -1) : href;
    const basePathPrefixedHref = prependBasePathToRouteHref(normalizedHref, args.basePath);

    if (!args.siteUrl) {
        return basePathPrefixedHref;
    }

    const absoluteHref = new URL(basePathPrefixedHref, `${args.siteUrl}/`).toString();
    if (basePathPrefixedHref === "/" || basePathPrefixedHref.endsWith("/")) {
        return absoluteHref;
    }

    return absoluteHref.replace(/\/+$/, "");
}

function prependBasePathToRouteHref(href: string, basePath: string | undefined): string {
    const normalizedBasePath = normalizeHeadBasePath(basePath);
    if (normalizedBasePath === "/") {
        return href;
    }

    if (href === "/") {
        return normalizedBasePath;
    }

    return `${normalizedBasePath.slice(0, -1)}${href.startsWith("/") ? href : `/${href}`}`;
}

function normalizeHeadBasePath(basePath: string | undefined): string {
    const trimmed = basePath?.trim();
    if (!trimmed || trimmed === "." || trimmed === "./" || trimmed === "/") {
        return "/";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeRouteHeadPath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed || trimmed === "/") {
        return "";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
        return withLeadingSlash.slice(0, -1);
    }

    return withLeadingSlash;
}

function describeRouteSource(route: { source: RouteSource; file?: string }): string {
    if (route.file) {
        return `${route.source} (${route.file})`;
    }

    return route.source;
}

function cloneHead(head: PageHeadDefinition | undefined): PageHeadDefinition | undefined {
    if (!head) {
        return head;
    }

    return {
        title: head.title,
        meta: head.meta ? [...head.meta] : undefined,
        links: head.links ? [...head.links] : undefined,
    };
}

function normalizePath(value: string): string {
    return value.replaceAll("\\", "/");
}

function trimTrailingSlash(value: string): string {
    if (value.length > 1 && value.endsWith("/")) {
        return value.slice(0, -1);
    }

    return value;
}

function safeToLocalePathSegment(locale: string): string | undefined {
    try {
        return toLocalePathSegment(locale);
    } catch {
        return undefined;
    }
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
