import type { RouteManifestEntry, TargetRouteManifest } from "../routing/index.ts";

export interface DevRouteRequestResolution {
    kind: "outside-base" | "unmatched" | "csr" | "ssg" | "ssg-missing-entry" | "ssg-csr-fallback";
    currentPath?: string;
    locale?: string;
    route?: RouteManifestEntry;
    params?: Record<string, string>;
}

export function resolveDevRouteRequest(args: {
    requestUrl: URL;
    basePath: string;
    manifest: TargetRouteManifest;
    routeEntriesByRouteId?: ReadonlyMap<string, readonly { locale: string; params: Record<string, string> }[]>;
    defaultLocale?: string;
    localePrefix?: "except-default" | "always";
}): DevRouteRequestResolution {
    const appPath = toAppRelativePath(args.requestUrl, args.basePath);
    if (!appPath) {
        return { kind: "outside-base" };
    }

    const locale = resolveRequestLocale({
        appPath,
        routes: args.manifest.routes,
        defaultLocale: args.defaultLocale,
        localePrefix: args.localePrefix ?? "except-default",
    });
    const currentPath = stripLocalePrefixFromPath(appPath, args.manifest.routes);

    for (const route of args.manifest.routes) {
        if (locale && !route.locales.includes(locale)) {
            continue;
        }

        const params = matchRoutePath(route.path, currentPath);
        if (!params) {
            continue;
        }

        if (route.mode === "csr") {
            return {
                kind: "csr",
                currentPath,
                locale,
                route,
                params,
            };
        }

        const routeEntries = args.routeEntriesByRouteId?.get(route.id);
        if (!routeEntries?.length) {
            return {
                kind: "ssg",
                currentPath,
                locale,
                route,
                params,
            };
        }

        const hasMatchingEntry = routeEntries.some((entry) =>
            entry.locale === (locale ?? route.locales[0]) && recordShallowEqual(entry.params, params)
        );
        return hasMatchingEntry
            ? {
                kind: "ssg",
                currentPath,
                locale,
                route,
                params,
            }
            : {
                kind: route.fallback === "csr" ? "ssg-csr-fallback" : "ssg-missing-entry",
                currentPath,
                locale,
                route,
                params,
            };
    }

    return {
        kind: "unmatched",
        currentPath,
        locale,
    };
}

export function findDevNotFoundRoute(args: {
    manifest: TargetRouteManifest;
    locale?: string;
    mode?: "ssg" | "csr";
}): RouteManifestEntry | undefined {
    return args.manifest.routes.find((route) => {
        if (route.notFound !== true) {
            return false;
        }

        if (args.mode && route.mode !== args.mode) {
            return false;
        }

        if (args.locale && !route.locales.includes(args.locale)) {
            return false;
        }

        return true;
    });
}

export function buildDevSsgCacheKey(args: {
    requestUrl: URL;
    routeId: string;
    locale?: string;
    params?: Record<string, string>;
    statusCode?: number;
}): string {
    const normalizedParams = Object.entries(args.params ?? {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

    return [
        String(args.statusCode ?? 200),
        args.routeId,
        args.locale ?? "",
        args.requestUrl.pathname,
        normalizedParams,
    ].join("::");
}

function toAppRelativePath(url: URL, basePath: string): string | null {
    const normalizedBasePath = normalizeNavigationBasePath(basePath);
    if (!isUrlWithinNavigationBasePath(url, normalizedBasePath)) {
        return null;
    }

    if (normalizedBasePath === "/") {
        return normalizeRoutePath(url.pathname) ?? "/";
    }

    const basePathWithoutTrailingSlash = normalizedBasePath.slice(0, -1);
    if (url.pathname === basePathWithoutTrailingSlash) {
        return "/";
    }

    return normalizeRoutePath(url.pathname.slice(basePathWithoutTrailingSlash.length)) ?? "/";
}

function normalizeNavigationBasePath(basePath?: string): string {
    const normalizedBasePath = (basePath ?? "/").trim();

    if (!normalizedBasePath || normalizedBasePath === "." || normalizedBasePath === "./") {
        return "/";
    }

    const withLeadingSlash = normalizedBasePath.startsWith("/")
        ? normalizedBasePath
        : `/${normalizedBasePath}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function isUrlWithinNavigationBasePath(url: URL, basePath: string): boolean {
    if (basePath === "/") {
        return true;
    }

    const basePathWithoutTrailingSlash = basePath.slice(0, -1);
    return url.pathname === basePathWithoutTrailingSlash || url.pathname.startsWith(basePath);
}

function normalizeRoutePath(path: string | undefined): string | null {
    const trimmed = path?.trim();
    if (!trimmed) {
        return null;
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const normalizedSlashes = withLeadingSlash.replace(/\/{2,}/g, "/");

    if (normalizedSlashes.length > 1 && normalizedSlashes.endsWith("/")) {
        return normalizedSlashes.slice(0, -1);
    }

    return normalizedSlashes;
}

function stripLocalePrefixFromPath(pathname: string, routes: readonly RouteManifestEntry[]): string {
    const localeSet = new Set(routes.flatMap((route) => route.locales.map((locale) => locale.toLowerCase())));
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
        return "/";
    }

    if (localeSet.has(segments[0].toLowerCase())) {
        return `/${segments.slice(1).join("/")}` || "/";
    }

    return pathname || "/";
}

function resolveRequestLocale(args: {
    appPath: string;
    routes: readonly RouteManifestEntry[];
    defaultLocale?: string;
    localePrefix: "except-default" | "always";
}): string | undefined {
    const localeMap = new Map<string, string>();
    for (const route of args.routes) {
        for (const locale of route.locales) {
            localeMap.set(locale.toLowerCase(), locale);
        }
    }

    if (localeMap.size === 0) {
        return undefined;
    }

    const firstSegment = args.appPath.split("/").filter(Boolean)[0];
    if (firstSegment) {
        const matchedLocale = localeMap.get(firstSegment.toLowerCase());
        if (matchedLocale) {
            return matchedLocale;
        }
    }

    if (args.localePrefix === "except-default" && args.defaultLocale) {
        return localeMap.get(args.defaultLocale.toLowerCase()) ?? args.defaultLocale;
    }

    return localeMap.values().next().value;
}

function matchRoutePath(routePath: string, currentPath: string): Record<string, string> | null {
    const routeSegments = getRouteSegments(routePath);
    const currentSegments = getRouteSegments(currentPath);
    const params: Record<string, string> = {};

    let routeIndex = 0;
    let currentIndex = 0;

    while (routeIndex < routeSegments.length && currentIndex < currentSegments.length) {
        const routeSegment = routeSegments[routeIndex];
        const currentSegment = currentSegments[currentIndex];

        if (routeSegment === "*") {
            params["*"] = currentSegments.slice(currentIndex).map(decodeRouteParamSegment).join("/");
            return params;
        }

        if (routeSegment.startsWith("[...")) {
            params[routeSegment.slice(4, -1)] = currentSegments.slice(currentIndex).map(
                decodeRouteParamSegment,
            ).join("/");
            return params;
        }

        if (routeSegment.startsWith(":")) {
            params[routeSegment.slice(1)] = decodeRouteParamSegment(currentSegment);
            routeIndex += 1;
            currentIndex += 1;
            continue;
        }

        if (isBracketDynamicSegment(routeSegment)) {
            params[routeSegment.slice(1, -1)] = decodeRouteParamSegment(currentSegment);
            routeIndex += 1;
            currentIndex += 1;
            continue;
        }

        if (routeSegment !== currentSegment) {
            return null;
        }

        routeIndex += 1;
        currentIndex += 1;
    }

    if (routeIndex === routeSegments.length && currentIndex === currentSegments.length) {
        return params;
    }

    if (routeIndex === routeSegments.length - 1 && routeSegments[routeIndex] === "*") {
        params["*"] = currentSegments.slice(currentIndex).map(decodeRouteParamSegment).join("/");
        return params;
    }

    if (routeIndex === routeSegments.length - 1 && routeSegments[routeIndex].startsWith("[...")) {
        params[routeSegments[routeIndex].slice(4, -1)] = currentSegments.slice(currentIndex)
            .map(decodeRouteParamSegment)
            .join("/");
        return params;
    }

    return null;
}

function getRouteSegments(path: string): string[] {
    return normalizeRoutePath(path)?.split("/").filter(Boolean) ?? [];
}

function isBracketDynamicSegment(segment: string): boolean {
    return /^\[[^\].]+\]$/.test(segment);
}

function decodeRouteParamSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

function recordShallowEqual(left: Record<string, string>, right: Record<string, string>): boolean {
    const leftEntries = Object.entries(left);
    const rightEntries = Object.entries(right);
    return leftEntries.length === rightEntries.length &&
        leftEntries.every(([key, value]) => right[key] === value) &&
        rightEntries.every(([key, value]) => left[key] === value);
}
