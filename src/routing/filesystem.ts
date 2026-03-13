import { FilesystemRoute, FilesystemRoutingOptions, RenderMode } from "./types.ts";

const PAGE_FILE_SUFFIXES = [
    ".ssg.page.tsx",
    ".csr.page.tsx",
    ".spa.page.tsx",
    ".page.tsx",
] as const;

interface RouteSegmentStats {
    staticCount: number;
    dynamicCount: number;
    hasCatchAll: boolean;
    depth: number;
}

export function isFilesystemPageFile(filePath: string): boolean {
    const normalizedFilePath = normalizePath(filePath);
    return PAGE_FILE_SUFFIXES.some((suffix) => normalizedFilePath.endsWith(suffix));
}

export function inferFilesystemRoute(
    filePath: string,
    options: FilesystemRoutingOptions,
): FilesystemRoute | null {
    const normalizedFilePath = normalizePath(filePath);
    if (!isFilesystemPageFile(normalizedFilePath)) {
        return null;
    }

    const relativeFilePath = toRelativePath(normalizedFilePath, options.pagesDir);
    const mode = inferRenderMode(relativeFilePath, options.defaultMode);
    const withoutSuffix = trimPageSuffix(relativeFilePath);

    if (!withoutSuffix) {
        return null;
    }

    const parsedPattern = inferRoutePattern(withoutSuffix, normalizedFilePath);
    return {
        file: normalizedFilePath,
        source: "filesystem",
        mode,
        path: parsedPattern.path,
        pattern: parsedPattern.path,
        routeKey: parsedPattern.routeKey,
    };
}

export function inferFilesystemRoutes(
    filePaths: string[],
    options: FilesystemRoutingOptions,
): FilesystemRoute[] {
    const routes: FilesystemRoute[] = [];

    for (const filePath of filePaths) {
        const route = inferFilesystemRoute(filePath, options);
        if (!route) continue;
        routes.push(route);
    }

    assertNoRouteConflicts(routes);
    return sortRoutesByMatchingPriority(routes);
}

function trimPageSuffix(relativeFilePath: string): string | null {
    for (const suffix of PAGE_FILE_SUFFIXES) {
        if (relativeFilePath.endsWith(suffix)) {
            return relativeFilePath.slice(0, -suffix.length);
        }
    }

    return null;
}

function inferRenderMode(relativeFilePath: string, defaultMode: RenderMode): RenderMode {
    if (relativeFilePath.endsWith(".ssg.page.tsx")) {
        return "ssg";
    }

    if (relativeFilePath.endsWith(".csr.page.tsx")) {
        return "csr";
    }

    if (relativeFilePath.endsWith(".spa.page.tsx")) {
        return "csr";
    }

    return defaultMode;
}

function inferRoutePattern(withoutSuffix: string, filePath: string): { path: string; routeKey: string } {
    const rawSegments = withoutSuffix
        .split("/")
        .map((segment) => segment.trim())
        .filter(Boolean);

    const normalizedSegments = [...rawSegments];
    if (normalizedSegments.at(-1) === "index") {
        normalizedSegments.pop();
    }

    const pathSegments: string[] = [];
    const routeKeySegments: string[] = [];
    const seenParams = new Set<string>();
    let catchAllCount = 0;

    normalizedSegments.forEach((segment, index) => {
        const dynamicSegment = segment.match(/^\[([^\].]+)\]$/);
        const catchAllSegment = segment.match(/^\[\.\.\.([^\].]+)\]$/);

        if (catchAllSegment) {
            catchAllCount += 1;

            if (catchAllCount > 1) {
                throw new Error(
                    `Invalid filesystem route "${filePath}": multiple catch-all segments are not allowed.`,
                );
            }

            if (index !== normalizedSegments.length - 1) {
                throw new Error(
                    `Invalid filesystem route "${filePath}": catch-all segment must be in the final path segment.`,
                );
            }

            const paramName = catchAllSegment[1];
            assertUniqueParamName(paramName, seenParams, filePath);
            pathSegments.push("*");
            routeKeySegments.push("*");
            return;
        }

        if (dynamicSegment) {
            const paramName = dynamicSegment[1];
            assertUniqueParamName(paramName, seenParams, filePath);
            pathSegments.push(`:${paramName}`);
            routeKeySegments.push(":");
            return;
        }

        pathSegments.push(segment);
        routeKeySegments.push(segment);
    });

    const path = pathSegments.length === 0 ? "/" : `/${pathSegments.join("/")}`;
    const routeKey = routeKeySegments.length === 0 ? "/" : `/${routeKeySegments.join("/")}`;

    return { path, routeKey };
}

function assertUniqueParamName(paramName: string, seenParams: Set<string>, filePath: string): void {
    if (seenParams.has(paramName)) {
        throw new Error(
            `Invalid filesystem route "${filePath}": duplicate param name "${paramName}" in route path.`,
        );
    }

    seenParams.add(paramName);
}

function assertNoRouteConflicts(routes: FilesystemRoute[]): void {
    const routeByKey = new Map<string, FilesystemRoute>();

    for (const route of routes) {
        const existing = routeByKey.get(route.routeKey);
        if (!existing) {
            routeByKey.set(route.routeKey, route);
            continue;
        }

        throw new Error(
            [
                `Filesystem routing conflict for route key "${route.routeKey}".`,
                `First file: ${existing.file}`,
                `Second file: ${route.file}`,
            ].join(" "),
        );
    }
}

function sortRoutesByMatchingPriority(routes: FilesystemRoute[]): FilesystemRoute[] {
    return [...routes].sort((a, b) => {
        const aStats = getRouteSegmentStats(a.routeKey);
        const bStats = getRouteSegmentStats(b.routeKey);

        if (aStats.staticCount !== bStats.staticCount) {
            return bStats.staticCount - aStats.staticCount;
        }

        if (aStats.dynamicCount !== bStats.dynamicCount) {
            return aStats.dynamicCount - bStats.dynamicCount;
        }

        if (aStats.hasCatchAll !== bStats.hasCatchAll) {
            return aStats.hasCatchAll ? 1 : -1;
        }

        if (aStats.depth !== bStats.depth) {
            return bStats.depth - aStats.depth;
        }

        return a.routeKey.localeCompare(b.routeKey);
    });
}

function getRouteSegmentStats(routeKey: string): RouteSegmentStats {
    const segments = routeKey === "/" ? [] : routeKey.split("/").filter(Boolean);

    let staticCount = 0;
    let dynamicCount = 0;
    let hasCatchAll = false;

    for (const segment of segments) {
        if (segment === "*") {
            hasCatchAll = true;
            dynamicCount += 1;
            continue;
        }

        if (segment === ":") {
            dynamicCount += 1;
            continue;
        }

        staticCount += 1;
    }

    return {
        staticCount,
        dynamicCount,
        hasCatchAll,
        depth: segments.length,
    };
}

function toRelativePath(filePath: string, pagesDir: string): string {
    const normalizedPagesDir = trimTrailingSlash(normalizePath(pagesDir));
    const prefix = `${normalizedPagesDir}/`;

    if (filePath.startsWith(prefix)) {
        return filePath.slice(prefix.length);
    }

    throw new Error(
        `File "${filePath}" is outside pagesDir "${normalizedPagesDir}".`,
    );
}

function normalizePath(value: string): string {
    return value.replaceAll("\\", "/");
}

function trimTrailingSlash(value: string): string {
    if (value.endsWith("/")) {
        return value.slice(0, -1);
    }

    return value;
}
