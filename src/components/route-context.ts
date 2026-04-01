import type { Principal } from "../authorization/index.ts";
import type { NavigationMode, RenderMode } from "../routing/types.ts";

export type PageRouteParams = Readonly<Record<string, string>>;

export interface RouteProfileContext {
    name?: string;
    basePath: string;
    siteUrl?: string;
}

export interface RouteContext {
    path: string;
    matchedPath: string;
    params: PageRouteParams;
    locale?: string;
    url: URL;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
    principal?: Principal;
    profile?: RouteProfileContext;
}

export function isRouteContext(value: unknown): value is RouteContext {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.path === "string" &&
        typeof candidate.matchedPath === "string" &&
        isStringRecord(candidate.params) &&
        (typeof candidate.locale === "string" || typeof candidate.locale === "undefined") &&
        candidate.url instanceof URL &&
        (candidate.renderMode === "csr" || candidate.renderMode === "ssg") &&
        (candidate.navigationMode === "spa" ||
            candidate.navigationMode === "mpa" ||
            candidate.navigationMode === "enhanced-mpa");
}

function isStringRecord(value: unknown): value is Record<string, string> {
    return typeof value === "object" && value !== null &&
        Object.values(value).every((entry) => typeof entry === "string");
}
