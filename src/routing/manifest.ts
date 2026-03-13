import { inferFilesystemRoutes } from "./filesystem.ts";
import type { I18nConfig } from "../i18n/index.ts";
import {
    normalizeLocaleTag,
    toLocalePathSegment as toLocalePathSegmentFromI18n,
} from "../i18n/index.ts";
import {
    BuildTargetRouteManifestInput,
    ExplicitRouteDefinition,
    FilesystemRoute,
    RenderMode,
    RenderModeInput,
    RouteManifestEntry,
    RouteSource,
    SsgOutputEntry,
    TargetRouteManifest,
} from "./types.ts";

interface CandidateRoute {
    idHint?: string;
    source: RouteSource;
    file?: string;
    path: string;
    pattern: string;
    routeKey: string;
    mode: RenderMode;
    locales: string[];
}

interface ExpandedRouteLocale {
    idHint?: string;
    source: RouteSource;
    file?: string;
    path: string;
    pattern: string;
    routeKey: string;
    mode: RenderMode;
    locale: string;
}

interface BuildSsgOutputEntriesOptions {
    localePrefix?: I18nConfig["localePrefix"];
}

export function buildTargetRouteManifest(input: BuildTargetRouteManifestInput): TargetRouteManifest {
    const target = input.target;
    const targetName = target.name;

    const explicitConfigured = Boolean(target.routes || input.explicitRoutes);
    const filesystemConfigured = Boolean(target.pagesDir || input.filesystemPageFiles);

    if (!explicitConfigured && !filesystemConfigured) {
        throw new Error(
            `Target "${targetName}" has no routing input. Configure routes or pagesDir.`,
        );
    }

    if (target.routing === "explicit" && !explicitConfigured) {
        throw new Error(
            `Target "${targetName}" uses routing=explicit but no routes input was provided.`,
        );
    }

    if (target.routing === "filesystem" && !filesystemConfigured) {
        throw new Error(
            `Target "${targetName}" uses routing=filesystem but no pagesDir input was provided.`,
        );
    }

    if (explicitConfigured && filesystemConfigured && !target.allowRoutingConflict) {
        throw new Error(
            [
                `Target "${targetName}" configures routes and pagesDir at the same time.`,
                `Set allowRoutingConflict=true to opt in to mixed routing with explicit precedence.`,
            ].join(" "),
        );
    }

    if (filesystemConfigured && !target.defaultMode) {
        throw new Error(
            `Target "${targetName}" uses filesystem routing and requires defaultMode ("ssg" or "csr").`,
        );
    }

    const explicitRoutes = buildExplicitCandidates(input);
    const filesystemRoutes = buildFilesystemCandidates(input);

    const mergedByRouteAndLocale = new Map<string, ExpandedRouteLocale>();

    for (const route of explicitRoutes) {
        upsertByLocale(mergedByRouteAndLocale, route, targetName);
    }

    for (const route of filesystemRoutes) {
        upsertByLocale(mergedByRouteAndLocale, route, targetName);
    }

    const mergedRoutes = aggregateRoutes(Array.from(mergedByRouteAndLocale.values()));
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

    for (const route of manifest.routes) {
        if (route.mode !== "ssg") continue;

        const shouldPrefixLocale = shouldPrefixLocaleForRoute(route.locales, localePrefix);
        const normalizedPath = normalizeRoutePath(route.path);

        for (const locale of route.locales) {
            const localePathSegment = toLocalePathSegment(locale);
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
            });
        }
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

function buildExplicitCandidates(input: BuildTargetRouteManifestInput): CandidateRoute[] {
    const target = input.target;
    const targetName = target.name;

    if (!target.routes && !input.explicitRoutes) {
        return [];
    }

    if (!input.explicitRoutes) {
        throw new Error(
            `Target "${targetName}" defines routes="${target.routes}" but explicit routes were not loaded.`,
        );
    }

    return input.explicitRoutes.map((route) => buildExplicitCandidate(route, input));
}

function buildExplicitCandidate(
    route: ExplicitRouteDefinition,
    input: BuildTargetRouteManifestInput,
): CandidateRoute {
    const targetName = input.target.name;
    const path = normalizeRoutePath(route.path);
    const routeKey = canonicalizeRouteKey(path);
    const locales = resolveRouteLocales({
        routeLocales: route.locales,
        targetLocales: input.target.locales,
        globalLocales: input.i18n?.locales ?? input.globalLocales,
        targetName,
        routeLabel: route.id ?? path,
    });

    return {
        idHint: route.id,
        source: "explicit",
        file: route.file,
        mode: normalizeRenderMode(route.mode),
        path,
        pattern: path,
        routeKey,
        locales,
    };
}

function buildFilesystemCandidates(input: BuildTargetRouteManifestInput): CandidateRoute[] {
    const target = input.target;
    const targetName = target.name;

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
            defaultMode: normalizeRenderMode(target.defaultMode!),
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
            globalLocales: input.i18n?.locales ?? input.globalLocales,
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
                path: candidate.path,
                pattern: candidate.pattern,
                routeKey: candidate.routeKey,
                mode: candidate.mode,
                locale,
            });
            continue;
        }

        if (existing.source === "explicit" && candidate.source === "filesystem") {
            continue;
        }

        if (existing.source === "filesystem" && candidate.source === "explicit") {
            destination.set(key, {
                idHint: candidate.idHint,
                source: candidate.source,
                file: candidate.file,
                path: candidate.path,
                pattern: candidate.pattern,
                routeKey: candidate.routeKey,
                mode: candidate.mode,
                locale,
            });
            continue;
        }

        throw new Error(
            [
                `Target "${targetName}" has conflicting routes for pattern "${candidate.routeKey}" and locale "${locale}".`,
                `Existing source: ${describeRouteSource(existing)}`,
                `New source: ${describeRouteSource(candidate)}`,
                `Suggestion: rename one route or enable explicit precedence with allowRoutingConflict=true.`,
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
                path: route.path,
                pattern: route.pattern,
                mode: route.mode,
                locales: [route.locale],
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

            if (a.source !== b.source) {
                return a.source.localeCompare(b.source);
            }

            return (a.file ?? "").localeCompare(b.file ?? "");
        });
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
    globalLocales?: readonly string[];
    targetName: string;
    routeLabel: string;
}): string[] {
    const effectiveLocales = args.routeLocales?.length
        ? [...args.routeLocales]
        : args.targetLocales?.length
            ? [...args.targetLocales]
            : args.globalLocales?.length
                ? [...args.globalLocales]
                : [];

    if (effectiveLocales.length === 0) {
        throw new Error(
            `Target "${args.targetName}" route "${args.routeLabel}" has no resolved locales (route > target > global).`,
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

function describeRouteSource(route: { source: RouteSource; file?: string }): string {
    if (route.file) {
        return `${route.source} (${route.file})`;
    }

    return route.source;
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

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function normalizeRenderMode(mode: RenderModeInput): RenderMode {
    if (mode === "spa") {
        return "csr";
    }

    return mode;
}
