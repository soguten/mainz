import type { Principal } from "../authorization/index.ts";
import type { PageRouteParams } from "./page-contract.ts";
import type { NavigationMode, RenderMode } from "../routing/types.ts";

/** Build/profile metadata associated with the resolved route. */
export interface RouteProfileContext {
    /** Profile name associated with the active target, when available. */
    name?: string;
    /** Normalized base path for the active target. */
    basePath: string;
    /** Absolute site URL associated with the active target, when available. */
    siteUrl?: string;
}

/** Active route metadata exposed to pages and descendant components. */
export interface RouteContext {
    /** Current requested path. */
    path: string;
    /** Current matched route pattern path. */
    matchedPath: string;
    /** Route params resolved for the current path. */
    params: PageRouteParams;
    /** Resolved locale for the current route, when present. */
    locale?: string;
    /** Fully resolved URL for the current route. */
    url: URL;
    /** Page render mode active for the current route. */
    renderMode: RenderMode;
    /** Navigation mode active for the current route. */
    navigationMode: NavigationMode;
    /** Principal associated with the current route resolution, when available. */
    principal?: Principal;
    /** Build/profile metadata associated with the current route. */
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
